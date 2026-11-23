// Live meeting rooms (src/meeting-room.mjs) driven with a stand-in Durable Object context.
// Audit 2 Nov 2026 (night review): look-only people can never change a page, listen-only connections are renewed,
// and page / message sizes are limited.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { MeetingRoom } from '../src/meeting-room.mjs';
import { Y, encoding, syncProtocol } from '../src/vendor/yjs-server.mjs';

function fakeCtx() {
  const db = new DatabaseSync(':memory:'), sockets = []; let alarm = null;
  return { sockets, storage: { sql: { exec: (q, ...b) => { const s = db.prepare(q); return /^\s*SELECT/i.test(q) ? s.all(...b) : (s.run(...b), []); } },
    transactionSync: (f) => f(), getAlarm: async () => alarm, setAlarm: async (t) => { alarm = t; } },
  blockConcurrencyWhile: (f) => f(), getWebSockets: () => sockets };
}
function socket(ctx, att) { const ws = { sent: [], att, send(b) { this.sent.push(b); }, close(c) { this.closed = c; }, serializeAttachment(a) { this.att = a; }, deserializeAttachment() { return this.att; } }; ctx.sockets.push(ws); return ws; }
function updateMsg(text, padded = false) {
  const d = new Y.Doc(); d.getXmlFragment('default').insert(0, [new Y.XmlText(text)]);
  const e = encoding.createEncoder();
  if (padded) { encoding.writeUint8(e, 0x80); encoding.writeUint8(e, 0x00); } else encoding.writeVarUint(e, 0); // 0x80 0x00 also means 0
  syncProtocol.writeUpdate(e, Y.encodeStateAsUpdate(d)); return encoding.toUint8Array(e);
}
const pageText = (r) => r.loadDoc().getXmlFragment('default').toString();
const room = (name = 'weekly-2026-11-04:shared') => { const ctx = fakeCtx(), r = new MeetingRoom(ctx, {}); r.meta('room', name); return { ctx, r }; };

test('look-only people (view level, view-as) can never change the page, however the message is written', async () => {
  const { ctx, r } = room();
  const other = socket(ctx, { id: 'bas', edit: true, at: Date.now(), clients: [] });
  const viewer = socket(ctx, { id: 'gift', edit: false, at: Date.now(), clients: [] });
  await r.webSocketMessage(viewer, updateMsg('plain change').buffer);
  await r.webSocketMessage(viewer, updateMsg('padded change', true).buffer);
  assert.equal(pageText(r), ''); assert.equal(other.sent.length, 0); assert.equal(r.meta('editors'), null);
  // An editor's change does go through, and the look-only person receives it.
  const editor = socket(ctx, { id: 'ming', edit: true, at: Date.now(), clients: [] });
  await r.webSocketMessage(editor, updateMsg('agreed', true).buffer);
  assert.match(pageText(r), /agreed/); assert.ok(viewer.sent.length >= 1);
});

test('a connection that only listens is closed for renewal after an hour (access is checked again)', async () => {
  const { ctx, r } = room('m-x:spp');
  const stale = socket(ctx, { id: 'leaver', edit: true, at: Date.now() - 2 * 3600e3, clients: [] });
  const editor = socket(ctx, { id: 'ming', edit: true, at: Date.now(), clients: [] });
  await r.webSocketMessage(editor, updateMsg('internal note').buffer);
  assert.equal(stale.sent.length, 0); assert.equal(stale.closed, 4000);
});

test('size limits: a change over 2 MB is refused out loud; the whole page stops at 8 MB', async () => {
  const { ctx, r } = room();
  const ws = socket(ctx, { id: 'bas', edit: true, at: Date.now(), clients: [] });
  await r.webSocketMessage(ws, updateMsg('x'.repeat(2.5 * 1024 * 1024)).buffer);
  assert.equal(pageText(r), '', 'too-large change not taken'); assert.equal(ws.closed, 4414, 'the writer is told');
  const ws2 = socket(ctx, { id: 'bas', edit: true, at: Date.now(), clients: [] });
  for (let i = 0; i < 8; i++) await r.webSocketMessage(ws2, updateMsg('y'.repeat(1.5 * 1024 * 1024) + i).buffer);
  assert.ok(r.storedBytes() <= 8 * 1024 * 1024 + 2 * 1024 * 1024, `stored ${r.storedBytes()}`);
  assert.equal(ws2.closed, 4413, 'the writer is told the page is full');
});

