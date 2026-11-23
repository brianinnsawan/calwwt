// Task app inside the portal worker: logins, task-only limits, account admin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler } from '../src/worker.mjs';
import { HttpError } from '../src/auth.mjs';
import { signViewAs } from '../src/site-access.mjs';
import { passwordHash } from '../src/identity/password.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

const origin = 'https://brian-cad-version2.brianin-nsawan.workers.dev';

function d1(sqlite) {
  const stmt = (sql, args = []) => ({
    // As the live database (D1): at most 100 values in one query.
    bind: (...a) => { if (a.length > 100) throw new Error('D1_ERROR: too many SQL variables'); return stmt(sql, a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v))); },
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
    _exec: () => (/\bRETURNING\b|^\s*SELECT/i.test(sql) ? { results: sqlite.prepare(sql).all(...args) } : { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql) => stmt(sql),
    async batch(list) { sqlite.exec('BEGIN'); try { const r = list.map((s) => s._exec()); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
  };
}

async function world() {
  const app = new DatabaseSync(':memory:'), auth = new DatabaseSync(':memory:'), tasks = new DatabaseSync(':memory:');
  app.exec('CREATE TABLE users(id TEXT, email TEXT)');
  app.prepare('INSERT INTO users VALUES(?,?)').run('owner-id', 'owner@example.com');
  app.prepare('INSERT INTO users VALUES(?,?)').run('reader-id', 'reader@example.com');
  for (const m of ['0001_identity.sql', '0002_audit_lock.sql', '0003_two_step.sql']) auth.exec(readFileSync(new URL(`../../identity-proposal/migrations/${m}`, import.meta.url), 'utf8'));
  for (const f of ['0001_tasks.sql', '0002_hidden_from.sql', '0003_language.sql', '0004_page_access.sql', '0005_files.sql', '0006_trackers.sql', '0007_meetings.sql', '0008_meeting_docs.sql', '0009_repeat_days.sql', '0010_agent_keys.sql', '0011_site_timelines.sql']) tasks.exec(readFileSync(new URL(`../../tasks/schema/${f}`, import.meta.url), 'utf8'));
  const TASKS_DB = d1(tasks);
  await TASKS_DB.batch(rosterStatements(TASKS_DB));
  const brianPw = 'synthetic owner phrase for tests 501!', mingPw = 'synthetic reader phrase for tests 502!';
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acct-brian', 'brian', 'owner', await passwordHash(brianPw), 1);
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acct-ming', 'ming', 'reader', await passwordHash(mingPw), 1);
  auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('acct-brian', 'portal', 'owner-id');
  auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('acct-ming', 'portal', 'reader-id');
  tasks.prepare("UPDATE people SET account_id='acct-brian' WHERE id='brian'").run();
  tasks.prepare("UPDATE people SET account_id='acct-ming' WHERE id='ming'").run();
  const env = {
    APP_ORIGIN: origin, SITE_READY: 'true', DB: d1(app), AUTH_DB: d1(auth), TASKS_DB, TASKS_ENABLED: 'true',
    LOCAL_AUTH_ENABLED: 'true', LOCAL_AUTH_OWNER_ID: 'owner-id', LOCAL_AUTH_READER_ID: 'reader-id', AUTH_RATE_KEY: 'synthetic-portal-test-rate-key-12345',
    ASSETS: { fetch: async (r) => new Response('portal asset ' + new URL(r.url).pathname) },
  };
  const handler = createHandler(async () => { throw new HttpError(401, 'Sign in'); });
  return { env, handler, auth, tasks, brianPw, mingPw };
}

const authPost = (path, body, cookie) => new Request(origin + path, { method: 'POST', headers: { origin, 'x-project-auth': '1', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
const taskPost = (path, body, cookie) => new Request(origin + path, { method: 'POST', headers: { origin, 'x-requested-with': 'tasks', 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
const get = (path, cookie, accept = 'application/json') => new Request(origin + path, { headers: { cookie, accept } });
async function signIn(w, username, password) {
  const res = await w.handler(authPost('/api/local-auth/login', { username, password }), w.env);
  assert.equal(res.status, 200, `${username} signs in`);
  return res.headers.get('set-cookie').split(';')[0];
}

test('Brian signs in once and gets the task page and the task state', async () => {
  const w = await world();
  const c = await signIn(w, 'brian', w.brianPw);
  const page = await w.handler(get('/tasks.html', c, 'text/html'), w.env);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>[^<]*Caltex Wastewater 2027[^<]*<\/title>/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  const state = await (await w.handler(get('/api/tasks/state', c), w.env)).json();
  assert.equal(state.me.id, 'brian');
  assert.equal(state.me.can.admin, true);
});

test('admin creates a login for Gift; Gift sets a password and is limited to the task app', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  let res = await w.handler(taskPost('/api/task-accounts/create', { personId: 'gift', username: 'gift' }, brian), w.env);
  assert.equal(res.status, 200, await res.clone().text());
  res = await w.handler(taskPost('/api/task-accounts/code', { personId: 'gift' }, brian), w.env);
  const { code, purpose } = await res.json();
  assert.equal(purpose, 'setup');
  const pw = 'gift synthetic setup phrase 777!';
  res = await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
  assert.equal(res.status, 200);
  const gift = await signIn(w, 'gift', pw);

  assert.equal((await w.handler(get('/tasks.html', gift, 'text/html'), w.env)).status, 200);
  // Project logins get the project home and the areas the Access page gives them, never the old site's own drawing store.
  for (const p of ['/sites/', '/sites/1156/', '/api/site/drawings', '/milestones/', '/__nav/bar.mjs']) {
    assert.equal((await w.handler(get(p, gift, 'text/html'), w.env)).status, 200, `Gift opens ${p}`);
  }
  for (const p of ['/', '/project-home.html']) {
    const r = await w.handler(get(p, gift, 'text/html'), w.env);
    assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/tasks.html', 'no home page: Gift lands on Tasks');
  }
  assert.equal((await w.handler(get('/admin', gift, 'text/html'), w.env)).status, 404);
  const me = await (await w.handler(get('/api/me', gift), w.env)).json();
  assert.deepEqual(me.areas.sort(), ['drawings', 'files', 'meetings', 'safety', 'tasks', 'timeline']);
  assert.equal(me.pages.scurve_station, 'none', 'site team sees no S-curves');
  assert.equal(me.siteReady, true);
  assert.equal(me.accessAdmin, false);
  assert.equal(me.name, 'Gift');
  assert.equal(me.person, 'gift');
  for (const p of ['/api/drawings', '/api/storage', '/app/OpenCADStudio-84d8f89e0569038a_bg.wasm', '/source/x']) {
    assert.equal((await w.handler(get(p, gift), w.env)).status, 404, `project login blocked from ${p}`);
  }
  // The old site's CAD pages are not part of calwwt.
  for (const p of ['/workspace/', '/cad', '/app/']) assert.equal((await w.handler(get(p, gift), w.env)).status, 404, p);
  const upload = await w.handler(new Request(origin + '/api/drawings', { method: 'POST', headers: { cookie: gift, origin, 'x-cad-request': '1' }, body: 'AC1032' }), w.env);
  assert.equal(upload.status, 403);
  const created = await w.handler(taskPost('/api/tasks/tasks', { title: 'Cable tray delivery' }, gift), w.env);
  assert.equal(created.status, 200);
  const state = await (await w.handler(get('/api/tasks/state', gift), w.env)).json();
  assert.equal(state.me.id, 'gift');
  assert.deepEqual(state.tasks.map((t) => t.title), ['Cable tray delivery']);
  // Gift cannot manage logins
  assert.equal((await w.handler(taskPost('/api/task-accounts/code', { personId: 'por' }, gift), w.env)).status, 403);
  assert.equal((await w.handler(get('/api/task-accounts/list', gift), w.env)).status, 403);
});

test("Ming (admin) can issue codes for others but never for Brian's owner login", async () => {
  const w = await world();
  const ming = await signIn(w, 'ming', w.mingPw);
  assert.equal((await w.handler(taskPost('/api/task-accounts/create', { personId: 'oat', username: 'oat' }, ming), w.env)).status, 200);
  assert.equal((await w.handler(taskPost('/api/task-accounts/code', { personId: 'oat' }, ming), w.env)).status, 200);
  const res = await w.handler(taskPost('/api/task-accounts/code', { personId: 'brian' }, ming), w.env);
  assert.equal(res.status, 403);
  const owner = w.auth.prepare("SELECT password_hash FROM auth_accounts WHERE id='acct-brian'").get();
  assert.ok(owner.password_hash, "Brian's password untouched");
  // Ming's portal reader limits are unchanged: still cannot write portal records.
  const write = await w.handler(new Request(origin + '/api/drawings', { method: 'POST', headers: { origin, 'x-cad-request': '1', cookie: ming } }), w.env);
  assert.equal(write.status, 403);
});

test('observers cannot see or change logins; switched-off logins stop working', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  await w.handler(taskPost('/api/task-accounts/create', { personId: 'boss', username: 'boss' }, brian), w.env);
  const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId: 'boss' }, brian), w.env)).json();
  const pw = 'boss synthetic setup phrase 888!';
  await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
  const boss = await signIn(w, 'boss', pw);
  assert.equal((await w.handler(get('/api/task-accounts/list', boss), w.env)).status, 403);
  assert.equal((await w.handler(get('/admin', boss, 'text/html'), w.env)).status, 404, 'Admin page: admins only');
  assert.equal((await w.handler(taskPost('/api/task-accounts/create', { personId: 'por', username: 'por' }, boss), w.env)).status, 403);
  assert.equal((await w.handler(taskPost('/api/tasks/tasks', { title: 'x' }, boss), w.env)).status, 403);
  // Brian switches Boss off
  assert.equal((await w.handler(taskPost('/api/task-accounts/disable', { personId: 'boss' }, brian), w.env)).status, 200);
  assert.equal((await w.handler(get('/api/tasks/state', boss), w.env)).status, 401);
});

test('when the task app is switched off, task-only logins cannot sign in and portal behaves as before', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  await w.handler(taskPost('/api/task-accounts/create', { personId: 'por', username: 'por' }, brian), w.env);
  const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId: 'por' }, brian), w.env)).json();
  const pw = 'por synthetic setup phrase 999!';
  await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
  w.env.TASKS_ENABLED = 'false';
  const res = await w.handler(authPost('/api/local-auth/login', { username: 'por', password: pw }), w.env);
  assert.equal(res.status, 401);
  assert.equal((await w.handler(get('/tasks.html', brian, 'text/html'), w.env)).status, 404);
});

