// Milestones (Schedule), Drawing changes (Drawings) and the HES plan pin (Safety): who sees and who edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTrackers } from '../src/trackers.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

const ORIGIN = 'https://calnkt.test';
async function world() {
  const db = localD1(); await db.batch(rosterStatements(db));
  const store = new Map();
  return { db, env: { TASKS_DB: db, APP_ORIGIN: ORIGIN, DRAWINGS: { async get(k) { return store.has(k) ? { body: store.get(k) } : null; } } }, store };
}
function call(w, pages, method, path, { body, person = 'brian', viewAs = false, headers = {} } = {}) {
  const req = new Request(ORIGIN + path, { method, body, headers: method === 'GET' ? {} : { origin: ORIGIN, 'x-requested-with': 'trackers', 'content-type': 'application/json', ...headers } });
  return routeTrackers(req, w.env, {}, { pages, person, viewAs: viewAs ? { id: 'x' } : null })
    .then(async (r) => ({ status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text() }), (e) => ({ status: e.status, body: { error: e.message } }));
}

test('milestones: seeded from the sheet; timeline view sees, only timeline edit changes; changes are logged', async () => {
  const w = await world();
  const ks = await call(w, { timeline: 'view' }, 'GET', '/api/milestones', { person: 'tom' });
  assert.equal(ks.status, 200); assert.equal(ks.body.items.length, 36); assert.equal(ks.body.canEdit, false);
  const c3 = ks.body.items.find((m) => m.id === 'C3');
  assert.deepEqual([c3.name, c3.plan, c3.remarks], ['Construction Start', '2026-11-10', 'Pile driving 10-13 Nov']);
  assert.equal(ks.body.items.find((m) => m.id === 'P2').plan, '-');
  assert.equal((await call(w, { timeline: 'none' }, 'GET', '/api/milestones')).status, 404);
  assert.equal((await call(w, { timeline: 'view' }, 'POST', '/api/milestones/C3', { body: JSON.stringify({ actual: '2026-11-10' }) })).status, 403);
  assert.equal((await call(w, { timeline: 'edit' }, 'POST', '/api/milestones/C3', { body: JSON.stringify({ actual: '2026-11-10' }), viewAs: true })).status, 403);
  assert.equal((await call(w, { timeline: 'edit' }, 'POST', '/api/milestones/C3', { body: JSON.stringify({ actual: '10/11/2026' }) })).status, 400);
  assert.equal((await call(w, { timeline: 'edit' }, 'POST', '/api/milestones/C3', { body: JSON.stringify({ actual: '2026-11-10' }), headers: { 'x-requested-with': 'x' } })).status, 403);
  const ok = await call(w, { timeline: 'edit' }, 'POST', '/api/milestones/C3', { body: JSON.stringify({ actual: '2026-11-10', remarks: 'Piling started' }) });
  assert.equal(ok.status, 200); assert.equal(ok.body.item.actual, '2026-11-10');
  const log = w.db.sql.prepare('SELECT by_id, milestone_id, data_json FROM milestone_log').all();
  assert.equal(log.length, 1); assert.equal(log[0].by_id, 'brian');
  assert.deepEqual(JSON.parse(log[0].data_json).actual, { from: null, to: '2026-11-10' });
  assert.throws(() => w.db.sql.exec('DELETE FROM milestone_log'), /APPEND_ONLY/);
});

test('drawing changes: drawings view sees, drawings edit adds / changes / deletes; factor and date checked', async () => {
  const w = await world();
  const E = { drawings: 'edit' }, V = { drawings: 'view' };
  assert.equal((await call(w, { drawings: 'none' }, 'GET', '/api/drawing-changes')).status, 404);
  assert.equal((await call(w, V, 'POST', '/api/drawing-changes', { body: JSON.stringify({ item: 'x' }) })).status, 403);
  assert.equal((await call(w, E, 'POST', '/api/drawing-changes', { body: JSON.stringify({ item: '' }) })).status, 400);
  assert.equal((await call(w, E, 'POST', '/api/drawing-changes', { body: JSON.stringify({ item: 'x', factor: 'Z' }) })).status, 400);
  const add = await call(w, E, 'POST', '/api/drawing-changes', { body: JSON.stringify({ item: 'Canopy gutter outlet moved', drawing_no: 'NTI-CAN-CS-08', requester: 'Caltex', factor: 'a', date: '2026-11-03', description: 'Outlet moved 300 mm' }) });
  assert.equal(add.status, 201);
  const list = await call(w, V, 'GET', '/api/drawing-changes', { person: 'bas' });
  assert.equal(list.body.canEdit, false);
  assert.deepEqual([list.body.items[0].no, list.body.items[0].factor, list.body.items[0].created_by], [1, 'A', 'Brian']);
  assert.equal((await call(w, E, 'POST', `/api/drawing-changes/${add.body.id}`, { body: JSON.stringify({ factor: 'U' }) })).status, 200);
  assert.equal((await call(w, E, 'POST', `/api/drawing-changes/${add.body.id}/delete`, { body: '{}' })).status, 200);
  assert.equal((await call(w, V, 'GET', '/api/drawing-changes')).body.items.length, 0);
  assert.deepEqual(w.db.sql.prepare('SELECT action FROM drawing_change_log ORDER BY id').all().map((r) => r.action), ['add', 'update', 'delete']);
});

