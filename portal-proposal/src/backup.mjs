// Backups (audit F11; Brian, 2 Nov 2026: "Yes, both").
//
// 1. Weekly automatic copy (Cloudflare cron, see production/wrangler.jsonc "triggers") into a separate private R2 bucket,
//    bound as BACKUPS (bucket calwwt-backups, with a 90-day bucket lock so copies cannot be deleted or replaced):
//      d1/<stamp>/<db>.json   every table of each database. The rows of sign-in sessions, rate-limit counters and
//                             setup codes are left out (tables kept empty): short-lived, must not come back on a restore.
//      objects/<key>@<etag>   every object of the file storage (DRAWINGS). Only new or changed objects are copied,
//                             so each version is stored once; a changed object gets a new name (locked copies stay).
//      runs/<time>-<id>.json  what each run (or piece of Back up now) did (shown on Admin -> Backups).
// 2. Admin -> Backups -> "Download backup": a zip of the data plus the current version of every file in Files, to save on
//    SharePoint each month. It never holds password hashes or 2-step sign-in secrets. Admins only, 2-step + recent password (admin-gate.mjs).
// 3. The same cron removes sign-in records older than 90 days (Brian: keep sign-ins 90 days) and expired sessions.
//    Account events (created, codes, password changes, on/off) are kept for the whole project.
// Restoring: docs/RESTORE.md and tools/backup/restore-d1.mjs.
import { HttpError } from './auth.mjs';
import { readJson } from './body.mjs';
import { zipStream } from './zip.mjs';
import { requireAdminGate } from './admin-gate.mjs';

export const DATABASES = [['tasks', 'TASKS_DB'], ['identity', 'AUTH_DB'], ['portal', 'DB'], ['scurve', 'SCURVE_DB']];
const SKIP_TABLES = {
  identity: new Set(['auth_sessions', 'auth_limits', 'auth_tickets', 'auth_redemptions']),
  // The S-curve database is shared with S-Curve Studio: its sign-in sessions, sign-in states and invitations are never copied.
  scurve: new Set(['auth_sessions', 'oauth_states', 'invitations']),
};
// Never in the downloaded zip (it leaves Cloudflare): password hashes and 2-step sign-in set-ups (left out whole, so a
// restore from the zip works and everyone sets 2-step up again). Night audit 2 Nov 2026: the S-curve database is shared
// with S-Curve Studio's other projects and users, so it is not in the zip at all (it is in the weekly locked copy).
const REDACT_FOR_DOWNLOAD = { identity: { auth_accounts: ['password_hash'] } };
const SKIP_FOR_DOWNLOAD = { identity: new Set(['auth_totp']) };
const DOWNLOAD_DATABASES = DATABASES.filter(([name]) => name !== 'scurve');
export const SIGN_IN_KEEP_DAYS = 90;
const PAGE = 500;
// Back up now copies in short pieces (the Admin page calls again until nothing is left); the weekly job has 15 minutes.
export const MANUAL = { budgetMs: 20000, maxCopies: 300 }, WEEKLY = { budgetMs: 12 * 60 * 1000, maxCopies: 5000 };

const fail = (status, message) => { throw new HttpError(status, message); };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;
const plain = (v) => (v instanceof ArrayBuffer ? { $bytes: [...new Uint8Array(v)] } : ArrayBuffer.isView(v) ? { $bytes: [...new Uint8Array(v.buffer, v.byteOffset, v.byteLength)] } : v);
export const stampOf = (d = new Date()) => d.toISOString().slice(0, 19).replace(/:/g, '');