test('cross-site requests to the task API are refused', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  const evil = new Request(origin + '/api/tasks/tasks', { method: 'POST', headers: { origin: 'https://evil.example', 'x-requested-with': 'tasks', 'content-type': 'application/json', cookie: brian }, body: '{"title":"x"}' });
  assert.equal((await w.handler(evil, w.env)).status, 403);
  const noHeader = new Request(origin + '/api/tasks/tasks', { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: brian }, body: '{"title":"x"}' });
  assert.equal((await w.handler(noHeader, w.env)).status, 403);
});

test('staging setup page: off in production, works once with the dashboard phrase', async () => {
  const w = await world();
  const page = (body) => new Request(origin + '/staging-setup.html', body ? { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body } : {});
  // Production (flag off): the page does not exist
  assert.notEqual((await w.handler(page(), w.env)).status, 200);
  // Staging with an empty identity DB
  w.auth.exec('DELETE FROM auth_bindings; DELETE FROM auth_accounts;');
  w.tasks.exec('UPDATE people SET account_id=NULL');
  Object.assign(w.env, { TASKS_STAGING_SEED: 'true', STAGING_SETUP_CODE: 'a long staging phrase chosen by brian' });
  assert.equal((await w.handler(page(), w.env)).status, 200);
  const nullOrigin = (body, site) => new Request(origin + '/staging-setup.html', { method: 'POST', headers: { origin: 'null', 'sec-fetch-site': site, 'content-type': 'application/x-www-form-urlencoded' }, body });
  assert.equal((await w.handler(nullOrigin('code=x&password=y', 'cross-site'), w.env)).status, 403, 'cross-site form refused');
  assert.match(await (await w.handler(nullOrigin('code=wrong&password=y', 'same-origin'), w.env)).text(), /not right/, 'same-site form with Origin: null accepted');
  let res = await w.handler(page('code=wrong&password=' + encodeURIComponent('brian staging password 123!')), w.env);
  assert.match(await res.text(), /not right/);
  res = await w.handler(page('code=' + encodeURIComponent('a long staging phrase chosen by brian') + '&password=' + encodeURIComponent('brian staging password 123!')), w.env);
  assert.match(await res.text(), /Done/);
  const c = await signIn(w, 'brian', 'brian staging password 123!');
  const state = await (await w.handler(get('/api/tasks/state', c), w.env)).json();
  assert.equal(state.me.id, 'brian');
  // Second use is refused
  res = await w.handler(page('code=' + encodeURIComponent('a long staging phrase chosen by brian') + '&password=' + encodeURIComponent('another password 456789!')), w.env);
  assert.match(await res.text(), /Already set up/);
});

