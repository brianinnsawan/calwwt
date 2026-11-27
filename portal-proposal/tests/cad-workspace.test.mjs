// Sites -> CAD workspace (/cad-workspace/, /api/cad/*): page levels, saving notes, view-as, companies, CSP. Copied from calnkt
// (27 Nov 2026). calwwt has no project DWG catalog: the drawing most tests use is a DWG in Files shared with Caltex.
import { signViewAs } from '../src/site-access.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler } from '../src/worker.mjs';
import { HttpError } from '../src/auth.mjs';
import { passwordHash } from '../src/identity/password.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';
import release from '../src/site-release.mjs';
import { CATALOG } from '../src/cad-catalog.mjs';
import { readdirSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const origin = 'https://calwwt.test';
const PW = 'synthetic cad workspace phrase 4242!';

function d1(sqlite) {
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v))),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
    _exec: () => (/\bRETURNING\b|^\s*SELECT/i.test(sql) ? { results: sqlite.prepare(sql).all(...args) } : { meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: (sql) => stmt(sql), async batch(list) { sqlite.exec('BEGIN'); try { const r = list.map((s) => s._exec()); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } };
}
// R2 with what the workspace uses: create-only puts, custom metadata, list with include / delimiter.
function r2() {
  const m = new Map(), meta = new Map();
  const obj = (k) => ({ key: k, size: m.get(k).length, etag: `e${m.get(k).length}`, version: 'v1', httpMetadata: {}, customMetadata: meta.get(k) || {} });
  return {
    m,
    async put(k, v, o = {}) {
      if (o.onlyIf?.etagDoesNotMatch === '*' && m.has(k)) return null;
      m.set(k, typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v)); meta.set(k, o.customMetadata || {});
      return obj(k);
    },
    async get(k) { return m.has(k) ? { ...obj(k), body: new Response(m.get(k)).body } : null; },
    async head(k) { return m.has(k) ? obj(k) : null; },
    async list({ prefix = '', delimiter } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      if (!delimiter) return { objects: keys.map(obj), truncated: false };
      const objects = [], pre = new Set();
      for (const k of keys) { const rest = k.slice(prefix.length), i = rest.indexOf(delimiter); if (i >= 0) pre.add(prefix + rest.slice(0, i + 1)); else objects.push(obj(k)); }
      return { objects, delimitedPrefixes: [...pre], truncated: false };
    },
  };
}
// The drawing most tests use: a DWG in Files (Engineering) shared with Caltex since 1 Jan 2026.
const sheetAsset = { key: 'files/site-plan', size: 1234 };
const SHA = 'd'.repeat(64);
const FILE_SHA = 'f'.repeat(64);