/** Every table of one database: { format, database, at, schema: [{type,name,table,sql}], tables: {name: {columns, rows}} }. */
export async function exportDatabase(db, name, { redact = {}, skipMore = new Set() } = {}) {
  const schema = (await db.prepare("SELECT type, name, tbl_name AS tbl, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END, rowid").all()).results;
  const skip = new Set([...(SKIP_TABLES[name] || []), ...skipMore]), tables = {};
  for (const t of schema.filter((s) => s.type === 'table')) {
    const columns = (await db.prepare(`PRAGMA table_info(${quote(t.name)})`).all()).results.map((c) => c.name);
    if (skip.has(t.name)) { tables[t.name] = { columns, rows: [], left_out: true }; continue; }
    const hide = new Set(redact[t.name] || []), rows = [];
    for (let offset = 0; ; offset += PAGE) {
      let page;
      try { page = (await db.prepare(`SELECT * FROM ${quote(t.name)} ORDER BY rowid LIMIT ? OFFSET ?`).bind(PAGE, offset).all()).results; }
      catch { page = (await db.prepare(`SELECT * FROM ${quote(t.name)} LIMIT ? OFFSET ?`).bind(PAGE, offset).all()).results; }
      for (const r of page) rows.push(columns.map((c) => (hide.has(c) ? null : plain(r[c] ?? null))));
      if (page.length < PAGE) break;
    }
    tables[t.name] = { columns, rows, ...(hide.size ? { removed: [...hide] } : {}) };
  }
  return { format: 'calnkt-d1-backup/1', database: name, at: new Date().toISOString(), schema: schema.map((s) => ({ type: s.type, name: s.name, table: s.tbl, sql: s.sql })), tables };
}

async function listAll(bucket, options) {
  const out = []; let cursor;
  do { const r = await bucket.list({ ...options, limit: 1000, ...(cursor ? { cursor } : {}) }); out.push(...r.objects); cursor = r.truncated ? r.cursor : null; } while (cursor);
  return out;
}
export const backupKeyFor = (key, etag) => `objects/${key}@${String(etag).replace(/"/g, '')}`;

async function copyObject(env, key, target) {
  const obj = await env.DRAWINGS.get(key);
  if (!obj) return 0;
  const meta = { httpMetadata: obj.httpMetadata, customMetadata: { ...(obj.customMetadata || {}), backupOf: key, backupEtag: obj.etag } };
  if (typeof FixedLengthStream === 'function' && obj.body) {
    const fixed = new FixedLengthStream(obj.size);
    await Promise.all([obj.body.pipeTo(fixed.writable), env.BACKUPS.put(target, fixed.readable, meta)]);
  } else {
    await env.BACKUPS.put(target, obj.body ? new Uint8Array(await new Response(obj.body).arrayBuffer()) : new Uint8Array(), meta);
  }
  return obj.size;
}

/**
 * One backup run. Safe to repeat: data is written under a new time stamp, files only when new or changed.
 * data=false skips the databases (the Admin page's follow-up pieces). Copying stops at the time budget; report.files.waiting
 * says how many files are left for the next piece or run.
 */
export async function runBackup(env, { now = new Date(), by = 'schedule', data = true, budgetMs = WEEKLY.budgetMs, maxCopies = WEEKLY.maxCopies, concurrency = 4 } = {}) {
  if (!env.BACKUPS) throw new Error('The backup storage (BACKUPS) is not connected.');
  const stamp = stampOf(now), report = { at: now.toISOString(), by, part: !data, databases: {}, files: {}, errors: [] };
  if (data) for (const [name, binding] of DATABASES) {
    if (!env[binding]) continue;
    try {
      const dump = await exportDatabase(env[binding], name);
      const body = JSON.stringify(dump);
      await env.BACKUPS.put(`d1/${stamp}/${name}.json`, body, { httpMetadata: { contentType: 'application/json' } });
      report.databases[name] = { tables: Object.keys(dump.tables).length, rows: Object.values(dump.tables).reduce((n, t) => n + t.rows.length, 0), bytes: body.length };
    } catch (e) { report.errors.push(`${name}: ${e.message}`); }
  }
  if (env.DRAWINGS) {
    // The time budget is for copying files only; saving the data above does not use it up.
    const started = Date.now();
    try {
      const source = (await listAll(env.DRAWINGS, {})).filter((o) => o.size > 0);
      const have = new Set((await listAll(env.BACKUPS, { prefix: 'objects/' })).map((o) => o.key));
      const missing = source.filter((o) => !have.has(backupKeyFor(o.key, o.etag)));
      let copied = 0, bytes = 0, next = 0;
      const worker = async () => {
        while (next < missing.length && next < maxCopies && Date.now() - started < budgetMs) {
          const o = missing[next++];
          try { bytes += await copyObject(env, o.key, backupKeyFor(o.key, o.etag)); copied++; }
          catch (e) { report.errors.push(`${o.key}: ${e.message}`); }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, worker));
      report.files = { total: source.length, copied, bytes, waiting: missing.length - copied };
    } catch (e) { report.errors.push(`files: ${e.message}`); }
  }
  report.errors = report.errors.slice(0, 20);
  // A unique name per run or piece: locked copies are never overwritten.
  await env.BACKUPS.put(`runs/${now.toISOString().replace(/:/g, '')}-${crypto.randomUUID().slice(0, 8)}.json`, JSON.stringify(report), { httpMetadata: { contentType: 'application/json' } }).catch(() => {});
  return report;
}

