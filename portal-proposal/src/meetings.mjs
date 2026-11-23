// Meetings (calnkt.sppwork.com/meetings, Brian 2 Nov 2026): the standing SPP–Caltex weekly meeting on Wednesdays (a page
// for each week, made ahead of time) and one-off meetings. Data in TASKS_DB (schema 0007).
// - Page level 'meetings': view to read, edit to add and change. Defaults: SPP edit, Caltex edit, site team none except
//   Tle, Jaran and Gift, KS and land owner none (tasks/src/pages.mjs).
// - SPP-only notes (kind spp_note) are never sent to anyone outside SPP.
// - Action items can be turned into Tasks by the browser through the task API (its own rules apply); the link is kept here.
// - Changes need Origin = APP_ORIGIN and X-Requested-With: meetings. View-as is refused earlier for every non-GET.
import { HttpError } from './auth.mjs';
import { readJson } from './body.mjs';
import { requestTaskService } from './site-access.mjs';
import * as P from '../../tasks/src/policy.mjs';

const fail = (status, message) => { throw new HttpError(status, message); };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const now = () => new Date().toISOString();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const WEEKLY = { series: 'spp-caltex-weekly', title: 'SPP–Caltex weekly meeting', weekday: 3 }; // Wednesday
const bangkokToday = (d = new Date()) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weeklyPlaceholder = (d) => ({ id: `weekly-${d}`, series: WEEKLY.series, title: WEEKLY.title, date: d, time: null, place: null });
/** The weekly meetings to keep ready: this week's Wednesday and the next three. */
export function upcomingWeeklyDates(today = bangkokToday()) {
  const d = new Date(`${today}T00:00:00Z`), back = (d.getUTCDay() - WEEKLY.weekday + 7) % 7;
  const first = addDays(today, -back);
  return [0, 7, 14, 21].map((n) => addDays(first, n));
}
/** Site audit (10 Nov 2026): a weekly page is stored the first time someone with edit changes it, and weekly pages cannot
 *  be deleted. So it can be started only near its date: from two weeks back (minutes written up late) to five weeks
 *  ahead. Before, any Wednesday of any year could be started, without limit and for good. */
export function weeklyDayOpen(day, today = bangkokToday()) { return day >= addDays(today, -14) && day <= addDays(today, 35); }
function text(v, max, field, required = false) {
  if (v == null || v === '') { if (required) fail(400, `${field} is needed.`); return null; }
  const s = String(v).normalize('NFC').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
  if (!s) { if (required) fail(400, `${field} is needed.`); return null; }
  if (s.length > max) fail(400, `${field} is too long (${max} characters at most).`);
  return s;
}
function day(v, field) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!DATE.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) fail(400, `${field}: use a date like 2026-11-04.`);
  return s;
}
const missingTables = (e) => { if (/no such table/i.test(String(e?.message))) fail(503, 'Meetings are not set up on this site yet.'); throw e; };
const body = (request) => readJson(request, 32 * 1024);

