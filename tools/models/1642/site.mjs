// 1642 Phun Phon, Phuket (Phuket Phoonphol Energy, Phun Phon Road): what the 3D model shows.
// Built by tools/models/build.mjs into public/sites/models/1642.glb.
//
// Sources (Brian's folder Sites\1642 Phun Phon Phuket\03 Drawings\CAD, saved as DXF by Brian on 26 Nov 2026 into
// 03 Drawings\_Working\calwwt\cad\ and read with tools/models/dxf/dxf-flatten.py):
//   A  A-104 "แปลนตำแหน่งถังบำบัด และถังน้ำดี" (treatment tank and clean-water tank plan, 1:200): the whole site plan:
//      boundary, sales building, office, canopy and islands, four fuel tank outlines, every manhole and drain run, the
//      tanks (blocks "mc-12a_pl" on layer FIBERGLASS TANK, the strapped front tank, the round tanks) and three outlet pits.
//   B  A-103 "ผังแสดงระบบจ่ายน้ำประปา" (water supply, 1:200): same plan with the water pipes; legend: 20,000 L water storage
//      tank, Grundfos CMB5-46PT pump, HDPE 1" pipe. Floor levels +0.35 (shops, mart, toilets).
//   C  6-9 "แบบขยายถังบำบัด": the Bio-San catalogue sheet (all grease trap and aeration tank sizes); it does not say which
//      model is installed here.
//   From Brian (26 Nov 2026, from the site visit of 21 Nov): the clean-water tank is under the disabled parking bay beside the
//   building (two lids); the tank under the walkway behind the toilets (three lids) is the septic tank; the sales building is
//   two storeys, the office one storey; Aqua sampled both oil traps (entrance side and exit side) at their outlet pipe.
// Positions are the drawing's x, y in metres (1:200 sheet drawn in metres; checked against the written 40.95 m west side
// and the 10.00 m island spacing). Levels: ±0.00 at the two driveways (written on A-104); +0.35 floors; +0.40 at the front
// tank. NO PIPE LEVELS are on any sheet: every drain and wastewater pipe level here is assumed (rules below).
// North: the north arrow on A-104 points down and to the right of the sheet; Phun Phon Road is on the north-east side,
// which matches the satellite view Brian sent.
const D = 'drawn', P = 'part', C = 'context';
const COVER = 0.40, PIPE_D = 0.30, FALL = 1 / 200;   // assumed for every site drain (no sizes or levels on the drawings)

// Manholes (grated covers, block "ฝาบ่อตะแกรงเหล็ก" on A-104): id -> [x, y]
const MH = {
  B1: [1131.01, 5.92], B2: [1143.75, 5.93], B3: [1153.75, 5.93], B4: [1163.75, 5.93], B5: [1173.22, 5.93], B6: [1178.22, 5.93],
  B7: [1183.30, 5.93], B8: [1189.38, 5.93], B9: [1198.31, 5.93],
  W1: [1131.21, -1.81], W2: [1131.49, -12.40], W3: [1131.66, -19.20], W4: [1131.76, -23.00],
  E1: [1198.98, -4.66], E2: [1199.64, -15.24], E3: [1200.31, -25.82],
  S1: [1183.48, 3.04], S2: [1183.93, -3.97], S3: [1184.40, -11.45], S4: [1184.73, -16.67], S5: [1185.48, -28.54], S6: [1181.20, -28.81],
  F1: [1140.65, -34.04], F2: [1149.53, -34.04], F3: [1171.19, -34.04], F4: [1180.55, -34.04],
  O1: [1132.30, -15.60],
};
// Drain pits under the pump islands (drawn as small squares joined by the canopy drain)
const CP = { C10: [1161.26, -8.36], C5: [1157.23, -18.35], CM1: [1161.26, -18.35], C7: [1165.26, -18.35],
  C1: [1157.23, -28.37], CM2: [1161.26, -28.37], C3: [1165.26, -28.37], CF1: [1157.23, -31.35], CF2: [1165.26, -31.35] };
