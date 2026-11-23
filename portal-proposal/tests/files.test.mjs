// Project files API (src/files.mjs): who sees what, Caltex sharing dates, uploads and the log.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { routeFiles, mondayOf, weeklyShareDate, bangkokToday } from '../src/files.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

const ORIGIN = 'https://calnkt.test';
function r2() {
  const store = new Map();
  return { store, async put(k, v, o) { store.set(k, { bytes: new Uint8Array(v), o }); }, async get(k) { const x = store.get(k); return x ? { body: x.bytes } : null; }, async delete(k) { store.delete(k); } };
}
async function world() {
  const db = localD1(); await db.batch(rosterStatements(db));
  return { db, env: { TASKS_DB: db, DRAWINGS: r2(), APP_ORIGIN: ORIGIN } };
}
const who = { brian: ['spp', 'edit', true], ming: ['spp', 'edit', true], gift: ['spp', 'view', false], bas: ['caltex', 'view', false], tom: ['ks', 'none', false] };
function call(w, person, method, path, { body, headers = {}, viewAs = false, level } = {}) {
  const [company, lv, admin] = who[person];
  const req = new Request(ORIGIN + path, { method, body, headers: method === 'GET' ? headers : { origin: ORIGIN, 'x-requested-with': 'files', ...headers } });
  const access = { pages: { files: level || lv }, admin, viewAs: viewAs ? { id: person } : null, person };
  return routeFiles(req, w.env, {}, access, { id: person, company }).then(async (r) => ({ status: r.status, body: await r.json() }), (e) => ({ status: e.status, body: { error: e.message } }));
}
const upload = (w, person, folder, name, text = 'hello', opts = {}) => call(w, person, 'POST', `/api/files/upload?folder=${folder}&name=${encodeURIComponent(name)}`, { body: text, ...opts });

test('weekly rule: a meeting deck is shared from the Monday of its week', () => {
  assert.equal(mondayOf('2026-11-04'), '2026-11-02');
  assert.equal(mondayOf('2026-11-02'), '2026-11-02');
  assert.equal(mondayOf('2026-11-08'), '2026-11-02');
  assert.equal(weeklyShareDate('NTI NKT Safety Weekly No.02 - 2026-11-04.pptx'), '2026-11-02');
  assert.equal(weeklyShareDate('no date.pptx'), null);
  assert.equal(bangkokToday(new Date('2026-11-01T18:00:00Z')), '2026-11-02');
});

test('SPP sees every file; Caltex only shared files from their date; KS nothing', async () => {
  const w = await world(), today = bangkokToday();
  const past = await upload(w, 'brian', 'safety-weekly', 'Weekly 01 - 2026-01-07.pptx');
  const future = await upload(w, 'brian', 'safety-weekly', 'Weekly 99 - 2099-06-10.pptx');
  const plain = await upload(w, 'brian', 'engineering', 'calc.pdf');
  assert.equal(past.status, 201); assert.equal(past.body.caltexFrom, '2026-01-05');
  assert.equal(future.body.caltexFrom, '2099-06-08'); assert.equal(plain.body.caltexFrom, null);

  const gift = await call(w, 'gift', 'GET', '/api/files');
  assert.equal(gift.body.files.length, 3); assert.equal(gift.body.canEdit, false); assert.equal(gift.body.team, true);
  const bas = await call(w, 'bas', 'GET', '/api/files');
  assert.deepEqual(bas.body.files.map((f) => f.name), ['Weekly 01 - 2026-01-07.pptx']);
  assert.ok(!('caltexFrom' in bas.body.files[0]) && bas.body.files[0].by === '', 'partners do not see sharing dates or uploaders');
  assert.deepEqual(bas.body.folders.map((f) => f.id).sort(), ['safety', 'safety-weekly'], 'only folders holding shared files');
  assert.equal((await call(w, 'bas', 'GET', `/api/files/${future.body.id}/download`)).status, 404, 'a future deck cannot be fetched by id');
  assert.equal((await call(w, 'bas', 'GET', `/api/files/${plain.body.id}/download`)).status, 404);
  assert.equal((await call(w, 'tom', 'GET', '/api/files')).status, 404);

  // An admin shares the calculation from today: Caltex now sees it.
  assert.equal((await call(w, 'ming', 'POST', `/api/files/${plain.body.id}/share`, { body: JSON.stringify({ caltexFrom: today }) })).status, 200);
  assert.equal((await call(w, 'bas', 'GET', '/api/files')).body.files.length, 2);
  // A non-admin cannot share.
  assert.equal((await call(w, 'gift', 'POST', `/api/files/${future.body.id}/share`, { body: JSON.stringify({ caltexFrom: today }) })).status, 403);
});

