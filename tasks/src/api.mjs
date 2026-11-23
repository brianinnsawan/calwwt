// HTTP layer for the task app: /api/tasks/*
// The caller passes the person id of the signed-in user, resolved by the portal's
// verified login. Nothing in the request (headers, body, query) can choose the actor.
import { taskService, TaskError } from './service.mjs';

const MAX_BODY = 32 * 1024;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

async function readJson(request) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) throw new TaskError(415, 'Send JSON.');
  // Audit F07: the size limit is enforced while reading, not after reading everything.
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) throw new TaskError(413, 'Too much data in one request.');
  const parts = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel().catch(() => {}); throw new TaskError(413, 'Too much data in one request.'); }
      parts.push(value);
    }
  }
  const buf = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { buf.set(p, at); at += p.byteLength; }
  const text = new TextDecoder().decode(buf);
  try { return text ? JSON.parse(text) : {}; } catch { throw new TaskError(400, 'Invalid JSON.'); }
}

/**
 * @param {Request} request
 * @param {{ TASKS_DB: D1Database, APP_ORIGIN?: string }} env
 * @param {string|null} personId  person id for the verified signed-in account, or null
 * @returns {Promise<Response|null>} null when the path is not a task API path
 */
export async function handleTasksApi(request, env, personId, { now, viewOnly = false, service = null } = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/tasks/')) return null;
  try {
    if (!env.TASKS_DB) return json({ error: 'The task app is not switched on yet.' }, 503);
    if (!personId) return json({ error: 'Sign in first.' }, 401);
    // service: the portal passes the task service it already used for this request's page check (one load of people).
    const svc = service || taskService(env.TASKS_DB, now ? { now } : {});
    const parts = url.pathname.slice('/api/tasks/'.length).split('/').map(decodeURIComponent);
    // Night review, round 2: one spelling per address. Empty parts (a trailing or doubled slash) are not accepted.
    if (parts.some((x) => x === '')) return json({ error: 'Not found.' }, 404);

    if (request.method === 'GET') {
      if (parts[0] === 'state' && parts.length === 1) return json({ ...(await svc.state(personId, { readOnly: viewOnly })), portalUrl: env.PORTAL_URL || null });
      if (parts[0] === 'admin' && parts[1] === 'preview' && parts.length === 2) return json(await svc.adminPreview(personId, url.searchParams.get('person')));
      return json({ error: 'Not found.' }, 404);
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    // An admin viewing the site as someone else can look but never change anything in their name.
    if (viewOnly) return json({ error: 'View only: you are viewing the site as someone else. Stop viewing to make changes.' }, 403);

    // Cross-site request protection: same origin and a custom header browsers won't send cross-site without CORS.
    const origin = request.headers.get('origin');
    const expected = env.APP_ORIGIN || url.origin;
    if (origin !== expected) return json({ error: 'Request blocked (wrong origin).' }, 403);
    if (request.headers.get('x-requested-with') !== 'tasks') return json({ error: 'Request blocked.' }, 403);
    const body = await readJson(request);

    const [a, b, c, d] = parts;
    // Tasks page set to "view" on the Admin page: everything is read-only except marking notices read.
    if (!(a === 'notifications' && b === 'read')) {
      const access = await svc.siteAccess(personId);
      if (access.pages.tasks !== 'edit') return json({ error: 'View only. You cannot change anything here.' }, 403);
    }
    let result;
    if (a === 'tasks' && parts.length === 1) result = await svc.createTask(personId, body);
    else if (a === 'tasks' && parts.length === 2) result = await svc.taskAction(personId, b, body);
    else if (a === 'requests' && parts.length === 1) result = await svc.sendRequest(personId, body);
    else if (a === 'requests' && parts.length === 2) result = await svc.requestAction(personId, b, body);
    else if (a === 'notifications' && b === 'read' && parts.length === 2) result = await svc.readNotifications(personId, body);
    else if (a === 'categories' && parts.length === 1) result = await svc.addCategory(personId, body);
    else if (a === 'admin' && b === 'people' && parts.length === 2) result = await svc.adminAddPerson(personId, body);
    else if (a === 'admin' && b === 'people' && c && !d) result = await svc.adminUpdatePerson(personId, c, body);
    else if (a === 'admin' && b === 'people' && c && d === 'remove' && parts.length === 4) result = await svc.adminRemovePerson(personId, c);
    else if (a === 'admin' && b === 'pages' && parts.length === 2) result = await svc.adminSetPage(personId, body);
    else return json({ error: 'Not found.' }, 404);
    // Send the updated view back in the same response, so the browser needs no second round trip.
    return json({ ...result, state: { ...(await svc.state(personId)), portalUrl: env.PORTAL_URL || null } }, 200);
  } catch (e) {
    if (e instanceof TaskError) return json({ error: e.message, ...e.extra }, e.status);
    console.error('tasks api error', e?.message);
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
}

/** Map a verified identity account to a task person. */
export async function personForAccount(db, accountId) {
  if (!db || !accountId) return null;
  const row = await db.prepare('SELECT id FROM people WHERE account_id=? AND active=1').bind(accountId).first();
  return row?.id || null;
}