test('names on cursors come from the server and follow each receiver\'s own rules (round 3: per person)', async () => {
  const { ctx, r } = room();
  const sender = socket(ctx, { id: 'boss', edit: true, at: Date.now(), clients: [], name: 'Boss', hide: {} });
  const ming = socket(ctx, { id: 'ming', edit: true, at: Date.now(), clients: [], name: 'Ming', hide: {} });
  const tle = socket(ctx, { id: 'tle', edit: true, at: Date.now(), clients: [], name: 'Tle', hide: { 'SPP project staff': ['boss', 'praew'], 'Caltex contact': ['bas'] } });
  const inner = encoding.createEncoder(); encoding.writeVarUint(inner, 1); encoding.writeVarUint(inner, 42); encoding.writeVarUint(inner, 1);
  encoding.writeVarString(inner, JSON.stringify({ user: { name: 'Pretend Brian', color: '#123456' } }));
  const msg = encoding.createEncoder(); encoding.writeVarUint(msg, 1); encoding.writeVarUint8Array(msg, encoding.toUint8Array(inner));
  await r.webSocketMessage(sender, encoding.toUint8Array(msg).buffer);
  const text = (ws) => new TextDecoder().decode(ws.sent.at(-1));
  assert.match(text(ming), /"name":"Boss"/); assert.doesNotMatch(text(ming), /Pretend/);
  assert.match(text(tle), /"name":"SPP project staff"/); assert.doesNotMatch(text(tle), /Boss/);
});

test('held-back changes (round 3): the server drops them and the sender reconnects to resend in order', async () => {
  const { ctx, r } = room();
  const ws = socket(ctx, { id: 'bas', edit: true, at: Date.now(), clients: [] });
  // A delete-only update about a client the room has never seen is held back by Yjs.
  const d = new Y.Doc(); const t = d.getText('x'); t.insert(0, 'abc'); const before = Y.encodeStateVector(d); t.delete(0, 3);
  const onlyDelete = Y.encodeStateAsUpdate(d, before);
  const e = encoding.createEncoder(); encoding.writeVarUint(e, 0); syncProtocol.writeUpdate(e, onlyDelete);
  await r.webSocketMessage(ws, encoding.toUint8Array(e).buffer);
  assert.equal(r.loadDoc().store.pendingDs, null); assert.equal(r.loadDoc().store.pendingStructs, null);
  assert.equal(ws.closed, 4000);
});

test('access changed (3 Nov 2026): every connection reconnects at once, so access is checked again', async () => {
  const { ctx, r } = room();
  const a = socket(ctx, { id: 'bas', edit: true, at: Date.now(), clients: [] });
  const b = socket(ctx, { id: 'gift', edit: false, at: Date.now(), clients: [] });
  const res = await r.fetch(new Request('https://meeting-room/reconnect', { headers: { 'x-calnkt-reconnect': '1' } }));
  assert.equal(await res.text(), '2');
  assert.equal(a.closed, 4000); assert.equal(b.closed, 4000);
});

test('the Worker reconnects rooms after access-changing requests only', async () => {
  const { reconnectMeetingRooms } = await import('../src/meetings.mjs');
  const asked = [];
  const env = { TASKS_DB: { prepare: () => ({ all: async () => ({ results: [{ id: 'weekly-2026-11-04' }, { id: 'm-7' }] }) }) },
    MEETING_ROOMS: { idFromName: (n) => n, get: (n) => ({ fetch: async (req) => { asked.push([n, req.headers.get('x-calnkt-reconnect')]); return new Response('1'); } }) } };
  assert.equal(await reconnectMeetingRooms(env), 4);
  assert.deepEqual(asked.map((x) => x[0]).sort(), ['m-7:shared', 'm-7:spp', 'weekly-2026-11-04:shared', 'weekly-2026-11-04:spp']);
  assert.ok(asked.every((x) => x[1] === '1'));
  assert.equal(await reconnectMeetingRooms({}), 0, 'no meeting rooms on this site: nothing to do');
});

