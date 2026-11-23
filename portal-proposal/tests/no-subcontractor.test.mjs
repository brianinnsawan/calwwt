// Owner's rule: the word "subcontractor" is never displayed on the site, in English or Thai (Brian; the 3 Nov 2026 review
// suggested a check, since it slipped through once). Scans every file the site serves or runs. The only allowed
// occurrences are internal names that are never shown: a lowercase quoted id ("subcontractor") or an object key
// (subcontractor: …), used by the schedule's role table; on screen that role reads "Contractor".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const DIRS = ['portal-proposal/public', 'portal-proposal/src', 'tasks/public', 'tasks/src', 'tasks/dist', 'schedule'];
const SKIP = /\/(vendor|node_modules|engine|v\d+(\.\d+)*|assets)\/|\.(png|jpe?g|gif|webp|glb|pdf|wasm|gz|ttf|woff2?|dwg|dxf|xlsx|zip)$/i;
const WORD = /sub[\s-]?contractor|ผู้รับเหมาช่วง/gi;
const INTERNAL = /^(?:(["'])subcontractor\1|subcontractor:)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name), s = statSync(p);
    if (s.isDirectory()) { if (!SKIP.test(p + '/')) yield* files(p); } else if (!SKIP.test(p) && s.size < 8e6) yield p;
  }
}

test('"subcontractor" (English or Thai) appears nowhere people can see it', () => {
  const found = [];
  for (const d of DIRS) {
    for (const p of files(join(root, d))) {
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(WORD)) {
        const before = text[m.index - 1] || '', after = text[m.index + m[0].length] || '';
        if (INTERNAL.test(before + m[0] + after) || INTERNAL.test(m[0] + after)) continue;
        if (/never labelled "subcontractor"/.test(text.slice(m.index - 20, m.index + 30))) continue; // the rule's own comment
        found.push(`${relative(root, p)}: …${text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ')}…`);
      }
    }
  }
  assert.deepEqual(found, []);
});

test('the check catches the word in English and Thai', () => {
  const hit = (s) => [...s.matchAll(WORD)].some((m) => { const after = s[m.index + m[0].length] || ''; return !INTERNAL.test((s[m.index - 1] || '') + m[0] + after) && !INTERNAL.test(m[0] + after); });
  for (const s of ['Assign to Subcontractor', 'a sub-contractor', 'ผู้รับเหมาช่วง A', '"Subcontractor"', 'subcontractor team']) assert.ok(hit(s), s);
  for (const s of ['role: "subcontractor",', "LIMITS = { subcontractor: EXTERNAL }"]) assert.ok(!hit(s), s);
});
