// Sites -> CAD workspace: calwwt.sppwork.com/cad-workspace/ (screens) and /api/cad/* (this module). Copied from calnkt
// (brianinnsawan/nti-city-park-portal, 27 Nov 2026). calwwt: no project DWG catalog (see PROJECT below); the drawings are the
// DWG / DXF files in Files. Full CAD program: Open CAD Studio 2026.41, as on calnkt
// (2026.47 was tried and taken back the same day: it cannot draw in a browser; docs/cad-program-review-2026.47.md).
// Brought over from the old brian-cad-version2 site (Brian, 2 Nov 2026): open the project's DWG drawings and the DWG / DXF
// files in Project files, measure (distance, chain, area, angle) and draw markups (line, arrow, rectangle, circle, cloud,
// text) on top. Drawing files are never changed; what is saved is the "notes" of a drawing (its measurements + markups).
//
// Access, checked here on every request (page level 'drawings' on the Admin page):
//   none -> 404 for the page, its files and every /api/cad call (KS and the land owner by default).
//   view -> open, measure and draw on the screen; nothing can be saved (the server refuses, 403).
//   edit -> also save notes. "View the site as" is always view only (refused here and earlier in the worker).
// Notes: one shared set per drawing per company (SPP, Caltex, ...). Each save is a new numbered version in private storage
// (R2 DRAWINGS, cad-workspace/notes/<company>/<drawing SHA-256>/<000001>.json), created only if that number is still free,
// never replaced or deleted, so the versions are the change history. SPP people see every company's notes; a partner company
// sees only its own, plus SPP's notes on a drawing SPP shared with Caltex (below). A drawing's notes are only shown to people
// who may open that drawing.
// Sharing with Caltex (Brian, 2 Nov 2026): an SPP person with Drawings edit can share SPP's notes on one drawing with Caltex
// (the newest version and every later one, until unshared), and stop sharing again. Only drawings Caltex may open count:
// project DWGs, and Project files DWG / DXF shared with Caltex. Caltex sees them read only, labelled as SPP's.
// Every share / stop is kept: cad-workspace/shares/spp-caltex/<drawing SHA-256>/<000001>.json (who, when; never replaced).
// Saves need Origin = APP_ORIGIN, X-Requested-With: cad, and (when the browser sends it) Sec-Fetch-Site: same-origin.
// The engine (mlightcad + LibreDWG) is the Files CAD viewer's; scripts/build-cad-workspace.mjs builds the page's copy.
// Full CAD program (/cad-workspace/full/, Open CAD Studio, scripts/import-cad-program.mjs): same page levels. With edit, a
// drawing changed in the program can be saved to the site as a separate "copy" of that drawing (DWG / DXF only, never over
// the original): cad-workspace/copies/<company>/<drawing SHA-256>/<000001>.<dwg|dxf>, numbered, created only if the number is
// free, never replaced or deleted. Copies follow the notes' company rule (SPP sees all; a partner company only its own).
import { HttpError } from './auth.mjs';
import { readJson, readBytes } from './body.mjs';
import { releaseObject } from './release-object.mjs';
import { CATALOG } from './cad-catalog.mjs';
import { visibleCadFiles, fileVisibleTo } from './files.mjs';

