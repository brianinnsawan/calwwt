// Project files: calnkt.sppwork.com/files (screens) and /api/files/* (this module).
// - Folders and files in private storage (R2 bucket bound as DRAWINGS, keys under files/), list in TASKS_DB.
// - Who sees what (Admin page level for 'files', plus):
//     calwwt (Brian, 27 Nov 2026): SPP people and Caltex see EVERY file and folder. What is on the site is meant to be
//     seen; pricing and contract papers are never put on the site (refused by name, pricingName below) but shared by
//     email and other systems. The calnkt sharing dates (caltex_from, weekly safety rule) are no longer used for seeing.
// - Upload / new folder: 'edit' level, SPP people and Caltex (Brian, 27 Nov 2026: Caltex can upload); admins always.
//   Delete: SPP people at 'edit' only (Caltex can upload, not remove). Sharing dates: not used on calwwt.
//   Deleting a folder (with everything in it): admins only; the built-in folders stay. Every change is logged.
// - "Upload new version" of a file: the picked file replaces that file under the file's own name (same as uploading a
//   file of the same name), so its history, sharing and links stay; the picked file's own name is kept in the log.
import { HttpError } from './auth.mjs';
import { readJson, readBytes } from './body.mjs';
import { isPinnedName, PINS } from './pins.mjs';
const pinOf = (name) => Object.keys(PINS).find((k) => PINS[k].match(name)) || null;