test('"View as" works only on the test copy and only for admins', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  const setView = (cookie, person) => w.handler(taskPost('/api/tasks-staging/view-as', { person }, cookie), w.env);
  const meAs = async (cookie) => (await (await w.handler(get('/api/tasks/state', cookie), w.env)).json()).me.id;
  // Live site (flag off): disabled and ignored
  assert.deepEqual(await (await w.handler(get('/api/tasks-staging/view-as', brian), w.env)).json(), { enabled: false });
  assert.equal(await meAs(`${brian}; __Host-staging_view_as=gift`), 'brian');
  // Test copy: admin can view as Gift
  w.env.TASKS_STAGING_SEED = 'true';
  const res = await setView(brian, 'gift');
  const viewCookie = res.headers.get('set-cookie').split(';')[0];
  assert.equal(await meAs(`${brian}; ${viewCookie}`), 'gift');
  // A non-admin cannot use it
  await w.handler(taskPost('/api/task-accounts/create', { personId: 'tle', username: 'tle' }, brian), w.env);
  const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId: 'tle' }, brian), w.env)).json();
  await w.handler(authPost('/api/local-auth/redeem', { token: code, password: 'tle synthetic setup phrase 333!' }), w.env);
  const tle = await signIn(w, 'tle', 'tle synthetic setup phrase 333!');
  assert.equal(await meAs(`${tle}; __Host-staging_view_as=brian`), 'tle');
  assert.deepEqual(await (await w.handler(get('/api/tasks-staging/view-as', tle), w.env)).json(), { enabled: false });
});

test('tasks-only site: even the owner reaches only the task app', async () => {
  const w = await world();
  w.env.TASKS_ONLY = 'true';
  w.env.PORTAL_URL = 'https://portal.example/project-home.html';
  const brian = await signIn(w, 'brian', w.brianPw);
  const home = await w.handler(get('/', brian, 'text/html'), w.env);
  assert.equal(home.status, 302);
  assert.equal(home.headers.get('location'), '/tasks.html');
  for (const p of ['/api/me', '/api/drawings', '/project-home.html']) {
    const r = await w.handler(get(p, brian), w.env);
    assert.ok([302, 404].includes(r.status), `${p} blocked (${r.status})`);
  }
  const state = await (await w.handler(get('/api/tasks/state', brian), w.env)).json();
  assert.equal(state.me.id, 'brian');
  assert.equal(state.portalUrl, 'https://portal.example/project-home.html');
});

