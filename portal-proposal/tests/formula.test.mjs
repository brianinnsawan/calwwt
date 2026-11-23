// The site's own spreadsheet calculator (public/files/formula.mjs): results must match Excel, and anything it does not
// know must be reported as "stale", never guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalc, parse, Stale } from '../public/files/formula.mjs';

const col = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const at = (ref) => { const m = /^([A-Z]+)(\d+)$/.exec(ref); return [Number(m[2]), col(m[1])]; };
/** A tiny workbook: { Sheet: { A1: 5, B1: '=A1*2', C1: ['=A1+1', 6] } } — [formula, value Excel saved]. */
function book(sheets, { edits = {}, tables = [], names = {}, hidden = [] } = {}) {
  const list = Object.keys(sheets), cells = list.map((n) => new Map(Object.entries(sheets[n]).map(([ref, x]) => {
    const [r, c] = at(ref), f = Array.isArray(x) ? x[0] : typeof x === 'string' && x[0] === '=' ? x : null;
    return [`${r},${c}`, f ? { f: f.slice(1), v: Array.isArray(x) ? x[1] : undefined, arr: Array.isArray(x) && x[2] === 'array' } : { f: null, v: x }];
  })));
  const ov = new Map(Object.entries(edits).map(([k, v]) => { const [sheet, ref] = k.includes('!') ? k.split('!') : [list[0], k]; return [`${list.indexOf(sheet)},${at(ref).join(',')}`, { v }]; }));
  const dims = (si) => { let rows = 0, cols = 0; for (const k of cells[si].keys()) { const [r, c] = k.split(',').map(Number); rows = Math.max(rows, r); cols = Math.max(cols, c); } return [rows, cols]; };
  const calc = createCalc({ sheets: list, rowHidden: (si, r) => hidden.includes(r), cell: (si, r, c) => cells[si].get(`${r},${c}`), dims, overlay: (si, r, c) => ov.get(`${si},${r},${c}`), anyOverlay: () => ov.size > 0,
    tables: new Map(tables.map((t) => [t.name.toLowerCase(), t])), names: new Map(Object.entries(names).map(([k, v]) => [k.toLowerCase(), v])), epoch: Date.UTC(1899, 11, 30), today: () => 46336 });
  return (ref, sheet = list[0]) => calc.result(list.indexOf(sheet), ...at(ref));
}
/** The value of one formula on a small sheet of inputs. */
const calc = (formula, cells = {}) => { const r = book({ S: { ...cells, Z99: `=${formula}` } }, { edits: { Z98: 0 } })('Z99'); assert.equal(r.stale, false, `${formula} should be known`); return r.v; };
const D = { A1: 10, A2: 20, A3: 30, A4: 'text', A5: null, B1: 'apple', B2: 'Banana', B3: 'apple', B4: 'cherry', C1: 1.5, C2: 2.5, C3: -4, D1: true, D2: '15', E1: 46346 };

