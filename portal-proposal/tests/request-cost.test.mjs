// Site audit (10 Nov 2026): what one request costs in database calls. Every file a page needs passes the sign-in and
// page checks, so each extra call here is paid dozens of times per page. These tests keep the count from creeping back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world } from './counting-world.mjs';
import ui from '../../tasks/dist/ui-assets.mjs';
import { buildUiModule } from '../../tasks/scripts/build-ui-module.mjs';

const writes = (calls) => calls.filter((c) => c.includes(' WRITE '));

test('a file request costs a project login 8 database reads and no write; the owner 3', async () => {
  const w = await world();
  const gift = await w.signIn('gift'), brian = await w.signIn('brian');
  for (const path of ['/__nav/bar.mjs', '/files/view.mjs', '/safety/index.html', '/api/me']) {
    const a = await w.get(path, gift);
    assert.equal(a.r.status, 200, path);
    assert.ok(a.calls.length <= 8, `${path} for a project login: ${a.calls.length} database calls\n${a.calls.join('\n')}`);
    assert.deepEqual(writes(a.calls), [], `${path}: no write`);
    const b = await w.get(path, brian);
    assert.ok(b.calls.length <= 3, `${path} for the owner: ${b.calls.length} database calls\n${b.calls.join('\n')}`);
    assert.deepEqual(writes(b.calls), []);
  }
});

test('the task data costs a project login at most 13 database reads (the people are read once, not twice)', async () => {
  const w = await world();
  const gift = await w.signIn('gift');
  const a = await w.get('/api/tasks/state', gift);
  assert.equal(a.r.status, 200);
  assert.equal((await a.r.json()).me.id, 'gift');
  assert.ok(a.calls.length <= 13, `${a.calls.length} database calls\n${a.calls.join('\n')}`);
  assert.equal(a.calls.filter((c) => c.includes('SELECT * FROM people')).length, 1);
  assert.deepEqual(writes(a.calls), []);
});

test('the "last used" time of a sign-in still moves forward, at most every 5 minutes', async () => {
  const w = await world();
  const gift = await w.signIn('gift');
  const idle = () => w.auth.prepare("SELECT idle_expires_at AS t FROM auth_sessions WHERE account_id='acct-gift'").get().t;
  const first = idle();
  await w.get('/api/me', gift);
  assert.equal(idle(), first, 'just used: nothing to write');
  // As if the session was last used 10 minutes ago.
  w.auth.prepare("UPDATE auth_sessions SET idle_expires_at=idle_expires_at-600 WHERE account_id='acct-gift'").run();
  const a = await w.get('/api/me', gift);
  assert.equal(writes(a.calls).length, 1, 'one write to move the time forward');
  assert.ok(idle() >= first, 'moved forward again');
  // Unused for longer than the limit: signed out, as before.
  w.auth.prepare("UPDATE auth_sessions SET idle_expires_at=1 WHERE account_id='acct-gift'").run();
  assert.equal((await w.get('/api/me', gift)).r.status, 401);
});

test('what the browser is told about the signed-in person carries no internal fields', async () => {
  const w = await world();
  const gift = await w.signIn('gift');
  const me = await (await w.get('/api/me', gift)).r.json();
  assert.equal(me.person, 'gift');
  for (const k of Object.keys(me)) assert.ok(!/password|personRow|account_id/i.test(k), k);
  assert.ok(!JSON.stringify(me).includes('acct-gift') || me.accountId === 'acct-gift', 'the account id appears only in the field that already carried it');
});

test('the Tasks screens are served under fingerprinted names the browser may keep, and the built file is up to date', async () => {
  const text = readFileSync(new URL('../../tasks/dist/ui-assets.mjs', import.meta.url), 'utf8');
  assert.equal(text, await buildUiModule(), 'tasks/dist/ui-assets.mjs is out of date: run "cd tasks && node scripts/build-ui-module.mjs"');
  const names = Object.keys(ui).filter((k) => k !== '/tasks.html');
  assert.equal(names.length, 3);
  for (const n of names) { assert.match(n, /^\/__tasks\/(app|i18n|style)-[0-9a-f]{12}\.(js|css)$/); assert.ok(ui['/tasks.html'].body.includes(`"${n}"`), `the page names ${n}`); }
  const w = await world();
  const gift = await w.signIn('gift');
  for (const n of names) {
    const { r } = await w.get(n, gift);
    assert.equal(r.status, 200, n);
    assert.equal(r.headers.get('cache-control'), 'private, max-age=31536000, immutable', n);
  }
  const page = (await w.get('/tasks.html', gift)).r;
  assert.equal(page.headers.get('cache-control'), 'private, no-store, max-age=0', 'the page itself is never kept');
  assert.equal((await w.get('/__tasks/app.js', gift)).r.status, 404, 'the old plain name is gone');
  // Signed out: the files are not served, kept name or not.
  assert.equal((await w.get(names[0], '')).r.status, 401);
});