// The three outlet pits at the road (black filled rectangles on A-104, the oil-trap symbol): centre, size, rotation
const TRAPS = {
  W: { x: 1132.50, y: -32.32, w: 1.20, l: 3.40, rot: -1.5, outlet: [1132.45, -36.2], tag: 'Oil trap (entrance side)', tagTh: 'บ่อดักน้ำมัน (ฝั่งทางเข้า)', sampled: true,
    where: 'front-left corner, west of the entrance', whereTh: 'มุมหน้าซ้าย ด้านตะวันตกของทางเข้า' },
  E: { x: 1181.45, y: -32.33, w: 1.17, l: 3.40, rot: 0, outlet: [1181.45, -36.2], tag: 'Oil trap (exit side)', tagTh: 'บ่อดักน้ำมัน (ฝั่งทางออก)', sampled: true,
    where: 'in front of the sales building, east of the exit', whereTh: 'หน้าอาคารขาย ด้านตะวันออกของทางออก' },
  X: { x: 1200.77, y: -32.30, w: 1.40, l: 3.40, rot: -3.6, outlet: [1201.0, -36.2], tag: 'Outlet pit (east corner)', tagTh: 'บ่อทางออก (มุมตะวันออก)', sampled: false,
    where: 'front-right corner of the site', whereTh: 'มุมหน้าขวาของสถานี' },
};
const pt = (k) => MH[k] || CP[k];
// Drain runs in flow direction. A node is an id or [x, y]. The layout draws the runs as thick lines between the covers.
const RUNS = [
  { id: 'BW', nodes: ['B5', 'B4', 'B3', 'B2', 'B1', 'W1', 'W2', 'W3', 'W4', [1132.40, -30.62]], to: 'W', en: 'back boundary (west half) and west side to the entrance-side oil trap', th: 'แนวรั้วด้านหลัง (ครึ่งตะวันตก) และด้านตะวันตก ไปบ่อดักน้ำมันฝั่งทางเข้า',
    extra: { en: 'Between B2 and B6 the layout draws the back line as a double line (a channel or the wall footing); which way that part flows is not shown.', th: 'ช่วง B2 ถึง B6 ในผังเขียนแนวด้านหลังเป็นเส้นคู่ (รางหรือฐานกำแพง) ไม่ได้แสดงทิศการไหลของช่วงนั้น' } },
  { id: 'O', nodes: ['O1', 'W2'], en: 'office sink to the west-side drain', th: 'อ่างล้างที่สำนักงานไปท่อระบายน้ำด้านตะวันตก' },
  { id: 'FW', nodes: ['F2', 'F1', [1133.10, -33.90]], to: 'W', en: 'front edge, west part, to the entrance-side oil trap', th: 'แนวหน้าสถานี ช่วงตะวันตก ไปบ่อดักน้ำมันฝั่งทางเข้า' },
  { id: 'CS', nodes: ['C10', 'CM1', 'CM2'], en: 'canopy drain along the islands', th: 'ท่อระบายน้ำใต้หลังคาคลุมหัวจ่ายตามแนวแท่นหัวจ่าย' },
  { id: 'C5', nodes: ['C5', 'CM1'], en: 'canopy drain, island 5/6', th: 'ท่อระบายน้ำ แท่นหัวจ่าย 5/6' },
  { id: 'C7', nodes: ['C7', 'CM1'], en: 'canopy drain, island 7/8', th: 'ท่อระบายน้ำ แท่นหัวจ่าย 7/8' },
  { id: 'CW', nodes: ['CM2', 'C1', 'CF1', 'F2'], en: 'canopy drain to the front, west', th: 'ท่อระบายน้ำหลังคาคลุมหัวจ่ายไปด้านหน้า ฝั่งตะวันตก',
    extra: { en: 'At the front row of islands the arrows on the layout point both ways; the canopy drain is shown splitting to the two front corners of the canopy.', th: 'ที่แท่นหัวจ่ายแถวหน้า ลูกศรในผังชี้ทั้งสองทาง จึงแสดงท่อระบายน้ำแยกไปมุมหน้าทั้งสองด้านของหลังคา' } },
  { id: 'CE', nodes: ['CM2', 'C3', 'CF2', 'F3'], en: 'canopy drain to the front, east', th: 'ท่อระบายน้ำหลังคาคลุมหัวจ่ายไปด้านหน้า ฝั่งตะวันออก' },
  { id: 'FE', nodes: ['F3', 'F4', [1180.87, -33.60]], to: 'E', en: 'front edge, east part, to the exit-side oil trap', th: 'แนวหน้าสถานี ช่วงตะวันออก ไปบ่อดักน้ำมันฝั่งทางออก' },
  { id: 'SW', nodes: ['S5', 'S6', [1181.40, -30.64]], to: 'E', en: 'front of the sales building to the exit-side oil trap', th: 'หน้าอาคารขายไปบ่อดักน้ำมันฝั่งทางออก' },
  { id: 'S1', nodes: ['S1', 'B7'], en: 'walkway by the steps to the back drain', th: 'ทางเดินข้างบันไดไปท่อระบายน้ำด้านหลัง' },
  { id: 'S3', nodes: ['S3', 'S4'], en: 'walkway west of the shops', th: 'ทางเดินด้านตะวันตกของร้านค้า',
    extra: { en: 'Drawn as a short line between two covers with nothing joining it; check on site where it goes.', th: 'ในผังเป็นเส้นสั้นระหว่างฝาบ่อสองฝา ไม่ได้ต่อกับแนวอื่น ต้องตรวจสอบหน้างานว่าไปทางไหน' } },
  { id: 'BE', nodes: ['B6', 'B7', 'B8', 'B9', 'E1', 'E2', 'E3', [1200.60, -30.62]], to: 'X', en: 'back boundary (east half) and east side to the east-corner outlet pit', th: 'แนวรั้วด้านหลัง (ครึ่งตะวันออก) และด้านตะวันออก ไปบ่อทางออกมุมตะวันออก',
    extra: { en: 'Takes the outlet of the septic tank behind the toilets (at manhole B8).', th: 'รับน้ำออกจากถังบำบัดหลังห้องน้ำ (ที่บ่อพัก B8)' } },
];

// Finished levels: ±0.00 forecourt and driveways (A-104), +0.35 floors and walkways (A-103), +0.40 front lawn (A-104).
const GROUND = [
  ...[1134, 1142, 1150, 1158, 1166, 1174, 1180].flatMap((x) => [-33, -26, -18, -10, -2, 4].map((y) => [x, y, 0])),
  ...[[1186, 5], [1192, 6], [1197, 6], [1186, -6], [1190, -10], [1196, -12], [1187, -20], [1192, -24], [1197, -26], [1199.5, -14], [1199.8, -24], [1199, -4]].map(([x, y]) => [x, y, 0.35]),
  [1134, -14, 0.35], [1139, -15, 0.35], [1140, -13, 0.35],
  [1186, -31, 0.40], [1191, -32.5, 0.40], [1196, -31, 0.40], [1199, -29, 0.40], [1185, -33.5, 0.40],
];

