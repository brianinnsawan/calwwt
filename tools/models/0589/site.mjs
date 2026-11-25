// 0589 Kathu, Phuket: what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/0589.glb.
//
// Sources (Brian's folder, Sites\0589 Kathu Phuket\03 Drawings\CAD\AS Buit Pack):
//   A  01 DWG\Spp Caltex Kathu Septic As Built Combined.dwg  (plan positions; manhole levels EL.F / INLET / pit bottom
//      from the "elevations and drainage" overlay; SPP's new tanks, pipes and their inlet levels)
//   B  04 Site Survey\Elevations on lift day.xlsx             (tank in / out levels, 17 Apr 2026)
//   C  01 DWG\MISC\Section Tank actual april 4.pdf, 02 Calculations & Specs\Tank air pumps and elevations.pdf
//      (FR-A-40 tank size, depth, base slab and piles)
// Positions are the drawing's x, y in metres. Levels are metres from the drawing's datum (BMP +/-0.00 on highway 4024).
// src: 'drawn' = position and levels from the drawings; 'part' = position from the drawings, size or depth assumed;
//      'context' = above-ground context only (heights assumed).
const D = 'drawn', P = 'part', C = 'context';
const src = {
  [D]: { en: 'From the as-built drawings.', th: 'จากแบบก่อสร้างจริง' },
  [P]: { en: 'Position from the as-built drawing. Size and depth are assumed (not on the drawings).', th: 'ตำแหน่งจากแบบก่อสร้างจริง ขนาดและความลึกเป็นค่าสมมติ (ไม่มีในแบบ)' },
  [C]: { en: 'Outline from the as-built plan. Height is assumed, for context only.', th: 'แนวจากแบบก่อสร้างจริง ความสูงเป็นค่าสมมติ ใช้ดูประกอบเท่านั้น' },
};

// Site drains: manholes with the levels written on the drawing: [x, y, finished level, inlet (invert), pit bottom]
const MH = {
  N1: [313.02, 105.61, 0.85, 0.19, 0.04], N2: [304.56, 104.76, 0.85, 0.17, 0.02], N3: [295.86, 104.24, 0.83, 0.15, 0.00],
  N4: [286.54, 103.58, 0.82, 0.12, -0.03], W1: [289.06, 92.70, 0.85, 0.09, -0.06], W2: [292.46, 81.07, 0.85, 0.07, -0.08],
  W3: [294.01, 76.07, 0.85, 0.05, -0.10], S1: [312.18, 82.88, 0.85, 0.16, 0.01], S2: [303.95, 81.95, 0.85, 0.13, -0.02],
  C1: [330.04, 106.44, 1.03, 0.05, -0.10], C2: [331.13, 95.60, 0.89, -0.01, -0.16], C3: [323.05, 94.89, 0.89, -0.05, -0.20],
  C4: [316.99, 94.24, 0.86, -0.08, -0.23], C5: [316.66, 83.55, 0.86, -0.12, -0.27], C6: [316.31, 73.31, 0.86, -0.16, -0.31],
  E0: [340.34, 107.30, 0.998, 0.10, -0.05], E1: [348.87, 107.85, 0.998, 0.15, 0.00], E2: [359.48, 108.91, 0.938, 0.10, -0.05],
  E3: [369.26, 109.59, 0.938, -0.08, -0.23], E4: [370.63, 97.95, 0.938, -0.13, -0.28], E5: [372.24, 84.60, 0.878, -0.18, -0.33],
  E6: [373.78, 74.97, 0.878, -0.20, -0.45], E7: [376.06, 72.59, 0.863, -0.22, -0.47],
  R0: [385.94, 102.34, 1.108, 0.058, -0.108], R1: [384.61, 112.66, 1.108, 0.00, -0.15], R2: [377.28, 111.83, 1.108, -0.04, -0.19],
  A1: [345.30, 80.72, 0.853, 0.228, 0.078], A2: [344.07, 90.63, 0.938, 0.188, 0.038], A3: [342.66, 100.67, 0.998, 0.15, 0.00],
  B1: [361.16, 82.93, 0.853, 0.228, 0.078], B2: [359.94, 92.61, 0.938, 0.188, -0.038], B3: [358.72, 102.53, 0.998, 0.15, 0.00],
};
// Other points with a level on the drawing
const SUMP = [370.10, 102.05, 0.938, -0.08];           // new sump on the drain line (SPP), "New Sump EL.F +0.938 INLET -0.08"
const TRAP_W = [295.17, 73.45, 0.85, 0.05];            // west trap: "into grease trap +0.05"
const PUBLIC_W = [295.17, 68.96, -0.05, 0.00, -1.64];  // public manhole: footpath -0.05, outlet from trap +/-0.00, pit bottom -1.64
const TRAP_E = [388.28, 76.51, 0.86, -0.27];           // east trap: "water into grease trap -0.27"
const OUT_E = [388.64, 72.70, 0.86, -0.32, 0.12];      // "Inlet Ele -0.32 / Outlet Ele +0.12"
const PUBLIC_C = [316.20, 68.40];                      // "connects to the public drain"
// Drain runs, each in flow direction (levels fall along the run)
const RUNS = [
  ['north-west and west side', ['N1', 'N2', 'N3', 'N4', 'W1', 'W2', 'W3', TRAP_W, PUBLIC_W]],
  ['south of KFC', ['S1', 'S2', 'W2']],
  ['north side to the middle outlet', ['E1', 'E0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', [...PUBLIC_C, null, -0.18]]],
  ['north-east and east side (takes the treated water from the new tanks)', ['E1', 'E2', 'E3', SUMP, 'E4', 'E5', 'E6', 'E7', TRAP_E, OUT_E]],
  ['behind the toilets', ['R0', 'R1', 'R2', 'E3']],
  ['canopy, west columns', ['A1', 'A2', 'A3', 'E0']],
  ['canopy, east columns', ['B1', 'B2', 'B3', 'E2']],
];

