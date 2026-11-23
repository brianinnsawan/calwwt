// Permission matrix: every rule in ACCESS-RULES.md, checked for every person.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rosterWorld } from '../src/world.mjs';
import * as P from '../src/policy.mjs';

const W = rosterWorld();
const who = (id) => W.people.get(id);
const ALL = [...W.people.keys()];
const SPP = ['brian', 'ming', 'keng', 'noom', 'bo', 'boss', 'praew', 'a', 'tle', 'gift', 'por'];
const CALTEX = ['bas', 'net', 'boy', 'oat'];
const KS = ['tom', 'men', 'wut'];
const SEE_ALL = ['brian', 'ming', 'keng', 'noom', 'bo', 'boss', 'praew'];

const task = (creatorId, assignees, extra = {}) => ({ id: 't', kind: 'task', status: 'doing', creatorId, leadId: assignees[0], assignees, shared: [], ...extra });
const seesPeople = (viewer) => ALL.filter((id) => P.canSeePerson(W, who(viewer), who(id))).sort();
const seers = (t) => ALL.filter((id) => P.canSeeTask(W, who(id), t)).sort();
const sorted = (a) => [...a].sort();

test('directory: who each person can see by name', () => {
  for (const v of SEE_ALL) assert.deepEqual(seesPeople(v), sorted(ALL), v);
  const teamView = sorted(['brian', 'ming', 'keng', 'noom', 'bo', 'a', 'tle', 'gift', 'por']);
  for (const v of ['a', 'tle', 'por']) assert.deepEqual(seesPeople(v), teamView, v);
  assert.deepEqual(seesPeople('gift'), sorted([...teamView, 'oat']), 'gift also sees her request contact');
  const caltexView = sorted(['brian', 'ming', 'keng', 'noom', 'bo', 'tle', 'gift', 'por', ...CALTEX]);
  for (const v of CALTEX) assert.deepEqual(seesPeople(v), caltexView, v);
  const ksView = sorted([...KS, 'chai', 'brian', 'bo', 'noom']);
  for (const v of [...KS, 'chai']) assert.deepEqual(seesPeople(v), ksView, v);
});

test('A and observers are never visible to partners, even on a shared task', () => {
  const t = task('bas', ['gift'], { shared: ['a'] });
  for (const v of [...CALTEX, ...KS, 'chai']) {
    for (const hidden of ['a', 'boss', 'praew']) {
      const d = P.displayPerson(W, who(v), hidden, P.participants(t));
      assert.equal(d.id, null, `${hidden} hidden from ${v}`);
      assert.equal(d.masked, true);
    }
  }
  for (const v of ['a', 'tle', 'gift', 'por']) {
    assert.equal(P.displayPerson(W, who(v), 'boss').id, null, `observer hidden from ${v}`);
  }
});

test('partners see SPP people as "SPP project staff", never a trade or internal label', () => {
  for (const v of CALTEX) {
    for (const id of ['gift', 'tle', 'ming', 'bo']) {
      const d = P.displayPerson(W, who(v), id);
      assert.equal(d.title, 'SPP project staff');
      assert.equal(d.level, undefined, 'no access level shown to partners');
    }
  }
});

test('genuine sender: Gift sees "Bas" on the task Bas gave her, but not the rest of Caltex', () => {
  const t = task('bas', ['gift']);
  const d = P.displayPerson(W, who('gift'), 'bas', P.participants(t));
  assert.equal(d.name, 'Bas');
  assert.equal(d.companyName, 'Caltex');
  assert.equal(P.canSeePerson(W, who('gift'), who('net')), false);
  assert.equal(P.displayPerson(W, who('gift'), 'net', P.participants(t)).id, null);
});

const TEAM = ['a', 'tle', 'gift', 'por'];
test('the site team sees one another\'s work: a task Brian sends to A is seen by the whole site team', () => {
  assert.deepEqual(seers(task('brian', ['a'])), sorted([...SEE_ALL, ...TEAM]));
  assert.deepEqual(seers(task('brian', ['tle'])), sorted([...SEE_ALL, ...TEAM]));
  assert.deepEqual(seers(task('keng', ['gift'])), sorted([...SEE_ALL, ...TEAM]));
});

test('a task from one site team member to Brian, shared with Por, is seen by the whole site team', () => {
  assert.deepEqual(seers(task('gift', ['brian'], { shared: ['por'] })), sorted([...SEE_ALL, ...TEAM]));
});

test('seeing a teammate\'s task does not let you change it: Gift can read and comment on Por\'s task only', () => {
  const t = task('keng', ['por']);
  assert.equal(P.canSeeTask(W, who('gift'), t), true);
  assert.equal(P.canComment(W, who('gift'), t), true);
  assert.equal(P.canEditTask(W, who('gift'), t), false);
  assert.equal(P.canClose(W, who('gift'), t), false);
  assert.equal(P.canEditTask(W, who('tle'), t), true, 'leads still can');
});

test('internal management task is hidden from team and partners', () => {
  assert.deepEqual(seers(task('keng', ['brian', 'ming'])), sorted(SEE_ALL));
});

test('Caltex sees only work involving Caltex, company-wide', () => {
  const fromNet = task('net', ['keng']);
  assert.deepEqual(seers(fromNet), sorted([...SEE_ALL, ...CALTEX, 'keng']).filter((x, i, a) => a.indexOf(x) === i));
  const internalWithGift = task('brian', ['gift']);
  for (const v of CALTEX) assert.equal(P.canSeeTask(W, who(v), internalWithGift), false, v);
});

