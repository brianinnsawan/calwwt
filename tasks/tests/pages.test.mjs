// Page access (Admin page): defaults from Brian (1 Nov 2026), group and person changes, admin floor, history.
import test from 'node:test';
import assert from 'node:assert/strict';
import { localD1 } from './local-d1.mjs';
import { seedRoster } from '../src/seed.mjs';
import { taskService } from '../src/service.mjs';
import { handleTasksApi } from '../src/api.mjs';

async function setup() {
  const db = localD1();
  await seedRoster(db);
  return { db, svc: taskService(db) };
}
const pages = async (svc, id) => (await taskService(svc.db).siteAccess(id)).pages;

test('defaults: who sees what', async () => {
  const { db } = await setup();
  const svc = { db };
  const P = (d, s, tl, ss, sc, t, f, m) => ({ drawings: d, safety: s, timeline: tl, scurve_station: ss, scurve_caltex: sc, tasks: t, files: f, meetings: m });
  for (const id of ['keng', 'noom', 'bo']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'view', 'view', 'edit', 'edit', 'edit'), id);
  for (const id of ['boss', 'praew']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'view', 'view', 'view', 'view', 'view'), `${id} observer: view only`);
  for (const id of ['brian', 'ming']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'view', 'view', 'edit', 'edit', 'edit'), `${id}: no automatic schedule edit`);
  for (const id of ['a', 'por']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'none', 'none', 'edit', 'view', 'none'), `${id}: no S-curves, no meetings`);
  // Meetings: from the site team only Tle, Jaran and Gift (person rows in schema 0007).
  for (const id of ['tle', 'gift']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'none', 'none', 'edit', 'view', 'edit'), `${id}: no S-curves, meetings`);
  for (const id of ['bas', 'net', 'boy', 'oat']) assert.deepEqual(await pages(svc, id), P('view', 'view', 'view', 'view', 'view', 'edit', 'edit', 'edit'), `${id}: Caltex uploads files (27 Nov 2026)`);
  for (const id of ['tom', 'men', 'wut', 'chai']) assert.deepEqual(await pages(svc, id), P('none', 'none', 'view', 'view', 'none', 'edit', 'none', 'none'), id);
});

test('admins change groups and people; the floor and history hold', async () => {
  const { db } = await setup();
  const svc = taskService(db);
  await svc.adminSetPage('ming', { subject: 'group:owner', page: 'scurve_station', level: 'none' });
  assert.equal((await svc.siteAccess('chai')).pages.scurve_station, 'none');
  await svc.adminSetPage('brian', { subject: 'person:keng', page: 'timeline', level: 'edit' });
  assert.equal((await svc.siteAccess('keng')).pages.timeline, 'edit');
  assert.equal((await svc.siteAccess('noom')).pages.timeline, 'view');
  await svc.adminSetPage('brian', { subject: 'person:keng', page: 'timeline', level: null });
  assert.equal((await svc.siteAccess('keng')).pages.timeline, 'view');
  await svc.adminSetPage('brian', { subject: 'group:owner', page: 'scurve_station', level: 'view' });
  // Only the three meeting rows from schema 0007 remain (Tle, Jaran, Gift); the test's own changes are back to defaults.
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM page_access WHERE page != 'meetings'").first()).n, 0, 'back to defaults leaves no rows');
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM page_access_log WHERE page != 'meetings'").first()).n, 4);
  await assert.rejects(db.prepare('DELETE FROM page_access_log').run(), /APPEND_ONLY/);

  await assert.rejects(svc.adminSetPage('brian', { subject: 'person:ming', page: 'safety', level: 'none' }), /at least view/);
  await svc.adminSetPage('brian', { subject: 'person:ming', page: 'scurve_caltex', level: 'edit' });
  assert.equal((await svc.siteAccess('ming')).pages.scurve_caltex, 'edit', 'schedule edit only when granted');
  await assert.rejects(svc.adminSetPage('brian', { subject: 'person:boss', page: 'tasks', level: 'edit' }), /Observers/);
  await assert.rejects(svc.adminSetPage('brian', { subject: 'group:ks', page: 'safety', level: 'edit' }), /not available/);
  await assert.rejects(svc.adminSetPage('brian', { subject: 'group:subcontractors', page: 'safety', level: 'view' }), /Unknown group/);
  for (const id of ['keng', 'boss', 'tle', 'bas', 'tom']) await assert.rejects(svc.adminSetPage(id, { subject: 'group:ks', page: 'safety', level: 'view' }), /Only admins/);
  const ming = await svc.state('ming');
  assert.ok(ming.admin.pageAccess.groups.find((g) => g.id === 'ks'));
  assert.ok(!JSON.stringify(ming.admin.pageAccess).includes('ubcontract'));
  for (const id of ['boss', 'praew', 'keng', 'noom', 'bo']) assert.equal((await svc.state(id)).admin, undefined, `${id}: no people/access data (admins only)`);
  assert.equal((await svc.state('tom')).admin, undefined);
});

