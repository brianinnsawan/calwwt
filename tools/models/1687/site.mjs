// 1687 Phetchaburi (Caltex at Robinson Phetchaburi): what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/1687.glb.
//
// THE MODEL COVERS ONE CORNER OF THE STATION ONLY: the shop / sales building with the office toilet, the old tanks beside
// it, the two new 2,500 L aerated tanks south of it and the drains down to the public drain. Nothing else is on the drawings.
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
// Positions are metres on the sheet at 1:113.61 (x right, y up, from the bottom-left corner of the page).
// Levels are metres from BM 0.00 = top of the drain sump. The plan gives no ground levels: the ground is shown flat at 0.00.
// src: 'drawn' = position and levels from the drawings; 'part' = position from the drawing, size, depth or level assumed;
//      'context' = above-ground context only (heights assumed).
const D = 'drawn', P = 'part', C = 'context';
// Both sheets are design drawings: this line goes into the notes of every underground object, before the source line.
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
    en2: 'Before 2024 it discharged east to manhole MH-1. The new pipe to the west 2,500 L tank starts at a clean-out (FCO 4") drawn at the centre of this tank.', th2: 'ก่อนปี 2024 ปล่อยน้ำไปทางตะวันออกลงบ่อพัก MH-1 ท่อใหม่ไปถัง 2,500 ลิตรฝั่งตะวันตกเริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ที่เขียนไว้กลางถังนี้' },
  { id: 2, x: 26.59, y: 26.70, material: 'tankOlder', en: 'Existing treatment tank 2', th: 'ถังบำบัดเดิม ใบที่ 2', tag: 'Existing tank 2', tagTh: 'ถังบำบัดเดิม 2',
    en1: 'Takes the outflow of the existing grease trap (dotted pipe with an arrow pointing north into this tank).', th1: 'รับน้ำจากถังดักไขมันเดิม (ท่อเส้นประมีลูกศรชี้ขึ้นเหนือเข้าถังนี้)',
    en2: 'Before 2024 it discharged north-east to manhole MH-1. The new pipe to the east 2,500 L tank starts at a clean-out (FCO 4") on the east side of this tank.', th2: 'ก่อนปี 2024 ปล่อยน้ำไปทางตะวันออกเฉียงเหนือลงบ่อพัก MH-1 ท่อใหม่ไปถัง 2,500 ลิตรฝั่งตะวันออกเริ่มที่ช่องล้างท่อ (FCO 4 นิ้ว) ด้านตะวันออกของถังนี้' },
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

