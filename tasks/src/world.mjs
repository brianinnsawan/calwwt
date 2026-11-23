// Builds the in-memory "world" the policy functions read.
import { rosterPeople, REPORTS_TO, FOLLOWS, REQUEST_CONTACTS, PARTNER_DIRECTORY, PARTNER_PEERS } from './roster.mjs';

export function buildWorld({ people, reportsTo, follows, contacts, partnerDirectory = PARTNER_DIRECTORY, partnerPeers = PARTNER_PEERS }) {
  const pairsToMap = (pairs) => {
    const m = new Map();
    for (const [a, b] of pairs) { if (!m.has(a)) m.set(a, []); m.get(a).push(b); }
    return m;
  };
  return {
    people: new Map(people.map((p) => [p.id, p])),
    reportsTo: pairsToMap(reportsTo),
    follows: pairsToMap(follows),
    contacts: pairsToMap(contacts),
    partnerDirectory,
    partnerPeers,
  };
}

const flatten = (obj) => Object.entries(obj).flatMap(([k, vs]) => vs.map((v) => [k, v]));

/** The world as described in ACCESS-RULES.md (used for seeding and tests). */
export function rosterWorld() {
  return buildWorld({
    people: rosterPeople(),
    reportsTo: flatten(REPORTS_TO),
    follows: flatten(FOLLOWS),
    contacts: flatten(REQUEST_CONTACTS),
  });
}
