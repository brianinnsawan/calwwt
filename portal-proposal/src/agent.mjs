// Chief: Brian's AI assistant (Brian, 5 Nov 2026). Chief is not a person on the site. It uses a key Brian makes on the
// Admin page and acts AS Brian, with a short list of task actions only:
//   - read: Brian's tasks, requests and bell (GET /api/agent/state), recent meetings (GET /api/agent/meetings);
//   - write: create tasks (for Brian or SPP colleagues), comment, update progress / details / dates, add and tick checklist
//     steps, add people to a task.
// It can never: close, sign off, approve, return, reopen, hand off, share, unassign or delete; send or answer requests
// (to Caltex, KS, the land owner…; it makes Brian a task to do that instead); mark Brian's bell as read; or reach any
// other page (Admin, access, files, CAD, backups, schedule, account). Everyone else sees Brian; Brian alone sees
// "via Chief" in the history and under Admin → Chief. Keys: shown once, only a SHA-256 kept, 90 days, revocable.
import { taskService, TaskError } from '../../tasks/src/service.mjs';
import { requireAdminGate } from './admin-gate.mjs';
import { HttpError } from './auth.mjs';
import { weeklyDayOpen } from './meetings.mjs';

export const AGENT_NAME = 'Chief';
export const VIA = 'chief';
const KEY_PREFIX = 'calnkt_agent_';
const KEY_DAYS = 90, WINDOW_S = 900, MAX_PER_WINDOW = 300;
const TASK_ACTIONS = new Set(['update', 'progress', 'checklist_add', 'checklist_toggle', 'comment', 'assign']);
const NOT_ALLOWED = 'Chief cannot do that. Make Brian a task instead (for example "Send the request to Caltex about …").';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });
const fail = (status, message) => { throw new HttpError(status, message); };
const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function readJson(request, max = 64 * 1024) {
  const text = await request.text();
  if (text.length > max) fail(413, 'Too large.');
  try { return text ? JSON.parse(text) : {}; } catch { fail(400, 'Send JSON.'); }
}

const HELP = {
  name: AGENT_NAME,
  actsAs: 'Brian (everyone else sees Brian)',
  auth: 'Header: Authorization: Bearer <key>. Keys expire after 90 days; Brian can revoke them.',
  endpoints: {
    'GET /api/agent/state': "Brian's tasks, requests and bell (read only; reading does not mark anything as read).",
    'GET /api/agent/meetings': 'Recent meetings with the text of their pages (shared and SPP-only).',
    'POST /api/agent/tasks': 'Create a task. JSON: { title, assignees?: [personId], due?: "YYYY-MM-DD", start?, description?, checklist?: [text], priority?: urgent|high|normal|low, area?, category?, repeatDays?: [1..7] }. Assign only Brian or SPP colleagues.',
    'POST /api/agent/meetings/<meetingId>/notes': 'Add lines at the end of a meeting page (never changes or removes what is there). JSON: { part?: "shared" (default, everyone in the meeting) | "spp" (SPP only), lines: [{ type: "heading"|"paragraph"|"bullet"|"todo", text }] } (at most 30 lines of 1000 characters). Weekly meetings are "weekly-YYYY-MM-DD" (Wednesdays).',
    'POST /api/agent/tasks/<taskId>': 'Change a task. JSON: { action, ... } with action one of: update { version, fields: { title?, description?, due?, start?, followup?, priority?, status?: todo|doing|hold } }, progress { progress: 0-100 }, checklist_add { text }, checklist_toggle { itemId }, comment { body }, assign { person }.',
  },
  rules: [
    'Never send or answer requests to Caltex, KS Consulting or the land owner: create a task for Brian to do it.',
    'Never close, approve, delete or hand off tasks; Brian does that.',
    'Use the people ids from /api/agent/state (people[].id).',
  ],
};