test('Admin page: page levels per group and person, enforced by the server', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  const login = async (personId, username) => {
    await w.handler(taskPost('/api/task-accounts/create', { personId, username }, brian), w.env);
    const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId }, brian), w.env)).json();
    const pw = `${username} synthetic setup phrase 4242!`;
    await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
    return signIn(w, username, pw);
  };
  const tom = await login('tom', 'tom'), keng = await login('keng', 'keng'), boss = await login('boss', 'boss');
  const status = async (p, c) => (await w.handler(get(p, c, 'text/html'), w.env)).status;
  // KS by default: no Drawings, no Safety; timeline + station S-curve to view; tasks.
  for (const p of ['/sites/', '/sites/1156/', '/sites', '/sites/programme/', '/sites/data/sites.json', '/api/sites/1156/timeline', '/api/site/drawings', '/admin']) assert.equal(await status(p, tom), 404, `KS blocked from ${p}`);
  assert.equal(await status('/milestones/', tom), 200);
  assert.equal(await status('/tasks.html', tom), 200);
  const tomMe = await (await w.handler(get('/api/me', tom), w.env)).json();
  assert.deepEqual(tomMe.pages, { drawings: 'none', safety: 'none', timeline: 'view', scurve_station: 'view', scurve_caltex: 'none', tasks: 'edit', files: 'none', meetings: 'none' });

  // Admin page: admins only.
  assert.equal(await status('/admin', brian), 200);
  assert.equal(await status('/admin', boss), 404, 'observers: no Admin page');
  assert.equal(await status('/admin', keng), 404);
  assert.equal((await w.handler(get('/admin.html', brian, 'text/html'), w.env)).headers.get('location'), '/admin');

  // Brian opens Sites; the normal script policy applies; changes to the page itself are refused.
  const sites = await w.handler(get('/sites/', brian, 'text/html'), w.env);
  assert.equal(sites.status, 200);
  assert.equal(await sites.text(), 'portal asset /sites/index.html');
  assert.match(sites.headers.get('content-security-policy'), /script-src 'self' 'wasm-unsafe-eval';/);
  // Map pictures (OpenStreetMap) are allowed on the Sites pages only.
  assert.match(sites.headers.get('content-security-policy'), /img-src 'self' data: blob: https:\/\/tile\.openstreetmap\.org https:\/\/server\.arcgisonline\.com;/);
  assert.doesNotMatch((await w.handler(get('/files/', brian, 'text/html'), w.env)).headers.get('content-security-policy') || '', /openstreetmap|arcgis/);
  assert.doesNotMatch((await w.handler(get('/tasks.html', brian, 'text/html'), w.env)).headers.get('content-security-policy'), /openstreetmap/);
  assert.equal(await (await w.handler(get('/sites/1703/', brian, 'text/html'), w.env)).text(), 'portal asset /sites/site.html');
  assert.equal(await (await w.handler(get('/sites/programme/', brian, 'text/html'), w.env)).text(), 'portal asset /sites/site.html');
  const bare = await w.handler(get('/sites/1703', brian, 'text/html'), w.env);
  assert.equal(bare.status, 308); assert.equal(bare.headers.get('location'), '/sites/1703/');
  assert.equal(await status('/sites/9999/', brian), 404, 'not one of the 8 sites');
  assert.equal((await w.handler(new Request(origin + '/sites/', { method: 'POST', headers: { cookie: brian, origin } }), w.env)).status, 405);

  // Only admins change levels.
  for (const c of [keng, boss, tom]) assert.equal((await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'person:tom', page: 'drawings', level: 'view' }, c), w.env)).status, 403);
  let res = await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'person:tom', page: 'drawings', level: 'view' }, brian), w.env);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(await status('/sites/', tom), 200, 'person exception opens Sites for Tom only');
  // Tasks at view: the app opens, changes are refused.
  await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'group:ks', page: 'tasks', level: 'view' }, brian), w.env);
  assert.equal(await status('/tasks.html', tom), 200);
  assert.equal((await w.handler(taskPost('/api/tasks/tasks', { title: 'x' }, tom), w.env)).status, 403);
  // Tasks at none: gone.
  await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'group:ks', page: 'tasks', level: 'none' }, brian), w.env);
  assert.equal(await status('/tasks.html', tom), 404);
  assert.equal((await w.handler(get('/api/tasks/state', tom), w.env)).status, 404);
  // Admins can never be set below view.
  assert.equal((await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'person:ming', page: 'tasks', level: 'none' }, brian), w.env)).status, 400);
  assert.equal(await status('/tasks.html', brian), 200);
});

