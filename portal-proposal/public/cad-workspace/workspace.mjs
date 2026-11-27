// Sites -> CAD workspace (calwwt.sppwork.com/cad-workspace/). The CAD tool from the old brian-cad-version2 site, as a
// part of this site: open the project's DWG drawings (and DWG / DXF files in Project files), measure, and draw markups on top.
// People whose Drawings access is "edit" can save the measurements and markups of a drawing ("notes"); each save is a new
// version with its author and time, and older versions can be opened again. The drawing files are never changed.
// Looks and works like AutoCAD (Brian, 3 Nov 2026): ribbon (Home, Annotate, Measure, View, Output), file tabs with Start,
// dark model space, floating command line with AutoCAD command names (commands.mjs), status bar with layouts, cursor
// coordinates and Ortho, docked palette (Drawings, Saved notes).
// Server: src/cad-workspace.mjs (every rule is checked there). Engine: ./engine/cad-engine.js (mlightcad + LibreDWG, built by
// scripts/build-cad-workspace.mjs from the Files CAD viewer). Everything is built with DOM calls (no HTML from data).
import { languageFor } from '/__nav/bar.mjs';
import { cad, DwgConverter, Converters, FileType, OpenMode, hostServices, sysVars, appSettings } from './engine/cad-engine.js';
import { COMMANDS, parseCommand, unknownMessage } from './commands.mjs';
import { icon } from './icons.mjs';