test('HES plan pin: SPP sees the newest upload; Caltex only the newest version shared with Caltex (audit F03)', async () => {
  const w = await world();
  const put = (id, name, at, caltexFrom = null, deleted = 0) => { w.db.sql.prepare("INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at, deleted) VALUES(?, 'safety', ?, 3, 'x', ?, 'h', ?, 'brian', ?, ?)").run(id, name, `files/${id}`, caltexFrom, at, deleted); w.store.set(`files/${id}`, new TextEncoder().encode(id)); };
  assert.deepEqual((await call(w, { safety: 'view' }, 'GET', '/api/pins/hes')).body, { file: null });
  put('a', 'HES_Stewardship_Plan__NTI_City_Park.xlsx', '2026-11-01T10:00:00Z', '2026-11-01', 1); // shared, then replaced by b
  w.db.sql.prepare("INSERT INTO file_log(at, by_id, action, file_id, folder_id, data_json) VALUES('2026-11-02T10:00:00Z', 'brian', 'replace', 'a', 'safety', '{}')").run();
  put('b', 'HES_Stewardship_Plan__NTI_City_Park.xlsx', '2026-11-02T10:00:00Z'); // newest, not shared yet
  put('c', 'Other plan.xlsx', '2026-11-03T10:00:00Z', '2026-11-01');
  const spp = await call(w, { safety: 'view', files: 'edit' }, 'GET', '/api/pins/hes', { person: 'brian' });
  assert.deepEqual([spp.body.file.id, spp.body.canEdit, spp.body.file.caltexFrom], ['b', true, null]);
  const cx = await call(w, { safety: 'view', files: 'edit' }, 'GET', '/api/pins/hes', { person: 'bas' });
  assert.equal(cx.body.canEdit, false); assert.equal(cx.body.file.id, undefined); assert.equal(cx.body.file.by, '', 'partners never see who uploaded (night audit)');
  assert.equal((await call(w, { safety: 'view' }, 'GET', '/api/pins/hes/download/x.xlsx', { person: 'bas' })).body, 'a', 'Caltex gets the last shared version');
  assert.equal((await call(w, { safety: 'view' }, 'GET', '/api/pins/hes/download/x.xlsx', { person: 'gift' })).body, 'b', 'SPP gets the newest');
  // A deleted (not replaced) shared version never counts; a future share date does not count yet.
  w.db.sql.exec("UPDATE files SET caltex_from='2099-01-01' WHERE id='a'");
  assert.deepEqual((await call(w, { safety: 'view' }, 'GET', '/api/pins/hes', { person: 'bas' })).body, { file: null });
  assert.equal((await call(w, { safety: 'none', files: 'edit' }, 'GET', '/api/pins/hes')).status, 404);
  assert.equal((await call(w, { safety: 'view' }, 'GET', '/api/pins/nope')).status, 404);
});

test('night audit: stopping the sharing of the current HES plan also stops older shared versions', async () => {
  const { routeFiles } = await import('../src/files.mjs');
  const { routeTrackers } = await import('../src/trackers.mjs');
  const { localD1 } = await import('../../tasks/tests/local-d1.mjs');
  const { rosterStatements } = await import('../../tasks/src/seed.mjs');
  const db = localD1(); await db.batch(rosterStatements(db));
  const store = new Map(), env = { TASKS_DB: db, APP_ORIGIN: 'https://calnkt.test', DRAWINGS: { async put(k, v) { store.set(k, v); }, async get(k) { return store.has(k) ? { body: new Response('x').body } : null; } } };
  const H = { origin: env.APP_ORIGIN, 'x-requested-with': 'files' };
  const files = (person, method, path, body) => routeFiles(new Request(env.APP_ORIGIN + path, { method, body, headers: method === 'GET' ? {} : H }), env, {}, { pages: { files: 'edit', safety: 'view' }, admin: person === 'ming', person }, { id: person, company: person === 'bas' ? 'caltex' : 'spp' }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const pin = (person) => routeTrackers(new Request(env.APP_ORIGIN + '/api/pins/hes'), env, {}, { pages: { safety: 'view', files: 'view' }, person }).then((r) => r.json());
  const v1 = await files('ming', 'POST', '/api/files/upload?folder=safety&name=' + encodeURIComponent('HES Stewardship Plan.xlsx'), 'v1');
  await files('ming', 'POST', `/api/files/${v1.body.id}/share`, JSON.stringify({ caltexFrom: '2026-01-01' }));
  const v2 = await files('ming', 'POST', '/api/files/upload?folder=safety&name=' + encodeURIComponent('HES Stewardship Plan.xlsx'), 'v2');
  await files('ming', 'POST', `/api/files/${v2.body.id}/share`, JSON.stringify({ caltexFrom: '2026-01-01' }));
  assert.ok((await pin('bas')).file, 'Caltex sees the shared plan');
  const stop = await files('ming', 'POST', `/api/files/${v2.body.id}/share`, JSON.stringify({ caltexFrom: null }));
  assert.equal(stop.body.olderVersionsUnshared, 1);
  assert.equal((await pin('bas')).file, null, 'no version left for Caltex');
});