export async function routeMeetings(request, env, actor, access) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (path !== '/api/meetings' && !path.startsWith('/api/meetings/')) return null;
  const level = access.pages?.meetings || 'none';
  if (level === 'none') fail(404, 'Not found.');
  if (!env.TASKS_DB) fail(503, 'The project database is not connected on this site.');
  const db = env.TASKS_DB, by = access.person || null;
  const me = by ? await db.prepare('SELECT id, company FROM people WHERE id=? AND active=1').bind(by).first() : null;
  if (!me) fail(404, 'Not found.');
  const spp = me.company === 'spp', canEdit = level === 'edit' && !access.viewAs;
  if (method !== 'GET' && method !== 'HEAD') {
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'meetings') fail(403, 'Request blocked.');
    if (!canEdit) fail(403, 'View only.');
  }
  const log = (meetingId, itemId, action, data = {}) => db.prepare('INSERT INTO meeting_log(at, by_id, meeting_id, item_id, action, data_json) VALUES(?,?,?,?,?,?)').bind(now(), by, meetingId, itemId, action, JSON.stringify(data));
  // Night audit (2 Nov 2026): names follow the task app's rules, so people hidden from a company (for example the site team
  // or observers, for Caltex) show as "SPP project staff" there, as everywhere else.
  let world = null;
  const loadWorld = async () => (world ||= await requestTaskService(env, actor).loadWorld()); // the people already read for this request's page check
  const names = async () => {
    const w = await loadWorld(), viewer = w.people.get(by);
    return new Proxy({}, { get: (_, id) => (typeof id === 'string' && w.people.has(id) ? P.displayPerson(w, viewer, id)?.name : undefined) });
  };
  const canName = async (id) => { const w = await loadWorld(); return P.canSeePerson(w, w.people.get(by), w.people.get(id)); };

  // List: every stored meeting, plus the upcoming weekly ones shown as empty placeholders until someone adds to them.
  // Audit F06: reading never writes; a weekly meeting is stored the first time someone with edit changes it.
  if (path === '/api/meetings' && method === 'GET') {
    const rows = (await db.prepare(`SELECT m.id, m.series, m.title, m.date, m.time, m.place,
        (SELECT COUNT(*) FROM meeting_items i WHERE i.meeting_id=m.id AND i.deleted=0 AND i.kind='agenda') AS agenda,
        (SELECT COUNT(*) FROM meeting_items i WHERE i.meeting_id=m.id AND i.deleted=0 AND i.kind='action' AND i.done=0) AS open_actions,
        (SELECT updated_at FROM meeting_docs d WHERE d.meeting_id=m.id AND d.part='shared') AS page_at
      FROM meetings m WHERE m.deleted=0 ORDER BY m.date DESC, m.id`).all().catch(missingTables)).results;
    const have = new Set(rows.map((r) => r.id));
    for (const d of upcomingWeeklyDates()) if (!have.has(`weekly-${d}`)) rows.push({ ...weeklyPlaceholder(d), agenda: 0, open_actions: 0 });
    rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    return json({ canEdit, spp, today: bangkokToday(), meetings: rows });
  }
  if (path === '/api/meetings' && method === 'POST') {
    const b = await body(request), at = now(), id = `m-${crypto.randomUUID()}`;
    const m = { title: text(b.title, 160, 'Title', true), date: day(b.date, 'Date') || fail(400, 'Date is needed.'), time: text(b.time, 40, 'Time'), place: text(b.place, 160, 'Place') };
    await db.batch([db.prepare('INSERT INTO meetings(id, series, title, date, time, place, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, null, m.title, m.date, m.time, m.place, by, at, by, at), log(id, null, 'create', m)]).catch(missingTables);
    return json({ id }, 201);
  }

  const mm = /^\/api\/meetings\/([A-Za-z0-9-]{1,60})(?:\/(items|delete|live)(?:\/(\d{1,9})(\/delete)?)?)?$/.exec(path);
  if (!mm) fail(404, 'Not found.');
  let meeting = await db.prepare('SELECT * FROM meetings WHERE id=? AND deleted=0').bind(mm[1]).first().catch(missingTables);
  const weeklyDay = /^weekly-(\d{4}-\d{2}-\d{2})$/.exec(mm[1])?.[1];
  const isWeekly = weeklyDay && DATE.test(weeklyDay) && new Date(`${weeklyDay}T00:00:00Z`).getUTCDay() === WEEKLY.weekday;
  if (!meeting && isWeekly && method === 'GET') meeting = { ...weeklyPlaceholder(weeklyDay), attendees: null, created_by: 'system', updated_by: 'system', virtual: true };
  else if (!meeting && isWeekly && method === 'POST' && canEdit && weeklyDayOpen(weeklyDay)) {
    // First change to a weekly meeting stores it (with a history line), then the change goes ahead.
    const at = now();
    await db.batch([db.prepare('INSERT OR IGNORE INTO meetings(id, series, title, date, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(mm[1], WEEKLY.series, WEEKLY.title, weeklyDay, by, at, by, at), log(mm[1], null, 'create', { weekly: weeklyDay })]);
    meeting = await db.prepare('SELECT * FROM meetings WHERE id=? AND deleted=0').bind(mm[1]).first();
  }
  if (!meeting) fail(404, 'Meeting not found.');

  // Live page (Brian, 2 Nov 2026: "like Microsoft Loop"): a WebSocket to the meeting's room (src/meeting-room.mjs).
  // The SPP-only part is only ever connected for SPP people. Look-only people (view level, view-as) cannot type:
  // the room drops their changes. Browsers send Origin on WebSockets; another site's page is refused.
  if (mm[2] === 'live' && !mm[3] && method === 'GET') {
    if (request.headers.get('upgrade') !== 'websocket') fail(426, 'Open this from the Meetings page.');
    if (request.headers.get('origin') !== env.APP_ORIGIN) fail(403, 'Request blocked.');
    if (!env.MEETING_ROOMS) fail(503, 'Live meeting pages are not switched on on this site.');
    const part = url.searchParams.get('part') === 'spp' ? 'spp' : 'shared';
    if (part === 'spp' && !spp) fail(404, 'Not found.');
    if (meeting.virtual) {
      if (!canEdit || !weeklyDayOpen(meeting.date)) fail(409, 'This meeting has not started yet.');
      const at = now();
      await db.batch([db.prepare('INSERT OR IGNORE INTO meetings(id, series, title, date, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(meeting.id, WEEKLY.series, WEEKLY.title, meeting.date, by, at, by, at), log(meeting.id, null, 'create', { weekly: meeting.date })]);
    }
    // Who this connection is, for the names on cursors: the real name, and the companies it is hidden from.
    const w = await loadWorld(), self = w.people.get(by);
    // Round 3: hiding is per person (the same rule as the rest of the site): the people this person may not see, and the
    // label each shows as for them ("SPP project staff", "Caltex contact"), grouped by label to keep it small.
    const hide = {};
    for (const p of w.people.values()) {
      if (p.id === by || P.canSeePerson(w, self, p)) continue;
      const label = P.displayPerson(w, self, p.id)?.name || 'SPP project staff';
      (hide[label] ||= []).push(p.id);
    }
    const room = env.MEETING_ROOMS.get(env.MEETING_ROOMS.idFromName(`${meeting.id}:${part}`));
    return room.fetch(new Request(`https://meeting-room/${encodeURIComponent(meeting.id)}/${part}`, { headers: {
      upgrade: 'websocket', 'x-calnkt-room': `${meeting.id}:${part}`, 'x-calnkt-user': JSON.stringify({ id: by, edit: canEdit, name: self?.name || '', hide }) } }));
  }

  if (!mm[2] && method === 'GET') {
    const n = await names();
    const items0 = (await db.prepare('SELECT * FROM meeting_items WHERE meeting_id=? AND deleted=0 ORDER BY sort, id').bind(meeting.id).all()).results
      .filter((i) => spp || i.kind !== 'spp_note');
    const items = await Promise.all(items0.map(async (i) => ({ id: i.id, kind: i.kind, text: i.text, notes: i.notes, ownerId: i.owner_id && (spp || (await canName(i.owner_id))) ? i.owner_id : null, owner: i.owner_id ? n[i.owner_id] || 'SPP project staff' : null, due: i.due, taskId: i.task_id, done: !!i.done,
        by: n[i.created_by] || '', at: i.created_at, updatedBy: n[i.updated_by] || '', updatedAt: i.updated_at })));
    const history = (await db.prepare('SELECT at, by_id, item_id, action FROM meeting_log WHERE meeting_id=? ORDER BY id DESC LIMIT 200').bind(meeting.id).all()).results
      .filter((h) => spp || !String(h.action).startsWith('spp_note'))
      .map((h) => ({ at: h.at, by: n[h.by_id] || '', action: h.action }));
    const docs = (await db.prepare('SELECT part, updated_at, editors_json FROM meeting_docs WHERE meeting_id=?').bind(meeting.id).all().catch(() => ({ results: [] }))).results
      .filter((x) => spp || x.part === 'shared').map((x) => ({ part: x.part, at: x.updated_at, by: JSON.parse(x.editors_json || '[]').map((id) => n[id] || '').filter(Boolean) }));
    return json({ canEdit, spp, live: !!env.MEETING_ROOMS, docs, meeting: { ...meeting, ...(spp ? {} : { created_by: undefined, updated_by: undefined }), createdBy: n[meeting.created_by] || '', updatedBy: n[meeting.updated_by] || '' }, items, history });
  }
  if (!mm[2] && method === 'POST') {
    const b = await body(request), at = now();
    const next = {
      title: 'title' in b ? text(b.title, 160, 'Title', true) : meeting.title,
      date: 'date' in b ? day(b.date, 'Date') || fail(400, 'Date is needed.') : meeting.date,
      time: 'time' in b ? text(b.time, 40, 'Time') : meeting.time,
      place: 'place' in b ? text(b.place, 160, 'Place') : meeting.place,
      attendees: 'attendees' in b ? text(b.attendees, 1000, 'Attendees') : meeting.attendees,
    };
    if (meeting.series && next.date !== meeting.date) fail(400, 'The weekly meeting keeps its Wednesday date. Add a separate meeting for another day.');
    await db.batch([db.prepare('UPDATE meetings SET title=?, date=?, time=?, place=?, attendees=?, updated_by=?, updated_at=? WHERE id=?').bind(next.title, next.date, next.time, next.place, next.attendees, by, at, meeting.id), log(meeting.id, null, 'update', next)]);
    return json({ ok: true });
  }
  if (mm[2] === 'delete' && !mm[3] && method === 'POST') {
    if (meeting.series) fail(400, 'Weekly meetings cannot be deleted. Leave the agenda empty if a week is skipped.');
    await db.batch([db.prepare('UPDATE meetings SET deleted=1, updated_by=?, updated_at=? WHERE id=?').bind(by, now(), meeting.id), log(meeting.id, null, 'delete', { title: meeting.title })]);
    return json({ ok: true });
  }

  if (mm[2] === 'items' && !mm[3] && method === 'POST') {
    const b = await body(request), at = now();
    const kind = String(b.kind || '');
    if (!['agenda', 'action', 'spp_note'].includes(kind)) fail(400, 'Unknown kind of item.');
    if (kind === 'spp_note' && !spp) fail(404, 'Not found.');
    const f = { text: text(b.text, 2000, 'Text', true), notes: text(b.notes, 8000, 'Notes'), owner: b.ownerId ? String(b.ownerId).slice(0, 40) : null, due: day(b.due, 'Due date') };
    if (f.owner && (!(await db.prepare('SELECT 1 FROM people WHERE id=? AND active=1').bind(f.owner).first()) || !(await canName(f.owner)))) fail(400, 'Unknown person.');
    const sort = ((await db.prepare('SELECT MAX(sort) AS s FROM meeting_items WHERE meeting_id=?').bind(meeting.id).first())?.s || 0) + 1;
    // Audit F10: the item and its history line are saved together, or neither is.
    const res = await db.batch([
      db.prepare('INSERT INTO meeting_items(meeting_id, kind, text, notes, owner_id, due, sort, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id')
        .bind(meeting.id, kind, f.text, f.notes, f.owner, f.due, sort, by, at, by, at),
      db.prepare('INSERT INTO meeting_log(at, by_id, meeting_id, item_id, action, data_json) VALUES(?,?,?,last_insert_rowid(),?,?)').bind(at, by, meeting.id, `${kind}:add`, JSON.stringify(kind === 'spp_note' ? {} : f)),
    ]);
    const first = Array.isArray(res[0]) ? res[0] : res[0]?.results; // D1 returns { results }, the local test stand-in an array
    const newId = first?.[0]?.id;
    return json({ id: newId }, 201);
  }
  if (mm[2] === 'items' && mm[3] && method === 'POST') {
    const item = await db.prepare('SELECT * FROM meeting_items WHERE id=? AND meeting_id=? AND deleted=0').bind(Number(mm[3]), meeting.id).first();
    if (!item || (item.kind === 'spp_note' && !spp)) fail(404, 'Item not found.');
    const at = now();
    if (mm[4]) {
      await db.batch([db.prepare('UPDATE meeting_items SET deleted=1, updated_by=?, updated_at=? WHERE id=?').bind(by, at, item.id), log(meeting.id, item.id, `${item.kind}:delete`, item.kind === 'spp_note' ? {} : { text: item.text })]);
      return json({ ok: true });
    }
    const b = await body(request);
    const next = {
      text: 'text' in b ? text(b.text, 2000, 'Text', true) : item.text,
      notes: 'notes' in b ? text(b.notes, 8000, 'Notes') : item.notes,
      owner_id: 'ownerId' in b ? (b.ownerId ? String(b.ownerId).slice(0, 40) : null) : item.owner_id,
      due: 'due' in b ? day(b.due, 'Due date') : item.due,
      task_id: 'taskId' in b ? (b.taskId ? String(b.taskId).slice(0, 40) : null) : item.task_id,
      done: 'done' in b ? (b.done ? 1 : 0) : item.done,
    };
    if (next.owner_id && next.owner_id !== item.owner_id && (!(await db.prepare('SELECT 1 FROM people WHERE id=? AND active=1').bind(next.owner_id).first()) || !(await canName(next.owner_id)))) fail(400, 'Unknown person.');
    if (next.task_id && next.task_id !== item.task_id && !(await db.prepare('SELECT 1 FROM tasks WHERE id=?').bind(next.task_id).first())) fail(400, 'Unknown task.');
    const changed = Object.keys(next).filter((k) => next[k] !== item[k]);
    if (!changed.length) return json({ ok: true, changed: false });
    await db.batch([
      db.prepare('UPDATE meeting_items SET text=?, notes=?, owner_id=?, due=?, task_id=?, done=?, updated_by=?, updated_at=? WHERE id=?').bind(next.text, next.notes, next.owner_id, next.due, next.task_id, next.done, by, at, item.id),
      log(meeting.id, item.id, `${item.kind}:update`, item.kind === 'spp_note' ? { fields: changed } : Object.fromEntries(changed.map((k) => [k, next[k]]))),
    ]);
    return json({ ok: true, changed: true });
  }
  fail(405, 'Method not allowed.');
}

/** Every live meeting page reconnects now (after any change to access: page levels, people, accounts, sign-out), so a
 *  person who lost access is cut off at once instead of at the hourly renewal. Reconnecting is invisible for everyone
 *  else (about a second; nothing typed is lost). */
export async function reconnectMeetingRooms(env) {
  if (!env.MEETING_ROOMS || !env.TASKS_DB) return 0;
  const rows = (await env.TASKS_DB.prepare('SELECT id FROM meetings').all()).results || [];
  let closed = 0;
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20).flatMap((r) => ['shared', 'spp'].map((part) => {
      const room = env.MEETING_ROOMS.get(env.MEETING_ROOMS.idFromName(`${r.id}:${part}`));
      return room.fetch(new Request('https://meeting-room/reconnect', { headers: { 'x-calnkt-reconnect': '1' } })).then((x) => x.text()).then((t) => { closed += Number(t) || 0; }).catch(() => {});
    }));
    await Promise.all(batch);
  }
  return closed;
}