/** Requests with an assistant key: /api/agent/* only. Returns a Response, or null for other paths. */
export async function routeAgent(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path !== '/api/agent' && !path.startsWith('/api/agent/')) return null;
  if (!env.TASKS_DB) fail(503, 'Not available on this site.');
  const db = env.TASKS_DB;
  const auth = request.headers.get('authorization') || '';
  const key = /^Bearer\s+(\S+)$/i.exec(auth)?.[1] || '';
  if (!key.startsWith(KEY_PREFIX)) fail(401, 'Send the assistant key: Authorization: Bearer <key>.');
  const row = await db.prepare('SELECT * FROM agent_keys WHERE key_hash=?').bind(await sha256(key)).first();
  const nowIso = new Date().toISOString();
  if (!row || row.revoked_at || row.expires_at < nowIso) fail(401, 'This key is not valid (wrong, expired or revoked).');
  const person = await db.prepare('SELECT id, active FROM people WHERE id=?').bind(row.person_id).first();
  if (!person?.active) fail(401, 'This key is not valid.');
  const win = Math.floor(Date.now() / 1000 / WINDOW_S);
  const hit = await db.prepare('INSERT INTO agent_hits(key_id, win, n) VALUES(?,?,1) ON CONFLICT(key_id, win) DO UPDATE SET n=n+1 RETURNING n').bind(row.id, win).first();
  if ((hit?.n || 0) > MAX_PER_WINDOW) fail(429, 'Too many requests; wait 15 minutes.');
  if (!row.last_used_at || Date.parse(nowIso) - Date.parse(row.last_used_at) > 60_000) await db.prepare('UPDATE agent_keys SET last_used_at=? WHERE id=?').bind(nowIso, row.id).run();

  const svc = taskService(db, { via: VIA });
  const me = row.person_id, method = request.method;
  try {
    if (path === '/api/agent' && method === 'GET') return json(HELP);
    if (path === '/api/agent/state' && method === 'GET') {
      const s = await svc.state(me);
      const { me: who, people, areas, categories, tasks, requests, notifications } = s;
      return json({ me: { id: who.id, name: who.name }, people: people.filter((p) => p.id).map((p) => ({ id: p.id, name: p.name, company: p.company, canAssign: !!p.canAssign })), areas, categories, tasks, requests, notifications });
    }
    if (path === '/api/agent/meetings' && method === 'GET') {
      const meetings = (await db.prepare('SELECT id, title, date FROM meetings WHERE deleted=0 ORDER BY date DESC LIMIT 12').all()).results;
      const out = [];
      for (const m of meetings) {
        const docs = (await db.prepare('SELECT part, text, updated_at FROM meeting_docs WHERE meeting_id=?').bind(m.id).all()).results;
        out.push({ ...m, pages: Object.fromEntries(docs.map((d) => [d.part, { text: d.text, updatedAt: d.updated_at }])) });
      }
      return json({ meetings: out });
    }
    const mn = /^\/api\/agent\/meetings\/([A-Za-z0-9-]{1,60})\/notes$/.exec(path);
    if (mn && method === 'POST') return json(await addMeetingNotes(env, svc, me, mn[1], await readJson(request)));
    if (path === '/api/agent/tasks' && method === 'POST') {
      const body = await readJson(request);
      if (body.kind && body.kind !== 'task') fail(403, NOT_ALLOWED);
      const r = await svc.createTask(me, { ...body, kind: undefined });
      return json(r, 201);
    }
    const m = /^\/api\/agent\/tasks\/([A-Za-z]{2}-\d{1,6})$/.exec(path);
    if (m && method === 'POST') {
      const body = await readJson(request);
      if (!TASK_ACTIONS.has(body.action)) fail(403, NOT_ALLOWED);
      if (body.action === 'update' && body.fields && Object.keys(body.fields).some((k) => !['title', 'description', 'due', 'start', 'followup', 'priority', 'status', 'area', 'category'].includes(k))) fail(403, NOT_ALLOWED);
      if (body.action === 'update' && body.fields?.status && !['todo', 'doing', 'hold'].includes(body.fields.status)) fail(403, NOT_ALLOWED);
      return json(await svc.taskAction(me, m[1], body));
    }
    fail(403, NOT_ALLOWED);
  } catch (e) {
    if (e instanceof TaskError) return json({ error: e.message, ...(e.details || {}) }, e.status || 400);
    throw e;
  }
  return null;
}

// Meeting notes (Brian, 5 Nov 2026): Chief adds lines at the end of a live meeting page, as Brian (who must have the
// Meetings page at "edit"). It cannot change or remove what is there. Recorded for Brian under "What Chief did".
const LINE_TYPES = new Set(['heading', 'paragraph', 'bullet', 'todo']);
async function addMeetingNotes(env, svc, me, id, body) {
  const db = env.TASKS_DB;
  if (!env.MEETING_ROOMS) fail(503, 'Live meeting pages are not switched on on this site.');
  const access = await svc.siteAccess(me);
  if (access.pages?.meetings !== 'edit') fail(403, 'Brian cannot edit meetings, so Chief cannot either.');
  const part = body.part === 'spp' ? 'spp' : 'shared';
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 30) fail(400, 'Send 1 to 30 lines.');
  const lines = body.lines.map((l) => {
    const text = String(l?.text ?? '').normalize('NFC').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' ').trim();
    if (!LINE_TYPES.has(l?.type) || !text || text.length > 1000) fail(400, 'Each line needs a type (heading, paragraph, bullet, todo) and 1 to 1000 characters of text.');
    return { type: l.type, text };
  });
  let meeting = await db.prepare('SELECT id, title, date FROM meetings WHERE id=? AND deleted=0').bind(id).first();
  const weekly = /^weekly-(\d{4}-\d{2}-\d{2})$/.exec(id)?.[1];
  if (!meeting && weekly && new Date(`${weekly}T00:00:00Z`).getUTCDay() === 3 && weeklyDayOpen(weekly)) {
    const at = new Date().toISOString();
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO meetings(id, series, title, date, created_by, created_at, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id, 'spp-caltex-weekly', 'SPP–Caltex weekly meeting', weekly, me, at, me, at),
      db.prepare('INSERT INTO meeting_log(at, by_id, meeting_id, item_id, action, data_json) VALUES(?,?,?,?,?,?)').bind(at, me, id, null, 'create', JSON.stringify({ weekly })),
    ]);
    meeting = await db.prepare('SELECT id, title, date FROM meetings WHERE id=? AND deleted=0').bind(id).first();
  }
  if (!meeting) fail(404, 'Meeting not found.');
  const room = env.MEETING_ROOMS.get(env.MEETING_ROOMS.idFromName(`${meeting.id}:${part}`));
  const r = await room.fetch(new Request(`https://meeting-room/${encodeURIComponent(meeting.id)}/${part}`, { method: 'POST',
    headers: { 'x-calnkt-append': '1', 'x-calnkt-room': `${meeting.id}:${part}`, 'content-type': 'application/json' }, body: JSON.stringify({ blocks: lines, by: me }) }));
  if (!r.ok) fail(r.status === 413 ? 413 : 502, r.status === 413 ? 'The meeting page is full.' : 'The meeting page could not be changed.');
  await db.prepare("INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) VALUES(NULL,NULL,?,?,'meeting_notes',?)")
    .bind(new Date().toISOString(), me, JSON.stringify({ meeting: meeting.id, title: meeting.title, date: meeting.date, part, lines: lines.length, via: VIA })).run();
  return { meeting: meeting.id, part, added: lines.length };
}

