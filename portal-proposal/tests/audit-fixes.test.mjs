// Site audit, 10 Nov 2026: the small security fixes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.mjs';
import { routeMeetings, weeklyDayOpen, upcomingWeeklyDates } from '../src/meetings.mjs';
import { MeetingRoom } from '../src/meeting-room.mjs';
import { encoding, decoding } from '../src/vendor/yjs-server.mjs';
import { localD1 } from '../../tasks/tests/local-d1.mjs';
import { rosterStatements } from '../../tasks/src/seed.mjs';
import { world, origin } from './counting-world.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('a "sign out" from someone who is not signed in does not make live meeting pages reconnect', async () => {
  const w = await world();
  w.tasks.prepare("INSERT INTO meetings(id, title, date, created_by, created_at, updated_by, updated_at) VALUES('m-1','Site walk','2026-11-07','brian','x','brian','x')").run();
  let reconnects = 0;
  w.env.MEETING_ROOMS = { idFromName: (n) => n, get: () => ({ fetch: async () => { reconnects++; return new Response('0'); } }) };
  const signOut = async (cookie) => {
    const waits = [];
    const r = await w.handler(new Request(origin + '/api/local-auth/logout', { method: 'POST', headers: { origin, 'x-project-auth': '1', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: '{}' }), w.env, { waitUntil: (p) => waits.push(p) });
    await Promise.all(waits);
    return r;
  };
  let r = await signOut(null);
  assert.equal(r.status, 200); assert.equal(reconnects, 0, 'no sign-in ended: nothing happens');
  r = await signOut('__Host-project_session=' + 'A'.repeat(43));
  assert.equal(r.status, 200); assert.equal(reconnects, 0, 'a made-up sign-in cookie: nothing happens');
  r = await signOut(await w.signIn('gift'));
  assert.equal(r.status, 200); assert.equal(reconnects, 2, 'a real sign-out: the meeting\'s two pages reconnect, as before');
  assert.equal(r.headers.get('x-session-ended'), null, 'the internal marker is not sent to the browser');
  assert.equal(r.headers.get('clear-site-data'), '"cache"');
});

test('the sign-in and account forms never put what was typed into the address', async () => {
  for (const page of ['../public/sign-in.html', '../public/account.html']) {
    const forms = read(page).match(/<form[^>]*>/g);
    assert.ok(forms.length >= 2, page);
    for (const f of forms) assert.match(f, /method="post"/, `${page}: ${f}`);
  }
  const w = await world();
  for (const path of ['/sign-in.html', '/account.html']) {
    const r = await w.handler(new Request(origin + path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'username=gift&password=typed-before-the-page-was-ready' }), w.env);
    assert.equal(r.status, 303, path); assert.equal(r.headers.get('location'), path, 'the page is shown again; nothing typed is in the address');
  }
  assert.equal((await w.handler(new Request(origin + '/sign-in.html'), w.env)).status, 200);
});

test('a setup or reset code on the Admin page is never written to the browser\'s storage', () => {
  const app = read('../../tasks/public/app.js');
  assert.match(app, /const saveUI = \(\) => \{ try \{ const \{[^}]*\bcode\b[^}]*\.\.\.rest \} = UI;/, 'saveUI leaves `code` out');
  assert.match(app, /const loadUI = [^\n]*delete u\.code/, 'a code stored by the earlier version is dropped on load');
});

test('Thailand only: a link-preview robot\'s name is no way in from abroad', async () => {
  const env = { APP_ORIGIN: 'https://calnkt.sppwork.com', SITE_READY: 'true', ASSETS: { fetch: async () => new Response('asset') } };
  const from = (country, path, headers) => { const r = new Request(env.APP_ORIGIN + path, { headers }); Object.defineProperty(r, 'cf', { value: { country, asn: 1 } }); return r; };
  for (const ua of ['facebookexternalhit/1.1', 'Mozilla/5.0 (compatible; line-poker/1.0)', 'WhatsApp/2.23']) {
    for (const path of ['/', '/tasks.html', '/admin', '/files/', '/schedule/api/state', '/model/api/health']) {
      const r = await worker.fetch(from('SG', path, { 'user-agent': ua, accept: 'text/html' }), env, { waitUntil() {} });
      assert.equal(r.status, 403, `${ua} ${path}`);
      assert.match(await r.text(), /only available in Thailand/);
    }
  }
  const home = await worker.fetch(from('TH', '/', { 'user-agent': 'facebookexternalhit/1.1', accept: 'text/html' }), env, { waitUntil() {} });
  assert.notEqual(home.status, 403, 'inside Thailand nothing changes');
});

