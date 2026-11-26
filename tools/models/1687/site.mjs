// 1687 Phetchaburi (Caltex at Robinson Phetchaburi): what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/1687.glb.
//
// The south-east corner (sales building, office toilet, old tanks, the two new 3,000 L aerated tanks, drains to the public
// drain) is modelled in detail from the wastewater sheets A and B. Since 26 Nov 2026 the rest of the station (canopy, pump
// islands, fuel tanks and pipes, the whole drainage, the full boundary) and its surroundings (Robinson Phetchaburi and
// Phetkasem Road, layer "surroundings") are added from Brian's 2025 DWGs C and D; see the second half of build().
//
// Sources (portal-proposal/public/sites/layouts/1687, both A3 PDFs dated 11.09.2024 and stamped FOR CONSTRUCTION, although
// the files are named "as-built" and sheet B is titled "As Built Pipe Slope Section"):
//   A  1687-septic-3000L-as-built-layout.pdf = sheet SN-01 "plan showing installation of 2,500 L treatment tanks (aerated
//      type)": plan positions, pipe routes and flow arrows, manholes, the 3-compartment trap, the arrow to the public drain.
//      The sheet says 1:100, but its scale bar (0 to 5 m = 44.0 mm on the A3 page) and the written 2.40 m slab and 4.80 m
//      dimensions show the PDF is plotted at 1:113.61. That is the scale used here.
//   B  1687-septic-pipe-slope.pdf: two sections, "Station Office Septic Tank Piping Slope" and "Insurance Shop Tank Piping
//      Slope" (same plot factor, checked against its 10.7206 m dimension). Gives the datum (BM 0.0 = top of drain sump), the
//      depth of the pipe at each end, the tank height, the cover depth, the slab and the bottom of the excavation.
//   C  "Layout As Built งานถังบำบัด 3,000 ลิตร (โรบินสันเพชรบุรี).dwg" (Brian's folder 24 25 Grease and Septic repair\เพชรบุรี Phetchaburi
//      Robinson, June 2025): the Caltex station plan with its legend (items 1 to 45, fuel tanks T1 to T4) and drainage plan
//      (block San-001), drawn over the Robinson site plan. Older than the 2024 work; no levels. North symbol: 191.7°.
//   D  "01 Robinson Petchburi_Laou4.dwg" (same folder, May 2025): the Robinson Phetchaburi site plan (1:1000) with the station.
//   E  "Spp Septic Tank Phetchaburi Look Back.pptx" (2025): SPP's photos of the 2025 install, its "Layout As Built" slide (= sheet
//      A), the change to the foundation, and the Premier SS-3A tank drawing (SS-3A.pdf) in the same folder.
// Positions are metres on the sheet at 1:113.61 (x right, y up, from the bottom-left corner of the page). C and D sit on
// these by a plain shift: model = C - (204.75, 327.51), C = D - (4428.93, 2648.12) (see make-lines.py).
// Levels are metres from BM 0.00 = top of the drain sump. The station is shown flat at 0.00; D writes +0.80 on the forecourt and
// ±0.00 on Phetkasem Road, so the road is shown at -0.80.
// src: 'drawn' = position and levels from the drawings; 'part' = position from the drawing, size, depth or level assumed;
//      'context' = above-ground context only (heights assumed).
import fs from 'node:fs';
const D = 'drawn', P = 'part', C = 'context';
// Both sheets are design drawings: this line goes into the notes of every underground object, before the source line.
// C (the station plan) is older than the 2024 work and has no levels: this line goes into the notes of what comes from it.
const PLAN = { en: 'From the Caltex station plan in Brian\'s 2025 DWG (older than the 2024 work, no levels). Confirm on site.', th: 'จากผังสถานี Caltex ใน DWG ปี 2025 ของ Brian (เก่ากว่างานปี 2024 ไม่มีระดับ) ต้องยืนยันหน้างาน' };
const DESIGN = { en: 'From 2024 drawings stamped FOR CONSTRUCTION (design, not as-built): as designed for the 2024 improvement. Confirm on site.', th: 'จากแบบปี 2024 ที่ประทับตรา FOR CONSTRUCTION (แบบออกแบบ ไม่ใช่แบบก่อสร้างจริง): เป็นไปตามที่ออกแบบไว้สำหรับงานปรับปรุงปี 2024 ต้องยืนยันหน้างาน' };

// ---- levels written on sheet B (depth below BM 0.00)
const COVER = -0.3015;        // top of the tank cover
const IN = -0.59;             // underside of the 4" pipe where it enters a new tank (both sections)
const START_A = -0.35;        // underside of the pipe at its start, "Station Office" section
const START_B = -0.56;        // underside of the pipe at its start, "Insurance Shop" section (outlet of the "existing grease trap")
const TANK_H = 1.784;         // tank height
const BED = -2.4325;          // bottom of the excavation
const SLAB = 0.20;            // base slab thickness
const SLAB_TOP = -2.12;       // scaled off the section: the 1.784 m dimension runs from -0.34 down to -2.12
const OUT = IN - 0.05;        // ASSUMED: the outlet level is not written
const SUMP_DEPTH = 1.5;       // drain sump drawn 0.60 m wide and 1.50 m deep on sheet B, not dimensioned
const TRAP_IN = -1.0;         // ASSUMED drain level at the 3-compartment trap (no drain levels on the drawings)

// ---- the two new tanks (sheet A: 2.00 m circle on a 2.40 m square slab)
const TANKS = [
  { id: 'W', x: 19.686, y: 18.545, en: 'west', th: 'ฝั่งตะวันตก', section: 'Station Office Septic Tank', from: { en: 'existing treatment tank 1 (office toilet)', th: 'ถังบำบัดเดิมใบที่ 1 (ห้องน้ำสำนักงาน)' },
    inAt: { en: 'north-east', th: 'ตะวันออกเฉียงเหนือ' }, outAt: { en: 'south-west', th: 'ตะวันตกเฉียงใต้' }, to: 'MH-5' },
  { id: 'E', x: 24.925, y: 18.084, en: 'east', th: 'ฝั่งตะวันออก', section: 'Insurance Shop Tank', from: { en: 'existing treatment tank 2, which takes the existing grease trap', th: 'ถังบำบัดเดิมใบที่ 2 ซึ่งรับน้ำจากถังดักไขมันเดิม' },
    inAt: { en: 'north', th: 'เหนือ' }, outAt: { en: 'south', th: 'ใต้' }, to: 'MH-4' },
];
// outside shape of the tank, traced from the manufacturer's outline on sheet B: [radius, height above its base]
const SHAPE = [[0, 0], [0.66, 0], [0.82, 0.10], [0.93, 0.30], [0.97, 0.53], [1.0, 0.53], [1.0, 0.73], [0.97, 0.73], [0.93, 1.0], [0.83, 1.25], [0.72, 1.40], [0.72, 1.66], [0.27, 1.70], [0.27, TANK_H]];

// ---- the three old round tanks beside the building (1.27 m circles on the plan)
const OLD = [
  { id: 1, x: 26.59, y: 28.32, material: 'tankOlder', en: 'Existing treatment tank 1 (office toilet)', th: 'ถังบำบัดเดิม ใบที่ 1 (ห้องน้ำสำนักงาน)', tag: 'Existing tank 1', tagTh: 'ถังบำบัดเดิม 1',
    en1: 'Takes the office toilet (dotted pipe with an arrow from the toilet) and a second dotted pipe that comes from the north, off the sheet.', th1: 'รับน้ำจากห้องน้ำสำนักงาน (ท่อเส้นประมีลูกศรจากห้องน้ำ) และท่อเส้นประอีกเส้นที่มาจากด้านเหนือนอกแบบ',
    en2: 'Before 2024 it discharged east to manhole MH-1. The new pipe to the west 3,000 L tank starts at a clean-out (FCO 4") drawn at the centre of this tank.', th2: 'ก่อนปี 2024 ปล่อยน้ำไปทางตะวันออกลงบ่อพัก MH-1 ท่อใหม่ไปถัง 3,000 ลิตรฝั่งตะวันตกเริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ที่เขียนไว้กลางถังนี้' },
  { id: 2, x: 26.59, y: 26.70, material: 'tankOlder', en: 'Existing treatment tank 2', th: 'ถังบำบัดเดิม ใบที่ 2', tag: 'Existing tank 2', tagTh: 'ถังบำบัดเดิม 2',
    en1: 'Takes the outflow of the existing grease trap (dotted pipe with an arrow pointing north into this tank).', th1: 'รับน้ำจากถังดักไขมันเดิม (ท่อเส้นประมีลูกศรชี้ขึ้นเหนือเข้าถังนี้)',
    en2: 'Before 2024 it discharged north-east to manhole MH-1. The new pipe to the east 3,000 L tank starts at a clean-out (FCO 4") on the east side of this tank.', th2: 'ก่อนปี 2024 ปล่อยน้ำไปทางตะวันออกเฉียงเหนือลงบ่อพัก MH-1 ท่อใหม่ไปถัง 3,000 ลิตรฝั่งตะวันออกเริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ด้านตะวันออกของถังนี้' },
  { id: 3, x: 26.59, y: 25.16, material: 'grease', en: 'Existing grease trap (round)', th: 'ถังดักไขมันเดิม (ถังกลม)', tag: 'Grease trap', tagTh: 'ถังดักไขมัน',
    en1: 'Takes a dotted pipe from the shop building (arrow pointing east into the trap).', th1: 'รับน้ำจากท่อเส้นประที่มาจากอาคารร้านค้า (ลูกศรชี้ไปทางตะวันออกเข้าถัง)',
    en2: 'Its outflow goes north into existing treatment tank 2. The pipe slope sheet shows the "existing grease trap" outlet at -0.56.', th2: 'น้ำออกไปทางเหนือเข้าถังบำบัดเดิมใบที่ 2 แบบความลาดท่อแสดงท่อออกของ "ถังดักไขมันเดิม" ที่ระดับ -0.56' },
];

// ---- manholes (0.60 m squares on the plan) and how they are joined by the dashed drain lines
const MH = {
  'MH-1': [27.61, 28.32], 'MH-2': [27.61, 20.05], 'MH-3': [22.08, 19.84], 'MH-4': [22.08, 15.72], 'MH-5': [16.97, 15.72],
  'MH-6': [17.00, 22.53], 'MH-7': [13.79, 12.84], 'MH-8': [7.77, 12.84], 'MH-9': [5.43, 16.56], 'MH-10': [5.43, 25.20],
};
const TRAP_AT = [22.08, 15.23];
// which point each manhole is ASSUMED to drain to (the drawing has no arrows on the drain lines; the trap is the only outfall on the sheet)
const DOWN = { 'MH-4': TRAP_AT, 'MH-3': 'MH-4', 'MH-2': 'MH-3', 'MH-1': 'MH-2', 'MH-5': 'MH-4', 'MH-6': 'MH-5', 'MH-7': 'MH-5', 'MH-8': 'MH-7', 'MH-9': 'MH-8', 'MH-10': 'MH-9' };
const xy = (n) => (typeof n === 'string' ? MH[n] : n);
const distToTrap = (n) => { if (typeof n !== 'string') return 0; const a = MH[n], b = xy(DOWN[n]); return Math.hypot(a[0] - b[0], a[1] - b[1]) + distToTrap(DOWN[n]); };
const drainLevel = (n, extra = 0) => Math.round((TRAP_IN + (distToTrap(n) + extra) / 200) * 100) / 100;
const MH_NOTE = {
  'MH-1': { en: 'The two old treatment tanks discharged here before 2024 (dotted pipes with arrows on the plan). The drain line carries on north, off the sheet.', th: 'ก่อนปี 2024 ถังบำบัดเดิมทั้งสองใบปล่อยน้ำลงบ่อนี้ (ท่อเส้นประมีลูกศรในผัง) แนวท่อระบายน้ำเดินต่อไปทางเหนือนอกแบบ' },
  'MH-2': { en: 'At the south-east corner of the building, on the site boundary. The two new 4" pipes turn west just beside it.', th: 'อยู่ที่มุมตะวันออกเฉียงใต้ของอาคาร ติดแนวเขตที่ดิน ท่อใหม่ 4 นิ้วทั้งสองเส้นเลี้ยวไปทางตะวันตกข้างบ่อนี้' },
  'MH-3': { en: 'Between the building and the two new tanks. A tree is drawn over the drain line from here to MH-4.', th: 'อยู่ระหว่างอาคารกับถังใหม่ทั้งสองใบ ในผังมีต้นไม้อยู่บนแนวท่อระบายน้ำจากบ่อนี้ไป MH-4' },
  'MH-4': { en: 'Marked "existing manhole" on the plan. The new east tank discharges here (arrow on the plan), and it is the last manhole before the 3-compartment trap.', th: 'ในผังระบุว่า "บ่อพักเดิม" ถังใหม่ฝั่งตะวันออกปล่อยน้ำลงบ่อนี้ (มีลูกศรในผัง) และเป็นบ่อพักสุดท้ายก่อนบ่อดักไขมัน 3 ตอน' },
  'MH-5': { en: 'The new west tank discharges here (arrow on the plan). From here the only route to the outfall on this sheet is the drain line east to MH-4.', th: 'ถังใหม่ฝั่งตะวันตกปล่อยน้ำลงบ่อนี้ (มีลูกศรในผัง) จากบ่อนี้ทางเดียวที่ไปจุดปล่อยน้ำในแบบแผ่นนี้คือแนวท่อระบายน้ำไปทางตะวันออกถึง MH-4' },
  'MH-6': { en: 'West side of the building; the dashed drain line ends here.', th: 'อยู่ด้านตะวันตกของอาคาร แนวท่อระบายน้ำเส้นประสิ้นสุดที่บ่อนี้' },
  'MH-7': { en: 'East side of the exit driveway, just inside the south boundary.', th: 'อยู่ด้านตะวันออกของทางออก ชิดแนวเขตด้านใต้' },
  'MH-8': { en: 'West side of the exit driveway. A dashed drain line also runs west from here, off the sheet.', th: 'อยู่ด้านตะวันตกของทางออก มีแนวท่อระบายน้ำเส้นประอีกเส้นเดินไปทางตะวันตกออกนอกแบบ' },
  'MH-9': { en: 'At the west edge of the exit driveway.', th: 'อยู่ที่ขอบด้านตะวันตกของทางออก' },
  'MH-10': { en: 'Drawn with a different symbol (open square) from the other manholes. Drain lines carry on north and west, off the sheet.', th: 'เขียนด้วยสัญลักษณ์ต่างจากบ่อพักอื่น (สี่เหลี่ยมโปร่ง) แนวท่อระบายน้ำเดินต่อไปทางเหนือและตะวันตกนอกแบบ' },
};