test('View the site as: admins only, read-only, logged, and a forged cookie does nothing', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  const login = async (personId, username) => {
    await w.handler(taskPost('/api/task-accounts/create', { personId, username }, brian), w.env);
    const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId }, brian), w.env)).json();
    const pw = `${username} synthetic setup phrase 5151!`;
    await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
    return signIn(w, username, pw);
  };
  const keng = await login('keng', 'keng');
  const start = await w.handler(taskPost('/api/view-as', { person: 'tom' }, brian), w.env);
  assert.equal(start.status, 200, await start.clone().text());
  const viewCookie = start.headers.get('set-cookie').split(';')[0];
  assert.match(viewCookie, /^__Host-calwwt_view_as=tom\.\d{10}\.[\w-]{43}$/, 'signed for the admin, the person and an end time');
  assert.match(start.headers.get('set-cookie'), /HttpOnly/);
  const asTom = `${brian}; ${viewCookie}`;
  const status = async (p, c) => (await w.handler(get(p, c, 'text/html'), w.env)).status;
  const me = await (await w.handler(get('/api/me', asTom), w.env)).json();
  assert.equal(me.person, 'tom'); assert.equal(me.viewAs.name, 'Tom'); assert.equal(me.accessAdmin, false);
  for (const p of ['/sites/', '/admin']) assert.equal(await status(p, asTom), 404, `as Tom: ${p} hidden`);
  assert.equal(await status('/api/task-accounts/list', asTom), 403, 'no login management while viewing');
  assert.equal(await status('/milestones/', asTom), 200);
  const st = await (await w.handler(get('/api/tasks/state', asTom), w.env)).json();
  assert.equal(st.me.id, 'tom'); assert.equal(st.me.readOnly, true); assert.equal(st.admin, undefined);
  assert.equal((await w.handler(taskPost('/api/tasks/tasks', { title: 'x' }, asTom), w.env)).status, 403, 'no changes in their name');
  assert.equal((await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'group:ks', page: 'drawings', level: 'view' }, asTom), w.env)).status, 403);
  const logged = w.tasks.prepare("SELECT data_json FROM events WHERE kind='view_as'").all();
  assert.deepEqual(logged.map((r) => JSON.parse(r.data_json).person), ['tom']);
  // Stop: back to Brian.
  const stop = await w.handler(taskPost('/api/view-as', { person: null }, asTom), w.env);
  assert.equal(stop.status, 200);
  assert.match(stop.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(await status('/sites/', brian), 200);
  // A non-admin cannot start it, and a hand-made cookie is ignored.
  assert.equal((await w.handler(taskPost('/api/view-as', { person: 'tom' }, keng), w.env)).status, 403);
  const forged = await (await w.handler(get('/api/me', `${keng}; __Host-calwwt_view_as=brian`), w.env)).json();
  assert.equal(forged.person, 'keng'); assert.equal(forged.viewAs, null);
});

test('audit F01, F02, F06: canonical paths, temporary passwords must be changed, view-as cannot reset logins', async () => {
  const w = await world();
  // F02: Ming's password was set by an admin (temporary): only the Account page works until Ming chooses one.
  w.auth.prepare("INSERT INTO auth_audit VALUES('ev1','task-admin:brian','acct-ming','password_reset_by_admin',100)").run();
  let ming = await signIn(w, 'ming', w.mingPw);
  let r = await w.handler(get('/tasks.html', ming, 'text/html'), w.env);
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/account.html?change=1');
  assert.equal((await w.handler(get('/api/tasks/state', ming), w.env)).status, 403);
  assert.equal((await w.handler(get('/api/me', ming), w.env)).status, 200);
  assert.equal((await w.handler(get('/account.html', ming, 'text/html'), w.env)).status, 200);
  const changed = await w.handler(authPost('/api/local-auth/change-password', { current: w.mingPw, password: 'a new phrase Ming chose 777' }, ming), w.env);
  assert.equal(changed.status, 200);
  ming = changed.headers.get('set-cookie').split(';')[0];
  assert.equal((await w.handler(get('/api/tasks/state', ming), w.env)).status, 200, 'after choosing a password everything works');

  // F01: disguised spellings are redirected to the plain path or refused.
  const brian = await signIn(w, 'brian', w.brianPw);
  r = await w.handler(get('/%73ites/data/sites.json', brian), w.env);
  assert.equal(r.status, 308); assert.equal(r.headers.get('location'), '/sites/data/sites.json');
  assert.equal((await w.handler(get('/sites%2Fdata%2Fsites.json', brian), w.env)).status, 404);
  assert.equal((await w.handler(get('//sites/data/sites.json', brian), w.env)).status, 404);

  // F06: while viewing the site as someone, login administration and password changes are refused.
  const viewing = `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'brian', 'gift')}`;
  assert.equal((await w.handler(authPost('/api/local-auth/admin/ticket', { accountId: 'acct-ming' }, viewing), w.env)).status, 403);
  assert.equal((await w.handler(authPost('/api/local-auth/change-password', { current: w.brianPw, password: 'x'.repeat(20) }, viewing), w.env)).status, 403);
});