test('upload, download and delete need the right level, the request header, and no view-as', async () => {
  const w = await world();
  assert.equal((await upload(w, 'gift', 'safety', 'a.txt')).status, 403, 'view level cannot upload');
  assert.equal((await upload(w, 'bas', 'safety', 'a.txt', 'x', { level: 'edit' })).status, 403, 'partners never upload');
  assert.equal((await upload(w, 'brian', 'safety', 'a.txt', 'x', { viewAs: true })).status, 403, 'view-as is read-only');
  assert.equal((await upload(w, 'brian', 'safety', 'a.txt', 'x', { headers: { 'x-requested-with': 'other' } })).status, 403);
  assert.equal((await upload(w, 'brian', 'nope', 'a.txt')).status, 404);
  assert.equal((await upload(w, 'brian', 'safety', '../a.txt')).status, 201, 'slashes are cleaned out of names');
  assert.equal((await upload(w, 'brian', 'safety', 'empty.txt', '')).status, 400);

  const up = await upload(w, 'brian', 'safety', 'plan.pdf', 'PDFDATA');
  const r = await routeFiles(new Request(`${ORIGIN}/api/files/${up.body.id}/download?inline=1`), w.env, {}, { pages: { files: 'view' }, person: 'gift' }, { id: 'gift', company: 'spp' });
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.match(r.headers.get('content-disposition'), /^inline;/);
  assert.equal(new TextDecoder().decode(await r.arrayBuffer()), 'PDFDATA');

  // Same name again = new version; the old one is hidden but kept.
  const v2 = await upload(w, 'brian', 'safety', 'plan.pdf', 'PDF v2');
  assert.equal(v2.body.replaced, up.body.id);
  const names = (await call(w, 'gift', 'GET', '/api/files')).body.files.map((f) => f.name);
  assert.equal(names.filter((n) => n === 'plan.pdf').length, 1);
  assert.equal(w.env.DRAWINGS.store.size, 3, 'old versions stay in storage');

  assert.equal((await call(w, 'gift', 'POST', `/api/files/${v2.body.id}/delete`, { body: '{}' })).status, 403);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/${v2.body.id}/delete`, { body: '{}' })).status, 200);
  assert.equal((await call(w, 'gift', 'GET', `/api/files/${v2.body.id}/download`)).status, 404);
  const log = w.db.sql.prepare('SELECT action FROM file_log ORDER BY id').all().map((x) => x.action);
  assert.deepEqual(log, ['upload', 'upload', 'replace', 'upload', 'delete']);
  assert.throws(() => w.db.sql.exec('DELETE FROM file_log'), /APPEND_ONLY/);

  const folder = await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent: 'engineering', name: 'Calculations' }) });
  assert.equal(folder.status, 201);
  assert.equal((await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent: 'engineering', name: 'calculations' }) })).status, 409);
});

test('macro-enabled PowerPoint and Excel files keep their own file type and always download as attachments (11 Nov 2026)', async () => {
  const w = await world();
  const type = { 'deck.pptm': 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', 'sheet.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12' };
  for (const [name, want] of Object.entries(type)) {
    const up = await upload(w, 'brian', 'safety', name, 'ZIPDATA');
    assert.equal(up.status, 201);
    const r = await routeFiles(new Request(`${ORIGIN}/api/files/${up.body.id}/download?inline=1`), w.env, {}, { pages: { files: 'view' }, person: 'gift' }, { id: 'gift', company: 'spp' });
    assert.equal(r.headers.get('content-type'), want);
    assert.match(r.headers.get('content-disposition'), /^attachment;/, 'never opened by the browser itself: the viewer reads the bytes');
  }
});

test('CAD viewer list: only DWG/DXF files the person may see; download links end with the file name', async () => {
  const w = await world();
  const shared = await upload(w, 'brian', 'engineering', 'Canopy CS-08.dwg', 'AC1032');
  await upload(w, 'brian', 'engineering', 'Private plan.dxf', '0\nSECTION');
  await upload(w, 'brian', 'engineering', 'notes.pdf', 'PDF');
  await call(w, 'ming', 'POST', `/api/files/${shared.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  const sheets = async (person) => {
    const r = await routeFiles(new Request(`${ORIGIN}/files/cad/sheets.json`), w.env, {}, { pages: { files: who[person][1] }, person }, { id: person, company: who[person][0] }).catch((e) => e);
    return r.status === 200 ? (await r.json()).groups.flatMap((g) => g.sheets) : r.status;
  };
  const gift = await sheets('gift');
  assert.deepEqual(gift.map((s) => s.title), ['Canopy CS-08.dwg', 'Private plan.dxf']);
  assert.equal(gift[0].file, `/api/files/${shared.body.id}/download/Canopy%20CS-08.dwg`);
  assert.deepEqual((await sheets('bas')).map((s) => s.title), ['Canopy CS-08.dwg']);
  assert.equal(await sheets('tom'), 404);
  // The name suffix is accepted on downloads only.
  const r = await routeFiles(new Request(`${ORIGIN}${gift[0].file}`), w.env, {}, { pages: { files: 'view' }, person: 'gift' }, { id: 'gift', company: 'spp' });
  assert.equal(new TextDecoder().decode(await r.arrayBuffer()), 'AC1032');
  assert.equal((await call(w, 'ming', 'POST', `/api/files/${shared.body.id}/share/x`, { body: '{}' })).status, 404);
});

test('saving from an older copy is refused (audit F09); a new HES version starts unshared (audit F03)', async () => {
  const w = await world();
  const v1 = await upload(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', 'v1');
  await call(w, 'ming', 'POST', `/api/files/${v1.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  const v2 = await upload(w, 'brian', 'safety', `HES Stewardship Plan.xlsx`, 'v2', {});
  assert.equal(v2.body.caltexFrom, null, 'pinned document: new version is not shared automatically');
  const normal1 = await upload(w, 'brian', 'safety', 'site rules.pdf', 'r1');
  await call(w, 'ming', 'POST', `/api/files/${normal1.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  assert.equal((await upload(w, 'brian', 'safety', 'site rules.pdf', 'r2')).body.caltexFrom, '2026-01-01', 'ordinary files keep their sharing');
  // Two people edit v2; the first saves (base = v2), the second still has v2 open.
  const first = await call(w, 'brian', 'POST', `/api/files/upload?folder=safety&name=${encodeURIComponent('HES Stewardship Plan.xlsx')}&base=${v2.body.id}`, { body: 'v3' });
  assert.equal(first.status, 201);
  const stale = await call(w, 'brian', 'POST', `/api/files/upload?folder=safety&name=${encodeURIComponent('HES Stewardship Plan.xlsx')}&base=${v2.body.id}`, { body: 'v3-other' });
  assert.equal(stale.status, 409);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/upload?folder=safety&name=${encodeURIComponent('HES Stewardship Plan.xlsx')}&base=${first.body.id}`, { body: 'v4' })).status, 201);
});

test('admins delete folders with everything in them; built-in folders and non-admins are refused (4 Nov 2026)', async () => {
  const w = await world();
  const f1 = await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent: 'engineering', name: 'Old RFIs' }), headers: { 'content-type': 'application/json' } });
  const f2 = await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent: f1.body.id, name: 'Inner' }), headers: { 'content-type': 'application/json' } });
  await upload(w, 'brian', f1.body.id, 'a.pdf'); await upload(w, 'brian', f2.body.id, 'b.pdf'); const keep = await upload(w, 'brian', 'engineering', 'keep.pdf');
  assert.equal((await call(w, 'gift', 'POST', `/api/files/folder/${f1.body.id}/delete`, { body: '{}', level: 'edit' })).status, 403, 'editor, not admin');
  assert.equal((await call(w, 'brian', 'POST', `/api/files/folder/${f1.body.id}/delete`, { body: '{}', viewAs: true })).status, 403, 'viewing as someone else');
  for (const id of ['safety', 'safety-weekly', 'engineering']) assert.equal((await call(w, 'brian', 'POST', `/api/files/folder/${id}/delete`, { body: '{}' })).status, 409, id);
  const r = await call(w, 'brian', 'POST', `/api/files/folder/${f1.body.id}/delete`, { body: '{}' });
  assert.equal(r.status, 200); assert.deepEqual([r.body.folders, r.body.files], [2, 2]);
  const list = (await call(w, 'brian', 'GET', '/api/files')).body;
  assert.ok(!list.folders.some((f) => [f1.body.id, f2.body.id].includes(f.id)));
  assert.deepEqual(list.files.map((f) => f.id), [keep.body.id]);
  assert.equal(list.canDeleteFolders, true); assert.deepEqual(list.builtInFolders.sort(), ['engineering', 'safety', 'safety-weekly']);
  assert.equal((await call(w, 'gift', 'GET', '/api/files', { level: 'edit' })).body.canDeleteFolders, false);
  const logged = (await w.db.prepare("SELECT action, data_json FROM file_log WHERE action IN ('folder_delete','delete') ORDER BY id").all()).results;
  assert.equal(logged.filter((x) => x.action === 'delete').length, 2);
  const last = JSON.parse(logged.at(-1).data_json);
  assert.deepEqual([last.name, last.folders, last.files, last.ids.sort()], ['Old RFIs', 2, 2, [f1.body.id, f2.body.id].sort()]);
});

test('admins can upload and make folders even at view level; others at view cannot', async () => {
  const w = await world();
  assert.equal((await upload(w, 'brian', 'engineering', 'x.pdf', 'hi', { level: 'view' })).status, 201);
  assert.equal((await upload(w, 'gift', 'engineering', 'y.pdf')).status, 403);
});

test('upload a new version of a file edited offline: same name kept, old version hidden, picked name logged', async () => {
  const w = await world();
  const first = await upload(w, 'brian', 'engineering', 'Site layout.pdf', 'v1');
  const next = await call(w, 'ming', 'POST', `/api/files/upload?folder=engineering&name=${encodeURIComponent('Site layout.pdf')}&base=${first.body.id}&source=${encodeURIComponent('Site layout REV B final.pdf')}`, { body: 'v2' });
  assert.equal(next.status, 201); assert.equal(next.body.replaced, first.body.id);
  const files = (await call(w, 'brian', 'GET', '/api/files')).body.files.filter((f) => f.folder === 'engineering');
  assert.deepEqual(files.map((f) => [f.id, f.name]), [[next.body.id, 'Site layout.pdf']]);
  const log = JSON.parse((await w.db.prepare("SELECT data_json FROM file_log WHERE action='upload' ORDER BY id DESC LIMIT 1").first()).data_json);
  assert.equal(log.source, 'Site layout REV B final.pdf');
  const stale = await call(w, 'brian', 'POST', `/api/files/upload?folder=engineering&name=${encodeURIComponent('Site layout.pdf')}&base=${first.body.id}`, { body: 'v3' });
  assert.equal(stale.status, 409, 'replacing from an older version is refused');
});

test('recycle bin (5 Nov 2026): admins only; folders come back with their contents; files back to their folder', async () => {
  const w = await world();
  const mk = async (parent, name) => (await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent, name }), headers: { 'content-type': 'application/json' } })).body.id;
  const a = await mk('engineering', 'Old RFIs'), inner = await mk(a, 'Inner');
  const fa = await upload(w, 'brian', a, 'a.pdf'), fi = await upload(w, 'brian', inner, 'b.pdf');
  const single = await upload(w, 'brian', 'engineering', 'plan.pdf', 'v1');
  const v2 = await upload(w, 'brian', 'engineering', 'plan.pdf', 'v2'); // the v1 it replaces is a version, not a deletion
  await call(w, 'brian', 'POST', `/api/files/${v2.body.id}/delete`, { body: '{}' });
  await call(w, 'brian', 'POST', `/api/files/folder/${a}/delete`, { body: '{}' });
  // Who may look
  assert.equal((await call(w, 'gift', 'GET', '/api/files/bin', { level: 'edit' })).status, 404, 'editor, not admin');
  assert.equal((await call(w, 'bas', 'GET', '/api/files/bin')).status, 404, 'Caltex');
  assert.equal((await call(w, 'brian', 'GET', '/api/files/bin', { viewAs: true })).status, 404, 'viewing as someone else');
  const bin = (await call(w, 'brian', 'GET', '/api/files/bin')).body;
  assert.deepEqual(bin.folders.map((f) => [f.name, f.files, f.folders]), [['Old RFIs', 2, 1]]);
  assert.deepEqual(bin.files.map((f) => f.id), [v2.body.id], 'the replaced v1 and the files inside the folder are not listed on their own');
  assert.equal(bin.folders[0].by, 'Brian');
  // Restore the folder: it, its sub-folder and both files are back
  assert.equal((await call(w, 'gift', 'POST', `/api/files/bin/folder/${a}/restore`, { body: '{}', level: 'edit' })).status, 404);
  const r = await call(w, 'brian', 'POST', `/api/files/bin/folder/${a}/restore`, { body: '{}' });
  assert.equal(r.status, 200); assert.deepEqual([r.body.folders, r.body.files, r.body.name], [2, 2, 'Old RFIs']);
  let list = (await call(w, 'brian', 'GET', '/api/files')).body;
  assert.ok([a, inner].every((id) => list.folders.some((f) => f.id === id)));
  assert.ok([fa.body.id, fi.body.id].every((id) => list.files.some((f) => f.id === id)));
  // Restore the single file next to a newer file of the same name: it comes back renamed
  await upload(w, 'brian', 'engineering', 'plan.pdf', 'v3');
  const rf = await call(w, 'brian', 'POST', `/api/files/bin/file/${v2.body.id}/restore`, { body: '{}' });
  assert.equal(rf.status, 200); assert.equal(rf.body.name, 'plan (restored).pdf');
  list = (await call(w, 'brian', 'GET', '/api/files')).body;
  assert.deepEqual(list.files.filter((f) => f.folder === 'engineering').map((f) => f.name).sort(), ['plan (restored).pdf', 'plan.pdf']);
  assert.deepEqual((await call(w, 'brian', 'GET', '/api/files/bin')).body, { folders: [], files: [] });
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/file/${single.body.id}/restore`, { body: '{}' })).status, 404, 'old versions are not in the bin');
});

test('recycle bin: something deleted inside a deleted folder needs that folder back first', async () => {
  const w = await world();
  const mk = async (parent, name) => (await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent, name }), headers: { 'content-type': 'application/json' } })).body.id;
  const p = await mk('engineering', 'Parent'), c = await mk(p, 'Child');
  const f = await upload(w, 'brian', c, 'x.pdf');
  await call(w, 'brian', 'POST', `/api/files/${f.body.id}/delete`, { body: '{}' });
  await call(w, 'brian', 'POST', `/api/files/folder/${c}/delete`, { body: '{}' });
  await call(w, 'brian', 'POST', `/api/files/folder/${p}/delete`, { body: '{}' });
  const bin = (await call(w, 'brian', 'GET', '/api/files/bin')).body;
  assert.deepEqual(bin.folders.map((x) => [x.name, x.parentDeleted]), [['Parent', false], ['Child', true]]);
  assert.equal(bin.files[0].folderDeleted, true);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/folder/${c}/restore`, { body: '{}' })).status, 409);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/file/${f.body.id}/restore`, { body: '{}' })).status, 409);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/folder/${p}/restore`, { body: '{}' })).status, 200);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/folder/${c}/restore`, { body: '{}' })).status, 200);
  assert.equal((await call(w, 'brian', 'POST', `/api/files/bin/file/${f.body.id}/restore`, { body: '{}' })).status, 200);
});

