// Changes only the cells someone edited in an uploaded .xlsx; every other part of the file stays byte for byte
// the same (tables, pictures, printer settings, SharePoint data, formulas). Uses JSZip and the browser's XML parser.
// edits: [{ sheet: 'Sheet name', ref: 'C3', kind: 'text'|'number'|'date'|'clear', value }]
// Formula cells are never rewritten, but the value saved next to a formula can be refreshed (10 Nov 2026):
//   { kind: 'cached', value: number | string | boolean | { e: '#DIV/0!' } }  the formula's new result, worked out on the site
//   { kind: 'uncache' }  the result is no longer known: remove it, so nothing wrong is shown until Excel works it out
// Whenever something is changed the workbook is also marked "recalculate when opened", so Excel checks every formula.
import JSZip from 'jszip';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XNS = 'http://www.w3.org/XML/1998/namespace';
const colNum = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const split = (ref) => { const m = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref); if (!m) throw new Error(`Bad cell ${ref}`); return { col: colNum(m[1]), row: Number(m[2]) }; };
/** YYYY-MM-DD -> Excel date number (1900 system). */
export const excelDate = (iso) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5;

export async function applyEdits(buffer, edits) {
  const zip = await JSZip.loadAsync(buffer);
  const parse = (s) => { const d = new DOMParser().parseFromString(s, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('The file could not be read.'); return d; };
  const wb = parse(await zip.file('xl/workbook.xml').async('string'));
  const rels = parse(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  if (wb.documentElement.getAttribute('date1904') === '1' || [...wb.getElementsByTagNameNS(NS, 'workbookPr')].some((p) => ['1', 'true'].includes(p.getAttribute('date1904')))) {
    if (edits.some((e) => e.kind === 'date')) throw new Error('This workbook uses the 1904 date system; dates cannot be edited here.');
  }
  const sheetPath = (name) => {
    const s = [...wb.getElementsByTagNameNS(NS, 'sheet')].find((x) => x.getAttribute('name') === name);
    if (!s) throw new Error(`Sheet "${name}" not found.`);
    const id = s.getAttributeNS(RNS, 'id'), rel = [...rels.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === id);
    const target = rel.getAttribute('Target');
    return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  };
  if (edits.length) {
    // Ask Excel to work out every formula again when the file is opened (it otherwise trusts the saved results).
    const root = wb.documentElement, pre = root.prefix ? `${root.prefix}:` : '';
    let calc = [...root.childNodes].find((n) => n.nodeType === 1 && n.localName === 'calcPr');
    if (!calc) {
      calc = wb.createElementNS(NS, `${pre}calcPr`);
      // Its place in the file is fixed: after these parts if present, before everything else.
      const before = ['fileVersion', 'fileSharing', 'workbookPr', 'workbookProtection', 'bookViews', 'sheets', 'functionGroups', 'externalReferences', 'definedNames'];
      const kids = [...root.childNodes].filter((n) => n.nodeType === 1), last = kids.filter((n) => before.includes(n.localName)).pop();
      root.insertBefore(calc, last ? last.nextSibling : root.firstChild);
    }
    if (calc.getAttribute('fullCalcOnLoad') !== '1') {
      calc.setAttribute('fullCalcOnLoad', '1');
      let xml = new XMLSerializer().serializeToString(wb);
      if (!xml.startsWith('<?xml')) xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n${xml}`;
      zip.file('xl/workbook.xml', xml);
    }
  }
  const bySheet = new Map();
  for (const e of edits) (bySheet.get(e.sheet) || bySheet.set(e.sheet, []).get(e.sheet)).push(e);
  for (const [name, list] of bySheet) {
    const path = sheetPath(name), file = zip.file(path);
    if (!file) throw new Error(`Sheet "${name}" is missing.`);
    const doc = parse(await file.async('string'));
    const data = doc.getElementsByTagNameNS(NS, 'sheetData')[0];
    const pre = data.prefix ? `${data.prefix}:` : '';
    const make = (tag) => doc.createElementNS(NS, pre + tag);
    for (const e of list) {
      const { col, row } = split(e.ref);
      const rows = [...data.getElementsByTagNameNS(NS, 'row')];
      let r = rows.find((x) => Number(x.getAttribute('r')) === row);
      if (!r) { r = make('row'); r.setAttribute('r', String(row)); data.insertBefore(r, rows.find((x) => Number(x.getAttribute('r')) > row) || null); }
      r.removeAttribute('spans');
      const cells = [...r.getElementsByTagNameNS(NS, 'c')];
      let c = cells.find((x) => x.getAttribute('r') === e.ref);
      if (!c) {
        if (e.kind === 'clear') continue;
        c = make('c'); c.setAttribute('r', e.ref);
        // A new cell takes the row's style if it has one, so it matches its neighbours.
        if (r.getAttribute('customFormat') === '1' && r.getAttribute('s')) c.setAttribute('s', r.getAttribute('s'));
        r.insertBefore(c, cells.find((x) => colNum(/^[A-Z]+/.exec(x.getAttribute('r'))[0]) > col) || null);
      }
      const formula = c.getElementsByTagNameNS(NS, 'f')[0];
      if (e.kind === 'cached' || e.kind === 'uncache') {
        if (!formula) continue; // no longer a formula in this version of the file: leave it alone
        for (const old of [...c.childNodes]) if (old !== formula) c.removeChild(old);
        c.removeAttribute('t');
        const x = e.value;
        if (e.kind === 'uncache' || x === null || x === undefined || (typeof x === 'number' && !Number.isFinite(x))) continue;
        const v = make('v');
        if (typeof x === 'number') v.textContent = String(x);
        else if (typeof x === 'boolean') { c.setAttribute('t', 'b'); v.textContent = x ? '1' : '0'; }
        else if (typeof x === 'object') { c.setAttribute('t', 'e'); v.textContent = String(x.e); }
        else { c.setAttribute('t', 'str'); v.textContent = String(x); }
        c.appendChild(v);
        continue;
      }
      if (formula) throw new Error(`${name}!${e.ref} holds a formula and cannot be edited here.`);
      while (c.firstChild) c.removeChild(c.firstChild);
      c.removeAttribute('t');
      if (e.kind === 'text') {
        c.setAttribute('t', 'inlineStr');
        const is = make('is'), t = make('t');
        t.setAttributeNS(XNS, 'xml:space', 'preserve'); t.textContent = String(e.value);
        is.appendChild(t); c.appendChild(is);
      } else if (e.kind === 'number' || e.kind === 'date') {
        const n = e.kind === 'date' ? excelDate(e.value) : Number(e.value);
        if (!Number.isFinite(n)) throw new Error(`${name}!${e.ref}: not a number.`);
        const v = make('v'); v.textContent = String(n); c.appendChild(v);
      }
    }
    let xml = new XMLSerializer().serializeToString(doc);
    if (!xml.startsWith('<?xml')) xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n${xml}`;
    zip.file(path, xml);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
