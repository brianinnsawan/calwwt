// The live databases are set up from tools/setup (README there). This builds them the same way and checks that Brian's
// owner login works with a setup code, that the 8 people and the site areas are there, and who sees what.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { createHandler } from '../src/worker.mjs';
import { HttpError } from '../src/auth.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const config = read('../../production/wrangler.jsonc');
const OWNER = /"LOCAL_AUTH_OWNER_ID":\s*"([^"]+)"/.exec(config)[1];
const origin = /"APP_ORIGIN":\s*"([^"]+)"/.exec(config)[1];

function d1(sqlite) {
  const stmt = (sql, args = []) => ({
    bind: (...a) => { if (a.length > 100) throw new Error('D1_ERROR: too many SQL variables'); return stmt(sql, a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v))); },
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
    _exec: () => (/\bRETURNING\b|^\s*SELECT/i.test(sql) ? { results: sqlite.prepare(sql).all(...args) } : { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: (sql) => stmt(sql), async batch(list) { sqlite.exec('BEGIN'); try { const r = list.map((s) => s._exec()); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
}

function live() {
  const tasks = new DatabaseSync(':memory:'), auth = new DatabaseSync(':memory:'), portal = new DatabaseSync(':memory:');
  for (const f of readdirSync(new URL('../../tasks/schema/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()) tasks.exec(read(`../../tasks/schema/${f}`));
  tasks.exec(read('../../tools/setup/calwwt-start.sql'));
  for (const f of readdirSync(new URL('../../identity-proposal/migrations/', import.meta.url)).sort()) auth.exec(read(`../../identity-proposal/migrations/${f}`));
  auth.exec(read('../../tools/setup/owner-account.sql'));
  portal.exec(read('../../tools/setup/portal.sql'));
  tasks.exec(read('../../tools/setup/link-owner.sql'));
  const env = {
    APP_ORIGIN: origin, SITE_READY: 'true', DB: d1(portal), AUTH_DB: d1(auth), TASKS_DB: d1(tasks), TASKS_ENABLED: 'true', LOCAL_AUTH_ENABLED: 'true',
    LOCAL_AUTH_OWNER_ID: OWNER, LOCAL_AUTH_READER_ID: '', AUTH_RATE_KEY: 'synthetic-calwwt-test-rate-key-123456', TWO_STEP_FOR_ADMINS: 'false',
    ASSETS: { fetch: async (r) => new Response('portal asset ' + new URL(r.url).pathname) },
  };
  return { tasks, auth, env, handler: createHandler(async () => { throw new HttpError(401, 'Sign in'); }) };
}
const post = (path, body, cookie, extra = {}) => new Request(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra }, body: JSON.stringify(body) });
const get = (path, cookie, accept = 'application/json') => new Request(origin + path, { headers: { cookie, accept } });

test('calwwt live setup: 8 people, 10 task areas (8 sites + KP3 8888 + all), site folders, no NTI rows', () => {
  const w = live();
  assert.equal(origin, 'https://calwwt.sppwork.com');
  assert.deepEqual(w.tasks.prepare('SELECT id FROM people ORDER BY id').all().map((r) => r.id), ['bas', 'boss', 'brian', 'keng', 'ming', 'oat', 'praew', 'thada']);
  assert.deepEqual(w.tasks.prepare("SELECT id FROM people WHERE company='caltex' ORDER BY id").all().map((r) => r.id), ['bas', 'oat', 'thada']);
  assert.equal(w.tasks.prepare('SELECT COUNT(*) n FROM areas').get().n, 10);
  assert.equal(w.tasks.prepare("SELECT COUNT(*) n FROM file_folders WHERE parent_id='sites'").get().n, 9);
  assert.equal(w.tasks.prepare("SELECT COUNT(*) n FROM milestones WHERE name LIKE '%Kick-Off%' OR name LIKE '%DOEB%'").get().n, 0);
  assert.equal(w.tasks.prepare("SELECT COUNT(*) n FROM page_access WHERE subject LIKE 'person:%'").get().n, 0);
  assert.match(config, /"database_id": "bba26309-c326-4afb-89cb-a95d9c7ca315"/, 'tasks database is calwwt-tasks, not calnkt');
  assert.doesNotMatch(config, /8d656750-0a42-4ee0-b98f-aaa34636c66d|daedd98d-e0c1-43ae-80ab-b7acc5276f8b|brian-cad-version2/, 'nothing shared with calnkt');
});

test('calwwt live setup: Brian redeems a setup code, signs in, lands on Sites and sees everything', async () => {
  const w = live();
  const code = randomBytes(32).toString('base64url');
  w.auth.prepare("INSERT INTO auth_tickets(digest, account_id, version, expires_at, purpose) VALUES(?, 'acct-brian', 0, ?, 'setup')")
    .run(createHash('sha256').update(code).digest('hex'), Math.floor(Date.now() / 1000) + 900);
  const pw = 'a synthetic owner phrase for calwwt 77!';
  const redeem = await w.handler(post('/api/local-auth/redeem', { token: code, password: pw }, null, { 'x-project-auth': '1' }), w.env);
  assert.equal(redeem.status, 200, await redeem.clone().text());
  const login = await w.handler(post('/api/local-auth/login', { username: 'brian', password: pw }, null, { 'x-project-auth': '1' }), w.env);
  assert.equal(login.status, 200);
  const brian = login.headers.get('set-cookie').split(';')[0];
  const me = await (await w.handler(get('/api/me', brian), w.env)).json();
  assert.equal(me.person, 'brian'); assert.equal(me.pages.drawings, 'edit'); assert.equal(me.pages.timeline, 'edit'); assert.equal(me.accessAdmin, true);
  assert.equal((await w.handler(get('/sites/', brian, 'text/html'), w.env)).status, 200);
  const state = await (await w.handler(get('/api/tasks/state', brian), w.env)).json();
  assert.equal(state.me.id, 'brian');
  // Same code twice: refused.
  assert.equal((await w.handler(post('/api/local-auth/redeem', { token: code, password: pw }, null, { 'x-project-auth': '1' }), w.env)).status, 400);
});
