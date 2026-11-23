// End-to-end checks of the task service against a real SQLite database:
// what each person gets back from the server, not just what the rules say.
import test from 'node:test';
import assert from 'node:assert/strict';
import { localD1 } from './local-d1.mjs';
import { seedRoster } from '../src/seed.mjs';
import { taskService } from '../src/service.mjs';

async function setup() {
  const db = localD1();
  await seedRoster(db);
  let tick = 0;
  const svc = taskService(db, { now: () => new Date(Date.UTC(2026, 10, 1, 8, 0, tick++)).toISOString() });
  return { db, svc };
}
const json = (x) => JSON.stringify(x);
const ids = (state) => state.tasks.map((t) => t.id).sort();

test('state only contains tasks the viewer may see, with A hidden from Caltex', async () => {
  const { svc } = await setup();
  const internal = await svc.createTask('brian', { title: 'Internal budget review', assignees: ['ming'] });
  const toA = await svc.createTask('brian', { title: 'Check formwork', assignees: ['a'] });
  const fromBas = await svc.createTask('bas', { title: 'Send lux calculation', assignees: ['gift'], description: 'Please copy @A when done' });

  const gift = await svc.state('gift');
  assert.deepEqual(ids(gift), [toA.id, fromBas.id].sort(), 'the site team sees one another\'s work, not internal management tasks');
  const giftTask = gift.tasks.find((x) => x.id === fromBas.id);
  assert.equal(giftTask.creator.name, 'Bas', 'genuine Caltex sender');

  const tle = await svc.state('tle');
  assert.deepEqual(ids(tle), [toA.id, fromBas.id].sort());

  const bas = await svc.state('bas');
  assert.deepEqual(ids(bas), [fromBas.id]);
  const text = json(bas);
  assert.ok(!/"A"|"id":"a"/.test(text), 'A never appears for Caltex');
  assert.ok(bas.tasks[0].description.includes('@SPP project staff'), 'mention of A is masked');
  assert.ok(!bas.people.some((p) => p.id === 'a' || p.id === 'boss' || p.id === 'praew'));
  assert.ok(!text.toLowerCase().includes('subcontract'));

  const net = await svc.state('net');
  assert.deepEqual(ids(net), [fromBas.id], 'Caltex company-wide');

  const tom = await svc.state('tom');
  assert.deepEqual(ids(tom), []);
  assert.equal(internal.id.startsWith('CP-'), true);
});

test('partners never get SPP titles or access levels', async () => {
  const { svc } = await setup();
  const bas = await svc.state('bas');
  for (const p of bas.people.filter((x) => x.company === 'spp')) {
    assert.equal(p.title, 'SPP project staff');
    assert.equal(p.level, undefined);
  }
});

test('observers see everything and are blocked from every change', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('brian', { title: 'Something', assignees: ['gift'] });
  const boss = await svc.state('boss');
  assert.deepEqual(ids(boss), [t.id]);
  assert.equal(boss.me.can.create, false);
  assert.equal(boss.admin, undefined, 'admin screens are for admins only');
  await assert.rejects(svc.createTask('boss', { title: 'x' }), { status: 403 });
  await assert.rejects(svc.taskAction('praew', t.id, { action: 'comment', body: 'hi' }), { status: 403 });
  await assert.rejects(svc.adminUpdatePerson('boss', 'gift', { title: 'x' }), { status: 403 });
  const gift = await svc.state('gift');
  assert.ok(!gift.people.some((p) => p.id === 'boss'), 'observers hidden from team');
});

test('SPP cannot assign tasks to partners; must use a request', async () => {
  const { svc } = await setup();
  await assert.rejects(svc.createTask('brian', { title: 'Sign payment', assignees: ['net'] }), { status: 409 });
  await assert.rejects(svc.createTask('gift', { title: 'x', assignees: ['boss'] }), { status: 403 });
  await assert.rejects(svc.createTask('bas', { title: 'x', assignees: ['a'] }), { status: 403 });
});