// Autosave from the Excel editor (10 Nov 2026): base + baseAt + autosave=1.
const save = (w, person, folder, name, base, baseAt, text, auto = true) => call(w, person, 'POST', `/api/files/upload?folder=${folder}&name=${encodeURIComponent(name)}&base=${base}&baseAt=${encodeURIComponent(baseAt)}${auto ? '&autosave=1' : ''}`, { body: text });
const live = (w, name) => w.db.prepare('SELECT id, r2_key, uploaded_at, caltex_from FROM files WHERE lower(name)=lower(?) AND deleted=0').bind(name).all().then((r) => r.results);
const rows = (w, name) => w.db.prepare('SELECT id FROM files WHERE lower(name)=lower(?)').bind(name).all().then((r) => r.results.length);
const body = async (w, id) => new TextDecoder().decode(w.env.DRAWINGS.store.get((await w.db.prepare('SELECT r2_key FROM files WHERE id=?').bind(id).first()).r2_key).bytes);

test('autosave: one person\'s run of edits goes into one version; a hand upload is never overwritten', async () => {
  const w = await world();
  const v1 = await upload(w, 'brian', 'engineering', 'Quantities.xlsx', 'v1');
  // The first autosave on a hand-uploaded file makes a new version (the upload stays as it was).
  const a = await save(w, 'brian', 'engineering', 'Quantities.xlsx', v1.body.id, v1.body.at, 'a');
  assert.equal(a.status, 201); assert.notEqual(a.body.id, v1.body.id); assert.ok(!a.body.folded);
  assert.equal(await body(w, v1.body.id), 'v1');
  // Further autosaves by the same person fold into that version: same id, new content and time, old copy removed.
  const keyA = (await live(w, 'Quantities.xlsx'))[0].r2_key;
  const b = await save(w, 'brian', 'engineering', 'Quantities.xlsx', a.body.id, a.body.at, 'b');
  assert.equal(b.status, 201); assert.equal(b.body.id, a.body.id); assert.ok(b.body.folded); assert.notEqual(b.body.at, a.body.at);
  assert.equal(await body(w, a.body.id), 'b'); assert.ok(!w.env.DRAWINGS.store.has(keyA), 'the in-between copy is not kept');
  assert.equal(await rows(w, 'Quantities.xlsx'), 2);
  // The old saved time no longer matches: a copy opened before the fold is refused (it would undo "b").
  assert.equal((await save(w, 'brian', 'engineering', 'Quantities.xlsx', a.body.id, a.body.at, 'stale')).status, 409);
  // Someone else's autosave starts their own version; a save that is not an autosave also starts a new one.
  const m = await save(w, 'ming', 'engineering', 'Quantities.xlsx', b.body.id, b.body.at, 'm');
  assert.equal(m.status, 201); assert.notEqual(m.body.id, b.body.id);
  const n = await save(w, 'ming', 'engineering', 'Quantities.xlsx', m.body.id, m.body.at, 'n', false);
  assert.notEqual(n.body.id, m.body.id);
  const n2 = await save(w, 'ming', 'engineering', 'Quantities.xlsx', n.body.id, n.body.at, 'n2');
  assert.notEqual(n2.body.id, n.body.id, 'a version saved by hand is not folded into');
  const log = (await w.db.prepare("SELECT action FROM file_log WHERE file_id=? ORDER BY id").bind(a.body.id).all()).results.map((r) => r.action);
  assert.deepEqual(log, ['upload', 'autosave', 'replace']);
});

