// Spreadsheet formulas worked out in the browser (Excel editing in Files; Brian, 10 Nov 2026). Own code, no libraries.
// Used only to refresh formulas that depend on a cell someone just changed on the site: every other formula keeps the
// value Excel itself saved in the file. Rule: never show a number we cannot stand behind. A formula that uses something
// this file does not know (an unusual function, a link to another workbook, ...) is reported as "stale" instead of guessed.
//
// createCalc(src).result(sheet, row, col) -> { v, dirty, stale }
//   dirty: the formula depends (directly or through other formulas) on a changed cell
//   stale: it could not be worked out here (v is then undefined)
// src: { sheets: [names], cell(si, r, c) -> { f, v, arr } | undefined, dims(si) -> [rows, cols], overlay(si, r, c) -> { v } | undefined,
//        anyOverlay() -> boolean, rowHidden(si, r) -> boolean (optional), tables: Map(lower name -> { si, r1, c1, r2, c2, header, totals, cols: [names] }),
//        names: Map(lower name -> 'Sheet!$A$1:$B$2'), epoch (ms of day 0), today() -> day number }
// Values: number, string, boolean, null (empty) or { e: '#DIV/0!' } (an Excel error). Rows and columns count from 1.

export class Stale extends Error {}
const E = (code) => ({ e: code });
export const isErr = (v) => v !== null && typeof v === 'object' && 'e' in v;
const DIV0 = E('#DIV/0!'), VALUE = E('#VALUE!'), NA = E('#N/A'), NUM = E('#NUM!'), REF = E('#REF!'), NAME = E('#NAME?');
const colNum = (s) => [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
export const numStr = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(15))));