/** Keep sign-ins 90 days (Brian, 2 Nov 2026). Only sign-in and wrong-password rows; account events stay. */
export async function cleanSignIns(env, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!env.AUTH_DB) return { removed: 0 };
  const cutoff = nowSeconds - SIGN_IN_KEEP_DAYS * 86400;
  const r = await env.AUTH_DB.prepare("DELETE FROM auth_audit WHERE (event LIKE 'login:%' OR event LIKE 'login\\_failed:%' ESCAPE '\\') AND at < ?").bind(cutoff).run();
  await env.AUTH_DB.prepare('DELETE FROM auth_sessions WHERE expires_at < ? OR idle_expires_at < ?').bind(nowSeconds, nowSeconds).run();
  return { removed: r.meta?.changes ?? 0 };
}

/** The cron entry (worker.mjs `scheduled`). */
export async function scheduledJob(env, now = new Date()) {
  const out = {};
  try { out.signIns = await cleanSignIns(env, Math.floor(now.getTime() / 1000)); } catch (e) { out.signInsError = e.message; }
  try { out.backup = await runBackup(env, { now, ...WEEKLY }); } catch (e) { out.backupError = e.message; }
  console.log(JSON.stringify({ job: 'weekly-backup', ...out, backup: out.backup && { databases: out.backup.databases, files: out.backup.files, errors: out.backup.errors.length } }));
  return out;
}

async function latestRuns(env, n = 30) {
  const runs = (await listAll(env.BACKUPS, { prefix: 'runs/' })).map((o) => o.key).sort().slice(-n).reverse();
  const out = [];
  for (const key of runs) { const o = await env.BACKUPS.get(key); if (o) { try { out.push(JSON.parse(await new Response(o.body).text())); } catch { /* skip */ } } }
  return out;
}