export default {
  name: 'Phun Phon, Phuket',
  origin: [1165, -14],
  datum: { en: 'Levels are in metres from the drawing datum: ±0.00 is the forecourt at the two driveways. Shops, mart, toilets and walkways +0.35; the lawn at the front tank +0.40.', th: 'ระดับเป็นเมตรจากระดับอ้างอิงของแบบ: ±0.00 คือลานหน้าทางเข้าออกทั้งสอง ร้านค้า มินิมาร์ท ห้องน้ำ และทางเดิน +0.35 สนามหญ้าที่ถังด้านหน้า +0.40' },
  note: { en: 'First version, built from the site plan A-104 and the water plan A-103 (no pipe levels on either) and Brian\'s site visit of 21 Nov 2026. Check on site before any digging; not for setting out.', th: 'ฉบับแรก จัดทำจากผัง A-104 และผังระบบน้ำ A-103 (ทั้งสองแผ่นไม่มีระดับท่อ) และการสำรวจหน้างานของ Brian วันที่ 21 พ.ย. 2026 ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง' },
  built: '2026-11-26',
  // Drawing angle of north, anticlockwise from the sheet's +x: the A-104 north arrow points down-right (block rotated 224.6°).
  north: 314.6,
  boundary: [[1130.64, 6.69], [1199.10, 6.69], [1201.90, -34.30], [1131.70, -34.30]],
  ground: {
    bbox: [1124, -48, 1208, 12], step: 2, apron: 4, road: -0.10,
    roadArea: [[1124, -48], [1208, -48], [1208, -34.30], [1124, -34.30]],
    points: GROUND,
    names: { siteGround: { en: 'Forecourt and paving', th: 'ลานและพื้นผิว' }, road: { en: 'Phun Phon Road side and entrances', th: 'ด้านถนนพูนผลและทางเข้าออก' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'water', 'fuel', 'buildings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [1165, -82, 52], to: [1165, -16, 0] },
    { id: 'plan', from: [1165, -14.1, 150], to: [1165, -14, 0] },
    { id: 'septic', en: 'Septic tank behind the toilets', th: 'ถังบำบัดหลังห้องน้ำ', from: [1184, -6, 9], to: [1193.5, 5, -1] },
    { id: 'front', en: 'Front tank and exit-side oil trap', th: 'ถังด้านหน้าและบ่อดักน้ำมันฝั่งทางออก', from: [1176, -46, 11], to: [1187, -31, -1] },
    { id: 'water', en: 'Clean-water tank', th: 'ถังเก็บน้ำดี', from: [1172, -9, 7], to: [1182, 0, -1.5] },
    { id: 'office', en: 'Office tanks and entrance-side oil trap', th: 'ถังที่สำนักงานและบ่อดักน้ำมันฝั่งทางเข้า', from: [1146, -40, 12], to: [1134, -24, -1] },
    { id: 'fuel', from: [1152, -16, 8], to: [1138.5, -3.4, -1.8] },
    { id: 'under', from: [1150, -62, -11], to: [1168, -18, -0.5] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, prismGeo, pipeGeo, merge }) {
    const r2 = (n) => Math.round(n * 100) / 100;
    const lines = notes;   // (en lines, th lines, 'drawn' | 'part' | 'context')
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tag ? g.mid.clone().setY(g.mid.y + 0.6) : null); return g; };
    const lid = (x, y, top, r = 0.3, name = 'Lid', nameTh = 'ฝาถัง') => {
      const gm = ground(x, y);
      if (gm > top) add('tanks', cylGeo(r, gm - top, x, y, top), 'tank', { en: name, th: nameTh, nopick: 1 });
      add('tanks', cylGeo(r + 0.03, 0.03, x, y, Math.max(gm, top)), 'cover', { en: name, th: nameTh, nopick: 1 });
    };
    const ASSUMED_PIPE = { en: 'No pipe levels are on the drawings: the levels shown are assumed (pipe about 0.3 m below the tank top at the inlet, 0.1 m lower at the outlet, 4" pipe falling about 1:100).', th: 'ในแบบไม่มีระดับท่อ ระดับที่แสดงเป็นค่าสมมติ (ท่อเข้าต่ำกว่าหลังถังประมาณ 0.3 ม. ท่อออกต่ำกว่าท่อเข้า 0.1 ม. ท่อ 4 นิ้ว ลาดประมาณ 1:100)' };

    // ---------- septic tank under the walkway behind the toilets (A-104 block "mc-12a_pl", layer FIBERGLASS TANK; Brian: septic)
    {
      const x = 1193.82, y = 5.12, rot = 3.6, len = 6.9, r = 1.0, g0 = r2(ground(x, y)), top = r2(g0 - 0.30), axis = top - r, inL = r2(top - 0.25), outL = r2(inL - 0.10);
      add('tanks', capsuleGeo(r, len, x, y, axis, rot, 0.28), 'tank', { en: 'Septic tank behind the toilets', th: 'ถังบำบัดหลังห้องน้ำ', tag: 'Septic tank (toilets)', tagTh: 'ถังบำบัด (ห้องน้ำ)', kind: 'tank',
        info: lines([`Fibreglass septic tank for the toilets, lying under the tiled walkway between the toilet sinks and the back wall: about ${len.toFixed(1)} m long and 2.0 m across (outline on A-104), three lids.`,
          'The toilet pipe comes in at the east end; the outlet at the west end goes to the back drain at manhole B8.',
          `Ground (walkway) about ${lv(g0)} · top of tank about ${lv(top)} (assumed 0.30 m under the walkway) · pipe in about ${lv(inL)}, out about ${lv(outL)} (assumed).`,
          'The three round covers in the walkway (Brian\'s video of 21 Nov 2026) are its lids. The model of tank is not written on the drawing (block name "mc-12a").'],
        ['ถังบำบัดไฟเบอร์กลาสของห้องน้ำ วางนอนใต้ทางเดินปูกระเบื้องระหว่างอ่างล้างมือกับกำแพงด้านหลัง: ยาวประมาณ ' + len.toFixed(1) + ' ม. กว้าง 2.0 ม. (แนวจาก A-104) มีฝา 3 ฝา',
          'ท่อจากห้องน้ำเข้าที่ปลายด้านตะวันออก ท่อออกที่ปลายด้านตะวันตกไปท่อระบายน้ำด้านหลังที่บ่อพัก B8',
          `ระดับพื้น (ทางเดิน) ประมาณ ${lv(g0)} · หลังถังประมาณ ${lv(top)} (สมมติต่ำกว่าทางเดิน 0.30 ม.) · ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} (ค่าสมมติ)`,
          'ฝากลม 3 ฝาบนทางเดิน (วิดีโอของ Brian วันที่ 21 พ.ย. 2026) คือฝาของถังนี้ ในแบบไม่ได้ระบุรุ่นถัง (ชื่อบล็อก "mc-12a")'], P) }, V(x, y, g0 + 0.8));
      for (const [lx, ly] of [[1191.98, 5.01], [1193.48, 5.10], [1195.89, 5.26]]) lid(lx, ly, top, 0.3, 'Septic tank lid', 'ฝาถังบำบัด');
      pipe('sewer', [[1196.9, 3.0, inL + 0.12], [1198.0, 3.05], [1198.05, 5.0], [1197.35, 5.33, inL]], 0.05, 'sewerRaw', { en: 'Toilets to the septic tank', th: 'ท่อจากห้องน้ำเข้าถังบำบัด', kind: 'pipe',
        info: (m) => lines([`4" pipe from the toilets, out at the north-east corner and back west into the tank. About ${m} m.`, ASSUMED_PIPE.en], [`ท่อ 4 นิ้วจากห้องน้ำ ออกที่มุมตะวันออกเฉียงเหนือแล้ววกกลับไปทางตะวันตกเข้าถัง ยาวประมาณ ${m} ม.`, ASSUMED_PIPE.th], P) });
      pipe('sewer', [[1190.35, 4.95, outL], [1189.7, 4.95], [1189.45, 5.55, outL - 0.03]], 0.05, 'sewerTreated', { en: 'Septic tank outlet to the back drain', th: 'ท่อออกจากถังบำบัดลงท่อระบายน้ำด้านหลัง', kind: 'pipe',
        info: (m) => lines([`From the west end of the tank north into manhole B8 on the back drain. About ${m} m.`, ASSUMED_PIPE.en], [`จากปลายถังด้านตะวันตกขึ้นเหนือเข้าบ่อพัก B8 บนท่อระบายน้ำด้านหลัง ยาวประมาณ ${m} ม.`, ASSUMED_PIPE.th], P) });
    }

    // ---------- the strapped tank in the front lawn (A-104: three MH-600 lids, tie-down straps, FLEX 4" ends, "+0.40")
    {
      const x = 1191.46, y = -30.48, rot = 3.6, len = 5.0, r = 1.14, g0 = 0.40, top = r2(g0 - 0.30), axis = top - r, inL = r2(top - 0.25), outL = r2(inL - 0.10);
      add('tanks', capsuleGeo(r, len, x, y, axis, rot, 0.28), 'tank', { en: 'Treatment tank in the front lawn', th: 'ถังบำบัดในสนามหญ้าด้านหน้า', tag: 'Front tank', tagTh: 'ถังด้านหน้า', kind: 'tank',
        info: lines([`Lying tank in the lawn in front of the sales building, ${len.toFixed(1)} × 2.3 m outline on A-104 (about 18,000 L), three lids, strapped down to its base. Lawn level +0.40.`,
          'The pipe drawn into its east end comes down the east planter past the four round tanks beside the shops; its west end goes along the front of the building to the exit-side oil trap.',
          `Top of tank about ${lv(top)}, pipe in about ${lv(inL)}, out about ${lv(outL)} (assumed).`,
          'Not named on the drawing. Taken as the treatment tank for the shops and mart (after their grease traps): confirm on site.'],
        [`ถังนอนในสนามหญ้าหน้าอาคารขาย แนวใน A-104 ขนาด ${len.toFixed(1)} × 2.3 ม. (ประมาณ 18,000 ลิตร) มีฝา 3 ฝา ยึดกับฐานด้วยสายรัด ระดับสนามหญ้า +0.40`,
          'ท่อที่เข้าปลายด้านตะวันออกมาจากแนวกระบะต้นไม้ด้านตะวันออก ผ่านถังกลม 4 ถังข้างร้านค้า ปลายด้านตะวันตกไปตามหน้าอาคารถึงบ่อดักน้ำมันฝั่งทางออก',
          `หลังถังประมาณ ${lv(top)} ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} (ค่าสมมติ)`,
          'ในแบบไม่ได้ระบุชื่อ ถือว่าเป็นถังบำบัดของร้านค้าและมินิมาร์ท (หลังถังดักไขมัน) ต้องยืนยันหน้างาน'], P) }, V(x, y, g0 + 0.8));
      for (const [lx, ly] of [[1189.71, -30.59], [1191.21, -30.49], [1193.20, -30.37]]) lid(lx, ly, top, 0.3, 'Front tank lid', 'ฝาถังด้านหน้า');
      pipe('sewer', [[1198.85, -2.2, -0.05], [1198.95, -6.0], [1199.25, -10.4], [1199.95, -21.7], [1200.1, -27.0], [1199.95, -30.22], [1194.0, -30.40, inL]], 0.05, 'sewerRaw', { en: 'East planter pipe to the front tank', th: 'ท่อในกระบะต้นไม้ด้านตะวันออกไปถังด้านหน้า', kind: 'pipe',
        info: (m) => lines([`Thin line drawn down the east planter (past the four round tanks) and west into the front tank. About ${m} m.`, ASSUMED_PIPE.en], [`เส้นท่อเล็กที่เขียนลงตามกระบะต้นไม้ด้านตะวันออก (ผ่านถังกลม 4 ถัง) แล้วไปทางตะวันตกเข้าถังด้านหน้า ยาวประมาณ ${m} ม.`, ASSUMED_PIPE.th], P) });
      pipe('sewer', [[1188.9, -30.62, outL], [1185.75, -30.75], [1185.75, -29.45], [1181.7, -29.45], [1181.55, -30.55, outL - 0.12]], 0.05, 'sewerTreated', { en: 'Front tank outlet to the exit-side oil trap', th: 'ท่อออกจากถังด้านหน้าไปบ่อดักน้ำมันฝั่งทางออก', kind: 'pipe',
        info: (m) => lines([`West along the front of the building and into the exit-side oil trap. About ${m} m.`, ASSUMED_PIPE.en], [`ไปทางตะวันตกตามหน้าอาคารเข้าบ่อดักน้ำมันฝั่งทางออก ยาวประมาณ ${m} ม.`, ASSUMED_PIPE.th], P) });
    }

    // ---------- round tanks beside the shops (east planter) and at the office (Bio-San style symbol on A-104)
    [[1198.41, -2.77], [1198.61, -6.00], [1198.89, -10.39], [1199.61, -21.72]].forEach(([x, y], i) => {
      const g0 = ground(x, y);
      add('tanks', cylGeo(0.6, 1.3, x, y, g0 - 0.1 - 1.3), 'grease', { en: `Round tank ${i + 1} in the east planter`, th: `ถังกลม ${i + 1} ในกระบะต้นไม้ด้านตะวันออก`, ...(i === 0 ? { tag: 'Grease traps (shops)', tagTh: 'ถังดักไขมัน (ร้านค้า)' } : {}), kind: 'tank',
        info: lines([`Round tank in the planter along the east side of the shops (one of four), drawn with the Bio-San symbol. Shown 1.2 m across and 1.3 m deep (assumed).`, 'Most likely the grease trap of the shop or mart beside it; the drawing does not name it.'],
          [`ถังกลมในกระบะต้นไม้ด้านตะวันออกของร้านค้า (1 ใน 4 ถัง) เขียนด้วยสัญลักษณ์ Bio-San แสดงกว้าง 1.2 ม. ลึก 1.3 ม. (ค่าสมมติ)`, 'น่าจะเป็นถังดักไขมันของร้านค้าหรือมินิมาร์ทข้างเคียง ในแบบไม่ได้ระบุชื่อ'], P) }, i === 0 ? V(x, y, g0 + 0.8) : null);
      add('tanks', cylGeo(0.28, 0.03, x, y, g0), 'cover', { en: 'Round tank lid', th: 'ฝาถังกลม', nopick: 1 });
    });
    [[1134.67, -19.45, 'Office tank 1', 'ถังสำนักงาน 1', 'The office WC pipe comes in from the north; its outlet goes south-west to manhole W4 on the west drain.', 'ท่อจากห้องน้ำสำนักงานเข้าทางด้านเหนือ ท่อออกไปทางตะวันตกเฉียงใต้ลงบ่อพัก W4 บนท่อระบายน้ำด้านตะวันตก'],
      [1136.49, -20.39, 'Office tank 2', 'ถังสำนักงาน 2', 'A pipe from the office comes in from the north; no outlet pipe is drawn from it.', 'มีท่อจากสำนักงานเข้าทางด้านเหนือ ไม่ได้เขียนท่อออกจากถังนี้']].forEach(([x, y, en, th, n, nTh], i) => {
      const g0 = ground(x, y);
      add('tanks', cylGeo(0.82, 1.6, x, y, g0 - 0.1 - 1.6), 'tank', { en, th, ...(i === 0 ? { tag: 'Office tanks', tagTh: 'ถังสำนักงาน' } : {}), kind: 'tank',
        info: lines([`Round tank south of the office, 1.64 m across (outline on A-104), drawn with the Bio-San symbol; shown 1.6 m deep (assumed).`, n, 'Which Bio-San model is not written: sheet 6-9 is the catalogue of all sizes.'],
          [`ถังกลมด้านใต้ของสำนักงาน กว้าง 1.64 ม. (แนวจาก A-104) เขียนด้วยสัญลักษณ์ Bio-San แสดงลึก 1.6 ม. (ค่าสมมติ)`, nTh, 'ไม่ได้ระบุรุ่น Bio-San แผ่น 6-9 เป็นแค็ตตาล็อกทุกขนาด'], P) }, i === 0 ? V(x, y, g0 + 0.8) : null);
      add('tanks', cylGeo(0.28, 0.03, x, y, g0), 'cover', { en: 'Office tank lid', th: 'ฝาถังสำนักงาน', nopick: 1 });
    });
    pipe('sewer', [[1134.55, -17.65, -0.15], [1134.6, -18.7, -0.20]], 0.05, 'sewerRaw', { en: 'Office WC to office tank 1', th: 'ท่อจากห้องน้ำสำนักงานเข้าถังสำนักงาน 1', kind: 'pipe', info: lines(['Short 4" pipe from the office WC.', ASSUMED_PIPE.en], ['ท่อ 4 นิ้วสั้นๆ จากห้องน้ำสำนักงาน', ASSUMED_PIPE.th], P) });
    pipe('sewer', [[1136.5, -17.65, -0.15], [1136.5, -19.6, -0.20]], 0.05, 'sewerRaw', { en: 'Office to office tank 2', th: 'ท่อจากสำนักงานเข้าถังสำนักงาน 2', kind: 'pipe', info: lines(['Short 4" pipe from the office.', ASSUMED_PIPE.en], ['ท่อ 4 นิ้วสั้นๆ จากสำนักงาน', ASSUMED_PIPE.th], P) });
    pipe('sewer', [[1134.4, -20.25, -0.30], [1134.0, -21.2], [1132.0, -22.85, -0.40]], 0.05, 'sewerTreated', { en: 'Office tank 1 outlet to manhole W4', th: 'ท่อออกจากถังสำนักงาน 1 ลงบ่อพัก W4', kind: 'pipe',
      info: (m) => lines([`South-west into manhole W4 on the west drain. About ${m} m.`, ASSUMED_PIPE.en], [`ไปทางตะวันตกเฉียงใต้เข้าบ่อพัก W4 บนท่อระบายน้ำด้านตะวันตก ยาวประมาณ ${m} ม.`, ASSUMED_PIPE.th], P) });

    // ---------- clean-water tank under the disabled parking bay (A-104 block on the "Tank" layer; Brian: water tank)
    {
      const x = 1181.86, y = 0.13, rot = 93.6, len = 4.0, r = 1.25, g0 = r2(ground(x, y)), top = r2(g0 - 0.60), axis = top - r;
      add('water', capsuleGeo(r, len, x, y, axis, rot, 0.3), 'waterTank', { en: 'Clean-water tank under the disabled parking bay', th: 'ถังเก็บน้ำดีใต้ที่จอดรถคนพิการ', tag: 'Clean-water tank', tagTh: 'ถังเก็บน้ำดี', kind: 'tank',
        info: lines(['Underground clean-water storage tank (20,000 L on the A-103 legend), lying north-south under the disabled parking bay beside the steps at the back of the sales building, two lids.',
          `Outline on A-104 about 2.7 × 4.0 m; shown as a lying capsule 2.5 m across and ${len.toFixed(1)} m long. Water comes from the meter at the road in HDPE 1" pipe (A-103); pump Grundfos CMB5-46PT or equal.`,
          `Depth is not on the drawing: top shown 0.6 m below the parking (about ${lv(top)}).`, 'Not wastewater: shown because it is in the way of any digging here.'],
        ['ถังเก็บน้ำดีใต้ดิน (20,000 ลิตร ตามสัญลักษณ์ใน A-103) วางนอนแนวเหนือ-ใต้ใต้ที่จอดรถคนพิการ ข้างบันไดด้านหลังอาคารขาย มีฝา 2 ฝา',
          `แนวใน A-104 ประมาณ 2.7 × 4.0 ม. แสดงเป็นถังแคปซูลนอน กว้าง 2.5 ม. ยาว ${len.toFixed(1)} ม. น้ำมาจากมิเตอร์ที่ถนนด้วยท่อ HDPE 1 นิ้ว (A-103) ปั๊ม Grundfos CMB5-46PT หรือเทียบเท่า`,
          `ในแบบไม่มีความลึก แสดงหลังถังต่ำกว่าที่จอดรถ 0.6 ม. (ประมาณ ${lv(top)})`, 'ไม่ใช่ระบบน้ำเสีย แสดงไว้เพราะกีดขวางงานขุดบริเวณนี้'], P) }, V(x, y, g0 + 0.8));
      for (const [lx, ly] of [[1181.77, 1.46], [1181.94, -1.20]]) {
        add('water', cylGeo(0.29, g0 - top, lx, ly, top), 'waterTank', { en: 'Water tank lid', th: 'ฝาถังน้ำ', nopick: 1 });
        add('water', cylGeo(0.32, 0.03, lx, ly, g0), 'cover', { en: 'Water tank lid', th: 'ฝาถังน้ำ', nopick: 1 });
      }
    }

    // ---------- site drains (positions drawn; size, depth and fall assumed)
    const lvl = {};   // lowest invert reaching each manhole
    const done = [];
    for (const run of RUNS) {
      const pts = run.nodes.map((n) => (typeof n === 'string' ? [...pt(n), n] : [...n, null]));
      let L = r2(ground(pts[0][0], pts[0][1]) - COVER - PIPE_D);
      if (pts[0][2] && lvl[pts[0][2]] != null) L = lvl[pts[0][2]];
      const out = [[pts[0][0], pts[0][1], L]];
      for (let i = 1; i < pts.length; i++) {
        L = r2(L - Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * FALL);
        const id = pts[i][2]; if (id) { if (lvl[id] != null) L = Math.min(L, lvl[id]); }
        out.push([pts[i][0], pts[i][1], L]);
      }
      pts.forEach((p, i) => { if (p[2]) lvl[p[2]] = Math.min(lvl[p[2]] ?? Infinity, out[i][2]); });
      done.push({ run, out });
      if (run.to) TRAPS[run.to].inL = Math.min(TRAPS[run.to].inL ?? Infinity, out[out.length - 1][2]);
    }
    const rule = { en: `No sizes or levels are on the drawings: shown as ${PIPE_D.toFixed(2)} m pipe, top ${COVER.toFixed(2)} m below ground at the start of the run, falling 1:200 in the drawn direction.`, th: `ในแบบไม่มีขนาดและระดับ แสดงเป็นท่อ ${PIPE_D.toFixed(2)} ม. หลังท่อต่ำกว่าพื้น ${COVER.toFixed(2)} ม. ที่ต้นแนว ลาด 1:200 ตามทิศที่เขียนในผัง` };
    for (const { run, out } of done) {
      pipe('drains', out, PIPE_D / 2, 'drain', { en: `Site drain ${run.id}: ${run.en}`, th: `ท่อระบายน้ำ ${run.id}: ${run.th}`, kind: 'drain',
        info: (m) => lines([`About ${m} m, from about ${lv(out[0][2])} to about ${lv(out[out.length - 1][2])} (assumed).`, rule.en, ...(run.extra ? [run.extra.en] : [])],
          [`ยาวประมาณ ${m} ม. จากประมาณ ${lv(out[0][2])} ถึงประมาณ ${lv(out[out.length - 1][2])} (ค่าสมมติ)`, rule.th, ...(run.extra ? [run.extra.th] : [])], P) });
    }
    for (const [id, [x, y]] of Object.entries({ ...MH, ...CP })) {
      const l = lvl[id]; if (l == null) continue;
      const g0 = r2(ground(x, y)), small = id in CP, s = small ? 0.5 : 0.6, floor = r2(l - 0.15);
      add('drains', boxGeo(s, s, g0 - floor, x, y, floor, 0), 'manhole', { en: small ? `Island drain pit ${id}` : `Manhole ${id}`, th: small ? `บ่อพักที่แท่นหัวจ่าย ${id}` : `บ่อพัก ${id}`, lvl: lv(l), kind: 'manhole',
        info: lines([`Grated cover drawn on A-104. Ground about ${lv(g0)}; pipe level about ${lv(l)} (assumed, see the drain notes).`], [`ฝาตะแกรงตามผัง A-104 ระดับพื้นประมาณ ${lv(g0)} ระดับท่อประมาณ ${lv(l)} (ค่าสมมติ ดูหมายเหตุท่อระบายน้ำ)`], P) });
      add('drains', boxGeo(s + 0.1, s + 0.1, 0.03, x, y, g0, 0), 'cover', { en: 'Grated cover', th: 'ฝาตะแกรง', nopick: 1 });
    }

    // ---------- the three outlet pits at the road; both oil traps were sampled by Aqua on 21 Nov 2026 at the outlet side
    for (const t of Object.values(TRAPS)) {
      const g0 = r2(ground(t.x, t.y)), inL = r2(t.inL ?? -0.8), outL = r2(inL - 0.05), floor = r2(inL - 0.5);
      add('drains', boxGeo(t.w, t.l, g0 - floor, t.x, t.y, floor, t.rot), 'oilTrap', { en: `${t.tag} · ${t.where}`, th: `${t.tagTh} · ${t.whereTh}`, tag: t.tag, tagTh: t.tagTh, lvl: `${lv(inL)} / ${lv(outL)}`, kind: 'manhole',
        info: lines([`${t.sampled ? 'Oil-water separator (OWS) with steel gratings' : 'Outlet pit drawn with the same filled symbol as the two oil traps'}, ${t.w.toFixed(2)} × ${t.l.toFixed(2)} m outline on A-104, at the road edge; out to the public drain under the footpath.`,
          ...(t.sampled ? ['Aqua took the water sample here on 21 Nov 2026, at the outlet pipe side (Brian).'] : ['It takes the east-side drain (with the septic tank outlet). Brian names two oil traps on site (entrance and exit side): check whether this pit is a third trap or a plain sump.']),
          `Levels are not on the drawing: inlet about ${lv(inL)}, outlet about ${lv(outL)}, floor shown 0.5 m below the inlet (assumed). The grating detail is on sheet 6-9.`],
        [`${t.sampled ? 'บ่อแยกน้ำมัน (OWS) ฝาตะแกรงเหล็ก' : 'บ่อทางออกที่เขียนด้วยสัญลักษณ์ทึบแบบเดียวกับบ่อดักน้ำมันสองบ่อ'} แนวใน A-104 ขนาด ${t.w.toFixed(2)} × ${t.l.toFixed(2)} ม. อยู่ริมถนน ออกไปท่อระบายน้ำสาธารณะใต้ทางเท้า`,
          ...(t.sampled ? ['Aqua เก็บตัวอย่างน้ำที่นี่เมื่อ 21 พ.ย. 2026 ที่ฝั่งท่อออก (ตาม Brian)'] : ['รับท่อระบายน้ำด้านตะวันออก (รวมน้ำออกจากถังบำบัดหลังห้องน้ำ) Brian ระบุว่าหน้างานมีบ่อดักน้ำมันสองบ่อ (ฝั่งทางเข้าและทางออก) ต้องตรวจว่าบ่อนี้เป็นบ่อดักที่สามหรือบ่อพักธรรมดา']),
          `ในแบบไม่มีระดับ: ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} ก้นบ่อแสดงต่ำกว่าท่อเข้า 0.5 ม. (ค่าสมมติ) แบบตะแกรงอยู่ในแผ่น 6-9`], P) }, V(t.x, t.y, g0 + 0.9));
      pipe('drains', [[t.x, t.y - t.l / 2, outL], [...t.outlet, r2(outL - 0.02)]], 0.15, 'drain', { en: `${t.tag}: out to the public drain`, th: `${t.tagTh}: ออกท่อระบายน้ำสาธารณะ`, kind: 'drain',
        info: lines(['Drawn as an arrow from the pit to the road. Size and level assumed.'], ['ในผังเป็นลูกศรจากบ่อไปถนน ขนาดและระดับเป็นค่าสมมติ'], P) });
    }

    // ---------- underground fuel tanks: four 7.5 m outlines in the back-left yard; the middle two have two lids each
    [['T1', 1.68, 0], ['T2', -1.70, 1], ['T3', -5.08, 1], ['T4', -8.46, 0]].forEach(([label, y, two]) => fuelTank(label, 1138.45, y, 0, {
      en: two ? ['Drawn with two lids, so probably two compartments. Products are not written on A-104.'] : ['Products are not written on A-104.'],
      th: two ? ['เขียนมีฝา 2 ฝา จึงน่าจะแบ่ง 2 ช่อง ใน A-104 ไม่ได้ระบุชนิดน้ำมัน'] : ['ใน A-104 ไม่ได้ระบุชนิดน้ำมัน'] }));

    // ---------- buildings and canopy (context; heights from Street View and Brian's video, assumed)
    const building = (poly, floor, h, material, o) => add('buildings', prismGeo(poly, floor, h), material, { ...o, kind: 'building', info: lines(o.lines || [], o.linesTh || [], C) },
      o.tag ? V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, floor + h + 0.7) : null);
    const ground1 = [[1187.05, 3.10], [1197.30, 3.10], [1198.70, -23.30], [1199.30, -27.20], [1193.20, -27.30], [1193.00, -23.60], [1188.75, -23.60]];
    building(ground1, 0.35, 3.5, 'building', { en: 'Sales building, ground floor: toilets, two shops, mart, ATM', th: 'อาคารขาย ชั้นล่าง: ห้องน้ำ ร้านค้า 2 คูหา มินิมาร์ท ATM', tag: 'Sales building (2 storeys)', tagTh: 'อาคารขาย (2 ชั้น)',
      lines: ['Two storeys (Brian). Ground floor from the walls on A-103 / A-104: toilets at the back, then two shops and the mart, the ATM and stair at the road end. Floor +0.35.'], linesTh: ['อาคาร 2 ชั้น (ตาม Brian) ชั้นล่างตามผนังใน A-103 / A-104: ห้องน้ำด้านหลัง ร้านค้า 2 คูหา มินิมาร์ท ATM และบันไดด้านถนน พื้น +0.35'] });
    building([[1184.10, 3.40], [1197.30, 3.10], [1199.30, -27.20], [1185.70, -27.90]], 3.85, 3.2, 'building', { en: 'Sales building, upper floor and balcony', th: 'อาคารขาย ชั้นบนและระเบียง',
      lines: ['Upper floor over the ground floor and the walkway on its west side (balcony), as in Brian\'s video. Height assumed.'], linesTh: ['ชั้นบนคลุมชั้นล่างและทางเดินด้านตะวันตก (ระเบียง) ตามวิดีโอของ Brian ความสูงเป็นค่าสมมติ'] });
    building([[1183.40, 4.20], [1198.00, 3.80], [1200.10, -28.00], [1185.00, -28.70]], 7.05, 0.35, 'roof', { en: 'Sales building roof', th: 'หลังคาอาคารขาย' });
    building([[1132.95, -12.35], [1141.20, -12.35], [1141.20, -17.60], [1132.95, -17.60]], 0.35, 3.2, 'building', { en: 'Office (one storey)', th: 'สำนักงาน (ชั้นเดียว)', tag: 'Office', tagTh: 'สำนักงาน',
      lines: ['One storey (Brian). Office with a WC and a sink on the west side. Outline from A-104.'], linesTh: ['ชั้นเดียว (ตาม Brian) มีห้องน้ำและอ่างล้างด้านตะวันตก แนวจาก A-104'] });
    building([[1157.08, -2.34], [1165.38, -2.34], [1165.38, -10.47], [1169.91, -10.47], [1169.91, -30.60], [1152.58, -30.60], [1152.58, -10.47], [1157.08, -10.47]], 5.0, 0.9, 'roof',
      { en: 'Canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย', lines: ['T-shaped canopy over the five pump islands (outline dashed on A-104). Height assumed.'], linesTh: ['หลังคารูปตัว T คลุมแท่นหัวจ่าย 5 แท่น (เส้นประใน A-104) ความสูงเป็นค่าสมมติ'] });
    for (const [x0, x1, y] of [[1158.0, 1165.45, -6.5], [1153.98, 1169.40, -16.52], [1153.98, 1159.25, -26.54], [1164.21, 1169.41, -26.54]]) {
      add('buildings', boxGeo(x1 - x0, 1.2, 0.2, (x0 + x1) / 2, y, 0, 0), 'column', { en: 'Pump island', th: 'แท่นหัวจ่าย', nopick: 1 });
    }
    for (const [x, y, n] of [[1161.26, -6.5, '9/10'], [1157.23, -16.52, '5/6'], [1165.26, -16.52, '7/8'], [1157.23, -26.54, '1/2'], [1165.26, -26.54, '3/4']]) {
      add('buildings', boxGeo(1.0, 0.6, 2.0, x, y, 0.2, 0), 'column', { en: `Dispenser ${n}`, th: `ตู้จ่าย ${n}`, kind: 'building', info: lines([`Dispenser for pumps ${n} (numbers on A-104).`], [`ตู้จ่ายหัวจ่าย ${n} (หมายเลขตาม A-104)`], C) });
    }
  },
};
