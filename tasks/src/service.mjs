import { PAGES, PAGE_IDS, LEVELS, ACCESS_GROUPS, DEFAULT_PAGE_ACCESS, ADMIN_FLOOR, accessTable, levelsFor, groupOf, pageById, atLeast } from './pages.mjs';
// Task service: loads data from D1, enforces policy.mjs on every read and write,
// and returns per-viewer projections (names masked, private parts removed).
import * as P from './policy.mjs';
import { buildWorld } from './world.mjs';
import { PARTNER_DIRECTORY, PARTNER_PEERS } from './roster.mjs';

/** ISO weekday of a YYYY-MM-DD date as a digit: '1' = Monday … '7' = Sunday. */
export const isoDay = (d) => String(((new Date(`${String(d).slice(0, 10)}T00:00:00Z`).getUTCDay() + 6) % 7) + 1);
export class TaskError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const deny = (msg = 'You do not have access to this.') => { throw new TaskError(403, msg); };
const notFound = () => { throw new TaskError(404, 'Not found.'); };
const bad = (msg) => { throw new TaskError(400, msg); };

const STATUSES = ['todo', 'doing', 'hold', 'review', 'done'];
const OPEN_STATUSES = ['todo', 'doing', 'hold'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MENTION = /@([A-Za-z][\w.]*)/g;
const norm = (s) => String(s).toLowerCase().replace(/[.\s_-]/g, '');
const str = (v, max, name) => {
  if (v == null) return '';
  if (typeof v !== 'string') bad(`${name} must be text.`);
  const t = v.trim();
  if (t.length > max) bad(`${name} is too long (max ${max} characters).`);
  return t;
};
const date = (v, name) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !DATE.test(v) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v) bad(`${name} must be a real date (YYYY-MM-DD).`);
  return v;
};