const W = {
  en: {
    newSketch: 'New sketch (blank sheet, not saved)', sketch: 'Sketch {n}', sketchNote: 'Sketch: a blank sheet to draw and measure on. Nothing is saved; closing the tab throws it away.', sketchLeave: 'This sketch is not saved and will be thrown away. Continue?',
    full: 'Full CAD program', openFull: 'Open in Full CAD ›', startFull: 'Full CAD program (works like AutoCAD) ›', drawings: 'Drawings', history: 'Saved notes', pick: 'Pick a drawing on the Start tab.',
    home: 'Home', annotate: 'Annotate', measureTab: 'Measure', view: 'View', output: 'Output',
    pDraw: 'Draw', pProgram: 'AutoCAD-style', pModify: 'Modify', pMeasure: 'Measure', pNavigate: 'Navigate', pAppearance: 'Appearance', pNotes: 'Notes', pMarkup: 'Markup',
    line: 'Line', pline: 'Polyline', leader: 'Leader', rect: 'Rectangle', circle: 'Circle', cloud: 'Revision cloud', text: 'Text',
    undo: 'Undo', redo: 'Redo', eraseAll: 'Erase all', finish: 'Finish (Enter)',
    distance: 'Distance', chain: 'Chain', area: 'Area', angle: 'Angle',
    extents: 'Zoom extents', pan: 'Pan', layouts: 'Layout', background: 'Background', save: 'Save', download: 'Download original', cancel: 'Cancel',
    share: 'Share with Caltex', unshare: 'Stop sharing', start: 'Start', palette: 'Palette', model: 'Model',
    cmdPlaceholder: 'Type a command', viewOnlyBadge: 'VIEW ONLY', viewAsBadge: 'VIEW AS',
    orthoTip: 'Ortho (F8): lines and measurements go only horizontal / vertical.',
    osnapTip: 'Object snap (F3): the cursor catches endpoints, midpoints, centres and more. The arrow chooses which.',
    polarTip: 'Polar tracking (F10): guides the cursor along set angles. The arrow chooses the angle.',
    dynTip: 'Dynamic input (F12): the prompt, length and angle show next to the cursor.',
    osnapMenu: 'Object snap modes', polarMenu: 'Polar angle', snapAll: 'Select all', snapNone: 'Clear all',
    snapNames: ['Endpoint', 'Midpoint', 'Center', 'Node', 'Quadrant', 'Intersection', 'Insertion', 'Perpendicular', 'Tangent', 'Nearest'],
    helpTitle: 'Commands', helpNote: 'Type a command (or its short name) and press Enter. Esc cancels; Enter on an empty line repeats the last command; F8 turns Ortho on or off. Only markups and measurements are saved, as notes; the drawing file never changes.',
    zoomPrompt: 'ZOOM [Extents]:', invalidOption: 'Invalid option "{x}".', cancelled: '*Cancel*',
    viewOnlySave: 'View only: saving needs Drawings edit access.', openFirst: 'Open a drawing first (Start tab).',
    measureNote: 'Measurements come from the drawing geometry, in drawing units, and do not replace written dimensions.',
    noteEdit: 'Markups and measurements are saved as notes on top of the drawing, for your company. The drawing file itself is never changed.',
    noteView: 'View only: you can draw and measure on the screen, but your Drawings access does not include saving. What you draw is gone when you leave.',
    noteViewAs: 'You are viewing the site as someone else: nothing here can be saved.',
    rebuild: "This sheet is a rebuild of the designer's contract PDF (Annex C), made for working use. The contract PDF governs. Check against it before building.",
    files: 'Project files', allSites: 'All sites', siteFilter: 'Site', otherFiles: 'Other folders', pdfOf: 'PDF', legacy: 'Your drawings from the old site', noted: '● notes', empty: 'No drawings to show.', listError: 'The drawing list could not be loaded.',
    opening: 'Opening {name}…', opened: 'Opened in {s} s', failed: 'This drawing could not be opened here. Use Download original.',
    notesLoaded: 'Notes version {seq} · {by} · {at}', noNotes: 'No saved notes on this drawing yet.', notesError: 'The saved notes could not be loaded.',
    keyed: '{n} texts converted from keyboard-coded Thai',
    saveTitle: 'Save notes', saveSummary: '{m} markups and {n} measurements will be saved as version {seq} of the {company} notes on {name}.',
    noteLabel: 'Note for this version (optional)', saving: 'Saving…', saved: 'Saved as version {seq}.', nothing: 'Open a drawing first.',
    notesOf: 'Notes of', version: 'Version {seq}', latest: 'newest', counts: '{m} markups · {n} measurements', show: 'Open', showing: 'Shown',
    older: 'Showing version {seq} (an older version). Saving makes a new newest version from what is on the screen.',
    otherCompany: 'These are the {company} notes: you can look at them, but only {company} can change them.',
    sharedSpp: "These are SPP's notes, shared with Caltex. Read only: only SPP can change them.", sppShared: 'SPP (shared with Caltex, read only)',
    shareTitle: 'Sharing with Caltex', shareOn: "Caltex can see SPP's notes on this drawing (always the newest version; older SPP versions stay SPP-only).", shareOff: "SPP's notes on this drawing are not shared with Caltex.",
    shareBtn: 'Share with Caltex', unshareBtn: 'Stop sharing', shareNo: 'Caltex cannot open this drawing (not shared with Caltex in Files), so its notes cannot be shared.',
    shareAsk: "Share SPP's notes on {name} with Caltex? Caltex will see the newest version (and each newer one) until you stop sharing; older versions stay SPP-only.", unshareAsk: "Stop sharing SPP's notes on {name} with Caltex?",
    shareLog: { share: 'Shared by {by} · {at}', unshare: 'Stopped by {by} · {at}' },
    noHistory: 'No saved notes yet.', pickFirst: 'Open a drawing to see its saved notes.',
    leave: 'Your notes on this drawing are not saved. Leave anyway?', clearAsk: 'Remove all measurements and markups from this view? (Nothing saved is deleted; you can still undo.)',
    close: 'Close', closeTab: 'Close {name}', openList: 'Open a drawing',
    companies: { spp: 'SPP', caltex: 'Caltex', ks: 'KS Consulting', owner: 'Land owner' },
  },
  th: {
    newSketch: 'ร่างใหม่ (แผ่นว่าง ไม่บันทึก)', sketch: 'ร่าง {n}', sketchNote: 'ร่าง: แผ่นว่างสำหรับวาดและวัด ไม่มีการบันทึก ปิดแท็บแล้วจะหายไป', sketchLeave: 'ร่างนี้ไม่ได้บันทึกและจะหายไป ต้องการทำต่อหรือไม่',
    full: 'โปรแกรม CAD เต็มรูปแบบ', openFull: 'เปิดในโปรแกรม CAD เต็มรูปแบบ ›', startFull: 'โปรแกรม CAD เต็มรูปแบบ (ใช้งานแบบ AutoCAD) ›', drawings: 'รายการแบบ', history: 'โน้ตที่บันทึกไว้', pick: 'เลือกแบบที่แท็บเริ่มต้น',
    home: 'หน้าหลัก', annotate: 'คำอธิบายประกอบ', measureTab: 'วัด', view: 'มุมมอง', output: 'ผลลัพธ์',
    pDraw: 'วาด', pProgram: 'แบบ AutoCAD', pModify: 'แก้ไข', pMeasure: 'วัด', pNavigate: 'นำทาง', pAppearance: 'การแสดงผล', pNotes: 'โน้ต', pMarkup: 'เครื่องหมาย',
    line: 'เส้น', pline: 'เส้นหลายช่วง', leader: 'เส้นชี้นำ', rect: 'สี่เหลี่ยม', circle: 'วงกลม', cloud: 'เมฆแก้ไข', text: 'ข้อความ',
    undo: 'ย้อนกลับ', redo: 'ทำซ้ำ', eraseAll: 'ลบทั้งหมด', finish: 'เสร็จ (Enter)',
    distance: 'ระยะ', chain: 'ระยะต่อเนื่อง', area: 'พื้นที่', angle: 'มุม',
    extents: 'ซูมทั้งหมด', pan: 'เลื่อน', layouts: 'เลย์เอาต์', background: 'พื้นหลัง', save: 'บันทึก', download: 'ดาวน์โหลดต้นฉบับ', cancel: 'ยกเลิก',
    share: 'แชร์ให้ Caltex', unshare: 'หยุดแชร์', start: 'เริ่มต้น', palette: 'พาเล็ต', model: 'โมเดล',
    cmdPlaceholder: 'พิมพ์คำสั่ง', viewOnlyBadge: 'ดูอย่างเดียว', viewAsBadge: 'ดูแทนผู้อื่น',
    orthoTip: 'ออร์โธ (F8): เส้นและการวัดไปได้เฉพาะแนวนอน / แนวตั้ง',
    osnapTip: 'ออบเจกต์สแนป (F3): เคอร์เซอร์จับจุดปลาย จุดกึ่งกลาง จุดศูนย์กลาง ฯลฯ ลูกศรใช้เลือกชนิดจุด',
    polarTip: 'โพลาร์แทร็กกิง (F10): นำเคอร์เซอร์ตามมุมที่กำหนด ลูกศรใช้เลือกมุม',
    dynTip: 'ไดนามิกอินพุต (F12): แสดงคำสั่ง ความยาว และมุมข้างเคอร์เซอร์',
    osnapMenu: 'ชนิดของออบเจกต์สแนป', polarMenu: 'มุมโพลาร์', snapAll: 'เลือกทั้งหมด', snapNone: 'ล้างทั้งหมด',
    snapNames: ['จุดปลาย', 'จุดกึ่งกลาง', 'จุดศูนย์กลาง', 'โหนด', 'จุดควอแดรนต์', 'จุดตัด', 'จุดแทรก', 'ตั้งฉาก', 'สัมผัส', 'ใกล้ที่สุด'],
    helpTitle: 'คำสั่ง', helpNote: 'พิมพ์คำสั่ง (หรือชื่อย่อ) แล้วกด Enter  Esc ยกเลิก  Enter บนบรรทัดว่างทำคำสั่งล่าสุดซ้ำ  F8 เปิด/ปิดออร์โธ  บันทึกเฉพาะเครื่องหมายและการวัดเป็นโน้ต ไฟล์แบบไม่ถูกแก้ไข',
    zoomPrompt: 'ZOOM [ทั้งหมด (E)]:', invalidOption: 'ตัวเลือกไม่ถูกต้อง "{x}"', cancelled: '*ยกเลิก*',
    viewOnlySave: 'ดูอย่างเดียว: การบันทึกต้องมีสิทธิ์แก้ไขหน้าแบบก่อสร้าง', openFirst: 'กรุณาเปิดแบบก่อน (แท็บเริ่มต้น)',
    measureNote: 'ค่าที่วัดได้มาจากเส้นในแบบ ตามหน่วยของแบบ ไม่ใช้แทนมิติที่เขียนไว้ในแบบ',
    noteEdit: 'การวัดและเครื่องหมายที่วาดจะบันทึกเป็นโน้ตทับบนแบบ แยกตามบริษัทของคุณ ไฟล์แบบจะไม่ถูกแก้ไข',
    noteView: 'ดูอย่างเดียว: วาดและวัดบนหน้าจอได้ แต่สิทธิ์หน้าแบบก่อสร้างของคุณไม่รวมการบันทึก สิ่งที่วาดจะหายเมื่อออกจากหน้านี้',
    noteViewAs: 'คุณกำลังดูเว็บไซต์ในมุมมองของผู้อื่น: บันทึกอะไรไม่ได้',
    rebuild: 'แผ่นนี้เขียนขึ้นใหม่จาก PDF แบบสัญญาของผู้ออกแบบ (ภาคผนวก C) เพื่อใช้ทำงาน ให้ยึด PDF แบบสัญญาเป็นหลัก และตรวจสอบกับแบบสัญญาก่อนก่อสร้าง',
    files: 'ไฟล์โครงการ', allSites: 'ทุกสถานี', siteFilter: 'สถานี', otherFiles: 'โฟลเดอร์อื่น', pdfOf: 'PDF', legacy: 'แบบของคุณจากเว็บไซต์เดิม', noted: '● มีโน้ต', empty: 'ไม่มีแบบให้แสดง', listError: 'โหลดรายการแบบไม่ได้',
    opening: 'กำลังเปิด {name}…', opened: 'เปิดแล้วใน {s} วินาที', failed: 'เปิดแบบนี้ที่นี่ไม่ได้ กรุณาใช้ดาวน์โหลดต้นฉบับ',
    notesLoaded: 'โน้ตฉบับที่ {seq} · {by} · {at}', noNotes: 'แบบนี้ยังไม่มีโน้ตที่บันทึกไว้', notesError: 'โหลดโน้ตที่บันทึกไว้ไม่ได้',
    keyed: 'แปลงข้อความที่พิมพ์ด้วยแป้นภาษาไทยผิดโหมด {n} รายการ',
    saveTitle: 'บันทึกโน้ต', saveSummary: 'จะบันทึกเครื่องหมาย {m} รายการ และการวัด {n} รายการ เป็นฉบับที่ {seq} ของโน้ต {company} บนแบบ {name}',
    noteLabel: 'หมายเหตุของฉบับนี้ (ไม่บังคับ)', saving: 'กำลังบันทึก…', saved: 'บันทึกเป็นฉบับที่ {seq} แล้ว', nothing: 'กรุณาเปิดแบบก่อน',
    notesOf: 'โน้ตของ', version: 'ฉบับที่ {seq}', latest: 'ล่าสุด', counts: 'เครื่องหมาย {m} · การวัด {n}', show: 'เปิด', showing: 'กำลังแสดง',
    older: 'กำลังแสดงฉบับที่ {seq} (ฉบับเก่า) เมื่อกดบันทึก สิ่งที่อยู่บนหน้าจอจะกลายเป็นฉบับล่าสุดใหม่',
    otherCompany: 'นี่คือโน้ตของ {company}: ดูได้ แต่แก้ไขได้เฉพาะ {company}',
    sharedSpp: 'นี่คือโน้ตของ SPP ที่แชร์ให้ Caltex: ดูได้อย่างเดียว แก้ไขได้เฉพาะ SPP', sppShared: 'SPP (แชร์ให้ Caltex ดูอย่างเดียว)',
    shareTitle: 'การแชร์ให้ Caltex', shareOn: 'Caltex เห็นโน้ตของ SPP บนแบบนี้ (เฉพาะฉบับล่าสุดเสมอ ฉบับเก่าเห็นเฉพาะ SPP)', shareOff: 'โน้ตของ SPP บนแบบนี้ยังไม่ได้แชร์ให้ Caltex',
    shareBtn: 'แชร์ให้ Caltex', unshareBtn: 'หยุดแชร์', shareNo: 'Caltex เปิดแบบนี้ไม่ได้ (ไฟล์ยังไม่ได้แชร์ให้ Caltex ในหน้าไฟล์) จึงแชร์โน้ตไม่ได้',
    shareAsk: 'แชร์โน้ตของ SPP บนแบบ {name} ให้ Caltex หรือไม่ Caltex จะเห็นเฉพาะฉบับล่าสุด (รวมฉบับใหม่ที่บันทึกต่อไป) จนกว่าจะหยุดแชร์ ฉบับเก่าเห็นเฉพาะ SPP', unshareAsk: 'หยุดแชร์โน้ตของ SPP บนแบบ {name} ให้ Caltex หรือไม่',
    shareLog: { share: 'แชร์โดย {by} · {at}', unshare: 'หยุดแชร์โดย {by} · {at}' },
    noHistory: 'ยังไม่มีโน้ตที่บันทึกไว้', pickFirst: 'เปิดแบบเพื่อดูโน้ตที่บันทึกไว้',
    leave: 'โน้ตบนแบบนี้ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่', clearAsk: 'ลบการวัดและเครื่องหมายทั้งหมดในมุมมองนี้หรือไม่ (สิ่งที่บันทึกไว้แล้วจะไม่ถูกลบ และยังกดย้อนกลับได้)',
    close: 'ปิด', closeTab: 'ปิด {name}', openList: 'เปิดแบบ',
    companies: { spp: 'SPP', caltex: 'Caltex', ks: 'KS Consulting', owner: 'เจ้าของที่ดิน' },
  },
};
let L = 'th', w = W.th;
const $ = (id) => document.getElementById(id);
const t = (key, vars = {}) => String(w[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
  return n;
}
const when = (iso) => { try { return new Date(iso).toLocaleString(L === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); } catch { return iso || ''; } };
let statusKey = 'pick', statusVars = {}, statusExtra = '';
// Status messages go to the status bar and, as in AutoCAD, into the command line history.
function setStatus(key, vars = {}, extra = '', kind = '') {
  statusKey = key; statusVars = vars; statusExtra = extra;
  const text = (key ? t(key, vars) : '') + (extra ? (key ? ' · ' : '') + extra : '');
  $('status').textContent = text; $('status').title = text;
  $('status').dataset.kind = kind;
  if (text && key !== 'pick') say(text, kind === 'bad' ? 'err' : '');
}
let lastSaid = '';
function say(text, kind = '') {
  if (!text || text === lastSaid) return;
  lastSaid = text;
  const box = $('cmdHistory');
  box.append(el('div', { class: kind || null, title: text }, text));
  while (box.childElementCount > 3) box.firstElementChild.remove();
}

async function getJSON(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts });
  if (r.status === 401) { location.href = '/sign-in.html'; throw new Error('Sign in again.'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || `HTTP ${r.status}`), { status: r.status, body });
  return body;
}

