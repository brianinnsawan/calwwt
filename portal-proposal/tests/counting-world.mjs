// A whole signed-in site for tests (the real handler, in-memory databases) that also records every database call.
// Used by request-cost.test.mjs and audit-fixes.test.mjs. Not a test file itself.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler } from '../src/worker.mjs';
import { HttpError } from '../src/auth.mjs';
import { passwordHash } from '../src/identity/password.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

export const origin = 'https://calnkt.example';
const pw = 'synthetic phrase for counting 501!';

export async function world() {
  const calls = [];
  const d1 = (sqlite, name) => {
    const note = (kind, sql) => calls.push(`${name} ${kind} ${sql.replace(/\s+/g, ' ').slice(0, 70)}`);
    const stmt = (sql, args = []) => ({
      bind: (...a) => stmt(sql, a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v))),
      first: async () => { note('read', sql); return sqlite.prepare(sql).get(...args) ?? null; },
      all: async () => { note('read', sql); return { results: sqlite.prepare(sql).all(...args) }; },
      run: async () => { note('WRITE', sql); return { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }; },
      _sql: sql,
      _exec: () => (/\bRETURNING\b|^\s*SELECT/i.test(sql) ? { results: sqlite.prepare(sql).all(...args) } : { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
    });
    return { prepare: (sql) => stmt(sql), async batch(list) { note('WRITE', 'batch: ' + list[0]._sql); sqlite.exec('BEGIN'); try { const r = list.map((s) => s._exec()); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
  };
  const app = new DatabaseSync(':memory:'), auth = new DatabaseSync(':memory:'), tasks = new DatabaseSync(':memory:');
  app.exec('CREATE TABLE users(id TEXT, email TEXT)');
  app.prepare('INSERT INTO users VALUES(?,?)').run('owner-id', 'owner@example.com');
  for (const m of ['0001_identity.sql', '0002_audit_lock.sql', '0003_two_step.sql']) auth.exec(readFileSync(new URL(`../../identity-proposal/migrations/${m}`, import.meta.url), 'utf8'));
  for (const f of ['0001_tasks.sql', '0002_hidden_from.sql', '0003_language.sql', '0004_page_access.sql', '0005_files.sql', '0006_trackers.sql', '0007_meetings.sql', '0008_meeting_docs.sql', '0009_repeat_days.sql', '0010_agent_keys.sql']) tasks.exec(readFileSync(new URL(`../../tasks/schema/${f}`, import.meta.url), 'utf8'));
  const TASKS_DB = d1(tasks, 'tasks');
  await TASKS_DB.batch(rosterStatements(TASKS_DB));
  const hash = await passwordHash(pw);
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acct-brian', 'brian', 'owner', hash, 1);
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acct-gift', 'gift', 'reader', hash, 1);
  auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('acct-brian', 'portal', 'owner-id');
  auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('acct-gift', 'portal', 'task:gift');
  tasks.prepare("UPDATE people SET account_id='acct-brian' WHERE id='brian'").run();
  tasks.prepare("UPDATE people SET account_id='acct-gift' WHERE id='gift'").run();
  const env = {
    APP_ORIGIN: origin, SITE_READY: 'true', DB: d1(app, 'portal'), AUTH_DB: d1(auth, 'logins'), TASKS_DB, TASKS_ENABLED: 'true',
    LOCAL_AUTH_ENABLED: 'true', LOCAL_AUTH_OWNER_ID: 'owner-id', LOCAL_AUTH_READER_ID: 'reader-id', AUTH_RATE_KEY: 'synthetic-portal-test-rate-key-12345',
    ASSETS: { fetch: async () => new Response('asset', { headers: { etag: '"abc"', 'content-type': 'text/javascript' } }) },
  };
  const handler = createHandler(async () => { throw new HttpError(401, 'Sign in'); });
  const signIn = async (username) => {
    const r = await handler(new Request(origin + '/api/local-auth/login', { method: 'POST', headers: { origin, 'x-project-auth': '1', 'content-type': 'application/json' }, body: JSON.stringify({ username, password: pw }) }), env);
    assert.equal(r.status, 200, `${username} signs in`);
    return r.headers.get('set-cookie').split(';')[0];
  };
  const get = async (path, cookie) => { calls.length = 0; const r = await handler(new Request(origin + path, { headers: { cookie, accept: '*/*' } }), env); return { r, calls: [...calls] }; };
  return { env, auth, tasks, handler, signIn, get };
}
