// Project trackers and pinned documents (from Brian's spreadsheets, 1 Nov 2026):
//   /api/milestones       Schedule -> Milestones. Sheet "Timeline" of the Construction Change Tracking workbook.
//                         Follows the 'timeline' page level: view to see, edit to change plan / actual / remarks.
//   /api/drawing-changes  Drawings -> Drawing changes. Sheet "Design Change" (on-site design change log).
//                         Follows the 'drawings' page level: view to see, edit to add / change / remove entries.
//   /api/pins/hes         Safety -> HES plan: the newest "HES Stewardship Plan ... .xlsx" uploaded to Files,
//                         shown read-only to everyone with the Safety page (Files sharing does not apply here).
// Changes need the page's edit level, a person record, Origin = APP_ORIGIN and X-Requested-With: trackers.
// View-as is refused earlier for every non-GET (worker). Every change goes to an append-only log.
import { HttpError } from './auth.mjs';
import { readJson } from './body.mjs';
import { PINS } from './pins.mjs';

const fail = (status, message) => { throw new HttpError(status, message); };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const now = () => new Date().toISOString();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const FACTORS = ['A', 'C', 'E', 'I', 'R', 'U'];
export { PINS } from './pins.mjs';

function text(v, max, field) {
  if (v == null) return null;
  const s = String(v).normalize('NFC').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
  if (s.length > max) fail(400, `${field} is too long (${max} characters at most).`);
  return s || null;
}
function day(v, field, allowDash) {
  const s = v == null ? '' : String(v).trim();
  if (!s) return null;
  if (allowDash && s === '-') return '-';
  if (!DATE.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) fail(400, `${field}: use a date like 2026-11-10${allowDash ? ', or - for not applicable' : ''}.`);
  return s;
}
const missingTables = (e) => { if (/no such table/i.test(String(e?.message))) fail(503, 'This tracker is not set up on this site yet.'); throw e; };

const body = (request) => readJson(request, 32 * 1024);

