// Seeds a fresh task database with the roster and access configuration.
// Sample tasks are only for local previews and the staging copy, never production.
import { rosterPeople, REPORTS_TO, FOLLOWS, REQUEST_CONTACTS, AREAS, CATEGORIES, PARTNER_DIRECTORY, PARTNER_PEERS } from './roster.mjs';

export function rosterStatements(db) {
  const q = (sql, ...a) => db.prepare(sql).bind(...a);
  const st = [];
  for (const p of rosterPeople()) {
    st.push(q('INSERT INTO people(id, name, company, level, title, aliases_json, hidden_from_json, safety_reports, quiet, active, language) VALUES(?,?,?,?,?,?,?,?,?,1,?)',
      p.id, p.name, p.company, p.level, p.title, JSON.stringify(p.aliases), JSON.stringify(p.hiddenFrom), p.safetyReports ? 1 : 0, p.quiet ? 1 : 0, p.language));
  }
  for (const [pid, bosses] of Object.entries(REPORTS_TO)) for (const b of bosses) st.push(q('INSERT INTO reports_to VALUES(?,?)', pid, b));
  for (const [pid, ids] of Object.entries(FOLLOWS)) for (const f of ids) st.push(q('INSERT INTO follows VALUES(?,?)', pid, f));
  for (const [s, ids] of Object.entries(REQUEST_CONTACTS)) for (const r of ids) st.push(q('INSERT INTO request_contacts VALUES(?,?)', s, r));
  AREAS.forEach(([id, name], i) => st.push(q('INSERT INTO areas VALUES(?,?,?)', id, name, i + 1)));
  CATEGORIES.forEach(([id, name], i) => st.push(q('INSERT INTO categories(id, name, position) VALUES(?,?,?)', id, name, i + 1)));
  st.push(q('INSERT INTO counters VALUES(?,?)', 'CP', 0), q('INSERT INTO counters VALUES(?,?)', 'RQ', 0));
  st.push(q('INSERT INTO settings VALUES(?,?)', 'partnerDirectory', JSON.stringify(PARTNER_DIRECTORY)));
  st.push(q('INSERT INTO settings VALUES(?,?)', 'partnerPeers', JSON.stringify(PARTNER_PEERS)));
  return st;
}

export async function seedRoster(db) { await db.batch(rosterStatements(db)); }
