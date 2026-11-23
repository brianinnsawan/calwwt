// Backups (audit F11), 90-day sign-in cleanup and the locked sign-in history (audit N02).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { exportDatabase, runBackup, cleanSignIns, routeBackup, backupKeyFor } from '../src/backup.mjs';
import { zipStream, crc32 } from '../src/zip.mjs';
import { restoreSql } from '../../tools/backup/restore-d1.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

const ORIGIN = 'https://calnkt.test';
function d1(sqlite) {
  const stmt = (q, v = []) => ({ bind: (...a) => stmt(q, a), first: async () => sqlite.prepare(q).get(...v) ?? null, all: async () => ({ results: sqlite.prepare(q).all(...v) }), run: async () => ({ meta: { changes: Number(sqlite.prepare(q).run(...v).changes) } }) });
  return { prepare: (q) => stmt(q) };
}
function authDb() {
  const s = new DatabaseSync(':memory:');
  for (const m of ['0001_identity.sql', '0002_audit_lock.sql', '0003_two_step.sql']) s.exec(readFileSync(new URL(`../../identity-proposal/migrations/${m}`, import.meta.url), 'utf8'));
  return s;
}
function r2() {
  const store = new Map();
  return { store,
    async put(k, v) { const bytes = typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : new Uint8Array(await new Response(v).arrayBuffer()); store.set(k, { bytes, etag: `e${crc32(bytes).toString(16)}` }); },
    async get(k) { const x = store.get(k); return x ? { body: new Response(x.bytes).body, size: x.bytes.length, etag: x.etag, httpMetadata: {}, customMetadata: {} } : null; },
    async list({ prefix = '' } = {}) { return { objects: [...store].filter(([k]) => k.startsWith(prefix)).sort().map(([key, x]) => ({ key, size: x.bytes.length, etag: x.etag })), truncated: false }; } };
}
async function unzip(stream) {
  const b = new Uint8Array(await new Response(stream).arrayBuffer()), v = new DataView(b.buffer), files = {};
  const end = b.length - 22; assert.equal(v.getUint32(end, true), 0x06054b50);
  let p = v.getUint32(end + 16, true);
  for (let i = 0; i < v.getUint16(end + 10, true); i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true), n = v.getUint16(p + 28, true), at = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + n)), start = at + 30 + v.getUint16(at + 26, true);
    const data = b.subarray(start, start + size); assert.equal(crc32(data), crc, `checksum of ${name}`);
    files[name] = new TextDecoder().decode(data); p += 46 + n;
  }
  return files;
}

test('a database backup restores to the same rows, history locks included', async () => {
  const db = localD1(); await db.batch(rosterStatements(db));
  await db.prepare("INSERT INTO file_log(at, by_id, action, data_json) VALUES('2026-11-02', 'brian', 'upload', '{\"n\":\"a''b\"}')").run();
  const dump = await exportDatabase(db, 'tasks');
  const copy = new DatabaseSync(':memory:'); copy.exec(restoreSql(JSON.parse(JSON.stringify(dump))));
  for (const t of ['people', 'page_access', 'file_folders', 'file_log', 'meetings'])
    assert.deepEqual(copy.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all(), db.sql.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all(), t);
  assert.throws(() => copy.exec('DELETE FROM file_log'), /APPEND_ONLY/, 'append-only triggers come back too');
});

test('sign-ins are kept 90 days; account events and recent sign-ins cannot be changed or deleted', async () => {
  const s = authDb(), now = Math.floor(Date.now() / 1000), day = 86400;
  const add = (id, event, at) => s.prepare('INSERT INTO auth_audit VALUES(?,?,?,?,?)').run(id, 'a', 'a', event, at);
  add('old-login', 'login:phone', now - 91 * day); add('old-fail', 'login_failed:computer', now - 100 * day);
  add('new-login', 'login:phone', now - 89 * day); add('old-account', 'password_changed_by_self', now - 400 * day);
  s.prepare('INSERT INTO auth_accounts(id,username,role,created_at) VALUES(?,?,?,?)').run('acc', 'acc', 'reader', now);
  s.prepare('INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at) VALUES(?,?,?,?,?,?,?)').run('gone', 'acc', 'portal', 0, now - 40 * day, now - 10 * day, now - 20 * day);
  s.prepare('INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at) VALUES(?,?,?,?,?,?,?)').run('live', 'acc', 'portal', 0, now, now + 30 * day, now + 7 * day);
  assert.equal((await cleanSignIns({ AUTH_DB: d1(s) }, now)).removed, 2);
  assert.deepEqual(s.prepare('SELECT id FROM auth_audit ORDER BY id').all().map((r) => r.id), ['new-login', 'old-account']);
  assert.deepEqual(s.prepare('SELECT digest FROM auth_sessions').all().map((r) => r.digest), ['live']);
  assert.throws(() => s.exec("DELETE FROM auth_audit WHERE id='old-account'"), /APPEND_ONLY/);
  assert.throws(() => s.exec("DELETE FROM auth_audit WHERE id='new-login'"), /APPEND_ONLY/);
  assert.throws(() => s.exec("UPDATE auth_audit SET event='x'"), /APPEND_ONLY/);
});