test('arithmetic and order of operations as in Excel', () => {
  assert.equal(calc('1+2*3'), 7); assert.equal(calc('(1+2)*3'), 9); assert.equal(calc('2^3^2'), 64); assert.equal(calc('-2^2'), 4);
  assert.equal(calc('10%'), 0.1); assert.equal(calc('50%*A1', D), 5); assert.equal(calc('A1/4', D), 2.5);
  assert.deepEqual(calc('1/0'), { e: '#DIV/0!' }); assert.deepEqual(calc('A4+1', D), { e: '#VALUE!' });
  assert.equal(calc('D2+1', D), 16, 'text that is a number is used as a number'); assert.equal(calc('A5+1', D), 1, 'empty counts as 0'); assert.equal(calc('D1+1', D), 2);
  assert.equal(calc('"a"&1&TRUE'), 'a1TRUE'); assert.equal(calc('0.1+0.2=0.3'), false, 'same binary arithmetic as Excel'); assert.equal(calc('1E3+1'), 1001);
});
test('comparisons', () => {
  assert.equal(calc('"a"="A"'), true); assert.equal(calc('1<"a"'), true); assert.equal(calc('"z"<TRUE'), true); assert.equal(calc('A5=0', D), true); assert.equal(calc('A5=""', D), true);
  assert.equal(calc('A1<>A2', D), true); assert.equal(calc('A1>=10', D), true); assert.equal(calc('"b">"a"'), true);
});
test('SUM and friends skip text in ranges, as Excel does', () => {
  assert.equal(calc('SUM(A1:A5)', D), 60); assert.equal(calc('SUM(A1:A3,5,"5")', D), 70); assert.equal(calc('SUM(A:A)', D), 60); assert.equal(calc('SUM(1:1)', D), 46357.5);
  assert.equal(calc('AVERAGE(A1:A5)', D), 20); assert.equal(calc('MIN(C1:C3)', D), -4); assert.equal(calc('MAX(A1:A5)', D), 30); assert.equal(calc('COUNT(A1:A5)', D), 3);
  assert.equal(calc('COUNTA(A1:A5)', D), 4); assert.equal(calc('COUNTBLANK(A1:A5)', D), 1); assert.equal(calc('PRODUCT(C1:C2)', D), 3.75); assert.equal(calc('MEDIAN(A1:A3)', D), 20);
  assert.equal(calc('SUMPRODUCT(A1:A3,C1:C3)', D), 10 * 1.5 + 20 * 2.5 - 120); assert.deepEqual(calc('AVERAGE(B1:B4)', D), { e: '#DIV/0!' });
  assert.equal(calc('LARGE(A1:A3,2)', D), 20); assert.equal(calc('SMALL(A1:A3,1)', D), 10);
  assert.deepEqual(calc('SUM(A1:A3,1/0)', D), { e: '#DIV/0!' }, 'an error in the data comes through');
});
test('conditions: SUMIF, COUNTIF and the ...IFS', () => {
  assert.equal(calc('SUMIF(B1:B4,"apple",A1:A4)', D), 40); assert.equal(calc('SUMIF(A1:A5,">15")', D), 50); assert.equal(calc('COUNTIF(B1:B4,"a*")', D), 2);
  assert.equal(calc('COUNTIF(B1:B4,"<>apple")', D), 2); assert.equal(calc('COUNTIF(A1:A5,"<>")', D), 4); assert.equal(calc('COUNTIF(A1:A5,"")', D), 1); assert.equal(calc('COUNTIF(A1:A5,20)', D), 1);
  assert.equal(calc('SUMIFS(A1:A4,B1:B4,"apple",A1:A4,">10")', D), 30); assert.equal(calc('COUNTIFS(B1:B4,"apple",A1:A4,"<=10")', D), 1); assert.equal(calc('AVERAGEIF(B1:B4,"apple",A1:A4)', D), 20);
  assert.equal(calc('COUNTIF(B1:B4,"BANANA")', D), 1, 'text matches whatever the capitals');
});
test('IF, IFERROR and logic', () => {
  assert.equal(calc('IF(A1>5,"big","small")', D), 'big'); assert.equal(calc('IF(A1>50,"big")', D), false); assert.equal(calc('IF(A1>50,1,)', D), 0);
  assert.equal(calc('IFERROR(1/0,"n/a")'), 'n/a'); assert.equal(calc('IFERROR(A1,0)', D), 10); assert.equal(calc('IFNA(VLOOKUP("x",B1:B4,1,FALSE),"none")', D), 'none');
  assert.equal(calc('AND(A1>5,A2>5)', D), true); assert.equal(calc('OR(A1>50,A2>50)', D), false); assert.equal(calc('NOT(A1>5)', D), false);
  assert.equal(calc('IFS(A1>50,"a",A1>5,"b")', D), 'b'); assert.equal(calc('IF(1/0>1,1,2)').e, '#DIV/0!');
});
test('rounding matches Excel (half away from zero)', () => {
  assert.equal(calc('ROUND(2.675,2)'), 2.68); assert.equal(calc('ROUND(-2.5,0)'), -3); assert.equal(calc('ROUND(1234.5,-2)'), 1200); assert.equal(calc('ROUND(1.005,2)'), 1.01);
  assert.equal(calc('ROUNDUP(2.11,1)'), 2.2); assert.equal(calc('ROUNDUP(2.1,1)'), 2.1); assert.equal(calc('ROUNDDOWN(2.19,1)'), 2.1); assert.equal(calc('ROUNDUP(-2.11,1)'), -2.2);
  assert.equal(calc('INT(-2.5)'), -3); assert.equal(calc('TRUNC(-2.5)'), -2); assert.equal(calc('MOD(-3,5)'), 2); assert.equal(calc('ABS(C3)', D), 4); assert.equal(calc('SQRT(16)'), 4);
  assert.equal(calc('CEILING(2.1,0.5)'), 2.5); assert.equal(calc('FLOOR(2.9,0.5)'), 2.5); assert.equal(calc('MROUND(7,5)'), 5); assert.equal(calc('ROUND(0.1+0.2,10)'), 0.3);
});
test('lookups', () => {
  const T = { A1: 'F1', B1: 12, C1: 'ok', A2: 'F2', B2: 8, C2: 'late', A3: 'P1', B3: 3, C3: 'ok', E1: 0, F1: 'low', E2: 10, F2: 'mid', E3: 20, F3: 'high' };
  assert.equal(calc('VLOOKUP("f2",A1:C3,2,FALSE)', T), 8); assert.deepEqual(calc('VLOOKUP("zz",A1:C3,2,FALSE)', T), { e: '#N/A' }); assert.deepEqual(calc('VLOOKUP("F1",A1:C3,9,FALSE)', T), { e: '#REF!' });
  assert.equal(calc('VLOOKUP(15,E1:F3,2)', T), 'mid'); assert.equal(calc('VLOOKUP(20,E1:F3,2,TRUE)', T), 'high'); assert.deepEqual(calc('VLOOKUP(-1,E1:F3,2)', T), { e: '#N/A' });
  assert.equal(calc('MATCH("P1",A1:A3,0)', T), 3); assert.equal(calc('MATCH(15,E1:E3)', T), 2); assert.equal(calc('INDEX(B1:B3,2)', T), 8); assert.equal(calc('INDEX(A1:C3,3,3)', T), 'ok');
  assert.equal(calc('INDEX(B1:B3,MATCH("P1",A1:A3,0))', T), 3); assert.equal(calc('SUM(INDEX(A1:C3,0,2))', T), 23); assert.equal(calc('XLOOKUP("F2",A1:A3,C1:C3)', T), 'late'); assert.equal(calc('XLOOKUP("no",A1:A3,C1:C3,"-")', T), '-');
  assert.equal(calc('HLOOKUP("F2",A1:C3,1,FALSE)', { A1: 'F1', B1: 'F2' }), 'F2');
});
test('text and dates', () => {
  assert.equal(calc('LEFT("concrete",3)&"-"&RIGHT("concrete",2)&MID("concrete",4,2)'), 'con-tecr'); assert.equal(calc('LEN(B2)', D), 6); assert.equal(calc('UPPER(B1)&LOWER("X")', D), 'APPLEx');
  assert.equal(calc('TRIM("  a   b ")'), 'a b'); assert.equal(calc('CONCATENATE("a",1,"b")'), 'a1b'); assert.equal(calc('TEXTJOIN(", ",TRUE,B1:B2,A5,"x")', D), 'apple, Banana, x'); assert.equal(calc('CONCAT(B1:B2)', D), 'appleBanana');
  assert.equal(calc('SUBSTITUTE("a-b-c","-","+")'), 'a+b+c'); assert.equal(calc('SUBSTITUTE("a-b-c","-","+",2)'), 'a-b+c'); assert.equal(calc('VALUE("12.5")'), 12.5); assert.equal(calc('EXACT("a","A")'), false);
  assert.equal(calc('DATE(2026,11,20)'), 46346); assert.equal(calc('YEAR(E1)*10000+MONTH(E1)*100+DAY(E1)', D), 20261120); assert.equal(calc('WEEKDAY(E1)', D), 6, '20 Nov 2026 is a Friday');
  assert.equal(calc('EDATE(DATE(2026,1,31),1)'), calc('DATE(2026,2,28)')); assert.equal(calc('EOMONTH(E1,0)', D), calc('DATE(2026,11,30)')); assert.equal(calc('DAYS(E1,DATE(2026,11,10))', D), 10); assert.equal(calc('TODAY()'), 46336);
  assert.equal(calc('ISBLANK(A5)', D), true); assert.equal(calc('ISNUMBER(A1)', D), true); assert.equal(calc('ISTEXT(A4)', D), true); assert.equal(calc('ISERROR(1/0)'), true); assert.equal(calc('ISNA(NA())'), true);
});

