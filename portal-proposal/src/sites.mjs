// Sites (calwwt.sppwork.com, 23 Nov 2026): the 8 Caltex sites of the 2027 wastewater improvement programme.
//   /sites/                 overview of all sites (public/sites/index.html)
//   /sites/<code>/          one site: 3D model (when there is one), timeline, notes (public/sites/site.html)
//   /sites/programme/       the programme for all sites together (same page, code "all")
//   /api/sites/<code>/timeline            GET current timeline, PUT save (needs Project timeline = edit)
//   /api/sites/<code>/timeline/history    GET the last 50 saves; /history/<ver> GET one save
// Who may open it: the "Sites, models & drawings" page (page id 'drawings') at view or above (Admin page).
// Timelines are kept in the tasks database (table site_timelines, tasks/schema/0011_site_timelines.sql): every save is a
// new row, so nothing is ever overwritten and the weekly backup copies all of them.
import { HttpError } from './auth.mjs';

export const SITE_CODES = ['0589', '1156', '1588', '1622', '1642', '1687', '1703', '1750'];
const ALL = 'all';
const CODE = new RegExp(`^(${[...SITE_CODES, ALL].join('|')})$`);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const fail = (status, message, details) => { throw new HttpError(status, message, details); };
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const str = (v, n = 200) => typeof v === 'string' && v.length <= n;

/** Same rules as calcr.sppwork.com (src/worker.js validTimeline). */
export function validTimeline(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.phases) || !d.phases.length || d.phases.length > 20) return false;
  if (!ISO.test(d.from) || !ISO.test(d.to) || d.from >= d.to) return false;
  if (d.week != null && !['mf', 'ms', 'all'].includes(d.week)) return false;
  if (!Array.isArray(d.milestones || []) || (d.milestones || []).length > 50 || (d.milestones || []).some((m) => !ISO.test(m?.date) || !str(m.en) || !str(m.th))) return false;
  let count = 0;
  for (const ph of d.phases) {
    if (!str(ph?.en) || !str(ph.th) || !Array.isArray(ph.groups) || ph.groups.length > 50) return false;
    for (const g of ph.groups) {
      if (!str(g?.en) || !str(g.th) || !Array.isArray(g.tasks) || g.tasks.length > 200) return false;
      for (const t of g.tasks) {
        if (++count > 1000) return false;
        if (!str(t?.en) || !str(t.th)) return false;
        if (t.ms) { if (!ISO.test(t.date)) return false; continue; }
        if (!ISO.test(t.start) || !ISO.test(t.end) || t.end < t.start) return false;
        if (!Number.isInteger(t.dur) || t.dur < 0 || t.dur > 2000) return false;
        if (typeof t.pct !== 'number' || t.pct < 0 || t.pct > 100) return false;
      }
    }
  }
  return true;
}

async function readBody(request, limit = 200000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Expected JSON.');
  const length = request.headers.get('content-length');
  if (length && Number(length) > limit) fail(413, 'Too large.');
  const text = await request.text();
  if (text.length > limit) fail(413, 'Too large.');
  try { return JSON.parse(text); } catch { fail(400, 'Invalid JSON.'); }
}

const current = (db, site) => db.prepare('SELECT ver, data_json, saved_at, by_name FROM site_timelines WHERE site=? ORDER BY ver DESC LIMIT 1').bind(site).first();
const record = (row) => row ? { data: JSON.parse(row.data_json), ver: String(row.ver), savedAt: row.saved_at, by: row.by_name } : { data: null, ver: null };

async function timelineApi(request, env, access, site, tail) {
  const db = env.TASKS_DB;
  if (!db) fail(503, 'Saving is not available yet.');
  if (tail === '' && request.method === 'GET') return json(record(await current(db, site)));
  if (tail === '' && request.method === 'PUT') {
    if ((access.pages?.timeline || 'none') !== 'edit') fail(403, 'You can look at the timeline but not change it (Admin page: Project timeline = edit).');
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'calwwt') fail(403, 'Request blocked.');
    const body = await readBody(request);
    if (!validTimeline(body.data)) fail(400, 'The timeline is not valid.');
    const cur = await current(db, site);
    if ((cur ? String(cur.ver) : null) !== (body.base || null)) return json({ error: 'conflict', current: { ver: cur ? String(cur.ver) : null, savedAt: cur?.saved_at, by: cur?.by_name } }, 409);
    const savedAt = new Date().toISOString(), ver = Math.max(Date.now(), (cur?.ver || 0) + 1), by = access.name || access.person || 'owner';
    try {
      await db.prepare('INSERT INTO site_timelines(site, ver, data_json, saved_at, by_id, by_name) VALUES(?,?,?,?,?,?)')
        .bind(site, ver, JSON.stringify(body.data), savedAt, access.person || 'owner', by).run();
    } catch { return json({ error: 'conflict', current: record(await current(db, site)) }, 409); }
    return json({ ver: String(ver), savedAt, by });
  }
  if (tail === '/history' && request.method === 'GET') {
    const rows = (await db.prepare('SELECT ver, saved_at, by_name FROM site_timelines WHERE site=? ORDER BY ver DESC LIMIT 50').bind(site).all()).results;
    return json(rows.map((r) => ({ ver: String(r.ver), savedAt: r.saved_at, by: r.by_name })));
  }
  const m = tail.match(/^\/history\/(\d{10,16})$/);
  if (m && request.method === 'GET') {
    const row = await db.prepare('SELECT ver, data_json, saved_at, by_name FROM site_timelines WHERE site=? AND ver=?').bind(site, Number(m[1])).first();
    return row ? json(record(row)) : json({ error: 'not found' }, 404);
  }
  fail(405, 'This operation is not available.');
}

/** Returns a Response for /sites and /api/sites, or null for any other address. */
export async function routeSites(request, env, actor, access) {
  const url = new URL(request.url), p = url.pathname;
  const isPage = p === '/sites' || p.startsWith('/sites/'), isApi = p.startsWith('/api/sites/');
  if (!isPage && !isApi) return null;
  if (!access.areas.has('drawings')) fail(404, 'Not found.');
  if (isApi) {
    const m = p.match(/^\/api\/sites\/([0-9a-z]{3,4})\/timeline((?:\/.*)?)$/);
    if (!m || !CODE.test(m[1])) fail(404, 'Not found.');
    return timelineApi(request, env, access, m[1], m[2] || '');
  }
  if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
  if (p === '/sites') return new Response(null, { status: 308, headers: { Location: '/sites/' + url.search } });
  const target = new URL(request.url);
  if (p === '/sites/' || p === '/sites/index.html') target.pathname = '/sites/index.html';
  else {
    // /sites/<code> or /sites/programme -> with a slash; /sites/<code>/ -> the shared site page.
    const page = p.match(/^\/sites\/([0-9]{4}|programme)(\/?)$/);
    if (page) {
      const code = page[1] === 'programme' ? ALL : page[1];
      if (!CODE.test(code)) fail(404, 'Not found.');
      if (!page[2]) return new Response(null, { status: 308, headers: { Location: p + '/' + url.search } });
      target.pathname = '/sites/site.html';
    }
  }
  const res = await env.ASSETS.fetch(new Request(target, request));
  if (res.status === 404) fail(404, 'Not found.');
  return res;
}