// The four FR-A-40 ferrocement tanks (SPP, 2026). Ground at the tanks +0.938; top of tank 0.30 below, tank 2.10 high.
const TANK_GROUND = 0.938, TANK_TOP = TANK_GROUND - 0.30, TANK_BASE = TANK_TOP - 2.10;
const TANKS = [
  { n: 1, x: 366.56, y: 103.60, model: 'FR-A-40FS-S', role: { en: 'settling (first tank)', th: 'ถังตกตะกอน (ถังแรก)' }, inL: 0.24, outL: 0.23 },
  { n: 2, x: 364.29, y: 103.32, model: 'FR-A-40FA-S', role: { en: 'aerated filter', th: 'ถังกรองเติมอากาศ' }, inL: 0.20, outL: 0.16 },
  { n: 3, x: 361.98, y: 103.01, model: 'FR-A-40FA-S', role: { en: 'aerated filter', th: 'ถังกรองเติมอากาศ' }, inL: 0.16, outL: 0.14 },
  { n: 4, x: 361.72, y: 105.29, model: 'FR-A-40FS-S', role: { en: 'final settling', th: 'ถังตกตะกอนขั้นสุดท้าย' }, inL: 0.155, outL: 0.11 },
];
// outside shape of an FR-A-40 tank: [radius, height above its base]
const FRA40 = [[0, 0], [0.55, 0], [0.70, 0.07], [0.80, 0.30], [0.90, 0.98], [1.00, 0.98], [1.00, 1.12], [0.90, 1.12], [0.80, 1.80], [0.70, 2.03], [0.45, 2.10], [0.35, 2.10]];