test('requests follow the contact list, and private notes never reach partners', async () => {
  const { svc } = await setup();
  await assert.rejects(svc.sendRequest('gift', { recipient: 'bas', title: 'x' }), { status: 403 });
  await assert.rejects(svc.sendRequest('keng', { recipient: 'oat', title: 'x' }), { status: 403 });
  await assert.rejects(svc.sendRequest('tle', { recipient: 'oat', title: 'x' }), { status: 403 });
  const r = await svc.sendRequest('gift', { recipient: 'oat', title: 'Review electrical safety pack', message: 'Pack attached.', privateNote: 'Chase if no reply by Friday' });

  const oat = await svc.state('oat');
  assert.equal(oat.requests.length, 1);
  assert.equal(oat.requests[0].sender.name, 'Gift');
  assert.equal(oat.requests[0].sender.title, 'SPP project staff');
  assert.equal(oat.requests[0].followupTaskId, undefined);
  assert.ok(!json(oat).includes('Chase if no reply'));
  assert.equal(oat.tasks.length, 0, 'follow-up task is internal');

  const gift = await svc.state('gift');
  assert.equal(gift.requests[0].followupTaskId, r.followupTaskId);
  assert.ok(gift.tasks.some((t) => t.id === r.followupTaskId && t.description.includes('Chase')));

  const tle = await svc.state('tle');
  assert.equal(tle.requests.length, 1, 'lead sees the request');
  const por = await svc.state('por');
  assert.equal(por.requests.length, 0);
  const tom = await svc.state('tom');
  assert.equal(tom.requests.length, 0);

  // Oat answers; Gift closes; follow-up closes too.
  await assert.rejects(svc.requestAction('gift', r.id, { action: 'answer', version: 1 }), { status: 403 });
  await svc.requestAction('oat', r.id, { action: 'answer', body: 'Looks fine.', version: 1 });
  const giftAfter = await svc.state('gift');
  assert.equal(giftAfter.requests[0].status, 'answered');
  assert.ok(giftAfter.notifications.some((n) => n.kind === 'request_answered'));
  await svc.requestAction('gift', r.id, { action: 'close', version: 2 });
  const done = await svc.state('gift');
  assert.equal(done.requests[0].status, 'closed');
  assert.equal(done.tasks.find((t) => t.id === r.followupTaskId).status, 'done');
});

test('sign-off: team member submits, lead approves, history is kept', async () => {
  const { svc, db } = await setup();
  const t = await svc.createTask('keng', { title: 'Install MDB', assignees: ['gift'] });
  await svc.taskAction('gift', t.id, { action: 'progress', progress: 100 });
  let s = await svc.state('gift');
  assert.equal(s.tasks[0].status, 'doing', '100% does not close the task');
  await svc.taskAction('gift', t.id, { action: 'submit', version: s.tasks[0].version });
  s = await svc.state('tle');
  const task = s.tasks.find((x) => x.id === t.id);
  assert.equal(task.status, 'review');
  assert.equal(task.can.close, true, 'Tle leads Gift');
  const keng = await svc.state('keng');
  assert.ok(keng.notifications.some((n) => n.kind === 'signoff'));
  await svc.taskAction('tle', t.id, { action: 'approve', version: task.version });
  s = await svc.state('gift');
  assert.equal(s.tasks[0].status, 'done');
  const snap = await db.prepare('SELECT COUNT(*) n FROM completion_snapshots').first();
  assert.equal(snap.n, 1);
  await assert.rejects(svc.taskAction('gift', t.id, { action: 'reopen', reason: 'oops' }), { status: 403 });
  await assert.rejects(svc.taskAction('keng', t.id, { action: 'reopen', reason: '', version: s.tasks[0].version }), { status: 400 });
  await svc.taskAction('keng', t.id, { action: 'reopen', reason: 'Cover plate missing', version: s.tasks[0].version });
  await assert.rejects(db.prepare('DELETE FROM events').run(), /APPEND_ONLY/);
});

test('stale edits are rejected', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('brian', { title: 'A', assignees: ['bo'] });
  await svc.taskAction('bo', t.id, { action: 'update', version: 1, fields: { priority: 'high' } });
  await assert.rejects(svc.taskAction('brian', t.id, { action: 'update', version: 1, fields: { priority: 'low' } }), { status: 409 });
});

