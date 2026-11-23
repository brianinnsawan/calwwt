// Access policy. Pure functions over a loaded "world":
//   world = { people: Map(id -> person), reportsTo: Map(id -> [ids]), follows: Map(id -> [ids]),
//             contacts: Map(sender -> [recipient | '*']), partnerDirectory: {company: [ids|'*spp']},
//             partnerPeers: {company: [companies]} }
// Every read and write in the API goes through these functions. See ACCESS-RULES.md.

import { COMPANIES } from './roster.mjs';

export const SEES_ALL = new Set(['admin', 'manager', 'staff', 'observer']);
export const isSppSide = (p) => p?.company === 'spp';
export const isPartner = (p) => !!p && p.company !== 'spp';
export const seesAll = (p) => !!p && p.active && SEES_ALL.has(p.level);
export const isTeam = (p) => p?.company === 'spp' && p.level === 'team';
export const isObserver = (p) => p?.level === 'observer';
export const isAdmin = (p) => p?.active && p.level === 'admin';
export const isManagerOrAdmin = (p) => p?.active && (p.level === 'admin' || p.level === 'manager');

/** People `viewer` leads, directly or further down. */
export function crewOf(world, viewerId) {
  const out = new Set();
  const walk = (id) => {
    for (const [pid, bosses] of world.reportsTo) {
      if (bosses.includes(id) && !out.has(pid) && pid !== viewerId) { out.add(pid); walk(pid); }
    }
  };
  walk(viewerId);
  return out;
}

/** People whose work `viewer` sees through leading or following. */
export function watchedBy(world, viewerId) {
  const out = crewOf(world, viewerId);
  for (const id of world.follows.get(viewerId) || []) if (id !== viewerId) out.add(id);
  return out;
}

/** Always-hidden rules that even being on the same task does not lift. */
export function hiddenFrom(viewer, person, world = null) {
  if (!viewer || !person || viewer.id === person.id) return false;
  if (isObserver(person) && !seesAll(viewer)) return true;
  if (isPartner(viewer) && (person.hiddenFrom || []).includes(viewer.company)) return true;
  // Partner companies with a fixed SPP list (KS, land owner) never see other SPP names.
  if (world && isPartner(viewer) && isSppSide(person)) {
    const allowed = world.partnerDirectory[viewer.company] || [];
    if (!allowed.includes('*spp') && !allowed.includes(person.id)) return true;
  }
  return false;
}

export function canRequest(world, sender, recipient) {
  if (!sender?.active || !recipient?.active) return false;
  if (!isSppSide(sender) || isObserver(sender) || !isPartner(recipient)) return false;
  const list = world.contacts.get(sender.id) || [];
  return list.includes('*') || list.includes(recipient.id);
}

/** Directory rule: can `viewer` see `person` by name anywhere (lists, @ suggestions)? */
export function canSeePerson(world, viewer, person) {
  if (!viewer?.active || !person) return false;
  if (viewer.id === person.id) return true;
  if (!person.active && !seesAll(viewer)) return false;
  if (seesAll(viewer)) return true;
  if (hiddenFrom(viewer, person, world)) return false;
  if (isSppSide(viewer)) {
    if (isSppSide(person)) return true;
    return canRequest(world, viewer, person);
  }
  // partner viewer
  if (isPartner(person)) return (world.partnerPeers[viewer.company] || [viewer.company]).includes(person.company);
  const allowed = world.partnerDirectory[viewer.company] || [];
  return allowed.includes('*spp') || allowed.includes(person.id);
}

/** Everyone on a task: creator, lead, assignees, shared-with. */
export function participants(task) {
  return [...new Set([task.creatorId, task.leadId, ...(task.assignees || []), ...(task.shared || [])].filter(Boolean))];
}
const workers = (task) => [...new Set([task.creatorId, task.leadId, ...(task.assignees || [])].filter(Boolean))];

export function canSeeTask(world, viewer, task) {
  if (!viewer?.active || !task) return false;
  if (seesAll(viewer)) return true;
  if (task.kind === 'followup' && isPartner(viewer)) return false;
  const ps = participants(task);
  if (ps.includes(viewer.id)) return true;
  if (isSppSide(viewer)) {
    // The site team sees one another's work (Brian, 10 Nov 2026): any task with a site team member on it.
    if (isTeam(viewer) && ps.some((id) => isTeam(world.people.get(id)))) return true;
    const watched = watchedBy(world, viewer.id);
    return ps.some((id) => watched.has(id));
  }
  return ps.some((id) => world.people.get(id)?.company === viewer.company);
}