test('weekly backup: all data, each file version once, no sessions; repeat copies only new files', async () => {
  const tasks = localD1(); await tasks.batch(rosterStatements(tasks));
  const auth = authDb(), now = Math.floor(Date.now() / 1000);
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acc', 'gift', 'reader', 'scrypt$secret', now);
  auth.prepare('INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at) VALUES(?,?,?,?,?,?,?)').run('sess', 'acc', 'portal', 0, now, now + 9, now + 9);
  const env = { TASKS_DB: tasks, AUTH_DB: d1(auth), DRAWINGS: r2(), BACKUPS: r2() };
  await env.DRAWINGS.put('files/one', 'first'); await env.DRAWINGS.put('files/two', 'second');
  const first = await runBackup(env, { now: new Date('2026-11-07T19:00:00Z') });
  assert.deepEqual(first.errors, []);
  assert.equal(first.files.copied, 2);
  const keys = [...env.BACKUPS.store.keys()];
  assert.ok(keys.includes('d1/2026-11-07T190000/tasks.json') && keys.includes('d1/2026-11-07T190000/identity.json') && keys.some((k) => k.startsWith('runs/2026-11-07T190000.000Z-')));
  const id = JSON.parse(new TextDecoder().decode(env.BACKUPS.store.get('d1/2026-11-07T190000/identity.json').bytes));
  assert.equal(id.tables.auth_sessions.rows.length, 0, 'sessions never in a backup');
  assert.equal(id.tables.auth_accounts.rows[0][id.tables.auth_accounts.columns.indexOf('password_hash')], 'scrypt$secret', 'the locked copy can restore logins');
  await env.DRAWINGS.put('files/one', 'changed'); await env.DRAWINGS.put('files/three', 'third');
  const second = await runBackup(env, { now: new Date('2026-11-14T19:00:00Z') });
  assert.equal(second.files.copied, 2, 'the changed object and the new one');
  assert.equal([...env.BACKUPS.store.keys()].filter((k) => k.startsWith('objects/files/one@')).length, 2, 'both versions kept');
  assert.equal(new TextDecoder().decode(env.BACKUPS.store.get(backupKeyFor('files/three', env.DRAWINGS.store.get('files/three').etag)).bytes), 'third');
});

test('Admin download: admins only, recent sign-in, zip without passwords, files in their folders', async () => {
  const tasks = localD1(); await tasks.batch(rosterStatements(tasks));
  const auth = authDb(), now = Math.floor(Date.now() / 1000);
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acc', 'gift', 'reader', 'scrypt$secret', now);
  const env = { TASKS_DB: tasks, AUTH_DB: d1(auth), DRAWINGS: r2(), BACKUPS: r2(), APP_ORIGIN: ORIGIN };
  await env.DRAWINGS.put('files/k1', 'deck bytes');
  tasks.sql.prepare("INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, uploaded_by, uploaded_at) VALUES('f1','safety-weekly','Weekly 01.pptx',10,'x','files/k1','h','brian','2026-11-02T00:00:00Z')").run();
  const call = (path, { admin = true, viewAs = null, fresh = true, method = 'POST', body = '{}' } = {}) => routeBackup(
    new Request(ORIGIN + path, { method, ...(method === 'POST' ? { body, headers: { origin: ORIGIN, 'x-requested-with': 'tasks', 'content-type': 'application/json' } } : {}) }),
    env, { sessionCreatedAt: fresh ? now : now - 3600 }, { admin, person: 'brian', viewAs }).catch((e) => ({ status: e.status, message: e.message }));
  assert.equal((await call('/api/backup/status', { admin: false, method: 'GET' })).status, 404);
  assert.equal((await call('/api/backup/download', { viewAs: { id: 'gift' } })).status, 403);
  assert.match((await call('/api/backup/download', { fresh: false })).message, /^CONFIRM_PASSWORD/);
  const r = await call('/api/backup/download');
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/zip');
  const z = await unzip(r.body);
  assert.ok(z['README.txt'].includes('WITHOUT passwords'));
  assert.ok(!z['data/identity.json'].includes('scrypt$secret'), 'no password hashes in the zip');
  const path = Object.keys(z).find((k) => k.endsWith('/Weekly 01.pptx'));
  assert.ok(path.startsWith('files/') && path.split('/').length === 4, path);
  assert.equal(z[path], 'deck bytes'); assert.ok(z['files/index.csv'].includes('Weekly 01.pptx'));
  assert.equal(tasks.sql.prepare("SELECT COUNT(*) n FROM events WHERE kind='backup_download'").get().n, 1, 'downloads are logged');
  const status = await call('/api/backup/status', { method: 'GET' });
  assert.deepEqual(await status.json(), { connected: true, runs: [], keepDays: 90 });
});