test('hand-off: Tle hands to Gift, stays able to follow, owner and leads told', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('brian', { title: 'Purlins', assignees: ['tle'] });
  await svc.taskAction('tle', t.id, { action: 'handoff', person: 'gift', version: 1 });
  const s = await svc.state('gift');
  assert.deepEqual(s.tasks[0].assignees.map((x) => x.id), ['gift']);
  const tle = await svc.state('tle');
  assert.ok(tle.tasks.some((x) => x.id === t.id));
  const brian = await svc.state('brian');
  assert.ok(brian.notifications.some((n) => n.kind === 'handoff' && n.data.person.name === 'Gift'));
  await assert.rejects(svc.taskAction('tle', t.id, { action: 'handoff', person: 'oat', version: 2 }), (e) => e.status >= 400);
});

test('reporting notices: safety goes to Ming; Noom is never pestered', async () => {
  const { svc } = await setup();
  await svc.createTask('gift', { title: 'Exposed cable at MDB trench', category: 'safety', assignees: ['tle'] });
  await svc.createTask('a', { title: 'Order shoring', assignees: ['a'] });
  const ming = await svc.state('ming');
  assert.ok(ming.notifications.some((n) => n.kind === 'upline' && n.data.safety));
  const noom = await svc.state('noom');
  assert.equal(noom.notifications.filter((n) => n.kind === 'upline').length, 0);
  const brian = await svc.state('brian');
  assert.equal(brian.notifications.filter((n) => n.kind === 'upline').length, 2);
});

test('mentions share SPP colleagues in, but cannot pull in people you cannot assign', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('keng', { title: 'Check drain levels', assignees: ['ming'] });
  assert.ok(!(await svc.state('gift')).tasks.some((x) => x.id === t.id), 'no site team member on it yet');
  const res = await svc.taskAction('ming', t.id, { action: 'comment', body: '@Gift can you look too?' });
  assert.ok(res.warnings.some((w) => w.includes('Shared with')));
  const gift = await svc.state('gift');
  assert.ok(gift.tasks.some((x) => x.id === t.id));
  assert.ok((await svc.state('por')).tasks.some((x) => x.id === t.id), 'and now the rest of the site team sees it too');
  const res2 = await svc.taskAction('gift', t.id, { action: 'comment', body: '@Bas FYI' });
  assert.ok(res2.warnings.some((w) => w.includes('No one called')));
  const bas = await svc.state('bas');
  assert.equal(bas.tasks.length, 0);
});

test('admin can change reporting lines; nobody else can', async () => {
  const { svc } = await setup();
  await assert.rejects(svc.adminUpdatePerson('keng', 'gift', { reportsTo: ['keng'] }), { status: 403 });
  await svc.adminUpdatePerson('ming', 'gift', { reportsTo: ['tle'] });
  await assert.rejects(svc.adminUpdatePerson('brian', 'a', { reportsTo: ['gift'] }), { status: 400 }, 'no loops');
  await assert.rejects(svc.adminUpdatePerson('brian', 'brian', { level: 'staff' }), { status: 400 });
});

test('audit fixes: sign-off never closes, dates are checked, reopened requests reopen their follow-up', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('brian', { title: 'Check levels', assignees: ['bo'] });
  await svc.taskAction('brian', t.id, { action: 'submit', version: 1 });
  let s = await svc.state('brian');
  assert.equal(s.tasks.find((x) => x.id === t.id).status, 'review', 'a closer sending for sign-off does not close it');
  await assert.rejects(svc.createTask('brian', { title: 'x', start: '2026-11-10', due: '2026-11-05' }), { status: 400 });
  await assert.rejects(svc.createTask('brian', { title: 'x', due: '2026-02-31' }), { status: 400 });
  const ok = await svc.createTask('brian', { title: 'y', start: '2026-11-01', due: '2026-11-05' });
  await assert.rejects(svc.taskAction('brian', ok.id, { action: 'update', version: 1, fields: { due: '2026-10-01' } }), { status: 400 });
  const r = await svc.sendRequest('brian', { recipient: 'net', title: 'Sign claim' });
  await svc.requestAction('brian', r.id, { action: 'close', version: 1 });
  await svc.requestAction('brian', r.id, { action: 'reopen', version: 2 });
  s = await svc.state('brian');
  assert.equal(s.tasks.find((x) => x.id === r.followupTaskId).status, 'doing');
});

