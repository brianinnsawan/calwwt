// Project roster and access configuration. Mirrors ACCESS-RULES.md.
// Used to seed a new database; after that the database is the source of truth
// and admins change it from the Team & access page.

export const COMPANIES = {
  spp: { name: 'SPP', partnerLabel: 'SPP project staff' },
  caltex: { name: 'Caltex' },
  ks: { name: 'KS Consulting' },
  owner: { name: 'Land owner' },
};

// [id, name, company, level, title, extra]
export const PEOPLE = [
  ['brian', 'Brian', 'spp', 'admin', 'Overall Project Manager', { language: 'en' }],
  ['ming', 'Ming', 'spp', 'admin', ''],
  ['keng', 'Keng', 'spp', 'manager', 'Head Architect', { aliases: ['P.Keng'] }],
  ['noom', 'Noom', 'spp', 'staff', '', { quiet: true }],
  ['bo', 'Bo', 'spp', 'staff', 'Billing administration'],
  ['boss', 'Boss', 'spp', 'observer', ''],
  ['praew', 'Praew', 'spp', 'observer', ''],
  ['a', 'A', 'spp', 'team', '', { hiddenFrom: ['caltex', 'ks', 'owner'] }],
  ['tle', 'Tle', 'spp', 'team', ''],
  ['gift', 'Gift', 'spp', 'team', '', { hiddenFrom: ['ks', 'owner'] }],
  ['por', 'Por', 'spp', 'team', ''],
  ['bas', 'Bas', 'caltex', 'partner', 'Overall Engineering Manager'],
  ['net', 'Net', 'caltex', 'partner', 'Project Manager'],
  ['boy', 'Boy', 'caltex', 'partner', 'Head Architect'],
  ['oat', 'Oat', 'caltex', 'partner', 'Head of Safety', { aliases: ['P.Oat'] }],
  ['tom', 'Tom', 'ks', 'partner', ''],
  ['men', 'Men', 'ks', 'partner', ''],
  ['wut', 'Wut', 'ks', 'partner', ''],
  ['chai', 'Chai', 'owner', 'partner', 'Land owner', { aliases: ['K.Chai'] }],
];

// Ming gets safety reports from the team.
export const SAFETY_REPORTS = ['ming'];

// person -> people they report to
export const REPORTS_TO = {
  a: ['brian', 'noom'],
  tle: ['a', 'ming', 'brian'],
  gift: ['tle', 'ming', 'brian'],
  por: ['tle', 'ming', 'brian'],
};

// person -> people whose work they also see (without reporting)
export const FOLLOWS = { tle: ['a'] };

// Which SPP people each partner company can see. '*spp' = every SPP person
// except observers and people hidden from partners.
export const PARTNER_DIRECTORY = {
  caltex: ['*spp'],
  ks: ['brian', 'bo', 'noom'],
  owner: ['brian', 'bo', 'noom'],
};
// Partner companies that can see each other.
export const PARTNER_PEERS = { caltex: ['caltex'], ks: ['ks', 'owner'], owner: ['ks', 'owner'] };

// sender -> recipients ('*' = anyone at a partner company)
export const REQUEST_CONTACTS = {
  brian: ['*'],
  noom: ['*'],
  ming: ['oat'],
  keng: ['boy', 'net'],
  bo: ['net'],
  gift: ['oat'],
};

export const AREAS = [
  ['building', 'Building'], ['office', 'Office'], ['canopy', 'Canopy'], ['fuel', 'Fuel port'],
  ['sign', 'Highway sign'], ['drainage', 'Drainage'], ['electrical', 'Electrical'],
  ['concrete', 'Concrete'], ['misc', 'Misc'],
];

export const CATEGORIES = [
  ['general', 'General'], ['safety', 'Safety'], ['engineering', 'Engineering'],
  ['permits', 'Permits & approvals'], ['client', 'Client requests'], ['misc', 'Misc'],
];

export function rosterPeople() {
  return PEOPLE.map(([id, name, company, level, title, extra = {}]) => ({
    id, name, company, level, title,
    aliases: extra.aliases || [],
    hiddenFrom: extra.hiddenFrom || [],
    language: extra.language || 'th',
    quiet: !!extra.quiet,
    safetyReports: SAFETY_REPORTS.includes(id),
    active: true,
  }));
}