test('2-step sign-in for admins (audit N04): set up, code at sign-in, no reuse, recovery codes once, password re-check', async () => {
  const { codeAt, fromBase32 } = await import('../src/identity/totp.mjs');
  const w = await world(); w.env.TWO_STEP_FOR_ADMINS = 'true';
  const change = (c) => w.handler(taskPost('/api/tasks/admin/pages', { subject: 'person:tom', page: 'drawings', level: 'view' }, c), w.env);
  const login = (body) => w.handler(authPost('/api/local-auth/login', { username: 'brian', password: w.brianPw, ...body }), w.env);
  let brian = await signIn(w, 'brian', w.brianPw);
  let res = await change(brian);
  assert.equal(res.status, 403); assert.match((await res.json()).error, /^TWO_STEP_REQUIRED/);

  assert.equal((await w.handler(authPost('/api/local-auth/two-step/start', { password: 'wrong password entirely' }, brian), w.env)).status, 400);
  const { secret, uri } = await (await w.handler(authPost('/api/local-auth/two-step/start', { password: w.brianPw }, brian), w.env)).json();
  assert.match(uri, /^otpauth:\/\/totp\/Caltex%20WWT%202027%3Abrian/);
  assert.match(w.auth.prepare('SELECT secret FROM auth_totp').get().secret, /^v1:/, 'stored encrypted');
  const key = fromBase32(secret), step = Math.floor(Date.now() / 1000 / 30);
  assert.equal((await w.handler(authPost('/api/local-auth/two-step/enable', { code: '000000' === codeAt(key, step) ? '111111' : '000000' }, brian), w.env)).status, 400);
  const { recoveryCodes } = await (await w.handler(authPost('/api/local-auth/two-step/enable', { code: codeAt(key, step) }, brian), w.env)).json();
  assert.equal(recoveryCodes.length, 8);
  assert.equal((await change(brian)).status, 200, 'this sign-in counts as 2-step after set-up');

  res = await login({});
  assert.equal(res.status, 401); assert.equal((await res.json()).twoStep, true, 'password alone is not enough');
  assert.equal((await login({ code: codeAt(key, step) })).status, 401, 'a used code cannot be used again');
  res = await login({ code: codeAt(key, step + 1) });
  assert.equal(res.status, 200);
  brian = res.headers.get('set-cookie').split(';')[0];
  assert.equal((await login({ code: recoveryCodes[0] })).status, 200, 'recovery code');
  assert.equal((await login({ code: recoveryCodes[0] })).status, 401, 'each recovery code once');

  // Older than 15 minutes: confirm the password (+ code) first.
  w.auth.prepare('UPDATE auth_sessions SET created_at=created_at-3600').run();
  res = await change(brian);
  assert.equal(res.status, 403); assert.match((await res.json()).error, /^CONFIRM_PASSWORD/);
  assert.equal((await w.handler(authPost('/api/local-auth/confirm', { password: w.brianPw }, brian), w.env)).status, 400, 'code needed too');
  assert.equal((await w.handler(authPost('/api/local-auth/confirm', { password: w.brianPw, code: recoveryCodes[1] }, brian), w.env)).status, 200);
  assert.equal((await change(brian)).status, 200);
  const st = await (await w.handler(get('/api/local-auth/two-step', brian), w.env)).json();
  assert.deepEqual([st.enabled, st.recoveryLeft, st.thisSignIn], [true, 6, true]);
  const accounts = (await (await w.handler(get('/api/task-accounts/list', brian), w.env)).json()).accounts;
  assert.equal(accounts.find((a) => a.personId === 'brian').twoStep, 'on');
  assert.equal((await w.handler(taskPost('/api/task-accounts/two-step-off', { personId: 'brian' }, brian), w.env)).status, 403, "the owner's 2-step is not removable by admins");

  const events = w.auth.prepare('SELECT event FROM auth_audit').all().map((r) => r.event);
  for (const e of ['two_step_enabled', 'login_failed:code-computer', 'two_step_recovery_code_used']) assert.ok(events.includes(e), e);
  // Switching it off needs the password and a code.
  assert.equal((await w.handler(authPost('/api/local-auth/two-step/disable', { password: w.brianPw }, brian), w.env)).status, 400);
  assert.equal((await w.handler(authPost('/api/local-auth/two-step/disable', { password: w.brianPw, code: recoveryCodes[2] }, brian), w.env)).status, 200);
  assert.equal(w.auth.prepare('SELECT COUNT(*) n FROM auth_totp').get().n, 0);
  res = await change(brian); assert.match((await res.json()).error, /^TWO_STEP_REQUIRED/);
});

test('night audit: wrong guesses from elsewhere cannot lock the real person out; 2-step guesses are capped', async () => {
  const w = await world();
  const login = (pw, ip, extra = {}) => w.handler(new Request(origin + '/api/local-auth/login', { method: 'POST', headers: { origin, 'x-project-auth': '1', 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ username: 'brian', password: pw, ...extra }) }), w.env);
  for (let i = 0; i < 9; i++) await login('wrong password guess here', `198.51.100.${i}`);
  assert.equal((await login(w.brianPw, '203.0.113.7')).status, 200, 'the real person still signs in from their own device');
  for (let i = 0; i < 8; i++) await login('wrong password guess here', '198.51.100.200');
  assert.equal((await login(w.brianPw, '198.51.100.200')).status, 429, 'the guessing device itself is stopped');
});