test('default screen language: English for Brian, Thai for everyone else; admins can change it', async () => {
  const { svc } = await setup();
  assert.equal((await svc.state('brian')).me.lang, 'en');
  for (const p of ['ming', 'gift', 'bas', 'chai']) assert.equal((await svc.state(p)).me.lang, 'th', p);
  await svc.adminUpdatePerson('brian', 'ming', { language: 'en' });
  assert.equal((await svc.state('ming')).me.lang, 'en');
  await assert.rejects(svc.adminUpdatePerson('brian', 'ming', { language: 'fr' }), { status: 400 });
});

test('KS and the land owner see only Brian, Bo and Noom from SPP, and no Caltex', async () => {
  const { svc } = await setup();
  for (const v of ['tom', 'men', 'wut', 'chai']) {
    const ids = (await svc.state(v)).people.map((p) => p.id).sort();
    assert.deepEqual(ids, ['bo', 'brian', 'chai', 'men', 'noom', 'tom', 'wut'], v);
  }
});

test('site team (10 Nov 2026): a task shared with one site team member is seen by all of them, and by no partner', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('keng', { title: 'Internal cost check', assignees: ['ming'] });
  await svc.taskAction('keng', t.id, { action: 'share', person: 'por', version: (await svc.state('keng')).tasks.find((x) => x.id === t.id).version });
  for (const id of ['a', 'tle', 'gift', 'por']) assert.ok((await svc.state(id)).tasks.some((x) => x.id === t.id), id);
  const res = await svc.taskAction('por', t.id, { action: 'comment', body: '@Gift have a look' });
  assert.ok(!res.warnings.some((w) => /Shared with/.test(w)), 'Gift already sees it; nothing is widened');
  for (const id of ['bas', 'net', 'tom', 'chai']) assert.ok(!(await svc.state(id)).tasks.some((x) => x.id === t.id), id);
});

test('night audit: bucket ids are plain letters and numbers (they are used inside the page)', async () => {
  const { svc } = await setup();
  const r = await svc.addCategory('gift', { name: '"></select><textarea>' });
  assert.match(r.id, /^[a-z0-9]{1,30}$/);
});

test('repeating tasks (5 Nov 2026): chosen days; a copy with a bell reminder each chosen morning; stop anytime', async () => {
  const { db, svc } = await setup();
  // Weekly meeting prep: every Monday, first due Monday 9 Nov 2026
  const prep = await svc.createTask('brian', { title: 'Prepare weekly meeting', assignees: ['ming', 'gift'], due: '2026-11-09', repeatDays: [1], checklist: ['Agenda', 'Photos'] });
  const row = await db.prepare('SELECT repeat_days, series_id, repeat FROM tasks WHERE id=?').bind(prep.id).first();
  assert.deepEqual({ ...row }, { repeat_days: '1', series_id: prep.id, repeat: 'weekly' });
  assert.deepEqual((await svc.runRepeats('2026-11-08')).made, [], 'Sunday: nothing');
  // Monday 9 Nov: the first one is due today -> reminder only, no copy
  const mon1 = await svc.runRepeats('2026-11-09');
  assert.deepEqual([mon1.made, mon1.reminded], [[], [prep.id]]);
  const notes = async (who) => (await db.prepare("SELECT task_id FROM notifications WHERE to_id=? AND kind='due_today' ORDER BY id").bind(who).all()).results.map((r) => r.task_id);
  assert.deepEqual(await notes('ming'), [prep.id]);
  assert.deepEqual((await svc.runRepeats('2026-11-09')).reminded, [], 'running twice the same day changes nothing');
  // Monday 16 Nov: last week's still open -> a new copy anyway, due today, same people and steps (unticked)
  const mon2 = await svc.runRepeats('2026-11-16');
  assert.equal(mon2.made.length, 1);
  const copy = (await svc.state('brian')).tasks.find((t) => t.id === mon2.made[0]);
  assert.deepEqual([copy.title, copy.due, copy.status, copy.repeatDays, copy.assignees.map((p) => p.id ?? p).sort()], ['Prepare weekly meeting', '2026-11-16', 'todo', '1', ['gift', 'ming']]);
  assert.deepEqual(copy.checklist.map((c) => [c.text, c.done]), [['Agenda', false], ['Photos', false]]);
  assert.deepEqual(await notes('gift'), [prep.id, copy.id]);
  // Closing does not make an extra copy
  const closed = await svc.taskAction('brian', copy.id, { action: 'complete', version: copy.version });
  assert.equal(closed.next, null);
  // The next Monday's copy comes on schedule; turning its days off stops the series
  const mon3 = await svc.runRepeats('2026-11-23');
  assert.equal(mon3.made.length, 1);
  const newest = (await svc.state('brian')).tasks.find((t) => t.id === mon3.made[0]);
  await svc.taskAction('brian', newest.id, { action: 'update', version: newest.version, fields: { repeatDays: [] } });
  assert.deepEqual((await svc.runRepeats('2026-11-30')).made, [], 'stopped');
});

