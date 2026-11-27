// Command line of Drawings -> CAD workspace: AutoCAD-style command names and aliases (L, PL, LE, REC, C, REVCLOUD, T, DI, AA,
// ANG, CHAIN, Z then E / ZE, P, U, REDO, ERASE, SAVE) turned into workspace actions. No DOM here, so it is tested in Node
// (portal-proposal/tests/cad-commands.test.mjs). The workspace maps each action to the CAD engine (workspace.mjs).

/** action: what the workspace does; names: what can be typed (first = the command's own name). */
export const COMMANDS = [
  { action: 'line', names: ['LINE', 'L'], en: 'Line (markup): click point after point; Enter or Esc ends, U takes back, C closes', th: 'เส้น (เครื่องหมาย): คลิกต่อไปเรื่อย ๆ กด Enter หรือ Esc เพื่อจบ, U ย้อนหนึ่งช่วง, C ปิดรูป' },
  { action: 'pline', names: ['PLINE', 'PL'], en: 'Polyline (markup): joined segments; Enter or Esc ends, U takes back, C closes', th: 'เส้นหลายช่วง (เครื่องหมาย): ช่วงต่อกัน กด Enter หรือ Esc เพื่อจบ, U ย้อนหนึ่งช่วง, C ปิดรูป' },
  { action: 'leader', names: ['LEADER', 'LE', 'MLEADER', 'MLD'], en: 'Leader (arrow markup)', th: 'เส้นชี้นำ (ลูกศร)' },
  { action: 'rect', names: ['RECTANG', 'REC', 'RECTANGLE'], en: 'Rectangle (markup)', th: 'สี่เหลี่ยม (เครื่องหมาย)' },
  { action: 'circle', names: ['CIRCLE', 'C'], en: 'Circle (markup)', th: 'วงกลม (เครื่องหมาย)' },
  { action: 'cloud', names: ['REVCLOUD'], en: 'Revision cloud', th: 'เมฆแก้ไข' },
  { action: 'text', names: ['TEXT', 'T', 'DTEXT', 'DT', 'MTEXT', 'MT'], en: 'Text (markup)', th: 'ข้อความ (เครื่องหมาย)' },
  { action: 'distance', names: ['DIST', 'DI'], en: 'Measure distance', th: 'วัดระยะ' },
  { action: 'chain', names: ['CHAIN'], en: 'Measure chain (polyline length)', th: 'วัดระยะต่อเนื่อง' },
  { action: 'area', names: ['AREA', 'AA'], en: 'Measure area', th: 'วัดพื้นที่' },
  { action: 'angle', names: ['ANGLE', 'ANG'], en: 'Measure angle', th: 'วัดมุม' },
  { action: 'zoom', names: ['ZOOM', 'Z'], en: 'Zoom (then E = extents)', th: 'ซูม (แล้วพิมพ์ E = ทั้งหมด)' },
  { action: 'extents', names: ['ZE'], en: 'Zoom extents', th: 'ซูมให้เห็นทั้งแบบ' },
  { action: 'pan', names: ['PAN', 'P'], en: 'Pan', th: 'เลื่อนมุมมอง' },
  { action: 'undo', names: ['UNDO', 'U'], en: 'Undo', th: 'ย้อนกลับ' },
  { action: 'redo', names: ['REDO'], en: 'Redo', th: 'ทำซ้ำ' },
  { action: 'eraseAll', names: ['ERASE', 'E'], en: 'Erase all markups and measurements in this view (asks first)', th: 'ลบเครื่องหมายและการวัดทั้งหมดในมุมมองนี้ (ถามก่อน)' },
  { action: 'save', names: ['SAVE', 'QSAVE'], en: 'Save notes (Drawings edit only)', th: 'บันทึกโน้ต (เฉพาะผู้มีสิทธิ์แก้ไข)' },
  { action: 'help', names: ['HELP', '?'], en: 'This list (also F1)', th: 'รายการนี้ (หรือกด F1)' },
];
const BY_NAME = new Map(COMMANDS.flatMap((c) => c.names.map((n) => [n, c.action])));
const ZOOM_EXTENTS = new Set(['E', 'EXTENTS', 'EX']);

/**
 * Reads one line typed in the command line.
 *   input:   the typed text ("l", "Z E", "zoom extents", "dist").
 *   pending: the action waiting for an option (only 'zoom' today), or null.
 * Returns one of:
 *   { action }                     run this action
 *   { pending: 'zoom' }            ZOOM asked for its option; the next line answers it
 *   { repeat: true }               empty line: repeat the last command (as AutoCAD does)
 *   { cancel: true }               empty answer to a pending option
 *   { invalidOption: 'X' }         answer the pending command does not know
 *   { unknown: 'XYZ' }             not a command
 */
export function parseCommand(input, pending = null) {
  const words = String(input ?? '').trim().replace(/^[_.'-]+/, '').toUpperCase().split(/\s+/).filter(Boolean);
  if (pending === 'zoom') {
    if (!words.length) return { cancel: true };
    return ZOOM_EXTENTS.has(words[0]) ? { action: 'extents' } : { invalidOption: words[0] };
  }
  if (!words.length) return { repeat: true };
  const action = BY_NAME.get(words[0]);
  if (!action) return { unknown: words[0] };
  if (action === 'zoom') {
    if (words.length === 1) return { pending: 'zoom' };
    return ZOOM_EXTENTS.has(words[1]) ? { action: 'extents' } : { invalidOption: words[1] };
  }
  return { action };
}

/** Message text for an unknown command, as AutoCAD words it. */
export const unknownMessage = (name, lang) => (lang === 'th' ? `ไม่รู้จักคำสั่ง "${name}" กด F1 เพื่อดูวิธีใช้` : `Unknown command "${name}". Press F1 for help.`);
