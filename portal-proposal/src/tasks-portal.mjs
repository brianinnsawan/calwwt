// Task app inside the portal worker.
// - Serves /tasks.html and /__tasks/* (bundled UI) and /api/tasks/* (task API).
// - "Task-only" accounts (subject "task:<person>") are limited to these pages.
// - /api/task-accounts/* lets task-app admins (Brian, Ming) create logins and issue
//   one-time setup/reset codes. The owner account (Brian) can never be reset here.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { handleTasksApi } from '../../tasks/src/api.mjs';
import * as P from '../../tasks/src/policy.mjs';
import { taskService } from '../../tasks/src/service.mjs';
import ui from '../../tasks/dist/ui-assets.mjs';
import { HttpError } from './auth.mjs';
import { passwordHash, validPassword } from './identity/password.mjs';
import { SESSION_IDLE } from './identity/identity.mjs';
import { readJson } from './body.mjs';
import { requireAdminGate } from './admin-gate.mjs';
import { requestTaskService } from './site-access.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';
import { loadSamples } from '../../tasks/dev/sample-data.mjs';
import { timingSafeEqual } from 'node:crypto';

const TICKET_SECONDS = 15 * 60;
// First-time setup codes (no password yet) last 7 days so a code can be sent ahead; still one use (Brian, 7 Nov 2026).
// Reset codes stay at 15 minutes because issuing one switches off the person's current password.
const SETUP_TICKET_SECONDS = 7 * 24 * 3600;
const USERNAME = /^[a-z0-9][a-z0-9._-]{0,39}$/;
const digest = (v) => createHash('sha256').update(v).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const fail = (status, message) => { throw new HttpError(status, message); };

export const tasksEnabled = (env) => env.TASKS_ENABLED === 'true' && !!env.TASKS_DB;
const isAdminPath = (p) => p === '/admin' || p === '/admin/' || p === '/admin.html';
const isTaskPath = (p) => isAdminPath(p) || p === '/tasks' || p === '/tasks.html' || p.startsWith('/__tasks/') || p.startsWith('/api/tasks/') || p.startsWith('/api/task-accounts/') || p === '/api/tasks-staging/view-as';
const SIGN_OUT_OK = new Set(['/api/local-auth/logout', '/api/local-auth/logout-all', '/api/local-auth/session']);

export async function personFor(env, actor) {
  if (!tasksEnabled(env) || !actor?.accountId) return null;
  const row = await env.TASKS_DB.prepare('SELECT id FROM people WHERE account_id=? AND active=1').bind(actor.accountId).first();
  return row?.id || null;
}

/**
 * Called by the portal worker after the signed-in actor is verified.
 * Returns a Response for task paths, a redirect/deny for task-only accounts elsewhere, or null.
 */
