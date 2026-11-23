// Changes only the text someone edited in an uploaded .pptx (Files -> PowerPoint, Brian 10 Nov 2026). Every other part of
// the file stays as it was: pictures, layouts, animations, notes, charts. Uses JSZip and the browser's XML parser.
//
// A slide's text sits in "bodies" (a text box, a placeholder, a table cell), each a list of paragraphs.
//   readSlides(buffer) -> [{ path, bodies: [{ paras: [{ text, locked }] }] }]   in the order of the slide show
//   applyEdits(buffer, ops) -> new file. ops: [{ path, body, sig, paras }]
//     body   which body of that slide (counting from 0, in the order of the file)
//     sig    the paragraph texts this edit started from; if the file no longer has them, the edit is refused
//     paras  the paragraphs wanted, in order: { base: n, text? } keeps paragraph n (with new text if given),
//            { base: null, like: n, text } is a new paragraph formatted like paragraph n. Paragraphs left out are removed.
// Inside a changed paragraph only the changed part is rewritten, so bold / colour / links around it stay (ooxml-text.mjs).
import JSZip from 'jszip';
import { spread } from './ooxml-text.mjs';

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function parse(s) { const d = new DOMParser().parseFromString(s, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('The file could not be read.'); return d; }
function write(doc) { const xml = new XMLSerializer().serializeToString(doc); return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n${xml}`; }
const kids = (n, name) => [...n.childNodes].filter((x) => x.nodeType === 1 && x.namespaceURI === A && (!name || x.localName === name));
/** Unchanged parts keep the bytes they had (a picture is not squeezed again): big decks save quickly. */
function keepPacking(zip) { for (const f of Object.values(zip.files)) { const magic = f._data?.compression?.magic; if (magic) f.options.compression = magic === '\x00\x00' ? 'STORE' : 'DEFLATE'; } }

async function slidePaths(zip) {
  const pres = parse(await zip.file('ppt/presentation.xml').async('string')), rels = parse(await zip.file('ppt/_rels/presentation.xml.rels').async('string'));
  const target = new Map([...rels.getElementsByTagName('Relationship')].map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]));
  return [...pres.getElementsByTagNameNS(P, 'sldId')].map((s) => target.get(s.getAttributeNS(R, 'id'))).filter(Boolean).map((t) => (t.startsWith('/') ? t.slice(1) : `ppt/${t.replace(/^\.\//, '')}`));
}
/** The text bodies of a slide in file order: shapes and placeholders (p:txBody) and table cells (a:txBody). */
const bodiesOf = (doc) => [...doc.getElementsByTagNameNS('*', 'txBody')].filter((b) => b.namespaceURI === A || b.namespaceURI === P);
/** A paragraph's pieces: runs of text, and line breaks (shown as a new line). A field (slide number, date) locks it. */
function pieces(p) {
  const segs = []; let locked = false;
  for (const n of kids(p)) {
    if (n.localName === 'r') { let t = kids(n, 't')[0]; segs.push({ text: t ? t.textContent : '', set: (x) => { if (!t) { t = p.ownerDocument.createElementNS(A, n.prefix ? `${n.prefix}:t` : 't'); n.appendChild(t); } t.textContent = x; }, remove: () => p.removeChild(n) }); }
    else if (n.localName === 'br') segs.push({ text: '\n', fixed: true, remove: () => p.removeChild(n) });
    else if (n.localName === 'fld') { locked = true; segs.push({ text: kids(n, 't')[0]?.textContent || '', fixed: true, remove: () => {} }); }
    else if (n.localName !== 'pPr' && n.localName !== 'endParaRPr') locked = true; // something this editor does not know (maths ...)
  }
  return { segs, locked };
}
const textOf = (p) => pieces(p).segs.map((s) => s.text).join('');

export async function readSlides(buffer) {
  const zip = await JSZip.loadAsync(buffer), out = [];
  for (const path of await slidePaths(zip)) {
    const file = zip.file(path);
    if (!file) { out.push({ path, bodies: [] }); continue; }
    const doc = parse(await file.async('string'));
    out.push({ path, bodies: bodiesOf(doc).map((b) => ({ paras: kids(b, 'p').map((p) => { const x = pieces(p); return { text: x.segs.map((s) => s.text).join(''), locked: x.locked }; }) })) });
  }
  return out;
}

/** A run for new text at the end of a paragraph, formatted like the paragraph's last run (or its end mark). */
function addRun(p, text) {
  const doc = p.ownerDocument, pre = p.prefix ? `${p.prefix}:` : '', runs = kids(p, 'r'), endMark = kids(p, 'endParaRPr')[0];
  const r = doc.createElementNS(A, `${pre}r`), from = runs.length ? kids(runs[runs.length - 1], 'rPr')[0] : endMark;
  if (from) { const rPr = doc.createElementNS(A, `${pre}rPr`); for (const a of [...from.attributes]) rPr.setAttribute(a.name, a.value); for (const c of [...from.childNodes]) rPr.appendChild(c.cloneNode(true)); r.appendChild(rPr); }
  const t = doc.createElementNS(A, `${pre}t`); t.textContent = text; r.appendChild(t);
  p.insertBefore(r, endMark || null);
}
function setText(p, text) {
  const { segs, locked } = pieces(p);
  if (locked) throw new Error('This text cannot be changed here.');
  const res = spread(segs, text);
  if (res && res.create) addRun(p, res.create.replace(/\n/g, ' '));
}
/** A new paragraph formatted like another one: same bullet / level / alignment, text in the style of its first run. */
function newPara(like, text) {
  const p = like.cloneNode(true), first = kids(p, 'r')[0];
  for (const n of kids(p)) if (n.localName !== 'pPr' && n.localName !== 'endParaRPr' && n !== first) p.removeChild(n);
  if (first) { const t = kids(first, 't')[0]; if (t) t.textContent = text; else setText(p, text); if (!text) p.removeChild(first); }
  else if (text) addRun(p, text);
  return p;
}

export async function applyEdits(buffer, ops) {
  const zip = await JSZip.loadAsync(buffer);
  keepPacking(zip);
  const byPath = new Map();
  for (const op of ops) (byPath.get(op.path) || byPath.set(op.path, []).get(op.path)).push(op);
  for (const [path, list] of byPath) {
    const file = zip.file(path);
    if (!file) throw new Error('That slide is no longer in the file.');
    const doc = parse(await file.async('string')), bodies = bodiesOf(doc);
    for (const op of list) {
      const body = bodies[op.body], old = body ? kids(body, 'p') : [];
      if (!body || (op.sig && (op.sig.length !== old.length || op.sig.some((s, i) => s !== textOf(old[i]))))) throw new Error('That text was changed by someone else.');
      const want = [];
      for (const w of op.paras) {
        if (w.base != null) { const p = old[w.base]; if (!p || want.includes(p)) throw new Error('Bad paragraph.'); if (w.text !== undefined && w.text !== textOf(p)) setText(p, w.text); want.push(p); }
        else want.push(newPara(old[w.like] || old[old.length - 1], String(w.text ?? '')));
      }
      if (!want.length) { setText(old[0], ''); want.push(old[0]); } // a text body always keeps one (empty) paragraph
      for (const p of old) body.removeChild(p);
      for (const p of want) body.appendChild(p);
    }
    zip.file(path, write(doc), { createFolders: false });
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: MIME });
}
