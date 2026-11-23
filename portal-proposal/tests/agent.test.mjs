// Chief, Brian's AI assistant (src/agent.mjs, 5 Nov 2026): a key, acts as Brian, short list of task actions, invisible.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAgent, routeAgentAdmin } from '../src/agent.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { seedRoster } from '../../tasks/src/seed.mjs';
import { taskService } from '../../tasks/src/service.mjs';
import { upcomingWeeklyDates } from '../src/meetings.mjs';
const WEEKLY_ID = `weekly-${upcomingWeeklyDates()[1]}`; // next week's (a weekly page can only be started near its date)

const ORIGIN = 'https://calnkt.test';
const twoStepActor = { sessionTwoStep: true, sessionCreatedAt: Math.floor(Date.now() / 1000) };
async function world() {
  const db = localD1(); await seedRoster(db);
  return { db, env: { TASKS_DB: db, APP_ORIGIN: ORIGIN, TWO_STEP_FOR_ADMINS: 'true', CHIEF_OWNER: 'brian' } };
}
const owner = { person: 'brian', admin: true };
const admin = (w, path, method = 'GET', access = owner, actor = twoStepActor) => routeAgentAdmin(new Request(ORIGIN + path, { method, headers: method === 'GET' ? {} : { origin: ORIGIN, 'x-requested-with': 'tasks' }, body: method === 'GET' ? undefined : '{}' }), w.env, actor, access)
  .then(async (r) => ({ status: r.status, body: await r.json() }), (e) => ({ status: e.status, body: { error: e.message } }));
const agent = (w, key, path, method = 'GET', body) => routeAgent(new Request(ORIGIN + path, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), w.env)
  .then(async (r) => ({ status: r.status, body: await r.json() }), (e) => ({ status: e.status, body: { error: e.message } }));

test('only the owner makes and revokes keys, with 2-step and a recent password check; the key is shown once', async () => {
  const w = await world();
  assert.equal((await admin(w, '/api/agent-keys', 'GET', { admin: true, person: 'ming' })).status, 404, 'another admin');
  assert.equal((await admin(w, '/api/agent-keys', 'GET', { admin: false, person: 'brian' })).status, 404, 'Brian, if no longer an admin');
  assert.equal((await admin(w, '/api/agent-keys', 'GET', { ...owner, viewAs: { id: 'gift' } })).status, 404, 'viewing as someone');
  assert.equal((await admin(w, '/api/agent-keys', 'POST', owner, {})).status, 403, 'no 2-step');
  const made = await admin(w, '/api/agent-keys', 'POST');
  assert.equal(made.status, 201); assert.match(made.body.key, /^calnkt_agent_[A-Za-z0-9_-]{43}$/);
  const stored = await w.db.prepare('SELECT key_hash FROM agent_keys').first();
  assert.ok(!JSON.stringify(stored).includes(made.body.key.slice(13)), 'only a fingerprint is stored');
  const list = (await admin(w, '/api/agent-keys')).body.keys;
  assert.equal(list.length, 1); assert.ok(!('key' in list[0]) && !('key_hash' in list[0]));
  assert.equal((await agent(w, made.body.key, '/api/agent/state')).status, 200);
  assert.equal((await admin(w, `/api/agent-keys/${made.body.id}/revoke`, 'POST')).status, 200);
  assert.equal((await agent(w, made.body.key, '/api/agent/state')).status, 401, 'revoked');
  assert.equal((await agent(w, 'calnkt_agent_wrong', '/api/agent/state')).status, 401);
  assert.equal((await agent(w, null, '/api/agent/state')).status, 401);
});