test('only formulas that depend on a changed cell are "dirty"; the rest keep the value Excel saved', () => {
  // B4's saved total (999) is deliberately not what the cells add up to: untouched formulas must not be recalculated.
  const sheet = { A1: 12, A2: 8, A3: ['=SUM(A1:A2)', 20], A4: ['=A3*2', 40], B1: 1, B2: 2, B4: ['=SUM(B1:B2)', 999], C1: ['=IF(A3>25,B4,0)', 0] };
  const idle = book({ S: sheet });
  assert.deepEqual(idle('A3'), { v: 20, dirty: false, stale: false }); assert.equal(idle('B4').dirty, false);
  const edited = book({ S: sheet }, { edits: { A1: 20 } });
  assert.deepEqual(edited('A3'), { v: 28, dirty: true, stale: false }); assert.deepEqual(edited('A4'), { v: 56, dirty: true, stale: false }, 'through another formula');
  assert.equal(edited('B4').dirty, false); assert.deepEqual(edited('C1'), { v: 999, dirty: true, stale: false }, 'an untouched formula is read at its saved value');
  assert.deepEqual(book({ S: sheet }, { edits: { A1: null } })('A3'), { v: 8, dirty: true, stale: false }, 'a cleared cell');
  assert.deepEqual(book({ S: sheet }, { edits: { A1: 'n/a' } })('A4'), { v: 16, dirty: true, stale: false }, 'text in a summed range is skipped');
});
test('what it does not know is stale, never guessed, and that spreads to formulas that depend on it', () => {
  const sheet = { A1: 1, A2: ['=FANCYNEWFUNCTION(A1)', 5], A3: ['=A2+1', 6], A4: ['=AGGREGATE(9,4,B1:B2)', 3], B1: 1, B2: 2, A5: ['=[1]Other!A1+A1', 9], A6: ['=A6+1', 0], A7: ['={1,2}+A1', 2], A8: ['=A1*2', 2, 'array'], A9: ['=NoSuchName+B1', 1] };
  const idle = book({ S: sheet });
  assert.deepEqual(idle('A2'), { v: undefined, dirty: false, stale: true }); assert.deepEqual(idle('A3'), { v: 6, dirty: false, stale: false }, 'not affected: its saved inputs are used');
  const edited = book({ S: sheet }, { edits: { A1: 2 } });
  assert.deepEqual(edited('A2'), { v: undefined, dirty: true, stale: true }); assert.deepEqual(edited('A3'), { v: undefined, dirty: true, stale: true });
  assert.equal(edited('A4').dirty, false, 'unknown function, but nothing it mentions changed');
  assert.deepEqual(book({ S: sheet }, { edits: { B1: 5 } })('A4'), { v: undefined, dirty: true, stale: true });
  assert.deepEqual(edited('A5'), { v: undefined, dirty: true, stale: true }, 'cannot be read at all: assumed affected by any change');
  assert.equal(edited('A6').stale, true, 'circular'); assert.equal(edited('A7').stale, true); assert.deepEqual(edited('A8'), { v: undefined, dirty: true, stale: true }, 'array formula');
  assert.deepEqual(book({ S: sheet }, { edits: { B1: 5 } })('A9'), { v: undefined, dirty: true, stale: true });
});
test('SUBTOTAL: worked out only when no row is hidden, and it skips other subtotals', () => {
  const sheet = { A1: 10, A2: 20, A3: ['=SUBTOTAL(9,A1:A2)', 30], A4: 5, A5: ['=SUBTOTAL(109,A1:A4)', 35], A6: ['=SUBTOTAL(1,A1:A2)', 15], A7: ['=SUBTOTAL(3,A1:A4)', 3], A8: ['=SUBTOTAL(4,A1:A4)-SUBTOTAL(5,A1:A4)', 15] };
  const b = book({ S: sheet }, { edits: { A1: 11 } });
  assert.equal(b('A3').v, 31); assert.equal(b('A5').v, 36, 'the subtotal inside the range is not counted twice'); assert.equal(b('A6').v, 15.5); assert.equal(b('A7').v, 3); assert.equal(b('A8').v, 15);
  assert.deepEqual(book({ S: sheet }, { edits: { A1: 11 }, hidden: [2] })('A3'), { v: undefined, dirty: true, stale: true }, 'a hidden row: a filter may be on, so not guessed');
});
test('a formula Excel never worked out (no saved value) is worked out when another formula needs it', () => {
  const sheet = { A1: 2, A2: '=A1*10', A3: ['=A2+B1', 0], B1: 1, A4: '=MYSTERY(A1)', A5: ['=A4+B1', 0] };
  const edited = book({ S: sheet }, { edits: { B1: 5 } });
  assert.deepEqual(edited('A3'), { v: 25, dirty: true, stale: false }); assert.deepEqual(edited('A5'), { v: undefined, dirty: true, stale: true });
});
test('other sheets, defined names and tables', () => {
  const tables = [{ name: 'Items', si: 0, r1: 1, c1: 1, r2: 4, c2: 4, header: true, totals: true, cols: ['Item', 'Qty', 'Rate', 'Line total'] }];
  const sheets = { Data: { A1: 'Item', B1: 'Qty', C1: 'Rate', D1: 'Line total', A2: 'a', B2: 2, C2: 10, D2: ['=[@Qty]*[@Rate]', 20], A3: 'b', B3: 3, C3: 20, D3: ['=Items[[#This Row],[Qty]]*Items[@Rate]', 60], D4: ['=SUM(Items[Line total])', 80],
    F1: ['=SUM(Items[Qty])', 5], F2: ['=SUM(TotalQty)*2', 10], G2: ['=TotalQty*2', 4], F3: ["='Rates and notes'!A1*B2", 10], F4: ['=Hidden!A1+B2', 9], F5: ['=SUM(Items[[Qty]:[Rate]])', 35], F6: ['=Items[[#Totals],[Line total]]', 80], F7: ['=COUNTA(Items[#Headers])', 4] },
    'Rates and notes': { A1: 5 }, Hidden: { A1: 7 } };
  const b = book(sheets, { edits: { B2: 4 }, tables, names: { TotalQty: 'Data!$B$2:$B$3' } });
  assert.equal(b('D2').v, 40); assert.equal(b('D3').dirty, false); assert.equal(b('D4').v, 100, 'the total row follows'); assert.equal(b('F1').v, 7); assert.equal(b('F2').v, 14); assert.equal(b('G2').v, 8, 'a range used as one value: the cell on the same row, as Excel does');
  assert.equal(b('F3').v, 20); assert.equal(b('F4').v, 11); assert.equal(b('F5').v, 37); assert.equal(b('F6').v, 100); assert.equal(b('F7').dirty, false);
  const other = book(sheets, { edits: { 'Rates and notes!A1': 6 }, tables, names: {} });
  assert.equal(other('F3').v, 12); assert.equal(other('F1').dirty, false);
  assert.deepEqual(book(sheets, { edits: { B2: 4 }, tables: [], names: {} })('D2'), { v: undefined, dirty: true, stale: true }, 'a table it cannot find');
});
test('a long running total (3000 rows) and a whole-column sum', () => {
  const s = { A1: 1, B1: ['=A1', 1] };
  for (let r = 2; r <= 3000; r++) { s[`A${r}`] = 1; s[`B${r}`] = [`=B${r - 1}+A${r}`, r]; }
  s.C1 = ['=SUM(A:A)', 3000];
  const b = book({ S: s }, { edits: { A1: 11 } });
  for (let r = 1; r <= 3000; r++) b(`B${r}`); // top to bottom, as the page does
  assert.equal(b('B3000').v, 3010); assert.equal(b('C1').v, 3010);
});
test('the reader refuses what it does not understand', () => {
  for (const f of ['A1 B1', '{1,2}', '[1]Sheet1!A1', 'A1:', 'SUM(A1', "'[Book.xlsx]S'!A1", 'Sheet1:Sheet3!A1']) assert.throws(() => parse(f), Stale, f);
  for (const f of ['SUM($A$1:B$2)', "'My sheet'!A1+1", 'LOG10(5)', 'IF(A1,,"x")', '-A1%', "Table1[[#This Row],[Qty 's]]", '_xlfn.XLOOKUP(1,A:A,B:B)']) assert.doesNotThrow(() => parse(f), f);
});