const safePart = (s) => String(s).normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '_').replace(/^\.+/, '_').trim().slice(0, 120) || '_';
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function* downloadEntries(env, { withFiles, by, now }) {
  const day = now.toISOString().slice(0, 10);
  yield { name: 'README.txt', data: README(day, by, withFiles) };
  for (const [name, binding] of DOWNLOAD_DATABASES) {
    if (!env[binding]) continue;
    const dump = await exportDatabase(env[binding], name, { redact: REDACT_FOR_DOWNLOAD[name] || {}, skipMore: SKIP_FOR_DOWNLOAD[name] });
    yield { name: `data/${name}.json`, data: JSON.stringify(dump) };
  }
  if (!withFiles || !env.TASKS_DB || !env.DRAWINGS) return;
  const folders = new Map((await env.TASKS_DB.prepare('SELECT id, parent_id, name FROM file_folders').all()).results.map((f) => [f.id, f]));
  const pathOf = (id, seen = new Set()) => { const f = folders.get(id); if (!f || seen.has(id)) return []; seen.add(id); return [...pathOf(f.parent_id, seen), safePart(f.name)]; };
  const files = (await env.TASKS_DB.prepare('SELECT id, folder_id, name, size, type, r2_key, sha256, caltex_from, uploaded_by, uploaded_at FROM files WHERE deleted=0 ORDER BY folder_id, name').all()).results;
  const rows = [['path', 'file id', 'size', 'sha256', 'uploaded by', 'uploaded at', 'shared with Caltex from'].join(',')];
  const used = new Set();
  for (const f of files) {
    let path = ['files', ...pathOf(f.folder_id), safePart(f.name)].join('/');
    if (used.has(path.toLowerCase())) path = path.replace(/(\.[^./]*)?$/, (ext) => ` (${f.id.slice(0, 8)})${ext || ''}`);
    used.add(path.toLowerCase());
    rows.push([path, f.id, f.size, f.sha256, f.uploaded_by, f.uploaded_at, f.caltex_from || ''].map(csvCell).join(','));
    yield { name: path, date: new Date(f.uploaded_at), data: async () => (await env.DRAWINGS.get(f.r2_key))?.body || new Uint8Array() };
  }
  yield { name: 'files/index.csv', data: '﻿' + rows.join('\r\n') + '\r\n' };
}
const README = (day, by, withFiles) => `Caltex 2027 wastewater project site (calwwt.sppwork.com) - backup downloaded ${day} by ${by}

data/*.json   every table of the site's databases (tasks, identity, portal), as of the download.
              The schedule (S-curve) database is shared with S-Curve Studio and is only in the weekly locked copy.
              Logins are included WITHOUT passwords and 2-step set-ups: after restoring from this zip,
              everyone sets a new password with a setup code (and admins set up 2-step again).
${withFiles ? `files/        the current version of every file in the Files tab, in its folders.
files/index.csv  the list of files with their checksums, uploader and Caltex sharing date.
` : 'Files were not included in this download.\n'}
How to restore: see docs/RESTORE.md in the project's GitHub repository (brianinnsawan/calwwt).
The weekly automatic backup in Cloudflare (bucket calwwt-backups) also keeps older file versions.
Keep this zip private: it contains project data, names and sign-in history.
`;

/** /api/backup/* on the Admin page. Admins only; never while viewing the site as someone else. */
export async function routeBackup(request, env, actor, access) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/backup/')) return null;
  if (!access?.admin || !access.person) fail(404, 'Not found.');
  if (access.viewAs) fail(403, 'View only: you are viewing the site as someone else.');
  if (path === '/api/backup/status' && request.method === 'GET') {
    if (!env.BACKUPS) return json({ connected: false, runs: [], keepDays: SIGN_IN_KEEP_DAYS });
    return json({ connected: true, runs: await latestRuns(env), keepDays: SIGN_IN_KEEP_DAYS });
  }
  if (request.method !== 'POST') fail(405, 'Method not allowed.');
  if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'tasks') fail(403, 'Request blocked.');
  requireAdminGate(env, actor);
  const body = await readJson(request, 1024);
  const by = access.person, now = new Date();
  const log = (kind, data) => env.TASKS_DB?.prepare("INSERT INTO events(task_id,request_id,at,by_id,kind,data_json) VALUES(NULL,NULL,?,?,?,?)").bind(now.toISOString(), by, kind, JSON.stringify(data)).run();
  if (path === '/api/backup/run') {
    if (!env.BACKUPS) fail(503, 'The backup storage is not connected yet.');
    const more = body.continue === true;
    if (!more) {
      const last = (await latestRuns(env, 1))[0];
      if (last && !last.part && now - new Date(last.at) < 2 * 60 * 1000) fail(429, 'A backup started less than 2 minutes ago. Try again later.');
    }
    const report = await runBackup(env, { now, by, data: !more, ...MANUAL });
    if (!more) await log('backup_run', {});
    return json({ report });
  }
  if (path === '/api/backup/download') {
    const withFiles = body.files !== false;
    const name = (await env.TASKS_DB?.prepare('SELECT name FROM people WHERE id=?').bind(by).first())?.name || by;
    await log('backup_download', { files: withFiles });
    const file = `calwwt-backup-${now.toISOString().slice(0, 10)}${withFiles ? '' : '-data'}.zip`;
    return new Response(zipStream(downloadEntries(env, { withFiles, by: name, now })), { headers: {
      'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'private, no-store' } });
  }
  fail(404, 'Not found.');
}