test('KS and land owner see only work involving KS or the land owner\'s own company', () => {
  const ksTask = task('tom', ['bo']);
  for (const v of KS) assert.equal(P.canSeeTask(W, who(v), ksTask), true);
  assert.equal(P.canSeeTask(W, who('chai'), ksTask), false, 'land owner does not see KS-only work');
  for (const v of CALTEX) assert.equal(P.canSeeTask(W, who(v), ksTask), false);
});

test('internal follow-ups are never shown to partners, even if they are somehow on it', () => {
  const f = task('gift', ['gift'], { kind: 'followup', shared: ['oat'] });
  assert.equal(P.canSeeTask(W, who('oat'), f), false);
});

test('observers see everything but cannot change anything', () => {
  const t = task('brian', ['gift']);
  for (const v of ['boss', 'praew']) {
    assert.equal(P.canSeeTask(W, who(v), t), true);
    assert.equal(P.canCreate(who(v)), false);
    assert.equal(P.canEditTask(W, who(v), t), false);
    assert.equal(P.canComment(W, who(v), t), false);
    assert.equal(P.canClose(W, who(v), t), false);
    assert.equal(P.canRequest(W, who(v), who('oat')), false);
  }
});

test('nobody can assign to observers; SPP cannot assign tasks to partners', () => {
  for (const v of ['brian', 'keng', 'gift']) {
    assert.equal(P.canAssign(W, who(v), who('boss')), false);
    assert.equal(P.canAssign(W, who(v), who('oat')), false, `${v} must send a request`);
  }
  assert.equal(P.canAssign(W, who('bas'), who('gift')), true, 'Caltex can give work to SPP people it sees');
  assert.equal(P.canAssign(W, who('bas'), who('a')), false, 'but not A');
  assert.equal(P.canAssign(W, who('tom'), who('gift')), false, 'KS cannot see Gift');
});

test('request contacts exactly as agreed', () => {
  const expected = {
    brian: [...CALTEX, ...KS, 'chai'], noom: [...CALTEX, ...KS, 'chai'],
    ming: ['oat'], keng: ['boy', 'net'], bo: ['net'], gift: ['oat'],
  };
  const partners = [...CALTEX, ...KS, 'chai'];
  for (const s of SPP) {
    const got = partners.filter((r) => P.canRequest(W, who(s), who(r))).sort();
    assert.deepEqual(got, sorted(expected[s] || []), s);
  }
  const basSenders = SPP.filter((s) => P.canRequest(W, who(s), who('bas'))).sort();
  assert.deepEqual(basSenders, ['brian', 'noom']);
});

test('who can close: creator, manager, admin, or a lead of an assignee', () => {
  const t = task('keng', ['gift']);
  const closers = ALL.filter((id) => P.canClose(W, who(id), t)).sort();
  assert.deepEqual(closers, sorted(['brian', 'ming', 'keng', 'noom', 'tle', 'a']), 'Noom leads A, who leads Tle');
  const fromBas = task('bas', ['gift']);
  assert.deepEqual(ALL.filter((id) => P.canClose(W, who(id), fromBas)).sort(), sorted(['brian', 'ming', 'keng', 'noom', 'bas', 'tle', 'a']));
});

test('who can edit: people on it, their leads, staff and up; Tle can help clear A\'s work', () => {
  const t = task('brian', ['a']);
  const editors = ALL.filter((id) => P.canEditTask(W, who(id), t)).sort();
  assert.deepEqual(editors, sorted(['brian', 'ming', 'keng', 'noom', 'bo', 'a', 'tle']));
});

test('requests: seen by sender, recipient company, sender leads and SPP staff; never by other partners', () => {
  const req = { id: 'r', senderId: 'gift', recipientId: 'oat', status: 'open' };
  const seen = ALL.filter((id) => P.canSeeRequest(W, who(id), req)).sort();
  assert.deepEqual(seen, sorted([...SEE_ALL, 'gift', 'tle', 'a', ...CALTEX]));
  assert.equal(P.canAnswerRequest(W, who('oat'), req), true);
  assert.equal(P.canAnswerRequest(W, who('gift'), req), false);
  assert.equal(P.canCloseRequest(W, who('gift'), req), true);
  assert.equal(P.canCloseRequest(W, who('oat'), req), false);
});

test('inactive people can do nothing', () => {
  const W2 = { ...W, people: new Map(W.people) };
  W2.people.set('gift', { ...who('gift'), active: false });
  assert.equal(P.canSeeTask(W2, W2.people.get('gift'), task('gift', ['gift'])), false);
});

test('Gift is visible to Caltex but hidden from KS and the land owner, even on a shared task', () => {
  for (const v of CALTEX) assert.equal(P.canSeePerson(W, who(v), who('gift')), true, v);
  const t = task('brian', ['bo'], { shared: ['gift', 'tom', 'chai'] });
  for (const v of [...KS, 'chai']) {
    assert.equal(P.canSeePerson(W, who(v), who('gift')), false, v);
    assert.equal(P.displayPerson(W, who(v), 'gift', P.participants(t)).id, null, `${v} sees Gift masked`);
  }
});

test('KS and the land owner never see other SPP names, even when on the same task', () => {
  const t = task('keng', ['bo'], { shared: ['tom', 'chai', 'ming'] });
  for (const v of [...KS, 'chai']) {
    for (const hidden of ['keng', 'ming', 'a', 'tle', 'gift', 'por']) {
      assert.equal(P.displayPerson(W, who(v), hidden, P.participants(t)).id, null, `${hidden} masked for ${v}`);
    }
    for (const shown of ['brian', 'bo', 'noom']) assert.equal(P.displayPerson(W, who(v), shown, P.participants(t)).name, who(shown).name);
    for (const c of CALTEX) assert.equal(P.canSeePerson(W, who(v), who(c)), false, `${c} hidden from ${v}`);
  }
});