// via: set when an assistant acts for the person (portal-proposal/src/agent.mjs); every event it causes carries it.
export function taskService(db, { now = () => new Date().toISOString(), via = null } = {}) {
  const q = (sql, ...args) => db.prepare(sql).bind(...args);
  const all = async (sql, ...args) => (await q(sql, ...args).all()).results;
  const first = (sql, ...args) => q(sql, ...args).first();

  // ---------- loading ----------
  let worldCache = null; // one load per request; people/reporting lines rarely change
  function loadWorld() { return (worldCache ||= loadWorldFresh()); }
  async function loadWorldFresh() {
    const [people, reports, follows, contacts, settings] = await Promise.all([
      all('SELECT * FROM people'),
      all('SELECT person_id, boss_id FROM reports_to'),
      all('SELECT person_id, followed_id FROM follows'),
      all('SELECT sender_id, recipient_id FROM request_contacts'),
      all('SELECT key, value_json FROM settings'),
    ]);
    const set = Object.fromEntries(settings.map((s) => [s.key, JSON.parse(s.value_json)]));
    return buildWorld({
      people: people.map(rowToPerson),
      reportsTo: reports.map((r) => [r.person_id, r.boss_id]),
      follows: follows.map((r) => [r.person_id, r.followed_id]),
      contacts: contacts.map((r) => [r.sender_id, r.recipient_id]),
      partnerDirectory: set.partnerDirectory || PARTNER_DIRECTORY,
      partnerPeers: set.partnerPeers || PARTNER_PEERS,
    });
  }

  // Page access (none / view / edit). Before schema 0004 is applied the table is missing; then the defaults apply.
  // Read once per request, like the world above (site audit, 10 Nov 2026: one page view read this table up to three
  // times). adminSetPage clears it, so the state sent back after a change is the new one. A failed read is not kept.
  let pageRowsCache = null;
  function loadPageRows() { return (pageRowsCache ||= loadPageRowsFresh().catch((e) => { pageRowsCache = null; throw e; })); }
  async function loadPageRowsFresh() {
    // Audit F05: if the access settings cannot be read, refuse (503) instead of falling back to the defaults,
    // which could reopen a page an admin has switched off for someone.
    try { return await all('SELECT subject, page, level FROM page_access'); } catch { throw new TaskError(503, 'Access settings could not be loaded. Please try again in a moment.'); }
  }
  async function siteAccess(personId) {
    // The access settings are asked for at the same moment as the world, not after it (one wait instead of two).
    // As before, a failure to read them only matters for a real, active person.
    const pageRows = loadPageRows().then((rows) => ({ rows }), (error) => ({ error }));
    const world = await loadWorld();
    const p = personId && world.people.get(personId);
    if (!p || !p.active) return { person: null, pages: levelsFor(null), accessAdmin: false, accessView: false };
    const loaded = await pageRows;
    if (loaded.error) throw loaded.error;
    const table = accessTable(loaded.rows);
    return { person: p.id, pages: levelsFor(p, table), accessAdmin: P.isAdmin(p), accessView: P.isAdmin(p) }; // Admin page: admins only (Brian, 1 Nov 2026)
  }
  async function adminSetPage(actorId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.isAdmin(me)) deny('Only admins can change page access.');
    const subject = String(v.subject || ''), page = String(v.page || '');
    const def = pageById(page) || bad('Unknown page.');
    const [kind, id] = subject.split(':');
    let person = null;
    if (kind === 'group') { if (!ACCESS_GROUPS.some((g) => g.id === id)) bad('Unknown group.'); }
    else if (kind === 'person') person = world.people.get(id) || notFound();
    else bad('Unknown group or person.');
    const level = v.level ?? null;
    if (level === null && kind === 'group') bad('Choose none, view or edit for a group.');
    if (level !== null && !def.levels.includes(level)) bad('That level is not available for this page.');
    if (person && person.level === 'admin' && level !== null && !atLeast(level, ADMIN_FLOOR[page])) bad('Admins always keep at least view on every page.');
    if (person && person.level === 'observer' && level === 'edit') bad('Observers can only view.');
    const at = now();
    const isDefault = level === null || (kind === 'group' && DEFAULT_PAGE_ACCESS[id][page] === level);
    await db.batch([
      isDefault ? q('DELETE FROM page_access WHERE subject=? AND page=?', subject, page)
        : q('INSERT INTO page_access(subject, page, level, updated_by, updated_at) VALUES(?,?,?,?,?) ON CONFLICT(subject, page) DO UPDATE SET level=excluded.level, updated_by=excluded.updated_by, updated_at=excluded.updated_at', subject, page, level, me.id, at),
      q('INSERT INTO page_access_log(subject, page, level, changed_by, changed_at) VALUES(?,?,?,?,?)', subject, page, level, me.id, at),
    ]);
    pageRowsCache = null;
    return { subject, page, level };
  }
  async function pageAdminView(world) {
    const table = accessTable(await loadPageRows());
    let log = [];
    try { log = await all('SELECT subject, page, level, changed_by AS "by", changed_at AS at FROM page_access_log ORDER BY id DESC LIMIT 100'); } catch { /* before schema 0004 */ }
    const changes = await all("SELECT by_id AS \"by\", at, kind, data_json FROM events WHERE kind IN ('person_changed','view_as','backup_download','backup_run') ORDER BY id DESC LIMIT 100");
    return {
      pages: PAGES, levels: LEVELS,
      groups: ACCESS_GROUPS.map((g) => ({ ...g, pages: table.groups[g.id], defaults: DEFAULT_PAGE_ACCESS[g.id] })),
      people: [...world.people.values()].map((p) => ({ id: p.id, group: groupOf(p), overrides: table.people[p.id] || {}, pages: levelsFor(p, table), admin: p.level === 'admin', observer: p.level === 'observer' })),
      log,
      personChanges: changes.map((c) => ({ by: c.by, at: c.at, kind: c.kind, ...JSON.parse(c.data_json || '{}') })),
    };
  }

  async function loadTasks(where = 'deleted=0', ...args) {
    const rows = await all(`SELECT * FROM tasks WHERE ${where} ORDER BY id`, ...args);
    if (!rows.length) return [];
    // The same tasks again as a sub-select, not as a list of their ids: the database (D1) takes at most 100 values in
    // one query, so a list of ids stopped working at 101 tasks (site audit, 10 Nov 2026).
    const these = `(SELECT id FROM tasks WHERE ${where})`;
    const [tp, cl, cm, ev] = await Promise.all([
      all(`SELECT * FROM task_people WHERE task_id IN ${these}`, ...args),
      all(`SELECT * FROM checklist WHERE deleted=0 AND task_id IN ${these} ORDER BY position`, ...args),
      all(`SELECT * FROM comments WHERE task_id IN ${these} ORDER BY at, id`, ...args),
      all(`SELECT * FROM events WHERE task_id IN ${these} ORDER BY id`, ...args),
    ]);
    const by = (list, key) => { const m = new Map(); for (const x of list) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); } return m; };
    const tpm = by(tp, 'task_id'), clm = by(cl, 'task_id'), cmm = by(cm, 'task_id'), evm = by(ev, 'task_id');
    return rows.map((r) => rowToTask(r, tpm.get(r.id) || [], clm.get(r.id) || [], cmm.get(r.id) || [], evm.get(r.id) || []));
  }
  async function loadTask(id) {
    const [t] = await loadTasks('id=? AND deleted=0', id);
    return t || notFound();
  }
  async function loadRequests(where = '1=1', ...args) {
    const rows = await all(`SELECT * FROM requests WHERE ${where} ORDER BY id`, ...args);
    if (!rows.length) return [];
    const these = `(SELECT id FROM requests WHERE ${where})`; // not a list of ids: at most 100 values per query (see loadTasks)
    const msgs = await all(`SELECT * FROM request_messages WHERE request_id IN ${these} ORDER BY id`, ...args);
    const evs = await all(`SELECT * FROM events WHERE request_id IN ${these} ORDER BY id`, ...args);
    return rows.map((r) => ({
      id: r.id, senderId: r.sender_id, recipientId: r.recipient_id, title: r.title, message: r.message,
      area: r.area, category: r.category, due: r.due_date, status: r.status, followupTaskId: r.followup_task_id,
      createdAt: r.created_at, updatedAt: r.updated_at, version: r.version,
      messages: msgs.filter((m) => m.request_id === r.id), events: evs.filter((e) => e.request_id === r.id),
    }));
  }

  async function actor(world, actorId) {
    const me = world.people.get(actorId);
    if (!me || !me.active) deny('Your account is not set up for the task app. Ask Brian or Ming.');
    return me;
  }

  // ---------- projection ----------
  function maskText(world, viewer, text, context) {
    return String(text || '').replace(MENTION, (m, h) => {
      const p = findPerson(world, h);
      if (!p) return m;
      return `@${P.displayPerson(world, viewer, p.id, context).name}`;
    });
  }
  function projectTask(world, viewer, t) {
    const ctx = P.participants(t);
    const show = (id) => (id ? P.displayPerson(world, viewer, id, ctx) : null);
    const sppViewer = P.isSppSide(viewer);
    const progress = t.autoProgress && t.checklist.length ? Math.round((100 * t.checklist.filter((c) => c.done).length) / t.checklist.length) : t.progress;
    return {
      id: t.id, kind: t.kind, title: maskText(world, viewer, t.title, ctx), description: maskText(world, viewer, t.description, ctx),
      area: t.area, category: t.category, status: t.status, priority: t.priority,
      start: t.start, due: t.due, followup: t.followup, progress, autoProgress: t.autoProgress, repeat: t.repeat, repeatDays: t.repeatDays,
      creator: show(t.creatorId), lead: show(t.leadId),
      assignees: t.assignees.map(show), shared: t.shared.map(show),
      checklist: t.checklist.map((c) => ({ id: c.id, text: maskText(world, viewer, c.text, ctx), done: c.done })),
      comments: t.comments.map((c) => ({ id: c.id, by: show(c.by), at: c.at, body: maskText(world, viewer, c.body, ctx) })),
      history: t.events.map((e) => projectEvent(world, viewer, e, ctx)),
      createdAt: t.createdAt, updatedAt: t.updatedAt, closedAt: t.closedAt, closedBy: show(t.closedBy),
      parentId: t.parentId, requestId: sppViewer ? t.requestId : null, version: t.version,
      can: {
        edit: P.canEditTask(world, viewer, t), comment: P.canComment(world, viewer, t),
        close: P.canClose(world, viewer, t) && t.status !== 'done', reopen: P.canClose(world, viewer, t) && t.status === 'done',
        manage: P.canManageTask(world, viewer, t),
        handoff: P.canEditTask(world, viewer, t) && t.assignees.includes(viewer.id),
      },
    };
  }
  function projectEvent(world, viewer, e, ctx) {
    const data = JSON.parse(e.data_json || '{}');
    const out = { at: e.at, by: P.displayPerson(world, viewer, e.by_id, ctx), kind: e.kind };
    for (const [k, v] of Object.entries(data)) {
      if (k === 'person' || k === 'to' || k === 'from') out[k] = P.displayPerson(world, viewer, v, ctx);
      else if (k === 'note' && P.isPartner(viewer)) continue;
      // "via Chief" (an assistant acting for someone) is shown only to that someone; to everyone else it was just them.
      else if (k === 'via') { if (viewer.id === e.by_id) out.via = v; continue; }
      // Audit F04: free text in history (checklist text, reasons, titles) gets the same name masking as the task itself.
      else out[k] = typeof v === 'string' ? maskText(world, viewer, v, ctx) : v;
    }
    return out;
  }
  function projectRequest(world, viewer, r, tasksById) {
    const ctx = [r.senderId, r.recipientId];
    const show = (id) => P.displayPerson(world, viewer, id, ctx);
    const out = {
      id: r.id, title: maskText(world, viewer, r.title, ctx), message: maskText(world, viewer, r.message, ctx), area: r.area, category: r.category, due: r.due, status: r.status,
      sender: show(r.senderId), recipient: show(r.recipientId), createdAt: r.createdAt, updatedAt: r.updatedAt, version: r.version,
      messages: r.messages.map((m) => ({ by: show(m.by_id), at: m.at, body: maskText(world, viewer, m.body, ctx) })),
      history: r.events.map((e) => projectEvent(world, viewer, e, ctx)),
      can: {
        reply: P.canReplyRequest(world, viewer, r), answer: P.canAnswerRequest(world, viewer, r),
        close: P.canCloseRequest(world, viewer, r) && r.status !== 'closed',
        reopen: P.canCloseRequest(world, viewer, r) && r.status === 'closed',
      },
    };
    if (P.isSppSide(viewer)) {
      const f = tasksById.get(r.followupTaskId);
      out.followupTaskId = f && P.canSeeTask(world, viewer, f) ? f.id : null;
    }
    return out;
  }

  // ---------- reads ----------
  async function state(actorId, { readOnly = false } = {}) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    const [tasks, requests, notes, areas, categories] = await Promise.all([
      loadTasks(), loadRequests(),
      all('SELECT * FROM notifications WHERE to_id=? ORDER BY id DESC LIMIT 100', me.id),
      all('SELECT id, name FROM areas ORDER BY position'),
      all('SELECT id, name, archived FROM categories ORDER BY position, name'),
    ]);
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    const reqById = new Map(requests.map((r) => [r.id, r]));
    const visibleTasks = tasks.filter((t) => P.canSeeTask(world, me, t));
    const visibleRequests = requests.filter((r) => P.canSeeRequest(world, me, r));
    const directory = [...world.people.values()].filter((p) => P.canSeePerson(world, me, p) && (p.active || P.seesAll(me)))
      .map((p) => ({ ...P.displayPerson(world, me, p.id), canAssign: P.canAssign(world, me, p), canRequest: P.canRequest(world, me, p), aliases: P.canSeePerson(world, me, p) ? p.aliases : [] }));
    const notifications = [];
    for (const n of notes) {
      const t = n.task_id ? tasksById.get(n.task_id) : null, r = n.request_id ? reqById.get(n.request_id) : null;
      if (t && (t.deleted || !P.canSeeTask(world, me, t))) continue;
      if (r && !P.canSeeRequest(world, me, r)) continue;
      const ctx = t ? P.participants(t) : r ? [r.senderId, r.recipientId] : [];
      const data = JSON.parse(n.data_json || '{}');
      if (data.person) data.person = P.displayPerson(world, me, data.person, ctx);
      notifications.push({ id: n.id, kind: n.kind, from: n.from_id ? P.displayPerson(world, me, n.from_id, ctx) : null, taskId: n.task_id, requestId: n.request_id, title: maskText(world, me, t?.title || r?.title || '', ctx), data, at: n.at, read: !!n.read });
    }
    const out = {
      me: { ...P.displayPerson(world, me, me.id), level: me.level, company: me.company, lang: me.language || 'th',
        can: { create: P.canCreate(me), admin: P.isAdmin(me), viewAdmin: P.isAdmin(me), seesAll: P.seesAll(me), closeAny: P.isManagerOrAdmin(me), addCategory: P.canCreate(me) && P.isSppSide(me) },
        crew: [...P.crewOf(world, me.id)], watching: [...P.watchedBy(world, me.id)],
        reportsTo: (world.reportsTo.get(me.id) || []).filter((id) => P.canSeePerson(world, me, world.people.get(id))) },
      people: directory, areas, categories: categories.filter((c) => !c.archived || P.seesAll(me)),
      tasks: visibleTasks.map((t) => projectTask(world, me, t)),
      requests: visibleRequests.map((r) => projectRequest(world, me, r, tasksById)),
      notifications,
    };
    const pages = levelsFor(me, accessTable(await loadPageRows()));
    out.me.pages = pages;
    // Tasks page at "view": read-only task app (the API refuses changes too).
    if (pages.tasks === 'view' || readOnly) {
      out.me.readOnly = true;
      for (const k of Object.keys(out.me.can)) if (k !== 'seesAll' && k !== 'viewAdmin') out.me.can[k] = false;
      for (const t of out.tasks) for (const k of Object.keys(t.can || {})) t.can[k] = false;
      for (const r of out.requests) for (const k of Object.keys(r.can || {})) r.can[k] = false;
      for (const p of out.people) { p.canAssign = false; p.canRequest = false; }
    }
    // People, logins and access settings: admins only (Brian, 1 Nov 2026).
    if (P.isAdmin(me)) out.admin = { ...adminView(world), pageAccess: await pageAdminView(world) };
    return out;
  }

  function adminView(world) {
    return {
      people: [...world.people.values()].map((p) => ({ ...p, reportsTo: world.reportsTo.get(p.id) || [], follows: world.follows.get(p.id) || [], requestContacts: world.contacts.get(p.id) || [] })),
      partnerDirectory: world.partnerDirectory,
    };
  }

  // ---------- writes ----------
  async function nextId(prefix) {
    const row = await first('UPDATE counters SET value=value+1 WHERE name=? RETURNING value', prefix);
    if (!row) bad('Counter missing.');
    return `${prefix}-${String(row.value).padStart(3, '0')}`;
  }
  const ev = (taskId, requestId, by, kind, data = {}) =>
    q('INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) VALUES(?,?,?,?,?,?)', taskId, requestId, now(), by, kind, JSON.stringify(via ? { ...data, via } : data));
  const note = (to, from, kind, { taskId = null, requestId = null, data = {} } = {}) =>
    q('INSERT INTO notifications(to_id, from_id, kind, task_id, request_id, data_json, at) VALUES(?,?,?,?,?,?,?)', to, from, kind, taskId, requestId, JSON.stringify(data), now());

  /** Notify people `actor` reports to (and safety-report receivers for safety items). */
  function upline(world, me, kind, { taskId = null, requestId = null, category = '', skip = [] } = {}) {
    const ids = new Set(world.reportsTo.get(me.id) || []);
    if (!ids.size) return [];
    if (category === 'safety') for (const p of world.people.values()) if (p.safetyReports && p.active) ids.add(p.id);
    const out = [];
    for (const id of ids) {
      const p = world.people.get(id);
      if (!p?.active || p.quiet || id === me.id || skip.includes(id)) continue;
      out.push(note(id, me.id, 'upline', { taskId, requestId, data: { what: kind, safety: category === 'safety' } }));
    }
    return out;
  }

  function cleanFields(v, { partial }) {
    const out = {};
    const has = (k) => Object.prototype.hasOwnProperty.call(v, k);
    if (!partial || has('title')) { out.title = str(v.title, 300, 'Title'); if (!out.title) bad('Title is required.'); }
    if (has('description')) out.description = str(v.description, 8000, 'Details');
    if (has('area')) out.area = str(v.area, 40, 'Area');
    if (has('category')) out.category = str(v.category, 40, 'Bucket');
    if (has('priority')) { if (!PRIORITIES.includes(v.priority)) bad('Unknown priority.'); out.priority = v.priority; }
    if (has('status')) { if (!OPEN_STATUSES.includes(v.status)) bad('Use the complete/sign-off actions to finish a task.'); out.status = v.status; }
    if (has('start')) out.start_date = date(v.start, 'Start');
    if (has('due')) out.due_date = date(v.due, 'Due');
    if (has('followup')) out.followup_date = date(v.followup, 'Follow-up');
    if (has('progress')) { const n = Number(v.progress); if (!Number.isInteger(n) || n < 0 || n > 100) bad('Progress must be 0–100.'); out.progress = n; }
    if (has('autoProgress')) out.auto_progress = v.autoProgress ? 1 : 0;
    if (has('repeat')) { if (!['', 'weekly'].includes(v.repeat)) bad('Unknown repeat.'); out.repeat = v.repeat; if (!v.repeat) out.repeat_days = ''; }
    // Repeat on chosen weekdays (5 Nov 2026): ISO numbers 1 = Monday … 7 = Sunday; [] = does not repeat.
    if (has('repeatDays')) {
      if (!Array.isArray(v.repeatDays) || v.repeatDays.some((x) => !Number.isInteger(x) || x < 1 || x > 7)) bad('Repeat days must be weekdays 1 (Monday) to 7 (Sunday).');
      out.repeat_days = [...new Set(v.repeatDays)].sort().join('');
      out.repeat = out.repeat_days ? 'weekly' : '';
    }
    return out;
  }
  async function checkRefs(fields) {
    if (fields.area && !(await first('SELECT 1 FROM areas WHERE id=?', fields.area))) bad('Unknown area.');
    if (fields.category && !(await first('SELECT 1 FROM categories WHERE id=? AND archived=0', fields.category))) bad('Unknown bucket.');
  }
  function checkAssignees(world, me, ids) {
    if (!Array.isArray(ids)) bad('Assignees must be a list.');
    const uniq = [...new Set(ids)];
    if (uniq.length > 20) bad('Too many assignees.');
    for (const id of uniq) {
      const p = world.people.get(id);
      if (!p || !P.canAssign(world, me, p)) {
        if (p && P.isSppSide(me) && P.isPartner(p) && P.canSeePerson(world, me, p)) throw new TaskError(409, `${p.name} is outside SPP. Send them a request instead.`);
        throw new TaskError(403, 'You cannot assign that person.');
      }
    }
    return uniq;
  }

  /** Mentions in text: notify people who can see the task; share SPP colleagues in when allowed. */
  function mentionStatements(world, me, t, text, statements, warnings) {
    const seen = new Set();
    for (const [, h] of String(text).matchAll(MENTION)) {
      const p = findPerson(world, h);
      if (!p || p.id === me.id || seen.has(p.id)) continue;
      seen.add(p.id);
      if (!P.canSeePerson(world, me, p)) { warnings.push(`No one called “${h}” in your contacts.`); continue; }
      if (!P.canSeeTask(world, p, t)) {
        // Night audit (2 Nov 2026): only people working on the task (owner, manager, admin, the lead or an assignee) bring a
        // colleague in by @mention; someone the task was only shared with cannot widen who sees it.
        const onTask = P.canManageTask(world, me, t) || t.leadId === me.id || (t.assignees || []).includes(me.id);
        if (P.isSppSide(me) && P.isSppSide(p) && P.canAssign(world, me, p) && onTask) {
          statements.push(q('INSERT OR IGNORE INTO task_people(task_id, person_id, role) VALUES(?,?,?)', t.id, p.id, 'shared'));
          statements.push(ev(t.id, null, me.id, 'shared', { person: p.id }));
          t.shared.push(p.id);
          warnings.push(`${p.name} was added to “Shared with” so they can see this task.`);
        } else { warnings.push(`${p.name} can't see this task. Ask the task's owner to share it.`); continue; }
      }
      statements.push(note(p.id, me.id, 'mentioned', { taskId: t.id }));
    }
  }

  async function createTask(actorId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.canCreate(me)) deny('Your account can look but not make changes.');
    const f = cleanFields(v, { partial: false });
    f.area = f.area || 'misc';
    f.category = f.category || (P.isPartner(me) ? 'client' : 'general');
    if (f.start_date && f.due_date && f.due_date < f.start_date) bad('The due date is before the start date.');
    await checkRefs(f);
    let assignees = checkAssignees(world, me, v.assignees || []);
    if (!assignees.length) assignees = [me.id];
    const lead = v.lead && assignees.includes(v.lead) ? v.lead : assignees[0];
    if (v.parentId) {
      const parent = await loadTask(v.parentId);
      if (!P.canEditTask(world, me, parent)) deny('You cannot add sub-tasks to that task.');
    }
    const id = await nextId('CP');
    const at = now();
    const checklist = Array.isArray(v.checklist) ? v.checklist.map((s) => str(s, 500, 'Checklist item')).filter(Boolean).slice(0, 100) : [];
    const st = [
      q(`INSERT INTO tasks(id, kind, title, description, area, category, status, priority, start_date, due_date, followup_date, progress, auto_progress, creator_id, lead_id, parent_id, repeat, repeat_days, series_id, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id, 'task', f.title, f.description || '', f.area, f.category, f.status || 'todo', f.priority || 'normal',
        f.start_date ?? null, f.due_date ?? null, f.followup_date ?? null, f.progress || 0, checklist.length ? 1 : 0,
        me.id, lead, v.parentId || null, f.repeat_days ? 'weekly' : f.repeat === 'weekly' ? 'weekly' : '',
        f.repeat_days ?? (f.repeat === 'weekly' ? isoDay(f.due_date || f.start_date || at.slice(0, 10)) : ''),
        f.repeat_days || f.repeat === 'weekly' ? id : null, at, at),
      ...assignees.map((a) => q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', id, a, 'assignee')),
      ...checklist.map((text, i) => q('INSERT INTO checklist(id, task_id, text, position) VALUES(?,?,?,?)', `${id}-${i + 1}`, id, text, i + 1)),
      ev(id, null, me.id, 'created', {}),
      ...assignees.filter((a) => a !== me.id).map((a) => note(a, me.id, 'assigned', { taskId: id })),
      ...upline(world, me, 'created', { taskId: id, category: f.category, skip: assignees }),
    ];
    const t = { id, kind: 'task', creatorId: me.id, leadId: lead, assignees, shared: [], status: 'todo' };
    const warnings = [];
    if (f.description) mentionStatements(world, me, t, f.description, st, warnings);
    await db.batch(st);
    return { id, warnings };
  }

  async function taskAction(actorId, id, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    const t = await loadTask(id);
    if (!P.canSeeTask(world, me, t)) notFound();
    if (!P.canCreate(me)) deny('Your account can look but not make changes.');
    const a = v.action;
    const st = [], warnings = [];
    const at = now();
    const versioned = ['update', 'submit', 'approve', 'return', 'reopen', 'handoff', 'delete'];
    if (!P.canEditTask(world, me, t) && !P.canClose(world, me, t) && !P.canComment(world, me, t)) deny('You can see this task but cannot change it.');
    if (versioned.includes(a) && (P.canEditTask(world, me, t) || P.canClose(world, me, t)) && v.version !== t.version) throw new TaskError(409, 'Someone else changed this task. Reload and try again.', { version: t.version });
    const bump = (sets = {}) => {
      const cols = Object.keys(sets);
      return q(`UPDATE tasks SET ${cols.map((c) => `${c}=?, `).join('')}updated_at=?, version=version+1 WHERE id=?`, ...cols.map((c) => sets[c]), at, t.id);
    };
    const needEdit = () => { if (!P.canEditTask(world, me, t)) deny('You can see this task but cannot change it.'); };
    const needClose = () => { if (!P.canClose(world, me, t)) deny('Only the owner, a manager or admin, or a lead can do this.'); };
    const others = (ids) => [...new Set(ids)].filter((x) => x && x !== me.id);

    switch (a) {
      case 'update': {
        needEdit();
        const f = cleanFields(v.fields || {}, { partial: true });
        if (!Object.keys(f).length) bad('Nothing to change.');
        await checkRefs(f);
        if (f.status && t.status === 'review') bad('This task is waiting for sign-off.');
        { const s0 = f.start_date !== undefined ? f.start_date : t.start, d0 = f.due_date !== undefined ? f.due_date : t.due; if (s0 && d0 && d0 < s0) bad('The due date is before the start date.'); }
        if (f.repeat === 'weekly' && f.repeat_days === undefined && !t.repeatDays) f.repeat_days = isoDay(f.due_date || t.due || t.start || at.slice(0, 10));
        if (f.repeat_days && !t.seriesId) f.series_id = t.id;
        st.push(bump(f), ev(t.id, null, me.id, 'updated', { fields: Object.keys(f).filter((k) => k !== 'series_id') }));
        if (f.description) mentionStatements(world, me, t, f.description, st, warnings);
        break;
      }
      case 'progress': {
        needEdit();
        const f = cleanFields({ progress: v.progress }, { partial: true });
        const sets = { progress: f.progress };
        if (t.status === 'todo' && f.progress > 0) sets.status = 'doing';
        st.push(bump(sets), ev(t.id, null, me.id, 'progress', { value: f.progress }));
        break;
      }
      case 'checklist_add': {
        needEdit();
        const text = str(v.text, 500, 'Checklist item');
        if (!text) bad('Write the step first.');
        const pos = (t.checklist.at(-1)?.position || 0) + 1;
        st.push(q('INSERT INTO checklist(id, task_id, text, position) VALUES(?,?,?,?)', `${t.id}-${Date.now().toString(36)}${pos}${crypto.randomUUID().slice(0, 4)}`, t.id, text, pos));
        if (!t.checklist.length) st.push(bump({ auto_progress: 1 }));
        else st.push(bump());
        st.push(ev(t.id, null, me.id, 'checklist_add', { text }));
        mentionStatements(world, me, t, text, st, warnings);
        break;
      }
      case 'checklist_toggle': case 'checklist_delete': {
        needEdit();
        const item = t.checklist.find((c) => c.id === v.itemId);
        if (!item) notFound();
        if (a === 'checklist_toggle') {
          st.push(q('UPDATE checklist SET done=? WHERE id=?', v.done ? 1 : 0, item.id));
          st.push(bump(t.status === 'todo' && v.done ? { status: 'doing' } : {}));
          st.push(ev(t.id, null, me.id, v.done ? 'checklist_done' : 'checklist_undone', { text: item.text }));
        } else {
          st.push(q('UPDATE checklist SET deleted=1 WHERE id=?', item.id), bump(), ev(t.id, null, me.id, 'checklist_delete', { text: item.text }));
        }
        break;
      }
      case 'comment': {
        if (!P.canComment(world, me, t)) deny();
        const body = str(v.body, 4000, 'Comment');
        if (!body) bad('Write something first.');
        st.push(q('INSERT INTO comments(id, task_id, by_id, at, body) VALUES(?,?,?,?,?)', `${t.id}-c${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`, t.id, me.id, at, body));
        st.push(bump(), ev(t.id, null, me.id, 'commented', {}));
        const mentioned = new Set([...body.matchAll(MENTION)].map((m) => findPerson(world, m[1])?.id).filter(Boolean));
        mentionStatements(world, me, t, body, st, warnings);
        for (const id of others([t.creatorId, ...t.assignees])) if (!mentioned.has(id)) st.push(note(id, me.id, 'commented', { taskId: t.id }));
        if (t.category === 'safety') st.push(...upline(world, me, 'commented', { taskId: t.id, category: 'safety', skip: [t.creatorId, ...t.assignees] }));
        break;
      }
      case 'assign': {
        needEdit();
        const [pid] = checkAssignees(world, me, [v.person]);
        if (t.assignees.includes(pid)) bad('Already assigned.');
        st.push(q('DELETE FROM task_people WHERE task_id=? AND person_id=?', t.id, pid));
        st.push(q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', t.id, pid, 'assignee'));
        st.push(bump(t.leadId ? {} : { lead_id: pid }), ev(t.id, null, me.id, 'assigned', { person: pid }));
        if (pid !== me.id) st.push(note(pid, me.id, 'assigned', { taskId: t.id })); // adding yourself needs no bell
        break;
      }
      case 'unassign': {
        needEdit();
        if (!t.assignees.includes(v.person)) bad('Not assigned.');
        const rest = t.assignees.filter((x) => x !== v.person);
        st.push(q('DELETE FROM task_people WHERE task_id=? AND person_id=?', t.id, v.person));
        st.push(bump(t.leadId === v.person ? { lead_id: rest[0] || null } : {}), ev(t.id, null, me.id, 'unassigned', { person: v.person }));
        break;
      }
      case 'lead': {
        needEdit();
        if (!t.assignees.includes(v.person)) bad('The lead must be one of the assignees.');
        st.push(bump({ lead_id: v.person }), ev(t.id, null, me.id, 'lead', { person: v.person }));
        break;
      }
      case 'handoff': {
        if (!t.assignees.includes(me.id)) deny('Only someone assigned can hand the task on.');
        needEdit();
        const [pid] = checkAssignees(world, me, [v.person]);
        if (pid === me.id || t.assignees.includes(pid)) bad('Pick someone who is not already on the task.');
        st.push(q('DELETE FROM task_people WHERE task_id=? AND person_id IN (?,?)', t.id, me.id, pid));
        st.push(q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', t.id, pid, 'assignee'));
        if (t.creatorId !== me.id) st.push(q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', t.id, me.id, 'shared'));
        st.push(bump(t.leadId === me.id ? { lead_id: pid } : {}), ev(t.id, null, me.id, 'handoff', { person: pid }));
        st.push(note(pid, me.id, 'handoff_to_you', { taskId: t.id }));
        if (t.creatorId !== me.id) st.push(note(t.creatorId, me.id, 'handoff', { taskId: t.id, data: { person: pid } }));
        st.push(...upline(world, me, 'handoff', { taskId: t.id, category: t.category, skip: [t.creatorId, pid] }));
        break;
      }
      case 'share': case 'unshare': {
        if (!P.canManageTask(world, me, t)) deny('Only the owner, a manager or admin can change who sees this task.');
        const p = world.people.get(v.person);
        if (a === 'share') {
          if (!p || !P.canAssign(world, me, p)) deny('You cannot share with that person.');
          if (P.participants(t).includes(p.id)) bad('They can already see it.');
          st.push(q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', t.id, p.id, 'shared'), bump(), ev(t.id, null, me.id, 'shared', { person: p.id }), note(p.id, me.id, 'shared', { taskId: t.id }));
        } else {
          if (!t.shared.includes(v.person)) bad('Not shared with them.');
          st.push(q('DELETE FROM task_people WHERE task_id=? AND person_id=? AND role=?', t.id, v.person, 'shared'), bump(), ev(t.id, null, me.id, 'unshared', { person: v.person }));
        }
        break;
      }
      case 'submit': case 'complete': {
        if (t.status === 'done') bad('Already closed.');
        if (a === 'complete' && P.canClose(world, me, t)) return closeTask(world, me, t, st, at);
        needEdit();
        if (t.status === 'review') bad('Already waiting for sign-off.');
        st.push(bump({ status: 'review' }), ev(t.id, null, me.id, 'submitted', {}));
        const reviewers = new Set([t.creatorId]);
        for (const id of t.assignees) for (const b of world.reportsTo.get(id) || []) if (P.crewOf(world, b).has(id)) reviewers.add(b);
        for (const r of reviewers) if (r !== me.id && !world.people.get(r)?.quiet) st.push(note(r, me.id, 'signoff', { taskId: t.id }));
        st.push(...upline(world, me, 'submitted', { taskId: t.id, category: t.category, skip: [...reviewers] }));
        break;
      }
      case 'approve': {
        needClose();
        if (t.status === 'done') bad('Already closed.');
        return closeTask(world, me, t, st, at);
      }
      case 'return': {
        needClose();
        if (t.status !== 'review') bad('This task is not waiting for sign-off.');
        const reason = str(v.reason, 1000, 'Reason');
        st.push(bump({ status: 'doing' }), ev(t.id, null, me.id, 'returned', reason ? { reason } : {}));
        for (const id of others(t.assignees)) st.push(note(id, me.id, 'returned', { taskId: t.id }));
        break;
      }
      case 'reopen': {
        if (!P.canClose(world, me, t)) deny('Only the owner, a manager or admin, or a lead can reopen.');
        if (t.status !== 'done') bad('This task is not closed.');
        const reason = str(v.reason, 1000, 'Reason');
        if (reason.length < 3) bad('Give a reason for reopening.');
        st.push(bump({ status: 'doing', closed_at: null, closed_by: null }), ev(t.id, null, me.id, 'reopened', { reason }));
        for (const id of others([t.creatorId, ...t.assignees])) st.push(note(id, me.id, 'reopened', { taskId: t.id }));
        break;
      }
      case 'delete': {
        if (!P.canManageTask(world, me, t)) deny('Only the owner, a manager or admin can delete this task.');
        st.push(bump({ deleted: 1 }), ev(t.id, null, me.id, 'deleted', {}));
        break;
      }
      default: bad('Unknown action.');
    }
    await db.batch(st);
    return { id: t.id, warnings };
  }

  async function closeTask(world, me, t, st, at) {
    const snapshot = { ...t, comments: t.comments.length, events: undefined };
    st.push(q('INSERT INTO completion_snapshots(task_id, at, by_id, snapshot_json) VALUES(?,?,?,?)', t.id, at, me.id, JSON.stringify(snapshot)));
    st.push(q('UPDATE tasks SET status=?, closed_at=?, closed_by=?, updated_at=?, version=version+1 WHERE id=?', 'done', at, me.id, at, t.id));
    st.push(ev(t.id, null, me.id, 'closed', {}));
    for (const id of [...new Set([t.creatorId, ...t.assignees])]) if (id !== me.id) st.push(note(id, me.id, 'closed', { taskId: t.id }));
    st.push(...upline(world, me, 'closed', { taskId: t.id, category: t.category, skip: [t.creatorId, ...t.assignees] }));
    // Repeating tasks: the next copy is made on its day at 06:00 (runRepeats), not when this one is closed.
    await db.batch(st);
    return { id: t.id, closed: true, next: null, warnings: [] };
  }

  // ---------- requests ----------
  async function sendRequest(actorId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    const to = world.people.get(v.recipient);
    if (!to || !P.canRequest(world, me, to)) deny('You cannot send requests to that person.');
    const title = str(v.title, 300, 'Title');
    if (!title) bad('Title is required.');
    const message = str(v.message, 4000, 'Message');
    const privateNote = str(v.privateNote, 4000, 'Private note');
    const due = date(v.due, 'Due');
    const followup = date(v.followup, 'Follow-up') || due;
    const area = v.area || 'misc', category = v.category || 'general';
    await checkRefs({ area, category });
    const rid = await nextId('RQ'), tid = await nextId('CP'), at = now();
    const st = [
      q(`INSERT INTO tasks(id, kind, title, description, area, category, status, priority, due_date, followup_date, creator_id, lead_id, request_id, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, tid, 'followup', title, privateNote, area, category, 'todo', 'normal', followup, followup, me.id, me.id, rid, at, at),
      q('INSERT INTO requests(id, sender_id, recipient_id, title, message, area, category, due_date, status, followup_task_id, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        rid, me.id, to.id, title, message, area, category, due, 'open', tid, at, at),
      q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', tid, me.id, 'assignee'),
      ev(null, rid, me.id, 'request_sent', { to: to.id }),
      ev(tid, null, me.id, 'created', { request: rid }),
      note(to.id, me.id, 'request_new', { requestId: rid }),
      ...upline(world, me, 'request', { requestId: rid, category }),
    ];
    await db.batch(st);
    return { id: rid, followupTaskId: tid, warnings: [] };
  }

  async function requestAction(actorId, id, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    const [r] = await loadRequests('id=?', id);
    if (!r || !P.canSeeRequest(world, me, r)) notFound();
    if (!P.canCreate(me)) deny('Your account can look but not make changes.');
    if (['answer', 'close', 'reopen'].includes(v.action) && v.version !== r.version) throw new TaskError(409, 'Someone else changed this request. Reload and try again.', { version: r.version });
    const at = now(), st = [];
    const bump = (status) => q('UPDATE requests SET status=COALESCE(?, status), updated_at=?, version=version+1 WHERE id=?', status, at, r.id);
    const tellOtherSide = (kind) => {
      if (P.isPartner(me)) { st.push(note(r.senderId, me.id, kind, { requestId: r.id })); }
      else if (me.id !== r.recipientId) st.push(note(r.recipientId, me.id, kind, { requestId: r.id }));
      if (P.isSppSide(me) && me.id !== r.senderId) st.push(note(r.senderId, me.id, kind, { requestId: r.id }));
    };
    switch (v.action) {
      case 'reply': {
        if (!P.canReplyRequest(world, me, r)) deny();
        const body = str(v.body, 4000, 'Message');
        if (!body) bad('Write something first.');
        st.push(q('INSERT INTO request_messages(request_id, by_id, at, body) VALUES(?,?,?,?)', r.id, me.id, at, body), bump(null));
        tellOtherSide('request_reply');
        break;
      }
      case 'answer': {
        if (!P.canAnswerRequest(world, me, r)) deny('Only the people asked can mark this as answered.');
        const body = str(v.body, 4000, 'Message');
        if (body) st.push(q('INSERT INTO request_messages(request_id, by_id, at, body) VALUES(?,?,?,?)', r.id, me.id, at, body));
        st.push(bump('answered'), ev(null, r.id, me.id, 'request_answered', {}), note(r.senderId, me.id, 'request_answered', { requestId: r.id }));
        break;
      }
      case 'close': case 'reopen': {
        if (!P.canCloseRequest(world, me, r)) deny('Only the person who asked, a manager or admin can do this.');
        if (v.action === 'close' && r.status === 'closed') bad('Already closed.');
        if (v.action === 'reopen' && r.status !== 'closed') bad('Not closed.');
        st.push(bump(v.action === 'close' ? 'closed' : 'open'), ev(null, r.id, me.id, v.action === 'close' ? 'request_closed' : 'request_reopened', {}));
        st.push(note(r.recipientId, me.id, v.action === 'close' ? 'request_closed' : 'request_reopened', { requestId: r.id }));
        if (v.action === 'reopen' && r.followupTaskId) {
          st.push(q("UPDATE tasks SET status='doing', closed_at=NULL, closed_by=NULL, updated_at=?, version=version+1 WHERE id=? AND status='done'", at, r.followupTaskId));
          st.push(ev(r.followupTaskId, null, me.id, 'reopened', { reason: 'Request reopened', request: r.id }));
        }
        if (v.action === 'close' && r.followupTaskId) {
          st.push(q("UPDATE tasks SET status='done', closed_at=?, closed_by=?, updated_at=?, version=version+1 WHERE id=? AND status<>'done'", at, me.id, at, r.followupTaskId));
          st.push(ev(r.followupTaskId, null, me.id, 'closed', { request: r.id }));
        }
        break;
      }
      default: bad('Unknown action.');
    }
    await db.batch(st);
    return { id: r.id, warnings: [] };
  }

  async function readNotifications(actorId, { ids = null } = {}) {
    if (Array.isArray(ids) && ids.length) {
      const nums = ids.map(Number).filter(Number.isInteger).slice(0, 200);
      const st = []; // in parts: at most 100 values per query
      for (let i = 0; i < nums.length; i += 90) { const part = nums.slice(i, i + 90); st.push(q(`UPDATE notifications SET read=1 WHERE to_id=? AND id IN (${part.map(() => '?').join(',')})`, actorId, ...part)); }
      if (st.length) await db.batch(st);
    } else await q('UPDATE notifications SET read=1 WHERE to_id=?', actorId).run();
    return { ok: true };
  }

  async function addCategory(actorId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.canCreate(me) || !P.isSppSide(me)) deny('Only SPP can add buckets.');
    const name = str(v.name, 60, 'Bucket name');
    if (!name) bad('Name the bucket.');
    // Night audit (2 Nov 2026): bucket ids are plain letters and numbers only (they are used inside the page).
    const id = norm(name).replace(/[^a-z0-9]/g, '').slice(0, 30) || `b${Date.now().toString(36)}`;
    if (await first('SELECT 1 FROM categories WHERE id=?', id)) throw new TaskError(409, 'That bucket already exists.');
    await q('INSERT INTO categories(id, name, created_by) VALUES(?,?,?)', id, name, me.id).run();
    return { id };
  }

  // ---------- admin (people & access) ----------
  async function adminUpdatePerson(actorId, personId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.isAdmin(me)) deny('Only admins can change people and access.');
    const p = world.people.get(personId) || notFound();
    const st = [];
    const sets = {};
    if (v.level !== undefined) {
      const ok = p.company === 'spp' ? ['admin', 'manager', 'staff', 'observer', 'team'] : ['partner'];
      if (!ok.includes(v.level)) bad('That access level does not fit this company.');
      if (p.id === me.id && v.level !== 'admin') bad("You can't remove your own admin access.");
      sets.level = v.level;
    }
    if (v.title !== undefined) sets.title = str(v.title, 80, 'Title');
    if (v.language !== undefined) { if (!['th', 'en'].includes(v.language)) bad('Language must be th or en.'); sets.language = v.language; }
    if (v.name !== undefined) { sets.name = str(v.name, 60, 'Name'); if (!sets.name) bad('Name is required.'); }
    if (v.hiddenFrom !== undefined) {
      if (!Array.isArray(v.hiddenFrom) || v.hiddenFrom.some((c) => !PARTNER_COMPANIES.includes(c))) bad('Unknown company.');
      if (p.company !== 'spp') bad('Only SPP people can be hidden.');
      sets.hidden_from_json = JSON.stringify([...new Set(v.hiddenFrom)]);
    }
    for (const [k, col] of [['active', 'active'], ['quiet', 'quiet'], ['safetyReports', 'safety_reports']]) {
      if (v[k] !== undefined) sets[col] = v[k] ? 1 : 0;
    }
    if (sets.active === 0 && p.id === me.id) bad("You can't switch off your own account.");
    if (Object.keys(sets).length) st.push(q(`UPDATE people SET ${Object.keys(sets).map((c) => `${c}=?`).join(', ')} WHERE id=?`, ...Object.values(sets), p.id));
    if (v.reportsTo !== undefined) {
      const bosses = [...new Set(v.reportsTo)];
      for (const b of bosses) {
        if (!world.people.get(b) || !P.isSppSide(world.people.get(b)) || b === p.id) bad('Leads must be SPP people.');
        if (P.crewOf(world, p.id).has(b)) bad(`${world.people.get(b).name} already reports to ${p.name}.`);
      }
      st.push(q('DELETE FROM reports_to WHERE person_id=?', p.id), ...bosses.map((b) => q('INSERT INTO reports_to(person_id, boss_id) VALUES(?,?)', p.id, b)));
    }
    if (v.follows !== undefined) {
      const ids = [...new Set(v.follows)].filter((x) => x !== p.id);
      for (const id of ids) if (!world.people.get(id) || !P.isSppSide(world.people.get(id))) bad('Can only follow SPP people.');
      st.push(q('DELETE FROM follows WHERE person_id=?', p.id), ...ids.map((x) => q('INSERT INTO follows(person_id, followed_id) VALUES(?,?)', p.id, x)));
    }
    if (v.requestContacts !== undefined) {
      const ids = [...new Set(v.requestContacts)];
      for (const id of ids) if (id !== '*' && (!world.people.get(id) || !P.isPartner(world.people.get(id)))) bad('Requests can only go to Caltex, KS or the land owner.');
      st.push(q('DELETE FROM request_contacts WHERE sender_id=?', p.id), ...ids.map((x) => q('INSERT INTO request_contacts(sender_id, recipient_id) VALUES(?,?)', p.id, x)));
    }
    if (!st.length) bad('Nothing to change.');
    st.push(ev(null, null, me.id, 'person_changed', { person: p.id, fields: Object.keys(v) }));
    await db.batch(st);
    worldCache = null;
    return { id: p.id };
  }

  // Admins add a person to the project (Brian, 1 Nov 2026). Logins are created separately on the same page.
  async function adminAddPerson(actorId, v) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.isAdmin(me)) deny('Only admins can change people and access.');
    const name = str(v.name, 60, 'Name');
    if (!name || !/[\p{L}\p{N}]/u.test(name)) bad('Name is required.');
    if ([...world.people.values()].some((p) => norm(p.name) === norm(name))) bad('Someone with that name is already on the project. Use a different name, e.g. add an initial.');
    const company = String(v.company || '');
    if (!['spp', 'caltex', 'ks', 'owner'].includes(company)) bad('Unknown company.');
    const level = company === 'spp' ? String(v.level || 'team') : 'partner';
    if (company === 'spp' && !['admin', 'manager', 'staff', 'observer', 'team'].includes(level)) bad('That access level does not fit this company.');
    const title = str(v.title || '', 80, 'Title');
    const language = v.language === 'en' ? 'en' : 'th';
    const bosses = company === 'spp' ? [...new Set(Array.isArray(v.reportsTo) ? v.reportsTo : [])] : [];
    for (const b of bosses) if (!world.people.get(b) || !P.isSppSide(world.people.get(b))) bad('Leads must be SPP people.');
    // Site team members are not shown to KS or the land owner unless an admin changes it.
    const hidden = company === 'spp' && level === 'team' ? ['ks', 'owner'] : [];
    let base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '') || 'person', id = base;
    for (let n = 2; world.people.has(id); n++) id = `${base}${n}`;
    await db.batch([
      q('INSERT INTO people(id, name, company, level, title, aliases_json, hidden_from_json, safety_reports, quiet, active, language) VALUES(?,?,?,?,?,?,?,0,0,1,?)', id, name, company, level, title, '[]', JSON.stringify(hidden), language),
      ...bosses.map((b) => q('INSERT INTO reports_to(person_id, boss_id) VALUES(?,?)', id, b)),
      ev(null, null, me.id, 'person_changed', { person: id, fields: ['added'] }),
    ]);
    worldCache = null;
    return { id };
  }

  /**
   * Admins take a person off the project in one step (Brian, 15 Nov 2026: "revoke all of his permissions; any tasks
   * that were for him, remove and assign to me").
   * - The person is switched off (no pages, no tasks, their assistant keys stop working) and their reporting lines,
   *   follows, request contacts, safety-report flag and per-person page settings are cleared.
   * - Every task still to do that was assigned to them goes to the admin who pressed the button (who also becomes the
   *   lead where the person was the lead), and the person is taken off tasks that were only shared with them.
   *   "Still to do" = not closed and not deleted, plus the newest copy of a repeating task even when closed, because
   *   the next morning's copy takes its people from there.
   * - Closed tasks, comments and the history keep the person's name. Tasks they created stay created by them.
   * The login itself lives in the sign-in database and is switched off by the portal right after this
   * (portal-proposal/src/tasks-portal.mjs). Set-based SQL: the number of bound values does not grow with the tasks.
   */
  async function adminRemovePerson(actorId, personId) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.isAdmin(me)) deny('Only admins can change people and access.');
    const p = world.people.get(String(personId || '')) || notFound();
    if (p.id === me.id) bad("You can't remove yourself from the project.");
    const at = now();
    const LIVE = `t.deleted=0 AND (t.status<>'done' OR (t.series_id IS NOT NULL AND t.repeat_days<>'' AND NOT EXISTS(
      SELECT 1 FROM tasks n WHERE n.series_id=t.series_id AND (n.created_at>t.created_at OR (n.created_at=t.created_at AND n.id>t.id)))))`;
    const theirs = (role) => `SELECT tp.task_id FROM task_people tp JOIN tasks t ON t.id=tp.task_id WHERE tp.person_id=? AND tp.role='${role}' AND ${LIVE}`;
    const moved = (await all(`${theirs('assignee')} ORDER BY tp.task_id`, p.id)).map((r) => r.task_id);
    const unshared = (await first(`SELECT COUNT(*) AS n FROM (${theirs('shared')})`, p.id)).n;
    const data = (d) => JSON.stringify(via ? { ...d, via } : d);
    const subject = `person:${p.id}`;
    await db.batch([
      // History first, while the rows still say who was on what.
      q(`INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) SELECT task_id, NULL, ?, ?, 'unassigned', ? FROM (${theirs('assignee')})`, at, me.id, data({ person: p.id }), p.id),
      q(`INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) SELECT task_id, NULL, ?, ?, 'assigned', ? FROM (${theirs('assignee')})
         WHERE task_id NOT IN (SELECT task_id FROM task_people WHERE person_id=? AND role='assignee')`, at, me.id, data({ person: me.id }), p.id, me.id),
      q(`INSERT INTO events(task_id, request_id, at, by_id, kind, data_json) SELECT task_id, NULL, ?, ?, 'unshared', ? FROM (${theirs('shared')})`, at, me.id, data({ person: p.id }), p.id),
      // The tasks: lead, then the admin's place on them, then the person comes off.
      q(`UPDATE tasks SET lead_id=CASE WHEN lead_id=? OR lead_id IS NULL THEN ? ELSE lead_id END, updated_at=?, version=version+1 WHERE id IN (${theirs('assignee')})`, p.id, me.id, at, p.id),
      q(`UPDATE tasks SET updated_at=?, version=version+1 WHERE id IN (${theirs('shared')})`, at, p.id),
      q(`DELETE FROM task_people WHERE person_id=? AND role='shared' AND task_id IN (${theirs('assignee')})`, me.id, p.id),
      q(`INSERT OR IGNORE INTO task_people(task_id, person_id, role) SELECT task_id, ?, 'assignee' FROM (${theirs('assignee')})`, me.id, p.id),
      q(`DELETE FROM task_people WHERE person_id=? AND task_id IN (SELECT t.id FROM tasks t WHERE ${LIVE})`, p.id),
      // The person: off, and nothing left that points at them.
      q('UPDATE people SET active=0, safety_reports=0 WHERE id=?', p.id),
      q('DELETE FROM reports_to WHERE person_id=? OR boss_id=?', p.id, p.id),
      q('DELETE FROM follows WHERE person_id=? OR followed_id=?', p.id, p.id),
      q('DELETE FROM request_contacts WHERE sender_id=? OR recipient_id=?', p.id, p.id),
      q('INSERT INTO page_access_log(subject, page, level, changed_by, changed_at) SELECT subject, page, NULL, ?, ? FROM page_access WHERE subject=?', me.id, at, subject),
      q('DELETE FROM page_access WHERE subject=?', subject),
      q('UPDATE agent_keys SET revoked_at=? WHERE person_id=? AND revoked_at IS NULL', at, p.id),
      ev(null, null, me.id, 'person_changed', { person: p.id, fields: ['removed'], tasks: moved.length }),
    ]);
    worldCache = null; pageRowsCache = null;
    return { id: p.id, moved, unshared };
  }

  // Admin check: exactly what the server would send this person (same code path as their own screen).
  // Read-only; nothing is changed and nobody is signed in as them.
  async function adminPreview(actorId, personId) {
    const world = await loadWorld();
    const me = await actor(world, actorId);
    if (!P.isAdmin(me)) deny('Only admins can check what someone sees.');
    const target = world.people.get(String(personId || '')) || notFound();
    const st = await state(target.id);
    const access = await siteAccess(target.id);
    const visible = new Set(st.people.map((p) => p.id).filter(Boolean));
    const hidden = [...world.people.values()].filter((p) => p.id !== target.id && !visible.has(p.id)).map((p) => ({ id: p.id, name: p.name, company: p.company }));
    return {
      person: { id: target.id, name: target.name, company: target.company, level: target.level, title: target.title, active: target.active },
      pages: access.pages, adminPage: access.accessAdmin,
      people: st.people.map((p) => ({ id: p.id, name: p.name, masked: !p.id, canAssign: !!p.canAssign, canRequest: !!p.canRequest })),
      hidden,
      tasks: st.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      requests: st.requests.map((r) => ({ id: r.id, title: r.title, status: r.status })),
      readOnly: !!st.me.readOnly, seesAll: !!st.me.can.seesAll,
    };
  }

  /**
   * Repeating tasks, run each morning at 06:00 Bangkok (portal-proposal/src/repeats.mjs). For every series whose newest
   * copy repeats on today's weekday: if that copy is due before today, make today's copy (due today, same people,
   * details and checklist, steps unticked) even if the last one is still open; if it is due today and still open, keep
   * it. Either way its people get a "due today" bell reminder, once. A series stops when its newest copy is set to
   * "does not repeat" or deleted. Running twice on a day changes nothing.
   */
  async function runRepeats(today = now().slice(0, 10)) {
    const day = isoDay(today);
    const rows = await all("SELECT * FROM tasks WHERE series_id IS NOT NULL AND kind = 'task' ORDER BY created_at DESC, id DESC");
    const newest = new Map();
    for (const r of rows) if (!newest.has(r.series_id)) newest.set(r.series_id, r);
    const out = { made: [], reminded: [] };
    for (const r of newest.values()) {
      if (r.deleted || !String(r.repeat_days || '').includes(day)) continue;
      if (r.due_date && r.due_date > today) continue;
      let id = r.id;
      const st = [];
      if (r.due_date ? r.due_date < today : String(r.created_at).slice(0, 10) < today) {
        id = await nextId('CP');
        const at = now();
        const people = (await all("SELECT person_id FROM task_people WHERE task_id=? AND role='assignee'", r.id)).map((x) => x.person_id);
        const steps = await all('SELECT text FROM checklist WHERE task_id=? AND deleted=0 ORDER BY position', r.id);
        st.push(q(`INSERT INTO tasks(id, kind, title, description, area, category, status, priority, start_date, due_date, progress, auto_progress, creator_id, lead_id, repeat, repeat_days, series_id, created_at, updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, 'task', r.title, r.description, r.area, r.category, 'todo', r.priority, today, today, 0, steps.length ? 1 : 0, r.creator_id, r.lead_id, 'weekly', r.repeat_days, r.series_id, at, at));
        for (const a of people) st.push(q('INSERT INTO task_people(task_id, person_id, role) VALUES(?,?,?)', id, a, 'assignee'));
        steps.forEach((c, i) => st.push(q('INSERT INTO checklist(id, task_id, text, position) VALUES(?,?,?,?)', `${id}-${i + 1}`, id, c.text, i + 1)));
        st.push(ev(id, null, r.creator_id, 'created', { repeatOf: r.id, scheduled: true }));
        out.made.push(id);
      } else if (r.status === 'done') continue;
      if (await first("SELECT 1 FROM notifications WHERE task_id=? AND kind='due_today'", id)) { if (st.length) await db.batch(st); continue; }
      const people = (await all("SELECT person_id FROM task_people WHERE task_id=? AND role='assignee'", r.id)).map((x) => x.person_id); // a new copy has the same people
      for (const p of new Set([...people, r.lead_id].filter(Boolean))) st.push(note(p, null, 'due_today', { taskId: id }));
      await db.batch(st);
      out.reminded.push(id);
    }
    return out;
  }

  return { state, adminPreview, createTask, taskAction, sendRequest, requestAction, readNotifications, addCategory, adminUpdatePerson, adminAddPerson, adminRemovePerson, adminSetPage, siteAccess, loadWorld, runRepeats };
}

// ---------- row mapping ----------
const PARTNER_COMPANIES = ['caltex', 'ks', 'owner'];
function hiddenFromRow(r) {
  const list = r.hidden_from_json ? JSON.parse(r.hidden_from_json) : [];
  return list.length || !r.hidden_from_partners ? list : [...PARTNER_COMPANIES];
}
export function rowToPerson(r) {
  return {
    id: r.id, name: r.name, company: r.company, level: r.level, title: r.title || '',
    aliases: JSON.parse(r.aliases_json || '[]'), hiddenFrom: hiddenFromRow(r),
    safetyReports: !!r.safety_reports, quiet: !!r.quiet, active: !!r.active, accountId: r.account_id || null,
    language: r.language === 'en' ? 'en' : 'th',
  };
}
function rowToTask(r, people, checklist, comments, events) {
  return {
    id: r.id, kind: r.kind, title: r.title, description: r.description, area: r.area, category: r.category,
    status: r.status, priority: r.priority, start: r.start_date, due: r.due_date, followup: r.followup_date,
    progress: r.progress, autoProgress: !!r.auto_progress, repeat: r.repeat, repeatDays: r.repeat_days || '', seriesId: r.series_id || null,
    creatorId: r.creator_id, leadId: r.lead_id, parentId: r.parent_id, requestId: r.request_id,
    createdAt: r.created_at, updatedAt: r.updated_at, closedAt: r.closed_at, closedBy: r.closed_by,
    deleted: !!r.deleted, version: r.version,
    assignees: people.filter((x) => x.role === 'assignee').map((x) => x.person_id),
    shared: people.filter((x) => x.role === 'shared').map((x) => x.person_id),
    checklist: checklist.map((c) => ({ id: c.id, text: c.text, done: !!c.done, position: c.position })),
    comments: comments.map((c) => ({ id: c.id, by: c.by_id, at: c.at, body: c.body })),
    events,
  };
}
export function findPerson(world, handle) {
  const k = norm(handle);
  if (!k) return null;
  for (const p of world.people.values()) if (norm(p.name) === k || p.aliases.some((a) => norm(a) === k)) return p;
  return null; // norm() already drops dots, so "@Por." matches Por
}