export const CAD_PAGE = '/cad-workspace';
// The DWG reader worker builds its WebAssembly bindings at run time ('unsafe-eval'); only that worker script gets it.
export const CAD_PARSER_WORKER = '/cad-workspace/workers/libredwg-parser-worker.js';
export const CAD_WORKER_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; connect-src 'self'";
// The full CAD program's own files sit in a folder named after its version (scripts/import-cad-program.mjs) and never
// change under that name, so the browser may keep them (Brian, 2 Nov 2026). Private: the access check above still runs on
// every request; pages, the page's own scripts, program.json, APIs and drawings stay no-store.
const IMMUTABLE = /^\/cad-workspace\/full\/v\d+(?:\.\d+)*\/[^?]+$/;
export const cadCacheControl = (path, status) => (status === 200 && IMMUTABLE.test(path) ? 'private, max-age=31536000, immutable' : null);
// Old addresses of the CAD tool (bookmarks from brian-cad-version2): they lead to the workspace.
const LEGACY_PAGES = new Set(['/workspace', '/workspace/', '/workspace/index.html', '/cad', '/cad/', '/cad/index', '/cad/index.html', '/cad/index.htm']);
// The old site's CAD program page (/app/) leads to the full CAD program.
const LEGACY_PROGRAM = new Set(['/app', '/app/', '/app/index.html']);
export const COMPANIES = ['spp', 'caltex', 'ks', 'owner'];
const NOTES = 'cad-workspace/notes/';
const SHARES = 'cad-workspace/shares/spp-caltex/';
const CALTEX = { id: null, company: 'caltex' };
const SHA = /^[0-9a-f]{64}$/;
export const MAX_NOTES_BYTES = 1024 * 1024;
const COPIES = 'cad-workspace/copies/';
export const MAX_COPY_BYTES = 32 * 1024 * 1024; // read into memory (Workers: 128 MB), so kept well below
const COPY_KEY = /\/(\d{6})\.(dwg|dxf)$/;
// A drawing file the program wrote: binary DWG (R13 to 2018) or DXF (text or binary).
export function drawingFormat(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 64));
  if (/^AC10(12|14|15|18|21|24|27|32)/.test(head)) return 'dwg';
  if (head.startsWith('AutoCAD Binary DXF') || /^\s*(999\r?\n[^\n]*\r?\n\s*)?0\r?\n\s*SECTION\b/.test(head)) return 'dxf';
  return null;
}
const MAX_ITEMS = 5000;
const NOTE_CHARS = 200;
// Night audit (2 Nov 2026): storage per drawing and company is limited, so the lists stay quick and storage cannot grow without end.
const MAX_VERSIONS = 2000, MAX_COPIES = 300, MAX_SHARE_EVENTS = 400;

const fail = (status, message, details) => { throw new HttpError(status, message, details); };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const redirect = (status, location) => new Response(null, { status, headers: { Location: location } });
const now = () => new Date().toISOString();
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => { try { return new TextDecoder().decode(Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))); } catch { return ''; } };

// Project drawings: catalog titles + the verified copy in private storage, by SHA-256.
// calwwt: none. site-release.mjs on calwwt still lists calnkt's (NTI) drawings from the copy the site was built from; they
// must never show here, so they are not read.
const PROJECT = new Map();

async function listAll(bucket, options) {
  const objects = [], prefixes = new Set();
  let cursor;
  do {
    const r = await bucket.list({ ...options, limit: 1000, ...(cursor ? { cursor } : {}) });
    objects.push(...(r.objects || []));
    for (const p of r.delimitedPrefixes || []) prefixes.add(p);
    cursor = r.truncated ? r.cursor : null;
  } while (cursor);
  return { objects, prefixes: [...prefixes] };
}
const SAVE_KEY = /\/(\d{6})\.json$/;
function versionOf(o) {
  const m = SAVE_KEY.exec(o.key || '');
  if (!m) return null;
  const meta = o.customMetadata || {};
  const [markups, measurements] = String(meta.n || '').split('/').map((x) => Number(x) || 0);
  return { key: o.key, seq: Number(m[1]), by: meta.by || '', at: meta.at || '', note: meta.note ? unb64(meta.note) : '', markups: markups || 0, measurements: measurements || 0 };
}
async function versions(env, company, sha) {
  const { objects } = await listAll(env.DRAWINGS, { prefix: `${NOTES}${company}/${sha}/`, include: ['customMetadata'] });
  return objects.map(versionOf).filter(Boolean).sort((a, b) => a.seq - b.seq);
}

