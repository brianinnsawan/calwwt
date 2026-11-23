// Faster pages on weak signal: which responses the browser may keep (src/worker.mjs cachePolicy).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cachePolicy } from '../src/worker.mjs';

const req = (path, init = {}) => new Request('https://calnkt.example' + path, init);
const res = (headers = {}, status = 200, body = 'x') => new Response(status === 304 ? null : body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', ...headers } });
const cc = (r) => r.headers.get('cache-control');

test('fingerprinted program and model files are kept for a year', () => {
  for (const p of ['/model/assets/index-etSZcIr1.js', '/model/assets/index-CXFxqkFD.css', '/model/models/canopy-shell-e63c60858ba8.glb',
    '/model/sheets/canopy/CS-02-0123456789ab.pdf', '/files/cad/assets/index-BCwzIcjl.js',
    // Site audit (10 Nov 2026): the Tasks screens, the camp models and the model viewer's .mjs files carry a fingerprint too.
    '/__tasks/app-0123456789ab.js', '/__tasks/style-0123456789ab.css', '/camp/m/canopy-shell-e63c60858ba8.glb.json', '/model/assets/pdf.worker.min-BmS4jSda.mjs']) {
    assert.equal(cc(cachePolicy(req(p), res({ 'content-type': 'application/javascript' }))), 'private, max-age=31536000, immutable', p);
  }
});

test('other files with a fingerprint are checked on every use; unchanged ones answer 304', () => {
  const r = cachePolicy(req('/files/vendor/pdf.mjs'), res({ 'content-type': 'text/javascript', etag: '"abc"' }));
  assert.equal(cc(r), 'private, no-cache');
  const again = cachePolicy(req('/files/vendor/pdf.mjs', { headers: { 'if-none-match': '"abc"' } }), res({ 'content-type': 'text/javascript', etag: '"abc"', 'content-length': '1' }));
  assert.equal(again.status, 304); assert.equal(again.headers.get('content-length'), null); assert.equal(cc(again), 'private, no-cache');
  const changed = cachePolicy(req('/files/vendor/pdf.mjs', { headers: { 'if-none-match': '"old"' } }), res({ 'content-type': 'text/javascript', etag: '"abc"' }));
  assert.equal(changed.status, 200);
});

test('pages, data, downloads, errors and writes stay "do not store"', () => {
  const none = 'private, no-store, max-age=0';
  assert.equal(cc(cachePolicy(req('/tasks.html'), res({ 'content-type': 'text/html; charset=utf-8', etag: '"a"' }))), none);
  assert.equal(cc(cachePolicy(req('/api/files/1/content'), res({ 'content-type': 'application/pdf', etag: '"a"' }))), none);
  assert.equal(cc(cachePolicy(req('/model/api/health'), res({ 'content-type': 'application/json', etag: '"a"' }))), none);
  assert.equal(cc(cachePolicy(req('/model/sheets/x-0123456789ab.pdf'), res({ 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename=x.pdf' }))), none);
  assert.equal(cc(cachePolicy(req('/model/assets/index-etSZcIr1.js'), res({ 'content-type': 'text/javascript' }, 404))), none);
  assert.equal(cc(cachePolicy(req('/files/vendor/x.mjs', { method: 'POST' }), res({ etag: '"a"' }))), none);
  assert.equal(cc(cachePolicy(req('/files/files.mjs'), res({ 'content-type': 'text/javascript' }))), none, 'no fingerprint: nothing to check against');
});

test('signing out clears what the browser kept', () => {
  const r = cachePolicy(req('/api/local-auth/logout', { method: 'POST' }), res({ 'content-type': 'application/json' }));
  assert.equal(r.headers.get('clear-site-data'), '"cache"');
});