// ---------- reading a formula ----------
const ID = '[A-Za-z_\\\\\\u00A1-\\uFFFF][\\w.\\u00A1-\\uFFFF]*';
const RX = {
  ws: /^\s+/, str: /^"((?:[^"]|"")*)"/, err: /^#(?:DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!)/i,
  qsheet: /^'((?:[^']|'')+)'!/, sheet: new RegExp(`^(${ID})!`),
  area: /^\$?([A-Za-z]{1,3})\$?(\d{1,7}):\$?([A-Za-z]{1,3})\$?(\d{1,7})(?![\w(])/, cols: /^\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})(?![\w(.])/, rows: /^\$?(\d{1,7}):\$?(\d{1,7})(?![\w.])/,
  cell: /^\$?([A-Za-z]{1,3})\$?(\d{1,7})(?![\w(.])/, num: /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/, id: new RegExp(`^${ID}`), op: /^(?:<=|>=|<>|[=<>+\-*/^&%(),])/,
};
function tokens(src) {
  const out = []; let s = src;
  const take = (m) => { s = s.slice(m[0].length); return m; };
  const bracket = () => { // "[...]" with nested brackets and 'escaped characters
    let depth = 0, i = 0;
    for (; i < s.length; i++) { const ch = s[i]; if (ch === "'") i++; else if (ch === '[') depth++; else if (ch === ']' && --depth === 0) break; }
    if (depth !== 0 || i >= s.length) throw new Stale('bracket');
    const inner = s.slice(1, i); s = s.slice(i + 1); return inner;
  };
  const ref = (sheet) => {
    let m;
    if ((m = RX.area.exec(s))) { take(m); return { t: 'area', sheet, r1: +m[2], c1: colNum(m[1]), r2: +m[4], c2: colNum(m[3]) }; }
    if ((m = RX.cols.exec(s))) { take(m); return { t: 'area', sheet, r1: 1, c1: colNum(m[1]), r2: 1048576, c2: colNum(m[2]) }; }
    if ((m = RX.rows.exec(s))) { take(m); return { t: 'area', sheet, r1: +m[1], c1: 1, r2: +m[2], c2: 16384 }; }
    if ((m = RX.cell.exec(s)) && colNum(m[1]) <= 16384 && +m[2] >= 1 && +m[2] <= 1048576) { take(m); return { t: 'cell', sheet, r: +m[2], c: colNum(m[1]) }; }
    return null;
  };
  while (s) {
    let m;
    if ((m = RX.ws.exec(s))) { take(m); continue; }
    if ((m = RX.str.exec(s))) { take(m); out.push({ t: 'str', v: m[1].replace(/""/g, '"') }); continue; }
    if ((m = RX.err.exec(s))) { take(m); out.push({ t: 'err', v: E(m[0].toUpperCase()) }); continue; }
    if ((m = RX.qsheet.exec(s) || RX.sheet.exec(s))) {
      const rest = s; take(m);
      if (/[[\]:]/.test(m[1])) throw new Stale('external'); // another workbook, or a range of sheets
      const r = ref(m[1].replace(/''/g, "'"));
      if (r) { out.push(r); continue; }
      if (m[0][0] === "'") throw new Stale('sheet'); // a link this file does not understand (another workbook, a 3D range)
      s = rest; // not a sheet name after all (e.g. a defined name before "!"): read on as a name
    }
    if (s[0] === '[') { const inner = bracket(); if (/^\d+$/.test(inner)) throw new Stale('external'); out.push({ t: 'sref', table: null, spec: inner }); continue; }
    if (s[0] === '{' || s[0] === ':' || s[0] === ' ') throw new Stale('syntax');
    const r = ref(null);
    if (r) { out.push(r); continue; }
    if ((m = RX.num.exec(s))) { take(m); out.push({ t: 'num', v: Number(m[0]) }); continue; }
    if ((m = RX.id.exec(s))) {
      take(m);
      if (s[0] === '(') { s = s.slice(1); out.push({ t: 'call', name: m[0].toUpperCase().replace(/^_XLFN\.|^_XLWS\./, '') }); }
      else if (s[0] === '[') out.push({ t: 'sref', table: m[0], spec: bracket() });
      else if (/^(true|false)$/i.test(m[0])) out.push({ t: 'bool', v: /^t/i.test(m[0]) });
      else out.push({ t: 'name', name: m[0] });
      continue;
    }
    if ((m = RX.op.exec(s))) { take(m); out.push({ t: 'op', v: m[0] }); continue; }
    throw new Stale('syntax');
  }
  return out;
}
export function parse(formula) {
  const tk = tokens(String(formula).replace(/^=/, '')); let i = 0;
  const peek = (v) => tk[i]?.t === 'op' && tk[i].v === v, eat = (v) => { if (!peek(v)) throw new Stale('syntax'); i++; };
  const level = (ops, next) => () => { let a = next(); while (tk[i]?.t === 'op' && ops.includes(tk[i].v)) { const op = tk[i++].v; a = { t: 'bin', op, a, b: next() }; } return a; };
  const primary = () => {
    const x = tk[i++];
    if (!x) throw new Stale('syntax');
    if (x.t === 'op' && x.v === '(') { const e = expr(); eat(')'); return e; }
    if (x.t === 'call') {
      const args = [];
      if (peek(')')) { i++; return { t: 'func', name: x.name, args }; }
      for (;;) {
        args.push(peek(',') || peek(')') ? { t: 'empty' } : expr());
        if (peek(',')) { i++; continue; }
        eat(')'); return { t: 'func', name: x.name, args };
      }
    }
    if (x.t === 'op') throw new Stale('syntax');
    return x;
  };
  const postfix = () => { let a = primary(); while (peek('%')) { i++; a = { t: 'pct', a }; } return a; };
  const unary = () => { if (peek('-') || peek('+')) { const op = tk[i++].v; const a = unary(); return op === '-' ? { t: 'neg', a } : { t: 'pos', a }; } return postfix(); };
  const expr = level(['=', '<>', '<', '>', '<=', '>='], level(['&'], level(['+', '-'], level(['*', '/'], level(['^'], unary)))));
  const tree = expr();
  if (i !== tk.length) throw new Stale('syntax');
  return tree;
}

// ---------- values ----------
const NUMERIC = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*(%?)\s*$/;
const strNum = (s) => { const m = NUMERIC.exec(s); return m ? Number(s.replace('%', '')) / (m[1] ? 100 : 1) : null; };
function toNum(v) {
  if (isErr(v)) return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = strNum(v); return n === null ? VALUE : n;
}
const toStr = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? numStr(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : v);
function toBool(v) {
  if (isErr(v) || typeof v === 'boolean') return v;
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return v !== 0;
  return /^true$/i.test(v) ? true : /^false$/i.test(v) ? false : VALUE;
}
const fin = (n) => (typeof n === 'number' && !Number.isFinite(n) ? NUM : n === 0 ? 0 : n);
const rank = (v) => (typeof v === 'boolean' ? 2 : typeof v === 'string' ? 1 : 0);
function compare(a, b) { // Excel order: numbers < text < TRUE/FALSE; empty takes the other side's kind; text ignores case
  if (a === null || a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null || b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === 'string') { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return a < b ? -1 : a > b ? 1 : 0;
}
const wild = (pattern) => new RegExp(`^${pattern.replace(/~([*?~])|([*?])|([.+^${}()|[\]\\])/g, (_, esc, w, sp) => (esc ? `\\${esc}` : w === '*' ? '.*' : w === '?' ? '.' : `\\${sp}`))}$`, 'is');
/** A condition as in SUMIF / COUNTIF: 5, "x", ">5", "<>done", "ab*". Returns a test for one cell value. */
function criterion(c) {
  if (typeof c !== 'string') return (v) => (c === null ? v === null || v === '' : !isErr(v) && v !== null && rank(v) === rank(c) && compare(v, c) === 0);
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(c), op = m[1] || '=', text = m[2];
  const n = strNum(text), b = /^(true|false)$/i.test(text) ? /^t/i.test(text) : null;
  if (text === '') return op === '<>' ? (v) => v !== null && v !== '' : op === '=' ? (v) => v === null || (m[1] ? false : v === '') : () => false;
  const rx = n === null && b === null && (op === '=' || op === '<>') ? wild(text) : null;
  return (v) => {
    if (isErr(v)) return false;
    let d;
    if (n !== null) { const x = typeof v === 'number' ? v : typeof v === 'string' ? strNum(v) : null; if (x === null || (typeof v === 'string' && op !== '=' && op !== '<>')) return op === '<>'; d = x - n; }
    else if (b !== null) { if (typeof v !== 'boolean') return op === '<>'; d = Number(v) - Number(b); }
    else if (rx) { const hit = typeof v === 'string' && rx.test(v); return op === '=' ? hit : !hit; }
    else { if (typeof v !== 'string') return false; d = compare(v, text); }
    return op === '=' ? d === 0 : op === '<>' ? d !== 0 : op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0;
  };
}
function round(x, digits, mode) { // mode 0 = nearest (half away from zero), 1 = up (away from zero), -1 = down (towards zero)
  const d = Math.trunc(digits), a = Math.abs(x);
  if (!Number.isFinite(a) || a === 0) return x;
  const plain = !String(a).includes('e'); // "1.005e2" reads the decimal exactly; numbers already written with e use plain arithmetic
  const shifted = plain ? Number(`${a}e${d}`) : a * 10 ** d;
  if (!Number.isFinite(shifted)) return x;
  const eps = shifted < 1e8 ? 1e-9 : 0; // forgive binary noise from earlier arithmetic (267.49999999999997 means 267.5)
  const r = mode === 0 ? Math.round(shifted + eps) : mode > 0 ? Math.ceil(shifted - eps) : Math.floor(shifted + eps);
  return Math.sign(x) * (plain ? Number(`${r}e${-d}`) : r / 10 ** d);
}

// ---------- working it out ----------
export function createCalc(src) {
  const memo = new Map(), trees = new Map(), BUSY = {};
  const key = (si, r, c) => (si * 16384 + (c - 1)) * 1048576 + (r - 1);
  const sheetIndex = (name) => { const i = src.sheets.findIndex((s) => s.toLowerCase() === String(name).toLowerCase()); if (i < 0) throw new Stale('sheet'); return i; };
  let frame = null, here = null; // the formula being worked out: { dirty } and { si, r, c }

  class Area {
    constructor(si, r1, c1, r2, c2) { const [rows, cols] = src.dims(si); Object.assign(this, { si, r1, c1, r2: Math.min(r2, Math.max(rows, r1)), c2: Math.min(c2, Math.max(cols, c1)) }); }
    get rows() { return this.r2 - this.r1 + 1; }
    get cols() { return this.c2 - this.c1 + 1; }
    at(i, j) { return i < 0 || j < 0 || i >= this.rows || j >= this.cols ? null : read(this.si, this.r1 + i, this.c1 + j); }
    * values() { for (let r = this.r1; r <= this.r2; r++) for (let c = this.c1; c <= this.c2; c++) yield read(this.si, r, c); }
    part(i, j, rows, cols) { return new Area(this.si, this.r1 + i, this.c1 + j, this.r1 + i + rows - 1, this.c1 + j + cols - 1); }
  }

  function tree(f) { let t = trees.get(f); if (t === undefined) { try { t = parse(f); } catch (e) { if (!(e instanceof Stale)) throw e; t = null; } trees.set(f, t); } return t; }
  /** The value of a cell as a formula sees it, noting whether it is (or depends on) a changed cell. */
  function read(si, r, c) {
    const ov = src.overlay(si, r, c);
    if (ov) { if (frame) frame.dirty = true; return ov.v; }
    const cell = src.cell(si, r, c);
    if (!cell) return null;
    if (cell.f == null) return cell.v ?? null;
    const res = result(si, r, c);
    if (res.dirty) { if (frame) frame.dirty = true; if (res.stale) throw new Stale('depends on a stale cell'); return res.v; }
    if (cell.v !== undefined) return cell.v; // the value Excel saved
    if (res.stale) throw new Stale('no saved value'); // never worked out by Excel and we cannot either
    return res.v;
  }
  function result(si, r, c) {
    const k = key(si, r, c), seen = memo.get(k);
    if (seen === BUSY) throw new Stale('circular');
    if (seen) return seen;
    const cell = src.cell(si, r, c), t = cell?.f != null ? tree(cell.f) : null;
    memo.set(k, BUSY);
    const outer = frame, was = here; frame = { dirty: false }; here = { si, r, c };
    let out;
    try {
      if (!t || cell.arr) throw new Stale('unknown');
      const v = fin(single(ev(t)));
      out = { v: v === undefined ? null : v, dirty: frame.dirty, stale: false };
    } catch (e) {
      if (!(e instanceof Stale) && !(e instanceof RangeError)) throw e;
      let dirty = frame.dirty;
      if (!dirty) { try { dirty = t ? touches(t) : src.anyOverlay(); } catch { dirty = src.anyOverlay(); } }
      out = { v: undefined, dirty, stale: true };
    } finally { frame = outer; here = was; }
    memo.set(k, out);
    return out;
  }
  /** For a formula that could not be worked out: does anything it mentions depend on a changed cell? */
  function touches(t) {
    const cellDirty = (si, r, c) => !!src.overlay(si, r, c) || (src.cell(si, r, c)?.f != null && result(si, r, c).dirty);
    const walk = (n) => {
      if (!n || typeof n !== 'object') return false;
      if (n.t === 'cell') return cellDirty(n.sheet == null ? here.si : sheetIndex(n.sheet), n.r, n.c);
      if (n.t === 'area' || n.t === 'sref' || n.t === 'name') {
        let a;
        try { a = n.t === 'area' ? new Area(n.sheet == null ? here.si : sheetIndex(n.sheet), n.r1, n.c1, n.r2, n.c2) : ev(n); } catch { return src.anyOverlay(); }
        if (!(a instanceof Area)) return false;
        for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) if (cellDirty(a.si, r, c)) return true;
        return false;
      }
      return (n.args || []).some(walk) || walk(n.a) || walk(n.b);
    };
    const keep = frame; frame = null; // looking, not reading: must not mark the formula itself
    try { return walk(t); } finally { frame = keep; }
  }
  /** One value from something that may be a range (a formula in a single cell). */
  function single(v) {
    if (!(v instanceof Area)) return v;
    if (v.rows === 1 && v.cols === 1) return v.at(0, 0);
    if (v.cols === 1 && here.r >= v.r1 && here.r <= v.r2) return read(v.si, here.r, v.c1);
    if (v.rows === 1 && here.c >= v.c1 && here.c <= v.c2) return read(v.si, v.r1, here.c);
    throw new Stale('array result');
  }
  const val = (n) => single(ev(n));
  function structured(n) { // Table[Column], [@Column], Table[[#This Row],[Column]], Table[#All] ...
    const tb = n.table ? src.tables.get(n.table.toLowerCase()) : [...src.tables.values()].find((x) => x.si === here.si && here.r >= x.r1 && here.r <= x.r2 && here.c >= x.c1 && here.c <= x.c2);
    if (!tb) throw new Stale('table');
    let spec = n.spec.trim(), rows = 'data';
    const part = /^\[?#(All|Data|Headers|Totals|This Row)\]?\s*(?:,\s*|$)/i.exec(spec);
    if (part) { rows = part[1].toLowerCase(); spec = spec.slice(part[0].length); }
    else if (spec[0] === '@') { rows = 'this row'; spec = spec.slice(1); }
    const col = (name) => { const i = tb.cols.findIndex((x) => x.toLowerCase() === name.replace(/'(.)/g, '$1').toLowerCase()); if (i < 0) throw new Stale('table column'); return tb.c1 + i; };
    let c1 = tb.c1, c2 = tb.c2;
    if (spec) {
      const m = /^\[([^\]]+)\]\s*:\s*\[([^\]]+)\]$/.exec(spec) || /^\[([^\]]+)\]$/.exec(spec) || (/[[\],]/.test(spec) ? null : [0, spec]);
      if (!m) throw new Stale('table reference');
      c1 = col(m[1]); c2 = m[2] ? col(m[2]) : c1;
    }
    const top = tb.r1 + (tb.header ? 1 : 0), bottom = tb.r2 - (tb.totals ? 1 : 0);
    if (rows === 'this row') { if (here.si !== tb.si || here.r < top || here.r > bottom) return VALUE; return new Area(tb.si, here.r, c1, here.r, c2); }
    if (rows === 'headers') { if (!tb.header) return REF; return new Area(tb.si, tb.r1, c1, tb.r1, c2); }
    if (rows === 'totals') { if (!tb.totals) return REF; return new Area(tb.si, tb.r2, c1, tb.r2, c2); }
    return rows === 'all' ? new Area(tb.si, tb.r1, c1, tb.r2, c2) : new Area(tb.si, top, c1, bottom, c2);
  }
  function ev(n) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': case 'err': return n.v;
      case 'empty': return null;
      case 'cell': return new Area(n.sheet == null ? here.si : sheetIndex(n.sheet), n.r, n.c, n.r, n.c);
      case 'area': return new Area(n.sheet == null ? here.si : sheetIndex(n.sheet), n.r1, n.c1, n.r2, n.c2);
      case 'sref': return structured(n);
      case 'name': { const def = src.names.get(n.name.toLowerCase()); if (!def) throw new Stale('name'); const t = tree(def); if (!t || !['cell', 'area'].includes(t.t) || t.sheet == null) throw new Stale('name'); return ev(t); }
      case 'neg': { const v = toNum(val(n.a)); return isErr(v) ? v : -v; }
      case 'pos': return val(n.a);
      case 'pct': { const v = toNum(val(n.a)); return isErr(v) ? v : v / 100; }
      case 'bin': {
        const a = val(n.a), b = val(n.b);
        if (isErr(a)) return a; if (isErr(b)) return b;
        if (n.op === '&') return toStr(a) + toStr(b);
        if ('+-*/^'.includes(n.op)) {
          const x = toNum(a), y = toNum(b);
          if (isErr(x)) return x; if (isErr(y)) return y;
          if (n.op === '/') return y === 0 ? DIV0 : x / y;
          if (n.op === '^') { if (x === 0 && y < 0) return DIV0; return fin(x ** y); }
          return fin(n.op === '+' ? x + y : n.op === '-' ? x - y : x * y);
        }
        const d = compare(a, b);
        return n.op === '=' ? d === 0 : n.op === '<>' ? d !== 0 : n.op === '<' ? d < 0 : n.op === '>' ? d > 0 : n.op === '<=' ? d <= 0 : d >= 0;
      }
      case 'func': { const f = FN[n.name]; if (!f) throw new Stale(`function ${n.name}`); return f(n.args); }
      default: throw new Stale('syntax');
    }
  }

  // ---- helpers for functions ----
  /** Numbers as SUM sees them: in ranges only real numbers count; typed-in values are converted. Returns an error if one is met. */
  function numbers(args, { ranges = 'numbers' } = {}) {
    const out = [];
    for (const a of args) {
      const v = ev(a);
      if (v instanceof Area) { for (const x of v.values()) { if (isErr(x)) return x; if (typeof x === 'number') out.push(x); else if (ranges === 'all' && x !== null) out.push(x); } }
      else { if (a.t === 'empty') { out.push(0); continue; } const x = toNum(v); if (isErr(x)) return x; out.push(x); }
    }
    return out;
  }
  const withNums = (args, fn) => { const xs = numbers(args); return isErr(xs) ? xs : fn(xs); };
  const num = (a) => toNum(val(a)), str = (a) => { const v = val(a); return isErr(v) ? v : toStr(v); };
  /** Runs fn on converted arguments unless one of them is an error. */
  const args = (list, kinds, fn) => {
    const out = [];
    for (let i = 0; i < kinds.length; i++) {
      if (i >= list.length || list[i].t === 'empty') { out.push(undefined); continue; }
      const v = kinds[i] === 'n' ? num(list[i]) : kinds[i] === 's' ? str(list[i]) : kinds[i] === 'b' ? toBool(val(list[i])) : val(list[i]);
      if (isErr(v)) return v;
      out.push(v);
    }
    return fn(...out);
  };
  const area = (a) => { const v = ev(a); if (v instanceof Area) return v; throw new Stale('needs a range'); };
  function conditions(pairs) { // [range, criterion, range, criterion ...] -> list of [i, j] cells where every condition holds
    const first = area(pairs[0]), tests = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const a = area(pairs[i]), c = val(pairs[i + 1]);
      if (isErr(c)) return c;
      if (a.rows !== first.rows || a.cols !== first.cols) { if (pairs[i].t === 'area' && (pairs[i].r2 - pairs[i].r1 !== pairs[0].r2 - pairs[0].r1 || pairs[i].c2 - pairs[i].c1 !== pairs[0].c2 - pairs[0].c1)) return VALUE; }
      tests.push([a, criterion(c)]);
    }
    const hits = [];
    for (let i = 0; i < first.rows; i++) for (let j = 0; j < first.cols; j++) if (tests.every(([a, test]) => test(a.at(i, j)))) hits.push([i, j]);
    return hits;
  }
  function pick(hits, from, fn) { // the numbers of another range at the matching places
    if (isErr(hits)) return hits;
    const xs = [];
    for (const [i, j] of hits) { const v = read(from.si, from.r1 + i, from.c1 + j); if (isErr(v)) return v; if (typeof v === 'number') xs.push(v); }
    return fn(xs);
  }
  const sum = (xs) => xs.reduce((a, b) => a + b, 0), avg = (xs) => (xs.length ? sum(xs) / xs.length : DIV0);
  const same = (v, k) => !isErr(v) && v !== null && rank(v) === rank(k) && compare(v, k) === 0;
  function lookup(keyV, line, mode) { // position in a row or column: mode 0 exact, 1 last <= key, -1 last >= key (list sorted down)
    const n = Math.max(line.rows, line.cols), get = (i) => (line.cols === 1 ? line.at(i, 0) : line.at(0, i));
    if (mode === 0) {
      const rx = typeof keyV === 'string' && /[*?]/.test(keyV) ? wild(keyV) : null;
      for (let i = 0; i < n; i++) { const v = get(i); if (rx ? typeof v === 'string' && rx.test(v) : same(v, keyV)) return i; }
      return -1;
    }
    let found = -1;
    for (let i = 0; i < n; i++) { const v = get(i); if (isErr(v) || v === null || rank(v) !== rank(keyV)) continue; const d = compare(v, keyV); if (mode > 0 ? d <= 0 : d >= 0) found = i; else break; }
    return found;
  }
  const serial = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - src.epoch) / 864e5);
  const ymd = (s) => { const d = new Date(src.epoch + Math.floor(s) * 864e5); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCDay()]; };
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

  const FN = {
    SUM: (a) => withNums(a, sum), AVERAGE: (a) => withNums(a, avg), PRODUCT: (a) => withNums(a, (xs) => fin(xs.reduce((x, y) => x * y, 1))),
    MIN: (a) => withNums(a, (xs) => xs.reduce((x, y) => (y < x ? y : x), xs.length ? xs[0] : 0)), MAX: (a) => withNums(a, (xs) => xs.reduce((x, y) => (y > x ? y : x), xs.length ? xs[0] : 0)),
    MEDIAN: (a) => withNums(a, (xs) => { if (!xs.length) return NUM; const s = [...xs].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }),
    LARGE: (a) => { const xs = numbers([a[0]]), k = num(a[1]); if (isErr(xs)) return xs; if (isErr(k)) return k; const s = xs.sort((x, y) => y - x); return k < 1 || k > s.length ? NUM : s[Math.trunc(k) - 1]; },
    SMALL: (a) => { const xs = numbers([a[0]]), k = num(a[1]); if (isErr(xs)) return xs; if (isErr(k)) return k; const s = xs.sort((x, y) => x - y); return k < 1 || k > s.length ? NUM : s[Math.trunc(k) - 1]; },
    COUNT: (a) => { let n = 0; for (const x of a) { const v = ev(x); if (v instanceof Area) { for (const y of v.values()) if (typeof y === 'number') n++; } else if (x.t !== 'empty' && !isErr(toNum(v)) && v !== null) n++; } return n; },
    COUNTA: (a) => { let n = 0; for (const x of a) { const v = ev(x); if (v instanceof Area) { for (const y of v.values()) if (y !== null) n++; } else if (x.t !== 'empty') n++; } return n; },
    COUNTBLANK: (a) => { let n = 0; for (const y of area(a[0]).values()) if (y === null || y === '') n++; return n; },
    SUMPRODUCT: (a) => {
      const rs = a.map(area), first = rs[0]; let total = 0;
      if (rs.some((r) => r.rows !== first.rows || r.cols !== first.cols)) return VALUE;
      for (let i = 0; i < first.rows; i++) for (let j = 0; j < first.cols; j++) { let p = 1; for (const r of rs) { const v = r.at(i, j); if (isErr(v)) return v; p *= typeof v === 'number' ? v : 0; } total += p; }
      return total;
    },
    SUMIF: (a) => pick(conditions(a.slice(0, 2)), a[2] && a[2].t !== 'empty' ? area(a[2]) : area(a[0]), sum),
    AVERAGEIF: (a) => pick(conditions(a.slice(0, 2)), a[2] && a[2].t !== 'empty' ? area(a[2]) : area(a[0]), avg),
    COUNTIF: (a) => { const h = conditions(a.slice(0, 2)); return isErr(h) ? h : h.length; },
    SUMIFS: (a) => pick(conditions(a.slice(1)), area(a[0]), sum), AVERAGEIFS: (a) => pick(conditions(a.slice(1)), area(a[0]), avg),
    COUNTIFS: (a) => { const h = conditions(a); return isErr(h) ? h : h.length; },
    IF: (a) => { const c = toBool(val(a[0])); if (isErr(c)) return c; const b = c ? a[1] : a[2]; return b === undefined ? (c ? true : false) : b.t === 'empty' ? 0 : ev(b); },
    IFS: (a) => { for (let i = 0; i + 1 < a.length; i += 2) { const c = toBool(val(a[i])); if (isErr(c)) return c; if (c) return ev(a[i + 1]); } return NA; },
    IFERROR: (a) => { const v = val(a[0]); return isErr(v) ? (a[1] ? ev(a[1]) : null) : v; },
    IFNA: (a) => { const v = val(a[0]); return isErr(v) && v.e === '#N/A' ? (a[1] ? ev(a[1]) : null) : v; },
    AND: (a) => logic(a, (bs) => bs.every(Boolean)), OR: (a) => logic(a, (bs) => bs.some(Boolean)),
    NOT: (a) => args(a, ['b'], (b) => !b), TRUE: () => true, FALSE: () => false, NA: () => NA, PI: () => Math.PI,
    ROUND: (a) => args(a, ['n', 'n'], (x, d = 0) => round(x, d, 0)), ROUNDUP: (a) => args(a, ['n', 'n'], (x, d = 0) => round(x, d, 1)), ROUNDDOWN: (a) => args(a, ['n', 'n'], (x, d = 0) => round(x, d, -1)),
    TRUNC: (a) => args(a, ['n', 'n'], (x, d = 0) => round(x, d, -1)), INT: (a) => args(a, ['n'], (x) => Math.floor(x)), ABS: (a) => args(a, ['n'], Math.abs), SIGN: (a) => args(a, ['n'], Math.sign),
    SQRT: (a) => args(a, ['n'], (x) => (x < 0 ? NUM : Math.sqrt(x))), POWER: (a) => args(a, ['n', 'n'], (x, y) => (x === 0 && y < 0 ? DIV0 : fin(x ** y))),
    MOD: (a) => args(a, ['n', 'n'], (x, y) => (y === 0 ? DIV0 : x - y * Math.floor(x / y))),
    CEILING: (a) => args(a, ['n', 'n'], (x, s = 1) => (s === 0 ? 0 : x > 0 && s < 0 ? NUM : round(Math.ceil(round(x / s, 9, 0)) * s, 12, 0))),
    FLOOR: (a) => args(a, ['n', 'n'], (x, s = 1) => (s === 0 ? DIV0 : x > 0 && s < 0 ? NUM : round(Math.floor(round(x / s, 9, 0)) * s, 12, 0))),
    MROUND: (a) => args(a, ['n', 'n'], (x, s) => (s === 0 ? 0 : x * s < 0 ? NUM : round(round(x / s, 0, 0) * s, 12, 0))),
    // SUBTOTAL leaves out rows hidden by a filter and other SUBTOTAL cells. Which rows a filter hides is not known here,
    // so it is only worked out when no row in the range is hidden (then every variant gives the same answer).
    SUBTOTAL: (a) => {
      const code = num(a[0]); if (isErr(code)) return code;
      const kind = { 1: 'avg', 2: 'count', 3: 'counta', 4: 'max', 5: 'min', 6: 'product', 9: 'sum' }[Math.trunc(code) % 100];
      if (!kind) throw new Stale('SUBTOTAL kind');
      const xs = []; let filled = 0;
      for (const x of a.slice(1)) {
        const r = area(x);
        for (let row = r.r1; row <= r.r2; row++) {
          if (src.rowHidden?.(r.si, row)) throw new Stale('hidden rows');
          for (let c = r.c1; c <= r.c2; c++) {
            if (/^\s*(SUBTOTAL|AGGREGATE)\s*\(/i.test(src.cell(r.si, row, c)?.f || '') && !src.overlay(r.si, row, c)) continue;
            const v = read(r.si, row, c);
            if (v !== null) filled++;
            if (isErr(v)) { if (kind !== 'counta' && kind !== 'count') return v; } else if (typeof v === 'number') xs.push(v);
          }
        }
      }
      return kind === 'sum' ? sum(xs) : kind === 'avg' ? avg(xs) : kind === 'count' ? xs.length : kind === 'counta' ? filled : kind === 'product' ? fin(xs.reduce((x, y) => x * y, 1))
        : xs.reduce((x, y) => ((kind === 'max' ? y > x : y < x) ? y : x), xs.length ? xs[0] : 0);
    },
    VLOOKUP: (a) => table(a, false), HLOOKUP: (a) => table(a, true),
    MATCH: (a) => { const k = val(a[0]), line = area(a[1]), m = a[2] && a[2].t !== 'empty' ? num(a[2]) : 1; if (isErr(k)) return k; if (isErr(m)) return m; if (line.rows > 1 && line.cols > 1) return NA; const i = lookup(k, line, Math.sign(m)); return i < 0 ? NA : i + 1; },
    INDEX: (a) => {
      const r = area(a[0]); let i = a[1] && a[1].t !== 'empty' ? num(a[1]) : 0, j = a[2] && a[2].t !== 'empty' ? num(a[2]) : 0;
      if (isErr(i)) return i; if (isErr(j)) return j;
      if (a.length < 3 && r.rows === 1) { j = i; i = 1; }
      if (i < 0 || j < 0 || i > r.rows || j > r.cols) return REF;
      if (i === 0 && j === 0) return r;
      if (i === 0) return r.rows === 1 ? r.part(0, j - 1, 1, 1) : r.part(0, j - 1, r.rows, 1);
      if (j === 0) return r.cols === 1 ? r.part(i - 1, 0, 1, 1) : r.part(i - 1, 0, 1, r.cols);
      return r.part(i - 1, j - 1, 1, 1);
    },
    XLOOKUP: (a) => {
      const k = val(a[0]), from = area(a[1]), to = area(a[2]);
      if (isErr(k)) return k;
      if (a[4] && a[4].t !== 'empty' && num(a[4]) !== 0) throw new Stale('XLOOKUP mode');
      if (a[5] && a[5].t !== 'empty' && num(a[5]) !== 1) throw new Stale('XLOOKUP search');
      const i = lookup(k, from, 0);
      if (i < 0) return a[3] && a[3].t !== 'empty' ? ev(a[3]) : NA;
      return from.cols === 1 ? to.part(i, 0, 1, to.cols) : to.part(0, i, to.rows, 1);
    },
    CONCATENATE: (a) => joinText(a.map(val), ''), CONCAT: (a) => joinText(flat(a), ''),
    TEXTJOIN: (a) => { const d = str(a[0]), skip = toBool(val(a[1])); if (isErr(d)) return d; if (isErr(skip)) return skip; return joinText(flat(a.slice(2)).filter((v) => !skip || (v !== null && v !== '')), d); },
    LEN: (a) => args(a, ['s'], (s) => s.length), UPPER: (a) => args(a, ['s'], (s) => s.toUpperCase()), LOWER: (a) => args(a, ['s'], (s) => s.toLowerCase()),
    TRIM: (a) => args(a, ['s'], (s) => s.replace(/^ +| +$/g, '').replace(/ {2,}/g, ' ')), EXACT: (a) => args(a, ['s', 's'], (x, y) => x === y),
    LEFT: (a) => args(a, ['s', 'n'], (s, n = 1) => (n < 0 ? VALUE : s.slice(0, Math.trunc(n)))), RIGHT: (a) => args(a, ['s', 'n'], (s, n = 1) => (n < 0 ? VALUE : n < 1 ? '' : s.slice(-Math.trunc(n)))),
    MID: (a) => args(a, ['s', 'n', 'n'], (s, start, n) => (start < 1 || n < 0 ? VALUE : s.substr(Math.trunc(start) - 1, Math.trunc(n)))),
    SUBSTITUTE: (a) => args(a, ['s', 's', 's', 'n'], (s, from, to, nth) => { if (!from) return s; if (nth === undefined) return s.split(from).join(to); let at = -1; for (let i = 0; i < Math.trunc(nth); i++) { at = s.indexOf(from, at + 1); if (at < 0) return s; } return s.slice(0, at) + to + s.slice(at + from.length); }),
    VALUE: (a) => args(a, ['n'], (x) => x),
    ISBLANK: (a) => val(a[0]) === null, ISNUMBER: (a) => typeof val(a[0]) === 'number', ISTEXT: (a) => typeof val(a[0]) === 'string',
    ISERROR: (a) => isErr(val(a[0])), ISNA: (a) => { const v = val(a[0]); return isErr(v) && v.e === '#N/A'; }, ISERR: (a) => { const v = val(a[0]); return isErr(v) && v.e !== '#N/A'; },
    DATE: (a) => args(a, ['n', 'n', 'n'], (y, m, d) => serial(Math.trunc(y), Math.trunc(m), Math.trunc(d))),
    YEAR: (a) => args(a, ['n'], (s) => ymd(s)[0]), MONTH: (a) => args(a, ['n'], (s) => ymd(s)[1]), DAY: (a) => args(a, ['n'], (s) => ymd(s)[2]),
    WEEKDAY: (a) => args(a, ['n', 'n'], (s, kind = 1) => { const d = ymd(s)[3]; return kind === 1 ? d + 1 : kind === 2 ? ((d + 6) % 7) + 1 : kind === 3 ? (d + 6) % 7 : NUM; }),
    TODAY: () => src.today(), DAYS: (a) => args(a, ['n', 'n'], (end, start) => Math.trunc(end) - Math.trunc(start)),
    EDATE: (a) => args(a, ['n', 'n'], (s, months) => { const [y, m, d] = ymd(s), t = new Date(Date.UTC(y, m - 1 + Math.trunc(months), 1)); const yy = t.getUTCFullYear(), mm = t.getUTCMonth() + 1; return serial(yy, mm, Math.min(d, lastDay(yy, mm))); }),
    EOMONTH: (a) => args(a, ['n', 'n'], (s, months) => { const [y, m] = ymd(s), t = new Date(Date.UTC(y, m - 1 + Math.trunc(months), 1)); const yy = t.getUTCFullYear(), mm = t.getUTCMonth() + 1; return serial(yy, mm, lastDay(yy, mm)); }),
  };
  function logic(a, fn) {
    const bs = [];
    for (const x of a) {
      const v = ev(x);
      if (v instanceof Area) { for (const y of v.values()) { if (isErr(y)) return y; if (typeof y === 'boolean' || typeof y === 'number') bs.push(!!y); } }
      else { const b = toBool(v); if (isErr(b)) return b; bs.push(b); }
    }
    return bs.length ? fn(bs) : VALUE;
  }
  const flat = (a) => { const out = []; for (const x of a) { const v = ev(x); if (v instanceof Area) out.push(...v.values()); else out.push(v); } return out; };
  const joinText = (vs, d) => vs.find(isErr) || vs.map(toStr).join(d);
  function table(a, across) { // VLOOKUP / HLOOKUP
    const k = val(a[0]), t = area(a[1]), n = num(a[2]), approx = a[3] && a[3].t !== 'empty' ? toBool(val(a[3])) : true;
    if (isErr(k)) return k; if (isErr(n)) return n; if (isErr(approx)) return approx;
    const want = Math.trunc(n);
    if (want < 1) return VALUE;
    if (want > (across ? t.rows : t.cols)) return REF;
    const i = lookup(k, across ? t.part(0, 0, 1, t.cols) : t.part(0, 0, t.rows, 1), approx ? 1 : 0);
    return i < 0 ? NA : across ? t.at(want - 1, i) : t.at(i, want - 1);
  }

  return { result, clear: () => memo.clear() };
}
