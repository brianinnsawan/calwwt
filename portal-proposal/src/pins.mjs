// Documents pinned to a page (e.g. Safety -> HES plan), matched by file name in Files.
// Brian, 2 Nov 2026 (audit F03): SPP always sees the newest upload; Caltex sees only the newest version shared with Caltex,
// so a new version starts unshared instead of inheriting the previous version's sharing.
export const PINS = {
  // Matches e.g. "HES_Stewardship_Plan__NTI_City_Park.xlsx", "HES Stewardship Plan rev2.xlsx".
  hes: { page: 'safety', match: (name) => /^hes[\s_-]*stewardship[\s_-]*plan.*\.xlsx$/i.test(name) },
};
export const isPinnedName = (name) => Object.values(PINS).some((p) => p.match(name));