// Share / stop-sharing events for one drawing, oldest first. The newest one is the current state.
async function shareEvents(env, sha) {
  const { objects } = await listAll(env.DRAWINGS, { prefix: `${SHARES}${sha}/`, include: ['customMetadata'] });
  return objects.map((o) => { const m = SAVE_KEY.exec(o.key || ''); const c = o.customMetadata || {}; return m && { seq: Number(m[1]), action: c.action === 'share' ? 'share' : 'unshare', by: c.by || '', at: c.at || '' }; })
    .filter(Boolean).sort((a, b) => a.seq - b.seq);
}
/** Drawings whose SPP notes are shared with Caltex now (newest event per drawing is "share"). */
async function sharedDrawings(env) {
  const { objects } = await listAll(env.DRAWINGS, { prefix: SHARES, include: ['customMetadata'] });
  const last = new Map();
  for (const o of objects) {
    const [, , , sha, file] = String(o.key).split('/'), m = SAVE_KEY.exec('/' + (file || ''));
    if (!SHA.test(sha || '') || !m) continue;
    const seq = Number(m[1]);
    if (!last.has(sha) || last.get(sha).seq < seq) last.set(sha, { seq, action: o.customMetadata?.action });
  }
  return new Set([...last].filter(([, v]) => v.action === 'share').map(([k]) => k));
}

function cleanNote(v) {
  const s = String(v ?? '').normalize('NFC').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > NOTE_CHARS) fail(400, `The note is too long (${NOTE_CHARS} characters at most).`);
  return s;
}
// The markup / measurement lists as the CAD engine writes them ("sidecar" version 1). Only the outer shape is checked here;
// the page reads them back with the engine's own parser, which drops anything it does not recognise.
function sidecar(v, field) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || v.version !== 1 || !Array.isArray(v[field])) fail(400, `Send ${field} as the CAD engine writes them (version 1).`);
  if (v[field].length > MAX_ITEMS) fail(413, `Too many ${field} on one drawing (${MAX_ITEMS} at most).`);
  if (!v[field].every((x) => x && typeof x === 'object' && !Array.isArray(x))) fail(400, `Send ${field} as the CAD engine writes them (version 1).`);
  return { version: 1, ...(typeof v.drawingName === 'string' ? { drawingName: v.drawingName.slice(0, 200) } : {}), [field]: v[field] };
}

// Names as the viewer may see them: partners never see observers or people hidden from their company (ACCESS-RULES.md).
async function namesFor(env, viewerCompany) {
  if (!env.TASKS_DB) return (id) => (id === 'owner' ? 'Brian' : id);
  const rows = (await env.TASKS_DB.prepare('SELECT * FROM people').all()).results;
  const byId = new Map(rows.map((p) => [p.id, p]));
  return (id) => {
    if (id === 'owner') return 'Brian';
    const p = byId.get(id);
    if (!p) return id;
    let hidden = [];
    try { hidden = JSON.parse(p.hidden_from_json || '[]'); } catch { /* none */ }
    if (viewerCompany && viewerCompany !== 'spp' && p.company !== viewerCompany && (p.level === 'observer' || hidden.includes(viewerCompany))) return 'SPP project staff';
    return p.name;
  };
}

async function viewerOf(env, access) {
  if (!access.person || !env.TASKS_DB) return null;
  return env.TASKS_DB.prepare('SELECT id, name, company FROM people WHERE id=? AND active=1').bind(access.person).first();
}

