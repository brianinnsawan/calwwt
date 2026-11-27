// Copies the full CAD program (Open CAD Studio, GPL-3.0) into Sites -> CAD workspace -> Full CAD program
// (public/cad-workspace/full/). calwwt, 27 Nov 2026 (Brian): the newest release instead of calnkt's 2026.41.
//
// Source: the official web build of release v2026.47, the asset OpenCADStudio-v2026.47-web.zip on
// github.com/HakanSeven12/OpenCADStudio/releases (built from the release tag by the project's own pages.yml workflow).
// Checks before anything is copied (the build stops if one fails):
//   - the zip's SHA-256 is the one reviewed on 27 Nov 2026 (ZIP_SHA256 below);
//   - app/release.json names version 2026.47 and commit 8e5f39f6ee04... (the commit the v2026.47 tag points to);
//   - the program's small JavaScript files (parse worker, clipboard snippet) are byte for byte the files in the tagged
//     source (second argument: a checkout of the tag), so what was reviewed is what is served;
//   - the WebAssembly file matches the integrity value (SHA-384) in the program's own start page.
// Nothing in the program is edited.
//   - The program's own page (index.html, inline scripts), its service worker (sw.js, offline mode), its automation helper
//     (ocs-control.js) and the welcome-screen lists (videos / discussions: outside links) are NOT copied: the site's page
//     index.html + program.mjs load the program under the site's strict CSP (no inline scripts, no outside loads).
//   - The WebAssembly file is 153 MB (57 MB in 2026.41); gzip-compressed it is still 50 MB, more than one static file may
//     be (25 MiB). It is stored as gzip in parts of at most 20 MiB (…_bg.wasm.gz.0, .1, …); the page joins the parts,
//     unpacks them and checks the SHA-384 against program.json before starting the program.
//   - The program's files go into a folder named after its version (full/v2026.47/). They never change under that name,
//     so browsers may keep them (src/cad-workspace.mjs: immutable caching); full/program.json (not cached) says which
//     folder the page loads.
//   - Left out: the Chinese / Japanese / Korean fonts (about 40 MB; not needed for these Thai and English drawings).
// Usage: node portal-proposal/scripts/import-cad-program.mjs <OpenCADStudio-v2026.47-web.zip> <source checkout of tag v2026.47>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const VERSION = '2026.47';
const COMMIT = '8e5f39f6ee0468a7e29260d57b5390d7d01207e8';
// The zip reviewed on 27 Nov 2026 (downloaded from the v2026.47 release page).
const ZIP_SHA256 = 'e0ab57e86d107b845e3efc6fc92f94e79afae0ba4602ad679f64faa14e97de4e';
const PART = 20 * 1024 * 1024;

const [zipPath, source] = process.argv.slice(2);
assert.ok(zipPath && source, 'Usage: import-cad-program.mjs <web zip> <source checkout of the tag>');
const zipBytes = fs.readFileSync(zipPath);
const zipSha = crypto.createHash('sha256').update(zipBytes).digest('hex');
assert.equal(zipSha, ZIP_SHA256, 'the web zip is not the one that was reviewed');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocs-web-'));
execFileSync('unzip', ['-q', zipPath, '-d', tmp]);
const app = path.join(tmp, 'app');
const read = (rel) => fs.readFileSync(path.join(app, rel));
const sameAsSource = (rel, src) => assert.ok(read(rel).equals(fs.readFileSync(path.join(source, src))), `${rel} differs from the tagged source ${src}`);

const release = JSON.parse(read('release.json'));
assert.deepEqual(release, { version: VERSION, commit: COMMIT });
const html = read('index.html').toString('utf8');
const glue = /import init, \* as bindings from '\/app\/(OpenCADStudio-[0-9a-f]{16}\.js)'/.exec(html)[1];
const wasm = /module_or_path: '\/app\/(OpenCADStudio-[0-9a-f]{16}_bg\.wasm)'/.exec(html)[1];
const sri = new RegExp(`href="/app/${wasm.replace('.', '\\.')}"[^>]*integrity="(sha384-[A-Za-z0-9+/=]+)"`).exec(html)[1];
const snippet = /href="\/app\/(snippets\/[^"]+\.js)"/.exec(html)[1];
sameAsSource('ocs-parse-worker.js', 'web/ocs-parse-worker.js');
sameAsSource(snippet, snippet.replace(/^snippets\/[^/]+\//, ''));
assert.ok(fs.readFileSync(path.join(source, 'Cargo.toml'), 'utf8').includes(`version = "${VERSION}.0"`), 'source checkout is not the release');

const full = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/cad-workspace/full');
const out = path.join(full, `v${VERSION}`);
for (const name of fs.existsSync(full) ? fs.readdirSync(full) : []) {
  // Keep the site's own page files; replace the program's files (and any older version folder).
  if (!['index.html', 'program.mjs', 'program.css', 'aliases.txt', 'blank.dxf'].includes(name)) fs.rmSync(path.join(full, name), { recursive: true, force: true });
}
const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true }); fs.writeFileSync(path.join(out, rel), read(rel)); };
copy(glue);
copy(snippet);
copy('ocs-parse-worker.js');
copy('worker_pkg/ocs_web_worker.js');
copy('worker_pkg/ocs_web_worker_bg.wasm');
assert.ok(fs.statSync(path.join(out, 'worker_pkg/ocs_web_worker_bg.wasm')).size < 25 * 1024 * 1024, 'worker WebAssembly fits one static file');
for (const f of ['latin', 'thai', 'cyrillic', 'greek', 'armenian', 'georgian', 'arabic', 'hebrew', 'lao', 'devanagari']) copy(`fonts/${f}.ttf`);
copy('fonts/OFL.txt');
copy('release.json');
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(out, 'LICENSE.txt'));

const wasmBytes = read(wasm);
assert.equal('sha384-' + crypto.createHash('sha384').update(wasmBytes).digest('base64'), sri, 'WebAssembly file matches the program page integrity value');
const packed = zlib.gzipSync(wasmBytes, { level: 9 });
const parts = [];
for (let i = 0, n = 0; i < packed.length; i += PART, n++) {
  const name = `${wasm}.gz.${n}`;
  fs.writeFileSync(path.join(out, name), packed.subarray(i, i + PART));
  parts.push(name);
}
fs.writeFileSync(path.join(full, 'program.json'), JSON.stringify({
  name: 'Open CAD Studio', version: VERSION, dir: `v${VERSION}/`, commit: COMMIT, license: 'GPL-3.0',
  source: `https://github.com/HakanSeven12/OpenCADStudio (tag v${VERSION}); web build: release asset OpenCADStudio-v${VERSION}-web.zip (SHA-256 ${zipSha})`,
  glue, wasmParts: parts, wasmGzipBytes: packed.length, wasmBytes: wasmBytes.length, wasmIntegrity: sri,
}, null, 1) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Open CAD Studio ${VERSION} copied to ${path.relative(process.cwd(), out)} (wasm ${(wasmBytes.length / 1e6).toFixed(1)} MB -> gzip ${(packed.length / 1e6).toFixed(1)} MB in ${parts.length} parts).`);