export function canCreate(viewer) { return !!viewer?.active && !isObserver(viewer); }

export function canAssign(world, viewer, person) {
  if (!canCreate(viewer) || !person?.active || isObserver(person)) return false;
  if (!canSeePerson(world, viewer, person)) return false;
  if (isSppSide(viewer)) return isSppSide(person); // partners get requests, not tasks
  return isSppSide(person) || person.company === viewer.company;
}

export function canEditTask(world, viewer, task) {
  if (!canCreate(viewer) || !canSeeTask(world, viewer, task)) return false;
  if (task.status === 'done') return false;
  if (seesAll(viewer)) return true; // admin, manager, staff (observers excluded above)
  if (workers(task).includes(viewer.id)) return true;
  if (isSppSide(viewer)) {
    const watched = watchedBy(world, viewer.id);
    return workers(task).some((id) => watched.has(id));
  }
  return world.people.get(task.creatorId)?.company === viewer.company;
}

export function canComment(world, viewer, task) {
  return canCreate(viewer) && canSeeTask(world, viewer, task);
}

/** Close, approve sign-off, reopen. */
export function canClose(world, viewer, task) {
  if (!canCreate(viewer) || !canSeeTask(world, viewer, task)) return false;
  if (isManagerOrAdmin(viewer) || task.creatorId === viewer.id) return true;
  const crew = crewOf(world, viewer.id);
  return (task.assignees || []).some((id) => crew.has(id));
}

/** Change who can see the task or delete it. */
export function canManageTask(world, viewer, task) {
  if (!canCreate(viewer) || !canSeeTask(world, viewer, task)) return false;
  return isManagerOrAdmin(viewer) || task.creatorId === viewer.id;
}

// ---------- requests ----------
// request = { id, senderId, recipientId, status, followupTaskId, ... }

export function canSeeRequest(world, viewer, req) {
  if (!viewer?.active || !req) return false;
  if (seesAll(viewer)) return true;
  if (viewer.id === req.senderId || viewer.id === req.recipientId) return true;
  if (isSppSide(viewer)) return watchedBy(world, viewer.id).has(req.senderId);
  return world.people.get(req.recipientId)?.company === viewer.company;
}

export function canReplyRequest(world, viewer, req) {
  return canCreate(viewer) && canSeeRequest(world, viewer, req) && req.status !== 'closed';
}
export function canAnswerRequest(world, viewer, req) {
  if (!canReplyRequest(world, viewer, req) || req.status !== 'open') return false;
  return isPartner(viewer) && world.people.get(req.recipientId)?.company === viewer.company;
}
export function canCloseRequest(world, viewer, req) {
  return canCreate(viewer) && canSeeRequest(world, viewer, req) && isSppSide(viewer)
    && (viewer.id === req.senderId || isManagerOrAdmin(viewer));
}

// ---------- display ----------

/**
 * How `person` appears to `viewer`. When `context` (a task or request the viewer can see)
 * includes the person, their real name is shown unless hiddenFrom() says otherwise.
 * Hidden people come back with no id, so nothing about them leaks.
 */
export function displayPerson(world, viewer, personId, contextIds = []) {
  const p = world.people.get(personId);
  if (!p) return null;
  const visible = canSeePerson(world, viewer, p) || (contextIds.includes(personId) && !hiddenFrom(viewer, p, world));
  const company = COMPANIES[p.company] || { name: p.company };
  if (!visible) {
    return { id: null, name: isSppSide(p) ? 'SPP project staff' : `${company.name} contact`, company: p.company, masked: true };
  }
  const out = { id: p.id, name: p.name, company: p.company, companyName: company.name };
  if (isPartner(viewer) && isSppSide(p)) out.title = COMPANIES.spp.partnerLabel;
  else out.title = p.title || '';
  if (seesAll(viewer) && isSppSide(viewer)) { out.level = p.level; }
  if (!p.active) out.inactive = true;
  return out;
}