test('a weekly meeting page can be started only near its date', async () => {
  assert.equal(weeklyDayOpen('2026-11-11', '2026-11-10'), true);
  assert.equal(weeklyDayOpen('2026-10-28', '2026-11-10'), true, 'two weeks back: minutes written up late');
  assert.equal(weeklyDayOpen('2026-10-21', '2026-11-10'), false);
  assert.equal(weeklyDayOpen('2026-12-09', '2026-11-10'), true);
  assert.equal(weeklyDayOpen('2026-12-23', '2026-11-10'), false);
  for (const d of upcomingWeeklyDates()) assert.equal(weeklyDayOpen(d), true, 'the four pages the Meetings list offers can always be started');

  const db = localD1(); await db.batch(rosterStatements(db));
  const env = { TASKS_DB: db, APP_ORIGIN: origin, MEETING_ROOMS: { idFromName: (n) => n, get: () => ({ fetch: async () => new Response(null, { status: 200 }) }) } };
  const access = { pages: { meetings: 'edit' }, person: 'bas', viewAs: null };
  const post = (id) => routeMeetings(new Request(`${origin}/api/meetings/${id}/items`, { method: 'POST', headers: { origin, 'x-requested-with': 'meetings', 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'agenda', text: 'x' }) }), env, {}, access).then((r) => r.status, (e) => e.status);
  const live = (id) => routeMeetings(new Request(`${origin}/api/meetings/${id}/live`, { headers: { upgrade: 'websocket', origin } }), env, {}, access).then((r) => r.status, (e) => e.status);
  const count = async () => (await db.prepare('SELECT COUNT(*) AS n FROM meetings').first()).n;
  for (const far of ['weekly-1990-01-03', 'weekly-2031-01-01']) {
    assert.equal(await post(far), 404, far);
    assert.equal(await live(far), 409, far);
  }
  assert.equal(await count(), 0, 'nothing was stored for far-away Wednesdays');
  assert.equal(await post(`weekly-${upcomingWeeklyDates()[1]}`), 201, 'next week\'s page starts as before');
  assert.equal(await count(), 1);
});

test('live meeting cursors: only a name and a plain colour are passed on to other people', async () => {
  const sockets = [];
  const ctx = { storage: { sql: { exec: () => [] }, transactionSync: (f) => f(), getAlarm: async () => null, setAlarm: async () => {} }, blockConcurrencyWhile: (f) => f(), getWebSockets: () => sockets };
  const socket = (att) => { const ws = { sent: [], att, send(b) { this.sent.push(b); }, close() {}, serializeAttachment(a) { this.att = a; }, deserializeAttachment() { return this.att; } }; sockets.push(ws); return ws; };
  const r = new MeetingRoom(ctx, {});
  const viewer = socket({ id: 'gift', name: 'Gift', edit: false, at: Date.now(), clients: [] }), other = socket({ id: 'bas', name: 'Bas', edit: true, at: Date.now(), clients: [] });
  const frame = (user) => {
    const inner = encoding.createEncoder(); encoding.writeVarUint(inner, 1); encoding.writeVarUint(inner, 7); encoding.writeVarUint(inner, 1); encoding.writeVarString(inner, JSON.stringify({ user, cursor: null }));
    const e = encoding.createEncoder(); encoding.writeVarUint(e, 1); encoding.writeVarUint8Array(e, encoding.toUint8Array(inner)); return encoding.toUint8Array(e);
  };
  const received = () => { const d = decoding.createDecoder(new Uint8Array(other.sent.at(-1))); decoding.readVarUint(d); const i = decoding.createDecoder(decoding.readVarUint8Array(d)); decoding.readVarUint(i); decoding.readVarUint(i); decoding.readVarUint(i); return JSON.parse(decoding.readVarString(i)); };
  await r.webSocketMessage(viewer, frame({ name: 'Brian', color: 'red;position:fixed;inset:0;background:#fff;z-index:99999', extra: '<b>x</b>' }).buffer);
  assert.deepEqual(received().user, { name: 'Gift', color: '#5B6676' }, 'a colour that is not a plain colour is replaced; the name is the server\'s; nothing else passes');
  await r.webSocketMessage(viewer, frame({ name: 'x', color: '#1F77B4' }).buffer);
  assert.deepEqual(received().user, { name: 'Gift', color: '#1F77B4' });
});
