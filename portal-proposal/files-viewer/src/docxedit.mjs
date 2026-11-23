// Changes only the text someone edited in an uploaded .docx (Files -> Word, Brian 10 Nov 2026). Every other part of the
// file stays as it was: styles, numbering, pictures, headers and footers, comments. Uses JSZip and the browser's XML parser.
//
//   readDoc(buffer) -> { paras: [{ text, locked, keep }] }   every paragraph of the document's main text, in file order
//     locked  holds something this editor does not rewrite (a picture, a field such as a page number, tracked changes ...)
//     keep    cannot be removed (it carries a section break)
//   applyEdits(buffer, ops) -> new file. Each op names a paragraph by its number and the text it started from (sig); if the
//   file no longer has that text there, the edit is refused.
//     { at, sig, text }            new text for paragraph "at"
//     { at, sig, remove: true }    remove it
//     { after, sig, like, text }   a new paragraph after "after", formatted like paragraph "like"
// Inside a changed paragraph only the changed part is rewritten, so bold / colour / links around it stay (ooxml-text.mjs).
import JSZip from 'jszip';
import { spread } from './ooxml-text.mjs';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XNS = 'http://www.w3.org/XML/1998/namespace';
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PART = 'word/document.xml';
/** On screen a non-breaking space is shown (and typed) as a space; the file keeps its own wherever the text is not changed. */
export const same = (s) => s.replace(/ /g, ' ');