test('repeating tasks: daily on chosen days (Mon–Sat), one copy per day, none on Sunday; bad days refused', async () => {
  const { svc } = await setup();
  const t = await svc.createTask('brian', { title: 'Toolbox talk', assignees: ['ming'], due: '2026-11-09', repeatDays: [1, 2, 3, 4, 5, 6] });
  assert.deepEqual((await svc.runRepeats('2026-11-09')).made, []);
  assert.equal((await svc.runRepeats('2026-11-10')).made.length, 1);
  assert.equal((await svc.runRepeats('2026-11-10')).made.length, 0, 'once a day');
  assert.equal((await svc.runRepeats('2026-11-14')).made.length, 1, 'Saturday');
  assert.equal((await svc.runRepeats('2026-11-15')).made.length, 0, 'Sunday');
  await assert.rejects(svc.createTask('brian', { title: 'x', repeatDays: [0] }), { status: 400 });
  await assert.rejects(svc.createTask('brian', { title: 'x', repeatDays: ['1'] }), { status: 400 });
  assert.ok(t.id);
});

test('you can add yourself to a task you can edit, without a bell to yourself (10 Nov 2026)', async () => {
  const { db, svc } = await setup();
  const t = await svc.createTask('brian', { title: 'Weekly safety walk', assignees: ['gift', 'por'] });
  await svc.taskAction('brian', t.id, { action: 'assign', person: 'brian' });
  const mine = (await svc.state('brian')).tasks.find((x) => x.id === t.id);
  assert.ok(mine.assignees.some((a) => a.id === 'brian'));
  const bells = await db.prepare("SELECT COUNT(*) n FROM notifications WHERE to_id='brian' AND kind='assigned' AND task_id=?").bind(t.id).first();
  assert.equal(bells.n, 0);
});

// The live database (Cloudflare D1) takes at most 100 values in one query; the test database refuses more too.
// Found by the site audit, 10 Nov 2026: with 101 tasks the whole Tasks page would have failed for everyone.
test('the Tasks page still loads with more than 100 tasks and more than 100 requests', async () => {
  const { svc, db } = await setup();
  let first, last;
  for (let i = 0; i < 130; i++) { last = await svc.createTask('brian', { title: `Task ${i}`, assignees: ['ming'], checklist: i % 10 === 0 ? ['a', 'b'] : [] }); first ||= last; }
  await svc.taskAction('ming', last.id, { action: 'comment', body: 'on it' });
  const state = await svc.state('brian');
  assert.equal(state.tasks.length, 130);
  assert.equal(state.tasks.find((t) => t.id === first.id).checklist.length, 2, 'steps of the first task');
  assert.equal(state.tasks.find((t) => t.id === last.id).comments.length, 1, 'comments of the last task');
  assert.deepEqual(state.tasks.find((t) => t.id === last.id).assignees.map((p) => p.id), ['ming']);
  for (let i = 0; i < 110; i++) await svc.sendRequest('brian', { recipient: 'bas', title: `Request ${i}`, message: 'please' });
  const again = await svc.state('brian');
  assert.equal(again.requests.length, 110);
  assert.equal(again.tasks.filter((t) => t.kind === 'followup').length, 110, 'each request gives the sender a follow-up task');
  assert.equal(again.tasks.length, 240);
  // Marking many notices as read at once.
  const mine = (await db.prepare("SELECT id FROM notifications WHERE to_id='ming' ORDER BY id").all()).results.map((r) => r.id);
  assert.ok(mine.length > 100, `ming has ${mine.length} notices`);
  await svc.readNotifications('ming', { ids: mine });
  assert.equal((await db.prepare("SELECT count(*) AS n FROM notifications WHERE to_id='ming' AND read=0").first()).n, 0);
});