test('night audit: other admins cannot change or re-link the owner; hand-made view-as cookies do nothing; https header', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw), ming = await signIn(w, 'ming', w.mingPw);
  let r = await w.handler(taskPost('/api/tasks/admin/people/brian', { level: 'observer' }, ming), w.env);
  assert.equal(r.status, 403, 'Ming cannot demote the owner');
  r = await w.handler(taskPost('/api/tasks/admin/people/brian', { title: 'Owner' }, brian), w.env);
  assert.notEqual(r.status, 403, 'the owner can change his own record');
  r = await w.handler(taskPost('/api/task-accounts/link', { personId: 'brian', accountId: 'acct-ming' }, ming), w.env);
  assert.equal(r.status, 409, 'an existing login is never replaced');
  // A cookie written by hand (even by an admin) is ignored; a signed one for another admin is ignored too.
  const handMade = await (await w.handler(get('/api/me', `${brian}; __Host-calwwt_view_as=tom`), w.env)).json();
  assert.equal(handMade.viewAs, null);
  const { signViewAs } = await import('../src/site-access.mjs');
  const forMing = await (await w.handler(get('/api/me', `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'ming', 'tom')}`), w.env)).json();
  assert.equal(forMing.viewAs, null);
  const viewing = `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'brian', 'tom')}`;
  assert.equal((await w.handler(authPost('/api/local-auth/two-step/start', { password: w.brianPw }, viewing), w.env)).status, 403, '2-step settings refused while viewing');
  assert.equal((await w.handler(authPost('/api/local-auth/logout', {}, viewing), w.env)).status, 200, 'signing out still works');
  const page = await w.handler(get('/tasks.html', brian, 'text/html'), w.env);
  assert.match(page.headers.get('strict-transport-security') || '', /max-age=31536000/);
});

test('Remove from the project (15 Nov 2026): tasks move to the admin, the person and their login are switched off', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw), ming = await signIn(w, 'ming', w.mingPw);
  const login = async (personId, username, pw) => {
    await w.handler(taskPost('/api/task-accounts/create', { personId, username }, brian), w.env);
    const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId }, brian), w.env)).json();
    await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
    return signIn(w, username, pw);
  };
  const giftPw = 'gift synthetic setup phrase 889!';
  const gift = await login('gift', 'gift', giftPw), por = await login('por', 'por', 'por synthetic setup phrase 890!');
  const made = await (await w.handler(taskPost('/api/tasks/tasks', { title: 'Check formwork', assignees: ['gift'] }, brian), w.env)).json();
  assert.equal((await w.handler(get('/api/tasks/state', gift), w.env)).status, 200);

  assert.equal((await w.handler(taskPost('/api/tasks/admin/people/gift/remove', {}, por), w.env)).status, 403, 'the site team cannot remove anyone');
  assert.equal((await w.handler(taskPost('/api/tasks/admin/people/brian/remove', {}, ming), w.env)).status, 403, 'another admin cannot remove the owner');
  assert.equal((await w.handler(taskPost('/api/tasks/admin/people/brian/remove', {}, brian), w.env)).status, 400, 'nobody removes themselves');
  assert.equal((await w.handler(get('/api/tasks/state', gift), w.env)).status, 200, 'refused tries change nothing');

  const res = await w.handler(taskPost('/api/tasks/admin/people/gift/remove', {}, brian), w.env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.moved, [made.id]);
  assert.deepEqual(body.state.tasks.find((t) => t.id === made.id).assignees.map((p) => p.id), ['brian'], 'the task is Brian\'s now');
  assert.equal(w.auth.prepare("SELECT active FROM auth_accounts WHERE username='gift'").get().active, 0, 'login switched off');
  assert.equal(w.auth.prepare("SELECT COUNT(*) AS n FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id WHERE a.username='gift'").get().n, 0, 'signed out everywhere');
  assert.equal(w.auth.prepare("SELECT COUNT(*) AS n FROM auth_audit WHERE event='task_account_disabled' AND actor_id='task-admin:brian'").get().n, 1, 'in the account history');
  assert.equal((await w.handler(get('/api/tasks/state', gift), w.env)).status, 401, 'the old session is dead');
  assert.notEqual((await w.handler(authPost('/api/local-auth/login', { username: 'gift', password: giftPw }), w.env)).status, 200, 'and the password no longer signs in');
  const list = (await (await w.handler(get('/api/task-accounts/list', brian), w.env)).json()).accounts;
  assert.equal(list.find((a) => a.personId === 'gift').status, 'off');
  // Someone without a login can be removed too.
  assert.equal((await w.handler(taskPost('/api/tasks/admin/people/tle/remove', {}, brian), w.env)).status, 200);
});