// ---- fuel pipes from the station plan C (blocks Line-pile), model coordinates: fill (4"), vent (3") and dispensing (2") lines
const FILL = [[[-16.37, 42.52], [-14.99, 42.52], [-14.99, 58.85], [-11.49, 58.85], [-9.91, 60.43]], [[-16.37, 40.85], [-13.79, 40.85], [-13.79, 52.09], [-9.61, 52.09], [-8.03, 53.67]], [[-16.37, 40.43], [-13.49, 40.43], [-13.49, 48.71], [-11.49, 48.71], [-9.91, 50.29]], [[-16.37, 41.68], [-14.39, 41.68], [-14.39, 55.47], [-9.61, 55.47], [-8.03, 57.05]], [[-16.37, 42.1], [-14.69, 42.1], [-14.69, 55.77], [-13.06, 55.77], [-11.78, 57.05]], [[-16.37, 41.27], [-14.09, 41.27], [-14.09, 52.39], [-13.06, 52.39], [-11.78, 53.67]]];
const VENT = [[[-16.37, 35.07], [-13.17, 35.07], [-13.17, 48.18], [-9.91, 48.18], [-9.91, 50.05]], [[-16.37, 36.32], [-17.03, 36.32], [-17.03, 58.55], [-8.03, 58.55], [-8.03, 57.29]], [[-16.37, 35.49], [-17.43, 35.49], [-17.43, 55.25], [-8.03, 55.25], [-8.03, 53.91]], [[-16.37, 35.91], [-17.23, 35.91], [-17.23, 54.97], [-11.78, 54.97], [-11.78, 53.91]], [[-16.37, 36.74], [-16.83, 36.74], [-16.83, 58.31], [-11.78, 58.31], [-11.78, 57.29]], [[-16.37, 37.16], [-16.63, 37.16], [-16.63, 61.78], [-9.91, 61.78], [-9.91, 60.67]]];
const DISP = [[[-1.99, 23.61], [-1.99, 43.86]], [[-1.0, 23.61], [-1.0, 43.86]], [[-0.67, 23.61], [-0.67, 43.86]], [[-1.66, 23.61], [-1.66, 43.86]], [[-1.33, 33.61], [-1.33, 43.86]], [[-1.5, 43.86], [-1.5, 32.32], [-1.33, 23.61]], [[-2.29, 56.62], [-1.31, 54.4], [-0.87, 52.09], [-0.67, 43.86]], [[-4.19, 56.65], [-3.39, 55.47], [-2.78, 54.26], [-1.77, 51.25], [-1.22, 47.95], [-1.0, 43.86]], [[-7.79, 57.05], [-6.31, 56.82], [-4.94, 56.2], [-3.81, 55.22], [-2.98, 53.96], [-2.24, 51.77], [-1.71, 49.22], [-1.45, 46.7], [-1.33, 43.86]], [[-3.36, 52.47], [-2.62, 51.16], [-1.96, 49.14], [-1.66, 47.25], [-1.5, 43.86]], [[-7.79, 53.67], [-6.45, 53.56], [-5.08, 53.01], [-4.29, 52.41], [-3.26, 51.11], [-2.6, 49.71], [-2.12, 47.95], [-1.72, 45.57], [-1.66, 43.86]], [[-1.99, 43.86], [-2.1, 45.48], [-2.48, 46.49], [-3.71, 48.26], [-4.52, 48.97], [-5.44, 49.54], [-6.43, 49.96], [-7.48, 50.21], [-9.67, 50.29]], [[-11.54, 53.67], [-9.86, 54.39], [-8.97, 54.57], [-7.14, 54.57], [-5.38, 54.08], [-4.57, 53.66], [-3.36, 52.47]], [[-9.25, 57.88], [-7.9, 58.14], [-6.54, 58.01], [-5.26, 57.5], [-4.19, 56.65]], [[-11.54, 57.05], [-10.97, 56.86], [-10.56, 56.92], [-9.25, 57.88]], [[-9.67, 60.43], [-8.57, 60.46], [-7.49, 60.33], [-5.42, 59.61], [-4.48, 59.04], [-3.64, 58.34], [-2.9, 57.53], [-2.29, 56.62]]];
// ---- Robinson site plan D outside the station, made by make-lines.py (centimetres, model coordinates)
const STATION = [[-17.66, 12.58], [12.26, 12.39], [25.82, 12.56], [25.83, 13.37], [25.90, 14.18], [26.02, 14.99], [26.18, 15.78], [26.40, 16.57], [26.66, 17.34], [26.97, 18.09], [27.33, 18.82], [27.91, 19.92], [27.91, 54.13], [-17.66, 68.47]];
const SURROUND = JSON.parse(fs.readFileSync(new URL('./surroundings.json', import.meta.url), 'utf8'));

