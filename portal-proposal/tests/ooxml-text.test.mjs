// Putting a paragraph's new text back into its runs (files-viewer/src/ooxml-text.mjs, used for PowerPoint and Word):
// only the changed part is rewritten, so the formatting around it stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spread } from '../files-viewer/src/ooxml-text.mjs';

/** Runs as [text, ...]; "\n" alone is a line break. Returns what is left after the change. */
function change(parts, next) {
  const state = parts.map((text) => ({ text, gone: false }));
  const segs = state.map((s) => ({ text: s.text, fixed: s.text === '\n', set: (x) => { s.text = x; }, remove: () => { s.gone = true; } }));
  const res = spread(segs, next);
  return { runs: state.filter((s) => !s.gone).map((s) => s.text), res };
}
test('nothing changed: nothing touched', () => { assert.equal(change(['Hot work: ', 'required'], 'Hot work: required').res, false); });
test('typing inside or at the end of a run stays in that run', () => {
  assert.deepEqual(change(['Hot work permit: ', 'required for all welding'], 'Hot work permit: required for all welding and cutting').runs, ['Hot work permit: ', 'required for all welding and cutting']);
  assert.deepEqual(change(['Hot work permit: ', 'required'], 'Hot works permit: required').runs, ['Hot works permit: ', 'required']);
  assert.deepEqual(change(['Total: ', '12', ' m3'], 'Total: 15 m3').runs, ['Total: ', '15', ' m3'], 'only the number run changes');
  assert.deepEqual(change(['bold', 'plain'], 'boldXplain').runs, ['boldX', 'plain'], 'typed between two runs: continues the one before, as Office does');
  assert.deepEqual(change(['bold', 'plain'], 'Xboldplain').runs, ['Xbold', 'plain']);
});
test('deleting across runs keeps what is left of each; an emptied run goes', () => {
  assert.deepEqual(change(['Hot work ', 'permit', ' required'], 'Hot required').runs, ['Hot ', 'required'], 'the middle run is gone, the outer two keep their own text');
  assert.deepEqual(change(['aaa', 'bbb', 'ccc'], 'aaccc').runs, ['aa', 'ccc']);
  assert.deepEqual(change(['aaa', 'bbb'], '').runs, []);
  assert.deepEqual(change(['one', 'two'], 'brand new').runs, ['brand new'], 'everything replaced: the first run holds it');
});
test('line breaks are kept unless deleted', () => {
  assert.deepEqual(change(['Line one', '\n', 'second'], 'Line 1', ).runs, ['Line 1']);
  assert.deepEqual(change(['Line one', '\n', 'second'], 'Line one\nsecond line').runs, ['Line one', '\n', 'second line']);
  assert.deepEqual(change(['Line one', '\n', 'second'], 'Line onesecond').runs, ['Line one', 'second']);
  assert.deepEqual(change(['a', '\n', 'b'], 'a\nXb').runs, ['a', '\n', 'Xb'], 'typed right after a break goes to the run after it');
});
test('no run to hold the text: the caller is asked to make one', () => {
  assert.deepEqual(change([], 'new text').res, { create: 'new text' });
  assert.deepEqual(change(['a', '\n'], 'a\nmore').res, { create: 'more' });
});
test('emoji and rare characters are not cut in half', () => {
  assert.deepEqual(change(['ok 👍 done'], 'ok 👎 done').runs, ['ok 👎 done']);
  assert.deepEqual(change(['𝒜', 'b'], '𝒜𝒜b').runs, ['𝒜𝒜', 'b']);
});

// Matching the file's paragraphs to what is on screen, and to a newer version saved by someone else (public/files/textedit.mjs).
import { align, pairUp } from '../public/files/textedit.mjs';
const eq = (a, b) => a === b;
test('paragraphs are matched in order; what is not the same on both sides is left out', () => {
  assert.deepEqual(align(['a', 'b', 'c'], ['a', 'x', 'c'], eq), [[0, 0], [2, 2]]);
  assert.deepEqual(align(['a', 'b', 'c', 'd'], ['a', 'c', 'new', 'd'], eq), [[0, 0], [2, 1], [3, 3]], 'one removed, one added');
  assert.deepEqual(align(['m3', 'kg', 'm3'], ['m3', 'm3'], eq), [[0, 0], [2, 1]], 'repeated text keeps its order');
});
test('long documents: the same start and end are skipped, a big middle is cut at texts found once on both sides', () => {
  const base = Array.from({ length: 5000 }, (_, i) => `paragraph ${i}`), theirs = [...base];
  theirs[2500] = 'changed by someone else'; theirs.splice(100, 0, 'a new paragraph'); theirs.splice(4000, 1);
  const to = new Map(pairUp(base, theirs));
  assert.equal(to.size, 4998); assert.equal(to.get(0), 0); assert.equal(to.get(100), 101); assert.equal(to.get(2500), undefined, 'their changed paragraph is not mine any more');
  assert.equal(to.get(3998), 3999); assert.equal(to.get(3999), undefined, 'the one they removed'); assert.equal(to.get(4999), 4999);
  assert.deepEqual(pairUp(['a', 'b'], ['a', 'b']), [[0, 0], [1, 1]]); assert.deepEqual(pairUp([], ['a']), []);
  assert.deepEqual(pairUp(['', 'a', '', 'b'], ['a', '', '', 'b'], (x) => x !== ''), [[1, 0], [3, 3]], 'empty paragraphs are never used as matches');
  // Many repeated texts (a big table of "m3" / "kg") with changes far apart: still matched around the unique rows.
  const rows = []; for (let i = 0; i < 3000; i++) rows.push(i % 3 === 0 ? `Item ${i}` : i % 3 === 1 ? 'm3' : 'kg');
  const edited = [...rows]; edited[30] = 'Item 30 (rev)'; edited[2700] = 'Item 2700 (rev)';
  const t2 = new Map(pairUp(rows, edited));
  assert.equal(t2.size, 2998); assert.equal(t2.get(1501), 1501); assert.equal(t2.get(30), undefined);
  for (const [i, j] of t2) assert.equal(rows[i], edited[j]);
});