test('Chief acts as Brian for the allowed task actions; everyone else sees Brian; Brian sees "via Chief"', async () => {
  const w = await world();
  const key = (await admin(w, '/api/agent-keys', 'POST')).body.key;
  const state = (await agent(w, key, '/api/agent/state')).body;
  assert.equal(state.me.id, 'brian'); assert.ok(state.people.some((p) => p.id === 'ming'));
  assert.ok(!state.people.some((p) => /chief/i.test(p.name)), 'Chief is not a person');
  const made = await agent(w, key, '/api/agent/tasks', 'POST', { title: 'Send Caltex the canopy RFI (Brian to send)', assignees: ['brian'], due: '2026-11-09', checklist: ['Draft'] });
  assert.equal(made.status, 201);
  const forMing = await agent(w, key, '/api/agent/tasks', 'POST', { title: 'Check rebar photos', assignees: ['ming'] });
  assert.equal(forMing.status, 201);
  assert.equal((await agent(w, key, `/api/agent/tasks/${forMing.body.id}`, 'POST', { action: 'comment', body: 'Please add photos by Friday' })).status, 200);
  assert.equal((await agent(w, key, `/api/agent/tasks/${forMing.body.id}`, 'POST', { action: 'progress', progress: 40 })).status, 200);
  // Ming sees Brian, with no trace of Chief
  const svc = taskService(w.db);
  const mt = (await svc.state('ming')).tasks.find((t) => t.id === forMing.body.id);
  assert.equal(mt.creator.name, 'Brian');
  assert.ok(!JSON.stringify(mt).toLowerCase().includes('chief'));
  // Brian sees "via Chief"
  const bt = (await svc.state('brian')).tasks.find((t) => t.id === forMing.body.id);
  assert.ok(bt.history.some((h) => h.via === 'chief' && h.kind === 'commented'));
  const activity = (await admin(w, '/api/agent-activity')).body.activity;
  assert.ok(activity.some((a) => a.taskId === forMing.body.id && a.kind === 'commented'));
});

test('Chief cannot close, approve, delete, hand off, share, unassign, send requests, read the bell as read, or reach other pages', async () => {
  const w = await world();
  const key = (await admin(w, '/api/agent-keys', 'POST')).body.key;
  const t = (await agent(w, key, '/api/agent/tasks', 'POST', { title: 'x', assignees: ['ming'] })).body.id;
  for (const action of ['complete', 'submit', 'approve', 'return', 'reopen', 'delete', 'handoff', 'share', 'unshare', 'unassign', 'lead', 'checklist_delete', 'reply', 'answer', 'close']) {
    assert.equal((await agent(w, key, `/api/agent/tasks/${t}`, 'POST', { action, version: 1 })).status, 403, action);
  }
  assert.equal((await agent(w, key, `/api/agent/tasks/${t}`, 'POST', { action: 'update', version: 1, fields: { status: 'done' } })).status, 403, 'closing through update');
  assert.equal((await agent(w, key, '/api/agent/requests', 'POST', { recipient: 'bas', title: 'x' })).status, 403);
  assert.equal((await agent(w, key, '/api/agent/notifications/read', 'POST', {})).status, 403);
  assert.equal(await routeAgent(new Request(ORIGIN + '/api/tasks/state', { headers: { authorization: `Bearer ${key}` } }), w.env), null, 'the key is not a session anywhere else');
  assert.equal((await agent(w, key, '/api/agent/tasks', 'POST', { title: 'For Bas', assignees: ['bas'] })).status, 409, 'Caltex gets requests, not tasks');
});

test('Chief adds meeting notes as Brian (Meetings at edit), into the shared or SPP-only page; recorded for Brian only', async () => {
  const w = await world();
  const asked = [];
  w.env.MEETING_ROOMS = { idFromName: (n) => n, get: (n) => ({ fetch: async (req) => { asked.push([n, JSON.parse(await req.text())]); return new Response('{"ok":true}'); } }) };
  const key = (await admin(w, '/api/agent-keys', 'POST')).body.key;
  const lines = [{ type: 'heading', text: 'Notes' }, { type: 'todo', text: 'Confirm vent height @Ming' }];
  const r = await agent(w, key, `/api/agent/meetings/${WEEKLY_ID}/notes`, 'POST', { part: 'spp', lines });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(asked[0], [`${WEEKLY_ID}:spp`, { blocks: lines, by: 'brian' }]);
  assert.ok(await w.db.prepare(`SELECT 1 FROM meetings WHERE id='${WEEKLY_ID}'`).first(), 'a weekly meeting is stored on its first change');
  assert.equal((await agent(w, key, `/api/agent/meetings/${WEEKLY_ID}/notes`, 'POST', { lines: [{ type: 'script', text: 'x' }] })).status, 400);
  assert.equal((await agent(w, key, `/api/agent/meetings/${WEEKLY_ID}/notes`, 'POST', { lines: [] })).status, 400);
  assert.equal((await agent(w, key, '/api/agent/meetings/nope/notes', 'POST', { lines })).status, 404);
  const activity = (await admin(w, '/api/agent-activity')).body.activity;
  assert.ok(activity.some((a) => a.kind === 'meeting_notes' && a.data.meeting === WEEKLY_ID && a.data.part === 'spp'));
});