const MAX_BYTES = 95 * 1024 * 1024;
const FOLD_MS = 15 * 60 * 1000; // autosaves by one person within this time of a version's start go into that version
const fail = (status, message) => { throw new HttpError(status, message); };
// The database (Cloudflare D1) takes at most 100 values in one query. Long lists of ids go in parts of 90.
const parts = (list, n = 90) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const marksFor = (part) => part.map(() => '?').join(',');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const now = () => new Date().toISOString();
/** Today in Thailand (YYYY-MM-DD). */
export const bangkokToday = (d = new Date()) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
/** Monday of the week containing a YYYY-MM-DD date. */
export function mondayOf(day) {
  const d = new Date(`${day}T00:00:00Z`); if (Number.isNaN(+d)) return null;
  const back = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
/** For the weekly meetings folder: "NTI NKT Safety Weekly No.02 - 2026-11-04.pptx" -> share with Caltex from 2026-11-02. */
export function weeklyShareDate(name) {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(name);
  return m ? mondayOf(`${m[1]}-${m[2]}-${m[3]}`) : null;
}
const TYPES = { pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pptm: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', dwg: 'application/acad', zip: 'application/zip', mp4: 'video/mp4' };
const INLINE = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'mp4']);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const ext = (name) => (/\.([a-z0-9]{1,8})$/i.exec(name)?.[1] || '').toLowerCase();
function cleanName(v, max) {
  const s = String(v ?? '').normalize('NFC').replace(/[\x00-\x1f\x7f/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > max || s === '.' || s === '..') fail(400, 'Use a plain name.');
  return s;
}

/** Whether a person (people row: id, company) may see a file row: SPP and Caltex every file (calwwt, Brian 27 Nov 2026). */
// eslint-disable-next-line no-unused-vars
export const fileVisibleTo = (f, viewer, today = bangkokToday()) => !!viewer && !f.deleted && (viewer.company === 'spp' || viewer.company === 'caltex');
/** Pricing and contract papers never go on the site (Brian, 27 Nov 2026): BOQ, prices, quotations, contracts, invoices,
 *  costs, margins, INTERNAL files, in English or Thai. Words only, so "contractor" or "Quotient" are not caught. */
const PRICING = /(?:^|[^a-z])(?:b\.?o\.?q|pric(?:e|es|ed|ing)|quot(?:e|es|ed|ation|ations)|contracts?|invoices?|margins?|costs?|costing|internal|payments?)(?:[^a-z]|$)|ราคา|สัญญา|ต้นทุน|ใบแจ้งหนี้|ค่าใช้จ่าย/i;
export const pricingName = (name) => PRICING.test(String(name || ''));
const PRICING_REFUSED = 'Pricing and contract papers (BOQ, prices, quotations, contracts, invoices, costs) are not kept on this site: share them by email. If this file is not one of those, rename it so the name does not say so.';
/** The DWG / DXF files a person may see (Files CAD viewer list, Drawings -> CAD workspace). */
export async function visibleCadFiles(db, viewer, today = bangkokToday()) {
  const rows = (await db.prepare("SELECT id, folder_id, name, size, sha256, caltex_from, deleted FROM files WHERE deleted=0 AND (lower(name) LIKE '%.dwg' OR lower(name) LIKE '%.dxf') ORDER BY name").all()).results;
  return rows.filter((f) => fileVisibleTo(f, viewer, today));
}

const names = async (db) => Object.fromEntries((await db.prepare('SELECT id, name FROM people').all()).results.map((p) => [p.id, p.name]));
// Name for something put back next to a live item of the same name: "Plan (restored).pdf", "Plan (restored 2).pdf".
function freeName(name, taken, max) {
  const dot = name.lastIndexOf('.'), hasExt = dot > 0 && name.length - dot <= 9;
  const base = hasExt ? name.slice(0, dot) : name, extn = hasExt ? name.slice(dot) : '';
  for (let n = 1; ; n++) {
    const tag = n === 1 ? ' (restored)' : ` (restored ${n})`;
    const candidate = base.slice(0, max - tag.length - extn.length) + tag + extn;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
async function routeBin(request, db, path, liveFolders, log, namesOf) {
  const all = (await db.prepare('SELECT id, parent_id, name, deleted FROM file_folders').all()).results;
  const byId = new Map(all.map((f) => [f.id, f])), live = new Set(liveFolders.map((f) => f.id));
  const pathOf = (id) => { const out = []; for (let f = byId.get(id); f; f = byId.get(f.parent_id)) out.unshift(f.name); return out.join(' › '); };
  const folderLogs = new Map();
  for (const r of (await db.prepare("SELECT at, by_id, folder_id, data_json FROM file_log WHERE action='folder_delete' ORDER BY id").all()).results) folderLogs.set(r.folder_id, { ...r, data: JSON.parse(r.data_json || '{}') });
  // The folders that went with a deleted folder: listed in its log (from 5 Nov 2026), or else its deleted sub-folders
  // that were not deleted on their own.
  const withFolder = (id) => {
    const logged = folderLogs.get(id)?.data?.ids;
    if (Array.isArray(logged)) return logged.filter((x) => byId.get(x)?.deleted);
    const ids = [id];
    for (let i = 0; i < ids.length; i++) for (const f of all) if (f.parent_id === ids[i] && f.deleted && !folderLogs.has(f.id)) ids.push(f.id);
    return ids;
  };
  // Deleted files (not old versions), with how they were deleted.
  const files = (await db.prepare(`SELECT f.id, f.folder_id, f.name, f.size, f.deleted_by, f.deleted_at,
      (SELECT data_json FROM file_log l WHERE l.file_id = f.id AND l.action = 'delete' ORDER BY l.id DESC LIMIT 1) AS how
    FROM files f WHERE f.deleted = 1 AND NOT EXISTS (SELECT 1 FROM file_log r WHERE r.file_id = f.id AND r.action = 'replace')
    ORDER BY f.deleted_at DESC`).all()).results.map((f) => ({ ...f, via: JSON.parse(f.how || '{}').withFolder || null }));
  const fileWith = (folderId) => files.filter((f) => f.via === folderId);
  const liveNames = async (folderId, table) => new Set((await db.prepare(table === 'files'
    ? 'SELECT lower(name) AS n FROM files WHERE folder_id=? AND deleted=0' : 'SELECT lower(name) AS n FROM file_folders WHERE parent_id IS ? AND deleted=0').bind(folderId).all()).results.map((r) => r.n));
  const method = request.method;

  if (path === '/api/files/bin' && method === 'GET') {
    const who = await namesOf(db);
    const folders = [...folderLogs.values()].filter((l) => byId.get(l.folder_id)?.deleted).reverse().map((l) => {
      const f = byId.get(l.folder_id), inside = withFolder(f.id);
      return { id: f.id, name: f.name, where: pathOf(f.parent_id) || null, at: l.at, by: who[l.by_id] || l.by_id,
        files: fileWith(f.id).length, folders: inside.length - 1, parentDeleted: !!(f.parent_id && !live.has(f.parent_id)) };
    });
    const single = files.filter((f) => !(f.via && byId.get(f.via)?.deleted)).map((f) => ({ id: f.id, name: f.name, size: f.size,
      where: pathOf(f.folder_id), at: f.deleted_at, by: who[f.deleted_by] || f.deleted_by || '', folderDeleted: !live.has(f.folder_id) }));
    return json({ folders, files: single });
  }
  const mf = /^\/api\/files\/bin\/(folder|file)\/([^/]{1,80})\/restore$/.exec(path);
  if (!mf || method !== 'POST') fail(404, 'Not found.');
  const at = new Date().toISOString();
  if (mf[1] === 'folder') {
    const f = byId.get(mf[2]);
    if (!f || !f.deleted) fail(404, 'That folder is not in the recycle bin.');
    if (f.parent_id && !live.has(f.parent_id)) fail(409, `Restore the folder "${byId.get(f.parent_id)?.name}" first; this folder was inside it.`);
    const ids = withFolder(f.id), name = (await liveNames(f.parent_id, 'folders')).has(f.name.toLowerCase()) ? freeName(f.name, await liveNames(f.parent_id, 'folders'), 120) : f.name;
    const back = fileWith(f.id), stmts = [db.prepare('UPDATE file_folders SET deleted=0, name=? WHERE id=?').bind(name, f.id)];
    const others = ids.filter((x) => x !== f.id);
    for (const part of parts(others)) stmts.push(db.prepare(`UPDATE file_folders SET deleted=0 WHERE id IN (${marksFor(part)})`).bind(...part));
    // The files go back as they were (their folders come back empty of anything newer, so names cannot clash).
    for (const x of back) stmts.push(db.prepare('UPDATE files SET deleted=0, deleted_by=NULL, deleted_at=NULL WHERE id=? AND deleted=1').bind(x.id));
    stmts.push(log('folder_restore', null, f.id, { name, folders: ids.length, files: back.length }));
    await db.batch(stmts);
    return json({ id: f.id, name, restored: true, folders: ids.length, files: back.length, where: pathOf(f.parent_id) || null });
  }
  const file = files.find((x) => x.id === mf[2]) || fail(404, 'That file is not in the recycle bin.');
  if (!live.has(file.folder_id)) fail(409, `Restore the folder "${byId.get(file.folder_id)?.name}" first; this file was in it.`);
  const taken = await liveNames(file.folder_id, 'files');
  const name = taken.has(file.name.toLowerCase()) ? freeName(file.name, taken, 200) : file.name;
  await db.batch([db.prepare('UPDATE files SET deleted=0, deleted_by=NULL, deleted_at=NULL, name=? WHERE id=? AND deleted=1').bind(name, file.id), log('restore', file.id, file.folder_id, { name, was: file.name })]);
  return json({ id: file.id, name, restored: true, where: pathOf(file.folder_id) });
}

/** Folders the site itself relies on (Safety, the weekly safety meetings with their Caltex sharing rule, Engineering). */
const BUILT_IN_FOLDERS = new Set(['safety', 'safety-weekly', 'engineering', 'sites', ...['0589', '1156', '1588', '1622', '1642', '1687', '1703', '1750'].flatMap((c) => [`site-${c}`, ...['drawings', 'photos', 'lab', 'reports'].map((s) => `site-${c}-${s}`)])]);
/** File name a built-in site layout gets in Files: its English title, made safe for a file name, + .pdf. */
export const builtInName = (x) => `${String(x.en || x.file.split('/').pop()).normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 190)}.pdf`;
export async function routeFiles(request, env, actor, access, viewer) {
  const url = new URL(request.url), path = url.pathname;
  const cadList = path === '/files/cad/sheets.json';
  if (!path.startsWith('/api/files') && !cadList) return null;
  const level = access.pages?.files || 'none';
  if (level === 'none' || !viewer) fail(404, 'Not found.');
  if (!env.TASKS_DB || !env.DRAWINGS) fail(503, 'File storage is not connected on this site.');
  const db = env.TASKS_DB, spp = viewer.company === 'spp', caltex = viewer.company === 'caltex', today = bangkokToday();
  const isAdmin = !!access.admin && !access.viewAs, canEdit = (spp || caltex) && (level === 'edit' || isAdmin) && !access.viewAs;
  const canDelete = canEdit && spp;
  const visibleFile = (f) => fileVisibleTo(f, viewer, today);
  const log = (action, fileId, folderId, data = {}) => db.prepare('INSERT INTO file_log(at, by_id, action, file_id, folder_id, data_json) VALUES(?,?,?,?,?,?)').bind(now(), viewer.id, action, fileId, folderId, JSON.stringify(data));
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'files') fail(403, 'Request blocked.');
    if (!canEdit && !(isAdmin && /\/share$/.test(path))) fail(403, 'View only.');
  }
  const folders = (await db.prepare('SELECT id, parent_id, name, caltex_rule FROM file_folders WHERE deleted=0').all().catch((e) => {
    if (/no such table/i.test(String(e?.message))) fail(503, 'Project files are not set up on this site yet.');
    throw e;
  })).results;
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const STALE = 'Someone saved a newer version of this file. Reload it and make your changes again.';
  const changed = (r) => Number(r?.meta?.changes ?? r?.changes ?? 0);
  const removeStored = async (k) => { try { await env.DRAWINGS.delete?.(k); } catch { /* the list is what counts; a stray copy is harmless */ } };
  // A new version made from a known one (base: its id and saved time): all or nothing in one transaction, so two saves
  // that arrive together cannot both replace the same version (the second finds it already replaced). False = refused.
  async function replaceVersion(base, v, logData) {
    const stillBase = 'EXISTS (SELECT 1 FROM files WHERE id=? AND deleted=0 AND uploaded_at=?)', isNew = 'EXISTS (SELECT 1 FROM files WHERE id=?)';
    const logIf = (action, fileId, data) => db.prepare(`INSERT INTO file_log(at, by_id, action, file_id, folder_id, data_json) SELECT ?,?,?,?,?,? WHERE ${isNew}`).bind(v.at, viewer.id, action, fileId, v.folder, JSON.stringify(data), v.id);
    const [ins] = await db.batch([
      db.prepare(`INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${stillBase}`).bind(v.id, v.folder, v.name, v.size, v.type, v.key, v.sha, v.caltexFrom, viewer.id, v.at, base.id, base.uploaded_at),
      db.prepare(`UPDATE files SET deleted=1, deleted_by=?, deleted_at=? WHERE id=? AND deleted=0 AND ${isNew}`).bind(viewer.id, v.at, base.id, v.id),
      logIf('replace', base.id, { name: v.name, by: v.id }),
      logIf('upload', v.id, logData),
    ]);
    return changed(ins) > 0;
  }
  // The first file of this name in the folder: listed only if no file of that name is listed yet (checked and written in
  // one transaction), so two uploads of the same new name at the same moment cannot both be listed. False = one is there.
  async function firstVersion(v, logData) {
    const [ins] = await db.batch([
      db.prepare('INSERT INTO files(id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM files WHERE folder_id=? AND lower(name)=lower(?) AND deleted=0)').bind(v.id, v.folder, v.name, v.size, v.type, v.key, v.sha, v.caltexFrom, viewer.id, v.at, v.folder, v.name),
      db.prepare('INSERT INTO file_log(at, by_id, action, file_id, folder_id, data_json) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM files WHERE id=?)').bind(v.at, viewer.id, 'upload', v.id, v.folder, JSON.stringify(logData), v.id),
    ]);
    return changed(ins) > 0;
  }
  async function inChunks(ids, ask) { // one question per part of a long list of ids (see parts)
    const out = [];
    for (const part of parts(ids)) out.push(...(await ask(part, marksFor(part))).results);
    return out;
  }
  // Version history (Brian, 10 Nov 2026): the current file and every earlier version it replaced, newest first, found
  // by following the 'replace' entries of the log from any one of them. Null when the newest one is deleted.
  async function versionsOf(file) {
    const next = new Map(), prev = new Map();
    for (const r of (await db.prepare("SELECT file_id, data_json FROM file_log WHERE action='replace' AND folder_id=?").bind(file.folder_id).all()).results) {
      const by = JSON.parse(r.data_json || '{}').by;
      if (by) { next.set(r.file_id, by); prev.set(by, r.file_id); }
    }
    let head = file.id;
    for (const seen = new Set([head]); next.has(head) && !seen.has(next.get(head)); seen.add(head)) head = next.get(head);
    const ids = [head];
    for (let id = prev.get(head); id && !ids.includes(id); id = prev.get(id)) ids.push(id);
    const rows = await inChunks(ids, (part, marks) => db.prepare(`SELECT * FROM files WHERE id IN (${marks})`).bind(...part).all());
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (!byId.get(head) || byId.get(head).deleted) return null;
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  // The CAD viewer (/files/cad/) reads its drawing list from sheets.json: here, the DWG/DXF files this person may see.
  if (cadList && request.method === 'GET') {
    const rows = await visibleCadFiles(db, viewer, today);
    const groups = [];
    for (const f of rows) {
      const folder = folderById.get(f.folder_id), [th, en] = String(folder?.name || '').split(' · ');
      let g = groups.find((x) => x.id === f.folder_id);
      if (!g) groups.push(g = { id: f.folder_id, name: en || th || 'Files', name_th: th || en || 'ไฟล์', rebuild: false, sheets: [] });
      g.sheets.push({ id: f.id, sheetId: '', number: '', title: f.name, title_en: '', note: '', layout: '', bytes: f.size, rebuild: false, file: `/api/files/${f.id}/download/${encodeURIComponent(f.name)}` });
    }
    return json({ schemaVersion: 2, groups });
  }
  // List everything the viewer may see (small project: one call).
  if (path === '/api/files' && request.method === 'GET') {
    const rows = (await db.prepare('SELECT id, folder_id, name, size, type, sha256, caltex_from, uploaded_by, uploaded_at, deleted FROM files WHERE deleted=0 ORDER BY name').all()).results.filter(visibleFile);
    let shownFolders = folders;
    if (!spp && !caltex) {
      // Partners see only the folders that hold something shared with them (and those folders' parents).
      const keep = new Set();
      for (const f of rows) for (let id = f.folder_id; id && !keep.has(id); id = folderById.get(id)?.parent_id) keep.add(id);
      shownFolders = folders.filter((f) => keep.has(f.id));
    }
    const names = Object.fromEntries((await db.prepare('SELECT id, name FROM people').all()).results.map((p) => [p.id, p.name]));
    return json({
      team: spp, canEdit, canDelete, canShare: false, canDeleteFolders: isAdmin && spp, builtInFolders: spp ? [...BUILT_IN_FOLDERS] : [], today,
      folders: shownFolders.map((f) => ({ id: f.id, parent: f.parent_id, name: f.name, ...(spp ? { weekly: f.caltex_rule === 'weekly' } : {}) })),
      files: rows.map((f) => ({ id: f.id, folder: f.folder_id, name: f.name, size: f.size, type: f.type, sha256: f.sha256, at: f.uploaded_at, by: spp ? names[f.uploaded_by] || f.uploaded_by : '' })),
    });
  }
  if (path === '/api/files/folder' && request.method === 'POST') {
    const body = await readJson(request, 8 * 1024);
    const parent = body.parent ? String(body.parent) : null;
    if (parent && !folderById.has(parent)) fail(404, 'Folder not found.');
    const name = cleanName(body.name, 120);
    if (pricingName(name)) fail(422, PRICING_REFUSED);
    if (folders.some((f) => f.parent_id === parent && f.name.toLowerCase() === name.toLowerCase())) fail(409, 'A folder with that name is already here.');
    const id = crypto.randomUUID();
    await db.batch([db.prepare('INSERT INTO file_folders(id, parent_id, name, caltex_rule, created_by, created_at) VALUES(?,?,?,?,?,?)').bind(id, parent, name, '', viewer.id, now()), log('folder', null, id, { name })]);
    return json({ id }, 201);
  }
  // Delete a folder and everything in it (admins). Hidden like a deleted file: kept in storage and in the log.
  const del = /^\/api\/files\/folder\/([^/]{1,80})\/delete$/.exec(path);
  if (del && request.method === 'POST') {
    if (!isAdmin || !spp) fail(403, 'Only admins can delete folders.');
    const folder = folderById.get(del[1]) || fail(404, 'Folder not found.');
    if (BUILT_IN_FOLDERS.has(folder.id)) fail(409, 'This folder is built into the site and cannot be deleted. Its files can be.');
    const ids = [folder.id];
    for (let i = 0; i < ids.length; i++) for (const f of folders) if (f.parent_id === ids[i]) ids.push(f.id);
    const inside = await inChunks(ids, (part, marks) => db.prepare(`SELECT id, folder_id, name FROM files WHERE deleted=0 AND folder_id IN (${marks})`).bind(...part).all());
    const at = now();
    await db.batch([
      ...inside.flatMap((f) => [db.prepare('UPDATE files SET deleted=1, deleted_by=?, deleted_at=? WHERE id=? AND deleted=0').bind(viewer.id, at, f.id), log('delete', f.id, f.folder_id, { name: f.name, withFolder: folder.id })]),
      ...parts(ids).map((part) => db.prepare(`UPDATE file_folders SET deleted=1 WHERE id IN (${marksFor(part)})`).bind(...part)),
      log('folder_delete', null, folder.id, { name: folder.name, folders: ids.length, files: inside.length, ids }),
    ]);
    return json({ id: folder.id, deleted: true, folders: ids.length, files: inside.length });
  }
  // Recycle bin (Brian, 5 Nov 2026): admins see what was deleted (folders with their contents, and single files) and put
  // it back. Old versions replaced by a newer upload are not "deleted" and are not in the bin.
  if (path === '/api/files/bin' || path.startsWith('/api/files/bin/')) {
    if (!isAdmin || !spp) fail(404, 'Not found.');
    return routeBin(request, db, path, folders, log, names);
  }
  // The wastewater layouts that were built into the site pages (public/sites/layouts, listed in sites.json) moved into each
  // site's Files folder "Drawings" (Brian, 27 Nov 2026), so the site page, Files and the CAD workspace show one set and
  // people can add drawings themselves. Admins press "Move into Files" on a site page; one site per call; files already
  // there (same name) are left alone, so it can run again. GET says how many are still to move.
  const importSite = /^\/api\/files\/import-site-layouts\/(\d{4})$/.exec(path);
  if (importSite) {
    if (!isAdmin) fail(403, 'Only admins can move the built-in drawings.');
    const code = importSite[1], folder = folderById.get(`site-${code}-drawings`) || fail(404, 'The site has no Drawings folder yet.');
    const sites = await (await env.ASSETS.fetch(new Request(new URL('/sites/data/sites.json', request.url)))).json();
    const site = sites.sites.find((x) => x.code === code) || fail(404, 'Site not found.');
    const have = new Set((await db.prepare('SELECT lower(name) AS n FROM files WHERE folder_id=? AND deleted=0').bind(folder.id).all()).results.map((r) => r.n));
    const todo = (site.layouts || []).map((x) => ({ x, name: builtInName(x) })).filter((t) => !have.has(t.name.toLowerCase()) && !pricingName(t.name));
    if (request.method === 'GET') return json({ code, pending: todo.map((t) => t.name) });
    if (request.method !== 'POST') fail(405, 'Method not allowed.');
    const moved = [];
    for (const { x, name } of todo) {
      const r = await env.ASSETS.fetch(new Request(new URL(`/sites/layouts/${x.file}.pdf`, request.url)));
      if (!r.ok) continue;
      const bytes = new Uint8Array(await r.arrayBuffer());
      const id = crypto.randomUUID(), key = `files/${id}`, sha = hex(await crypto.subtle.digest('SHA-256', bytes)), at = now();
      await env.DRAWINGS.put(key, bytes, { httpMetadata: { contentType: TYPES.pdf }, customMetadata: { name } });
      const v = { id, folder: folder.id, name, size: bytes.length, type: TYPES.pdf, key, sha, caltexFrom: null, at };
      if (await firstVersion(v, { name, size: bytes.length, caltexFrom: null, source: `built-in layout ${x.file}.pdf${x.source ? ` (${x.source})` : ''}` })) moved.push(name);
      else await removeStored(key);
    }
    return json({ code, moved, left: todo.length - moved.length }, 201);
  }
  if (path === '/api/files/upload' && request.method === 'POST') {
    const folder = folderById.get(url.searchParams.get('folder') || '') || fail(404, 'Folder not found.');
    const name = cleanName(url.searchParams.get('name'), 200);
    if (pricingName(name)) fail(422, PRICING_REFUSED);
    // Checked before the file is stored (site audit, 10 Nov 2026: a bad value used to fail after storing, leaving a copy behind).
    const source = url.searchParams.get('source') ? cleanName(url.searchParams.get('source'), 200) : null;
    // Audit F09: an editor saving a file says which version it started from; if someone saved a newer one since, refuse
    // (409) instead of silently replacing their changes.
    // baseAt (the version's saved time, from the download header) also catches an autosave that updated that version in place.
    const base = url.searchParams.get('base'), baseAt = url.searchParams.get('baseAt') || null;
    let current = null;
    if (base) {
      current = await db.prepare('SELECT id, uploaded_by, uploaded_at, caltex_from FROM files WHERE folder_id=? AND lower(name)=lower(?) AND deleted=0').bind(folder.id, name).first();
      if (!current || current.id !== base || (baseAt && current.uploaded_at !== baseAt)) fail(409, STALE);
    }
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BYTES) fail(413, 'File is too large (95 MB at most).');
    // Autosave (cells edited in the browser, Brian 10 Nov 2026): one person's run of edits goes into one version instead of
    // a new version every few seconds. A save folds into the version it starts from only when that version was itself an
    // autosave by the same person, began less than 15 minutes ago, and is not a shared copy of a pinned document (each shared
    // HES version stays exactly as it was shared, audit F03). Anything else starts a new version as before.
    const autosave = !!base && url.searchParams.get('autosave') === '1';
    let fold = false;
    if (autosave && current.uploaded_by === viewer.id && !(isPinnedName(name) && current.caltex_from)) {
      const began = await db.prepare("SELECT at, data_json FROM file_log WHERE file_id=? AND action='upload' ORDER BY id LIMIT 1").bind(current.id).first();
      fold = !!began && JSON.parse(began.data_json || '{}').autosave === true && Date.now() - Date.parse(began.at) < FOLD_MS;
    }
    const id = fold ? current.id : crypto.randomUUID(), e = ext(name), type = TYPES[e] || 'application/octet-stream', key = `files/${fold ? crypto.randomUUID() : id}`;
    const meta = { httpMetadata: { contentType: type }, customMetadata: { name } };
    let size, sha;
    if (globalThis.FixedLengthStream && crypto.DigestStream && length > 0 && request.body) {
      // Cloudflare: stream straight into storage (large decks never sit in memory) while hashing.
      const [toStore, toHash] = request.body.tee(), fixed = new FixedLengthStream(length), digest = new crypto.DigestStream('SHA-256');
      const piped = toStore.pipeTo(fixed.writable), hashed = toHash.pipeTo(digest);
      await Promise.all([env.DRAWINGS.put(key, fixed.readable, meta), piped, hashed]);
      size = length; sha = hex(await digest.digest);
    } else {
      const bytes = await readBytes(request, MAX_BYTES); // stops reading as soon as the limit is passed (audit F07)
      if (bytes.length > MAX_BYTES) fail(413, 'File is too large (95 MB at most).');
      size = bytes.length; sha = hex(await crypto.subtle.digest('SHA-256', bytes));
      if (size) await env.DRAWINGS.put(key, bytes, meta);
    }
    if (!size) fail(400, 'The file is empty.');
    const at = now();
    // From here the file is in storage. If anything below fails or refuses the upload, the stored copy is removed again,
    // so storage never holds a copy that the list does not know (site audit, 10 Nov 2026).
    const record = async () => {
      if (fold) {
        // Update the version in place, only if nobody saved (or shared it) since this person's copy was read.
        const old = await db.prepare('SELECT r2_key FROM files WHERE id=?').bind(id).first();
        const [upd] = await db.batch([
          db.prepare('UPDATE files SET r2_key=?, size=?, sha256=?, uploaded_at=? WHERE id=? AND deleted=0 AND uploaded_at=? AND caltex_from IS ?').bind(key, size, sha, at, id, current.uploaded_at, current.caltex_from),
          db.prepare("INSERT INTO file_log(at, by_id, action, file_id, folder_id, data_json) SELECT ?,?,'autosave',?,?,? WHERE EXISTS (SELECT 1 FROM files WHERE id=? AND r2_key=?)").bind(at, viewer.id, id, folder.id, JSON.stringify({ name, size }), id, key),
        ]);
        if (!changed(upd)) fail(409, STALE);
        // The in-between copy is replaced by design (one version per run of edits); the weekly backup may already hold it.
        if (old?.r2_key && old.r2_key !== key) await removeStored(old.r2_key);
        return json({ id, at, caltexFrom: current.caltex_from, replaced: null, folded: true }, 201);
      }
      // Same name in the same folder = a new version: the old one is hidden (kept in storage and the log),
      // and keeps its Caltex sharing date unless the weekly-folder rule sets one.
      for (let attempt = 0; ; attempt++) {
        const prev = await db.prepare('SELECT id, uploaded_at, caltex_from FROM files WHERE folder_id=? AND lower(name)=lower(?) AND deleted=0').bind(folder.id, name).first();
        // A pinned document (HES plan) never inherits sharing: each version is shared on purpose (audit F03).
        const caltexFrom = folder.caltex_rule === 'weekly' ? weeklyShareDate(name) || prev?.caltex_from || null : isPinnedName(name) ? null : prev?.caltex_from || null;
        const logData = { name, size, caltexFrom, ...(autosave ? { autosave: true } : {}), ...(source ? { source } : {}) };
        const v = { id, folder: folder.id, name, size, type, key, sha, caltexFrom, at };
        if (base) {
          // Saved from a known version: refused if that version is no longer the newest.
          if (!prev || prev.id !== base || !(await replaceVersion(current, v, logData))) fail(409, STALE);
          return json({ id, at, caltexFrom, replaced: base }, 201);
        }
        // A plain upload replaces whatever is newest. Checked and written in one transaction; if someone else's upload
        // of the same name got in between, look again and replace theirs (their file stays in the history).
        if (prev ? await replaceVersion(prev, v, logData) : await firstVersion(v, logData)) return json({ id, at, caltexFrom, replaced: prev?.id || null }, 201);
        if (attempt >= 3) fail(409, 'Someone else uploaded a file with this name at the same moment. Please try again.');
      }
    };
    try { return await record(); } catch (e) { await removeStored(key); throw e; }
  }
  // /api/files/<id>/download may end with /<file name>: viewers such as the CAD viewer pick their reader from it.
  const m = /^\/api\/files\/([0-9a-f-]{36})(?:\/(download|share|delete|latest|versions|restore))?(\/[^/]+)?$/.exec(path);
  if (!m || (m[3] && m[2] !== 'download')) fail(404, 'Not found.');
  const file = await db.prepare('SELECT * FROM files WHERE id=?').bind(m[1]).first();
  // The newest version of the file this one is (or was) a version of: an open file page asks every few seconds, so
  // changes someone else saves appear without reloading. Only answers with a version this person may see.
  if (m[2] === 'latest' && request.method === 'GET') {
    const cur = file && await db.prepare('SELECT id, folder_id, name, size, caltex_from, uploaded_by, uploaded_at, deleted FROM files WHERE folder_id=? AND lower(name)=lower(?) AND deleted=0').bind(file.folder_id, file.name).first();
    if (!cur || !visibleFile(cur)) fail(404, 'Not found.');
    const by = spp ? (await db.prepare('SELECT name FROM people WHERE id=?').bind(cur.uploaded_by).first())?.name || cur.uploaded_by : '';
    return json({ id: cur.id, at: cur.uploaded_at, size: cur.size, by, mine: cur.uploaded_by === viewer.id });
  }
  // Round 2: an admin can still stop sharing an older (replaced) version of a pinned document such as the HES plan.
  const unshareOld = m[2] === 'share' && request.method === 'POST' && file?.deleted && isAdmin && spp && pinOf(file.name);
  // Version history: SPP people only (an earlier version may never have been shared with a partner). They may list the
  // versions, download an earlier one, and (with upload rights, checked above for every change) bring one back.
  const historyAsk = (m[2] === 'versions' && request.method === 'GET') || (m[2] === 'restore' && request.method === 'POST') || (m[2] === 'download' && ['GET', 'HEAD'].includes(request.method) && !!file?.deleted);
  const versions = file && spp && historyAsk ? await versionsOf(file) : null;
  if (['versions', 'restore'].includes(m[2]) && !versions) fail(404, 'Not found.');
  if (!file || (!visibleFile(file) && !unshareOld && !versions)) fail(404, 'Not found.');
  if (m[2] === 'versions') {
    const who = await names(db), ids = versions.map((v) => v.id);
    const how = new Map();
    // Each version's first 'upload' entry (the lowest log id): how that version came to be.
    const firsts = (await inChunks(ids, (part, marks) => db.prepare(`SELECT id, file_id, data_json FROM file_log WHERE action='upload' AND file_id IN (${marks})`).bind(...part).all())).sort((a, b) => a.id - b.id);
    for (const r of firsts) {
      if (how.has(r.file_id)) continue;
      const d = JSON.parse(r.data_json || '{}');
      how.set(r.file_id, d.restoredFrom ? { how: 'restore', from: d.restoredAt || null } : d.autosave ? { how: 'edit' } : { how: 'upload', ...(d.source ? { source: d.source } : {}) });
    }
    return json({ current: versions[0].id, at: versions[0].uploaded_at, name: versions[0].name, canRestore: canEdit,
      versions: versions.map((v, i) => ({ id: v.id, at: v.uploaded_at, by: who[v.uploaded_by] || v.uploaded_by, size: v.size, current: i === 0, caltexFrom: v.caltex_from || null, ...(how.get(v.id) || { how: 'upload' }) })) });
  }
  if (m[2] === 'restore') {
    // Bring an earlier version back: its content becomes a new, newest version (nothing is removed; the version it
    // replaces stays in the history). Sharing follows the same rule as any new version.
    const head = versions[0], folder = folderById.get(head.folder_id) || fail(404, 'Folder not found.');
    if (file.id === head.id) fail(400, 'This is already the current version.');
    const base = url.searchParams.get('base'), baseAt = url.searchParams.get('baseAt') || null;
    if (base && (head.id !== base || (baseAt && head.uploaded_at !== baseAt))) fail(409, STALE);
    const obj = await env.DRAWINGS.get(file.r2_key);
    if (!obj) fail(404, 'The file is missing from storage.');
    const id = crypto.randomUUID(), key = `files/${id}`, at = now(), name = head.name;
    await env.DRAWINGS.put(key, obj.body, { httpMetadata: { contentType: file.type }, customMetadata: { name } });
    const caltexFrom = folder.caltex_rule === 'weekly' ? weeklyShareDate(name) || head.caltex_from || null : isPinnedName(name) ? null : head.caltex_from || null;
    const ok = await replaceVersion(head, { id, folder: folder.id, name, size: file.size, type: file.type, key, sha: file.sha256, caltexFrom, at }, { name, size: file.size, caltexFrom, restoredFrom: file.id, restoredAt: file.uploaded_at });
    if (!ok) { await removeStored(key); fail(409, STALE); }
    return json({ id, at, caltexFrom, replaced: head.id, restoredFrom: file.id }, 201);
  }
  if (m[2] === 'download' && ['GET', 'HEAD'].includes(request.method)) {
    const obj = await env.DRAWINGS.get(file.r2_key);
    if (!obj) fail(404, 'The file is missing from storage.');
    const inline = url.searchParams.get('inline') === '1' && INLINE.has(ext(file.name));
    return new Response(request.method === 'HEAD' ? null : obj.body, { headers: {
      'Content-Type': file.type, 'Content-Length': String(file.size), 'Cache-Control': 'private, no-store',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-SHA256': file.sha256, 'X-File-Saved-At': file.uploaded_at } });
  }
  if (m[2] === 'share' && request.method === 'POST') {
    if (!isAdmin || !spp) fail(403, 'Only admins can share files.');
    const body = await readJson(request, 8 * 1024);
    const from = body.caltexFrom == null || body.caltexFrom === '' ? null : String(body.caltexFrom);
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) fail(400, 'Use a date like 2026-11-02.');
    if (from && file.deleted) fail(400, 'An older version can only be unshared.');
    // Night audit (2 Nov 2026): stopping the sharing of a pinned document (the HES plan) also stops every older version, so
    // Caltex cannot keep reading an earlier shared copy after it has been replaced.
    const stmts = [db.prepare('UPDATE files SET caltex_from=? WHERE id=?').bind(from, file.id), log('share', file.id, file.folder_id, { caltexFrom: from })];
    let older = 0;
    if (!from && isPinnedName(file.name)) {
      const rows = (await db.prepare('SELECT id, name FROM files WHERE id<>? AND caltex_from IS NOT NULL AND uploaded_at<=?').bind(file.id, file.uploaded_at).all()).results.filter((f) => pinOf(f.name) === pinOf(file.name));
      for (const f of rows) stmts.push(db.prepare('UPDATE files SET caltex_from=NULL WHERE id=?').bind(f.id), log('share', f.id, file.folder_id, { caltexFrom: null, with: file.id }));
      older = rows.length;
    }
    await db.batch(stmts);
    return json({ id: file.id, caltexFrom: from, ...(older ? { olderVersionsUnshared: older } : {}) });
  }
  if (m[2] === 'delete' && request.method === 'POST') {
    if (!canDelete) fail(403, 'Only SPP can remove files.');
    // Kept in storage and in the log; only hidden from the list.
    await db.batch([db.prepare('UPDATE files SET deleted=1, deleted_by=?, deleted_at=? WHERE id=?').bind(viewer.id, now(), file.id), log('delete', file.id, file.folder_id, { name: file.name })]);
    return json({ id: file.id, deleted: true });
  }
  fail(405, 'Method not allowed.');
}