test('Tasks at "view" makes the task app read-only, on the server too', async () => {
  const { db } = await setup();
  const svc = taskService(db);
  const t = await svc.createTask('tom', { title: 'Inspect rebar' });
  await svc.adminSetPage('brian', { subject: 'group:ks', page: 'tasks', level: 'view' });
  const st = await svc.state('tom');
  assert.equal(st.me.readOnly, true);
  assert.equal(st.me.can.create, false);
  assert.ok(st.tasks.find((x) => x.id === t.id), 'still sees the task');
  assert.ok(Object.values(st.tasks[0].can).every((v) => !v));
  const origin = 'https://calnkt.test';
  const post = (path, body) => new Request(origin + path, { method: 'POST', headers: { origin, 'x-requested-with': 'tasks', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const env = { TASKS_DB: db, APP_ORIGIN: origin };
  assert.equal((await handleTasksApi(post(`/api/tasks/tasks/${t.id}`, { action: 'comment', body: 'ok' }), env, 'tom')).status, 403);
  assert.equal((await handleTasksApi(post('/api/tasks/tasks', { title: 'x' }), env, 'tom')).status, 403);
  assert.equal((await handleTasksApi(post('/api/tasks/notifications/read', {}), env, 'tom')).status, 200);
  assert.equal((await handleTasksApi(post(`/api/tasks/tasks/${t.id}`, { action: 'comment', body: 'ok' }), env, 'brian')).status, 200);
});

test('admins add people; site team are hidden from KS and the land owner by default', async () => {
  const { db } = await setup();
  const svc = taskService(db);
  const r = await svc.adminAddPerson('brian', { name: 'Jaray', company: 'spp', level: 'team', title: 'Site engineer', reportsTo: ['brian', 'tle'] });
  assert.equal(r.id, 'jaray');
  const tle = await svc.state('tle');
  assert.ok(tle.people.find((p) => p.id === 'jaray'), 'Tle sees the new site engineer');
  assert.ok((await svc.state('bas')).people.find((p) => p.id === 'jaray'), 'Caltex can see Jaray');
  for (const id of ['tom', 'chai']) assert.ok(!(await svc.state(id)).people.find((p) => p.id === 'jaray'), `${id} cannot see Jaray`);
  assert.equal((await svc.state('jaray')).people.find((p) => p.id === 'bas')?.canRequest ?? false, false, 'no requests to Caltex');
  await assert.rejects(svc.adminAddPerson('brian', { name: 'jaray', company: 'spp' }), /already on the project/);
  await assert.rejects(svc.adminAddPerson('keng', { name: 'Someone', company: 'spp' }), /Only admins/);
  await assert.rejects(svc.adminAddPerson('brian', { name: 'X', company: 'spp', reportsTo: ['bas'] }), /Leads must be SPP/);
  await assert.rejects(svc.adminAddPerson('brian', { name: 'Y', company: 'subcontractor' }), /Unknown company/);
  const ks = await svc.adminAddPerson('ming', { name: 'Nok', company: 'ks', level: 'admin' });
  assert.equal((await db.prepare('SELECT level FROM people WHERE id=?').bind(ks.id).first()).level, 'partner', 'partners are always partners');
  const log = await db.prepare("SELECT data_json FROM events WHERE kind='person_changed'").all();
  assert.equal(log.results.length, 2);
});

test('Check a person: admins see exactly what someone sees; nobody else can', async () => {
  const { db } = await setup();
  const svc = taskService(db);
  await svc.adminAddPerson('brian', { name: 'Jaray', company: 'spp', level: 'team', reportsTo: ['brian', 'tle'] });
  const internal = await svc.createTask('brian', { title: 'Internal budget', assignees: ['ming'] });
  const tom = await svc.adminPreview('ming', 'tom');
  assert.deepEqual(tom.pages, { drawings: 'none', safety: 'none', timeline: 'view', scurve_station: 'view', scurve_caltex: 'none', tasks: 'edit', files: 'none', meetings: 'none' });
  assert.equal(tom.adminPage, false);
  const seen = tom.people.map((p) => p.name);
  for (const n of ['Brian', 'Bo', 'Noom']) assert.ok(seen.includes(n), n);
  for (const n of ['Jaray', 'Keng', 'A', 'Tle', 'Gift', 'Praew', 'Boss', 'Bas']) assert.ok(!seen.includes(n), `Tom must not see ${n}`);
  assert.ok(tom.hidden.some((p) => p.name === 'Jaray'));
  assert.ok(!tom.tasks.some((t) => t.id === internal.id), 'Tom cannot see internal tasks');
  // Same result as Tom's own screen.
  const own = await svc.state('tom');
  assert.deepEqual(tom.tasks.map((t) => t.id).sort(), own.tasks.map((t) => t.id).sort());
  assert.deepEqual(tom.people.map((p) => p.name).sort(), own.people.map((p) => p.name).sort());
  for (const id of ['keng', 'boss', 'tle', 'bas', 'tom']) await assert.rejects(svc.adminPreview(id, 'gift'), /Only admins/);
  const res = await handleTasksApi(new Request('https://calnkt.test/api/tasks/admin/preview?person=tom'), { TASKS_DB: db }, 'keng');
  assert.equal(res.status, 403);
  const ok = await handleTasksApi(new Request('https://calnkt.test/api/tasks/admin/preview?person=tom'), { TASKS_DB: db }, 'brian');
  assert.equal(ok.status, 200);
});