export async function routeTasks(request, env, actor, access = null) {
  const url = new URL(request.url), path = url.pathname;
  // TASKS_ONLY: a site that serves only the task app. Nobody reaches portal pages or data there.
  if (env.TASKS_ONLY === 'true' && !isTaskPath(path) && !SIGN_OUT_OK.has(path)) {
    if (['GET', 'HEAD'].includes(request.method) && ['/', '/index.html', '/project-home.html', '/project-home'].includes(path)) {
      return new Response(null, { status: 302, headers: { Location: '/tasks.html' } });
    }
    fail(404, 'Not found.');
  }
  if (!isTaskPath(path)) return null;
  if (!tasksEnabled(env)) fail(404, 'Not found.');
  // Admin page (/admin): admins change access, observers look. It does not depend on the Tasks page level.
  if (isAdminPath(path)) {
    if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
    if (!access?.view) fail(404, 'Not found.');
    if (path !== '/admin') return new Response(null, { status: 308, headers: { Location: '/admin' } });
    const shell = ui['/tasks.html'];
    return new Response(request.method === 'HEAD' ? null : shell.body, { headers: { 'Content-Type': shell.type, ETag: `"${shell.etag}"` } });
  }
  // Tasks can be set to none per group or person on the Admin page. (View = read-only, enforced by the task API.)
  // The Admin page itself uses the task API, so admins and observers keep it.
  const adminCall = path.startsWith('/api/task-accounts/') || (path === '/api/tasks/state' && access?.view) || (path === '/api/tasks/admin/pages' && access?.admin) || (path.startsWith('/api/tasks/admin/people/') && access?.admin);
  if (access && !access.areas.has('tasks') && !adminCall) fail(404, 'Not found.');
  await ensureStagingSeed(env);
  // The page check has already found the signed-in person (src/site-access.mjs, the same lookup as personFor).
  const personId = access?.viewAs ? access.viewAs.id : access ? access.person : await personFor(env, actor);

  if (path === '/tasks') return new Response(null, { status: 308, headers: { Location: '/tasks.html' } });
  if (path === '/tasks.html' || path.startsWith('/__tasks/')) {
    if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
    if (!personId) return new Response('<!doctype html><meta charset="utf-8"><title>Tasks</title><p style="font-family:system-ui;margin:40px">Your login is not linked to the task app yet. Ask Brian or Ming.</p>', { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    const asset = ui[path];
    if (!asset) fail(404, 'Not found.');
    return new Response(request.method === 'HEAD' ? null : asset.body, { headers: { 'Content-Type': asset.type, ETag: `"${asset.etag}"` } });
  }
  if (path === '/api/tasks-staging/view-as') return viewAsApi(request, env, personId);
  // Audit N04: changing page access or people (Admin page) needs 2-step + a recent password confirmation.
  if (path.startsWith('/api/tasks/admin/') && request.method === 'POST' && !access?.viewAs) requireAdminGate(env, actor);
  // Night audit (2 Nov 2026): the owner's own person record (level, on/off, reporting lines) can only be changed by the
  // owner, so another admin cannot take the owner's Admin page, logins or backups away.
  const ownerEdit = /^\/api\/tasks\/admin\/people\/([^/]+)/.exec(path);
  if (ownerEdit && request.method === 'POST' && env.AUTH_DB && ownerEdit[1] !== personId) {
    const row = await env.TASKS_DB.prepare('SELECT account_id FROM people WHERE id=?').bind(ownerEdit[1]).first();
    const acct = row?.account_id ? await env.AUTH_DB.prepare('SELECT role FROM auth_accounts WHERE id=?').bind(row.account_id).first() : null;
    if (acct?.role === 'owner') fail(403, "Only the owner can change the owner's own settings.");
  }
  if (path.startsWith('/api/tasks/')) {
    const res = await handleTasksApi(request, env, await stagingViewAs(request, env, personId), { viewOnly: !!access?.viewAs, service: requestTaskService(env, actor) });
    // "Remove from the project" (Admin page): once the task app has switched the person off and moved their tasks,
    // their login is switched off too and they are signed out everywhere.
    if (ownerEdit && /^\/api\/tasks\/admin\/people\/[^/]+\/remove$/.test(path) && request.method === 'POST' && res?.status === 200) {
      try { await switchLoginOff(env, personId, decodeURIComponent(ownerEdit[1])); }
      catch (e) {
        console.error('remove person: login', e?.message);
        return json({ error: 'The person was removed and their tasks were moved, but the login could not be switched off. Use Switch login off.' }, 500);
      }
    }
    return res;
  }
  if (access?.viewAs && path.startsWith('/api/task-accounts/')) fail(403, 'View only: you are viewing the site as someone else.');
  return accountsApi(request, env, actor, personId);
}

// ---------------- login accounts for the task app ----------------
/** Switch off a person's login and end their sessions (never the owner's). No login, or logins not in use here: nothing to do. */
async function switchLoginOff(env, adminId, targetId) {
  if (!env.AUTH_DB) return;
  const row = await env.TASKS_DB.prepare('SELECT account_id FROM people WHERE id=?').bind(targetId).first();
  if (!row?.account_id) return;
  const q = (sql, ...a) => env.AUTH_DB.prepare(sql).bind(...a);
  const acct = await q('SELECT id, role, active FROM auth_accounts WHERE id=?', row.account_id).first();
  if (!acct || acct.role === 'owner') return;
  await env.AUTH_DB.batch([
    q('UPDATE auth_accounts SET active=0, version=version+1 WHERE id=? AND role<>?', acct.id, 'owner'),
    q('DELETE FROM auth_sessions WHERE account_id=?', acct.id),
    ...(acct.active ? [q('INSERT INTO auth_audit VALUES(?,?,?,?,?)', token(), `task-admin:${adminId}`, acct.id, 'task_account_disabled', Math.floor(Date.now() / 1000))] : []),
  ]);
}


async function accountsApi(request, env, actor, personId) {
  const url = new URL(request.url), path = url.pathname.slice('/api/task-accounts/'.length);
  try {
    if (!env.AUTH_DB || env.LOCAL_AUTH_ENABLED !== 'true') fail(503, 'Logins are not switched on.');
    const world = await taskService(env.TASKS_DB).loadWorld();
    const me = personId && world.people.get(personId);
    if (!me || !P.isAdmin(me)) fail(403, 'Only admins can manage logins.');

    if (request.method === 'GET' && path === 'list') return json({ accounts: await listAccounts(env, world) });
    if (request.method === 'GET' && path === 'history') {
      // One person's account history, newest first: sign-ins (device kind), failed tries, codes, password changes, on/off.
      const target = world.people.get(String(url.searchParams.get('personId') || ''));
      if (!target) fail(404, 'Person not found.');
      if (!target.accountId) return json({ events: [] });
      const rows = (await env.AUTH_DB.prepare('SELECT event, at, actor_id FROM auth_audit WHERE target_id=? ORDER BY at DESC LIMIT 300').bind(target.accountId).all()).results;
      const byAccount = new Map([...world.people.values()].filter((p) => p.accountId).map((p) => [p.accountId, p.name]));
      const who = (actor) => { const m = /^task-admin:(.+)$/.exec(actor || ''); return m ? world.people.get(m[1])?.name || m[1] : byAccount.get(actor) || ''; };
      return json({ events: rows.map((r) => ({ at: r.at, event: r.event, by: who(r.actor_id) })) });
    }
    if (request.method !== 'POST') fail(405, 'Method not allowed.');
    if (request.headers.get('origin') !== (env.APP_ORIGIN || url.origin) || request.headers.get('x-requested-with') !== 'tasks') fail(403, 'Request blocked.');
    requireAdminGate(env, actor); // audit N04: 2-step + password confirmed in the last 15 minutes
    if (!(request.headers.get('content-type') || '').startsWith('application/json')) fail(415, 'Send JSON.');
    const body = await readJson(request, 4096);
    const target = world.people.get(String(body.personId || ''));
    if (!target) fail(404, 'Person not found.');
    const now = Math.floor(Date.now() / 1000);
    const q = (sql, ...a) => env.AUTH_DB.prepare(sql).bind(...a);
    const audit = (targetId, event) => q('INSERT INTO auth_audit VALUES(?,?,?,?,?)', token(), `task-admin:${me.id}`, targetId, event, now);

    if (path === 'create') {
      if (target.accountId) fail(409, `${target.name} already has a login.`);
      const username = String(body.username || '').trim().toLowerCase();
      if (!USERNAME.test(username)) fail(400, 'Usernames are 1–40 letters, numbers, dots, dashes or underscores.');
      if (await q('SELECT 1 FROM auth_accounts WHERE username=?', username).first()) fail(409, 'That username is taken.');
      const accountId = `acct-${randomUUID()}`;
      await env.AUTH_DB.batch([
        q('INSERT INTO auth_accounts(id, username, role, active, version, created_at) VALUES(?,?,?,?,?,?)', accountId, username, 'reader', 1, 0, now),
        q('INSERT INTO auth_bindings(account_id, app_id, subject_id) VALUES(?,?,?)', accountId, 'portal', `task:${target.id}`),
        audit(accountId, 'task_account_created'),
      ]);
      await env.TASKS_DB.prepare('UPDATE people SET account_id=? WHERE id=?').bind(accountId, target.id).run();
      return json({ ok: true, username });
    }

    if (path === 'link') {
      // Link an existing portal account (e.g. Brian's owner account, Ming's reader account).
      const accountId = String(body.accountId || '');
      const acct = await q("SELECT a.id, a.role FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id AND b.app_id='portal' WHERE a.id=?", accountId).first();
      if (!acct) fail(404, 'Login not found.');
      // Night audit: never replace someone's existing login, and the owner's login is only ever linked by the owner.
      if (target.accountId) fail(409, `${target.name} already has a login.`);
      if (acct.role === 'owner' && target.id !== me.id) fail(403, "The owner's login can only be linked by the owner.");
      if (await env.TASKS_DB.prepare('SELECT 1 FROM people WHERE account_id=?').bind(accountId).first()) fail(409, 'That login is already linked to someone.');
      await env.TASKS_DB.prepare('UPDATE people SET account_id=? WHERE id=?').bind(accountId, target.id).run();
      await audit(accountId, `task_account_linked:${target.id}`).run();
      return json({ ok: true });
    }

    if (!target.accountId) fail(409, `${target.name} has no login yet.`);
    const acct = await q("SELECT a.* FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id AND b.app_id='portal' WHERE a.id=?", target.accountId).first();
    if (!acct) fail(404, 'Login not found.');
    if (acct.role === 'owner') fail(403, "The owner's login can only be reset through owner recovery.");

    if (path === 'code') {
      if (!acct.active) fail(409, 'This login is switched off. Switch it on first.');
      const raw = token();
      const purpose = acct.password_hash ? 'reset' : 'setup';
      const ttl = purpose === 'setup' ? SETUP_TICKET_SECONDS : TICKET_SECONDS;
      const results = await env.AUTH_DB.batch([
        q('UPDATE auth_accounts SET password_hash=NULL, version=version+1 WHERE id=? AND version=? AND active=1', acct.id, acct.version),
        q('INSERT INTO auth_tickets(digest, account_id, version, expires_at, purpose) SELECT ?, id, version, ?, ? FROM auth_accounts WHERE id=? AND version=? AND changes()=1', digest(raw), now + ttl, purpose, acct.id, acct.version + 1),
        q('DELETE FROM auth_sessions WHERE account_id=?', acct.id),
        audit(acct.id, 'ticket_issued'),
      ]);
      if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) fail(409, 'The login changed. Reload and try again.');
      return json({ code: raw, username: acct.username, expiresInMinutes: ttl / 60, ...(purpose === 'setup' ? { expiresInDays: ttl / 86400 } : {}), purpose });
    }
    if (path === 'two-step-off') {
      // For someone who lost their phone and their recovery codes. They sign in with the password only, then set it up again.
      const results = await env.AUTH_DB.batch([
        q('DELETE FROM auth_totp WHERE account_id=?', acct.id),
        q('UPDATE auth_sessions SET two_step=0 WHERE account_id=?', acct.id),
      ]);
      if (results[0].meta.changes !== 1) fail(409, `${target.name} does not use 2-step sign-in.`);
      await audit(acct.id, 'two_step_removed_by_admin').run();
      return json({ ok: true });
    }
    if (path === 'disable' || path === 'enable') {
      if (target.id === me.id) fail(400, "You can't switch off your own login.");
      const on = path === 'enable' ? 1 : 0;
      await env.AUTH_DB.batch([
        q('UPDATE auth_accounts SET active=?, version=version+1 WHERE id=? AND role<>?', on, acct.id, 'owner'),
        ...(on ? [] : [q('DELETE FROM auth_sessions WHERE account_id=?', acct.id)]),
        audit(acct.id, on ? 'task_account_enabled' : 'task_account_disabled'),
      ]);
      return json({ ok: true });
    }
    fail(404, 'Not found.');
  } catch (e) {
    if (e.status) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400);
    console.error('task accounts error', e?.message);
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
}

async function listAccounts(env, world) {
  const ids = [...world.people.values()].map((p) => p.accountId).filter(Boolean);
  // The database takes at most 100 values in one query, so the accounts are asked for 90 at a time.
  const idParts = Array.from({ length: Math.ceil(ids.length / 90) }, (_, i) => ids.slice(i * 90, i * 90 + 90));
  const rows = [];
  for (const part of idParts) rows.push(...(await env.AUTH_DB.prepare(`SELECT id, username, role, active, (password_hash IS NOT NULL) AS has_password FROM auth_accounts WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part).all()).results);
  const byId = new Map(rows.map((r) => [r.id, r]));
  // Sign-in tracking (Brian, 2 Nov 2026): last sign-in from the audit log (or an open session from before it was kept),
  // last activity from open sessions, and failed tries in the last 7 days.
  const marks = [], since30 = Math.floor(Date.now() / 1000) - 30 * 86400, since7 = Math.floor(Date.now() / 1000) - 7 * 86400;
  for (const part of idParts) marks.push(...(await env.AUTH_DB.prepare(`SELECT a.id,
      (SELECT MAX(at) FROM auth_audit WHERE target_id=a.id AND event LIKE 'login:%') AS last_login,
      (SELECT MAX(created_at) FROM auth_sessions WHERE account_id=a.id) AS last_session,
      (SELECT MAX(idle_expires_at) FROM auth_sessions WHERE account_id=a.id) AS last_idle,
      (SELECT COUNT(*) FROM auth_audit WHERE target_id=a.id AND event LIKE 'login:%' AND at>?) AS logins_30d,
      (SELECT COUNT(*) FROM auth_audit WHERE target_id=a.id AND event LIKE 'login_failed%' AND at>?) AS failed_7d
    FROM auth_accounts a WHERE a.id IN (${part.map(() => '?').join(',')})`).bind(since30, since7, ...part).all()).results);
  const markBy = new Map(marks.map((m) => [m.id, m]));
  let totp = new Map();
  try { totp = new Map((await env.AUTH_DB.prepare(`SELECT account_id, enabled_at FROM auth_totp`).all()).results.map((t) => [t.account_id, t.enabled_at ? 'on' : 'setting-up'])); } catch { /* before identity migration 0003 */ }
  return [...world.people.values()].map((p) => {
    const a = p.accountId && byId.get(p.accountId);
    const m = a && markBy.get(a.id);
    const lastLogin = Math.max(m?.last_login || 0, m?.last_session || 0) || null;
    const lastActive = m?.last_idle ? Math.max(m.last_idle - SESSION_IDLE, lastLogin || 0) : null;
    return { personId: p.id, username: a?.username || null, status: !a ? 'none' : !a.active ? 'off' : a.has_password ? 'active' : 'waiting', owner: a?.role === 'owner',
      lastLogin, lastActive, logins30d: m?.logins_30d || 0, failed7d: m?.failed_7d || 0, twoStep: (a && totp.get(a.id)) || 'off' };
  });
}

// ---------------- staging copy only ----------------
// Active only when TASKS_STAGING_SEED="true" (never set in production).
// - Seeds the roster and sample tasks into an empty task database.
// - /staging-setup.html lets Brian set a first staging password using the
//   STAGING_SETUP_CODE secret chosen in the Cloudflare dashboard. Works once.
let seeded = false;
export async function ensureStagingSeed(env) {
  if (seeded || env.TASKS_STAGING_SEED !== 'true' || !env.TASKS_DB) return;
  const row = await env.TASKS_DB.prepare('SELECT COUNT(*) AS n FROM people').first();
  if (row.n === 0) {
    try { await env.TASKS_DB.batch(rosterStatements(env.TASKS_DB)); await loadSamples(env.TASKS_DB); }
    catch (e) { console.error('staging seed', e?.message); }
  }
  seeded = true;
}

const page = (body, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Staging setup</title>
<style>body{font-family:system-ui,sans-serif;max-width:460px;margin:40px auto;padding:0 16px;color:#16202a}label{display:block;margin:12px 0 4px;font-size:14px}input{width:100%;padding:8px;font-size:15px;box-sizing:border-box}button{margin-top:16px;padding:9px 16px;font-size:15px;background:#f4b400;border:0;border-radius:6px;font-weight:600}.note{color:#58646f;font-size:14px}</style></head><body>${body}</body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function stagingSetup(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/staging-setup.html') return null;
  if (env.TASKS_STAGING_SEED !== 'true' || !env.AUTH_DB || !env.TASKS_DB) return null;
  await ensureStagingSeed(env);
  const secret = String(env.STAGING_SETUP_CODE || '');
  const form = (msg = '') => page(`<h1>Test copy: first sign-in</h1><p class="note">For Brian only. Use the setup phrase you saved in the Cloudflare dashboard as STAGING_SETUP_CODE. This works once.</p>${msg}
<form method="post"><label for="c">Setup phrase</label><input id="c" name="code" type="password" required autocomplete="off">
<label for="p">New password (15 characters or more)</label><input id="p" name="password" type="password" required minlength="15" autocomplete="new-password">
<button type="submit">Set my password</button></form>`);
  const q = (sql, ...a) => env.AUTH_DB.prepare(sql).bind(...a);
  const existing = await q("SELECT id, password_hash FROM auth_accounts WHERE username='brian'").first();
  if (existing?.password_hash) return page('<h1>Already set up</h1><p>Brian\'s test login already has a password. <a href="/sign-in.html">Go to sign-in</a>.</p><p class="note">Forgot it? Ming can issue a reset code from Team &amp; access, or ask Claude to reset the test copy.</p>');
  if (secret.length < 16) return page('<h1>Not ready</h1><p>Add a secret named STAGING_SETUP_CODE (16+ characters) to this Worker in the Cloudflare dashboard, then reload.</p>', 503);
  if (request.method === 'GET') return form();
  if (request.method !== 'POST') fail(405, 'Method not allowed.');
  // The portal sends Referrer-Policy: no-referrer, so browsers send "Origin: null" on plain form posts.
  // Accept the browser's same-origin signal in that case; anything cross-site is still refused.
  const o = request.headers.get('origin'), site = request.headers.get('sec-fetch-site');
  if (!(o === env.APP_ORIGIN || (o === 'null' && site === 'same-origin'))) fail(403, 'Request blocked. Reload the page and try again.');
  const data = new URLSearchParams((await request.text()).slice(0, 2048));
  const code = data.get('code') || '', password = data.get('password') || '';
  const a = Buffer.from(createHash('sha256').update(code).digest('hex')), b = Buffer.from(createHash('sha256').update(secret).digest('hex'));
  if (!timingSafeEqual(a, b)) return form('<p style="color:#c0392e">That setup phrase is not right.</p>');
  if (!validPassword(password)) return form('<p style="color:#c0392e">Use a password of 15–128 characters.</p>');
  const hash = await passwordHash(password), now = Math.floor(Date.now() / 1000);
  const accountId = existing?.id || 'acct-staging-brian';
  if (!existing) {
    await env.AUTH_DB.batch([
      q('INSERT INTO auth_accounts(id, username, role, password_hash, active, version, created_at) VALUES(?,?,?,?,?,?,?)', accountId, 'brian', 'reader', hash, 1, 1, now),
      q('INSERT INTO auth_bindings(account_id, app_id, subject_id) VALUES(?,?,?)', accountId, 'portal', 'task:brian'),
      q('INSERT INTO auth_audit VALUES(?,?,?,?,?)', token(), 'staging-setup', accountId, 'staging_first_password', now),
    ]);
  } else {
    await q('UPDATE auth_accounts SET password_hash=?, version=version+1 WHERE id=? AND password_hash IS NULL', hash, accountId).run();
  }
  await env.TASKS_DB.prepare("UPDATE people SET account_id=? WHERE id='brian'").bind(accountId).run();
  return page('<h1>Done</h1><p>Your test password is set. <a href="/sign-in.html">Sign in</a> with username <b>brian</b>.</p><p class="note">From Team &amp; access you can now create logins and setup codes for anyone who should test.</p>');
}

// "View as" for testing: staging copy only (TASKS_STAGING_SEED="true"), admins only.
// The choice is kept in a cookie; the task API then answers exactly as it would for that person.
const VIEW_COOKIE = '__Host-staging_view_as';
const readViewCookie = (request) => /(?:^|;\s*)__Host-staging_view_as=([a-z0-9._-]{1,40})/.exec(request.headers.get('cookie') || '')?.[1] || null;
async function stagingAdmin(env, personId) {
  if (env.TASKS_STAGING_SEED !== 'true' || !personId) return null;
  const world = await taskService(env.TASKS_DB).loadWorld();
  const me = world.people.get(personId);
  return me && P.isAdmin(me) ? world : null;
}
async function stagingViewAs(request, env, personId) {
  const id = readViewCookie(request);
  if (!id || env.TASKS_STAGING_SEED !== 'true') return personId;
  const world = await stagingAdmin(env, personId);
  return world?.people.get(id)?.active ? id : personId;
}
async function viewAsApi(request, env, personId) {
  const world = await stagingAdmin(env, personId);
  if (!world) return json({ enabled: false });
  const cookie = (v, age) => `${VIEW_COOKIE}=${v}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
  if (request.method === 'GET') {
    const current = readViewCookie(request);
    return json({ enabled: true, me: personId, viewAs: current && world.people.get(current) ? current : null,
      people: [...world.people.values()].filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, company: p.company, level: p.level })) });
  }
  if (request.method !== 'POST') fail(405, 'Method not allowed.');
  if (request.headers.get('origin') !== (env.APP_ORIGIN || new URL(request.url).origin) || request.headers.get('x-requested-with') !== 'tasks') fail(403, 'Request blocked.');
  const body = JSON.parse((await request.text()).slice(0, 1024) || '{}');
  const id = body.person && body.person !== personId && world.people.get(body.person)?.active ? body.person : null;
  return new Response(JSON.stringify({ ok: true, viewAs: id }), { headers: { ...headers, 'Set-Cookie': id ? cookie(id, 8 * 3600) : cookie('', 0) } });
}
