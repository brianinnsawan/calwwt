// Builds the live meeting page: the browser editor and the Worker-side Yjs pieces.
import { build } from 'esbuild';
await build({
  entryPoints: { editor: 'src/editor.mjs' }, outdir: '../public/meetings/vendor', outExtension: { '.js': '.mjs' }, bundle: true,
  format: 'esm', platform: 'browser', minify: true, target: 'es2020', legalComments: 'eof', logLevel: 'info',
});
await build({
  entryPoints: { 'yjs-server': 'src/server.mjs' }, outdir: '../src/vendor', outExtension: { '.js': '.mjs' }, bundle: true,
  format: 'esm', platform: 'neutral', minify: false, target: 'es2022', legalComments: 'eof', logLevel: 'info',
});