export default {
  name: 'Phetchaburi',
  origin: [22.5, 20],
  datum: { en: 'Levels are in metres from the drawing datum: BM ±0.00 = top of the drain sump (manhole top), from the pipe slope sheet. The station is shown flat at ±0.00. The Robinson site plan writes +0.80 on the forecourt and ±0.00 on Phetkasem Road, so the road is shown at -0.80. Robinson around the station is shown flat (no levels on its plan).', th: 'ระดับเป็นเมตรจากระดับอ้างอิงของแบบ: BM ±0.00 = ระดับหลังบ่อพัก (จากแบบความลาดท่อ) แสดงสถานีเป็นพื้นราบที่ ±0.00 ผังโครงการโรบินสันเขียนลานสถานี +0.80 และถนนเพชรเกษม ±0.00 จึงแสดงถนนที่ -0.80 พื้นที่โรบินสันรอบสถานีแสดงเป็นพื้นราบ (ผังไม่มีระดับ)' },
  note: {
    en: 'The south-east corner with the wastewater tanks (sales building, office toilet, old tanks, the two new 3,000 L tanks installed in 2025, drains to the public drain) is in detail from the 2024 wastewater sheets, which SPP\'s 2025 look-back report and site photos confirm for the tank positions. The rest of the station (canopy, pump islands, four fuel tanks and their pipes, the drainage all round, the full boundary) comes from the older Caltex station plan in Brian\'s 2025 DWG: no levels, so depths are assumed. The layer "Surroundings (outside the station)" shows Phetkasem Road and the Robinson Phetchaburi site from the Robinson site plan, for context only; switch it off to see the station alone. Not for setting out: confirm on site before any digging.',
    th: 'มุมตะวันออกเฉียงใต้ที่มีถังบำบัด (อาคารร้านค้า ห้องน้ำสำนักงาน ถังเดิม ถังใหม่ 3,000 ลิตร 2 ใบที่ติดตั้งปี 2025 และท่อระบายน้ำไปท่อสาธารณะ) แสดงละเอียดตามแบบงานน้ำเสียปี 2024 ซึ่งรายงานทบทวนงานปี 2025 และรูปถ่ายหน้างานของ SPP ยืนยันตำแหน่งถัง ส่วนอื่นของสถานี (หลังคาคลุมหัวจ่าย เกาะจ่าย ถังน้ำมัน 4 ใบและท่อ ระบบระบายน้ำรอบสถานี แนวเขตทั้งหมด) มาจากผังสถานี Caltex ฉบับเก่าใน DWG ปี 2025 ของ Brian ซึ่งไม่มีระดับ ความลึกจึงเป็นค่าสมมติ ชั้นข้อมูล "พื้นที่รอบสถานี (นอกแนวเขต)" แสดงถนนเพชรเกษมและโครงการโรบินสันเพชรบุรีตามผังโครงการ ใช้ดูประกอบเท่านั้น ปิดชั้นนี้เพื่อดูเฉพาะสถานี ห้ามใช้วางผัง ต้องยืนยันหน้างานก่อนขุดทุกครั้ง',
  },
  built: '2026-11-26',
  // Drawing angle of north, anticlockwise from +x: the north symbol on the station plan (C) is turned 101.7°, so north points
  // left and slightly down the sheet. It agrees with the site plan (D): Ratchaburi (north) to the left, Cha-am (south) to the right.
  north: 191.7,
  // The station boundary from the station plan (C, layer Boundary, legend item 1: 3,327 m²). Its south-east curve matches SN-01.
  boundary: STATION,
  ground: {
    bbox: [-18, 12, 28, 69], step: 2, apron: 3, road: 0,
    roadArea: STATION,   // nothing outside the boundary in this layer: the surroundings layer has the ground round the station
    points: [[5, 40, 0]],
    names: { siteGround: { en: 'Station forecourt (shown flat at ±0.00)', th: 'ลานสถานี (แสดงเป็นพื้นราบที่ ±0.00)' }, road: { en: 'Just outside the station boundary', th: 'พื้นที่ติดแนวเขตสถานี' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'air', 'base', 'fuel', 'buildings', 'surroundings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [-28, -22, 38], to: [5, 38, -0.5] },
    { id: 'plan', from: [5, 40.2, 82], to: [5, 40.3, 0] },
    { id: 'new', en: 'New 3,000 L tanks', th: 'ถังใหม่ 3,000 ลิตร', from: [20.5, 8.5, 8], to: [22.3, 18.2, -0.8] },
    { id: 'old', en: 'Existing tanks at the toilet', th: 'ถังเดิมข้างห้องน้ำ', from: [34, 20.5, 7], to: [26.6, 25.5, -0.6] },
    { id: 'fuel', from: [-30, 38, 12], to: [-9, 55, -1.6] },
    { id: 'area', from: [60, -150, 150], to: [-60, 90, 0] },
    { id: 'under', from: [-14, -6, -16], to: [6, 36, -1] },
  ],

  build({ notes, V, ground, lv, add, boxGeo, cylGeo, latheGeo, prismGeo, pipeGeo, merge, THREE, fuelTank, capsuleGeo, lines: drawLines }) {
    // notes: the lines given, then (for everything except above-ground context) the design-drawing line, then the shared source line
    const lines = (en, th, kind) => (kind === C ? notes(en, th, kind) : notes([...en, DESIGN.en], [...th, DESIGN.th], kind));
    // flow arrows: cones round the pipe, pointing the way the plan's arrows point
    const arrows = (levels, r) => {
      const out = [];
      for (let i = 0; i < levels.length - 1; i++) {
        const a = V(levels[i][0], levels[i][1], levels[i][2] + r), b = V(levels[i + 1][0], levels[i + 1][1], levels[i + 1][2] + r), len = a.distanceTo(b);
        if (len < 0.45) continue;
        const dir = b.clone().sub(a).normalize(), n = Math.max(1, Math.round(len / 2.2));
        for (let k = 0; k < n; k++) {
          const g = new THREE.ConeGeometry(r * 2.6, r * 7, 12);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
          const at = a.clone().lerp(b, (k + 0.5) / n); g.translate(at.x, at.y, at.z); out.push(g);
        }
      }
      return out;
    };
    /** A pipe; `o.info` may be a function of (length in m, the pipe's levels). `flow: 1` adds flow arrows. */
    const pipe = (layer, pts, r, material, o) => {
      const g = pipeGeo(pts, r);
      if (typeof o.info === 'function') o = { ...o, info: o.info(g.length, g.levels) };
      const geo = o.flow ? merge([g.geometry, ...arrows(g.levels, r)]) : g.geometry;
      add(layer, geo, material, o, o.tag ? (o.tagAt ? V(o.tagAt[0], o.tagAt[1], 0.6) : g.mid.clone().setY(g.mid.y + 0.6)) : null); return g;
    };
    const one = (n) => n.toFixed(1), ratio = (len, drop) => Math.round(len / drop / 5) * 5;

    // ---------- the two new 3,000 L tanks, their slabs and piles
    const slabs = [], piles = [];
    for (const t of TANKS) {
      const first = t.id === 'W';
      add('tanks', latheGeo(SHAPE, t.x, t.y, SLAB_TOP), 'tank', { en: `New 3,000 L treatment tank (${t.en}) · aerated`, th: `ถังบำบัดใหม่ 3,000 ลิตร (${t.th}) · ชนิดเติมอากาศ`, tag: `New 3,000 L tank (${t.en})`, tagTh: `ถังบำบัด 3,000 ลิตร (${t.th})`, lvl: lv(IN), kind: 'tank',
        info: lines(
          ['Aerated package treatment tank Premier SS-3A (Ø2.04 m, 1.78 m high, 3.64 m³), one of the 2 new tanks installed in May 2025. The 2024 plan says 2,500 L; SPP\'s 2025 look-back report and the Premier SS-3A drawing in the project folder show that 3,000 L tanks were installed.', 'SPP\'s 2025 site photos show the two tanks in two separate grass areas between the concrete drain pipes, as on this sheet (not side by side as in the January 2025 design).',
            `Takes the outflow of ${t.from.en}. Treated water leaves to manhole ${t.to} and from there to the 3-compartment trap and the public drain.`,
            `Taken to be the "${t.section}" of the pipe slope sheet. The plan does not name the two tanks, so confirm which section belongs to which tank.`,
            `Size: 2.00 m across (plan), ${TANK_H.toFixed(3)} m high (slope sheet).`,
            `Pipe in (PVC 4") ${lv(IN)} on the ${t.inAt.en} side, as written. Pipe out on the ${t.outAt.en} side about ${lv(OUT)}: the outlet level is not written, taken 0.05 m below the inlet.`,
            `Ground ±0.00 · top of tank cover ${lv(COVER)} · underside of tank about ${lv(SLAB_TOP)} · bottom of the excavation ${lv(BED)}.`,
            first ? 'A 2" PVC vent (V-PVC 2") is marked beside this tank; its route is not drawn. Flexible connectors are marked at the inlet and outlet.' : 'Flexible connectors are marked at the inlet and outlet. A safety switch and an underground power cable are drawn about 1 m east of this tank.'],
          ['ถังบำบัดน้ำเสียสำเร็จรูปชนิดเติมอากาศ Premier SS-3A (Ø2.04 ม. สูง 1.78 ม. 3.64 ลบ.ม.) เป็น 1 ใน 2 ถังใหม่ที่ติดตั้งเดือนพฤษภาคม 2025 ผังปี 2024 ระบุ 2,500 ลิตร แต่รายงานทบทวนงานปี 2025 ของ SPP และแบบ Premier SS-3A ในโฟลเดอร์โครงการแสดงว่าติดตั้งถัง 3,000 ลิตร', 'รูปถ่ายหน้างานปี 2025 แสดงถังสองใบอยู่คนละแปลงหญ้า คั่นด้วยท่อระบายน้ำคอนกรีต ตามแบบแผ่นนี้ (ไม่ได้วางติดกันตามแบบเดือนมกราคม 2025)',
            `รับน้ำจาก${t.from.th} น้ำที่บำบัดแล้วออกไปบ่อพัก ${t.to} แล้วไปบ่อดักไขมัน 3 ตอนและท่อระบายน้ำสาธารณะ`,
            `ถือว่าเป็น "${t.section}" ในแบบความลาดท่อ ผังไม่ได้ระบุชื่อถังทั้งสองใบ ต้องยืนยันว่ารูปตัดใดเป็นของถังใด`,
            `ขนาด: กว้าง 2.00 ม. (จากผัง) สูง ${TANK_H.toFixed(3)} ม. (จากแบบความลาดท่อ)`,
            `ท่อเข้า (PVC 4 นิ้ว) ${lv(IN)} ด้าน${t.inAt.th} ตามที่ระบุในแบบ ท่อออกด้าน${t.outAt.th}ประมาณ ${lv(OUT)}: ไม่มีระดับท่อออกในแบบ ใช้ค่าต่ำกว่าท่อเข้า 0.05 ม.`,
            `ระดับพื้น ±0.00 · หลังฝาถัง ${lv(COVER)} · ใต้ถังประมาณ ${lv(SLAB_TOP)} · ก้นหลุมขุด ${lv(BED)}`,
            first ? 'มีท่ออากาศ PVC 2 นิ้ว (V-PVC 2") ระบุไว้ข้างถังนี้ แต่ไม่ได้เขียนแนวท่อ มีข้อต่ออ่อนที่ท่อเข้าและท่อออก' : 'มีข้อต่ออ่อนที่ท่อเข้าและท่อออก มีสวิตช์นิรภัยและสายไฟใต้ดินเขียนไว้ห่างจากถังนี้ไปทางตะวันออกประมาณ 1 ม.'], D) }, V(t.x, t.y + 1.35, 0.9));
      add('tanks', cylGeo(0.30, 0 - COVER, t.x, t.y, COVER), 'tank', { en: `New tank ${t.id} access riser`, th: `ปล่องเปิดถังใหม่ ${t.id}`, nopick: 1 });
      add('tanks', cylGeo(0.42, 0.04, t.x, t.y, 0), 'cover', { en: `New tank ${t.id} cover`, th: `ฝาถังใหม่ ${t.id}`, nopick: 1 });
      slabs.push(boxGeo(2.4, 2.4, SLAB, t.x, t.y, SLAB_TOP - SLAB, 0));
      for (const i of [-0.95, 0, 0.95]) for (const j of [-0.95, 0, 0.95]) if (i || j) piles.push(boxGeo(0.15, 0.15, 2.0, t.x + i, t.y + j, SLAB_TOP - SLAB - 2.0, 0));
    }
    add('base', merge(slabs), 'slab', { en: 'Base slabs under the new tanks', th: 'ฐานคอนกรีตใต้ถังใหม่', kind: 'base', info: lines(
      [`Concrete slab 2.40 × 2.40 m under each tank (plan), ${SLAB.toFixed(2)} m thick (slope sheet). The west slab is 0.80 m clear of the building line.`, `Top of slab about ${lv(SLAB_TOP)} · bottom of the excavation ${lv(BED)} (written as 2.4325 m below the datum).`],
      [`พื้นคอนกรีต 2.40 × 2.40 ม. ใต้ถังแต่ละใบ (จากผัง) หนา ${SLAB.toFixed(2)} ม. (จากแบบความลาดท่อ) ฐานฝั่งตะวันตกห่างจากแนวอาคาร 0.80 ม.`, `ระดับหลังฐานประมาณ ${lv(SLAB_TOP)} · ก้นหลุมขุด ${lv(BED)} (ในแบบเขียน 2.4325 ม. ต่ำกว่าระดับอ้างอิง)`], D) });
    add('base', merge(piles), 'pile', { en: 'Piles under the new tanks', th: 'เสาเข็มใต้ถังใหม่', kind: 'base', info: lines(
      ['The plan shows 8 pile symbols on each slab (corners and mid-sides, about 0.95 m apart) and the slope sheet shows piles under the slab.', 'Pile size and length are not given: shown 0.15 m square and 2.0 m long.', 'SPP\'s 2025 look-back: the soil was hard with large stones, driven piles stopped at about 0.3 m, so the holes were bored with a 2 m auger and the slab was made 20 cm thick with 2 layers of DB12 @ 15 cm. Pile length on site is not recorded.'],
      ['ผังแสดงสัญลักษณ์เสาเข็ม 8 ต้นต่อฐาน (มุมและกึ่งกลางด้าน ห่างกันประมาณ 0.95 ม.) และแบบความลาดท่อแสดงเสาเข็มใต้ฐาน', 'ไม่มีขนาดและความยาวเสาเข็มในแบบ: แสดงเป็นเสา 0.15 ม. ยาว 2.0 ม.', 'รายงานทบทวนงานปี 2025 ของ SPP: ดินแข็งมีหินขนาดใหญ่ ตอกเข็มได้ลึกประมาณ 0.3 ม. จึงเจาะด้วยสว่านยาว 2 ม. และเปลี่ยนฐานเป็นหนา 20 ซม. เหล็ก DB12 @ 15 ซม. 2 ชั้น ไม่มีบันทึกความยาวเข็มที่ใช้จริง'], P) });

    // ---------- the old tanks beside the building (depth unknown)
    const OLD_TOP = -0.65, OLD_H = 1.5;
    for (const t of OLD) {
      add('tanks', cylGeo(0.635, OLD_H, t.x, t.y, OLD_TOP - OLD_H), t.material, { en: t.en, th: t.th, tag: t.tag, tagTh: t.tagTh, kind: 'tank',
        info: lines([t.en1, t.en2, t.id === 3 ? 'The older Caltex station plan (2025 DWG) tags it item 15: 1,000 L grease trap MG-1000F.' : 'The older Caltex station plan (2025 DWG) tags it item 30: 2,500 L aerated treatment tank MC-2500F, which would be larger than the 1.27 m circle drawn. Check on site.', 'Round tank 1.27 m across on the plan with a 0.47 m opening. Its depth is not on the drawings: shown 1.5 m high with its top 0.65 m below ground, so that the new pipes drawn over it pass above it.'],
          [t.th1, t.th2, t.id === 3 ? 'ผังสถานี Caltex ฉบับเก่า (DWG ปี 2025) ระบุเป็นรายการ 15: บ่อดักไขมัน 1,000 ลิตร MG-1000F' : 'ผังสถานี Caltex ฉบับเก่า (DWG ปี 2025) ระบุเป็นรายการ 30: ถังบำบัดชนิดเติมอากาศ 2,500 ลิตร MC-2500F ซึ่งน่าจะใหญ่กว่าวงกลม 1.27 ม. ที่เขียนไว้ ต้องตรวจสอบหน้างาน', 'ถังกลมกว้าง 1.27 ม. ตามผัง มีช่องเปิด 0.47 ม. ไม่มีความลึกในแบบ: แสดงสูง 1.5 ม. หลังถังต่ำกว่าพื้น 0.65 ม. เพื่อให้ท่อใหม่ที่เขียนทับถังอยู่เหนือถัง'], P) }, V(t.x - 0.75, t.y + 0.3, 0.7));
      add('tanks', cylGeo(0.235, 0 - OLD_TOP, t.x, t.y, OLD_TOP), t.material, { en: `${t.en} access`, th: `ช่องเปิด ${t.th}`, nopick: 1 });
      add('tanks', cylGeo(0.26, 0.03, t.x, t.y, 0), 'cover', { en: `${t.en} cover`, th: `ฝา ${t.th}`, nopick: 1 });
    }

    // ---------- new 4" pipes (sheet A route and arrows, sheet B levels)
    const cleanout = (x, y, level, o) => {
      add('sewer', cylGeo(0.05, 0 - (level + 0.1), x, y, level + 0.1, 12), 'sewerRaw', o, o.tag ? V(x + 0.5, y, 0.5) : null);
      add('sewer', cylGeo(0.09, 0.03, x, y, 0, 12), 'cover', { en: 'Clean-out cap', th: 'ฝาช่องล้างท่อ', nopick: 1 });
    };
    const W = TANKS[0], E = TANKS[1];
    const a = pipe('sewer', [[26.593, 28.33, START_A], [26.593, 20.75], [26.593, 20.44], [26.40, 20.25], [21.40, 20.25], [20.39, 19.25, IN], [20.195, 19.054, IN]], 0.05, 'sewerRaw', {
      en: 'New 4" pipe: old tank 1 (office toilet) to the new west tank', th: 'ท่อใหม่ 4 นิ้ว: จากถังเดิมใบที่ 1 (ห้องน้ำสำนักงาน) ไปถังใหม่ฝั่งตะวันตก', tag: 'From existing tank 1 (toilet)', tagTh: 'จากถังเดิม 1 (ห้องน้ำ)', tagAt: [23.6, 20.25], kind: 'pipe', flow: 1,
      info: (m) => lines(
        [`PVC 4" (W-PVC 4"). Starts at a clean-out (FCO 4") drawn at the centre of existing treatment tank 1, runs south along the east wall of the building, turns west along the south wall (0.25 m off the building line) and enters the new west tank from the north-east. About ${one(m)} m on the plan. The arrows follow the arrows on the plan.`,
          `Underside of pipe, from the "Station Office" section of the slope sheet: ${lv(START_A)} at the start and ${lv(IN)} into the new tank. Levels in between are spread evenly along the route.`,
          `The drawings do not agree on the fall: the plan says 1:200; the slope sheet says about 1:30 over a 10.72 m run; the written levels over the plan route give about 1:${ratio(m, START_A - IN)}. Check on site.`,
          'On the plan this pipe is drawn straight over the middle of existing tank 2 and the existing grease trap. Check on site how it really passes them.'],
        [`ท่อ PVC 4 นิ้ว (W-PVC 4") เริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ที่เขียนไว้กลางถังบำบัดเดิมใบที่ 1 เดินลงใต้ตามผนังด้านตะวันออกของอาคาร เลี้ยวไปตะวันตกตามผนังด้านใต้ (ห่างแนวอาคาร 0.25 ม.) แล้วเข้าถังใหม่ฝั่งตะวันตกจากด้านตะวันออกเฉียงเหนือ ยาวประมาณ ${one(m)} ม. ตามผัง ลูกศรเป็นไปตามลูกศรในผัง`,
          `ระดับท้องท่อจากรูปตัด "Station Office" ในแบบความลาดท่อ: ${lv(START_A)} ที่จุดเริ่ม และ ${lv(IN)} เข้าถังใหม่ ระดับระหว่างทางเฉลี่ยตามความยาวท่อ`,
          `แบบระบุความลาดไม่ตรงกัน: ผังระบุ 1:200 แบบความลาดท่อระบุประมาณ 1:30 ในระยะ 10.72 ม. ส่วนระดับที่เขียนไว้เมื่อคิดตามแนวท่อในผังได้ประมาณ 1:${ratio(m, START_A - IN)} ต้องตรวจสอบหน้างาน`,
          'ในผัง ท่อเส้นนี้เขียนทับกลางถังบำบัดเดิมใบที่ 2 และถังดักไขมันเดิม ต้องตรวจสอบหน้างานว่าท่อผ่านถังทั้งสองอย่างไร'], D) });
    const b = pipe('sewer', [[26.941, 26.69, START_B], [26.941, 20.42], [26.941, 20.10], [26.75, 19.903], [25.53, 19.903], [24.93, 19.36], [24.925, 19.08, IN], [24.925, 18.80, IN]], 0.05, 'sewerRaw', {
      en: 'New 4" pipe: old tank 2 (grease trap side) to the new east tank', th: 'ท่อใหม่ 4 นิ้ว: จากถังเดิมใบที่ 2 (ฝั่งถังดักไขมัน) ไปถังใหม่ฝั่งตะวันออก', tag: 'From existing tank 2 (grease trap)', tagTh: 'จากถังเดิม 2 (ถังดักไขมัน)', tagAt: [26.94, 24.0], kind: 'pipe', flow: 1,
      info: (m) => lines(
        [`PVC 4" (W-PVC 4"). Starts at a clean-out (FCO 4") on the east side of existing treatment tank 2, runs south along the east wall beside the other new pipe, turns west and enters the new east tank from the north. About ${one(m)} m on the plan. The arrows follow the arrows on the plan.`,
          `Underside of pipe, from the "Insurance Shop" section of the slope sheet (which shows the pipe leaving the "existing grease trap"): ${lv(START_B)} at the start and ${lv(IN)} into the new tank.`,
          `The drawings do not agree on the fall: the plan says 1:200; the slope sheet says about 1:100; the written levels over the plan route give about 1:${ratio(m, START_B - IN)}, which is nearly flat. Check on site.`,
          'On the plan this pipe is drawn over the east part of the existing grease trap. Check on site how it really passes it.'],
        [`ท่อ PVC 4 นิ้ว (W-PVC 4") เริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ด้านตะวันออกของถังบำบัดเดิมใบที่ 2 เดินลงใต้ตามผนังด้านตะวันออกคู่กับท่อใหม่อีกเส้น เลี้ยวไปตะวันตกแล้วเข้าถังใหม่ฝั่งตะวันออกจากด้านเหนือ ยาวประมาณ ${one(m)} ม. ตามผัง ลูกศรเป็นไปตามลูกศรในผัง`,
          `ระดับท้องท่อจากรูปตัด "Insurance Shop" ในแบบความลาดท่อ (ซึ่งแสดงท่อออกจาก "ถังดักไขมันเดิม"): ${lv(START_B)} ที่จุดเริ่ม และ ${lv(IN)} เข้าถังใหม่`,
          `แบบระบุความลาดไม่ตรงกัน: ผังระบุ 1:200 แบบความลาดท่อระบุประมาณ 1:100 ส่วนระดับที่เขียนไว้เมื่อคิดตามแนวท่อในผังได้ประมาณ 1:${ratio(m, START_B - IN)} ซึ่งเกือบราบ ต้องตรวจสอบหน้างาน`,
          'ในผัง ท่อเส้นนี้เขียนทับด้านตะวันออกของถังดักไขมันเดิม ต้องตรวจสอบหน้างานว่าท่อผ่านถังอย่างไร'], D) });
    const fco = (g, i, where, whereTh, drawn) => {
      const [x, y, l] = g.levels[i];
      cleanout(x, y, l, { en: `Clean-out FCO 4" · ${where}`, th: `ช่องล้างท่อ FCO 4 นิ้ว · ${whereTh}`, kind: 'pipe', ...(drawn ? { lvl: lv(l) } : {}),   // the level written on the slope sheet
        info: lines([drawn ? `Floor clean-out marked "FCO 4"" on the plan, where the new pipe joins the existing system ("connect to the existing wastewater system"). Underside of pipe here ${lv(l)}, as written on the slope sheet.`
          : `Floor clean-out marked "FCO 4"" on the plan, just before the pipe turns west. Underside of pipe here about ${lv(Math.round(l * 100) / 100)}, worked out between the two written levels.`],
          [drawn ? `ช่องล้างท่อที่พื้น ระบุ "FCO 4"" ในผัง เป็นจุดที่ท่อใหม่ต่อกับระบบเดิม ("เชื่อมต่อระบบน้ำทิ้งเดิม") ระดับท้องท่อตรงนี้ ${lv(l)} ตามที่เขียนในแบบความลาดท่อ`
            : `ช่องล้างท่อที่พื้น ระบุ "FCO 4"" ในผัง อยู่ก่อนท่อเลี้ยวไปตะวันตก ระดับท้องท่อตรงนี้ประมาณ ${lv(Math.round(l * 100) / 100)} คำนวณระหว่างระดับที่เขียนไว้สองจุด`], drawn ? D : P) });
    };
    fco(a, 0, 'start of the pipe to new tank W', 'จุดเริ่มท่อไปถังใหม่ W', true); fco(a, 1, 'pipe to new tank W, at the corner', 'ท่อไปถังใหม่ W ที่มุมอาคาร', false);
    fco(b, 0, 'start of the pipe to new tank E', 'จุดเริ่มท่อไปถังใหม่ E', true); fco(b, 1, 'pipe to new tank E, at the corner', 'ท่อไปถังใหม่ E ที่มุมอาคาร', false);

    const outlet = (t, pts, mh) => pipe('sewer', pts, 0.05, 'sewerTreated', { en: `Treated water: new ${t.en} tank to manhole ${mh}`, th: `น้ำที่บำบัดแล้ว: จากถังใหม่${t.th}ไปบ่อพัก ${mh}`, tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe', flow: 1,
      info: (m, lev) => lines([`PVC 4", "slope 1:200" on the plan. Leaves the ${t.outAt.en} side of the new ${t.en} tank and runs to manhole ${mh}${mh === 'MH-4' ? ' (marked "existing manhole")' : ''}. About ${one(m)} m. The arrows follow the arrows on the plan.`,
        `No level is written for this pipe. Shown leaving the tank at about ${lv(OUT)} (0.05 m below the inlet) and reaching the manhole at about ${lv(Math.round(lev[lev.length - 1][2] * 100) / 100)} at 1:200.`],
        [`ท่อ PVC 4 นิ้ว ผังระบุ "Slope 1:200" ออกจากด้าน${t.outAt.th}ของถังใหม่${t.th} ไปบ่อพัก ${mh}${mh === 'MH-4' ? ' (ระบุว่า "บ่อพักเดิม")' : ''} ยาวประมาณ ${one(m)} ม. ลูกศรเป็นไปตามลูกศรในผัง`,
          `ไม่มีระดับของท่อเส้นนี้ในแบบ แสดงออกจากถังที่ประมาณ ${lv(OUT)} (ต่ำกว่าท่อเข้า 0.05 ม.) ถึงบ่อพักที่ประมาณ ${lv(Math.round(lev[lev.length - 1][2] * 100) / 100)} ด้วยความลาด 1:200`], P) });
    const fall = (pts) => { let l = OUT; return pts.map((p, i) => { if (i) l -= Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) / 200; return [p[0], p[1], l]; }); };
    outlet(W, [[19.177, 18.036, OUT], ...fall([[18.98, 17.84], [17.20, 15.87]])], 'MH-5');
    outlet(E, [[24.925, 17.364, OUT], ...fall([[24.925, 17.08], [24.90, 16.867], [22.38, 15.70]])], 'MH-4');

    // ---------- old pipes at the old tanks (dotted on the plan, arrows as drawn); levels assumed
    const oldPipe = (pts, en, th, flow = 1, material = 'sewerRaw') => pipe('sewer', pts, 0.04, material, { en, th, kind: 'pipe', flow,
      info: lines(['Existing pipe, drawn as a dotted line on the plan' + (flow ? ' with an arrow showing the flow.' : '; no arrow, so the direction of flow is not shown (taken as flowing into the tank).'), 'No size or level on the drawings: the depth shown is assumed. The plan does not say whether the old outlets to manhole MH-1 were cut off when the new pipes were connected: check on site.'],
        ['ท่อเดิม เขียนเป็นเส้นประในผัง' + (flow ? ' มีลูกศรแสดงทิศทางไหล' : ' ไม่มีลูกศร จึงไม่ทราบทิศทางไหล (ถือว่าไหลเข้าถัง)'), 'ไม่มีขนาดหรือระดับในแบบ: ความลึกที่แสดงเป็นค่าสมมติ ผังไม่ได้ระบุว่าท่อออกเดิมที่ไปบ่อพัก MH-1 ถูกตัดออกหรือไม่เมื่อต่อท่อใหม่ ต้องตรวจสอบหน้างาน'], P) });
    oldPipe([[25.45, 28.32, -0.30], [26.36, 28.32, -0.32]], 'Existing pipe: office toilet to old tank 1', 'ท่อเดิม: จากห้องน้ำสำนักงานเข้าถังเดิมใบที่ 1');
    oldPipe([[26.59, 30.17, -0.30], [26.59, 28.56, -0.32]], 'Existing pipe from the under-sink grease trap into old tank 1', 'ท่อเดิมจากถังดักไขมันใต้อ่างเข้าถังเดิมใบที่ 1', 0);
    oldPipe([[26.82, 28.32, -0.36], [27.31, 28.32, -0.38]], 'Existing outlet: old tank 1 to manhole MH-1', 'ท่อออกเดิม: จากถังเดิมใบที่ 1 ไปบ่อพัก MH-1', 1, 'sewerTreated');
    oldPipe([[26.96, 27.12, START_B], [27.44, 28.01, START_B - 0.02]], 'Existing outlet: old tank 2 to manhole MH-1', 'ท่อออกเดิม: จากถังเดิมใบที่ 2 ไปบ่อพัก MH-1', 1, 'sewerTreated');
    oldPipe([[26.59, 25.42, -0.50], [26.59, 26.45, -0.52]], 'Existing pipe: grease trap to old tank 2', 'ท่อเดิม: จากถังดักไขมันเข้าถังเดิมใบที่ 2');
    oldPipe([[25.50, 25.16, -0.44], [26.35, 25.16, -0.46]], 'Existing pipe: shop building to the grease trap', 'ท่อเดิม: จากอาคารร้านค้าเข้าถังดักไขมัน');

    // ---------- site drains, manholes, the 3-compartment trap and the way out to the public drain
    for (const [id, [x, y]] of Object.entries(MH)) {
      const l = drainLevel(id);
      add('drains', boxGeo(0.6, 0.6, SUMP_DEPTH, x, y, -SUMP_DEPTH, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, kind: 'manhole',   // no `lvl`: no pipe level is written at any manhole
       
        info: lines(['Manhole (drain sump) 0.60 m square on the plan. Its top is the datum of the drawings: ±0.00 ("BM 0.0 top of drain sump").', MH_NOTE[id].en,
          `Shown ${SUMP_DEPTH.toFixed(2)} m deep, as the drain sump is drawn (not dimensioned) on the slope sheet. No pipe levels are written at the manholes: the drain is shown at about ${lv(l)}, which is an assumption.`],
          ['บ่อพักขนาด 0.60 ม. ตามผัง ระดับหลังบ่อเป็นระดับอ้างอิงของแบบ: ±0.00 ("BM 0.0 Top of Drain Sump")', MH_NOTE[id].th,
            `แสดงลึก ${SUMP_DEPTH.toFixed(2)} ม. ตามที่เขียนบ่อพักไว้ในแบบความลาดท่อ (ไม่มีตัวเลขกำกับ) ไม่มีระดับท่อที่บ่อพักในแบบ: แสดงท่อระบายน้ำที่ประมาณ ${lv(l)} ซึ่งเป็นค่าสมมติ`], P) });
      add('drains', boxGeo(0.5, 0.5, 0.03, x, y, 0, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    }
    const node = (n, extra = 0) => (typeof n === 'string' ? [...MH[n], drainLevel(n)] : [n[0], n[1], n[2] ?? drainLevel(n[3], extra)]);
    const drainRun = (nodes, en, th, more) => pipe('drains', nodes.map((n) => node(n, n[4])), 0.15, 'drain', { en: `Site drain: ${en}`, th: `ท่อระบายน้ำ: ${th}`, kind: 'drain',
      info: (m) => lines([`Existing site drain, a dashed line on the plan. About ${one(m)} m. ${more.en}`, 'No pipe size, level or flow arrow is on the drawings. Shown as a 0.30 m pipe falling 1:200 towards the 3-compartment trap (the only outfall on the sheet), from an assumed -1.00 at the trap. Check on site.'],
        [`ท่อระบายน้ำเดิมของสถานี เขียนเป็นเส้นประในผัง ยาวประมาณ ${one(m)} ม. ${more.th}`, 'ไม่มีขนาดท่อ ระดับ หรือลูกศรทิศทางไหลในแบบ แสดงเป็นท่อ 0.30 ม. ลาด 1:200 ไปทางบ่อดักไขมัน 3 ตอน (จุดปล่อยน้ำจุดเดียวในแบบ) จากระดับสมมติ -1.00 ที่บ่อดัก ต้องตรวจสอบหน้างาน'], P) });
    drainRun([[27.61, 30.14, null, 'MH-1', 1.82], 'MH-1', 'MH-2', 'MH-3', 'MH-4', [...TRAP_AT, TRAP_IN]], 'east side and behind the new tanks, to the trap', 'ด้านตะวันออกและหลังถังใหม่ ไปบ่อดัก',
      { en: 'Runs down the east boundary (MH-1, MH-2), west past the building corner (MH-3), then south between the two new tanks (MH-4) into the trap.', th: 'เดินลงตามแนวเขตด้านตะวันออก (MH-1, MH-2) ไปทางตะวันตกผ่านมุมอาคาร (MH-3) แล้วลงใต้ระหว่างถังใหม่สองใบ (MH-4) เข้าบ่อดัก' });
    drainRun(['MH-6', 'MH-5', 'MH-4'], 'west of the building to MH-4', 'ด้านตะวันตกของอาคารไป MH-4',
      { en: 'From MH-6 south to MH-5, then east to MH-4. The stretch MH-5 to MH-4 carries the treated water of the new west tank.', th: 'จาก MH-6 ลงใต้ถึง MH-5 แล้วไปตะวันออกถึง MH-4 ช่วง MH-5 ถึง MH-4 รับน้ำที่บำบัดแล้วจากถังใหม่ฝั่งตะวันตก' });
    drainRun(['MH-7', 'MH-5'], 'exit driveway (MH-7) to MH-5', 'จากทางออก (MH-7) ไป MH-5',
      { en: 'Diagonal line from MH-7 at the exit driveway to MH-5. Which way it flows is not shown.', th: 'แนวทแยงจาก MH-7 ที่ทางออกไป MH-5 ไม่ทราบทิศทางไหล' });
    drainRun(['MH-8', 'MH-7'], 'across the exit driveway (MH-8 to MH-7)', 'ข้ามทางออก (MH-8 ถึง MH-7)',
      { en: 'Drawn with a different symbol (a solid line between two dashed lines) across the exit driveway: probably a grated channel or a pipe crossing.', th: 'เขียนด้วยสัญลักษณ์ต่างออกไป (เส้นทึบระหว่างเส้นประสองเส้น) ข้ามทางออก: น่าจะเป็นรางระบายน้ำฝาตะแกรงหรือท่อลอดทาง' });
    drainRun([[5.43, 30.12, null, 'MH-10', 4.92], 'MH-10', 'MH-9', 'MH-8'], 'west side (MH-10, MH-9) to MH-8', 'ด้านตะวันตก (MH-10, MH-9) ไป MH-8',
      { en: 'Comes from the north, off the sheet, down the west side to MH-9 and diagonally to MH-8. Which way it flows is not shown.', th: 'มาจากด้านเหนือนอกแบบ ลงตามด้านตะวันตกถึง MH-9 แล้วทแยงไป MH-8 ไม่ทราบทิศทางไหล' });
    drainRun([[3.81, 12.88, null, 'MH-8', 3.96], 'MH-8'], 'branch west of MH-8', 'แนวแยกด้านตะวันตกของ MH-8',
      { en: 'Runs west from MH-8 along the south boundary, off the sheet. Which way it flows is not shown.', th: 'เดินจาก MH-8 ไปทางตะวันตกตามแนวเขตด้านใต้ออกนอกแบบ ไม่ทราบทิศทางไหล' });
    drainRun([[3.79, 25.20, null, 'MH-10', 1.64], 'MH-10'], 'branch west of MH-10', 'แนวแยกด้านตะวันตกของ MH-10',
      { en: 'Runs west from MH-10, off the sheet. Which way it flows is not shown.', th: 'เดินจาก MH-10 ไปทางตะวันตกออกนอกแบบ ไม่ทราบทิศทางไหล' });

    const TRAP = { x: 22.09, y: 13.965, w: 0.90, d: 2.53, depth: 1.5 };
    add('drains', boxGeo(TRAP.w, TRAP.d, TRAP.depth, TRAP.x, TRAP.y, -TRAP.depth, 0), 'oilTrap', { en: 'Existing 3-compartment grease trap (grating covers)', th: 'บ่อดักไขมัน 3 ตอน เดิม (ฝาตะแกรง)', tag: '3-compartment trap', tagTh: 'บ่อดักไขมัน 3 ตอน', kind: 'manhole',
      info: lines(['Existing three-compartment trap with grating covers, just inside the south boundary: about 0.90 × 2.53 m on the plan. It is the last stop before the public drain.',
        'Everything in this corner ends up here: the two new 3,000 L tanks (through MH-5 and MH-4) and the site drains. This is the place to check or sample what leaves this corner of the site.',
        'Its depth and pipe levels are not on the drawings: shown 1.50 m deep with the drain coming in at about -1.00 (assumed).'],
        ['บ่อดักไขมัน 3 ตอนเดิม ฝาตะแกรง อยู่ชิดแนวเขตด้านใต้ ขนาดประมาณ 0.90 × 2.53 ม. ตามผัง เป็นจุดสุดท้ายก่อนลงท่อระบายน้ำสาธารณะ',
          'น้ำทั้งหมดของมุมนี้มารวมที่นี่: ถังใหม่ 3,000 ลิตรทั้งสองใบ (ผ่าน MH-5 และ MH-4) และท่อระบายน้ำของสถานี เป็นจุดสำหรับตรวจหรือเก็บตัวอย่างน้ำที่ออกจากมุมนี้ของสถานี',
          'ไม่มีความลึกและระดับท่อในแบบ: แสดงลึก 1.50 ม. ท่อระบายน้ำเข้าที่ประมาณ -1.00 (ค่าสมมติ)'], P) }, V(TRAP.x + 0.2, TRAP.y, 0.7));
    add('drains', merge([[14.80, 0.80], [13.93, 0.80], [13.095, 0.73]].map(([y, d]) => boxGeo(0.82, d, 0.03, TRAP.x, y, 0, 0))), 'cover', { en: 'Trap gratings', th: 'ฝาตะแกรงบ่อดัก', nopick: 1 });
    pipe('drains', [[TRAP.x, 12.70, -1.02], [TRAP.x, 10.55, -1.03]], 0.15, 'drain', { en: 'Connection to the public drain', th: 'ท่อเชื่อมต่อกับท่อระบายน้ำสาธารณะ', tag: 'To the public drain', tagTh: 'ไปท่อสาธารณะ', kind: 'drain', flow: 1,
      info: lines(['The plan shows only an arrow from the trap south across the site boundary, marked "connect to the public drain system". About 2 m is shown here.', 'Pipe size, level and the position of the public drain are not on the drawing: the pipe shown (0.30 m, about -1.02) is an assumption.'],
        ['ผังแสดงเพียงลูกศรจากบ่อดักลงใต้ข้ามแนวเขตที่ดิน ระบุว่า "เชื่อมต่อกับระบบท่อสาธารณะ" ในโมเดลแสดงประมาณ 2 ม.', 'ไม่มีขนาดท่อ ระดับ และตำแหน่งท่อสาธารณะในแบบ: ท่อที่แสดง (0.30 ม. ที่ประมาณ -1.02) เป็นค่าสมมติ'], P) });

    // ---------- air supply and electrical
    add('air', boxGeo(0.48, 1.0, 0.6, 26.16, 21.65, 0, 0), 'airPump', { en: 'Air supply system for the new tanks', th: 'ระบบเติมอากาศของถังใหม่', tag: 'Air supply', tagTh: 'ระบบเติมอากาศ', kind: 'air',
      info: lines(['Marked "air supply system" on the plan: two units in a dashed box against the east wall of the building, beside the two new 4" pipes.', 'The air pipes from here to the two tanks are not drawn on the plan, so they are not in the model. The size of the box is assumed.'],
        ['ในผังระบุ "ระบบเติมอากาศ": อุปกรณ์ 2 ชุดในกรอบเส้นประชิดผนังด้านตะวันออกของอาคาร ข้างท่อใหม่ 4 นิ้วสองเส้น', 'ผังไม่ได้เขียนท่อลมจากจุดนี้ไปถังทั้งสองใบ จึงไม่มีในโมเดล ขนาดกล่องเป็นค่าสมมติ'], P) }, V(26.16, 21.65, 1.2));
    pipe('air', [[26.15, 22.15, -0.3], [26.15, 24.20, -0.3]], 0.02, 'cover', { en: 'Power cable to the air supply system', th: 'สายไฟไประบบเติมอากาศ', kind: 'air',
      info: lines(['NYY 4 sq.mm with G-NYY 2.5 sq.mm earth in 3/4" IMC conduit, "connected to the existing system". Drawn from the air supply north along the east wall; the plan cuts it off after about 2 m.', 'Whether it is buried or fixed to the wall is not stated: shown 0.3 m below ground (assumed).'],
        ['สาย NYY 4 ตร.มม. พร้อมสายดิน G-NYY 2.5 ตร.มม. ในท่อ IMC 3/4 นิ้ว "ต่อระบบเดิม" เขียนจากระบบเติมอากาศขึ้นเหนือตามผนังด้านตะวันออก ผังตัดเส้นไว้หลังประมาณ 2 ม.', 'ไม่ได้ระบุว่าฝังดินหรือยึดผนัง: แสดงต่ำกว่าพื้น 0.3 ม. (ค่าสมมติ)'], P) });
    pipe('air', [[24.40, 15.50, -0.6], [25.63, 15.55, -0.6], [26.44, 18.25, -0.6]], 0.04, 'cover', { en: 'Underground electrical main', th: 'สายไฟฟ้าหลักใต้ดิน', tag: 'Underground power cable', tagTh: 'สายไฟใต้ดิน', kind: 'air',
      info: lines(['Marked "Underground Electrical Main" on the plan: from the electric pole and transformer to the safety switch, passing within about 1 m of the new east tank and its outlet pipe.', 'No depth is given: shown 0.6 m below ground (assumed). Find and mark it on site before digging here.'],
        ['ในผังระบุ "Underground Electrical Main": จากเสาไฟฟ้าและหม้อแปลงไปสวิตช์นิรภัย ผ่านใกล้ถังใหม่ฝั่งตะวันออกและท่อออกของถังในระยะประมาณ 1 ม.', 'ไม่มีความลึกในแบบ: แสดงต่ำกว่าพื้น 0.6 ม. (ค่าสมมติ) ต้องหาแนวและทำเครื่องหมายหน้างานก่อนขุดบริเวณนี้'], P) });
    add('air', boxGeo(0.55, 0.46, 0.7, 26.50, 18.25, -0.5, 0), 'cover', { en: 'Safety switch and electrical sump', th: 'สวิตช์นิรภัยและบ่อพักสายไฟ', tag: 'Safety switch', tagTh: 'สวิตช์นิรภัย', kind: 'air',
      info: lines(['Marked "Safety Switch & Electrical Sump" on the plan, about 0.4 m east of the east tank slab. The underground electrical main ends here.', 'Size and depth are assumed.'],
        ['ในผังระบุ "Safety Switch & Electrical Sump" ห่างจากฐานถังฝั่งตะวันออกไปทางตะวันออกประมาณ 0.4 ม. สายไฟฟ้าหลักใต้ดินมาสิ้นสุดที่นี่', 'ขนาดและความลึกเป็นค่าสมมติ'], P) }, V(27.3, 18.0, 0.7));
    add('air', cylGeo(0.12, 1.5, 24.40, 15.30, 0, 12), 'column', { en: 'Electric pole and transformer', th: 'เสาไฟฟ้าและหม้อแปลง', tag: 'Electric pole', tagTh: 'เสาไฟฟ้า', kind: 'building',
      info: lines(['Marked "Electric pole & Transformer" on the plan, south of the east tank. Shown as a short post so that it does not hide the tanks; its real height is not on the drawing.'], ['ในผังระบุ "Electric pole & Transformer" อยู่ทางใต้ของถังฝั่งตะวันออก แสดงเป็นเสาสั้นเพื่อไม่ให้บังถัง ไม่มีความสูงจริงในแบบ'], C) }, V(24.4, 15.3, 2.1));

    // ---------- building (context)
    const building = (poly, h, o) => add('buildings', prismGeo(poly, 0, h), 'building', { ...o, kind: 'building', info: lines(o.lines, o.linesTh, C) }, V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, h + 0.7));
    // ---------- sales building (context): south part from SN-01, north end from the Robinson site plan
    building([[19.55, 20.50], [25.92, 20.50], [25.92, 47.49], [19.55, 47.49]], 3.6, { en: 'Caltex sales building (shop, office, toilets)', th: 'อาคารสถานีบริการ Caltex (ร้านค้า สำนักงาน ห้องน้ำ)', tag: 'Sales building', tagTh: 'อาคารร้านค้า',
      lines: ['The south part is the "sales room / shop building" of the wastewater sheet SN-01, with the office toilet at its south-east corner (its waste goes east through the wall into existing treatment tank 1). The building carries on north to the toilets at about 27 m long; the north end is taken from the Robinson site plan (2025 DWG), where it is marked CALTEX Office, Coffee and toilets (M., W.), floor +1.00.',
        'The station plan in the same DWG draws a roof over a walkway along the west side; it is not shown. Height assumed.'],
      linesTh: ['ส่วนใต้คือ "อาคารห้องขาย/ร้านค้า" ในแบบงานน้ำเสีย SN-01 มีห้องน้ำสำนักงานที่มุมตะวันออกเฉียงใต้ (น้ำเสียออกทางตะวันออกผ่านผนังเข้าถังบำบัดเดิมใบที่ 1) อาคารต่อไปทางเหนือถึงห้องน้ำ ยาวประมาณ 27 ม. ปลายด้านเหนือใช้ตามผังโครงการโรบินสัน (DWG ปี 2025) ซึ่งระบุ CALTEX Office, Coffee และห้องน้ำชาย/หญิง ระดับพื้น +1.00',
        'ผังสถานีใน DWG เดียวกันเขียนหลังคาคลุมทางเดินด้านตะวันตกไว้ ไม่ได้แสดงในโมเดล ความสูงเป็นค่าสมมติ'] });

    // =================================================================================================================
    // THE REST OF THE STATION (26 Nov 2026), from the station plan inside Brian's 2025 DWG "Layout As Built งานถังบำบัด 3,000 ลิตร
    // (โรบินสันเพชรบุรี).dwg": the Caltex station layout with its legend (items 1 to 45, T1 to T4) and its drainage plan (block
    // San-001). Placed by a plain shift (see make-lines.py); it agrees with SN-01 within about 0.2 m at every manhole both show.
    // That plan is older than the 2024 work, has no levels and does not number the sumps: MH-11 and up are this model's numbers.
    const st = (en, th, kind) => (kind === C ? notes(en, th, kind) : notes([...en, PLAN.en], [...th, PLAN.th], kind));
    const L200 = (lvl, m) => Math.round((lvl + m / 200) * 100) / 100;        // 1:200 back up the pipe from a known level

    // ---- sumps (station plan: item 17 = sump with steel grating, item 19 = sump with sealed concrete cover)
    const NEW_MH = {
      'MH-11': [27.61, 38.62, 17], 'MH-12': [27.61, 48.02, 17], 'MH-13': [27.61, 54.13, 17],
      'MH-14': [17.87, 57.20, 17], 'MH-15': [8.40, 60.17, 17], 'MH-16': [-1.06, 63.15, 17], 'MH-17': [-10.53, 66.13, 17], 'MH-18': [-17.51, 67.87, 17],
      'MH-19': [-17.21, 57.68, 17], 'MH-20': [-17.21, 48.79, 17], 'MH-21': [-15.29, 43.03, 17], 'MH-22': [-15.29, 34.43, 17], 'MH-23': [-15.29, 25.23, 17],
      'MH-24': [-15.29, 16.63, 17], 'MH-25': [-16.90, 12.70, 17], 'MH-26': [-11.27, 12.70, 17], 'MH-27': [-0.67, 12.58, 17],
      'MH-28': [5.43, 35.50, 19], 'MH-29': [5.43, 44.90, 19], 'MH-30': [0.52, 24.90, 19], 'MH-31': [0.52, 35.50, 19], 'MH-32': [0.52, 44.90, 19],
      'MH-33': [17.00, 33.52, 17], 'MH-34': [17.00, 42.12, 17], 'MH-35': [17.00, 47.06, 17],
    };
    const MHL = {};   // pipe level at each new sump that a 0.30 m pipe leaves from (assumed, 1:200 from the existing drains)
    const J = { east: [27.61, 30.14, drainLevel('MH-1', 1.82)], canopy: [5.43, 30.12, drainLevel('MH-10', 4.92)], island: [3.79, 25.20, drainLevel('MH-10', 1.64)], front: [3.81, 12.88, drainLevel('MH-8', 3.96)] };
    const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    MHL['MH-11'] = L200(J.east[2], d2(NEW_MH['MH-11'], J.east)); MHL['MH-12'] = L200(MHL['MH-11'], 9.40);
    MHL['MH-28'] = L200(J.canopy[2], d2(NEW_MH['MH-28'], J.canopy)); MHL['MH-29'] = L200(MHL['MH-28'], 9.40);
    MHL['MH-31'] = L200(MHL['MH-28'], 4.91); MHL['MH-32'] = L200(MHL['MH-29'], 4.91); MHL['MH-30'] = L200(J.island[2], 3.31);
    MHL['MH-27'] = L200(J.front[2], d2(NEW_MH['MH-27'], J.front)); MHL['MH-26'] = L200(MHL['MH-27'], 10.6);
    MHL['MH-35'] = -0.60; MHL['MH-34'] = -0.62;
    for (const [id, [x, y, item]] of Object.entries(NEW_MH)) {
      const sealed = item === 19, depth = sealed ? 1.0 : 0.8, l = MHL[id];
      add('drains', boxGeo(0.6, 0.6, depth, x, y, -depth, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, kind: 'manhole',
        info: st([sealed ? 'Sump with a sealed concrete cover (station plan item 19), at the pump islands.' : 'Sump with a steel grating (station plan item 17) on the drain around the station.',
          'The number is this model\'s, not the drawing\'s. 0.60 m square as the other sumps; the depth is not on any drawing: shown ' + depth.toFixed(1) + ' m deep.' + (l != null ? ` The 0.30 m pipe is shown leaving at about ${lv(l)} (assumed, 1:200 from the existing drains).` : '')],
        [sealed ? 'บ่อพักฝาปิด คสล. ปิดตาย (รายการ 19 ในผังสถานี) อยู่ที่เกาะจ่ายน้ำมัน' : 'บ่อพักฝาตะแกรงเหล็ก (รายการ 17 ในผังสถานี) บนรางระบายน้ำรอบสถานี',
          'หมายเลขบ่อเป็นของโมเดล ไม่ใช่ของแบบ ขนาด 0.60 ม. เท่าบ่ออื่น ไม่มีความลึกในแบบ: แสดงลึก ' + depth.toFixed(1) + ' ม.' + (l != null ? ` แสดงท่อ 0.30 ม. ออกที่ประมาณ ${lv(l)} (ค่าสมมติ ลาด 1:200 จากท่อระบายน้ำเดิม)` : '')], P) });
      add('drains', boxGeo(0.5, 0.5, 0.03, x, y, 0, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    }
    const P_ = (id) => [NEW_MH[id][0], NEW_MH[id][1]];
    // ---- 0.30 m concrete drain pipes (station plan item 23), levels assumed
    const newPipe = (pts, en, th, more) => pipe('drains', pts, 0.15, 'drain', { en: `Site drain: ${en}`, th: `ท่อระบายน้ำ: ${th}`, kind: 'drain', flow: 1,
      info: (m) => st([`0.30 m concrete drain pipe, buried (station plan item 23), about ${one(m)} m. ${more.en}`, 'No levels on the station plan: shown falling 1:200 towards the existing drains of the corner model. Check on site.'],
        [`ท่อระบายน้ำ คสล. 0.30 ม. ฝังใต้ดิน (รายการ 23 ในผังสถานี) ยาวประมาณ ${one(m)} ม. ${more.th}`, 'ผังสถานีไม่มีระดับ: แสดงลาด 1:200 ไปทางท่อระบายน้ำเดิมของมุมที่มีในโมเดล ต้องตรวจสอบหน้างาน'], P) });
    newPipe([[...P_('MH-12'), MHL['MH-12']], [...P_('MH-11'), MHL['MH-11']], J.east], 'east side, MH-12 to MH-11 and on to MH-1', 'ด้านตะวันออก จาก MH-12 ถึง MH-11 แล้วต่อไป MH-1',
      { en: 'Runs down the east boundary beside the sales building and joins the drain to MH-1, MH-2 and the trap.', th: 'เดินลงตามแนวเขตด้านตะวันออกข้างอาคาร ต่อกับท่อไป MH-1, MH-2 และบ่อดัก' });
    newPipe([[...P_('MH-29'), MHL['MH-29']], [...P_('MH-28'), MHL['MH-28']], J.canopy], 'east edge of the canopy, MH-29 to MH-28 and on to MH-10', 'ขอบตะวันออกของหลังคาคลุมหัวจ่าย จาก MH-29 ถึง MH-28 แล้วต่อไป MH-10',
      { en: 'Along the east edge of the canopy, taking the three pump-island sumps.', th: 'เดินตามขอบตะวันออกของหลังคาคลุมหัวจ่าย รับน้ำจากบ่อพักที่เกาะจ่ายทั้งสามเกาะ' });
    newPipe([[...P_('MH-31'), MHL['MH-31']], [5.43, 35.2, MHL['MH-28']]], 'middle pump island to MH-28', 'จากเกาะจ่ายกลางไป MH-28', { en: 'From the sealed sump at the middle pump island.', th: 'จากบ่อพักฝาปิดที่เกาะจ่ายกลาง' });
    newPipe([[...P_('MH-32'), MHL['MH-32']], [5.43, 45.2, MHL['MH-29']]], 'north pump island to MH-29', 'จากเกาะจ่ายด้านเหนือไป MH-29', { en: 'From the sealed sump at the north pump island.', th: 'จากบ่อพักฝาปิดที่เกาะจ่ายด้านเหนือ' });
    newPipe([[...P_('MH-30'), MHL['MH-30']], J.island], 'south pump island to the MH-10 branch', 'จากเกาะจ่ายด้านใต้ไปแนวท่อ MH-10',
      { en: 'From the sealed sump at the south pump island; joins the branch that runs west from MH-10.', th: 'จากบ่อพักฝาปิดที่เกาะจ่ายด้านใต้ ต่อกับแนวท่อที่แยกจาก MH-10 ไปทางตะวันตก' });
    newPipe([[...P_('MH-26'), MHL['MH-26']], [...P_('MH-27'), MHL['MH-27']], J.front], 'along the road, MH-26 to MH-27 and on to MH-8', 'ตามแนวถนน จาก MH-26 ถึง MH-27 แล้วต่อไป MH-8',
      { en: 'Along the south boundary behind the road kerb, past the entry driveway, joining the branch west of MH-8.', th: 'ตามแนวเขตด้านใต้หลังขอบถนน ผ่านทางเข้า ต่อกับแนวท่อด้านตะวันตกของ MH-8' });
    newPipe([[...P_('MH-35'), MHL['MH-35']], [...P_('MH-34'), MHL['MH-34']]], 'north end of the building, MH-35 to MH-34', 'ปลายเหนือของอาคาร จาก MH-35 ถึง MH-34',
      { en: 'Short pipe on the channel west of the building.', th: 'ท่อสั้นบนแนวรางด้านตะวันตกของอาคาร' });

    // ---- open V-channels at the surface (station plan item 20) and the narrow 8" channel at the road (item 22)
    const channel = (ids, en, th, item = 20) => {
      const pts = ids.map((p) => (typeof p === 'string' ? P_(p) : p)), parts = [];
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay); len += L;
        parts.push(boxGeo(L, item === 22 ? 0.22 : 0.30, item === 22 ? 0.22 : 0.25, (ax + bx) / 2, (ay + by) / 2, item === 22 ? -0.22 : -0.25, Math.atan2(by - ay, bx - ax) * 180 / Math.PI));
      }
      add('drains', merge(parts), 'drain', { en: `Open channel: ${en}`, th: `รางระบายน้ำ: ${th}`, kind: 'drain',
        info: st([item === 22 ? `Narrow open channel made from an 8" pipe (station plan item 22), about ${one(len)} m.` : `Open concrete V-channel (station plan item 20) at the surface, about ${one(len)} m, with grated sumps along it.`,
          'Shown 0.25 m deep at the surface; its fall is not on the drawings (the plan writes 1:200 along it).'],
        [item === 22 ? `รางเปิดปากแคบทำจากท่อ 8 นิ้ว (รายการ 22 ในผังสถานี) ยาวประมาณ ${one(len)} ม.` : `รางระบายน้ำ คสล. แบบเปิด (รางวี) (รายการ 20 ในผังสถานี) ที่ผิวพื้น ยาวประมาณ ${one(len)} ม. มีบ่อพักฝาตะแกรงเป็นระยะ`,
          'แสดงลึก 0.25 ม. ที่ผิวพื้น ไม่มีระดับความลาดในแบบ (ผังเขียนลาด 1:200)'], P) });
    };
    channel(['MH-13', [27.61, 48.62]], 'north-east corner, MH-13 to MH-12', 'มุมตะวันออกเฉียงเหนือ จาก MH-13 ถึง MH-12');
    channel(['MH-13', 'MH-14', 'MH-15', 'MH-16', 'MH-17', 'MH-18'], 'along the north boundary (Robinson side)', 'ตามแนวเขตด้านเหนือ (ฝั่งโรบินสัน)');
    channel(['MH-18', 'MH-19', 'MH-20', [-16.6, 46.0], 'MH-21', 'MH-22', 'MH-23', 'MH-24', [-16.0, 14.6], 'MH-25'], 'along the west boundary', 'ตามแนวเขตด้านตะวันตก');
    channel(['MH-25', [-11.57, 12.97]], 'at the road, MH-25 to MH-26', 'ริมถนน จาก MH-25 ถึง MH-26', 22);
    channel([[17.0, 22.83], 'MH-33', 'MH-34'], 'west side of the sales building, MH-6 to MH-34', 'ด้านตะวันตกของอาคาร จาก MH-6 ถึง MH-34');

    // ---- the grease trap under the sink and its pipe (station plan item 15a) and the 8,000 L tank (item 31)
    add('tanks', boxGeo(0.45, 0.35, 0.4, 25.25, 32.39, 0, 0), 'grease', { en: 'Grease trap under the sink (60 L, MK-60F)', th: 'ถังดักไขมันใต้อ่าง (60 ลิตร MK-60F)', tag: 'Under-sink grease trap', tagTh: 'ถังดักไขมันใต้อ่าง', kind: 'tank',
      info: st(['60 L grease trap under a sink inside the sales building (station plan item 15a: MK-60F). Its pipe runs east through the wall and south into existing treatment tank 1: this is the pipe that SN-01 shows coming "from the north, off the sheet".', 'Size from the model number; height and exact place assumed.'],
        ['ถังดักไขมันใต้อ่าง 60 ลิตรภายในอาคาร (รายการ 15a ในผังสถานี: MK-60F) ท่อออกไปทางตะวันออกผ่านผนังแล้วลงใต้เข้าถังบำบัดเดิมใบที่ 1: เป็นท่อที่ SN-01 แสดงว่า "มาจากด้านเหนือนอกแบบ"', 'ขนาดตามรุ่น ความสูงและตำแหน่งที่แน่นอนเป็นค่าสมมติ'], P) }, V(25.25, 32.39, 1.2));
    pipe('sewer', [[25.54, 32.39, -0.24], [26.59, 32.39, -0.26], [26.59, 30.17, -0.30]], 0.05, 'sewerRaw', { en: 'Existing pipe: under-sink grease trap to old tank 1', th: 'ท่อเดิม: จากถังดักไขมันใต้อ่างไปถังเดิมใบที่ 1', kind: 'pipe', flow: 1,
      info: st(['Drawn on the station plan from the under-sink grease trap east, then south along the building to existing treatment tank 1, where SN-01 picks it up.', 'Size and levels not on the drawings: shown as a 4" pipe just below ground (assumed).'],
        ['ผังสถานีเขียนจากถังดักไขมันใต้อ่างไปทางตะวันออก แล้วลงใต้ตามอาคารถึงถังบำบัดเดิมใบที่ 1 ซึ่ง SN-01 เขียนต่อ', 'ไม่มีขนาดและระดับในแบบ: แสดงเป็นท่อ 4 นิ้วใต้ผิวดิน (ค่าสมมติ)'], P) });
    {  // 8,000 L tank: place confirmed by Brian (26 Nov 2026); a lying capsule with 3 lids in a row along the building wall (his 2026 site video)
      const T8 = { x: 26.6, y: 43.5, dia: 2.0, len: 3.4, top: -0.45 }, axis = T8.top - T8.dia / 2;
      add('tanks', capsuleGeo(T8.dia / 2, T8.len, T8.x, T8.y, axis, 90), 'tankOlder', { en: 'Treatment tank 8,000 L (MC-08A) · 3 lids', th: 'ถังบำบัด 8,000 ลิตร (MC-08A) · ฝา 3 ใบ', tag: '8,000 L tank (toilets)', tagTh: 'ถัง 8,000 ลิตร (ห้องน้ำ)', kind: 'tank', lvl: lv(T8.top),
        info: st(['Aerated treatment tank of 8,000 L listed on the station plan (item 31: MC-08A), east of the toilets at the north end of the sales building, in the grass strip between the building wall and the hedge. It probably takes the toilets.',
          'Brian, 26 Nov 2026: this place is right; it is a lying capsule tank with 3 round lids in a row along the wall, as in his 2026 site video (two smaller lids and one larger).',
          `Size and depth are not on any drawing: shown ${T8.dia.toFixed(1)} m across and ${T8.len.toFixed(1)} m long (about 8 m³), lying north-south, top about ${lv(T8.top)}. The spacing and sizes of the lids are taken from the video, roughly.`],
        ['ถังบำบัดชนิดเติมอากาศ 8,000 ลิตร ตามผังสถานี (รายการ 31: MC-08A) อยู่ทางตะวันออกของห้องน้ำที่ปลายเหนือของอาคาร ในแนวหญ้าระหว่างผนังอาคารกับแนวพุ่มไม้ น่าจะรับน้ำจากห้องน้ำ',
          'Brian ยืนยัน 26 พ.ย. 2026: ตำแหน่งนี้ถูกต้อง เป็นถังแคปซูลแบบนอน มีฝากลม 3 ใบเรียงตามแนวผนัง ตามวิดีโอหน้างานปี 2026 (ฝาเล็ก 2 ใบ ฝาใหญ่ 1 ใบ)',
          `ไม่มีขนาดและความลึกในแบบ: แสดงกว้าง ${T8.dia.toFixed(1)} ม. ยาว ${T8.len.toFixed(1)} ม. (ประมาณ 8 ลบ.ม.) วางแนวเหนือ-ใต้ หลังถังประมาณ ${lv(T8.top)} ระยะและขนาดฝาประมาณจากวิดีโอ`], P) }, V(T8.x, T8.y, 1.2));
      for (const [dy, r] of [[-1.15, 0.40], [0, 0.32], [1.15, 0.32]]) {
        add('tanks', cylGeo(r - 0.05, -T8.top, T8.x, T8.y + dy, T8.top), 'tankOlder', { en: '8,000 L tank access riser', th: 'ปล่องเปิดถัง 8,000 ลิตร', nopick: 1 });
        add('tanks', cylGeo(r, 0.04, T8.x, T8.y + dy, 0), 'cover', { en: '8,000 L tank lid', th: 'ฝาถัง 8,000 ลิตร', nopick: 1 });
      }
      add('air', merge([boxGeo(0.45, 1.5, 0.12, 26.2, T8.y + 0.3, 0, 0), ...[-0.45, -0.15, 0.15, 0.45].map((d) => cylGeo(0.035, 0.35, 26.2, T8.y + 0.3 + d, 0.12, 10))]), 'airPump',
        { en: 'Air valves for the 8,000 L tank', th: 'วาล์วลมของถัง 8,000 ลิตร', tag: 'Air valves', tagTh: 'วาล์วลม', kind: 'air',
          info: notes(['Four air pipes with valves on a small concrete pad against the building wall beside the tank lids, and an electrical box on the wall next to them (Brian\'s 2026 site video). Positions and sizes are approximate.'],
            ['ท่อลม 4 ชุดพร้อมวาล์วบนแท่นคอนกรีตเล็กชิดผนังอาคารข้างฝาถัง และกล่องไฟฟ้าบนผนังข้างกัน (วิดีโอหน้างานปี 2026 ของ Brian) ตำแหน่งและขนาดโดยประมาณ'], C) }, V(26.2, T8.y + 0.3, 1.0));
    }

    // ---- fuel: four underground tanks T1 to T4 (legend), fill point, vents, pipes; pump islands and canopy
    const FUEL = [
      { id: 'T1', y: 60.43, label: 'T1 · B10', mh: [[-9.91, 60.43]], en: 'One compartment of 30,000 L, low-flammability fuel (diesel type). Product written on the plan: B10.', th: 'ช่องเดียว 30,000 ลิตร น้ำมันไวไฟน้อย (ประเภทดีเซล) ผลิตภัณฑ์ในผัง: B10' },
      { id: 'T2', y: 57.05, label: 'T2 · PD | B7', mh: [[-11.78, 57.05], [-8.03, 57.05]], en: 'Two compartments of 15,000 L (30,000 L), low-flammability fuel (diesel type). Products written on the plan: PD and B7.', th: '2 ช่อง ช่องละ 15,000 ลิตร (รวม 30,000 ลิตร) น้ำมันไวไฟน้อย (ประเภทดีเซล) ผลิตภัณฑ์ในผัง: PD และ B7' },
      { id: 'T3', y: 53.67, label: 'T3 · 95 | E20', mh: [[-11.78, 53.67], [-8.03, 53.67]], en: 'Two compartments of 15,000 L (30,000 L), high-flammability fuel (petrol type). Products written on the plan: 95 and E20.', th: '2 ช่อง ช่องละ 15,000 ลิตร (รวม 30,000 ลิตร) น้ำมันไวไฟมาก (ประเภทเบนซิน) ผลิตภัณฑ์ในผัง: 95 และ E20' },
      { id: 'T4', y: 50.29, label: 'T4 · G95', mh: [[-9.91, 50.29]], en: 'One compartment of 30,000 L, high-flammability fuel (petrol type). Product written on the plan: G95.', th: 'ช่องเดียว 30,000 ลิตร น้ำมันไวไฟมาก (ประเภทเบนซิน) ผลิตภัณฑ์ในผัง: G95' },
    ];
    for (const f of FUEL) {
      fuelTank(f.label, -9.85, f.y, 0, { en: [f.en, 'Position from the station plan (legend T1 to T4: the four tanks lie east-west, 3.4 m apart, north-west of the canopy).'], th: [f.th, 'ตำแหน่งตามผังสถานี (รายการ T1 ถึง T4: ถังสี่ใบวางแนวตะวันออก-ตะวันตก ห่างกัน 3.4 ม. ทางตะวันตกเฉียงเหนือของหลังคาคลุมหัวจ่าย)'] });
      for (const [x, y] of f.mh) {
        add('fuel', cylGeo(0.69, 1.0, x, y, -1.0), 'manhole', { en: `Tank ${f.id} manhole chamber`, th: `บ่อเปิดถัง ${f.id}`, nopick: 1 });
        add('fuel', cylGeo(0.72, 0.04, x, y, 0), 'cover', { en: `Tank ${f.id} manhole cover`, th: `ฝาบ่อถัง ${f.id}`, nopick: 1 });
      }
    }
    const fp = (list, r, level, en, th, enL, thL) => add('fuel', merge(list.map((pl) => pipeGeo(pl.map(([x, y]) => [x, y, level]), r).geometry)), 'fuelPipe', { en, th, kind: 'fuel', info: st(enL, thL, P) });
    fp(FILL, 0.05, -0.65, 'Fuel fill pipes (4")', 'ท่อเติมน้ำมันลงถัง (4 นิ้ว)',
      ['Six 4" fill pipes (station plan item 41), one to each tank compartment, from the fill point at the west boundary. Routes from the plan.', 'Depth not on the drawings: shown about 0.65 m below ground. Keep clear when digging; have them located on site.'],
      ['ท่อเติมน้ำมันลงถัง 4 นิ้ว 6 เส้น (รายการ 41 ในผังสถานี) ไปแต่ละช่องของถัง จากจุดเติมน้ำมันที่แนวเขตด้านตะวันตก แนวท่อตามผัง', 'ไม่มีความลึกในแบบ: แสดงต่ำกว่าพื้นประมาณ 0.65 ม. ต้องระวังเมื่อขุด และให้ตรวจหาแนวท่อหน้างาน']);
    fp(VENT, 0.04, -0.5, 'Fuel tank vent pipes (3")', 'ท่อระบายอากาศถังน้ำมัน (3 นิ้ว)',
      ['Six vent pipes (station plan item 42: 3" underground, 2" above ground), one from each tank compartment to the vent stack at the west boundary. Routes from the plan.', 'Depth not on the drawings: shown about 0.5 m below ground.'],
      ['ท่อระบายอากาศ 6 เส้น (รายการ 42 ในผังสถานี: 3 นิ้วใต้ดิน 2 นิ้วเหนือดิน) จากแต่ละช่องของถังไปท่อระบายอากาศที่แนวเขตด้านตะวันตก แนวท่อตามผัง', 'ไม่มีความลึกในแบบ: แสดงต่ำกว่าพื้นประมาณ 0.5 ม.']);
    fp(DISP, 0.03, -0.45, 'Fuel dispensing pipes (2") to the pump islands', 'ท่อจ่ายน้ำมัน (2 นิ้ว) ไปเกาะจ่าย',
      ['2" dispensing pipes (station plan item 43) from the tanks, curving south-east to the canopy and running under the three pump islands. Routes from the plan.', 'Depth not on the drawings: shown about 0.45 m below ground. They cross the area between the tanks and the canopy: locate them before any digging.'],
      ['ท่อจ่ายน้ำมัน 2 นิ้ว (รายการ 43 ในผังสถานี) จากถังโค้งไปทางตะวันออกเฉียงใต้ถึงหลังคาคลุมหัวจ่าย แล้วเดินใต้เกาะจ่ายทั้งสาม แนวท่อตามผัง', 'ไม่มีความลึกในแบบ: แสดงต่ำกว่าพื้นประมาณ 0.45 ม. ท่อผ่านพื้นที่ระหว่างถังกับหลังคา ต้องตรวจหาแนวก่อนขุด']);
    add('fuel', boxGeo(0.9, 3.5, 0.6, -16.40, 41.04, -0.6, 0), 'manhole', { en: 'Fuel fill point', th: 'จุดเติมน้ำมัน', tag: 'Fill point', tagTh: 'จุดเติมน้ำมัน', kind: 'fuel',
      info: st(['Fill point box at the west boundary where the tanker connects: the six fill pipes start here. Outline from the station plan; depth assumed.'], ['บ่อจุดเติมน้ำมันที่แนวเขตด้านตะวันตก สำหรับต่อรถขนส่งน้ำมัน ท่อเติม 6 เส้นเริ่มที่นี่ ขอบเขตตามผังสถานี ความลึกเป็นค่าสมมติ'], P) }, V(-16.4, 41.0, 1.0));
    add('fuel', merge(VENT.map((pl) => cylGeo(0.03, 4.0, -16.5, pl[0][1], 0, 8))), 'fuelPipe', { en: 'Vent stack', th: 'ท่อระบายอากาศเหนือดิน', tag: 'Vent pipes', tagTh: 'ท่อระบายอากาศ', kind: 'fuel',
      info: notes(['The six tank vent pipes rise beside the west boundary (station plan item 42). Height assumed (4 m).'], ['ท่อระบายอากาศของถังทั้ง 6 เส้นตั้งขึ้นข้างแนวเขตด้านตะวันตก (รายการ 42 ในผังสถานี) ความสูงเป็นค่าสมมติ (4 ม.)'], C) }, V(-16.5, 36.1, 4.6));
    const isl = [], disp = [], cols = [];
    for (const y of [23.60, 33.60, 43.60]) {
      isl.push(boxGeo(7.2, 1.24, 0.2, -0.57, y, 0, 0));
      for (const x of [-2.4, 2.0]) disp.push(boxGeo(1.1, 0.55, 1.9, x, y, 0.2, 0));
      cols.push(boxGeo(0.45, 0.30, 5.2, 0.2, y, 0.2, 0));
    }
    add('buildings', merge(isl), 'islands', { en: 'Pump islands', th: 'เกาะจ่ายน้ำมัน', tag: 'Pump islands', tagTh: 'เกาะจ่าย', kind: 'building',
      info: notes(['Three pump islands under the canopy, about 7.2 × 1.24 m, 10 m apart (station plan). The dispensers on them are shown as boxes; their number and size are assumed.'], ['เกาะจ่ายน้ำมัน 3 เกาะใต้หลังคา ขนาดประมาณ 7.2 × 1.24 ม. ห่างกัน 10 ม. (ผังสถานี) ตู้จ่ายแสดงเป็นกล่อง จำนวนและขนาดเป็นค่าสมมติ'], C) }, V(-3.2, 43.6, 2.6));
    add('buildings', merge(disp), 'islands', { en: 'Dispensers', th: 'ตู้จ่ายน้ำมัน', nopick: 1 });
    add('buildings', merge(cols), 'column', { en: 'Canopy columns', th: 'เสาหลังคาคลุมหัวจ่าย', nopick: 1 });
    add('buildings', boxGeo(9.4, 28.4, 0.8, 0.22, 33.61, 5.4, 0), 'roof', { en: 'Canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย', kind: 'building',
      info: notes(['Canopy over the pump islands, 9.4 × 28.4 m (station plan item 6), on one steel column per island. Height assumed (underside 5.4 m).'], ['หลังคาคลุมตู้จ่ายน้ำมัน 9.4 × 28.4 ม. (รายการ 6 ในผังสถานี) เสาเหล็กเกาะละ 1 ต้น ความสูงเป็นค่าสมมติ (ใต้หลังคา 5.4 ม.)'], C) }, V(0.22, 33.6, 7.0));

    // =================================================================================================================
    // SURROUNDINGS (layer "surroundings", can be switched off): Phetkasem Road and the Robinson Phetchaburi site around the station,
    // from the Robinson site plan in "01 Robinson Petchburi_Laou4.dwg". Flat, outlines traced from that plan, heights assumed.
    const KERB = 8.0, ROAD = -0.80;
    {  // flat ground from the road kerb to the edge of the site plan, with the station cut out
      const o = V(0, 0, 0), sh = new THREE.Shape([[-370, KERB], [170, KERB], [170, 330], [-370, 330]].map(([x, y]) => new THREE.Vector2(x + o.x, y - o.z)));
      sh.holes.push(new THREE.Path(STATION.map(([x, y]) => new THREE.Vector2(x + o.x, y - o.z))));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -0.06, 0);
      add('surroundings', g, 'surroundGround', { en: 'Robinson Phetchaburi site (shown flat)', th: 'พื้นที่โครงการโรบินสันเพชรบุรี (แสดงเป็นพื้นราบ)', nopick: 1 });
    }
    add('surroundings', prismGeo([[-370, -42], [170, -42], [170, KERB], [-370, KERB]], ROAD - 0.05, 0.05), 'road', { en: 'Phetkasem Road (Highway 4)', th: 'ถนนเพชรเกษม (ทางหลวงหมายเลข 4)', tag: 'Phetkasem Road', tagTh: 'ถนนเพชรเกษม', kind: 'building',
      info: notes(['Phetkasem Road in front of the station and Robinson: to Ratchaburi to the north (left on the plan) and to Cha-am to the south (right), as written on the site plan.', 'The site plan writes ±0.00 on the road and +0.80 on the station forecourt, so the road is shown 0.80 m below the station. Lanes and far edge are traced roughly.'],
        ['ถนนเพชรเกษมหน้าสถานีและโรบินสัน: ไปราชบุรีทางเหนือ (ด้านซ้ายของผัง) และไปชะอำทางใต้ (ด้านขวา) ตามที่เขียนในผังโครงการ', 'ผังโครงการเขียนระดับถนน ±0.00 และลานสถานี +0.80 จึงแสดงถนนต่ำกว่าสถานี 0.80 ม. ช่องจราจรและขอบถนนอีกฝั่งเป็นแนวโดยประมาณ'], C) }, V(-60, -15, 1.2));
    add('surroundings', boxGeo(540, 0.15, -ROAD, -100, KERB - 0.075, ROAD, 0), 'slab', { en: 'Road kerb', th: 'ขอบถนน', nopick: 1 });
    drawLines('surroundings', SURROUND.lines.map((l) => l.map((v) => v / 100)), 'surroundLine', (x, y) => (y < KERB ? ROAD + 0.02 : 0.02));
    const block = (poly, h, en, th, tag, tagTh, more) => add('surroundings', prismGeo(poly, 0, h), 'surroundBuilding', { en, th, tag, tagTh, kind: 'building',
      info: notes([more.en, 'Outline traced from the Robinson site plan; height assumed. For context only.'], [more.th, 'แนวอาคารตามผังโครงการโรบินสัน ความสูงเป็นค่าสมมติ ใช้ดูประกอบเท่านั้น'], C) },
      V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, h + 1.5));
    block([[-201.68, 226.37], [-7.68, 165.37], [-15.68, 129.37], [-27.68, 104.37], [-43.68, 88.37], [-50.68, 90.37], [-171.68, 124.37], [-221.68, 134.37], [-222.68, 166.37]], 14,
      'Robinson Phetchaburi shopping mall', 'ศูนย์การค้าโรบินสัน เพชรบุรี', 'Robinson Phetchaburi', 'โรบินสัน เพชรบุรี',
      { en: 'The main Robinson building north-west of the station, about 200 m long. Its nearest corner is about 30 m from the station\'s north boundary. Outline simplified.', th: 'อาคารหลักของโรบินสันทางตะวันตกเฉียงเหนือของสถานี ยาวประมาณ 200 ม. มุมที่ใกล้ที่สุดห่างจากแนวเขตด้านเหนือของสถานีประมาณ 30 ม. แนวอาคารแบบย่อ' });
    block([[-48.18, 24.37], [-31.18, 24.37], [-31.18, 43.67], [-48.18, 43.67]], 6, 'Building west of the station (drive-through lane)', 'อาคารทางตะวันตกของสถานี (มีช่องไดรฟ์ทรู)', 'Drive-through building', 'อาคารไดรฟ์ทรู',
      { en: 'Next building to the west, about 14 m from the station boundary, with a drive-through lane drawn along its east side. Not named on the plan.', th: 'อาคารถัดไปทางตะวันตก ห่างจากแนวเขตสถานีประมาณ 14 ม. มีช่องไดรฟ์ทรูเขียนไว้ด้านตะวันออก ผังไม่ได้ระบุชื่อ' });
    block([[-87.18, 28.97], [-68.28, 28.97], [-68.28, 46.37], [-87.18, 46.37]], 6, 'Building "POP"', 'อาคาร "POP"', 'POP', 'POP',
      { en: 'Small building marked POP on the site plan, further west along the road.', th: 'อาคารขนาดเล็กที่ผังเขียนว่า POP อยู่ถัดไปทางตะวันตกตามแนวถนน' });
    block([[15.82, 169.07], [30.62, 163.87], [22.62, 134.37], [7.82, 139.57]], 7, 'Car service', 'อาคารบริการรถยนต์', 'Car service', 'บริการรถยนต์',
      { en: 'Car service building, 15.6 × 29.3 m as written on the site plan, north of the station across the Robinson car park.', th: 'อาคารบริการรถยนต์ ขนาด 15.6 × 29.3 ม. ตามผังโครงการ อยู่ทางเหนือของสถานีอีกฝั่งของลานจอดรถโรบินสัน' });
    block([[37.82, 159.87], [44.82, 157.67], [38.32, 133.87], [31.32, 135.97]], 5, 'Car wash', 'อาคารล้างรถ', 'Car wash', 'ล้างรถ',
      { en: 'Car wash, 7 × 25 m as written on the site plan, beside the car service building.', th: 'อาคารล้างรถ ขนาด 7 × 25 ม. ตามผังโครงการ อยู่ข้างอาคารบริการรถยนต์' });
  },
};
