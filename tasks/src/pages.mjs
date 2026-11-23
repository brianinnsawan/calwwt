// Page access for calwwt.sppwork.com: none / view / edit per page, per group, with per-person exceptions.
// Set by admins on the Admin page (/admin). The portal worker enforces it on every request.
// Defaults confirmed by Brian, 1 Nov 2026 (tasks/ACCESS-RULES.md, "Page access").

export const LEVELS = ['none', 'view', 'edit'];
const RANK = { none: 0, view: 1, edit: 2 };
export const atLeast = (level, wanted) => RANK[level || 'none'] >= RANK[wanted];

// money: shows costs or progress value; never given to the site team by default.
// levels: the levels that mean something for this page today.
export const PAGES = [
  // edit = may add and change entries in the drawing change log (Drawings -> Drawing changes) and save measurements and
  // markups in Drawings -> CAD workspace. view = look, and measure / draw on the screen only.
  { id: 'drawings', name: 'Sites, models & drawings', levels: ['none', 'view', 'edit'] },
  { id: 'safety', name: 'Safety library (TCC / JLA)', levels: ['none', 'view'] },
  // edit = may change and save the site timelines (Sites -> a site -> Timeline) and the milestones.
  { id: 'timeline', name: 'Project timeline', levels: ['none', 'view', 'edit'] },
  { id: 'scurve_station', name: 'S-curve: station portion', money: true, levels: ['none', 'view', 'edit'] },
  { id: 'scurve_caltex', name: 'S-curve: Caltex fuel portion', money: true, levels: ['none', 'view', 'edit'] },
  { id: 'tasks', name: 'Tasks', levels: ['none', 'view', 'edit'] },
  // Project files (safety, engineering...). SPP people see every file; partners only files shared with them.
  { id: 'files', name: 'Files', levels: ['none', 'view', 'edit'] },
  // SPP-Caltex meetings: agenda, shared notes, action items (Brian, 2 Nov 2026). SPP-only notes are never shown to partners.
  { id: 'meetings', name: 'Meetings (SPP–Caltex)', levels: ['none', 'view', 'edit'] },
];
export const PAGE_IDS = PAGES.map((p) => p.id);
export const pageById = (id) => PAGES.find((p) => p.id === id);

export const ACCESS_GROUPS = [
  { id: 'spp', name: 'SPP staff' },   // admins, managers, staff, observers
  { id: 'team', name: 'Site team' },  // A, Tle, Gift, Por (never labelled "subcontractor")
  { id: 'caltex', name: 'Caltex' },
  { id: 'ks', name: 'KS Consulting' },
  { id: 'owner', name: 'Land owner' },
];

const D = (drawings, safety, timeline, scurve_station, scurve_caltex, tasks, files, meetings) => ({ drawings, safety, timeline, scurve_station, scurve_caltex, tasks, files, meetings });
// KS and the land owner see only the station portion of the S-curve, never the Caltex fuel portion (Brian, 1 Nov 2026).
export const DEFAULT_PAGE_ACCESS = {
  spp: D('view', 'view', 'view', 'view', 'view', 'edit', 'edit', 'edit'),
  // Meetings: from the site team only Tle, Jaran and Gift (person settings, schema 0007).
  team: D('view', 'view', 'view', 'none', 'none', 'edit', 'view', 'none'),
  // Caltex: Files shows only files shared with Caltex (e.g. each weekly safety meeting from the Monday of its week).
  caltex: D('view', 'view', 'view', 'view', 'view', 'edit', 'view', 'edit'),
  ks: D('none', 'none', 'view', 'view', 'none', 'edit', 'none', 'none'),
  owner: D('none', 'none', 'view', 'view', 'none', 'edit', 'none', 'none'),
};

// Admins (Brian, Ming) can never be set below this, so they cannot lock themselves out.
// It deliberately gives no schedule editing: that is granted per person (Brian's owner login has it).
export const ADMIN_FLOOR = D('view', 'view', 'view', 'view', 'view', 'edit', 'edit', 'edit');
export const OWNER_LEVELS = D('edit', 'view', 'edit', 'edit', 'edit', 'edit', 'edit', 'edit');

export function groupOf(person) {
  if (!person) return null;
  if (person.company === 'spp') return person.level === 'team' ? 'team' : 'spp';
  return ['caltex', 'ks', 'owner'].includes(person.company) ? person.company : null;
}

const clampToPage = (pageId, level) => {
  const page = pageById(pageId);
  if (!page) return 'none';
  // Highest level this page supports that does not exceed the requested one.
  return [...page.levels].reverse().find((l) => RANK[l] <= RANK[level]) || 'none';
};

/** rows: [{subject:'group:ks'|'person:gift', page, level}] */
export function accessTable(rows = []) {
  const groups = Object.fromEntries(ACCESS_GROUPS.map((g) => [g.id, { ...DEFAULT_PAGE_ACCESS[g.id] }]));
  const people = {};
  for (const r of rows) {
    if (!pageById(r.page) || !LEVELS.includes(r.level)) continue;
    const [kind, id] = String(r.subject).split(':');
    if (kind === 'group' && groups[id]) groups[id][r.page] = r.level;
    if (kind === 'person' && id) (people[id] ||= {})[r.page] = r.level;
  }
  return { groups, people };
}

/** { pageId: 'none'|'view'|'edit' } for one person. */
export function levelsFor(person, table) {
  const out = Object.fromEntries(PAGE_IDS.map((id) => [id, 'none']));
  if (!person || !person.active) return out;
  const g = groupOf(person);
  if (g) Object.assign(out, table.groups[g]);
  Object.assign(out, table.people[person.id] || {});
  if (person.level === 'admin') for (const id of PAGE_IDS) if (!atLeast(out[id], ADMIN_FLOOR[id])) out[id] = ADMIN_FLOOR[id];
  // Observers look but never change anything.
  if (person.level === 'observer') for (const id of PAGE_IDS) if (out[id] === 'edit') out[id] = 'view';
  for (const id of PAGE_IDS) out[id] = clampToPage(id, out[id]);
  return out;
}