export async function routeTrackers(request, env, actor, access) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  const isMilestones = path === '/api/milestones' || path.startsWith('/api/milestones/');
  const isChanges = path === '/api/drawing-changes' || path.startsWith('/api/drawing-changes/');
  const pin = /^\/api\/pins\/([a-z]+)(\/download(?:\/[^/]+)?)?$/.exec(path);
  if (!isMilestones && !isChanges && !pin) return null;
  const page = isMilestones ? 'timeline' : isChanges ? 'drawings' : PINS[pin[1]]?.page;
  const level = (page && access.pages?.[page]) || 'none';
  if (level === 'none') fail(404, 'Not found.');
  if (!env.TASKS_DB) fail(503, 'The project database is not connected on this site.');
  const db = env.TASKS_DB, by = access.person || null;
  const canEdit = level === 'edit' && !access.viewAs && !!by;
  if (method !== 'GET' && method !== 'HEAD') {
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'trackers') fail(403, 'Request blocked.');
    if (!canEdit) fail(403, 'View only.');
  }

  if (pin) {
    const def = PINS[pin[1]];
    // SPP: the newest upload. Partners: the newest version shared with Caltex (share date reached), including an older
    // shared version that a newer, not-yet-shared upload has replaced. Deleted files never count.
    const rows = (await db.prepare('SELECT id, folder_id, name, size, type, r2_key, uploaded_by, uploaded_at, caltex_from, deleted FROM files ORDER BY uploaded_at DESC').all().catch(missingTables)).results.filter((f) => def.match(f.name));
    const replaced = new Set((await db.prepare("SELECT file_id FROM file_log WHERE action='replace'").all()).results.map((r) => r.file_id));
    const me = by ? await db.prepare('SELECT company FROM people WHERE id=? AND active=1').bind(by).first() : null;
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const file = me?.company === 'spp' ? rows.find((f) => !f.deleted)
      : rows.find((f) => (!f.deleted || replaced.has(f.id)) && f.caltex_from && f.caltex_from <= today);
    if (!pin[2]) {
      if (!file) return json({ file: null });
      const who = await db.prepare('SELECT name FROM people WHERE id=?').bind(file.uploaded_by).first();
      // Editing the cells saves a new version through Files, so it needs Files at edit (SPP people only), as uploads do.
      const canEditFile = me?.company === 'spp' && access.pages?.files === 'edit' && !access.viewAs;
      // Night audit: partners never see who uploaded a file (as in Files).
      return json({ canEdit: canEditFile, file: { name: file.name, size: file.size, at: file.uploaded_at, by: me?.company === 'spp' ? who?.name || '' : '',
        ...(canEditFile ? { id: file.id, folder: file.folder_id } : {}),
        ...(me?.company === 'spp' ? { caltexFrom: file.caltex_from || null } : {}) } });
    }
    if (!file || !env.DRAWINGS) fail(404, 'Not found.');
    const obj = await env.DRAWINGS.get(file.r2_key);
    if (!obj) fail(404, 'The file is missing from storage.');
    return new Response(method === 'HEAD' ? null : obj.body, { headers: {
      'Content-Type': file.type, 'Content-Length': String(file.size), 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'X-File-Saved-At': file.uploaded_at } });
  }

  if (isMilestones) {
    if (path === '/api/milestones' && method === 'GET') {
      const items = (await db.prepare('SELECT id, grp, name, plan, actual, remarks, sort, updated_by, updated_at FROM milestones WHERE deleted=0 ORDER BY sort, id').all().catch(missingTables)).results;
      return json({ canEdit, items });
    }
    const m = /^\/api\/milestones\/([A-Za-z0-9]{1,12})$/.exec(path);
    if (m && method === 'POST') {
      const row = await db.prepare('SELECT * FROM milestones WHERE id=? AND deleted=0').bind(m[1]).first().catch(missingTables);
      if (!row) fail(404, 'Milestone not found.');
      const b = await body(request);
      const next = {
        plan: 'plan' in b ? day(b.plan, 'Plan', true) : row.plan,
        actual: 'actual' in b ? day(b.actual, 'Actual', true) : row.actual,
        remarks: 'remarks' in b ? text(b.remarks, 400, 'Remarks') : row.remarks,
      };
      const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== row[k]).map(([k, v]) => [k, { from: row[k], to: v }]));
      if (!Object.keys(changed).length) return json({ item: row, changed: false });
      const at = now();
      await db.batch([
        db.prepare('UPDATE milestones SET plan=?, actual=?, remarks=?, updated_by=?, updated_at=? WHERE id=?').bind(next.plan, next.actual, next.remarks, by, at, row.id),
        db.prepare('INSERT INTO milestone_log(at, by_id, milestone_id, action, data_json) VALUES(?,?,?,?,?)').bind(at, by, row.id, 'update', JSON.stringify(changed)),
      ]);
      return json({ item: { ...row, ...next, updated_by: by, updated_at: at }, changed: true });
    }
    fail(404, 'Not found.');
  }

  // Drawing changes
  const fields = (b, old = {}) => {
    const item = 'item' in b ? text(b.item, 200, 'Item') : old.item;
    if (!item) fail(400, 'Write what changed (Item).');
    const factor = 'factor' in b ? (b.factor ? String(b.factor).toUpperCase() : null) : old.factor ?? null;
    if (factor && !FACTORS.includes(factor)) fail(400, `Factor must be one of ${FACTORS.join(', ')}.`);
    return {
      item, factor,
      description: 'description' in b ? text(b.description, 2000, 'Description') : old.description ?? null,
      drawing_no: 'drawing_no' in b ? text(b.drawing_no, 200, 'Drawing No.') : old.drawing_no ?? null,
      requester: 'requester' in b ? text(b.requester, 120, 'Change requester') : old.requester ?? null,
      date: 'date' in b ? day(b.date, 'Date', false) : old.date ?? null,
    };
  };
  const log = (id, action, data) => db.prepare('INSERT INTO drawing_change_log(at, by_id, change_id, action, data_json) VALUES(?,?,?,?,?)').bind(now(), by, id, action, JSON.stringify(data));
  if (path === '/api/drawing-changes' && method === 'GET') {
    const items = (await db.prepare('SELECT id, item, description, drawing_no, requester, factor, date, created_by, created_at, updated_by, updated_at FROM drawing_changes WHERE deleted=0 ORDER BY id').all().catch(missingTables)).results;
    const names = Object.fromEntries((await db.prepare('SELECT id, name FROM people').all()).results.map((p) => [p.id, p.name]));
    return json({ canEdit, factors: FACTORS, items: items.map((r, i) => ({ ...r, no: i + 1, created_by: names[r.created_by] || r.created_by, updated_by: names[r.updated_by] || r.updated_by })) });
  }
  if (path === '/api/drawing-changes' && method === 'POST') {
    const f = fields(await body(request)), at = now();
    // Audit F10: the entry and its history line are saved together, or neither is.
    const res = await db.batch([
      db.prepare('INSERT INTO drawing_changes(item, description, drawing_no, requester, factor, date, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id')
        .bind(f.item, f.description, f.drawing_no, f.requester, f.factor, f.date, by, at, by, at),
      db.prepare('INSERT INTO drawing_change_log(at, by_id, change_id, action, data_json) VALUES(?,?,last_insert_rowid(),?,?)').bind(at, by, 'add', JSON.stringify(f)),
    ]).catch(missingTables);
    const first = Array.isArray(res[0]) ? res[0] : res[0]?.results; // D1 returns { results }, the local test stand-in an array
    return json({ id: first?.[0]?.id }, 201);
  }
  const m = /^\/api\/drawing-changes\/(\d{1,9})(\/delete)?$/.exec(path);
  if (m && method === 'POST') {
    const old = await db.prepare('SELECT * FROM drawing_changes WHERE id=? AND deleted=0').bind(Number(m[1])).first().catch(missingTables);
    if (!old) fail(404, 'Entry not found.');
    if (m[2]) {
      await db.batch([db.prepare('UPDATE drawing_changes SET deleted=1, updated_by=?, updated_at=? WHERE id=?').bind(by, now(), old.id), log(old.id, 'delete', { item: old.item })]);
      return json({ id: old.id, deleted: true });
    }
    const f = fields(await body(request), old), at = now();
    await db.batch([
      db.prepare('UPDATE drawing_changes SET item=?, description=?, drawing_no=?, requester=?, factor=?, date=?, updated_by=?, updated_at=? WHERE id=?').bind(f.item, f.description, f.drawing_no, f.requester, f.factor, f.date, by, at, old.id),
      log(old.id, 'update', f),
    ]);
    return json({ id: old.id });
  }
  fail(404, 'Not found.');
}
