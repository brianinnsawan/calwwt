import { createHmac, timingSafeEqual } from 'node:crypto';
// What the signed-in person may open on calwwt.sppwork.com: a level (none / view / edit) per page.
// Admins set this on the Admin page (/admin; data in tasks/src/pages.mjs). Brian's owner login has everything.
// `areas` is the set of pages the person can at least view. Cached on the actor for the request.
import { PAGE_IDS, OWNER_LEVELS } from '../../tasks/src/pages.mjs';
import { taskService } from '../../tasks/src/service.mjs';

const KEY = Symbol('siteAccess'), SERVICE = Symbol('taskService'), PERSON_ROW = Symbol.for('calnkt.personRow');
/** One task service per request (kept on the actor), so the people and reporting lines are read from the database once
 *  per request, not once for the page check and again for the task data (site audit, 10 Nov 2026). */
export function requestTaskService(env, actor) {
  if (!actor) return taskService(env.TASKS_DB);
  if (!actor[SERVICE]) Object.defineProperty(actor, SERVICE, { value: taskService(env.TASKS_DB), enumerable: false });
  return actor[SERVICE];
}
const none = () => Object.fromEntries(PAGE_IDS.map((id) => [id, 'none']));
const pack = (pages, person, admin, view) => ({ pages, areas: new Set(Object.keys(pages).filter((k) => pages[k] !== 'none')), person, admin, view, name: null, lang: null });

// "View the site as" (admins only): the cookie names a person; it is honoured only while the real signed-in
// person is an admin. Everything is then shown as that person, and every change is refused (read-only).
export const VIEW_AS_COOKIE = '__Host-calwwt_view_as';
// Night audit (2 Nov 2026): the cookie is signed for the admin who started viewing, the viewed person and an end time,
// so it cannot be made by hand (which would skip the 2-step check, the Change log entry and the one-hour limit).
const viewAsSig = (env, by, target, exp) => createHmac('sha256', String(env.AUTH_RATE_KEY || '')).update(`view-as\0${by}\0${target}\0${exp}`).digest('base64url');
export function signViewAs(env, by, target, seconds = 3600) { const exp = Math.floor(Date.now() / 1000) + seconds; return `${target}.${exp}.${viewAsSig(env, by, target, exp)}`; }
export function viewAsCookie(request, env, by) {
  const m = /(?:^|;\s*)__Host-calwwt_view_as=([a-z0-9]{1,40})\.(\d{10})\.([A-Za-z0-9_-]{43})(?:;|$)/.exec(request?.headers.get('cookie') || '');
  if (!m || !env?.AUTH_RATE_KEY || Number(m[2]) < Date.now() / 1000) return null;
  const want = Buffer.from(viewAsSig(env, by, m[1], m[2])), got = Buffer.from(m[3]);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1] : null;
}

export async function siteAccess(env, actor, request = null) {
  if (!actor) return pack(none(), null, false, false);
  if (actor[KEY]) return actor[KEY];
  const real = await realAccess(env, actor);
  let out = real;
  const target = request && real.admin && env.TASKS_DB ? viewAsCookie(request, env, real.person) : null;
  if (target && target !== real.person) {
    const row = await env.TASKS_DB.prepare('SELECT id, name, company, language FROM people WHERE id=? AND active=1').bind(target).first();
    if (row) {
      const a = await requestTaskService(env, actor).siteAccess(row.id);
      out = pack(a.pages, row.id, false, false);
      out.name = row.name; out.lang = row.language === 'en' ? 'en' : 'th';
      out.viewAs = { id: row.id, name: row.name, company: row.company, by: real.person, byName: real.name };
    }
  }
  Object.defineProperty(actor, KEY, { value: out, enumerable: false });
  return out;
}

async function realAccess(env, actor) {
  const tasksOn = env.TASKS_ENABLED === 'true' && !!env.TASKS_DB;
  let person = null, row = null;
  if (tasksOn && actor.accountId) {
    // A project login's own row was already read while the session was checked (src/local-auth.mjs). It is used here
    // only when it is the row this lookup would return: the active person linked to this account (account_id is unique).
    const known = actor[PERSON_ROW];
    row = known && known.account_id === actor.accountId ? known : await env.TASKS_DB.prepare('SELECT id, name, language FROM people WHERE account_id=? AND active=1').bind(actor.accountId).first();
  }
  person = row?.id || null;
  const owner = actor.localRole === 'owner' || (!actor.localRole && env.LOCAL_AUTH_OWNER_ID && actor.id === env.LOCAL_AUTH_OWNER_ID);
  let out;
  if (owner) { out = pack({ ...OWNER_LEVELS }, person, true, true); out.owner = true; }
  else if (person) {
    const a = await requestTaskService(env, actor).siteAccess(person);
    out = pack(a.pages, person, a.accessAdmin, a.accessView);
  } else if (actor.localRole === 'reader') out = pack({ ...none(), drawings: 'view', safety: 'view' }, null, false, false);
  else out = pack(none(), null, false, false);
  if (!tasksOn) { out.pages.tasks = 'none'; out.areas.delete('tasks'); }
  if (row) { out.name = row.name; out.lang = row.language === 'en' ? 'en' : 'th'; }
  return out;
}

export const cachedAccess = (actor) => actor?.[KEY] || null;

// Where to go after sign-in or on "/": Tasks if allowed, else the first page the person may open.
export function landingPath(access) {
  if (access.areas.has('tasks')) return '/tasks.html';
  if (access.areas.has('drawings')) return '/sites/';
  if (access.areas.has('timeline')) return '/milestones/';
  if (access.view) return '/admin';
  return '/account.html';
}