export default {
  name: 'Phetchaburi',
  origin: [22.5, 20],
  datum: { en: 'Levels are in metres from the drawing datum: BM ±0.00 = top of the drain sump (manhole top), from the pipe slope sheet. The plan gives no ground levels, so the ground is shown flat at ±0.00.', th: 'ระดับเป็นเมตรจากระดับอ้างอิงของแบบ: BM ±0.00 = ระดับหลังบ่อพัก (จากแบบความลาดท่อ) ผังไม่มีระดับพื้น จึงแสดงพื้นราบที่ ±0.00' },
  note: {
    en: 'First version. Shows ONLY ONE CORNER of the station (shop building, office toilet, existing tanks, the two new 2,500 L tanks and the drains to the public drain); the rest of the site is not on these drawings. Built from 2024 sheets stamped FOR CONSTRUCTION, not as-built: positions are as designed for the 2024 improvement and must be confirmed on site before any digging. Not for setting out. The north and west edges of the ground are only the edge of the drawing. The sheet has no north arrow and is plotted at about 1:114, not the 1:100 written on it (the model follows its scale bar).',
    th: 'ฉบับแรก แสดงเฉพาะมุมเดียวของสถานี (อาคารร้านค้า ห้องน้ำสำนักงาน ถังเดิม ถังใหม่ 2,500 ลิตร 2 ใบ และท่อระบายน้ำไปถึงท่อสาธารณะ) ส่วนอื่นของสถานีไม่มีในแบบชุดนี้ จัดทำจากแบบปี 2024 ที่ประทับตรา FOR CONSTRUCTION ไม่ใช่แบบก่อสร้างจริง: ตำแหน่งเป็นไปตามที่ออกแบบไว้สำหรับงานปรับปรุงปี 2024 ต้องยืนยันหน้างานก่อนขุดทุกครั้ง ห้ามใช้วางผัง ขอบพื้นด้านเหนือและตะวันตกเป็นเพียงขอบของแบบ แบบไม่มีลูกศรทิศเหนือ และพิมพ์ที่ประมาณ 1:114 ไม่ใช่ 1:100 ตามที่เขียนไว้ (โมเดลใช้ตามแถบมาตราส่วนในแบบ)',
  },
  built: '2026-11-25',
  // no north arrow on the sheet: `north` left out on purpose
  // South and east sides follow the red dashed site boundary on the plan; the north and west sides are the edge of the drawing.
  boundary: [[3.73, 12.44], [25.80, 12.55], [25.84, 13.63], [25.87, 14.25], [26.15, 15.49], [26.30, 16.30], [26.68, 17.29], [27.33, 18.84], [27.91, 19.94], [27.91, 30.20], [3.73, 30.20]],
  ground: {
    bbox: [1.5, 8, 31.5, 32], step: 2, apron: 5, road: 0,
    roadArea: [[1.5, 8], [31.5, 8], [31.5, 32], [1.5, 32]],
    points: [[22, 19, 0]],
    names: { siteGround: { en: 'Ground inside the drawn corner (shown flat)', th: 'พื้นภายในบริเวณที่มีในแบบ (แสดงเป็นพื้นราบ)' }, road: { en: 'Outside the boundary or beyond the drawing', th: 'นอกแนวเขตหรือนอกขอบเขตของแบบ' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'air', 'base', 'buildings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [13, -4, 20], to: [19, 19, -0.5] },
    { id: 'plan', from: [18, 20.2, 32], to: [18, 20.3, 0] },
    { id: 'new', en: 'New 2,500 L tanks', th: 'ถังใหม่ 2,500 ลิตร', from: [20.5, 8.5, 8], to: [22.3, 18.2, -0.8] },
    { id: 'old', en: 'Existing tanks at the toilet', th: 'ถังเดิมข้างห้องน้ำ', from: [34, 20.5, 7], to: [26.6, 25.5, -0.6] },
    { id: 'under', from: [13, 8, -5.5], to: [22.5, 19, -0.8] },
  ],

  build({ notes, V, ground, lv, add, boxGeo, cylGeo, latheGeo, prismGeo, pipeGeo, merge, THREE }) {
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

    // ---------- the two new 2,500 L tanks, their slabs and piles
    const slabs = [], piles = [];
    for (const t of TANKS) {
      const first = t.id === 'W';
      add('tanks', latheGeo(SHAPE, t.x, t.y, SLAB_TOP), 'tank', { en: `New 2,500 L treatment tank (${t.en}) · aerated`, th: `ถังบำบัดใหม่ 2,500 ลิตร (${t.th}) · ชนิดเติมอากาศ`, tag: `New 2,500 L tank (${t.en})`, tagTh: `ถังบำบัด 2,500 ลิตร (${t.th})`, lvl: lv(IN), kind: 'tank',
        info: lines(
          ['Aerated package treatment tank, one of the 2 new tanks of the 2024 improvement. The plan says 2,500 L; the title of the pipe slope sheet says 3,000 L. Confirm which size was installed.',
            `Takes the outflow of ${t.from.en}. Treated water leaves to manhole ${t.to} and from there to the 3-compartment trap and the public drain.`,
            `Taken to be the "${t.section}" of the pipe slope sheet. The plan does not name the two tanks, so confirm which section belongs to which tank.`,
            `Size: 2.00 m across (plan), ${TANK_H.toFixed(3)} m high (slope sheet).`,
            `Pipe in (PVC 4") ${lv(IN)} on the ${t.inAt.en} side, as written. Pipe out on the ${t.outAt.en} side about ${lv(OUT)}: the outlet level is not written, taken 0.05 m below the inlet.`,
            `Ground ±0.00 · top of tank cover ${lv(COVER)} · underside of tank about ${lv(SLAB_TOP)} · bottom of the excavation ${lv(BED)}.`,
            first ? 'A 2" PVC vent (V-PVC 2") is marked beside this tank; its route is not drawn. Flexible connectors are marked at the inlet and outlet.' : 'Flexible connectors are marked at the inlet and outlet. A safety switch and an underground power cable are drawn about 1 m east of this tank.'],
          ['ถังบำบัดน้ำเสียสำเร็จรูปชนิดเติมอากาศ เป็น 1 ใน 2 ถังใหม่ของงานปรับปรุงปี 2024 ผังระบุ 2,500 ลิตร แต่ชื่อแบบความลาดท่อระบุ 3,000 ลิตร ต้องยืนยันขนาดที่ติดตั้งจริง',
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
      ['The plan shows 8 pile symbols on each slab (corners and mid-sides, about 0.95 m apart) and the slope sheet shows piles under the slab.', 'Pile size and length are not given: shown 0.15 m square and 2.0 m long.'],
      ['ผังแสดงสัญลักษณ์เสาเข็ม 8 ต้นต่อฐาน (มุมและกึ่งกลางด้าน ห่างกันประมาณ 0.95 ม.) และแบบความลาดท่อแสดงเสาเข็มใต้ฐาน', 'ไม่มีขนาดและความยาวเสาเข็มในแบบ: แสดงเป็นเสา 0.15 ม. ยาว 2.0 ม.'], P) });

    // ---------- the old tanks beside the building (depth unknown)
    const OLD_TOP = -0.65, OLD_H = 1.5;
    for (const t of OLD) {
      add('tanks', cylGeo(0.635, OLD_H, t.x, t.y, OLD_TOP - OLD_H), t.material, { en: t.en, th: t.th, tag: t.tag, tagTh: t.tagTh, kind: 'tank',
        info: lines([t.en1, t.en2, 'Round tank 1.27 m across on the plan with a 0.47 m opening. Its depth is not on the drawings: shown 1.5 m high with its top 0.65 m below ground, so that the new pipes drawn over it pass above it.'],
          [t.th1, t.th2, 'ถังกลมกว้าง 1.27 ม. ตามผัง มีช่องเปิด 0.47 ม. ไม่มีความลึกในแบบ: แสดงสูง 1.5 ม. หลังถังต่ำกว่าพื้น 0.65 ม. เพื่อให้ท่อใหม่ที่เขียนทับถังอยู่เหนือถัง'], P) }, V(t.x - 0.75, t.y + 0.3, 0.7));
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
    oldPipe([[26.59, 30.17, -0.30], [26.59, 28.56, -0.32]], 'Existing pipe from the north into old tank 1', 'ท่อเดิมจากด้านเหนือเข้าถังเดิมใบที่ 1', 0);
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
        'Everything in this corner ends up here: the two new 2,500 L tanks (through MH-5 and MH-4) and the site drains. This is the place to check or sample what leaves this corner of the site.',
        'Its depth and pipe levels are not on the drawings: shown 1.50 m deep with the drain coming in at about -1.00 (assumed).'],
        ['บ่อดักไขมัน 3 ตอนเดิม ฝาตะแกรง อยู่ชิดแนวเขตด้านใต้ ขนาดประมาณ 0.90 × 2.53 ม. ตามผัง เป็นจุดสุดท้ายก่อนลงท่อระบายน้ำสาธารณะ',
          'น้ำทั้งหมดของมุมนี้มารวมที่นี่: ถังใหม่ 2,500 ลิตรทั้งสองใบ (ผ่าน MH-5 และ MH-4) และท่อระบายน้ำของสถานี เป็นจุดสำหรับตรวจหรือเก็บตัวอย่างน้ำที่ออกจากมุมนี้ของสถานี',
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
    building([[19.55, 20.50], [25.92, 20.50], [25.92, 27.82], [19.55, 27.82]], 3.6, { en: 'Shop / sales building', th: 'อาคารห้องขาย/ร้านค้า', tag: 'Sales room / shop', tagTh: 'อาคารห้องขาย/ร้านค้า',
      lines: ['Marked "sales room / shop building" on the plan. The building carries on north beyond the edge of the drawing.'], linesTh: ['ในผังระบุ "อาคารห้องขาย/ร้านค้า" อาคารต่อเนื่องไปทางเหนือเลยขอบของแบบ'] });
    building([[22.65, 27.84], [25.92, 27.84], [25.92, 29.27], [22.65, 29.27]], 3.0, { en: 'Office toilet', th: 'ห้องน้ำสำนักงาน', tag: 'Office toilet', tagTh: 'ห้องน้ำสำนักงาน',
      lines: ['Marked "office toilet" on the plan. Its waste goes east through the wall into existing treatment tank 1.'], linesTh: ['ในผังระบุ "ห้องน้ำสำนักงาน" น้ำเสียออกทางตะวันออกผ่านผนังเข้าถังบำบัดเดิมใบที่ 1'] });
  },
};