export default {
  name: 'Kathu, Phuket',
  origin: [338, 90],
  datum: { en: 'Levels are in metres from the drawing datum: BMP ±0.00 on highway 4024. The forecourt is about +0.85 to +1.11.', th: 'ระดับเป็นเมตรจากหมุดอ้างอิงของแบบ: BMP ±0.00 บนทางหลวง 4024 ลานจ่ายอยู่ที่ประมาณ +0.85 ถึง +1.11' },
  note: { en: 'First version, built from the as-built drawings. Check on site before any digging; not for setting out.', th: 'ฉบับแรก จัดทำจากแบบก่อสร้างจริง ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง' },
  built: '2026-11-25',
  // Drawing angle of north, anticlockwise from the sheet's +x (from the north symbol on the as-built sheet)
  north: 240.5,
  boundary: [[285.21, 104.29], [294.67, 68.86], [315.62, 68.86], [328.38, 68.86], [361.62, 69.14], [374.52, 71.16], [390.19, 73.33], [385.21, 113.39], [371.07, 112.13], [315.62, 106.94]],
  ground: {
    bbox: [280, 46, 393, 116], step: 2, apron: 5, road: 0,
    roadArea: [[280, 46], [393, 46], [393, 74.5], [390.19, 73.33], [374.52, 71.16], [361.62, 69.14], [328.38, 68.86], [294.67, 68.86], [285.21, 104.29], [280, 104.29]],
    points: [...Object.values(MH).map(([x, y, f]) => [x, y, f]),
      [362.65, 81.04, 0.808], [362.86, 105.45, 0.938], [368.07, 93.60, 0.938], [369.23, 81.71, 0.878], [371.67, 101.07, 1.108], [372.67, 88.33, 1.108],
      [373.68, 80.21, 1.098], [375.88, 108.32, 1.108], [376.47, 104.23, 1.108], [377.67, 101.11, 1.108], [366.5, 103.5, 0.938], [362, 103, 0.938]],
    names: {
      siteGround: { en: 'Forecourt and paving', th: 'ลานและพื้นผิว' },
      road: { en: 'Highway 4024 and entrances', th: 'ทางหลวง 4024 และทางเข้าออก' },
    },
  },
  layers: [
    { id: 'tanks', en: 'Wastewater tanks', th: 'ถังบำบัดน้ำเสีย' },
    { id: 'sewer', en: 'Wastewater pipes', th: 'ท่อน้ำเสีย' },
    { id: 'drains', en: 'Site drains and manholes', th: 'ท่อระบายน้ำและบ่อพัก' },
    { id: 'air', en: 'Air pumps and air lines', th: 'ปั๊มลมและท่อลม' },
    { id: 'base', en: 'Tank base slabs and piles', th: 'ฐานถังและเสาเข็ม' },
    { id: 'old', en: 'Old tank (out of use)', th: 'ถังเก่า (เลิกใช้)' },
    { id: 'fuel', en: 'Fuel tank area', th: 'บริเวณถังน้ำมันใต้ดิน' },
    { id: 'buildings', en: 'Buildings and canopy', th: 'อาคารและหลังคาคลุมหัวจ่าย' },
    { id: 'plan', en: 'As-built plan on the ground', th: 'แบบก่อสร้างจริงบนพื้น' },
    { id: 'ground', en: 'Ground surface', th: 'ผิวพื้น' },
  ],
  materials: {
    siteGround: [0xd9d6d0, 0.38], road: [0x6b6661, 0.5], planLine: [0x66727c], planDrainLine: [0x0f8f84],
    tankNew: [0x0f9aa6, 0.8], tankOther: [0x4f86c6, 0.7], grease: [0xc0892b, 0.75], tankOld: [0x8d9399, 0.45], cover: [0x2f3a44],
    sewerRaw: [0xb4531a], sewerTreated: [0x2f6fde], drain: [0x7b8794], manhole: [0x9aa5b1, 0.55],
    airLine: [0xe0b100], airPump: [0x3aa655], slab: [0xb7b1a8, 0.9], pile: [0x8c857b],
    fuel: [0xf2a51a, 0.18], building: [0xc4ccd4, 0.22], roof: [0xdfe5ea, 0.3], column: [0x9aa5b1],
  },
  views: [
    { id: 'site', en: 'Whole site', th: 'ทั้งสถานี', from: [338, 8, 78], to: [338, 88, 0] },
    { id: 'plan', en: 'Plan', th: 'ผัง', from: [338, 87.9, 125], to: [338, 88, 0] },
    { id: 'new', en: 'New tanks at the toilets', th: 'ถังใหม่ข้างห้องน้ำ', from: [372.5, 95.5, 8], to: [364.3, 103.8, -0.3] },
    { id: 'kfc', en: 'KFC tanks', th: 'ถังของ KFC', from: [289, 117, 12], to: [297, 101.5, -0.5] },
    { id: 'under', en: 'From below ground', th: 'มองจากใต้ดิน', from: [352, 90, -7], to: [366, 103.5, 0.2] },
  ],

  build({ V, ground, lv, add, boxGeo, cylGeo, hcylGeo, latheGeo, prismGeo, pipeGeo, merge }) {
    const note = (kind) => src[kind];
    const lines = (en, th, kind) => ({ en: [...en, note(kind).en], th: [...th, note(kind).th] });

    // ---------- the four new tanks, their base and piles
    const slabs = [], piles = [];
    for (const t of TANKS) {
      const name = { en: `Tank ${t.n} · ${t.model}`, th: `ถัง ${t.n} · ${t.model}` };
      add('tanks', latheGeo(FRA40, t.x, t.y, TANK_BASE), 'tankNew', {
        ...name, tag: `Tank ${t.n}`, tagTh: `ถัง ${t.n}`, kind: 'tank',
        info: lines(
          [`Ferrocement tank, 4,000 L, ${t.role.en}. One of 4 in series: 16 m³ in total, 8 m³/day, BOD 500 in → 40 mg/l or less out.`,
            'Size: 2.00 m across, 2.10 m high. Access opening 0.70 m across with a 40-tonne FRP cover at ground level.', `Pipe in ${lv(t.inL)} · pipe out ${lv(t.outL)} (levels sheet, 17 Apr 2026).`,
            `Ground ${lv(TANK_GROUND)} · top of tank ${lv(TANK_TOP)} · underside ${lv(TANK_BASE)} (2.40 m below ground).`],
          [`ถังเฟอร์โรซีเมนต์ 4,000 ลิตร ${t.role.th} 1 ใน 4 ถังต่อเนื่อง: รวม 16 ลบ.ม. รองรับ 8 ลบ.ม./วัน BOD เข้า 500 → ออกไม่เกิน 40 มก./ล.`,
            'ขนาด: กว้าง 2.00 ม. สูง 2.10 ม. ช่องเปิดกว้าง 0.70 ม. ฝา FRP รับน้ำหนัก 40 ตันที่ระดับพื้น', `ท่อเข้า ${lv(t.inL)} · ท่อออก ${lv(t.outL)} (ตารางระดับ 17 เม.ย. 2026)`,
            `ระดับพื้น ${lv(TANK_GROUND)} · หลังถัง ${lv(TANK_TOP)} · ใต้ถัง ${lv(TANK_BASE)} (ลึกจากพื้น 2.40 ม.)`], D),
      }, V(t.x, t.y, TANK_GROUND + 0.4));
      // access neck up to the cover at ground level
      add('tanks', cylGeo(0.35, TANK_GROUND - TANK_TOP, t.x, t.y, TANK_TOP), 'tankNew', { en: `Tank ${t.n} access neck`, th: `คอถัง ${t.n}`, nopick: 1 });
      add('tanks', cylGeo(0.40, 0.04, t.x, t.y, TANK_GROUND), 'cover', { en: `Tank ${t.n} cover`, th: `ฝาถัง ${t.n}`, nopick: 1 });
      slabs.push(boxGeo(2.3, 2.3, 0.2, t.x, t.y, TANK_BASE - 0.2, 7.5));
      const a = 7.5 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      for (const i of [-0.75, 0, 0.75]) for (const j of [-0.75, 0, 0.75]) piles.push(boxGeo(0.16, 0.16, 4.0, t.x + i * c - j * s, t.y + i * s + j * c, TANK_BASE - 0.2 - 4.0, 7.5));
    }
    add('base', merge(slabs), 'slab', { en: 'Tank base slabs', th: 'ฐานคอนกรีตใต้ถัง', kind: 'base', info: lines(
      ['Reinforced concrete 0.20 m thick on 0.05 m lean concrete and 0.10 m sand. Top of slab ' + lv(TANK_BASE) + '.', 'Shown as one 2.30 m square under each tank; the footing drawing shows the four tanks in one row.'],
      ['คอนกรีตเสริมเหล็กหนา 0.20 ม. บนคอนกรีตหยาบ 0.05 ม. และทราย 0.10 ม. ระดับหลังฐาน ' + lv(TANK_BASE), 'แสดงเป็นฐาน 2.30 ม. ต่อถัง แบบฐานรากแสดงถัง 4 ใบเรียงแถวเดียว'], P) });
    add('base', merge(piles), 'pile', { en: 'Piles under the tanks', th: 'เสาเข็มใต้ถัง', kind: 'base', info: lines(
      ['Concrete piles 0.16 × 0.16 × 4.00 m, safe load over 1.5 t each, 0.75 m apart (9 under each tank).'],
      ['เสาเข็มคอนกรีต 0.16 × 0.16 × 4.00 ม. รับน้ำหนักปลอดภัยมากกว่า 1.5 ตัน/ต้น ระยะห่าง 0.75 ม. (9 ต้นต่อถัง)'], P) });

    // ---------- wastewater pipes: toilets -> tanks -> new sump
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tag ? g.mid.clone().setY(g.mid.y + 0.5) : null); return g; };
    pipe('sewer', [[380.19, 110.63, 0.56], [380.87, 110.56, 0.55], [381.74, 103.17, 0.50], [381.47, 102.80], [367.22, 101.17], [366.82, 101.34], [366.75, 102.15, 0.24], [366.68, 102.72, 0.24]], 0.075, 'sewerRaw', {
      en: 'Wastewater from the toilets to Tank 1', th: 'ท่อน้ำเสียจากห้องน้ำเข้าถัง 1', tag: 'From toilets', tagTh: 'จากห้องน้ำ', kind: 'pipe',
      info: (m) => lines(['150 mm (6") pipe. Runs down the east side of the toilets, then west along their south wall to Tank 1.', 'Underside of pipe: +0.55 at the north-east corner, +0.50 at the south-east corner, +0.24 into Tank 1.', `About ${m} m long. Joined to the existing pipe at the old tank inlet.`],
        ['ท่อ 150 มม. (6 นิ้ว) เดินลงด้านตะวันออกของห้องน้ำ แล้วเลียบผนังด้านใต้ไปเข้าถัง 1', 'ระดับท้องท่อ: +0.55 ที่มุมตะวันออกเฉียงเหนือ, +0.50 ที่มุมตะวันออกเฉียงใต้, +0.24 เข้าถัง 1', `ยาวประมาณ ${m} ม. ต่อกับท่อเดิมที่ทางเข้าถังเก่า`], D) });
    pipe('sewer', [[380.72, 107.53, 0.53], [381.22, 107.59, 0.53]], 0.075, 'sewerRaw', { en: 'Branch from the toilets', th: 'ท่อแยกจากห้องน้ำ', kind: 'pipe', info: lines(['Short branch into the main wastewater pipe.'], ['ท่อแยกสั้นต่อเข้าท่อน้ำเสียหลัก'], P) });
    const link = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; return [[a.x + ux * 0.85, a.y + uy * 0.85, a.outL], [b.x - ux * 0.85, b.y - uy * 0.85, b.inL]]; };
    for (let i = 0; i < 3; i++) {
      const a = TANKS[i], b = TANKS[i + 1];
      pipe('sewer', link(a, b), 0.075, 'sewerRaw', { en: `Tank ${a.n} to Tank ${b.n}`, th: `ถัง ${a.n} ไปถัง ${b.n}`, kind: 'pipe',
        info: lines([`Out of Tank ${a.n} at ${lv(a.outL)}, into Tank ${b.n} at ${lv(b.inL)} (levels sheet, 17 Apr 2026).`], [`ออกจากถัง ${a.n} ที่ ${lv(a.outL)} เข้าถัง ${b.n} ที่ ${lv(b.inL)} (ตารางระดับ 17 เม.ย. 2026)`], D) });
    }
    pipe('sewer', [[361.05, 105.92, 0.11], [360.70, 106.25, 0.11], [359.93, 106.71], [359.51, 106.55], [359.30, 106.03], [359.94, 101.50], [360.89, 100.86], [369.63, 102.00, 0.07]], 0.075, 'sewerTreated', {
      en: 'Treated water from Tank 4 to the new sump', th: 'ท่อน้ำที่บำบัดแล้วจากถัง 4 ไปบ่อพักใหม่', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines(['150 mm (6") pipe. Leaves Tank 4 at +0.11, goes round the west side of the tanks and back east to the new sump at +0.07.', `About ${m} m long.`],
        ['ท่อ 150 มม. (6 นิ้ว) ออกจากถัง 4 ที่ +0.11 อ้อมด้านตะวันตกของถัง แล้วย้อนไปทางตะวันออกเข้าบ่อพักใหม่ที่ +0.07', `ยาวประมาณ ${m} ม.`], D) });

    // ---------- air pumps and air lines to tanks 2 and 3
    add('air', boxGeo(1.30, 0.43, 0.9, 374.35, 100.56, 1.108 + 0.9, 7), 'airPump', { en: 'Air pumps and controls', th: 'ปั๊มลมและตู้ควบคุม', tag: 'Air pumps', tagTh: 'ปั๊มลม', kind: 'air',
      info: lines(['2 Secoh EL-200W diaphragm pumps (200 W, 200 l/min, 19.6 kPa, 230 V). They take turns: 4 hours on, 1 hour off.', 'The drawing marks "air pump controls" here, between the toilets and the mart.'],
        ['ปั๊มลมไดอะแฟรม Secoh EL-200W 2 ตัว (200 วัตต์ 200 ลิตร/นาที 19.6 kPa 230 โวลต์) สลับทำงาน: เดิน 4 ชม. หยุด 1 ชม.', 'แบบระบุ "air pump controls" ที่ตำแหน่งนี้ ระหว่างห้องน้ำกับร้านสะดวกซื้อ'], P) }, V(374.35, 100.56, 3.2));
    const airL = 0.60;
    add('air', merge([pipeGeo([[373.51, 100.66, 1.9], [373.50, 100.67, airL], [373.38, 101.82, airL], [364.72, 100.79, airL], [362.23, 100.50, airL], [362.02, 102.65, airL]], 0.025).geometry,
      pipeGeo([[364.67, 100.78, airL], [364.31, 102.96, airL]], 0.025).geometry]), 'airLine', { en: 'Air lines to Tanks 2 and 3', th: 'ท่อลมเข้าถัง 2 และ 3', kind: 'air',
      info: lines(['From the air pumps along the south side of the tanks. Route from the drawing; depth is assumed (about 0.3 m below ground).'], ['จากปั๊มลม เดินเลียบด้านใต้ของถัง แนวท่อจากแบบ ความลึกเป็นค่าสมมติ (ประมาณ 0.3 ม. ใต้พื้น)'], P) });

    // ---------- new sump on the drain line
    add('drains', boxGeo(1.0, 1.0, SUMP[2] - (SUMP[3] - 0.15), SUMP[0], SUMP[1], SUMP[3] - 0.15, 7), 'manhole', { en: 'New sump (treated water joins the site drain)', th: 'บ่อพักใหม่ (น้ำที่บำบัดแล้วลงท่อระบายน้ำ)', tag: 'New sump', tagTh: 'บ่อพักใหม่', lvl: `IN ${lv(SUMP[3])}`, kind: 'manhole',
      info: lines([`Built on the existing concrete drain pipe. Ground ${lv(SUMP[2])} · drain inlet ${lv(SUMP[3])} · treated water arrives at +0.07.`, 'Size of the sump is assumed (1.0 m square).'],
        [`สร้างคร่อมท่อระบายน้ำคอนกรีตเดิม ระดับพื้น ${lv(SUMP[2])} · ท่อเข้า ${lv(SUMP[3])} · น้ำที่บำบัดแล้วเข้าที่ +0.07`, 'ขนาดบ่อเป็นค่าสมมติ (1.0 ม. สี่เหลี่ยม)'], P) }, V(SUMP[0], SUMP[1], SUMP[2] + 0.5));
    add('drains', boxGeo(0.9, 0.9, 0.04, SUMP[0], SUMP[1], SUMP[2], 7), 'cover', { en: 'New sump cover', th: 'ฝาบ่อพักใหม่', nopick: 1 });

    // ---------- site drains and manholes
    for (const [id, [x, y, f, inl, bot]] of Object.entries(MH)) {
      add('drains', boxGeo(0.8, 0.8, f - (bot - 0.1), x, y, bot - 0.1, 6), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, lvl: `IN ${lv(inl)}`, kind: 'manhole',
        info: lines([`Top (finished level) ${lv(f)} · inlet ${lv(inl)} · bottom of pit ${lv(bot)}.`, `Pipe inlet is ${(f - inl).toFixed(2)} m below the cover. Pit drawn 0.6 m square inside.`],
          [`ระดับหลังบ่อ ${lv(f)} · ท่อเข้า ${lv(inl)} · ก้นบ่อ ${lv(bot)}`, `ท่อเข้าอยู่ต่ำกว่าฝาบ่อ ${(f - inl).toFixed(2)} ม. แสดงบ่อขนาดภายใน 0.6 ม.`], D) });
      add('drains', boxGeo(0.7, 0.7, 0.03, x, y, f, 6), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    }
    for (const [name, nodes] of RUNS) {
      const pts = nodes.map((n) => (typeof n === 'string' ? [MH[n][0], MH[n][1], MH[n][3]] : [n[0], n[1], n[3]]));
      const first = pts[0][2], last = pts[pts.length - 1][2];
      pipe('drains', pts, 0.15, 'drain', { en: `Site drain: ${name}`, th: 'ท่อระบายน้ำภายในสถานี', kind: 'drain',
        info: lines([`Flows from ${lv(first)} to ${lv(last)} through ${nodes.length} points; the level at each manhole is on the drawing.`, 'Drawn as a 0.30 m pipe. The drawing legend lists 0.30 m and 0.40 m concrete pipe and concrete channels; it does not say which is used on each run.'],
          [`ไหลจากระดับ ${lv(first)} ถึง ${lv(last)} ผ่าน ${nodes.length} จุด ระดับที่แต่ละบ่อพักมาจากแบบ`, 'แสดงเป็นท่อ 0.30 ม. สัญลักษณ์ในแบบมีท่อคอนกรีต 0.30 ม. และ 0.40 ม. กับรางคอนกรีต แต่ไม่ได้ระบุว่าช่วงใดใช้แบบใด'], P) });
    }
    const trap = (pt, w, d, rot, o) => add('drains', boxGeo(w, d, pt[2] - (pt[3] - 0.5), pt[0], pt[1], pt[3] - 0.5, rot), 'grease', o, V(pt[0], pt[1], pt[2] + 0.5));
    trap(TRAP_W, 0.9, 3.0, 12, { en: 'Trap sump at the west outlet', th: 'บ่อดักที่ทางออกด้านตะวันตก', tag: 'West outlet', tagTh: 'ทางออกตะวันตก', lvl: `IN ${lv(TRAP_W[3])}`, kind: 'manhole',
      info: lines(['Grating-covered trap sump before the public drain. Water goes in at +0.05 and out to the public manhole at ±0.00.', 'Public manhole: footpath -0.05, bottom of pit -1.64.', 'Depth of the trap is assumed.'],
        ['บ่อดักฝาตะแกรงก่อนลงท่อระบายน้ำสาธารณะ น้ำเข้าที่ +0.05 ออกไปบ่อสาธารณะที่ ±0.00', 'บ่อสาธารณะ: ระดับทางเท้า -0.05 ก้นบ่อ -1.64', 'ความลึกของบ่อดักเป็นค่าสมมติ'], P) });
    trap([TRAP_E[0] + 1.2, TRAP_E[1] - 1.0, TRAP_E[2], TRAP_E[3]], 0.9, 3.4, 8, { en: 'Trap sump at the east outlet', th: 'บ่อดักที่ทางออกด้านตะวันออก', tag: 'East outlet', tagTh: 'ทางออกตะวันออก', lvl: `IN ${lv(TRAP_E[3])}`, kind: 'manhole',
      info: lines(['Grating-covered trap sump at the south-east corner. The east drain, which takes the treated water from the new tanks, runs to this corner.', 'Water goes in at -0.27. The drawing marks "Inlet -0.32 / Outlet +0.12" at the outlet to the public drain.', 'Depth of the trap is assumed.'],
        ['บ่อดักฝาตะแกรงที่มุมตะวันออกเฉียงใต้ ท่อระบายด้านตะวันออกซึ่งรับน้ำที่บำบัดแล้วจากถังใหม่เดินมาที่มุมนี้', 'น้ำเข้าที่ -0.27 แบบระบุ "Inlet -0.32 / Outlet +0.12" ที่ทางออกสู่ท่อสาธารณะ', 'ความลึกของบ่อดักเป็นค่าสมมติ'], P) });
    add('drains', boxGeo(1.2, 1.2, PUBLIC_W[2] - PUBLIC_W[4], PUBLIC_W[0], PUBLIC_W[1] - 0.6, PUBLIC_W[4], 0), 'manhole', { en: 'Public manhole (west)', th: 'บ่อพักสาธารณะ (ตะวันตก)', lvl: `BOT ${lv(PUBLIC_W[4])}`, kind: 'manhole',
      info: lines(['Footpath level -0.05 · pipe from the site trap ±0.00 · bottom of pit -1.64.', 'Size is assumed (1.2 m square).'], ['ระดับทางเท้า -0.05 · ท่อจากบ่อดักของสถานี ±0.00 · ก้นบ่อ -1.64', 'ขนาดเป็นค่าสมมติ (1.2 ม. สี่เหลี่ยม)'], P) });

    // ---------- other treatment tanks already on site (position from the drawing, size and depth assumed)
    const gAt = (x, y) => ground(x, y);
    { // WTT-1: long tank behind KFC, four access covers
      const x = 294.5, y = 102.55, rot = 5, len = 6.5, r = 1.2, cover = 1.0, top = gAt(x, y) - cover;
      const g = hcylGeo(r, len, x, y, top - r, rot);
      add('tanks', g, 'tankOther', { en: 'WTT-1 · KFC treatment tank', th: 'WTT-1 · ถังบำบัดของ KFC', tag: 'WTT-1 (KFC)', tagTh: 'WTT-1 (KFC)', kind: 'tank',
        info: lines(['Package wastewater treatment tank 1, 10 m³/day. Long tank lying behind KFC with four access covers.', 'Drawn about 6.5 m long and 2.4 m across, 1.0 m below ground.'], ['ถังบำบัดน้ำเสียสำเร็จรูป 1 ขนาด 10 ลบ.ม./วัน ถังนอนด้านหลัง KFC มีฝาเปิด 4 จุด', 'แสดงยาวประมาณ 6.5 ม. กว้าง 2.4 ม. หลังถังต่ำกว่าพื้น 1.0 ม.'], P) }, V(x, y, gAt(x, y) + 0.5));
      for (const [mx, my] of [[291.93, 102.35], [293.37, 102.50], [295.52, 102.68], [296.92, 102.80]]) {
        add('tanks', cylGeo(0.3, gAt(mx, my) - top, mx, my, top), 'tankOther', { en: 'WTT-1 access', th: 'ช่องเปิด WTT-1', nopick: 1 });
        add('tanks', cylGeo(0.33, 0.03, mx, my, gAt(mx, my)), 'cover', { en: 'WTT-1 cover', th: 'ฝา WTT-1', nopick: 1 });
      }
    }
    for (const [i, [x, y]] of [[299.75, 102.98], [302.40, 103.20]].entries()) {
      const g0 = gAt(x, y);
      add('tanks', boxGeo(2.2, 1.35, 1.4, x, y, g0 - 1.4, 5), 'grease', { en: `KFC grease trap ${i + 1}`, th: `ถังดักไขมัน KFC ${i + 1}`, ...(i ? {} : { tag: 'Grease traps', tagTh: 'ถังดักไขมัน' }), kind: 'tank',
        info: lines(['Package grease trap, 3.0 m³, one of 2 sets between KFC and WTT-1.', 'Drawn 2.2 × 1.35 m and 1.4 m deep.'], ['ถังดักไขมันสำเร็จรูป 3.0 ลบ.ม. 1 ใน 2 ชุด อยู่ระหว่าง KFC กับ WTT-1', 'แสดงขนาด 2.2 × 1.35 ม. ลึก 1.4 ม.'], P) }, i ? null : V(301.1, 103.1, g0 + 0.5));
    }
    pipe('sewer', [[297.75, 102.85, gAt(297.7, 102.85) - 1.0], [298.65, 102.95, gAt(298.6, 102.95) - 1.0]], 0.05, 'sewerRaw', { en: 'Grease trap to WTT-1', th: 'ท่อจากถังดักไขมันไป WTT-1', kind: 'pipe', info: lines(['Short pipe between the grease traps and WTT-1. Level is assumed.'], ['ท่อสั้นระหว่างถังดักไขมันกับ WTT-1 ระดับเป็นค่าสมมติ'], P) });
    const round = (x, y, r, h, coverDepth, o) => {
      const g0 = gAt(x, y), top = g0 - coverDepth;
      add('tanks', cylGeo(r, h, x, y, top - h), 'tankOther', o, V(x, y, g0 + 0.5));
      add('tanks', cylGeo(0.3, coverDepth, x, y, top), 'tankOther', { en: o.en + ' access', th: o.th, nopick: 1 });
      add('tanks', cylGeo(0.33, 0.03, x, y, g0), 'cover', { en: o.en + ' cover', th: o.th, nopick: 1 });
    };
    round(291.93, 96.80, 1.0, 2.0, 0.4, { en: 'WTT-2 · KFC toilet tank', th: 'WTT-2 · ถังบำบัดห้องน้ำ KFC', tag: 'WTT-2', tagTh: 'WTT-2', kind: 'tank',
      info: lines(['Package wastewater treatment tank 2, 5.0 m³/day, beside the KFC toilets.', 'Drawn 2.0 m across and 2.0 m high.'], ['ถังบำบัดน้ำเสียสำเร็จรูป 2 ขนาด 5.0 ลบ.ม./วัน ข้างห้องน้ำ KFC', 'แสดงกว้าง 2.0 ม. สูง 2.0 ม.'], P) });
    for (const [i, [x, y]] of [[319.65, 106.20], [327.20, 106.85]].entries()) {
      round(x, y, 1.0, 1.8, 0.4, { en: `Biotech BO-2600 tank ${i + 1}`, th: `ถัง Biotech BO-2600 ใบที่ ${i + 1}`, tag: 'BO-2600', tagTh: 'BO-2600', kind: 'tank',
        info: lines(['Biotech model BO-2600 treatment tank behind the middle building (the drawing calls these WTT-2,3: 2.5 m³/day, BOD 250 mg/l).', 'Drawn 2.0 m across and 1.8 m high.'], ['ถังบำบัด Biotech รุ่น BO-2600 ด้านหลังอาคารกลาง (ในแบบเรียก WTT-2,3: 2.5 ลบ.ม./วัน BOD 250 มก./ล.)', 'แสดงกว้าง 2.0 ม. สูง 1.8 ม.'], P) });
    }
    round(382.90, 74.00, 0.6, 1.5, 0.3, { en: 'WTT-4 · mart tank', th: 'WTT-4 · ถังบำบัดร้านสะดวกซื้อ', tag: 'WTT-4', tagTh: 'WTT-4', kind: 'tank',
      info: lines(['Package wastewater treatment tank 4, 2.0 m³/day, BOD 200 mg/l, at the front of the mart.', 'Drawn 1.2 m across and 1.5 m high.'], ['ถังบำบัดน้ำเสียสำเร็จรูป 4 ขนาด 2.0 ลบ.ม./วัน BOD 200 มก./ล. ด้านหน้าร้านสะดวกซื้อ', 'แสดงกว้าง 1.2 ม. สูง 1.5 ม.'], P) });

    // ---------- old tank (out of use) and its old pipe
    add('old', boxGeo(2.2, 3.3, 2.0, 383.80, 106.85, 1.108 - 0.3 - 2.0, 7), 'tankOld', { en: 'Old septic tank (out of use)', th: 'ถังบำบัดเดิม (เลิกใช้)', tag: 'Old tank', tagTh: 'ถังเก่า', kind: 'tank',
      info: lines(['Out of commission. Waste removed and the tank filled with fresh water. The new pipe joins the existing pipe at this tank\'s inlet.', 'Drawn 2.2 × 3.3 m and 2.0 m deep.'], ['เลิกใช้งานแล้ว สูบของเสียออกและเติมน้ำสะอาดไว้ ท่อใหม่ต่อกับท่อเดิมที่ทางเข้าของถังนี้', 'แสดงขนาด 2.2 × 3.3 ม. ลึก 2.0 ม.'], P) }, V(383.8, 106.85, 1.108 + 0.5));
    pipe('old', [[384.14, 103.49, 0.158], [385.94, 102.09, 0.158]], 0.075, 'tankOld', { en: 'Old outlet pipe to manhole R0', th: 'ท่อออกเดิมไปบ่อพัก R0', kind: 'pipe', info: lines(['Old outlet from the treatment tank, +0.158 at the manhole.'], ['ท่อออกเดิมจากถังบำบัด ระดับ +0.158 ที่บ่อพัก'], D) });

    // ---------- underground fuel tanks: plan outline only
    for (const [label, y0] of [['B10 / PD', 88.4], ['T4 · D', 85.0], ['T3 · E20', 81.7], ['T2 · G95', 78.3], ['T1 · G91', 74.9]]) {
      add('fuel', boxGeo(7.5, 2.3, 3.2, 328.35, y0 + 1.15, gAt(328.35, y0 + 1.15) - 3.2, 0), 'fuel', { en: `Fuel tank area ${label}`, th: `บริเวณถังน้ำมัน ${label}`, kind: 'fuel',
        info: lines(['Underground fuel tank. Only the plan outline is on this drawing; the depth shown is not real.', 'Keep clear when planning any digging.'], ['ถังน้ำมันใต้ดิน ในแบบนี้มีเฉพาะแนวผัง ความลึกที่แสดงไม่ใช่ค่าจริง', 'เว้นระยะเมื่อวางแผนงานขุด'], C) });
    }

    // ---------- buildings and canopy (context)
    const building = (poly, floor, h, o) => add('buildings', prismGeo(poly, floor, h), 'building', { ...o, kind: 'building', info: lines(o.lines || [], o.linesTh || [], C) }, V(poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length, floor + h + 0.6));
    building([[293.3, 100.25], [298.4, 100.75], [298.3, 102.1], [303.85, 102.6], [303.95, 101.2], [309.0, 101.65], [310.55, 85.65], [296.25, 84.3], [295.45, 93.0], [294.0, 92.95]], 0.85, 5, { en: 'KFC', th: 'KFC', tag: 'KFC', tagTh: 'KFC' });
    building([[314.6, 104.7], [328.4, 106.1], [329.2, 96.9], [315.5, 95.7]], 0.9, 4.2, { en: 'Middle building', th: 'อาคารกลาง', tag: 'Middle building', tagTh: 'อาคารกลาง' });
    building([[372.3, 110.0], [380.4, 110.9], [381.35, 103.2], [373.25, 102.25]], 1.108, 3.5, { en: 'Toilets', th: 'ห้องน้ำ', tag: 'Toilets', tagTh: 'ห้องน้ำ' });
    building([[373.4, 100.3], [384.0, 101.45], [386.7, 80.35], [374.95, 79.0], [372.65, 96.8]], 1.108, 4.5, { en: 'Mart and office', th: 'ร้านสะดวกซื้อและสำนักงาน', tag: 'Mart', tagTh: 'ร้านสะดวกซื้อ' });
    const cols = [[343.46, 100.06], [344.70, 90.14], [345.93, 80.24], [359.34, 102.04], [360.58, 92.12], [361.81, 82.19]];
    add('buildings', merge(cols.map(([x, y]) => boxGeo(0.6, 0.6, 5.5, x, y, gAt(x, y), 7))), 'column', { en: 'Canopy columns', th: 'เสาหลังคาคลุมหัวจ่าย', kind: 'building', info: lines(['Six columns, positions from the plan.'], ['เสา 6 ต้น ตำแหน่งจากผัง'], C) });
    add('buildings', prismGeo([[341.7, 105.8], [358.6, 107.9], [362.0, 80.1], [345.2, 78.0]], 6.4, 0.9), 'roof', { en: 'Pump canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย', kind: 'building', info: lines(['Canopy over the pump islands.'], ['หลังคาคลุมแท่นหัวจ่าย'], C) }, V(351.9, 93, 7.9));
  },
};
