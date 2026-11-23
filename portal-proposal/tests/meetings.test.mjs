// Meetings (src/meetings.mjs): weekly Wednesday pages, who sees and writes, SPP-only notes stay inside SPP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeMeetings, upcomingWeeklyDates } from '../src/meetings.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';

const ORIGIN = 'https://calnkt.test';
async function world() { const db = localD1(); await db.batch(rosterStatements(db)); return { db, env: { TASKS_DB: db, APP_ORIGIN: ORIGIN } }; }
function call(w, person, level, method, path, body, { viewAs = false, headers = {} } = {}) {
  const req = new Request(ORIGIN + path, { method, body: body ? JSON.stringify(body) : undefined, headers: method === 'GET' ? {} : { origin: ORIGIN, 'x-requested-with': 'meetings', 'content-type': 'application/json', ...headers } });
  return routeMeetings(req, w.env, {}, { pages: { meetings: level }, person, viewAs: viewAs ? { id: 'x' } : null })
    .then(async (r) => ({ status: r.status, body: await r.json() }), (e) => ({ status: e.status, body: { error: e.message } }));
}

test('weekly meetings: this week\'s Wednesday and the next three', () => {
  assert.deepEqual(upcomingWeeklyDates('2026-11-02'), ['2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18']);
  assert.deepEqual(upcomingWeeklyDates('2026-11-04'), ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
});

test('SPP and Caltex write; SPP-only notes are never sent to Caltex; KS gets nothing', async () => {
  const w = await world();
  const list = await call(w, 'brian', 'edit', 'GET', '/api/meetings');
  assert.equal(list.status, 200); assert.equal(list.body.meetings.filter((m) => m.series).length, 4);
  const id = list.body.meetings.find((m) => m.series).id;
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'agenda', text: 'Tank delivery date' })).status, 201);
  assert.equal((await call(w, 'bas', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'agenda', text: 'Canopy colour sample' })).status, 201);
  const note = await call(w, 'ming', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'spp_note', text: 'Ask about the variation before they do' });
  assert.equal(note.status, 201);
  assert.equal((await call(w, 'bas', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'spp_note', text: 'x' })).status, 404, 'Caltex cannot write SPP notes');
  const act = await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'action', text: 'Send pile records', ownerId: 'tle', due: '2026-11-06' });
  assert.equal(act.status, 201);

  const spp = await call(w, 'keng', 'edit', 'GET', `/api/meetings/${id}`);
  assert.deepEqual(spp.body.items.map((i) => i.kind).sort(), ['action', 'agenda', 'agenda', 'spp_note']);
  const cx = await call(w, 'bas', 'edit', 'GET', `/api/meetings/${id}`);
  assert.deepEqual(cx.body.items.map((i) => i.kind).sort(), ['action', 'agenda', 'agenda']);
  assert.ok(!cx.body.history.some((h) => h.action.startsWith('spp_note')), 'Caltex history has no SPP-note entries');
  assert.equal((await call(w, 'bas', 'edit', 'POST', `/api/meetings/${id}/items/${note.body.id}`, { text: 'peek' })).status, 404);

  // Notes under an agenda item; action done; link a task id that does not exist is refused.
  const ag = spp.body.items.find((i) => i.kind === 'agenda');
  assert.equal((await call(w, 'bas', 'edit', 'POST', `/api/meetings/${id}/items/${ag.id}`, { notes: 'Caltex will confirm by Friday' })).status, 200);
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items/${act.body.id}`, { taskId: 'CP-999' })).status, 400);
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items/${act.body.id}`, { done: true })).status, 200);

  assert.equal((await call(w, 'tom', 'none', 'GET', '/api/meetings')).status, 404, 'KS: no meetings');
  assert.equal((await call(w, 'gift', 'view', 'POST', `/api/meetings/${id}/items`, { kind: 'agenda', text: 'x' })).status, 403, 'view only');
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'agenda', text: 'x' }, { viewAs: true })).status, 403);
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'agenda', text: 'x' }, { headers: { 'x-requested-with': 'tasks' } })).status, 403);
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}`, { date: '2026-11-05' })).status, 400, 'weekly keeps its Wednesday');
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${id}/delete`, {})).status, 400, 'weekly cannot be deleted');

  const one = await call(w, 'bas', 'edit', 'POST', '/api/meetings', { title: 'Site walk with Caltex', date: '2026-11-07', time: '10:00' });
  assert.equal(one.status, 201);
  assert.equal((await call(w, 'brian', 'edit', 'POST', `/api/meetings/${one.body.id}/delete`, {})).status, 200);
  assert.throws(() => w.db.sql.exec('DELETE FROM meeting_log'), /APPEND_ONLY/);
});