test('Sites: one shared timeline per site; saving needs Project timeline = edit; every save is kept', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian', w.brianPw);
  const put = (code, body, cookie, extra = {}) => new Request(origin + `/api/sites/${code}/timeline`, { method: 'PUT', headers: { origin, 'x-requested-with': 'calwwt', 'content-type': 'application/json', cookie, ...extra }, body: JSON.stringify(body) });
  const data = JSON.parse(readFileSync(new URL('../public/sites/data/timelines/1703.json', import.meta.url), 'utf8'));
  // Nothing saved yet: the page then uses the starting timeline file.
  assert.deepEqual(await (await w.handler(get('/api/sites/1703/timeline', brian), w.env)).json(), { data: null, ver: null });
  assert.equal((await w.handler(get('/api/sites/9999/timeline', brian), w.env)).status, 404, 'only the 8 sites and "all"');
  // Save (owner has edit), then a save from an old version is refused.
  const r1 = await w.handler(put('1703', { data, base: null }, brian), w.env);
  assert.equal(r1.status, 200, await r1.clone().text());
  const s1 = await r1.json();
  assert.equal(s1.by, 'Brian', 'the server records who saved, not the browser');
  const stale = await w.handler(put('1703', { data, base: null }, brian), w.env);
  assert.equal(stale.status, 409);
  const r2 = await w.handler(put('1703', { data: { ...data, week: 'ms' }, base: s1.ver }, brian), w.env);
  assert.equal(r2.status, 200);
  const cur = await (await w.handler(get('/api/sites/1703/timeline', brian), w.env)).json();
  assert.equal(cur.data.week, 'ms');
  const hist = await (await w.handler(get('/api/sites/1703/timeline/history', brian), w.env)).json();
  assert.equal(hist.length, 2);
  const old = await (await w.handler(get(`/api/sites/1703/timeline/history/${s1.ver}`, brian), w.env)).json();
  assert.equal(old.data.week, 'mf');
  // Other sites are separate; the programme ('all') too.
  assert.equal((await (await w.handler(get('/api/sites/1622/timeline', brian), w.env)).json()).ver, null);
  assert.equal((await w.handler(put('all', { data, base: null }, brian), w.env)).status, 200);
  // Bad data, missing header, other origin: refused.
  assert.equal((await w.handler(put('1622', { data: { ...data, phases: [] }, base: null }, brian), w.env)).status, 400);
  assert.equal((await w.handler(put('1622', { data, base: null }, brian, { 'x-requested-with': '' }), w.env)).status, 403);
  assert.equal((await w.handler(put('1622', { data, base: null }, brian, { origin: 'https://evil.example' }), w.env)).status, 403);
  // Saves can never be changed or removed in the database.
  assert.throws(() => w.tasks.prepare("UPDATE site_timelines SET by_name='x'").run(), /HISTORY_IS_APPEND_ONLY/);
  assert.throws(() => w.tasks.prepare('DELETE FROM site_timelines').run(), /HISTORY_IS_APPEND_ONLY/);
  // Keng (SPP manager) sees Sites; Project timeline is view by default for SPP, so he cannot save.
  const login = async (personId, username) => {
    await w.handler(taskPost('/api/task-accounts/create', { personId, username }, brian), w.env);
    const { code } = await (await w.handler(taskPost('/api/task-accounts/code', { personId }, brian), w.env)).json();
    const pw = `${username} synthetic setup phrase 4242!`;
    await w.handler(authPost('/api/local-auth/redeem', { token: code, password: pw }), w.env);
    return signIn(w, username, pw);
  };
  const keng = await login('keng', 'keng');
  assert.equal((await w.handler(get('/api/sites/1703/timeline', keng), w.env)).status, 200);
  assert.equal((await w.handler(put('1703', { data, base: cur.ver }, keng), w.env)).status, 403);
  await w.handler(taskPost('/api/tasks/admin/pages', { subject: 'person:keng', page: 'timeline', level: 'edit' }, brian), w.env);
  const k = await w.handler(put('1703', { data, base: cur.ver }, keng), w.env);
  assert.equal(k.status, 200); assert.equal((await k.json()).by, 'Keng');
  // KS (no Sites page): nothing.
  const tom = await login('tom', 'tom');
  assert.equal((await w.handler(get('/api/sites/1703/timeline', tom), w.env)).status, 404);
});

test('Sites data: 8 sites, starting timelines valid, every layout has its PDF and page image', async () => {
  const { validTimeline, SITE_CODES } = await import('../src/sites.mjs');
  const { existsSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(new URL('../public/sites/data/sites.json', import.meta.url), 'utf8'));
  assert.deepEqual(data.sites.map((s) => s.code), SITE_CODES);
  for (const code of [...SITE_CODES, 'all']) assert.ok(validTimeline(JSON.parse(readFileSync(new URL(`../public/sites/data/timelines/${code}.json`, import.meta.url), 'utf8'))), code);
  for (const s of data.sites) {
    assert.ok(s.name.en && s.name.th && s.notes.en.length === s.notes.th.length, s.code);
    assert.ok(s.lat > 5 && s.lat < 21 && s.lng > 97 && s.lng < 106, `${s.code} map pin is in Thailand`);
    for (const x of s.layouts || []) for (const ext of ['pdf', 'png']) assert.ok(existsSync(new URL(`../public/sites/layouts/${x.file}.${ext}`, import.meta.url)), `${x.file}.${ext}`);
  }
});