test('weekly pages start with last week\'s open actions (ticked lines stay behind; tags and nesting kept)', async () => {
  const { carryForward } = await import('../src/meeting-room.mjs');
  const { pageText } = await import('../src/vendor/yjs-server.mjs');
  const prev = new Y.Doc(), f = prev.getXmlFragment('default');
  const item = (text, checked, taskId, children = []) => {
    const li = new Y.XmlElement('taskItem'); li.setAttribute('checked', checked); if (taskId) li.setAttribute('taskId', taskId);
    const p = new Y.XmlElement('paragraph'); p.insert(0, [new Y.XmlText(text)]); li.insert(0, [p, ...children]); return li;
  };
  const sub = new Y.XmlElement('taskList'); sub.insert(0, [item('Sub still open', false)]);
  const list = new Y.XmlElement('taskList');
  list.insert(0, [item('Confirm tank vent height @Bas', false, 'RQ-004'), item('Done already', true, 'CP-001', [sub]), item('   ', false)]);
  const para = new Y.XmlElement('paragraph'); para.insert(0, [new Y.XmlText('Discussion notes')]);
  f.insert(0, [para, list]);
  const b64 = Buffer.from(Y.encodeStateAsUpdate(prev)).toString('base64');
  const next = new Y.Doc(); Y.applyUpdate(next, carryForward(b64, '2026-10-28'));
  const text = pageText(next);
  assert.match(text, /28 ต\.ค\. 2569 · Open actions carried from the meeting on 28 Oct 2026/);
  assert.match(text, /☐\s+Confirm tank vent height @Bas/); assert.match(text, /☐\s+Sub still open/);
  assert.doesNotMatch(text, /Done already|Discussion notes/);
  const tags = []; const walk = (n) => { for (const c of n.toArray()) if (c instanceof Y.XmlElement) { if (c.getAttribute('taskId')) tags.push(c.getAttribute('taskId')); walk(c); } };
  walk(next.getXmlFragment('default')); assert.deepEqual(tags, ['RQ-004']);
  const empty = new Y.Doc(); empty.getXmlFragment('default').insert(0, [item('Ticked', true)]);
  assert.equal(carryForward(Buffer.from(Y.encodeStateAsUpdate(empty)).toString('base64'), '2026-10-28'), null, 'nothing open: nothing carried');
  assert.equal(carryForward('not base64!', '2026-10-28'), null);
});

test('a new weekly room is seeded once, only while empty, from the latest earlier weekly page of the same part', async () => {
  const prev = new Y.Doc(), li = new Y.XmlElement('taskItem'); li.setAttribute('checked', false);
  const p = new Y.XmlElement('paragraph'); p.insert(0, [new Y.XmlText('Open item')]); li.insert(0, [p]);
  const tl = new Y.XmlElement('taskList'); tl.insert(0, [li]); prev.getXmlFragment('default').insert(0, [tl]);
  const asked = [];
  const env = { TASKS_DB: { prepare: (q) => ({ bind: (...b) => ({ first: async () => { asked.push(b); return { date: '2026-10-28', state: Buffer.from(Y.encodeStateAsUpdate(prev)).toString('base64') }; } }) }) } };
  const ctx = fakeCtx(), r = new MeetingRoom(ctx, env);
  await r.seedWeekly('weekly-2026-11-04:shared');
  assert.deepEqual(asked, [['2026-11-04', 'shared']]);
  assert.match(pageText(r), /Open item/);
  await r.seedWeekly('weekly-2026-11-04:shared'); assert.equal(asked.length, 1, 'only once');
  const other = new MeetingRoom(fakeCtx(), env); await other.seedWeekly('m-7:shared'); assert.equal(asked.length, 1, 'one-off meetings are not seeded');
});

test('Chief adds lines at the end of a page (headings, paragraphs, bullets, ☐ lines); people connected see them', async () => {
  const { ctx, r } = room('m-7:shared');
  const listener = socket(ctx, { id: 'gift', edit: false, at: Date.now(), clients: [] });
  r.loadDoc().getXmlFragment('default').insert(0, [new Y.XmlElement('paragraph')]);
  r.loadDoc().getXmlFragment('default').get(0).insert(0, [new Y.XmlText('Existing notes')]);
  const res = await r.fetch(new Request('https://meeting-room/m-7/shared', { method: 'POST', headers: { 'x-calnkt-append': '1', 'x-calnkt-room': 'm-7:shared', 'content-type': 'application/json' },
    body: JSON.stringify({ by: 'brian', blocks: [{ type: 'heading', text: 'Notes' }, { type: 'bullet', text: 'One' }, { type: 'bullet', text: 'Two' }, { type: 'todo', text: 'Call Oat' }, { type: 'paragraph', text: 'End' }] }) }));
  assert.equal(res.status, 200);
  const text = pageText(r);
  assert.match(text, /Existing notes.*<heading level="3">Notes<\/heading>.*<bulletList><listItem><paragraph>One<\/paragraph><\/listItem><listItem><paragraph>Two<\/paragraph><\/listItem><\/bulletList><taskList><taskItem checked="false"><paragraph>Call Oat<\/paragraph><\/taskItem><\/taskList><paragraph>End<\/paragraph>/is);
  assert.ok(listener.sent.length > 0, 'people on the page receive it live');
  assert.equal(r.meta('dirty'), '1', 'copied to the database a few seconds later');
});