test('live page connections: who reaches which room, who may type (Loop-style pages)', async () => {
  const w = await world(), seen = [];
  w.env.MEETING_ROOMS = { idFromName: (n) => n, get: (id) => ({ fetch: async (req) => { seen.push({ id, user: JSON.parse(req.headers.get('x-calnkt-user')), room: req.headers.get('x-calnkt-room') }); return new Response('room'); } }) };
  const id = `weekly-${upcomingWeeklyDates()[1]}`; // next week's (a weekly page can only be started near its date)
  const live = (person, level, { part = 'shared', viewAs = false, headers } = {}) => routeMeetings(
    new Request(`${ORIGIN}/api/meetings/${id}/live?part=${part}`, { headers: headers || { upgrade: 'websocket', origin: ORIGIN } }), w.env, {},
    { pages: { meetings: level }, person, viewAs: viewAs ? { id: 'x' } : null }).then((r) => r.status, (e) => e.status);
  assert.equal(await live('brian', 'edit'), 200);
  { const x = seen.pop(); assert.equal(x.room, `${id}:shared`); assert.equal(x.user.id, 'brian'); assert.equal(x.user.edit, true); assert.equal(x.user.name, 'Brian'); assert.deepEqual(x.user.hide, {}); }
  assert.ok(await w.db.prepare('SELECT 1 FROM meetings WHERE id=?').bind(id).first(), 'an editor opening a weekly page stores the meeting');
  assert.equal(await live('ming', 'edit', { part: 'spp' }), 200); assert.equal(seen.pop().room, `${id}:spp`);
  assert.equal(await live('bas', 'edit', { part: 'spp' }), 404, 'Caltex never reaches the SPP-only room');
  assert.equal(await live('bas', 'edit'), 200); assert.equal(seen.pop().user.edit, true);
  assert.equal(await live('tle', 'edit'), 200);
  { const h = seen.pop().user.hide; assert.ok(Object.values(h).flat().includes('boss'), 'observers hidden from the site team'); assert.ok(JSON.stringify(h).length < 1200, 'small enough to keep with the connection'); }
  assert.equal(await live('gift', 'view'), 200); assert.equal(seen.pop().user.edit, false, 'view level: look only');
  assert.equal(await live('brian', 'edit', { viewAs: true }), 200); assert.equal(seen.pop().user.edit, false, 'view-as: look only');
  assert.equal(await live('tom', 'none'), 404, 'KS: nothing');
  assert.equal(await live('brian', 'edit', { headers: { upgrade: 'websocket', origin: 'https://evil.example' } }), 403, 'another site cannot connect');
  assert.equal(await live('brian', 'edit', { headers: { origin: ORIGIN } }), 426, 'not a WebSocket');
  assert.equal(seen.length, 0);
});

test('night audit: names hidden from Caltex stay masked in meetings (owners, authors); Caltex cannot pick hidden people', async () => {
  const w = await world();
  const id = `weekly-${upcomingWeeklyDates()[1]}`; // next week's (a weekly page can only be started near its date)
  assert.equal((await call(w, 'ming', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'action', text: 'Site walk', ownerId: 'a' })).status, 201);
  const cx = await call(w, 'bas', 'edit', 'GET', `/api/meetings/${id}`);
  const item = cx.body.items.find((i) => i.text === 'Site walk');
  assert.equal(item.ownerId, null); assert.notEqual(item.owner, 'A');
  assert.equal((await call(w, 'bas', 'edit', 'POST', `/api/meetings/${id}/items`, { kind: 'action', text: 'x', ownerId: 'a' })).status, 400, 'hidden person cannot be chosen');
  const spp = await call(w, 'keng', 'edit', 'GET', `/api/meetings/${id}`);
  assert.equal(spp.body.items.find((i) => i.text === 'Site walk').owner, 'A', 'SPP still sees the name');
});