export async function routeCadWorkspace(request, env, actor, access) {
  const url = new URL(request.url), path = url.pathname, method = request.method, read = method === 'GET' || method === 'HEAD';
  const isPage = path === CAD_PAGE || path.startsWith(CAD_PAGE + '/');
  const isApi = path.startsWith('/api/cad/');
  const legacy = LEGACY_PAGES.has(path) || LEGACY_PROGRAM.has(path);
  if (!isPage && !isApi && !legacy) return null;
  const level = access.pages?.drawings || 'none';
  if (level === 'none') fail(404, 'Not found.');

  if (legacy || isPage) {
    if (!read) fail(405, 'Method not allowed.');
    if (legacy) {
      // Old links: /cad/?dwg=<catalog id> and /workspace/?view=site&dwg=<catalog id>.
      const q = new URLSearchParams(url.search); q.delete('view'); q.delete('source');
      const rest = q.toString();
      return redirect(302, `${CAD_PAGE}/${LEGACY_PROGRAM.has(path) ? 'full/' : ''}${rest ? '?' + rest : ''}`);
    }
    if (path === CAD_PAGE) return redirect(308, `${CAD_PAGE}/${url.search}`);
    const target = new URL(request.url);
    const engineFile = /^\/cad-workspace\/(workers|cad-data)\/(.+)$/.exec(path);
    // The DWG reader worker, its WebAssembly file and the CAD fonts are the Files CAD viewer's (one copy on the site).
    if (engineFile) target.pathname = `/files/cad/${engineFile[1]}/${engineFile[2]}`;
    else if (path.endsWith('/')) target.pathname = path + 'index.html';
    return env.ASSETS.fetch(new Request(target, request));
  }

  if (!env.DRAWINGS) fail(503, 'Drawing storage is not connected on this site.');
  const viewer = await viewerOf(env, access);
  const owner = !!access.owner && !access.viewAs;
  const company = viewer?.company || (owner ? 'spp' : null);
  const by = viewer?.id || (owner ? 'owner' : null);
  const canSave = level === 'edit' && !access.viewAs && !!company && !!by;
  const visibleCompanies = company === 'spp' ? COMPANIES : company ? [company] : [];
  const filesOn = (access.pages?.files || 'none') !== 'none' && !!viewer && !!env.TASKS_DB;
  if (!read) {
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'cad') fail(403, 'Request blocked.');
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') fail(403, 'Cross-site request refused.');
    if (!canSave) fail(403, access.viewAs ? 'View only: you are viewing the site as someone else.' : 'View only: your Drawings access does not include saving.');
  }

  // Which drawings this person may open: project drawings (Drawings page), Project files (Files page, its sharing rules),
  // and the owner's own drawings saved on the old site.
  const fileRows = async () => {
    if (!filesOn) return [];
    try { return await visibleCadFiles(env.TASKS_DB, viewer); } catch (e) { if (/no such table/i.test(String(e?.message))) return []; throw e; }
  };
  const legacyRows = async () => {
    if (!owner || !env.DB) return [];
    try {
      return (await env.DB.prepare(`SELECT d.id, d.title, r.id AS rev, r.sha256, r.size, r.filename, r.created_at FROM drawings d JOIN revisions r ON r.id=d.head_id
        WHERE d.owner_id=? ORDER BY r.created_at DESC LIMIT 200`).bind(actor.id).all()).results;
    } catch { return []; } // the old drawing tables are not present on every copy of the site
  };
  // Whether Caltex people may open a drawing: project DWGs, and Files DWG / DXF shared with Caltex (from its sharing date).
  async function caltexMayOpen(sha) {
    if (PROJECT.has(sha) && env.SITE_READY === 'true') return true;
    if (!env.TASKS_DB) return false;
    try {
      const rows = (await env.TASKS_DB.prepare('SELECT id, name, caltex_from, deleted FROM files WHERE sha256=? AND deleted=0').bind(sha).all()).results;
      return rows.some((f) => /\.(dwg|dxf)$/i.test(f.name) && fileVisibleTo(f, CALTEX));
    } catch (e) { if (/no such table/i.test(String(e?.message))) return false; throw e; }
  }
  async function mayOpen(sha) {
    if (PROJECT.has(sha) && env.SITE_READY === 'true') return true;
    if (filesOn) {
      try {
        const rows = (await env.TASKS_DB.prepare('SELECT id, name, caltex_from, deleted FROM files WHERE sha256=? AND deleted=0').bind(sha).all()).results;
        if (rows.some((f) => /\.(dwg|dxf)$/i.test(f.name) && fileVisibleTo(f, viewer))) return true;
      } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
    }
    return (await legacyRows()).some((r) => r.sha256 === sha);
  }

  if (path === '/api/cad/drawings' && read) {
    const groups = env.SITE_READY === 'true' ? CATALOG.map((g) => ({
      id: g.id, name: g.name, name_th: g.name_th, rebuild: g.rebuild,
      sheets: g.sheets.filter((s) => PROJECT.has(s.sha256)).map((s) => {
        const { asset } = PROJECT.get(s.sha256);
        return { ...s, name: asset.downloadName, bytes: asset.size, file: `/api/cad/file/${s.sha256}/${encodeURIComponent(asset.downloadName)}` };
      }),
    })) : [];
    let files = [];
    const rows = await fileRows();
    if (rows.length) {
      const fl = (await env.TASKS_DB.prepare('SELECT id, parent_id, name FROM file_folders').all()).results;
      const folders = new Map(fl.map((f) => [f.id, f.name])), parentOf = new Map(fl.map((f) => [f.id, f.parent_id]));
      // calwwt (Brian, 27 Nov 2026): which site a drawing belongs to (its folder is inside Sites › <code>), so the workspace
      // can show one site's drawings; and the PDF of the same drawing (same folder, same name), for the PDF | CAD switch.
      const siteOf = (id) => { for (let f = id, n = 0; f && n < 20; f = parentOf.get(f), n++) { const m = /^site-(\d{4})$/.exec(f); if (m) return m[1]; } return ''; };
      const pdfs = (await env.TASKS_DB.prepare("SELECT id, folder_id, name FROM files WHERE deleted=0 AND lower(name) LIKE '%.pdf'").all()).results;
      const stem = (n) => String(n).replace(/\.[^.]+$/, '').toLowerCase();
      files = rows.filter((f) => SHA.test(f.sha256 || '')).map((f) => {
        const [th, en] = String(folders.get(f.folder_id) || '').split(' · ');
        const pdf = pdfs.find((p) => p.folder_id === f.folder_id && stem(p.name) === stem(f.name));
        return { sha256: f.sha256, name: f.name, bytes: f.size, folder: en || th || '', folder_th: th || en || '', site: siteOf(f.folder_id),
          ...(pdf ? { pdf: `/files/view.html?id=${pdf.id}` } : {}), file: `/api/files/${f.id}/download/${encodeURIComponent(f.name)}` };
      });
    }
    const legacyDrawings = (await legacyRows()).filter((r) => SHA.test(r.sha256 || '')).map((r) => ({
      sha256: r.sha256, name: r.filename || `${r.title}.dwg`, title: r.title, bytes: r.size, at: r.created_at,
      file: `/api/drawings/${r.id}/revisions/${r.rev}/file.dwg`,
    }));
    // Which drawings already have saved notes this person can see (a mark in the list).
    const noted = {};
    for (const c of visibleCompanies) {
      const { objects, prefixes } = await listAll(env.DRAWINGS, { prefix: `${NOTES}${c}/`, delimiter: '/' });
      const shas = new Set(prefixes.map((p) => p.split('/')[3]));
      for (const o of objects) shas.add(String(o.key).split('/')[3]);
      for (const s of shas) if (SHA.test(s || '')) (noted[s] ||= []).push(c);
    }
    let shared = [];
    if (company === 'spp' || company === 'caltex') shared = [...await sharedDrawings(env)];
    if (company === 'caltex') {
      // SPP's notes Caltex can see: shared drawings that have SPP notes.
      const { prefixes } = await listAll(env.DRAWINGS, { prefix: `${NOTES}spp/`, delimiter: '/' });
      const spp = new Set(prefixes.map((p) => p.split('/')[3]));
      for (const s of shared) if (spp.has(s)) (noted[s] ||= []).push('spp');
    }
    return json({ level, canSave, company, groups, files, legacy: legacyDrawings, noted, sharedWithCaltex: shared });
  }

  const file = /^\/api\/cad\/file\/([0-9a-f]{64})(?:\/[^/]+)?$/.exec(path);
  if (file && read) {
    const entry = PROJECT.get(file[1]);
    if (!entry) fail(404, 'Drawing not found.');
    if (env.SITE_READY !== 'true') fail(503, 'The project drawings are not available on this site yet.');
    const object = await releaseObject(env.DRAWINGS, entry.asset, { headOnly: method === 'HEAD' });
    return new Response(method === 'HEAD' ? null : object.body, { headers: {
      'Content-Type': 'application/acad', 'Content-Length': String(entry.asset.size), 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(entry.asset.downloadName)}`, 'X-Content-SHA256': entry.asset.sha256 } });
  }

  // Copies saved from the full CAD program.
  const copies = /^\/api\/cad\/copies\/([0-9a-f]{64})(?:\/([a-z]+)\/(\d{6})(?:\/[^/]+)?)?$/.exec(path);
  if (copies) {
    const [, src, copyCompany, copySeq] = copies;
    if (!(await mayOpen(src))) fail(404, 'Drawing not found.');
    const listCopies = async (c) => (await listAll(env.DRAWINGS, { prefix: `${COPIES}${c}/${src}/`, include: ['customMetadata'] })).objects.map((o) => {
      const m = COPY_KEY.exec(o.key || ''), meta = o.customMetadata || {};
      return m && { key: o.key, company: c, seq: Number(m[1]), format: m[2], bytes: o.size, by: meta.by || '', at: meta.at || '', name: meta.name ? unb64(meta.name) : `copy.${m[2]}`, note: meta.note ? unb64(meta.note) : '' };
    }).filter(Boolean).sort((a, b) => a.seq - b.seq);
    // Same rule as the notes: SPP sees every company's copies; a partner company its own, and Caltex also SPP's NEWEST copy
    // of this drawing while SPP shares the drawing's notes with Caltex (read only; stopping the share hides it again).
    const sppShared = company === 'caltex' && (await shareEvents(env, src)).at(-1)?.action === 'share';
    const copyCompanies = sppShared ? ['caltex', 'spp'] : visibleCompanies;
    const visibleCopies = async (c) => { const l = await listCopies(c); return company !== 'spp' && c !== company ? l.slice(-1) : l; };
    if (read && copySeq) {
      if (!copyCompanies.includes(copyCompany)) fail(404, 'Not found.');
      const item = (await visibleCopies(copyCompany)).find((x) => x.seq === Number(copySeq));
      const obj = item && await env.DRAWINGS.get(item.key);
      if (!obj) fail(404, 'Copy not found.');
      return new Response(method === 'HEAD' ? null : obj.body, { headers: { 'Content-Type': item.format === 'dwg' ? 'application/acad' : 'application/dxf',
        'Content-Length': String(obj.size), 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}` } });
    }
    if (read) {
      const nameOf = await namesFor(env, company);
      const all = [];
      for (const c of copyCompanies) all.push(...await visibleCopies(c));
      all.sort((a, b) => (a.at < b.at ? 1 : -1));
      return json({ canSave, company, copies: all.slice(0, 200).map(({ key, ...x }) => ({ ...x, by: nameOf(x.by), ...(company === 'caltex' && x.company === 'spp' ? { sharedWithYou: true } : {}), file: `/api/cad/copies/${src}/${x.company}/${String(x.seq).padStart(6, '0')}/${encodeURIComponent(x.name)}` })) });
    }
    if (method !== 'POST' || copySeq) fail(405, 'Method not allowed.');
    let name;
    try { name = decodeURIComponent(request.headers.get('x-filename') || ''); } catch { fail(400, 'Invalid file name.'); }
    name = name.normalize('NFC').replace(/[\x00-\x1f\x7f/\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length > 160 || !/\.(dwg|dxf)$/i.test(name)) fail(400, 'Save the copy as a .dwg or .dxf file with a plain name.');
    let note = '';
    try { note = cleanNote(decodeURIComponent(request.headers.get('x-copy-note') || '')); } catch (e) { if (e instanceof HttpError) throw e; fail(400, 'Invalid note.'); }
    const bytes = await readBytes(request, MAX_COPY_BYTES);
    const format = drawingFormat(bytes);
    if (!format) fail(415, 'This is not a DWG or DXF drawing.');
    if (!name.toLowerCase().endsWith('.' + format)) name = name.replace(/\.(dwg|dxf)$/i, '.' + format);
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
    for (let attempt = 0; attempt < 3; attempt++) {
      const seq = ((await listCopies(company)).at(-1)?.seq || 0) + 1, at = now();
      if (seq > MAX_COPIES) fail(507, 'This drawing has too many saved copies (limit reached). Ask Brian to tidy them up.');
      const put = await env.DRAWINGS.put(`${COPIES}${company}/${src}/${String(seq).padStart(6, '0')}.${format}`, bytes, {
        onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: format === 'dwg' ? 'application/acad' : 'application/dxf' },
        customMetadata: { by, at, name: b64(name), note: b64(note), sha256: digest, from: src },
      });
      if (put) return json({ company, seq, at, name, format, bytes: bytes.length }, 201);
    }
    fail(409, 'Someone saved a copy at the same moment. Try again.');
  }

  const share = /^\/api\/cad\/share\/([0-9a-f]{64})$/.exec(path);
  if (share) {
    if (method !== 'POST') fail(405, 'Method not allowed.');
    if (company !== 'spp') fail(403, 'Only SPP can share SPP notes.');
    const shaS = share[1];
    if (!(await mayOpen(shaS))) fail(404, 'Drawing not found.');
    const body = await readJson(request, 1024);
    if (typeof body.shared !== 'boolean') fail(400, 'Say whether to share (true) or stop sharing (false).');
    if (body.shared && !(await caltexMayOpen(shaS))) fail(409, 'Caltex cannot open this drawing (it is not shared with Caltex in Files), so its notes cannot be shared.');
    const action = body.shared ? 'share' : 'unshare';
    // Created only if the number is free; a second person sharing at the same moment just takes the next number.
    for (let attempt = 0; attempt < 3; attempt++) {
      const events = await shareEvents(env, shaS), lastEvent = events.at(-1);
      if ((lastEvent?.action || 'unshare') === action) return json({ shared: body.shared, changed: false });
      const seq = (lastEvent?.seq || 0) + 1, at = now();
      if (seq > MAX_SHARE_EVENTS) fail(507, 'This drawing has been shared and unshared too many times.');
      const put = await env.DRAWINGS.put(`${SHARES}${shaS}/${String(seq).padStart(6, '0')}.json`,
        JSON.stringify({ format: 'calnkt-cad-share/1', drawing: shaS, from: 'spp', to: 'caltex', action, by, at }),
        { onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: 'application/json' }, customMetadata: { action, by, at } });
      if (put) return json({ shared: body.shared, changed: true, at }, 201);
    }
    fail(409, 'Someone changed the sharing at the same moment. Reload and try again.');
  }

  const notes = /^\/api\/cad\/notes\/([0-9a-f]{64})$/.exec(path);
  if (!notes) fail(404, 'Not found.');
  const sha = notes[1];
  if (!(await mayOpen(sha))) fail(404, 'Drawing not found.');
  // Companies whose notes on THIS drawing the person may see: SPP everything; a partner its own, and Caltex also SPP's
  // when SPP shared this drawing's notes with Caltex.
  const events = company === 'spp' || company === 'caltex' ? await shareEvents(env, sha) : [];
  const sharedNow = events.at(-1)?.action === 'share';
  const visibleHere = company === 'caltex' && sharedNow ? ['caltex', 'spp'] : visibleCompanies;

  if (read) {
    const want = url.searchParams.get('company') || company || visibleHere[0] || null;
    if (want && !visibleHere.includes(want)) fail(404, 'Not found.');
    const layers = [];
    for (const c of visibleHere) {
      const list = await versions(env, c, sha);
      if (list.length || c === company) layers.push({ company: c, list });
    }
    const layer = layers.find((l) => l.company === want);
    // Shared SPP notes: Caltex sees only SPP's newest version (now and as it changes), never SPP's older versions.
    if (layer && company !== 'spp' && want !== company) layer.list = layer.list.slice(-1);
    const seqWanted = url.searchParams.has('seq') ? Number(url.searchParams.get('seq')) : null;
    if (seqWanted !== null && !Number.isSafeInteger(seqWanted)) fail(400, 'Ask for a saved version by its number.');
    const nameOf = await namesFor(env, company);
    let current = null;
    const pick = layer && (seqWanted !== null ? layer.list.find((v) => v.seq === seqWanted) : layer.list.at(-1));
    if (seqWanted !== null && !pick) fail(404, 'That saved version does not exist.');
    if (pick) {
      const obj = await env.DRAWINGS.get(pick.key);
      if (!obj) fail(503, 'The saved notes could not be read. Try again.');
      const saved = JSON.parse(await new Response(obj.body).text());
      current = { seq: pick.seq, at: pick.at, by: nameOf(pick.by), note: pick.note, markups: saved.markups, measurements: saved.measurements };
    }
    return json({
      drawing: sha, company: want, own: company, canSave: canSave && want === company,
      latest: layer?.list.at(-1)?.seq || 0,
      layers: layers.map((l) => ({ company: l.company, latest: l.list.at(-1)?.seq || 0, at: l.list.at(-1)?.at || null, ...(company === 'caltex' && l.company === 'spp' ? { sharedWithYou: true } : {}) })),
      // SPP: the Caltex sharing of this drawing's SPP notes, with its history. Caltex: only whether it is shared.
      sharing: company === 'spp' ? {
        shared: sharedNow, canChange: canSave, caltexCanOpen: await caltexMayOpen(sha),
        log: events.slice(-20).reverse().map((e) => ({ action: e.action, by: nameOf(e.by), at: e.at })),
      } : company === 'caltex' ? { shared: sharedNow } : null,
      current,
      history: (layer?.list || []).slice(-200).reverse().map((v) => ({ seq: v.seq, at: v.at, by: nameOf(v.by), note: v.note, markups: v.markups, measurements: v.measurements })),
    });
  }

  if (method !== 'POST') fail(405, 'Method not allowed.');
  const body = await readJson(request, MAX_NOTES_BYTES);
  if (!Number.isSafeInteger(body.base) || body.base < 0) fail(400, 'Say which saved version you started from (0 for none).');
  const note = cleanNote(body.note);
  const markups = sidecar(body.markups, 'markups'), measurements = sidecar(body.measurements, 'measurements');
  const list = await versions(env, company, sha);
  const latest = list.at(-1)?.seq || 0;
  const stale = () => fail(409, 'Someone saved newer notes on this drawing. Your notes were not saved: reopen the drawing to see theirs, then add yours again.', { latest });
  if (body.base !== latest) stale();
  const seq = latest + 1, at = now();
  if (seq > MAX_VERSIONS) fail(507, 'This drawing has too many saved versions (limit reached). Ask Brian to tidy them up.');
  const key = `${NOTES}${company}/${sha}/${String(seq).padStart(6, '0')}.json`;
  const record = { format: 'calnkt-cad-notes/1', drawing: sha, company, seq, at, by, note, markups, measurements };
  // Created only if this number is still free: two people saving at once cannot overwrite each other.
  const put = await env.DRAWINGS.put(key, JSON.stringify(record), {
    onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: 'application/json' },
    customMetadata: { by, at, note: b64(note), n: `${markups.markups.length}/${measurements.measurements.length}` },
  });
  if (!put) stale();
  return json({ seq, at }, 201);
}