/** The owner's side (Admin → Chief): list, create and revoke keys; see what Chief did. Owner only. */
export async function routeAgentAdmin(request, env, actor, access) {
  const path = new URL(request.url).pathname;
  if (path !== '/api/agent-keys' && !path.startsWith('/api/agent-keys/') && path !== '/api/agent-activity') return null;
  // Only the one person named in CHIEF_OWNER (production/wrangler.jsonc: "brian"), and only while they are an admin.
  if (!env.CHIEF_OWNER || access?.person !== env.CHIEF_OWNER || !access.admin || access.viewAs) fail(404, 'Not found.');
  if (!env.TASKS_DB) fail(503, 'Not available on this site.');
  const db = env.TASKS_DB, me = access.person, method = request.method;
  if (method !== 'GET') {
    if (request.headers.get('origin') !== env.APP_ORIGIN || request.headers.get('x-requested-with') !== 'tasks') fail(403, 'Request blocked.');
    requireAdminGate(env, actor); // 2-step sign-in and a recent password check, like other admin changes
  }
  if (path === '/api/agent-keys' && method === 'GET') {
    const keys = (await db.prepare('SELECT id, name, created_at, expires_at, revoked_at, last_used_at FROM agent_keys WHERE person_id=? ORDER BY created_at DESC').bind(me).all()).results;
    return json({ keys, name: AGENT_NAME, days: KEY_DAYS });
  }
  if (path === '/api/agent-keys' && method === 'POST') {
    const bytes = crypto.getRandomValues(new Uint8Array(32)), key = KEY_PREFIX + b64url(bytes);
    const id = crypto.randomUUID(), at = new Date(), expires = new Date(at.getTime() + KEY_DAYS * 864e5);
    await db.batch([
      db.prepare('INSERT INTO agent_keys(id, person_id, name, key_hash, created_at, expires_at) VALUES(?,?,?,?,?,?)').bind(id, me, AGENT_NAME, await sha256(key), at.toISOString(), expires.toISOString()),
      db.prepare("INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) VALUES(NULL,NULL,?,?,'agent_key',?)").bind(at.toISOString(), me, JSON.stringify({ key: id, made: true })),
    ]);
    return json({ id, key, expiresAt: expires.toISOString() }, 201); // the only time the key is shown
  }
  const rv = /^\/api\/agent-keys\/([0-9a-f-]{36})\/revoke$/.exec(path);
  if (rv && method === 'POST') {
    const at = new Date().toISOString();
    const r = await db.prepare('UPDATE agent_keys SET revoked_at=? WHERE id=? AND person_id=? AND revoked_at IS NULL').bind(at, rv[1], me).run();
    if (!r.meta?.changes && !r.changes) fail(404, 'Key not found or already revoked.');
    await db.prepare("INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) VALUES(NULL,NULL,?,?,'agent_key',?)").bind(at, me, JSON.stringify({ key: rv[1], revoked: true })).run();
    return json({ id: rv[1], revoked: true });
  }
  if (path === '/api/agent-activity' && method === 'GET') {
    const rows = (await db.prepare(`SELECT e.at, e.kind, e.task_id, e.data_json, t.title FROM events e LEFT JOIN tasks t ON t.id = e.task_id
      WHERE e.by_id = ? AND json_extract(e.data_json, '$.via') = ? ORDER BY e.id DESC LIMIT 300`).bind(me, VIA).all()).results;
    return json({ activity: rows.map((r) => ({ at: r.at, kind: r.kind, taskId: r.task_id, title: r.title || '', data: JSON.parse(r.data_json || '{}') })) });
  }
  fail(405, 'Method not allowed.');
}