test('zip writer: names in UTF-8, checksums right, streamed parts', async () => {
  async function* items() { yield { name: 'ไทย.txt', data: 'สวัสดี' }; yield { name: 'b.bin', data: async () => new Response(new Uint8Array(70000).fill(7)).body }; }
  const z = await unzip(zipStream(items()));
  assert.equal(z['ไทย.txt'], 'สวัสดี'); assert.equal(z['b.bin'].length, 70000);
});

test('Back up now works in pieces: a time or count limit leaves files waiting, the next piece copies the rest', async () => {
  const env = { DRAWINGS: r2(), BACKUPS: r2() };
  for (let i = 0; i < 7; i++) await env.DRAWINGS.put(`models/m${i}.glb`, `model ${i}`);
  const first = await runBackup(env, { now: new Date('2026-11-02T04:00:00Z'), by: 'brian', maxCopies: 3, concurrency: 2 });
  assert.deepEqual([first.files.copied, first.files.waiting, first.part], [3, 4, false]);
  const next = await runBackup(env, { now: new Date('2026-11-02T04:00:20Z'), by: 'brian', data: false, maxCopies: 10 });
  assert.deepEqual([next.files.copied, next.files.waiting, next.part, Object.keys(next.databases).length], [4, 0, true, 0]);
  assert.equal([...env.BACKUPS.store.keys()].filter((k) => k.startsWith('objects/')).length, 7);
  assert.equal([...env.BACKUPS.store.keys()].filter((k) => k.startsWith('runs/')).length, 2, 'separate time stamps, no overwrite');
});

test('saving the data does not use up the file-copy time budget', async () => {
  const tasks = localD1(); await tasks.batch(rosterStatements(tasks));
  const slow = { prepare: (q) => { const st = tasks.prepare(q); const wrap = (x) => ({ bind: (...a) => wrap(x.bind(...a)), first: x.first, run: x.run, all: async () => { await new Promise((r) => setTimeout(r, 5)); return x.all(); } }); return wrap(st); } };
  const env = { TASKS_DB: slow, DRAWINGS: r2(), BACKUPS: r2() };
  for (let i = 0; i < 3; i++) await env.DRAWINGS.put(`f/${i}`, `x${i}`);
  const r = await runBackup(env, { budgetMs: 50, maxCopies: 10 });
  assert.ok(Object.keys(r.databases).length === 1 && r.files.copied === 3, JSON.stringify(r.files));
});

test('Download zip restores cleanly with 2-step in use, and leaves the shared S-curve database out (night audit)', async () => {
  const tasks = localD1(); await tasks.batch(rosterStatements(tasks));
  const auth = authDb(), now = Math.floor(Date.now() / 1000);
  auth.exec(readFileSync(new URL('../../identity-proposal/migrations/0003_two_step.sql', import.meta.url), 'utf8').replace(/ALTER TABLE auth_sessions[^;]*;/g, ''));
  auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('acc', 'brian', 'owner', 'scrypt$secret', now);
  auth.prepare('INSERT INTO auth_totp(account_id,secret,enabled_at,created_at) VALUES(?,?,?,?)').run('acc', 'v1:sealed', now, now);
  const scurve = new DatabaseSync(':memory:'); scurve.exec("CREATE TABLE projects(id TEXT, name TEXT); INSERT INTO projects VALUES('other','Another project')");
  const env = { TASKS_DB: tasks, AUTH_DB: d1(auth), SCURVE_DB: d1(scurve), DRAWINGS: r2(), BACKUPS: r2(), APP_ORIGIN: ORIGIN };
  const r = await routeBackup(new Request(ORIGIN + '/api/backup/download', { method: 'POST', body: JSON.stringify({ files: false }), headers: { origin: ORIGIN, 'x-requested-with': 'tasks', 'content-type': 'application/json' } }),
    env, { sessionCreatedAt: now }, { admin: true, person: 'brian' });
  const z = await unzip(r.body);
  assert.ok(!('data/scurve.json' in z), 'S-curve database not in the zip');
  const id = JSON.parse(z['data/identity.json']);
  assert.equal(id.tables.auth_totp.rows.length, 0, 'no 2-step set-ups in the zip');
  const copy = new DatabaseSync(':memory:'); copy.exec(restoreSql(id));
  assert.equal(copy.prepare('SELECT COUNT(*) n FROM auth_accounts').get().n, 1, 'identity restores from the zip');
});

test('the 06:00 Bangkok cron runs repeating tasks; the weekly cron still runs the backup (5 Nov 2026)', async () => {
  const { REPEAT_CRON, bangkokDate } = await import('../src/repeats.mjs');
  const { readFileSync } = await import('node:fs');
  const config = readFileSync(new URL('../../production/wrangler.jsonc', import.meta.url), 'utf8');
  assert.ok(config.includes(`"${REPEAT_CRON}"`) && config.includes('"0 19 * * 6"'));
  assert.equal(REPEAT_CRON, '0 23 * * *');
  assert.equal(bangkokDate(new Date('2026-11-08T23:00:00Z')), '2026-11-09', '23:00 UTC Sunday = 06:00 Monday in Bangkok');
});
