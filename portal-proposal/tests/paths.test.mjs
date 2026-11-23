// Audit F01: one canonical path, so page checks and the asset store agree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPath as c } from '../src/paths.mjs';

test('plain paths stay as they are', () => {
  for (const p of ['/', '/safety/', '/safety/guide/phase-data.mjs', '/files/view.html', '/api/files/0b4e/download/Canopy%20CS-08.dwg', '/api/files/x/download/%E0%B8%87%E0%B8%B2%E0%B8%99.xlsx', '/model/assets/a-b_c~d.js'])
    assert.equal(c(p), p, p);
});
test('disguised spellings become the plain path, so the same check applies', () => {
  assert.equal(c('/%73afety/guide/phase-data.mjs'), '/safety/guide/phase-data.mjs');
  assert.equal(c('/model/%69ndex.html'), '/model/index.html');
  assert.equal(c('/files/a%e0%b8%87.pdf'), '/files/a%E0%B8%87.pdf');
  assert.equal(c('/x/user@host'), '/x/user@host');
  assert.equal(c('/x/user%40host'), '/x/user@host');
});
test('impossible paths are refused', () => {
  for (const p of ['/safety%2Fguide%2Fphase-data.mjs', '/safety%2fguide', '//safety/guide/phase-data.mjs', '/safety//guide', '/a/%2e%2e/safety/x', '/a/%2E/b', '/a%5Cb', '/a%00b', '/bad%zz', 'relative'])
    assert.equal(c(p), null, p);
});