async function world() {
  const app = new DatabaseSync(':memory:'), auth = new DatabaseSync(':memory:'), tasks = new DatabaseSync(':memory:');
  app.exec('CREATE TABLE users(id TEXT, email TEXT)');
  app.prepare('INSERT INTO users VALUES(?,?)').run('owner-id', 'owner@example.com');
  for (const m of ['0001_identity.sql', '0002_audit_lock.sql', '0003_two_step.sql']) auth.exec(readFileSync(new URL(`../../identity-proposal/migrations/${m}`, import.meta.url), 'utf8'));
  for (const f of ['0001_tasks.sql', '0002_hidden_from.sql', '0003_language.sql', '0004_page_access.sql', '0005_files.sql', '0006_trackers.sql', '0007_meetings.sql']) tasks.exec(readFileSync(new URL(`../../tasks/schema/${f}`, import.meta.url), 'utf8'));
  const TASKS_DB = d1(tasks);
  await TASKS_DB.batch(rosterStatements(TASKS_DB));
  const hash = await passwordHash(PW);
  for (const id of ['brian', 'gift', 'tom', 'bas', 'keng', 'a']) {
    auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acct-' + id, id.length < 3 ? `site-${id}` : id, id === 'brian' ? 'owner' : 'reader', hash, 1);
    auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('acct-' + id, 'portal', id === 'brian' ? 'owner-id' : 'task:' + id);
    tasks.prepare('UPDATE people SET account_id=? WHERE id=?').run('acct-' + id, id);
  }
  // A DWG in Project files (Engineering), not shared with Caltex.
  tasks.prepare("INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at) VALUES('11111111-1111-4111-8111-111111111111','engineering','Gate detail.dwg',10,'application/octet-stream','files/x',?,NULL,'brian','2026-11-02T00:00:00Z')").run(FILE_SHA);
  tasks.prepare("INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at) VALUES('22222222-2222-4222-8222-222222222222','engineering','Site plan.dwg',?,'application/octet-stream',?,?,'2026-01-01','brian','2026-11-02T00:00:00Z')").run(sheetAsset.size, sheetAsset.key, SHA);
  const DRAWINGS = r2();
  await DRAWINGS.put(sheetAsset.key, new Uint8Array(sheetAsset.size), { customMetadata: { sha256: SHA } });
  const fetched = [];
  const env = {
    APP_ORIGIN: origin, SITE_READY: 'true', DB: d1(app), AUTH_DB: d1(auth), TASKS_DB, TASKS_ENABLED: 'true', DRAWINGS,
    LOCAL_AUTH_ENABLED: 'true', LOCAL_AUTH_OWNER_ID: 'owner-id', LOCAL_AUTH_READER_ID: 'reader-none', AUTH_RATE_KEY: 'synthetic-cad-test-rate-key-123456',
    ASSETS: { fetch: async (r) => { fetched.push(new URL(r.url).pathname); return new Response('asset ' + new URL(r.url).pathname); } },
  };
  const handler = createHandler(async () => { throw new HttpError(401, 'Sign in'); });
  const grant = (subject, page, level) => tasks.prepare("INSERT OR REPLACE INTO page_access(subject,page,level,updated_by,updated_at) VALUES(?,?,?,'brian','2026-11-02')").run(subject, page, level);
  return { env, handler, tasks, fetched, grant };
}
async function signIn(w, username) {
  const res = await w.handler(new Request(origin + '/api/local-auth/login', { method: 'POST', headers: { origin, 'x-project-auth': '1', 'content-type': 'application/json' }, body: JSON.stringify({ username, password: PW }) }), w.env);
  assert.equal(res.status, 200, `${username} signs in`);
  return res.headers.get('set-cookie').split(';')[0];
}
const get = (w, path, cookie) => w.handler(new Request(origin + path, { headers: { cookie, accept: 'application/json' } }), w.env);
const notesBody = (base, extra = {}) => ({ base, note: 'กันสาด check', markups: { version: 1, drawingName: 'x.dwg', markups: [{ id: 'm1', type: 'rect', geometry: { type: 'rect', p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } } }] }, measurements: { version: 1, measurements: [] }, ...extra });
const save = (w, cookie, body, { sha = SHA, headers = {} } = {}) => w.handler(new Request(origin + '/api/cad/notes/' + sha, {
  method: 'POST', headers: { cookie, origin, 'x-requested-with': 'cad', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), w.env);

test("calwwt has no project catalog and never lists calnkt's (NTI) drawings, even with SITE_READY", async () => {
  assert.deepEqual(CATALOG, []);
  assert.ok(Object.keys(release.drawings || {}).length > 0, 'site-release.mjs still carries the NTI list this guards against');
  const w = await world();
  const brian = await signIn(w, 'brian');
  const list = await (await get(w, '/api/cad/drawings', brian)).json();
  assert.deepEqual(list.groups, []);
  for (const [p, a] of Object.entries(release.assets).filter(([p]) => release.drawings[p]).slice(0, 3)) {
    assert.equal((await get(w, `/api/cad/file/${a.sha256}/x.dwg`, brian)).status, 404, p);
    assert.equal((await get(w, `/api/cad/notes/${a.sha256}`, brian)).status, 404, p);
  }
});

test('KS (Drawings: none) gets 404 for the workspace, its files and every CAD call, old addresses included', async () => {
  const w = await world();
  const tom = await signIn(w, 'tom');
  for (const p of ['/cad-workspace/', '/cad-workspace', '/cad-workspace/workspace.mjs', '/cad-workspace/workers/libredwg-parser-worker.js', '/api/cad/drawings', `/api/cad/file/${SHA}/x.dwg`, `/api/cad/notes/${SHA}`, '/workspace/', '/cad/']) {
    assert.equal((await get(w, p, tom)).status, 404, p);
  }
  assert.equal((await save(w, tom, notesBody(0))).status, 404, 'no save either');
  assert.equal(w.fetched.length, 0, 'no file was served');
});

test('view level (site team): open, list and download, but saving is refused by the server', async () => {
  const w = await world();
  const gift = await signIn(w, 'gift');
  const page = await get(w, '/cad-workspace/', gift);
  assert.equal(page.status, 200);
  assert.equal(w.fetched.at(-1), '/cad-workspace/index.html');
  const csp = page.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/);
  assert.doesNotMatch(csp.split(';').find((d) => d.trim().startsWith('script-src')), /'unsafe-eval'|'unsafe-inline'/, 'page scripts get no eval or inline code');
  const list = await (await get(w, '/api/cad/drawings', gift)).json();
  assert.equal(list.level, 'view');
  assert.equal(list.canSave, false);
  assert.equal(list.company, 'spp');
  assert.deepEqual(list.groups, [], 'no project catalog on calwwt');
  assert.deepEqual(list.files.map((f) => f.name).sort(), ['Gate detail.dwg', 'Site plan.dwg'], 'the Files DWGs the person may see');
  assert.equal(list.files.find((f) => f.sha256 === SHA).file, '/api/files/22222222-2222-4222-8222-222222222222/download/Site%20plan.dwg', 'opened through Files (its own checks)');
  assert.deepEqual(list.legacy, [], 'only the owner sees the old site drawings');
  assert.equal((await get(w, `/api/cad/file/${SHA}/x.dwg`, gift)).status, 404, 'the project-drawing address serves nothing on calwwt');
  assert.equal((await save(w, gift, notesBody(0))).status, 403);
  const notes = await (await get(w, `/api/cad/notes/${SHA}`, gift)).json();
  assert.equal(notes.canSave, false);
  assert.equal(notes.current, null);
  assert.equal([...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith('cad-workspace/')).length, 0, 'nothing stored');
  // Old bookmarks of the CAD tool lead to the workspace.
  const old = await get(w, '/workspace/?view=site&dwg=20-Canopy/NTI-CAN-CS-08', gift);
  assert.equal(old.status, 302);
  assert.equal(old.headers.get('location'), '/cad-workspace/?dwg=20-Canopy%2FNTI-CAN-CS-08');
});

test('edit level (Brian): saves numbered versions; a stale save is refused; older versions can be read', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian');
  let res = await save(w, brian, notesBody(0));
  assert.equal(res.status, 201, await res.clone().text());
  assert.equal((await res.json()).seq, 1);
  res = await save(w, brian, notesBody(0));
  assert.equal(res.status, 409, 'someone (here: the same person in another tab) saved version 1 first');
  assert.equal((await res.json()).latest, 1);
  res = await save(w, brian, notesBody(1, { note: 'second', measurements: { version: 1, measurements: [{ id: 'd1', type: 'distance' }] } }));
  assert.equal((await res.json()).seq, 2);
  const notes = await (await get(w, `/api/cad/notes/${SHA}`, brian)).json();
  assert.equal(notes.latest, 2);
  assert.equal(notes.canSave, true);
  assert.equal(notes.current.seq, 2);
  assert.equal(notes.current.by, 'Brian');
  assert.deepEqual(notes.history.map((v) => [v.seq, v.note, v.markups, v.measurements]), [[2, 'second', 1, 1], [1, 'กันสาด check', 1, 0]]);
  const first = await (await get(w, `/api/cad/notes/${SHA}?seq=1`, brian)).json();
  assert.equal(first.current.seq, 1);
  assert.equal(first.current.markups.markups[0].id, 'm1');
  assert.equal((await get(w, `/api/cad/notes/${SHA}?seq=9`, brian)).status, 404);
  const keys = [...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith('cad-workspace/'));
  assert.deepEqual(keys, [`cad-workspace/notes/spp/${SHA}/000001.json`, `cad-workspace/notes/spp/${SHA}/000002.json`]);
  const list = await (await get(w, '/api/cad/drawings', brian)).json();
  assert.deepEqual(list.noted[SHA], ['spp']);
});