// Some project drawings were typed with a Thai keyboard set to English ("keyboard-coded Thai"): convert them for reading,
// as the Files CAD viewer does. Only text styles where most texts look keyboard-coded are changed, on the screen only.
const EN_KEYS = `1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?`;
const TH_KEYS = 'ๅ/-ภถุึคตจขชๆไำพะัีรนยบลฃฟหกดเ้่าสวงผปแอิืทมใฝ+๑๒๓๔ู฿๕๖๗๘๙๐"ฎฑธํ๊ณฯญฐ,ฅฤฆฏโฌ็๋ษศซ.()ฉฮฺ์?ฒฬฦ';
const KEYMAP = new Map([...EN_KEYS].map((c, i) => [c, [...TH_KEYS][i]]));
const toThai = (s) => [...s].map((c) => KEYMAP.get(c) ?? c).join('');
const hasThai = (s) => /[฀-๿]/.test(s);
const looksKeyed = (s) => /[a-z]{2}/.test(s) && /[[\];',]/.test(s);
const plainLatin = (s) => !/[a-z[\];']/.test(s);
function* texts(model) {
  const lists = [model?.entities];
  for (const block of model?.tables?.BLOCK_RECORD?.entries || []) lists.push(block.entities);
  for (const list of lists) for (const e of list || []) {
    if (typeof e?.text === 'string' && e.text) yield e;
    for (const a of e?.attribs || []) if (typeof a?.text === 'string' && a.text) yield a;
  }
}
function fixKeyedThai(model) {
  const styles = new Map();
  for (const e of texts(model)) {
    const k = e.styleName || '', s = styles.get(k) || { thai: 0, keyed: 0, total: 0 };
    s.total++; if (hasThai(e.text)) s.thai++; else if (looksKeyed(e.text)) s.keyed++;
    styles.set(k, s);
  }
  const keyedStyles = new Set([...styles].filter(([, s]) => s.thai === 0 && s.keyed >= 3 && s.keyed / s.total >= 0.3).map(([k]) => k));
  let changed = 0;
  for (const e of texts(model)) if (keyedStyles.has(e.styleName || '') && !plainLatin(e.text)) { e.text = toThai(e.text); changed++; }
  return changed;
}

// Engine
const WORKER = `./workers/${cad.LIBREDWG_PARSER_WORKER_FILE}`;
let keyed = 0;
class ThaiAwareDwg extends DwgConverter {
  async parse(data, options) {
    const out = await super.parse(data, options);
    try { keyed = fixKeyedThai(out.model); } catch (e) { keyed = 0; console.warn('Thai conversion skipped', e); }
    return out;
  }
}
Converters.instance.register(FileType.DWG, new ThaiAwareDwg({ convertByEntityType: false, useWorker: true, parserWorkerUrl: WORKER }));
const docs = cad.AcApDocManager.createInstance({
  container: $('stage'), autoResize: true, baseUrl: new URL('./cad-data', location.href).href,
  webworkerFileUrls: { dwgParser: WORKER, mtextRender: `./workers/${cad.MTEXT_RENDERER_WORKER_FILE}` },
});
const fontsReady = docs.loadDefaultFonts(['sarabun']).catch(() => {});
const fit = () => docs.curView?.zoomToSmartExtents?.();

// What is on the screen now: the engine's own markup and measurement lists.
function collect() {
  const view = docs.curView, name = current?.name || '';
  const store = cad.getMarkupStore();
  return {
    markups: JSON.parse(cad.stringifyMarkupSidecar({ ...store.toSidecar(), drawingName: name })),
    measurements: JSON.parse(cad.stringifyMeasurementSidecar({ version: 1, drawingName: name, measurements: cad.collectMeasurementRecords(view) })),
  };
}
const snapshot = () => { try { return JSON.stringify(collect()); } catch { return baseline; } };
const canSave = () => !!(current && notes?.canSave);
const dirty = () => canSave() && snapshot() !== baseline;

function applyNotes(saved) {
  const view = docs.curView, db = docs.curDocument?.database;
  if (!view || !db) return;
  const markups = saved?.markups ? cad.parseMarkupSidecar(JSON.stringify(saved.markups)).markups : [];
  const measurements = saved?.measurements ? cad.parseMeasurementSidecar(JSON.stringify(saved.measurements)).measurements : [];
  cad.getMarkupStore().replaceAll(markups, current.name);
  cad.getMarkupPresenter().republishAll(view);
  const ht = view.htmlTransientManager;
  ht.deselectAll?.();
  for (const g of [...ht.groupsOnLayer(cad.MEASUREMENT_LAYER)]) ht.detach(g.id);
  cad.resetMeasurementSession();
  for (const rec of measurements) cad.placeMeasurementRecord(view, db, rec);
  // Loading is not something to undo.
  cad.getMarkupHistory().clear(); cad.getMeasurementHistory().clear(); cad.getSessionUndo().clear(); cad.acapNotifyUndoStackChanged();
  view.isHtmlDirty = true;
}

let me = null, list = null, current = null, opening = 0;
let notes = null, baseline = '', layoutName = '', layoutNames = [];
let tabs = [], startShown = true;       // file tabs: opened drawings (the open one is `current`) and the Start tab
let ribbonTab = 'home', lastAction = null, pending = null, activeAction = null;
const recall = [];                       // typed commands, for arrow up / down
let recallAt = 0;

async function loadNotes({ company, seq, apply = true } = {}) {
  if (!current) return;
  const q = new URLSearchParams();
  if (company) q.set('company', company);
  if (seq) q.set('seq', String(seq));
  try {
    const qs = q.toString();
    notes = await getJSON(`/api/cad/notes/${current.sha256}${qs ? '?' + qs : ''}`);
  } catch (e) {
    notes = null; setStatus('notesError', {}, e.message, 'bad'); renderHistory(); renderNote(); renderRibbon(); return;
  }
  if (apply) applyNotes(notes.current);
  baseline = snapshot();
  const c = notes.current;
  if (apply) setStatus(c ? 'notesLoaded' : 'noNotes', c ? { seq: c.seq, by: c.by, at: when(c.at) } : {}, keyed ? t('keyed', { n: keyed }) : '');
  renderHistory(); renderNote(); renderRibbon();
}

// Model space colour: AutoCAD's dark grey (#212830) or white; kept on this device.
const BG_KEY = 'cad.workspace.background';
let darkModel = true;
try { darkModel = localStorage.getItem(BG_KEY) !== 'light'; } catch { /* storage blocked */ }
function applyBackground() {
  const db = docs.curDocument?.database;
  if (!db) return;
  try {
    const vars = sysVars.instance(), color = cad.toggleBlackWhiteBackgroundColor(vars.getVar('MODELBKCOLOR', db));
    if (darkModel) color.setRGB(33, 40, 48); else color.setRGB(255, 255, 255);
    vars.setVar('MODELBKCOLOR', color, db);
  } catch (e) { console.warn('Background not set', e); }
  $('stage').style.background = darkModel ? '#212830' : '#ffffff';
}
// Drafting aids on the status bar, as in AutoCAD (Brian, 3 Nov 2026): OSNAP (F3), ORTHO (F8), POLAR (F10), DYN (F12).
// The engine does the work: object snap modes are a bit mask in AutoCAD's OSMODE order (1 Endpoint, 2 Midpoint, 4 Center,
// 8 Node, 16 Quadrant, 32 Intersection, 64 Insertion, 128 Perpendicular, 256 Tangent, 512 Nearest); polar tracking is
// POLARMODE bit 2 with POLARANG degrees; dynamic input is DYNMODE. ORTHO and POLAR exclude each other, as in AutoCAD.
// The choice is remembered on this device only (it is a personal setting, like AutoCAD's).
const AIDS_KEY = 'calwwt-cad-aids';
const SNAP_BITS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const POLAR_ANGLES = [90, 45, 30, 22.5, 18, 15, 10, 5];
const aids = { osnap: true, snaps: 1 | 2 | 4 | 16 | 32 | 512, ortho: false, polar: false, polarAngle: 45, dyn: true };
try { Object.assign(aids, JSON.parse(localStorage.getItem(AIDS_KEY) || '{}')); } catch { /* defaults */ }
let ortho = aids.ortho;
function applyAids() {
  aids.ortho = ortho;
  try { localStorage.setItem(AIDS_KEY, JSON.stringify(aids)); } catch { /* not kept */ }
  try { appSettings.instance.osnapModes = aids.osnap ? aids.snaps : 0; } catch (e) { console.warn('Object snap not set', e); }
  const db = docs.curDocument?.database;
  if (db) {
    const vars = sysVars.instance();
    const set = (name, value) => { try { vars.setVar(name, value, db); } catch (e) { console.warn(`${name} not set`, e); } };
    set('ORTHOMODE', ortho ? 1 : 0);
    set('POLARANG', aids.polarAngle); set('POLARMODE', aids.polar ? 2 : 0); set('DYNMODE', aids.dyn ? 3 : 0);
  }
  for (const [id, on] of [['ortho', ortho], ['osnap', aids.osnap], ['polar', aids.polar], ['dyn', aids.dyn]]) $(id).setAttribute('aria-pressed', String(on));
  $('polar').textContent = `POLAR ${aids.polarAngle}°`;
}
const applyOrtho = applyAids;
function toggleAid(name) {
  if (name === 'ortho') { ortho = !ortho; if (ortho) aids.polar = false; } else aids[name] = !aids[name];
  if (name === 'polar' && aids.polar) ortho = false;
  if (name === 'osnap' && aids.osnap && !aids.snaps) aids.snaps = 1 | 2 | 4 | 32;
  applyAids();
  const on = name === 'ortho' ? ortho : aids[name];
  const label = { osnap: 'Osnap', ortho: 'Ortho', polar: 'Polar', dyn: 'Dynamic input' }[name];
  say(`<${label} ${on ? 'on' : 'off'}>`);
}
function aidMenu(kind, anchor) {
  const box = $('aidMenu');
  if (!box.hidden && box.dataset.kind === kind) { box.hidden = true; return; }
  box.dataset.kind = kind;
  const item = (text, checked, onclick) => el('button', { type: 'button', role: 'menuitemcheckbox', 'aria-checked': String(checked), onclick }, el('span', { class: 'ac-check', 'aria-hidden': 'true' }, checked ? '✓' : ''), text);
  const redraw = () => { box.dataset.kind = ''; box.hidden = true; aidMenu(kind, anchor); };
  if (kind === 'osnap') {
    box.replaceChildren(el('div', { class: 'ac-menu-title' }, t('osnapMenu')),
      ...SNAP_BITS.map((bit, i) => item((w.snapNames || W.en.snapNames)[i], (aids.snaps & bit) !== 0, () => { aids.snaps ^= bit; aids.osnap = aids.snaps !== 0; applyAids(); redraw(); })),
      el('div', { class: 'ac-menu-row' },
        el('button', { type: 'button', onclick: () => { aids.snaps = SNAP_BITS.reduce((a, b) => a | b, 0); aids.osnap = true; applyAids(); redraw(); } }, t('snapAll')),
        el('button', { type: 'button', onclick: () => { aids.snaps = 0; aids.osnap = false; applyAids(); redraw(); } }, t('snapNone'))));
  } else {
    box.replaceChildren(el('div', { class: 'ac-menu-title' }, t('polarMenu')),
      ...POLAR_ANGLES.map((a) => item(`${a}°`, aids.polar && aids.polarAngle === a, () => { aids.polarAngle = a; aids.polar = true; ortho = false; applyAids(); box.hidden = true; })));
  }
  box.hidden = false;
  const r = anchor.getBoundingClientRect();
  box.style.left = `${Math.max(4, Math.min(innerWidth - box.offsetWidth - 4, r.right - box.offsetWidth))}px`;
  box.style.bottom = `${innerHeight - r.top + 4}px`;
}

// Sketch (Brian, 3 Nov 2026): the "+" file tab opens a blank sheet for a quick drawing or measurement that is thrown
// away. It is never saved (no notes, no sharing, no download); closing its tab discards it without asking. Moving to
// another tab asks first if something is drawn on it, since the sheet is reopened blank.
let sketchNo = 0;
const BLANK_SHEET = '/cad-workspace/full/blank.dxf';
function newSketch() {
  sketchNo += 1;
  open({ scratch: true, sha256: `sketch-${sketchNo}`, name: t('sketch', { n: sketchNo }), file: BLANK_SHEET });
}
const sketchHasWork = () => {
  if (!current?.scratch || startShown) return false;
  try { const c = collect(); return c.markups.markups.length + c.measurements.measurements.length > 0; } catch { return false; }
};
async function open(item, { company, seq } = {}) {
  if (dirty() && !confirm(t('leave'))) return;
  if (item !== current && sketchHasWork() && !confirm(t('sketchLeave'))) return;
  if (current?.scratch && item !== current) tabs = tabs.filter((x) => x !== current); // a sketch left behind is gone
  const token = ++opening;
  current = item; notes = null; baseline = ''; layoutName = ''; layoutNames = [];
  if (!tabs.some((x) => x.sha256 === item.sha256)) tabs.push(item);
  if (tabs.length > 8) tabs = tabs.filter((x) => x === item || x !== tabs[0]);
  showStart(false);
  document.body.classList.remove('side-open');
  renderTabs(); renderList(); renderHistory(); renderNote(); renderLayouts(); renderRibbon();
  const started = performance.now();
  setStatus('opening', { name: label(item) });
  try {
    await fontsReady;
    const r = await fetch(item.file, { credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/sign-in.html'; return; }
    if (!r.ok) throw new Error(`download ${r.status}`);
    const bytes = await r.arrayBuffer();
    if (token !== opening) return;
    keyed = 0;
    const ok = await docs.openDocument(item.name, bytes, { mode: OpenMode.Write ?? 8 });
    if (token !== opening) return;
    if (!ok) { setStatus('failed', {}, '', 'bad'); return; }
    applyBackground(); applyOrtho();
    renderLayouts(); await fit();
    setStatus('opened', { s: ((performance.now() - started) / 1000).toFixed(1) }, keyed ? t('keyed', { n: keyed }) : '');
    if (item.scratch) {
      applyNotes(null); // a clean sheet: nothing from the previous drawing
      setStatus('opened', { s: ((performance.now() - started) / 1000).toFixed(1) }, t('sketchNote'));
      say(t('sketchNote'));
      const u = new URL(location.href); u.searchParams.delete('dwg'); history.replaceState(null, '', u);
      renderRibbon(); return;
    }
    say(t('measureNote'));
    if (list?.canSave && !me?.viewAs) say(t('noteEdit'));
    const u = new URL(location.href); u.searchParams.set('dwg', item.catalogId || item.sha256); history.replaceState(null, '', u);
    await loadNotes({ company, seq });
  } catch (e) {
    console.warn('Drawing not opened', e);
    if (token === opening) setStatus('failed', {}, String(e?.message || e).slice(0, 80), 'bad');
  }
}

const label = (item) => (item.number || item.title ? [item.number, L === 'en' && item.title_en || item.title].filter(Boolean).join(' · ') : item.name);

// Model / layout tabs (status bar) and the View > Navigate layout list.
function renderLayouts() {
  const box = $('layouts');
  box.replaceChildren();
  layoutNames = [];
  if (current && docs.curDocument) {
    try {
      const all = [...docs.curDocument.database.objects.layout.newIterator()];
      all.sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0));
      layoutNames = all.map((x) => x.layoutName).filter(Boolean);
    } catch (e) { console.warn('Layouts not listed', e); }
  }
  if (!layoutName || !layoutNames.includes(layoutName)) layoutName = layoutNames.find((n) => /^model$/i.test(n)) || layoutNames[0] || '';
  const show = (n) => (/^model$/i.test(n) ? t('model') : n);
  for (const n of layoutNames) box.append(el('button', { type: 'button', role: 'tab', 'aria-selected': String(n === layoutName), onclick: () => setLayout(n) }, show(n)));
  if (!layoutNames.length) box.append(el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', disabled: true }, t('model')));
}
async function setLayout(n) {
  try { if (hostServices().layoutManager.setCurrentLayout(n, docs.curDocument.database)) { layoutName = n; renderLayouts(); renderRibbon(); await fit(); } } catch (e) { console.warn('Layout not shown', e); }
}

function itemButton(item) {
  const pressed = current && item.sha256 === current.sha256;
  const companies = list?.noted?.[item.sha256] || [];
  const small = [L === 'en' && item.title_en ? item.title : item.title_en, item.note, item.folder && (L === 'th' ? item.folder_th : item.folder),
    item.bytes ? `${(item.bytes / 1e6).toFixed(1)} MB` : ''].filter(Boolean).join(' · ');
  return el('button', { type: 'button', 'aria-pressed': String(!!pressed), onclick: () => open(item) },
    item.number ? el('b', {}, item.number) : null, (L === 'en' && item.title_en) || item.title || item.name,
    el('small', {}, small, companies.length ? el('span', { class: 'noted' }, ` ${t('noted')}`) : null));
}
const fullUrl = (item) => `/cad-workspace/full/${item ? `?dwg=${encodeURIComponent(item.catalogId || item.sha256)}` : ''}`;
function itemCard(item) {
  // The PDF of the same drawing (same Files folder, same name), when there is one (Brian, 27 Nov 2026: PDF | CAD).
  return el('div', { class: 'ac-card' }, itemButton(item), el('a', { class: 'ac-fullcad', href: fullUrl(item) }, t('openFull')),
    item.pdf ? el('a', { class: 'ac-fullcad', href: item.pdf }, `${t('pdfOf')} ›`) : null);
}
// calwwt (Brian, 27 Nov 2026): drawings by site. ?site=<code> (from a site page) or the picker shows one site's drawings.
let siteFilter = new URL(location.href).searchParams.get('site') || '', siteNames = {};
fetch('/sites/data/sites.json', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
  for (const x of d?.sites || []) siteNames[x.code] = x.name || {};
  renderList();
}).catch(() => {});
const siteLabel = (code) => (code ? `${code} ${siteNames[code]?.[L] || siteNames[code]?.en || ''}`.trim() : t('otherFiles'));
// The drawing list: in the Start tab and in the palette.
function renderList() {
  for (const box of [$('list'), $('startList')]) {
    box.replaceChildren();
    if (!list) continue;
    if (list.error) { box.append(el('p', {}, t('listError'))); continue; }
    // On the Start tab each drawing also offers the full CAD program (Brian, 3 Nov 2026).
    const entry = box.id === 'startList' ? itemCard : itemButton;
    for (const g of list.groups) {
      if (!g.sheets.length) continue;
      box.append(el('h2', {}, L === 'th' && g.name_th || g.name));
      for (const s of g.sheets) box.append(entry({ ...s, catalogId: s.id, rebuild: g.rebuild }));
    }
    if (list.files.length) {
      const codes = [...new Set(list.files.map((f) => f.site || ''))].sort((a, b) => (a || '9999').localeCompare(b || '9999'));
      if (codes.length > 1 || siteFilter) {
        const pick = el('select', { 'aria-label': t('siteFilter'), class: 'ac-sitepick' });
        pick.append(el('option', { value: '' }, t('allSites')));
        for (const c of codes) pick.append(el('option', { value: c || '-' }, siteLabel(c)));
        pick.value = siteFilter && codes.includes(siteFilter === '-' ? '' : siteFilter) ? siteFilter : '';
        pick.onchange = () => { siteFilter = pick.value; renderList(); };
        box.append(pick);
      }
      for (const c of codes) {
        if (siteFilter && (siteFilter === '-' ? '' : siteFilter) !== c) continue;
        box.append(el('h2', {}, codes.length > 1 || c ? siteLabel(c) : t('files')));
        for (const f of list.files.filter((x) => (x.site || '') === c)) box.append(entry(f));
      }
    }
    if (list.legacy.length) {
      box.append(el('h2', {}, t('legacy')));
      for (const f of list.legacy) box.append(entry({ ...f, title: f.title || f.name }));
    }
    if (!box.childElementCount) box.append(el('p', {}, t('empty')));
  }
}

// File tabs: Start, one tab per opened drawing (the open one is shown; another one is opened again when picked), "+".
function renderTabs() {
  const box = $('fileTabs');
  box.replaceChildren();
  box.append(el('div', { class: 'ac-filetab start', role: 'presentation', 'aria-selected': String(startShown) },
    el('button', { type: 'button', class: 'ac-tabname', role: 'tab', 'aria-selected': String(startShown), onclick: () => showStart(true) }, icon('start', 14), el('span', {}, t('start')))));
  for (const item of tabs) {
    const active = !startShown && current && item.sha256 === current.sha256;
    const unsaved = active && dirty();
    box.append(el('div', { class: 'ac-filetab', role: 'presentation', 'aria-selected': String(!!active), title: label(item) },
      el('button', { type: 'button', class: 'ac-tabname', role: 'tab', 'aria-selected': String(!!active), onclick: () => (active ? null : current && item.sha256 === current.sha256 ? showStart(false) : open(item)) },
        unsaved ? el('i', { class: 'ac-dot', 'aria-hidden': 'true' }) : null, el('span', {}, item.name || label(item))),
      el('button', { type: 'button', class: 'ac-tabx', 'aria-label': t('closeTab', { name: item.name || label(item) }), onclick: () => closeTab(item) }, '×')));
  }
  box.append(el('div', { class: 'ac-filetab plus', role: 'presentation' },
    el('button', { type: 'button', class: 'ac-tabname', 'aria-label': t('newSketch'), title: t('newSketch'), onclick: () => newSketch() }, icon('plus', 14))));
}
function closeTab(item) {
  const isCurrent = current && item.sha256 === current.sha256;
  if (isCurrent && dirty() && !confirm(t('leave'))) return;
  tabs = tabs.filter((x) => x.sha256 !== item.sha256);
  if (!isCurrent) { renderTabs(); return; }
  baseline = snapshot(); // nothing unsaved is kept for a closed tab
  const next = tabs.at(-1);
  if (next) { current = null; open(next); return; }
  current = null; notes = null;
  showStart(true); renderHistory(); renderNote(); renderLayouts(); renderRibbon();
}
function showStart(on) {
  startShown = on && true;
  if (!current) startShown = true;
  $('startPage').hidden = !startShown;
  $('model').hidden = startShown;
  if (!startShown) requestAnimationFrame(() => { try { docs.curView?.resize?.(); } catch { /* engine resizes itself */ } });
  renderTabs(); renderRibbon();
}

function renderHistory() {
  const box = $('history');
  box.replaceChildren();
  if (!current) { box.append(el('p', {}, t('pickFirst'))); return; }
  if (!notes) return;
  const name = (c) => w.companies[c] || c;
  if (notes.layers.length > 1) {
    const select = el('select', { onchange: () => { if (dirty() && !confirm(t('leave'))) { select.value = notes.company; return; } loadNotes({ company: select.value }); } },
      notes.layers.map((l) => el('option', { value: l.company }, `${l.sharedWithYou ? t('sppShared') : name(l.company)}${l.latest ? '' : ' (–)'}`)));
    select.value = notes.company;
    box.append(el('label', {}, t('notesOf'), select));
  } else box.append(el('h2', {}, `${t('notesOf')} ${name(notes.company)}`));
  renderSharing(box);
  if (!notes.history.length) { box.append(el('p', {}, t('noHistory'))); return; }
  const shown = notes.current?.seq;
  box.append(el('ol', {}, notes.history.map((v) => el('li', { 'aria-current': String(v.seq === shown) },
    el('div', {}, el('strong', {}, t('version', { seq: v.seq }), v.seq === notes.latest ? ` (${t('latest')})` : ''),
      el('small', {}, `${v.by} · ${when(v.at)}`), v.note ? el('small', {}, v.note) : null, el('small', {}, t('counts', { m: v.markups, n: v.measurements }))),
    v.seq === shown ? el('small', {}, t('showing')) : el('button', { type: 'button', onclick: () => { if (dirty() && !confirm(t('leave'))) return; loadNotes({ company: notes.company, seq: v.seq }); } }, t('show'))))));
}

// SPP: share this drawing's SPP notes with Caltex, or stop (the server checks who may and logs every change).
const sharing = () => (notes?.sharing && notes.own === 'spp' ? notes.sharing : null);
async function toggleShare() {
  const sh = sharing();
  if (!sh?.canChange || (!sh.shared && !sh.caltexCanOpen)) return;
  if (!confirm(t(sh.shared ? 'unshareAsk' : 'shareAsk', { name: label(current) }))) return;
  try {
    await getJSON(`/api/cad/share/${current.sha256}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cad' }, body: JSON.stringify({ shared: !sh.shared }) });
    await loadNotes({ company: notes.company, seq: notes.current && notes.current.seq !== notes.latest ? notes.current.seq : undefined, apply: false });
    say(sharing()?.shared ? t('shareOn') : t('shareOff'));
  } catch (e) { setStatus('', {}, e.message, 'bad'); }
}
function renderSharing(box) {
  const sh = sharing();
  if (!sh) return;
  const section = el('div', { class: 'ac-share' }, el('h2', {}, t('shareTitle')), el('p', {}, sh.shared ? t('shareOn') : t('shareOff')));
  if (sh.canChange) {
    const blocked = !sh.shared && !sh.caltexCanOpen;
    section.append(el('button', { type: 'button', disabled: blocked, onclick: toggleShare }, sh.shared ? t('unshareBtn') : t('shareBtn')));
    if (blocked) section.append(el('small', {}, t('shareNo')));
  }
  for (const e of sh.log.slice(0, 5)) section.append(el('small', {}, (w.shareLog[e.action] || '').replace('{by}', e.by).replace('{at}', when(e.at))));
  box.append(section);
}

// Slim message strip and status-bar badge (view only, view-as, rebuild sheet, older version, another company's notes).
function renderNote() {
  const viewAs = !!me?.viewAs, edit = list?.canSave && !viewAs;
  const lines = [];
  if (viewAs) lines.push([t('noteViewAs'), 'warn']); else if (list && !edit) lines.push([t('noteView'), '']);
  if (current?.rebuild && !startShown) lines.push([t('rebuild'), 'warn']);
  const older = notes?.current && notes.current.seq !== notes.latest;
  const other = notes && notes.own && notes.company !== notes.own;
  const sharedSpp = other && notes.own === 'caltex' && notes.company === 'spp';
  if (sharedSpp) lines.push([t('sharedSpp'), '']); else if (other) lines.push([t('otherCompany', { company: w.companies[notes.company] || notes.company }), '']);
  else if (older) lines.push([t('older', { seq: notes.current.seq }), '']);
  const box = $('msg');
  box.replaceChildren(...lines.map(([text, kind]) => el('p', { class: kind || null }, text)));
  box.hidden = !lines.length;
  $('badge').hidden = !list || edit;
  $('badge').textContent = viewAs ? t('viewAsBadge') : t('viewOnlyBadge');
  $('badge').title = viewAs ? t('noteViewAs') : t('noteView');
}

function showSide(which) {
  $('tabList').setAttribute('aria-selected', String(which === 'list'));
  $('tabHistory').setAttribute('aria-selected', String(which === 'history'));
  $('list').hidden = which !== 'list'; $('history').hidden = which !== 'history';
  $('paletteTitle').textContent = which === 'list' ? t('drawings') : t('history');
}
const phone = () => matchMedia('(max-width:760px)').matches;
function setPalette(openIt, which) {
  if (which) showSide(which);
  if (phone()) document.body.classList.toggle('side-open', openIt);
  else $('side').hidden = !openIt;
  $('paletteToggle').setAttribute('aria-pressed', String(openIt));
  requestAnimationFrame(() => { try { docs.curView?.resize?.(); } catch { /* engine resizes itself */ } });
}
const paletteOpen = () => (phone() ? document.body.classList.contains('side-open') : !$('side').hidden);

async function save(note) {
  if (!canSave()) return;
  const body = { base: notes.latest, note, ...collect() };
  setStatus('saving');
  try {
    const r = await getJSON(`/api/cad/notes/${current.sha256}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cad' }, body: JSON.stringify(body) });
    await loadNotes({ apply: false });
    setStatus('saved', { seq: r.seq });
    (list.noted[current.sha256] ||= []).includes(notes.own) || list.noted[current.sha256].push(notes.own);
    renderList(); renderTabs();
  } catch (e) { setStatus('', {}, e.message, 'bad'); }
}
function openSave() {
  if (!current || startShown) { say(t('openFirst'), 'err'); return; }
  if (!canSave()) { say(t('viewOnlySave'), 'err'); return; }
  const c = collect();
  $('saveSummary').textContent = t('saveSummary', { m: c.markups.markups.length, n: c.measurements.measurements.length, seq: notes.latest + 1, company: w.companies[notes.own] || notes.own, name: label(current) });
  $('saveNote').value = '';
  $('saveDialog').showModal();
}

// ---- Actions (ribbon buttons and typed commands) ----
// LINE and PLINE both run the engine's line markup, which keeps going click after click (built in by
// scripts/build-cad-workspace.mjs); each segment is its own line markup.
const ENGINE = { line: 'markupline', pline: 'markupline', leader: 'markuparrow', rect: 'markuprect', circle: 'markupcircle', cloud: 'markupcloud', text: 'markuptext',
  distance: 'measuredistance', chain: 'measurecontinuous', area: 'measurearea', angle: 'measureangle', pan: 'pan', undo: 'undo', redo: 'redo' };
const engineInput = () => document.querySelector('#stage .ml-cli-text');
const enginePrompt = () => (document.querySelector('#stage .ml-cli-prompt')?.textContent || '').trim();
function key(target, name) {
  for (const type of ['keydown', 'keyup']) target.dispatchEvent(new KeyboardEvent(type, { key: name, code: name, keyCode: name === 'Enter' ? 13 : 27, which: name === 'Enter' ? 13 : 27, bubbles: true, cancelable: true }));
}
function cancelEngine() {
  if (!enginePrompt()) return;
  const cli = engineInput();
  if (cli) key(cli, 'Escape');
  key(document, 'Escape');
}
// Finish = Enter in the engine's command line (ends a chain, area or text the way Enter on a keyboard does).
function finish() {
  const confirmOnPhone = document.querySelector('.ml-mobile-cmd-confirm'); // phones: the engine's own ✓ does the same
  if (confirmOnPhone && confirmOnPhone.offsetParent !== null) { confirmOnPhone.click(); return; }
  const cli = engineInput();
  if (cli) { cli.value = ''; key(cli, 'Enter'); return; }
  key(document.querySelector('#stage canvas') || document, 'Enter'); key(document, 'Enter');
}
function eraseAll() {
  const view = docs.curView;
  if (!view || !confirm(t('clearAsk'))) return;
  cad.clearLayoutMeasurements(view);
  cad.getMarkupPresenter().clearLayout(view, view.activeLayoutBtrId, { clearStore: true });
}
const needsDrawing = new Set([...Object.keys(ENGINE), 'extents', 'eraseAll', 'finish', 'save', 'download', 'background', 'share', 'history']);
function run(action, typed = '') {
  const def = COMMANDS.find((c) => c.action === action);
  if (typed || def) say(`${L === 'th' ? 'คำสั่ง' : 'Command'}: ${typed || def?.names[0] || action}`, 'cmd');
  if (action === 'help') { toggleHelp(true); return; }
  if (needsDrawing.has(action) && (!current || startShown)) { say(t('openFirst'), 'err'); return; }
  if (ENGINE[action]) {
    cancelEngine();
    lastAction = action;
    if (!['undo', 'redo'].includes(action)) activeAction = action;
    docs.sendStringToExecute(ENGINE[action]);
    renderRibbon();
    return;
  }
  if (action !== 'zoom') lastAction = action;
  if (action === 'extents') { cancelEngine(); fit(); return; }
  if (action === 'eraseAll') { cancelEngine(); eraseAll(); return; }
  if (action === 'finish') { finish(); return; }
  if (action === 'save') { openSave(); return; }
  if (action === 'history') { setPalette(!(paletteOpen() && !$('history').hidden), 'history'); return; }
  if (action === 'share') { toggleShare(); return; }
  if (action === 'download') { const a = el('a', { href: current.file, download: current.name }); document.body.append(a); a.click(); a.remove(); return; }
  // Full CAD program: the open drawing, or a new blank drawing when none is open (Start tab).
  if (action === 'full') { if (sketchHasWork() && !confirm(t('sketchLeave'))) return; location.href = fullUrl(!startShown && current && !current.scratch ? current : null); return; }
  if (action === 'background') { darkModel = !darkModel; try { localStorage.setItem(BG_KEY, darkModel ? 'dark' : 'light'); } catch { /* ignore */ } applyBackground(); renderRibbon(); return; }
}

// ---- Ribbon ----
// [tab, [[panel title, [[action, icon, label key, size 'big' | 'small']]]]]
const RIBBON = [
  ['home', [
    ['pDraw', [['line', 'line', 'line', 'big'], ['pline', 'pline', 'pline', 'big'], ['text', 'text', 'text', 'big'], ['rect', 'rect', 'rect', 'small'], ['circle', 'circle', 'circle', 'small'], ['cloud', 'cloud', 'cloud', 'small']]],
    ['pModify', [['eraseAll', 'erase', 'eraseAll', 'big'], ['undo', 'undo', 'undo', 'small'], ['redo', 'redo', 'redo', 'small'], ['finish', 'finish', 'finish', 'small']]],
    ['pMeasure', [['distance', 'distance', 'distance', 'big'], ['chain', 'chain', 'chain', 'small'], ['area', 'area', 'area', 'small'], ['angle', 'angle', 'angle', 'small']]],
    ['pNotes', [['save', 'save', 'save', 'big'], ['history', 'history', 'history', 'big']]],
    ['pProgram', [['full', 'program', 'full', 'big']]],
  ]],
  ['annotate', [
    ['pMarkup', [['text', 'text', 'text', 'big'], ['leader', 'leader', 'leader', 'big'], ['cloud', 'cloud', 'cloud', 'big'], ['rect', 'rect', 'rect', 'small'], ['circle', 'circle', 'circle', 'small']]],
    ['pModify', [['eraseAll', 'erase', 'eraseAll', 'big'], ['undo', 'undo', 'undo', 'small'], ['redo', 'redo', 'redo', 'small'], ['finish', 'finish', 'finish', 'small']]],
  ]],
  ['measureTab', [
    ['pMeasure', [['distance', 'distance', 'distance', 'big'], ['chain', 'chain', 'chain', 'big'], ['area', 'area', 'area', 'big'], ['angle', 'angle', 'angle', 'big']]],
    ['pModify', [['eraseAll', 'erase', 'eraseAll', 'big'], ['undo', 'undo', 'undo', 'small'], ['redo', 'redo', 'redo', 'small'], ['finish', 'finish', 'finish', 'small']]],
  ]],
  ['view', [
    ['pNavigate', [['extents', 'extents', 'extents', 'big'], ['pan', 'pan', 'pan', 'big'], ['layouts', 'layouts', 'layouts', 'layout']]],
    ['pAppearance', [['background', 'background', 'background', 'big']]],
  ]],
  ['output', [
    ['pNotes', [['save', 'save', 'save', 'big'], ['history', 'history', 'history', 'big'], ['share', 'share', 'share', 'big'], ['download', 'download', 'download', 'big'], ['full', 'program', 'full', 'big'], ['background', 'background', 'background', 'small']]],
  ]],
];
function toolState(action) {
  const open = !!current && !startShown;
  if (needsDrawing.has(action) && !open) return { disabled: true };
  if (open && current.scratch && ['save', 'share', 'download', 'history'].includes(action)) return { disabled: true, title: t('sketchNote') };
  if (action === 'save') return canSave() ? {} : { disabled: true, title: notes ? t('viewOnlySave') : '' };
  if (action === 'share') {
    const sh = sharing();
    if (!sh) return { disabled: true, hidden: !notes || notes.own !== 'spp' };
    if (!sh.canChange) return { disabled: true, title: t('viewOnlySave') };
    if (!sh.shared && !sh.caltexCanOpen) return { disabled: true, title: t('shareNo') };
    return { pressed: sh.shared, label: sh.shared ? t('unshare') : t('share') };
  }
  if (action === 'history') return { pressed: paletteOpen() && !$('history').hidden };
  if (action === 'background') return { pressed: !darkModel };
  if (ENGINE[action] && !['undo', 'redo', 'pan'].includes(action)) return { pressed: activeAction === action && !!enginePrompt() };
  return {};
}
function renderRibbon() {
  const tabsBox = $('ribbonTabs'), box = $('ribbon');
  tabsBox.replaceChildren(...RIBBON.map(([id]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === ribbonTab), onclick: () => { ribbonTab = id; renderRibbon(); } }, t(id))));
  const [, panels] = RIBBON.find(([id]) => id === ribbonTab);
  box.replaceChildren();
  for (const [title, tools] of panels) {
    const body = el('div', { class: 'ac-panel-body' });
    let col = null;
    for (const [action, ic, labelKey, size] of tools) {
      if (size === 'layout') {
        const select = el('select', { 'aria-label': t('layouts'), disabled: !current || startShown || layoutNames.length < 2, onchange: () => setLayout(select.value) },
          (layoutNames.length ? layoutNames : ['Model']).map((n) => el('option', { value: n }, /^model$/i.test(n) ? t('model') : n)));
        select.value = layoutName || 'Model';
        body.append(el('label', { class: 'ac-layoutpick' }, el('span', {}, t('layouts')), select));
        col = null; continue;
      }
      const st = toolState(action);
      if (st.hidden) continue;
      const text = st.label || t(labelKey);
      const btn = el('button', { type: 'button', class: size === 'big' ? 'ac-big' : 'ac-small', title: st.title || text, 'aria-label': text,
        disabled: !!st.disabled, 'aria-pressed': st.pressed == null ? null : String(!!st.pressed), onclick: () => run(action) },
      icon(ic, size === 'big' ? 32 : 16), el('span', {}, text));
      if (size === 'big') { body.append(btn); col = null; } else {
        if (!col || col.childElementCount >= 3) { col = el('div', { class: 'ac-smallcol' }); body.append(col); }
        col.append(btn);
      }
    }
    box.append(el('div', { class: 'ac-panel', role: 'group', 'aria-label': t(title) }, body, el('div', { class: 'ac-panel-title' }, t(title))));
  }
}

// ---- Command line ----
function syncPrompt() {
  const p = enginePrompt();
  $('cmdPrompt').textContent = pending === 'zoom' ? t('zoomPrompt') : p;
  $('cmdInput').placeholder = p || pending ? '' : t('cmdPlaceholder');
  if (!p && activeAction) activeAction = null;
  // The ribbon shows the running tool pressed, as AutoCAD does.
  const pressed = activeAction && p ? activeAction : null;
  if (pressed !== shownPressed) { shownPressed = pressed; renderRibbon(); }
}
let shownPressed = null;
function submitCommand() {
  const input = $('cmdInput'), text = input.value.trim();
  input.value = '';
  if (text) { recall.push(text); recallAt = recall.length; }
  const p = enginePrompt();
  if (p && !pending) {
    // A command of the engine asks for something (a point, a number, text): pass the answer on, as typed.
    say(`${p} ${text}`.trim());
    const cli = engineInput();
    if (cli) { cli.value = text; key(cli, 'Enter'); }
    return;
  }
  const r = parseCommand(text, pending);
  if (r.pending) { pending = r.pending; say(`${L === 'th' ? 'คำสั่ง' : 'Command'}: ${text.toUpperCase()}`, 'cmd'); syncPrompt(); return; }
  const wasPending = pending; pending = null; syncPrompt();
  if (r.cancel) { say(t('cancelled')); return; }
  if (r.invalidOption) { say(t('invalidOption', { x: r.invalidOption }), 'err'); return; }
  if (r.unknown) { say(unknownMessage(r.unknown, L), 'err'); return; }
  if (r.repeat) { if (lastAction) run(lastAction); return; }
  run(r.action, wasPending ? `ZOOM ${text.toUpperCase()}` : text.toUpperCase());
}
function toggleHelp(force) {
  const box = $('help');
  const show = force ?? box.hidden;
  if (show) {
    box.replaceChildren(el('h2', {}, t('helpTitle')),
      el('table', {}, el('tbody', {}, COMMANDS.map((c) => el('tr', {}, el('td', {}, c.names.slice(0, 3).join(', ')), el('td', {}, L === 'th' ? c.th : c.en))),
        el('tr', {}, el('td', {}, 'Esc'), el('td', {}, t('cancelled'))), el('tr', {}, el('td', {}, 'F3'), el('td', {}, t('osnapTip'))), el('tr', {}, el('td', {}, 'F8'), el('td', {}, t('orthoTip'))), el('tr', {}, el('td', {}, 'F10'), el('td', {}, t('polarTip'))), el('tr', {}, el('td', {}, 'F12'), el('td', {}, t('dynTip'))))),
      el('p', {}, t('helpNote')), el('p', {}, t('measureNote')));
  }
  box.hidden = !show;
}

function translate() {
  document.documentElement.lang = L;
  for (const n of document.querySelectorAll('[data-t]')) n.textContent = t(n.dataset.t);
  $('cmdInput').setAttribute('aria-label', t('cmdPlaceholder'));
  $('ortho').title = t('orthoTip'); $('osnap').title = t('osnapTip'); $('polar').title = t('polarTip'); $('dyn').title = t('dynTip');
  $('osnapMore').setAttribute('aria-label', t('osnapMenu')); $('polarMore').setAttribute('aria-label', t('polarMenu'));
  $('paletteClose').setAttribute('aria-label', t('close'));
  syncPrompt();
}

async function start() {
  try { me = await getJSON('/api/me'); } catch { return; }
  L = languageFor(me); w = W[L] || W.th;
  translate(); showSide('list'); renderRibbon(); renderTabs(); renderLayouts(); renderHistory();
  // The engine's own command line (hidden) still runs its commands: show its prompts in ours.
  const watchPrompt = () => {
    const p = document.querySelector('#stage .ml-cli-prompt');
    if (p) new MutationObserver(syncPrompt).observe(p, { childList: true, characterData: true, subtree: true });
    const recent = document.querySelector('#stage .ml-cli-recent');
    if (recent) new MutationObserver((list2) => { for (const m of list2) for (const n of m.addedNodes) { const text = n.textContent?.trim(); if (text) say(text, /error|invalid|ไม่/i.test(text) ? 'err' : ''); } }).observe(recent, { childList: true });
  };
  watchPrompt();
  // Cursor position in drawing units (status bar), from the engine's own screen-to-drawing conversion.
  $('stage').addEventListener('pointermove', (e) => {
    const view = docs.curView;
    if (!view || !current) return;
    try {
      const p = view.screenToWorld(view.viewportToCanvas({ x: e.clientX, y: e.clientY }));
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) $('coords').textContent = `${p.x.toFixed(2)}, ${p.y.toFixed(2)}`;
    } catch { /* not over the drawing */ }
  });
  const input = $('cmdInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || (e.key === ' ' && input.value.trim() && !/\s/.test(input.value.trim()) && !enginePrompt())) {
      e.preventDefault(); e.stopPropagation(); submitCommand(); return;
    }
    if (e.key === 'Escape') {
      input.value = '';
      if (pending) { pending = null; say(t('cancelled')); syncPrompt(); }
      else if (enginePrompt()) say(t('cancelled'));
      toggleHelp(false);
      return; // the engine cancels its own command on Escape
    }
    if (e.key === 'ArrowUp' && recall.length) { e.preventDefault(); recallAt = Math.max(0, recallAt - 1); input.value = recall[recallAt]; }
    if (e.key === 'ArrowDown' && recall.length) { e.preventDefault(); recallAt = Math.min(recall.length, recallAt + 1); input.value = recall[recallAt] || ''; }
  });
  // As in AutoCAD: typing anywhere goes to the command line; F1 help, F8 Ortho.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); toggleHelp(); return; }
    const aidKey = { F3: 'osnap', F8: 'ortho', F10: 'polar', F12: 'dyn' }[e.key];
    if (aidKey) { e.preventDefault(); toggleAid(aidKey); return; }
    if (e.key === 'Escape') { toggleHelp(false); $('aidMenu').hidden = true; if (pending) { pending = null; syncPrompt(); } return; }
    const tgt = e.target, typing = tgt instanceof HTMLElement && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName));
    if (typing || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || document.querySelector('dialog[open]')) return;
    if (startShown && !/[a-z?]/i.test(e.key)) return;
    input.focus();
  });
  for (const id of ['osnap', 'ortho', 'polar', 'dyn']) $(id).addEventListener('click', () => toggleAid(id));
  $('osnapMore').addEventListener('click', (e) => aidMenu('osnap', e.currentTarget));
  $('polarMore').addEventListener('click', (e) => aidMenu('polar', e.currentTarget));
  document.addEventListener('pointerdown', (e) => { const m = $('aidMenu'); if (!m.hidden && !m.contains(e.target) && !e.target.closest?.('.ac-more')) m.hidden = true; });
  applyAids();
  $('paletteToggle').addEventListener('click', () => setPalette(!paletteOpen()));
  $('paletteClose').addEventListener('click', () => setPalette(false));
  $('tabList').addEventListener('click', () => { showSide('list'); renderRibbon(); });
  $('tabHistory').addEventListener('click', () => { showSide('history'); renderRibbon(); });
  const dialog = $('saveDialog');
  $('saveCancel').addEventListener('click', () => dialog.close());
  $('saveForm').addEventListener('submit', () => { const note = $('saveNote').value; setTimeout(() => save(note), 0); });
  addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  // Unsaved mark on the file tab.
  let wasDirty = false;
  setInterval(() => { const d = dirty(); if (d !== wasDirty) { wasDirty = d; renderTabs(); } }, 1500);
  if (phone()) setPalette(false, 'list'); else setPalette(true, 'list');
  renderNote();
  try { list = await getJSON('/api/cad/drawings'); } catch (e) { list = { error: true, groups: [], files: [], legacy: [], noted: {} }; setStatus('listError', {}, e.message, 'bad'); }
  renderList(); renderNote(); renderRibbon();
  if (list.error) return;
  const want = new URL(location.href).searchParams.get('dwg');
  const all = [...list.groups.flatMap((g) => g.sheets.map((s) => ({ ...s, catalogId: s.id, rebuild: g.rebuild }))), ...list.files, ...list.legacy.map((f) => ({ ...f, title: f.title || f.name }))];
  const item = want && all.find((x) => x.catalogId === want || x.sha256 === want);
  if (item) open(item); else { showStart(true); setStatus('pick'); }
}
start();