test('autosave: a new version every 15 minutes, and never into a shared HES copy', async () => {
  const w = await world();
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-10T02:00:00Z') });
  try {
    const v1 = await upload(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', 'v1');
    const a = await save(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', v1.body.id, v1.body.at, 'a');
    mock.timers.tick(14 * 60 * 1000);
    const b = await save(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', a.body.id, a.body.at, 'b');
    assert.equal(b.body.id, a.body.id);
    mock.timers.tick(2 * 60 * 1000);
    const c = await save(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', b.body.id, b.body.at, 'c');
    assert.notEqual(c.body.id, b.body.id, 'after 15 minutes a new version starts');
    // An admin shares version c with Caltex: the next autosave must not change what Caltex sees.
    await call(w, 'ming', 'POST', `/api/files/${c.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
    const d = await save(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', c.body.id, c.body.at, 'd');
    assert.notEqual(d.body.id, c.body.id); assert.equal(d.body.caltexFrom, null);
    assert.equal(await body(w, c.body.id), 'c', 'the shared copy is unchanged');
  } finally { mock.timers.reset(); }
});

test('two saves from the same version at the same moment: one wins, the other is refused, nothing is lost', async () => {
  const w = await world();
  const v1 = await upload(w, 'brian', 'engineering', 'Pour plan.xlsx', 'v1');
  // The database write takes a moment, so both saves pass every check before either is written: the guard inside the
  // single transaction decides.
  const batch = w.db.batch.bind(w.db); w.db.batch = async (list) => { await new Promise((r) => setTimeout(r, 20)); return batch(list); };
  const [x, y] = await Promise.all([
    save(w, 'brian', 'engineering', 'Pour plan.xlsx', v1.body.id, v1.body.at, 'brian'),
    save(w, 'ming', 'engineering', 'Pour plan.xlsx', v1.body.id, v1.body.at, 'ming'),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [201, 409]);
  const now = await live(w, 'Pour plan.xlsx');
  assert.equal(now.length, 1, 'exactly one current version');
  assert.equal(await body(w, now[0].id), x.status === 201 ? 'brian' : 'ming');
  assert.equal(w.env.DRAWINGS.store.size, 2, 'the refused copy is not left in storage');
});

test('latest: an open page finds the newest version it may see; downloads carry the saved time', async () => {
  const w = await world();
  const v1 = await upload(w, 'brian', 'engineering', 'Rebar.xlsx', 'v1');
  const v2 = await save(w, 'ming', 'engineering', 'Rebar.xlsx', v1.body.id, v1.body.at, 'v2');
  const l = await call(w, 'gift', 'GET', `/api/files/${v1.body.id}/latest`);
  assert.deepEqual(l.body, { id: v2.body.id, at: v2.body.at, size: 2, by: (await w.db.prepare("SELECT name FROM people WHERE id='ming'").first()).name, mine: false });
  assert.equal((await call(w, 'bas', 'GET', `/api/files/${v1.body.id}/latest`)).status, 404, 'Caltex: not shared');
  await call(w, 'ming', 'POST', `/api/files/${v2.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  const cx = await call(w, 'bas', 'GET', `/api/files/${v1.body.id}/latest`);
  assert.equal(cx.body.id, v2.body.id); assert.equal(cx.body.by, '', 'partners never see who saved');
  const r = await routeFiles(new Request(`${ORIGIN}/api/files/${v2.body.id}/download`), w.env, {}, { pages: { files: 'view' }, person: 'gift' }, { id: 'gift', company: 'spp' });
  assert.equal(r.headers.get('x-file-saved-at'), v2.body.at);
});

// Version history (10 Nov 2026).
test('version history: SPP lists versions, downloads an earlier one and brings it back; partners and deleted files do not', async () => {
  const w = await world();
  const text = async (person, id) => { const [company] = who[person]; const r = await routeFiles(new Request(`${ORIGIN}/api/files/${id}/download`), w.env, {}, { pages: { files: 'view' }, person }, { id: person, company }).catch((e) => e); return r.status === 200 ? new TextDecoder().decode(await r.arrayBuffer()) : r.status; };
  const v1 = await upload(w, 'brian', 'engineering', 'Method statement.docx', 'one');
  await call(w, 'ming', 'POST', `/api/files/${v1.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  const v2 = await upload(w, 'ming', 'engineering', 'Method statement.docx', 'two');
  const v3 = await save(w, 'brian', 'engineering', 'Method statement.docx', v2.body.id, v2.body.at, 'three');
  // Any version's id gives the same list, newest first.
  for (const id of [v1.body.id, v2.body.id, v3.body.id]) {
    const l = await call(w, 'gift', 'GET', `/api/files/${id}/versions`);
    assert.equal(l.status, 200);
    assert.deepEqual(l.body.versions.map((v) => [v.id, v.current, v.how]), [[v3.body.id, true, 'edit'], [v2.body.id, false, 'upload'], [v1.body.id, false, 'upload']]);
    assert.equal(l.body.canRestore, false, 'view level can look but not restore');
  }
  assert.equal(await text('gift', v1.body.id), 'one', 'SPP can download an earlier version');
  assert.equal(await text('bas', v3.body.id), 'three', 'Caltex sees the current shared version');
  assert.equal(await text('bas', v1.body.id), 404, 'but no earlier versions');
  assert.equal((await call(w, 'bas', 'GET', `/api/files/${v3.body.id}/versions`)).status, 404);
  // Restore: needs upload rights, the newest version as base, and makes a new version with the old content.
  assert.equal((await call(w, 'gift', 'POST', `/api/files/${v1.body.id}/restore`)).status, 403);
  assert.equal((await call(w, 'ming', 'POST', `/api/files/${v3.body.id}/restore`)).status, 400, 'already current');
  assert.equal((await call(w, 'ming', 'POST', `/api/files/${v1.body.id}/restore?base=${v2.body.id}`)).status, 409, 'someone saved since the list was read');
  const back = await call(w, 'ming', 'POST', `/api/files/${v1.body.id}/restore?base=${v3.body.id}&baseAt=${encodeURIComponent(v3.body.at)}`);
  assert.equal(back.status, 201); assert.equal(back.body.caltexFrom, '2026-01-01', 'sharing follows the usual rule for a new version');
  assert.equal(await text('gift', back.body.id), 'one');
  assert.equal(await text('gift', v3.body.id), 'three', 'the version it replaced is still there');
  const l = await call(w, 'ming', 'GET', `/api/files/${back.body.id}/versions`);
  assert.deepEqual(l.body.versions.map((v) => v.how), ['restore', 'edit', 'upload', 'upload']); assert.equal(l.body.canRestore, true);
  assert.equal(l.body.versions[0].from, v1.body.at);
  // A deleted file (recycle bin) has no history to browse, and its versions cannot be downloaded.
  await call(w, 'brian', 'POST', `/api/files/${back.body.id}/delete`);
  assert.equal((await call(w, 'brian', 'GET', `/api/files/${v1.body.id}/versions`)).status, 404);
  assert.equal(await text('brian', v2.body.id), 404);
});

test('version history: restoring a HES version starts unshared', async () => {
  const w = await world();
  const v1 = await upload(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', 'v1');
  await call(w, 'ming', 'POST', `/api/files/${v1.body.id}/share`, { body: JSON.stringify({ caltexFrom: '2026-01-01' }) });
  const v2 = await upload(w, 'brian', 'safety', 'HES Stewardship Plan.xlsx', 'v2');
  const back = await call(w, 'brian', 'POST', `/api/files/${v1.body.id}/restore?base=${v2.body.id}`);
  assert.equal(back.status, 201); assert.equal(back.body.caltexFrom, null);
});

test('version history works for a file with more than 100 versions (the database takes at most 100 values per query)', async () => {
  const w = await world();
  // The test database refuses any query given more than 100 values, as the live one does (tasks/tests/local-d1.mjs).
  let last = await upload(w, 'brian', 'engineering', 'Daily log.xlsx', 'v0'); const first = last.body.id;
  for (let i = 1; i <= 130; i++) last = await upload(w, 'brian', 'engineering', 'Daily log.xlsx', `v${i}`);
  const l = await call(w, 'gift', 'GET', `/api/files/${first}/versions`);
  assert.equal(l.status, 200); assert.equal(l.body.versions.length, 131); assert.equal(l.body.versions[0].id, last.body.id); assert.equal(l.body.versions[130].id, first);
  assert.ok(l.body.versions.every((v) => v.how === 'upload'));
  const back = await call(w, 'ming', 'POST', `/api/files/${first}/restore?base=${last.body.id}`);
  assert.equal(back.status, 201);
  assert.equal((await call(w, 'gift', 'GET', `/api/files/${back.body.id}/versions`)).body.versions[0].how, 'restore');
});

// Site audit, 10 Nov 2026.
test('a folder with more than 100 sub-folders and files can be deleted and put back', async () => {
  const w = await world();
  const mk = async (parent, name) => (await call(w, 'brian', 'POST', '/api/files/folder', { body: JSON.stringify({ parent, name }), headers: { 'content-type': 'application/json' } })).body.id;
  const top = await mk('engineering', 'Shop drawings');
  const subs = []; for (let i = 0; i < 120; i++) subs.push(await mk(top, `Package ${i}`));
  for (let i = 0; i < 150; i++) assert.equal((await upload(w, 'brian', subs[i % 120], `sheet ${i}.pdf`)).status, 201);
  const gone = await call(w, 'brian', 'POST', `/api/files/folder/${top}/delete`);
  assert.equal(gone.status, 200); assert.equal(gone.body.folders, 121); assert.equal(gone.body.files, 150);
  assert.equal((await call(w, 'gift', 'GET', '/api/files')).body.files.length, 0);
  const bin = await call(w, 'brian', 'GET', '/api/files/bin');
  assert.deepEqual([bin.body.folders.length, bin.body.folders[0].files, bin.body.folders[0].folders, bin.body.files.length], [1, 150, 120, 0]);
  const back = await call(w, 'brian', 'POST', `/api/files/bin/folder/${top}/restore`);
  assert.equal(back.status, 200); assert.equal(back.body.files, 150); assert.equal(back.body.folders, 121);
  const list = await call(w, 'gift', 'GET', '/api/files');
  assert.equal(list.body.files.length, 150); assert.equal(list.body.folders.filter((f) => f.parent === top).length, 120);
});

test('an upload that fails after the file was stored leaves no stray copy in storage', async () => {
  const w = await world(), stored = () => w.env.DRAWINGS.store.size;
  const v1 = await upload(w, 'brian', 'engineering', 'plan.pdf', 'v1');
  assert.equal(stored(), 1);
  // A bad "picked file" name is refused before anything is stored.
  assert.equal((await call(w, 'brian', 'POST', `/api/files/upload?folder=engineering&name=plan.pdf&source=${encodeURIComponent('..')}`, { body: 'v2' })).status, 400);
  assert.equal(stored(), 1);
  // The database fails while the upload is being listed: the stored copy is taken away again.
  const batch = w.db.batch.bind(w.db); let broken = true;
  w.db.batch = async (list) => { if (broken) throw new Error('database is busy'); return batch(list); };
  const failed = await call(w, 'brian', 'POST', '/api/files/upload?folder=engineering&name=plan.pdf', { body: 'v2' }).catch((e) => ({ status: 500, error: e.message }));
  assert.notEqual(failed.status, 201); assert.equal(stored(), 1, 'no copy left behind');
  const failedNew = await call(w, 'brian', 'POST', '/api/files/upload?folder=engineering&name=new.pdf', { body: 'n1' }).catch((e) => ({ status: 500 }));
  assert.notEqual(failedNew.status, 201); assert.equal(stored(), 1);
  // A refused save (someone saved first) also leaves nothing behind, and the working path still works.
  broken = false;
  const v2 = await upload(w, 'brian', 'engineering', 'plan.pdf', 'v2');
  assert.equal((await call(w, 'ming', 'POST', `/api/files/upload?folder=engineering&name=plan.pdf&base=${v1.body.id}`, { body: 'stale' })).status, 409);
  assert.equal(stored(), 2); assert.equal(v2.status, 201);
  assert.equal((await w.db.prepare('SELECT count(*) AS n FROM files').first()).n, 2, 'the list and storage agree');
});

test('two plain uploads of the same name at the same moment: one current file, both kept in the history', async () => {
  const w = await world();
  // The database write takes a moment, so both uploads look before either has written.
  const batch = w.db.batch.bind(w.db); w.db.batch = async (list) => { await new Promise((r) => setTimeout(r, 20)); return batch(list); };
  const liveRows = async (name) => (await w.db.prepare('SELECT id FROM files WHERE lower(name)=lower(?) AND deleted=0').bind(name).all()).results;
  // A new name.
  const [a, b] = await Promise.all([upload(w, 'brian', 'engineering', 'RFI 12.pdf', 'from brian'), upload(w, 'ming', 'engineering', 'RFI 12.pdf', 'from ming')]);
  assert.deepEqual([a.status, b.status], [201, 201]);
  assert.equal((await liveRows('RFI 12.pdf')).length, 1, 'exactly one current file (there used to be two)');
  const hist = await call(w, 'gift', 'GET', `/api/files/${a.body.id}/versions`);
  assert.equal(hist.body.versions.length, 2, 'the other upload is the earlier version, not lost');
  // An existing file replaced by two people at once.
  const [c, d] = await Promise.all([upload(w, 'brian', 'engineering', 'RFI 12.pdf', 'brian again'), upload(w, 'ming', 'engineering', 'RFI 12.pdf', 'ming again')]);
  assert.deepEqual([c.status, d.status], [201, 201]);
  assert.equal((await liveRows('RFI 12.pdf')).length, 1);
  assert.equal((await call(w, 'gift', 'GET', `/api/files/${c.body.id}/versions`)).body.versions.length, 4, 'all four uploads are in the history, in one line');
  assert.equal(w.env.DRAWINGS.store.size, 4);
});
