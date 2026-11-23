// Bundles the viewers into ../public/files/vendor/ (loaded only when a file of that type is opened),
// and the QR code maker for 2-step sign-in set-up into ../public/__identity/vendor/.
import { build } from 'esbuild';
await build({
  entryPoints: { docx: 'src/docx.mjs', xlsx: 'src/xlsx.mjs', xlsxedit: 'src/xlsxedit.mjs', pptx: 'src/pptx.mjs', pptxedit: 'src/pptxedit.mjs', docxedit: 'src/docxedit.mjs' },
  outdir: '../public/files/vendor', outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'browser',
  minify: true, target: 'es2020', legalComments: 'eof', logLevel: 'info', define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
});
await build({
  entryPoints: { qr: 'src/qr.mjs' }, outdir: '../public/__identity/vendor', outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm',
  platform: 'browser', minify: true, target: 'es2020', legalComments: 'eof', logLevel: 'info',
});