function parse(s) { const d = new DOMParser().parseFromString(s, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('The file could not be read.'); return d; }
function write(doc) { const xml = new XMLSerializer().serializeToString(doc); return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n${xml}`; }
const els = (n) => [...n.childNodes].filter((x) => x.nodeType === 1);
const isW = (n, name) => n.namespaceURI === W && n.localName === name;
function keepPacking(zip) { for (const f of Object.values(zip.files)) { const magic = f._data?.compression?.magic; if (magic) f.options.compression = magic === '\x00\x00' ? 'STORE' : 'DEFLATE'; } }
const parasOf = (doc) => { const body = doc.getElementsByTagNameNS(W, 'body')[0]; return body ? [...body.getElementsByTagNameNS(W, 'p')] : []; };

const SKIP = new Set(['pPr', 'rPr', 'bookmarkStart', 'bookmarkEnd', 'proofErr', 'commentRangeStart', 'commentRangeEnd', 'permStart', 'permEnd', 'lastRenderedPageBreak', 'softHyphen']);
/** A paragraph's pieces in order: text, tabs and line breaks. Anything else that shows or matters locks the paragraph. */
function pieces(p) {
  const segs = []; let locked = false;
  const run = (r) => {
    const tidy = () => { if (!els(r).some((x) => !isW(x, 'rPr'))) r.parentNode?.removeChild(r); };
    for (const n of els(r)) {
      if (n.namespaceURI !== W) { locked = true; continue; }
      if (n.localName === 't') segs.push({ text: n.textContent, set: (x) => { n.textContent = x; n.setAttributeNS(XNS, 'xml:space', 'preserve'); }, remove: () => { r.removeChild(n); tidy(); } });
      else if (n.localName === 'tab') segs.push({ text: '\t', fixed: true, remove: () => { r.removeChild(n); tidy(); } });
      else if (n.localName === 'br' || n.localName === 'cr') { if (['page', 'column'].includes(n.getAttributeNS(W, 'type'))) continue; segs.push({ text: '\n', fixed: true, remove: () => { r.removeChild(n); tidy(); } }); }
      else if (!SKIP.has(n.localName)) locked = true; // a picture, a field, a footnote mark, a symbol ...
    }
  };
  const walk = (node) => {
    for (const n of els(node)) {
      if (n.namespaceURI !== W) { locked = true; continue; }
      if (n.localName === 'r') run(n);
      else if (n.localName === 'hyperlink' || n.localName === 'smartTag') walk(n);
      else if (!SKIP.has(n.localName)) locked = true; // tracked changes, fields, content controls, maths ...
    }
  };
  walk(p);
  return { segs, locked };
}
const textOf = (p) => pieces(p).segs.map((s) => s.text).join('');
const keeps = (p) => { const pPr = els(p).find((x) => isW(x, 'pPr')); return !!pPr && els(pPr).some((x) => isW(x, 'sectPr')); };

export async function readDoc(buffer) {
  const zip = await JSZip.loadAsync(buffer), file = zip.file(PART);
  if (!file) throw new Error('This is not a Word document.');
  const doc = parse(await file.async('string'));
  return { paras: parasOf(doc).map((p) => { const x = pieces(p); return { text: x.segs.map((s) => s.text).join(''), locked: x.locked, keep: keeps(p) }; }) };
}

/** A run of text at the end of a paragraph, formatted like its last run. */
function addRun(p, text, like) {
  const doc = p.ownerDocument, pre = p.prefix ? `${p.prefix}:` : '';
  const runs = [...p.getElementsByTagNameNS(W, 'r')].filter((r) => r.parentNode === p || isW(r.parentNode, 'hyperlink') && r.parentNode.parentNode === p);
  const from = like || (runs.length ? els(runs[runs.length - 1]).find((x) => isW(x, 'rPr')) : null);
  const r = doc.createElementNS(W, `${pre}r`);
  if (from) r.appendChild(from.cloneNode(true));
  const t = doc.createElementNS(W, `${pre}t`); t.textContent = text; t.setAttributeNS(XNS, 'xml:space', 'preserve'); r.appendChild(t);
  p.appendChild(r);
}
function setText(p, text) {
  const { segs, locked } = pieces(p);
  if (locked) throw new Error('This text cannot be changed here.');
  const res = spread(segs, text, same);
  if (res && res.create) addRun(p, res.create.replace(/[\n\t]/g, ' '));
}
/** A new paragraph formatted like another one: same style / numbering / alignment, text in the style of its first run. */
function newPara(like, text) {
  const p = like.cloneNode(false);
  for (const a of [...p.attributes]) if (/(^|:)(paraId|textId|rsid\w*)$/.test(a.name)) p.removeAttributeNode(a); // ids must stay unique
  const pPr = els(like).find((x) => isW(x, 'pPr'));
  if (pPr) { const c = pPr.cloneNode(true); for (const x of els(c)) if (isW(x, 'sectPr')) c.removeChild(x); p.appendChild(c); }
  const first = like.getElementsByTagNameNS(W, 'r')[0], rPr = first ? els(first).find((x) => isW(x, 'rPr')) : null;
  if (text) addRun(p, text.replace(/[\n\t]/g, ' '), rPr);
  return p;
}

export async function applyEdits(buffer, ops) {
  const zip = await JSZip.loadAsync(buffer), file = zip.file(PART);
  if (!file) throw new Error('This is not a Word document.');
  keepPacking(zip);
  const doc = parse(await file.async('string')), paras = parasOf(doc);
  const at = (k, sig) => { const p = paras[k]; if (!p || (sig !== undefined && textOf(p) !== sig)) throw new Error('That text was changed by someone else.'); return p; };
  // Find every paragraph first (numbers refer to the file as it is now), then change.
  const todo = ops.map((op) => ({ op, p: at(op.at ?? op.after, op.sig), like: op.like != null ? paras[op.like] : null }));
  const lastNew = new Map(); // several new paragraphs after the same one keep their order
  for (const { op, p, like } of todo) {
    if (op.after != null) { const fresh = newPara(like || p, String(op.text ?? '')), anchor = lastNew.get(p) || p; anchor.parentNode.insertBefore(fresh, anchor.nextSibling); lastNew.set(p, fresh); }
    else if (op.remove) { if (keeps(p)) throw new Error('That paragraph cannot be removed.'); }
    else if (op.text !== undefined) setText(p, String(op.text));
  }
  for (const { op, p } of todo) if (op.remove && op.after == null) p.parentNode.removeChild(p);
  zip.file(PART, write(doc), { createFolders: false });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: MIME });
}