test('saves need this site as Origin, the X-Requested-With header and a well-formed body', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian');
  assert.equal((await save(w, brian, notesBody(0), { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await save(w, brian, notesBody(0), { headers: { 'x-requested-with': 'tasks' } })).status, 403);
  assert.equal((await save(w, brian, notesBody(0), { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await save(w, brian, { ...notesBody(0), markups: { version: 2, markups: [] } })).status, 400);
  assert.equal((await save(w, brian, { ...notesBody(0), base: -1 })).status, 400);
  assert.equal((await save(w, brian, { ...notesBody(0), note: 'x'.repeat(201) })).status, 400);
  assert.equal((await save(w, brian, notesBody(0), { sha: 'a'.repeat(64) })).status, 404, 'unknown drawing');
  assert.equal([...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith('cad-workspace/')).length, 0);
});

test('"View the site as" is read only, even for the owner', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian');
  const viewing = `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'brian', 'keng')}`;
  w.grant('person:keng', 'drawings', 'edit');
  const notes = await (await get(w, `/api/cad/notes/${SHA}`, viewing)).json();
  assert.equal(notes.canSave, false, 'Keng could save, but not through view-as');
  assert.equal((await save(w, viewing, notesBody(0))).status, 403);
  const list = await (await get(w, '/api/cad/drawings', viewing)).json();
  assert.equal(list.canSave, false);
  assert.deepEqual(list.legacy, []);
});

test('a project login raised to Drawings edit saves for its company; partners see only their own company', async () => {
  const w = await world();
  w.grant('person:gift', 'drawings', 'edit');
  w.grant('person:bas', 'drawings', 'edit');
  const gift = await signIn(w, 'gift'), bas = await signIn(w, 'bas');
  assert.equal((await save(w, gift, notesBody(0))).status, 201);
  // Caltex has its own notes on the same drawing, numbered separately.
  const r = await save(w, bas, notesBody(0, { note: 'Caltex note' }));
  assert.equal(r.status, 201);
  assert.equal((await r.json()).seq, 1);
  const basNotes = await (await get(w, `/api/cad/notes/${SHA}`, bas)).json();
  assert.equal(basNotes.company, 'caltex');
  assert.deepEqual(basNotes.layers.map((l) => l.company), ['caltex'], 'Caltex never sees SPP notes');
  assert.equal(basNotes.current.note, 'Caltex note');
  assert.equal((await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).status, 404);
  const basList = await (await get(w, '/api/cad/drawings', bas)).json();
  assert.deepEqual(basList.noted[SHA], ['caltex']);
  assert.deepEqual(basList.files.map((f) => f.name), ['Site plan.dwg'], 'only the Files DWG shared with Caltex');
  assert.equal((await get(w, `/api/cad/notes/${FILE_SHA}`, bas)).status, 404, 'notes of a drawing Caltex may not open');
  // SPP sees both companies' notes (read only for the other company).
  const giftNotes = await (await get(w, `/api/cad/notes/${SHA}?company=caltex`, gift)).json();
  assert.equal(giftNotes.current.note, 'Caltex note');
  assert.equal(giftNotes.canSave, false);
  assert.deepEqual(giftNotes.layers.map((l) => l.company), ['spp', 'caltex']);
  // SPP can keep notes on a Files drawing it may open.
  assert.equal((await save(w, gift, notesBody(0), { sha: FILE_SHA })).status, 201);
});

test('the DWG reader worker alone gets unsafe-eval; engine files come from the Files CAD viewer copy', async () => {
  const w = await world();
  const gift = await signIn(w, 'gift');
  const worker = await get(w, '/cad-workspace/workers/libredwg-parser-worker.js', gift);
  assert.equal(worker.status, 200);
  assert.equal(w.fetched.at(-1), '/files/cad/workers/libredwg-parser-worker.js');
  assert.equal(worker.headers.get('content-security-policy'), "default-src 'none'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; connect-src 'self'");
  const font = await get(w, '/cad-workspace/cad-data/fonts/fonts.json', gift);
  assert.equal(font.status, 200);
  assert.equal(w.fetched.at(-1), '/files/cad/cad-data/fonts/fonts.json');
  assert.doesNotMatch(font.headers.get('content-security-policy'), /'unsafe-eval'/);
  const engine = await get(w, '/cad-workspace/engine/cad-engine.js', gift);
  assert.equal(engine.status, 200);
  assert.doesNotMatch(engine.headers.get('content-security-policy'), /'unsafe-eval'/);
  // Disguised paths are refused before any file is looked up (audit F01).
  const before = w.fetched.length;
  for (const p of ['/cad-workspace/workers/..%2F..%2Fx', '/cad-workspace//workers/x', '/cad-workspace/workers/%2e%2e%5Cx']) assert.equal((await get(w, p, gift)).status, 404, p);
  assert.equal(w.fetched.length, before);
});

test('the workspace page loads nothing from outside this site', () => {
  const html = readFileSync(new URL('../public/cad-workspace/index.html', import.meta.url), 'utf8');
  const js = ['workspace.mjs', 'commands.mjs', 'icons.mjs', 'workspace.css'].map((f) => readFileSync(new URL(`../public/cad-workspace/${f}`, import.meta.url), 'utf8'));
  for (const text of [html, ...js]) assert.doesNotMatch(text, /(src|href)=["']https?:|import\s*\(?\s*["']https?:|fetch\(\s*["']https?:|url\(\s*["']?https?:|@import/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'no inline scripts');
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'no inline event handlers');
  assert.match(html, /<script type="module" src="\/__nav\/bar\.mjs"><\/script>/);
});

// Full CAD program (Open CAD Studio) and the copies it saves.
const DWG_BYTES = new TextEncoder().encode('AC1032' + '\0'.repeat(200));
const saveCopy = (w, cookie, bytes = DWG_BYTES, { sha = SHA, name = 'CS-08 marked up.dwg', headers = {} } = {}) => w.handler(new Request(origin + '/api/cad/copies/' + sha, {
  method: 'POST', headers: { cookie, origin, 'x-requested-with': 'cad', 'content-type': 'application/octet-stream', 'x-filename': encodeURIComponent(name), 'x-copy-note': encodeURIComponent('งานแก้ไข'), ...headers }, body: bytes }), w.env);

test('full CAD program: KS 404, view can open but not save, edit saves separate numbered copies, view-as cannot', async () => {
  const w = await world();
  const tom = await signIn(w, 'tom'), gift = await signIn(w, 'gift'), brian = await signIn(w, 'brian'), bas = await signIn(w, 'bas');
  for (const p of ['/cad-workspace/full/', '/cad-workspace/full/program.mjs', '/app/', `/api/cad/copies/${SHA}`]) assert.equal((await get(w, p, tom)).status, 404, p);
  assert.equal((await saveCopy(w, tom)).status, 404);
  assert.equal((await get(w, '/cad-workspace/full/', gift)).status, 200);
  assert.equal(w.fetched.at(-1), '/cad-workspace/full/index.html');
  assert.equal((await saveCopy(w, gift)).status, 403, 'view level cannot save');
  assert.equal((await saveCopy(w, `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'brian', 'keng')}`)).status, 403, 'view-as cannot save');
  assert.equal((await saveCopy(w, brian, DWG_BYTES, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await saveCopy(w, brian, new TextEncoder().encode('<html>not a drawing'))).status, 415);
  assert.equal((await saveCopy(w, brian, DWG_BYTES, { name: 'x.exe' })).status, 400);
  let r = await saveCopy(w, brian);
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json().then((x) => [x.seq, x.format, x.company]), [1, 'dwg', 'spp']);
  r = await saveCopy(w, brian, new TextEncoder().encode('  0\r\nSECTION\r\n  2\r\nHEADER\r\n  0\r\nENDSEC\r\n  0\r\nEOF\r\n'), { name: 'second.dxf' });
  assert.equal((await r.json()).seq, 2);
  // The original drawing is untouched; copies live apart, numbered, never replaced.
  assert.equal(w.env.DRAWINGS.m.get(sheetAsset.key).length, sheetAsset.size);
  assert.deepEqual([...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith('cad-workspace/copies/')),
    [`cad-workspace/copies/spp/${SHA}/000001.dwg`, `cad-workspace/copies/spp/${SHA}/000002.dxf`]);
  const list = await (await get(w, `/api/cad/copies/${SHA}`, gift)).json();
  assert.equal(list.canSave, false);
  assert.deepEqual(list.copies.map((c) => [c.seq, c.name, c.by, c.note]), [[2, 'second.dxf', 'Brian', 'งานแก้ไข'], [1, 'CS-08 marked up.dwg', 'Brian', 'งานแก้ไข']]);
  const file = await get(w, list.copies[1].file, gift);
  assert.equal(file.status, 200);
  assert.equal(new TextDecoder().decode((await file.arrayBuffer()).slice(0, 6)), 'AC1032');
  // A partner company never sees SPP's copies.
  assert.deepEqual((await (await get(w, `/api/cad/copies/${SHA}`, bas)).json()).copies, []);
  assert.equal((await get(w, `/api/cad/copies/${SHA}/spp/000001`, bas)).status, 404);
});

test('full CAD program page: no inline scripts, no outside loads, no eval for anything on the page', async () => {
  const html = readFileSync(new URL('../public/cad-workspace/full/index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../public/cad-workspace/full/program.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  assert.doesNotMatch(html + js, /(src|href)=["']https?:|import\s*\(?\s*["']https?:|fetch\(\s*["']https?:/);
  const w = await world();
  const gift = await signIn(w, 'gift');
  for (const p of ['/cad-workspace/full/', '/cad-workspace/full/v2026.47/ocs-parse-worker.js', '/cad-workspace/full/v2026.47/worker_pkg/ocs_web_worker.js']) {
    const csp = (await get(w, p, gift)).headers.get('content-security-policy');
    assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/, p);
    assert.match(csp, /connect-src 'self';/, p);
  }
});

test('the full CAD program files are the reviewed official 2026.47 build (checksums, integrity, parts)', () => {
  const meta = JSON.parse(readFileSync(new URL('../public/cad-workspace/full/program.json', import.meta.url), 'utf8'));
  assert.equal(meta.version, '2026.47');
  assert.equal(meta.commit, '8e5f39f6ee0468a7e29260d57b5390d7d01207e8', 'the commit tag v2026.47 points to');
  assert.equal(meta.dir, 'v2026.47/');
  const dir = new URL(`../public/cad-workspace/full/${meta.dir}`, import.meta.url);
  const packed = Buffer.concat(meta.wasmParts.map((n) => readFileSync(new URL(n, dir))));
  assert.equal(packed.length, meta.wasmGzipBytes);
  for (const n of meta.wasmParts) assert.ok(statSync(new URL(n, dir)).size <= 25 * 1024 * 1024, `${n} fits one static file`);
  const wasm = gunzipSync(packed);
  assert.equal(wasm.length, meta.wasmBytes);
  assert.equal('sha384-' + createHash('sha384').update(wasm).digest('base64'), meta.wasmIntegrity);
  const sha = (rel) => createHash('sha256').update(readFileSync(new URL(rel, dir))).digest('hex');
  assert.equal(createHash('sha256').update(wasm).digest('hex'), 'b57c883d2f5e2de0daa265050f1b57a8e1db3e40d010f776701a983df3322dc4', 'the reviewed WebAssembly file');
  assert.equal(sha(meta.glue), 'cb08f0db93656242afbd0865a1a65a7f389defdc3554c245eee05d845f6b4b00');
  assert.equal(sha('worker_pkg/ocs_web_worker_bg.wasm'), 'e7743c528cfd059838940115d3de184037d5382bd75c8b50e99809e957ec97c7');
  assert.equal(sha('worker_pkg/ocs_web_worker.js'), '9182a6b503b2dc77144ee076d60e4642a10790ce47be7db0932bf22d40849eeb');
  assert.equal(sha('ocs-parse-worker.js'), '17a069aaac13cb01859b28c61e9b4e47cfb4b66f6eca2d4fd4d7d0bf1ead7938', 'same as web/ocs-parse-worker.js at the tag');
  for (const f of readdirSync(new URL('../public/cad-workspace/full/', import.meta.url))) assert.ok(!/^v\d/.test(f) || f === 'v2026.47', `no older program folder left (${f})`);
  for (const f of ['sw.js', 'ocs-control.js', 'index.html', 'videos.json', 'discussions.json']) assert.throws(() => statSync(new URL(f, dir)), `${f} (the program's own page, offline worker and outside links) is not copied`);
});

test('full CAD program page: keeps only its own ?dwg= / ?copy= and takes away the Save-as picker before the program starts', () => {
  const page = readFileSync(new URL('../public/cad-workspace/full/program.mjs', import.meta.url), 'utf8');
  const start = page.indexOf('async function startProgram');
  for (const needle of ["for (const k of ['dwg', 'copy'])", 'history.replaceState', 'delete Window.prototype.showSaveFilePicker', 'delete window.showSaveFilePicker']) {
    const at = page.indexOf(needle);
    assert.ok(at > 0 && at < start, `${needle} runs before the program starts`);
  }
});

const share = (w, cookie, sha, shared, headers = {}) => w.handler(new Request(origin + '/api/cad/share/' + sha, {
  method: 'POST', headers: { cookie, origin, 'x-requested-with': 'cad', 'content-type': 'application/json', ...headers }, body: JSON.stringify({ shared }) }), w.env);

test('SPP shares its notes on a drawing with Caltex, read only and labelled; stopping works; both are logged', async () => {
  const w = await world();
  const brian = await signIn(w, 'brian'), bas = await signIn(w, 'bas'), gift = await signIn(w, 'gift');
  assert.equal((await save(w, brian, notesBody(0, { note: 'SPP v1' }))).status, 201);
  assert.equal((await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).status, 404, 'not shared yet');
  let n = await (await get(w, `/api/cad/notes/${SHA}`, brian)).json();
  assert.deepEqual([n.sharing.shared, n.sharing.canChange, n.sharing.caltexCanOpen], [false, true, true]);
  // Only SPP with Drawings edit may share; never through view-as; the request checks apply.
  assert.equal((await share(w, gift, SHA, true)).status, 403, 'site team at view');
  assert.equal((await share(w, bas, SHA, true)).status, 403, 'Caltex cannot share SPP notes');
  w.grant('person:bas', 'drawings', 'edit');
  assert.equal((await share(w, bas, SHA, true)).status, 403, 'not even with Drawings edit');
  w.grant('person:keng', 'drawings', 'edit');
  assert.equal((await share(w, `${brian}; __Host-calwwt_view_as=${signViewAs(w.env, 'brian', 'keng')}`, SHA, true)).status, 403, 'view-as is read only');
  assert.equal((await share(w, brian, SHA, true, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await share(w, brian, SHA, true)).status, 201);
  assert.equal((await (await share(w, brian, SHA, true)).json()).changed, false, 'sharing twice adds nothing');
  // Caltex now sees SPP's notes next to its own, read only.
  n = await (await get(w, `/api/cad/notes/${SHA}`, bas)).json();
  assert.equal(n.company, 'caltex', 'Caltex still opens its own notes first');
  assert.deepEqual(n.layers.map((l) => [l.company, !!l.sharedWithYou]), [['caltex', false], ['spp', true]]);
  assert.deepEqual(n.sharing, { shared: true });
  const sppForCaltex = await (await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).json();
  assert.equal(sppForCaltex.current.note, 'SPP v1');
  assert.equal(sppForCaltex.canSave, false);
  const list = await (await get(w, '/api/cad/drawings', bas)).json();
  assert.deepEqual(list.noted[SHA], ['spp']);
  assert.deepEqual(list.sharedWithCaltex, [SHA]);
  // Later SPP versions are shared too; Caltex saving still writes only Caltex notes.
  assert.equal((await save(w, brian, notesBody(1, { note: 'SPP v2' }))).status, 201);
  const v2 = await (await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).json();
  assert.equal(v2.current.note, 'SPP v2');
  assert.deepEqual(v2.history.map((v) => v.seq), [2], "Caltex sees only SPP's newest version");
  assert.equal((await get(w, `/api/cad/notes/${SHA}?company=spp&seq=1`, bas)).status, 404, 'not older SPP versions');
  assert.equal((await save(w, bas, notesBody(0, { note: 'Caltex v1' }))).status, 201);
  assert.equal((await (await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).json()).latest, 2, 'SPP notes untouched');
  // Stop sharing: Caltex loses them at once.
  assert.equal((await share(w, brian, SHA, false)).status, 201);
  assert.equal((await get(w, `/api/cad/notes/${SHA}?company=spp`, bas)).status, 404);
  n = await (await get(w, `/api/cad/notes/${SHA}`, bas)).json();
  assert.deepEqual(n.layers.map((l) => l.company), ['caltex']);
  // The log (who / when), newest first, kept in storage and never replaced.
  n = await (await get(w, `/api/cad/notes/${SHA}`, brian)).json();
  assert.deepEqual(n.sharing.log.map((e) => [e.action, e.by]), [['unshare', 'Brian'], ['share', 'Brian']]);
  assert.deepEqual([...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith('cad-workspace/shares/')),
    [`cad-workspace/shares/spp-caltex/${SHA}/000001.json`, `cad-workspace/shares/spp-caltex/${SHA}/000002.json`]);
});

test('only drawings Caltex may open can be shared; Files sharing still decides; hidden names stay hidden', async () => {
  const w = await world();
  w.grant('person:a', 'drawings', 'edit');
  const brian = await signIn(w, 'brian'), bas = await signIn(w, 'bas'), a = await signIn(w, 'site-a');
  assert.equal((await save(w, a, notesBody(0), { sha: FILE_SHA })).status, 201);
  let n = await (await get(w, `/api/cad/notes/${FILE_SHA}`, brian)).json();
  assert.equal(n.sharing.caltexCanOpen, false);
  assert.equal((await share(w, brian, FILE_SHA, true)).status, 409, 'the Files DWG is not shared with Caltex');
  // Shared with Caltex in Files from yesterday: now its notes can be shared.
  w.tasks.prepare("UPDATE files SET caltex_from='2026-01-01' WHERE sha256=?").run(FILE_SHA);
  assert.equal((await share(w, brian, FILE_SHA, true)).status, 201);
  n = await (await get(w, `/api/cad/notes/${FILE_SHA}?company=spp`, bas)).json();
  assert.equal(n.current.by, 'SPP project staff', 'A is hidden from Caltex');
  assert.equal(n.history[0].by, 'SPP project staff');
  // Files sharing removed again: Caltex can no longer open the drawing, so the notes are gone for Caltex too.
  w.tasks.prepare('UPDATE files SET caltex_from=NULL WHERE sha256=?').run(FILE_SHA);
  assert.equal((await get(w, `/api/cad/notes/${FILE_SHA}?company=spp`, bas)).status, 404);
  assert.equal((await get(w, `/api/cad/notes/${FILE_SHA}`, bas)).status, 404);
  // Unknown drawings cannot be shared.
  assert.equal((await share(w, brian, 'a'.repeat(64), true)).status, 404);
});

test('full CAD program: only the versioned program files are cached (private, immutable); access is still checked', async () => {
  const w = await world();
  const gift = await signIn(w, 'gift'), tom = await signIn(w, 'tom');
  const V = '/cad-workspace/full/v2026.47/';
  for (const p of [`${V}OpenCADStudio-456a1b1a39ae2ed2.js`, `${V}OpenCADStudio-456a1b1a39ae2ed2_bg.wasm.gz`, `${V}ocs-parse-worker.js`, `${V}worker_pkg/ocs_web_worker_bg.wasm`, `${V}fonts/thai.ttf`]) {
    const r = await get(w, p, gift);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('cache-control'), 'private, max-age=31536000, immutable', p);
    const ks = await get(w, p, tom);
    assert.equal(ks.status, 404, `KS still refused: ${p}`);
    assert.equal(ks.headers.get('cache-control'), 'private, no-store, max-age=0');
  }
  for (const p of ['/cad-workspace/full/', '/cad-workspace/full/program.mjs', '/cad-workspace/full/program.json', '/cad-workspace/', '/cad-workspace/engine/cad-engine.js', `/api/cad/copies/${SHA}`, '/api/cad/drawings']) {
    assert.equal((await get(w, p, gift)).headers.get('cache-control'), 'private, no-store, max-age=0', p);
  }
});

test("program copies follow the notes rule: Caltex sees SPP's newest copy only while SPP shares the drawing", async () => {
  const w = await world();
  const brian = await signIn(w, 'brian'), bas = await signIn(w, 'bas');
  w.grant('person:bas', 'drawings', 'edit');
  assert.equal((await saveCopy(w, brian, DWG_BYTES, { name: 'spp-1.dwg' })).status, 201);
  assert.equal((await saveCopy(w, brian, DWG_BYTES, { name: 'spp-2.dwg' })).status, 201);
  assert.equal((await saveCopy(w, bas, DWG_BYTES, { name: 'caltex-1.dwg' })).status, 201);
  const names = async () => (await (await get(w, `/api/cad/copies/${SHA}`, bas)).json()).copies.map((c) => [c.company, c.name, !!c.sharedWithYou]);
  assert.deepEqual(await names(), [['caltex', 'caltex-1.dwg', false]], 'not shared: only its own');
  assert.equal((await share(w, brian, SHA, true)).status, 201);
  assert.deepEqual((await names()).sort(), [['caltex', 'caltex-1.dwg', false], ['spp', 'spp-2.dwg', true]], "shared: plus SPP's newest copy, marked");
  assert.equal((await get(w, `/api/cad/copies/${SHA}/spp/000002`, bas)).status, 200);
  assert.equal((await get(w, `/api/cad/copies/${SHA}/spp/000001`, bas)).status, 404, 'older SPP copies stay SPP-only');
  // Read only: a Caltex save always goes to Caltex's own copies.
  const r = await (await saveCopy(w, bas, DWG_BYTES, { name: 'caltex-2.dwg' })).json();
  assert.equal(r.company, 'caltex');
  assert.equal([...w.env.DRAWINGS.m.keys()].filter((k) => k.startsWith(`cad-workspace/copies/spp/`)).length, 2);
  // SPP sees every company's copies.
  assert.equal((await (await get(w, `/api/cad/copies/${SHA}`, brian)).json()).copies.length, 4);
  assert.equal((await share(w, brian, SHA, false)).status, 201);
  assert.deepEqual((await names()).map((x) => x[0]), ['caltex', 'caltex'], 'stopping the share hides them again');
  assert.equal((await get(w, `/api/cad/copies/${SHA}/spp/000002`, bas)).status, 404);
});