test('remove a person from the project (15 Nov 2026): switched off, nothing points at them, their tasks go to the admin', async () => {
  const { db, svc } = await setup();
  const names = async (id) => (await db.prepare("SELECT person_id, role FROM task_people WHERE task_id=? ORDER BY person_id").bind(id).all()).results.map((r) => `${r.person_id}:${r.role}`);
  const row = (id) => db.prepare('SELECT lead_id, status, version FROM tasks WHERE id=?').bind(id).first();

  const solo = await svc.createTask('bas', { title: 'Send lux calculation', assignees: ['gift'] });
  const pair = await svc.createTask('ming', { title: 'Check scaffold tags', assignees: ['gift', 'tle'] });            // Gift leads
  const tleLeads = await svc.createTask('ming', { title: 'Rebar count', assignees: ['tle', 'gift'] });               // Tle leads
  const withBrian = await svc.createTask('ming', { title: 'Walk the fence line', assignees: ['gift', 'brian'] });    // Brian already on it
  const sharedWithBrian = await svc.createTask('ming', { title: 'Order PPE', assignees: ['gift'] });
  await svc.taskAction('ming', sharedWithBrian.id, { action: 'share', person: 'brian' });
  const onlyShared = await svc.createTask('ming', { title: 'Gate log', assignees: ['tle'] });
  await svc.taskAction('ming', onlyShared.id, { action: 'share', person: 'gift' });
  const closed = await svc.createTask('ming', { title: 'Old inspection', assignees: ['gift'] });
  await svc.taskAction('ming', closed.id, { action: 'complete', version: 1 });
  const weekly = await svc.createTask('ming', { title: 'Toolbox talk', assignees: ['gift'], due: '2026-11-02', repeatDays: [1] });
  await svc.taskAction('ming', weekly.id, { action: 'complete', version: 1 });                                          // closed, but next Monday's copy comes from it
  const byGift = await svc.createTask('gift', { title: 'Buy cones', assignees: ['por'] });
  // More than 100 open tasks: the live database refuses more than 100 values in one query.
  const many = [];
  for (let i = 0; i < 105; i++) many.push((await svc.createTask('ming', { title: `Punch item ${i + 1}`, assignees: ['gift'] })).id);
  await svc.adminUpdatePerson('brian', 'gift', { safetyReports: true, follows: ['a'] });
  await svc.adminUpdatePerson('brian', 'por', { reportsTo: ['gift', 'tle'] });
  await svc.adminSetPage('brian', { subject: 'person:gift', page: 'drawings', level: 'edit' });
  await db.prepare("INSERT INTO agent_keys(id, person_id, name, key_hash, created_at, expires_at) VALUES('k1','gift','Helper','h1','2026-11-01','2027-01-01'), ('k2','brian','Chief','h2','2026-11-01','2027-01-01')").run();

  const ownPages = (await db.prepare("SELECT COUNT(*) AS n FROM page_access WHERE subject='person:gift'").first()).n;
  assert.ok(ownPages >= 1);
  await assert.rejects(svc.adminRemovePerson('keng', 'gift'), { status: 403 }, 'admins only');
  await assert.rejects(svc.adminRemovePerson('brian', 'brian'), { status: 400 }, 'not yourself');
  await assert.rejects(svc.adminRemovePerson('brian', 'nobody'), { status: 404 });
  const before = (await row(pair.id)).version;
  const out = await svc.adminRemovePerson('brian', 'gift');
  assert.equal(out.moved.length, 5 + 1 + 105, 'every task still to do, and the newest copy of the repeating one');
  assert.equal(out.unshared, 1);

  assert.deepEqual(await names(solo.id), ['brian:assignee']);
  assert.equal((await row(solo.id)).lead_id, 'brian');
  assert.deepEqual(await names(pair.id), ['brian:assignee', 'tle:assignee']);
  assert.equal((await row(pair.id)).lead_id, 'brian', 'Brian leads where the person led');
  assert.equal((await row(pair.id)).version, before + 1, 'open screens notice the change');
  assert.deepEqual(await names(tleLeads.id), ['brian:assignee', 'tle:assignee']);
  assert.equal((await row(tleLeads.id)).lead_id, 'tle', 'another lead stays');
  assert.deepEqual(await names(withBrian.id), ['brian:assignee']);
  assert.deepEqual(await names(sharedWithBrian.id), ['brian:assignee'], 'shared becomes assigned, not both');
  assert.deepEqual(await names(onlyShared.id), ['tle:assignee']);
  assert.deepEqual(await names(closed.id), ['gift:assignee'], 'closed work keeps its history');
  assert.deepEqual(await names(weekly.id), ['brian:assignee']);
  assert.deepEqual(await names(byGift.id), ['por:assignee'], 'tasks they gave to others are untouched');
  for (const id of many) assert.deepEqual(await names(id), ['brian:assignee']);
  const made = await svc.runRepeats('2026-11-09');
  assert.equal(made.made.length, 1);
  assert.deepEqual(await names(made.made[0]), ['brian:assignee'], 'next Monday\'s copy goes to Brian');

  const kinds = (await db.prepare('SELECT kind, by_id, data_json FROM events WHERE task_id=? ORDER BY id').bind(solo.id).all()).results.slice(-2).map((e) => `${e.kind}:${e.by_id}:${JSON.parse(e.data_json).person}`);
  assert.deepEqual(kinds, ['unassigned:brian:gift', 'assigned:brian:brian'], 'the task history says what happened');
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM events WHERE task_id=? AND kind='assigned' AND data_json LIKE '%brian%'").bind(withBrian.id).first()).n, 0, 'no second "assigned" where Brian already was');

  const p = await db.prepare('SELECT active, safety_reports FROM people WHERE id=?').bind('gift').first();
  assert.deepEqual({ ...p }, { active: 0, safety_reports: 0 });
  for (const [sql, n] of [
    ["SELECT COUNT(*) AS n FROM reports_to WHERE person_id='gift' OR boss_id='gift'", 0], ["SELECT COUNT(*) AS n FROM reports_to WHERE person_id='por'", 1],
    ["SELECT COUNT(*) AS n FROM follows WHERE person_id='gift' OR followed_id='gift'", 0], ["SELECT COUNT(*) AS n FROM request_contacts WHERE sender_id='gift' OR recipient_id='gift'", 0],
    ["SELECT COUNT(*) AS n FROM page_access WHERE subject='person:gift'", 0], ["SELECT COUNT(*) AS n FROM page_access_log WHERE subject='person:gift' AND level IS NULL", ownPages],
    ["SELECT COUNT(*) AS n FROM agent_keys WHERE person_id='gift' AND revoked_at IS NOT NULL", 1], ["SELECT COUNT(*) AS n FROM agent_keys WHERE person_id='brian' AND revoked_at IS NULL", 1],
  ]) assert.equal((await db.prepare(sql).first()).n, n, sql);

  await assert.rejects(svc.state('gift'), { status: 403 }, 'the person can no longer open the task app');
  const access = await svc.siteAccess('gift');
  assert.ok(Object.values(access.pages).every((l) => l === 'none'), 'no page is open to them');
  const brian = await svc.state('brian');
  assert.equal(brian.tasks.find((t) => t.id === solo.id).assignees[0].id, 'brian');
  assert.ok(brian.admin.pageAccess.personChanges.some((c) => c.person === 'gift' && c.fields.includes('removed') && c.tasks === 111), 'in the change log');
  assert.ok(!(await svc.state('tle')).people.some((x) => x.id === 'gift'), 'gone from the team\'s people list');
  // Pressing it again changes nothing more.
  const again = await svc.adminRemovePerson('ming', 'gift');
  assert.deepEqual([again.moved.length, again.unshared], [0, 0]);
});
