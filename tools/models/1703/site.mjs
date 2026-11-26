// 1703 King Kaew (Caltex with KFC, Samut Prakan): what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/1703.glb.
//
// Sources (PDFs on the site, portal-proposal/public/sites/layouts/1703/, both marked "FOR ASBUILTS", SPP, Nov 2021):
//   A  1703-LAY-ME-02-wastewater-layout.pdf  wastewater drainage layout, A1, 1:250 (scale checked against the written
//      "13.50 x 23.26" car wash slab). Plan positions, the "inv" level written at each manhole and tank connection, pipe
//      routes and sizes, tank names. Read with tools/models/pdf/pdf-lines.py; positions are sheet metres (x right, y up,
//      origin bottom-left of the sheet; the highway is at the bottom).
//   B  1703-GN-SEP-01-grease-trap.pdf  detail of the 3-chamber trap at each outfall (size, depth, cover and footpath levels).
// LEVELS. The layout writes pipe ("inv") levels only: no ground, floor or road level, and it does not say what its zero is.
//   Detail B uses a zero 2.00 m lower than the layout: its trap inlet -0.12 / -0.20 and public drain -0.32 / -0.40 are the
//   layout's -2.12 / -2.20 and -2.32 / -2.40. On B the trap cover (site footpath) is +1.15 and the public footpath +1.00,
//   so on the layout's levels the ground at the highway front is about -0.85 and the public footpath about -1.00.
//   The model takes the whole site as FLAT at -0.85. Every depth below ground is therefore approximate.
// src: 'drawn' = position and levels from the drawings; 'part' = position from the drawings, size or depth assumed or
//      taken from detail B; 'context' = above-ground context only (heights assumed).
const D = 'drawn', P = 'part', C = 'context';
const G0 = -0.85, FOOTPATH = -1.00;

// Site drain runs: every point is a manhole on layout A: [x, y, level written beside it]. null = no level is written at
// that manhole (the model fills it in between its neighbours and says so). Listed in flow direction (levels fall).
const RUNS = [
  { id: 'N', en: 'north side, flowing west', th: 'ด้านหลัง ไหลไปทางซ้ายของแบบ', pts: [[129.08, 135.94, -1.40], [118.84, 136.12, null], [109.24, 136.29, null], [99.65, 136.31, null], [90.05, 136.32, -1.76], [80.45, 136.33, -1.79], [70.85, 136.33, -1.81], [61.55, 136.35, -1.84]] },
  { id: 'W', en: 'west side to the west outfall trap', th: 'ด้านซ้ายของแบบ ไปบ่อดักน้ำมันทางออกด้านตะวันตก', pts: [[61.55, 136.35, -1.84], [61.49, 132.20, -1.85], [61.33, 122.60, -1.875], [61.17, 113.00, -1.90], [61.00, 103.40, -1.925], [60.84, 93.77, -1.95], [60.67, 84.20, -1.974], [60.53, 75.88, -1.995], [62.36, 75.85, null], [62.19, 66.25, -2.02], [62.03, 56.65, -2.05], [61.86, 47.06, -2.075], [61.70, 37.46, -2.10], [61.51, 29.31, -2.12]] },
  { id: 'E', en: 'east side to the east outfall trap', th: 'ด้านขวาของแบบ ไปบ่อดักน้ำมันทางออกด้านตะวันออก', pts: [[129.08, 135.94, -1.40], [128.87, 126.96, null], [128.62, 117.37, null], [128.38, 107.77, -1.80], [128.14, 98.17, -1.85], [127.90, 88.57, -1.90], [127.65, 78.98, -1.95], [127.41, 69.38, -2.00], [127.17, 59.79, -2.05], [126.92, 50.19, -2.10], [126.68, 40.59, -2.15], [126.25, 29.43, -2.20]] },
  { id: 'M', en: 'car wash side, shop fronts and round KFC to the east outfall trap', th: 'ข้างลานล้างรถ หน้าร้านค้า อ้อม KFC ไปบ่อดักน้ำมันทางออกด้านตะวันออก', pts: [[90.05, 136.32, -1.76], [90.15, 129.02, -1.78], [90.26, 121.72, -1.80], [99.86, 121.86, -1.825], [109.00, 119.27, -1.85], [113.38, 111.08, -1.874], [113.24, 102.38, -1.90], [113.10, 92.88, -1.93], [112.97, 84.99, -1.956], [112.84, 76.29, -1.985], [112.71, 67.89, -2.012], [112.61, 61.44, null], [108.89, 61.44, -2.045], [108.92, 54.36, -2.07], [108.92, 45.96, -2.10], [108.92, 37.25, -2.13], [108.97, 31.24, -2.15], [116.38, 31.24, -2.175], [123.74, 31.24, -2.20], [123.74, 29.41, null]] },
  { id: 'XH', en: 'across the middle, high point', th: 'ขวางกลางสถานี ช่วงจุดสูงสุด', pts: [[82.04, 93.41, -1.85], [92.64, 93.23, -1.85]] },
  { id: 'XW', en: 'across the middle, flowing west', th: 'ขวางกลางสถานี ไหลไปทางซ้ายของแบบ', pts: [[82.04, 93.41, -1.85], [71.44, 93.59, -1.90], [60.84, 93.77, -1.95]] },
  { id: 'XE', en: 'across the middle, flowing east', th: 'ขวางกลางสถานี ไหลไปทางขวาของแบบ', pts: [[92.64, 93.23, -1.85], [103.23, 93.05, -1.90], [113.10, 92.88, -1.93]] },
  { id: 'C', en: 'beside the canopy to the highway front', th: 'ข้างหลังคาคลุมหัวจ่าย ไปด้านหน้าทางหลวง', pts: [[95.57, 79.11, -1.65], [95.57, 69.11, -1.70], [95.57, 59.11, -1.75], [95.57, 49.11, -1.80], [95.57, 39.11, -1.85], [85.09, 26.61, -1.93]] },
  { id: 'SW', en: 'highway front, flowing west (with the grated channel across the entrance)', th: 'ด้านหน้าทางหลวง ไหลไปทางตะวันตก (มีรางตะแกรงขวางทางเข้า)', pts: [[85.09, 26.61, -1.93], [74.70, 26.61, -2.00], [68.29, 26.61, null], [63.57, 26.63, -2.06]] },
  { id: 'SE', en: 'highway front, flowing east (with the grated channel across the exit)', th: 'ด้านหน้าทางหลวง ไหลไปทางตะวันออก (มีรางตะแกรงขวางทางออก)', pts: [[85.09, 26.61, -1.93], [95.55, 26.61, -1.99], [101.95, 26.61, null], [114.06, 26.61, -2.10], [123.74, 26.61, -2.15]] },
];
// Extra notes for single manholes, by "x,y"
const MH_NOTE = {
  '129.08,135.94': {
    en: 'Check on site: this corner is the high end of both the north and the east drain. The falls written on the layout (1:400 and 1:200) would put it at about -1.66, but -1.40 is written.',
    th: 'ต้องตรวจสอบหน้างาน: มุมนี้เป็นต้นทางของท่อระบายน้ำทั้งด้านหลังและด้านขวา ความลาดที่ระบุในผัง (1:400 และ 1:200) จะได้ระดับประมาณ -1.66 แต่ในผังเขียน -1.40',
  },
  '128.38,107.77': {
    en: 'The pipe out of the SP-T-20,000 L tank joins the drain here.',
    th: 'ท่อออกจากถัง SP-T-20,000 L ต่อลงท่อระบายน้ำที่บ่อนี้',
  },
  '127.17,59.79': {
    en: 'The pipe out of the SP-T-15,000 L tank (KFC) joins the drain here.',
    th: 'ท่อออกจากถัง SP-T-15,000 L (KFC) ต่อลงท่อระบายน้ำที่บ่อนี้',
  },
  '61,103.4': {
    en: 'The pipe out of the small SP-T-1600 tank joins the drain here.',
    th: 'ท่อออกจากถัง SP-T-1600 ใบเล็กต่อลงท่อระบายน้ำที่บ่อนี้',
  },
  '123.74,31.24': {
    en: 'The label -2.20 sits between this manhole and the one beside the trap; it is taken to be this one (it continues the -2.15, -2.175 steps).',
    th: 'ป้ายระดับ -2.20 อยู่ระหว่างบ่อนี้กับบ่อข้างบ่อดักน้ำมัน ถือว่าเป็นของบ่อนี้ (ต่อเนื่องจาก -2.15, -2.175)',
  },
};

// The three large lying tanks. Outline (length, width, position, direction) as drawn on layout A; depth assumed.
const SITE_VISIT_TANK = {
  en: 'Reported on the site visit (19 Nov 2026), not from the drawings: the treatment system at this station needs a reset.',
  th: 'จากการสำรวจหน้างาน (19 พ.ย. 2026) ไม่ใช่ข้อมูลจากแบบ: ระบบบำบัดของสถานีนี้ต้องรีเซ็ตระบบใหม่',
};
const TANKS = [
  { id: 'SP-T-18,000 L', where: { en: 'behind the toilets', th: 'หลังห้องน้ำ' }, x: 122.14, y: 135.00, rot: -0.9, len: 6.5, dia: 2.0, inL: -1.45, covers: [[120.0, 135.05], [124.2, 134.95]],
    pipes: { en: 'Pipe in (PVC 6", from the toilets and the two north grease traps) -1.45 at the west end · pipe out (PVC 6") -1.55 at the east end, which runs on to the SP-T-20,000 L tank.', th: 'ท่อเข้า (PVC 6 นิ้ว จากห้องน้ำและถังดักไขมันด้านหลัง 2 ใบ) -1.45 ที่ปลายด้านซ้าย · ท่อออก (PVC 6 นิ้ว) -1.55 ที่ปลายด้านขวา แล้วเดินต่อไปเข้าถัง SP-T-20,000 L' } },
  { id: 'SP-T-20,000 L', where: { en: 'north of the shops', th: 'ด้านเหนือของร้านค้า' }, x: 126.89, y: 118.90, rot: 89.1, len: 7.9, dia: 2.5, inL: -1.65, covers: [[126.95, 121.9], [126.95, 118.75], [126.45, 115.85], [127.32, 115.85]],
    pipes: { en: 'North end: pipe in (PVC 6", from the SP-T-18,000 L tank) -1.65. South end, two pipes: -1.65 on the pipe that runs to the east drain (manhole E4, -1.80), and -1.75 on the pipe from the shop grease traps.', th: 'ปลายด้านเหนือ: ท่อเข้า (PVC 6 นิ้ว จากถัง SP-T-18,000 L) -1.65 ปลายด้านใต้มีท่อ 2 เส้น: -1.65 ที่ท่อซึ่งเดินไปลงท่อระบายน้ำด้านขวา (บ่อพัก E4, -1.80) และ -1.75 ที่ท่อจากถังดักไขมันของร้านค้า' },
    extra: { en: 'Check on site: as written, the pipe from the grease traps comes in 0.10 m LOWER (-1.75) than the pipe going out to the drain (-1.65). The two labels may be swapped on the layout.', th: 'ต้องตรวจสอบหน้างาน: ตามที่เขียนในผัง ท่อจากถังดักไขมันเข้าถังต่ำกว่า (-1.75) ท่อที่ออกไปท่อระบายน้ำ (-1.65) อยู่ 0.10 ม. ป้ายระดับสองจุดนี้อาจสลับกันในผัง' } },
  { id: 'SP-T-15,000 L', where: { en: 'KFC', th: 'KFC' }, x: 117.98, y: 62.955, rot: 0, len: 7.9, dia: 2.5, inL: -1.64, covers: [[114.9, 63.0], [118.15, 63.0], [121.2, 63.0]],
    pipes: { en: 'Pipe in (PVC 6", from the two KFC grease traps and the KFC SP-T-1600 tank) -1.64 at the west end · pipe out (PVC 6") -1.89 at the east end, which runs to the east drain (manhole E9, -2.05).', th: 'ท่อเข้า (PVC 6 นิ้ว จากถังดักไขมัน KFC 2 ใบ และถัง SP-T-1600 ของ KFC) -1.64 ที่ปลายด้านซ้าย · ท่อออก (PVC 6 นิ้ว) -1.89 ที่ปลายด้านขวา เดินไปลงท่อระบายน้ำด้านขวา (บ่อพัก E9, -2.05)' },
    extra: { en: 'The tank is drawn under the parking bays north of KFC. The levels -1.64 and -1.89 are written above its two ends without leader lines; they are read as pipe in and pipe out (0.25 m apart, more than usual: check on site). The KFC as-built sheet KFC-ME-03 (2021) names the tank actually installed: DOS LITETITE DLFS-15Q(N), 15,000 L, drawn there with four round lids, aerated from the air pump room beside the grease traps.', th: 'ถังเขียนอยู่ใต้ช่องจอดรถด้านเหนือของ KFC ระดับ -1.64 และ -1.89 เขียนไว้เหนือปลายถังทั้งสองโดยไม่มีเส้นชี้ จึงอ่านเป็นท่อเข้าและท่อออก (ต่างกัน 0.25 ม. มากกว่าปกติ ต้องตรวจสอบหน้างาน) แบบก่อสร้างจริงของ KFC แผ่น KFC-ME-03 (2021) ระบุถังที่ติดตั้งจริง: DOS LITETITE DLFS-15Q(N) ขนาด 15,000 ลิตร ในแบบเขียนมีฝากลม 4 ฝา เติมอากาศจากห้องเครื่องเติมอากาศข้างถังดักไขมัน' } },
];

// Round tanks drawn with one 1.47 m symbol whatever their size. Body size by volume is ASSUMED (typical PE tanks): [across, high]
const ROUND = { 800: [1.15, 1.26], 1000: [1.24, 1.36], 1600: [1.44, 1.56], 2000: [1.56, 1.70], 5000: [2.00, 2.00] };
// Shop grease traps behind the east shop row, north to south: [x, y, litres, level written or null]
const SHOP_GT = [[126.15, 111.34, 1600, null], [126.11, 108.11, 1000, null], [126.04, 101.20, 1000, null], [125.95, 98.31, 1000, null], [125.91, 92.52, 1000, null], [125.84, 87.54, 1000, null], [125.91, 76.38, 2000, -1.45]];

export default {
  name: 'King Kaew',
  origin: [94, 81],
  datum: {
    en: 'Levels are the "inv" (pipe) levels written on the layout LAY-ME-02, in metres. The layout does not say what its ±0.00 is and gives no ground levels. From the trap detail GN-SEP-01 the footpath at the two outfall traps works out at about -0.85 and the public footpath at about -1.00. The model takes the whole site as flat at -0.85, so every depth below ground is approximate.',
    th: 'ระดับคือระดับท่อ ("inv") ที่เขียนในผัง LAY-ME-02 หน่วยเป็นเมตร ผังไม่ได้ระบุว่า ±0.00 คืออะไร และไม่มีระดับพื้น จากแบบขยายบ่อดักน้ำมัน GN-SEP-01 คำนวณได้ว่าทางเท้าที่บ่อดักน้ำมันทั้งสองอยู่ที่ประมาณ -0.85 และทางเท้าสาธารณะประมาณ -1.00 โมเดลนี้ถือว่าพื้นทั้งสถานีเรียบที่ -0.85 ความลึกจากผิวพื้นทุกค่าจึงเป็นค่าประมาณ',
  },
  note: {
    en: 'First version, built from the SPP as-built layout LAY-ME-02 and trap detail GN-SEP-01 (Nov 2021). No ground levels and no tank details are on file, so depths are approximate. Check on site before any digging; not for setting out.',
    th: 'ฉบับแรก จัดทำจากผังก่อสร้างจริงของ SPP LAY-ME-02 และแบบขยาย GN-SEP-01 (พ.ย. 2021) ไม่มีระดับพื้นและไม่มีแบบขยายถัง ความลึกจึงเป็นค่าประมาณ ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง',
  },
  built: '2026-11-25',
  // no north arrow on the sheet: `north` left out. The highway (3256, King Kaew road) is at the bottom of the sheet.
  boundary: [[59.11, 26.11], [127.05, 26.03], [129.76, 136.37], [60.87, 136.87]],
  ground: {
    bbox: [44, 14.07, 142, 141], step: 2, apron: 2, road: FOOTPATH,
    roadArea: [[44, 13.5], [142, 13.5], [142, 26.03], [127.05, 26.03], [59.11, 26.11], [44, 26.11]],
    points: [[60, 27, G0], [128, 27, G0], [129, 136, G0], [61, 136, G0], [94, 81, G0]],
    names: { siteGround: { en: 'Forecourt and paving (taken as flat)', th: 'ลานและพื้นผิว (ถือว่าเรียบ)' }, road: { en: 'Highway 3256 side and entrances', th: 'ด้านทางหลวง 3256 และทางเข้าออก' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'fuel', 'buildings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', en: 'Whole site', th: 'ทั้งสถานี', from: [85, -52, 92], to: [85, 74, 0] },
    { id: 'plan', en: 'Plan', th: 'ผัง', from: [85, 80.9, 190], to: [85, 81, 0] },
    { id: 'toilets', en: 'Toilet tank (18,000 L)', th: 'ถังที่ห้องน้ำ (18,000 L)', from: [133, 150, 13], to: [120, 133, -1.5] },
    { id: 'shops', en: 'Shop tank (20,000 L) and grease traps', th: 'ถังร้านค้า (20,000 L) และถังดักไขมัน', from: [147, 88, 20], to: [126.5, 106, -1.5] },
    { id: 'kfc', en: 'KFC tanks', th: 'ถังของ KFC', from: [104, 74, 12], to: [118, 59.5, -1.5] },
    { id: 'fuel', from: [80, 67, 5], to: [67.3, 84, -2.6] },
    { id: 'under', en: 'From below ground', th: 'มองจากใต้ดิน', from: [148, 0, -12], to: [120, 56, -1.5] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, lv, add, boxGeo, cylGeo, hcylGeo, prismGeo, pipeGeo, merge }) {
    const r2 = (n) => Math.round(n * 100) / 100;   // worked-out levels are shown to the centimetre
    const lines = notes;   // (en lines, th lines, 'drawn' | 'part' | 'context')
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tag ? g.mid.clone().setY(g.mid.y + 0.6) : null); return g; };
    const unit = (rot) => { const a = rot * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; };
    const depth = (l) => (G0 - l).toFixed(2);
    const GROUND_EN = `Ground is taken as ${lv(G0)} over the whole site (see the levels note), so depths are approximate.`;
    const GROUND_TH = `ถือว่าระดับพื้นทั้งสถานีอยู่ที่ ${lv(G0)} (ดูหมายเหตุเรื่องระดับ) ความลึกจึงเป็นค่าประมาณ`;

    // ---------- the three large treatment tanks (lying), plus the unnamed outline beside the 18,000 L tank
    const lying = (t, top) => {
      const r = t.dia / 2, axis = top - r, [ux, uy] = unit(t.rot), cap = 0.5;
      const parts = [capsuleGeo(r, t.len, t.x, t.y, axis, t.rot)];   // lying capsule, slightly rounded ends
      return merge(parts);
    };
    const covers = (t, top) => {
      for (const [mx, my] of t.covers) {
        if (G0 > top) add('tanks', cylGeo(0.3, G0 - top, mx, my, top), 'tank', { en: `${t.id} access`, th: `ช่องเปิด ${t.id}`, nopick: 1 });
        add('tanks', cylGeo(0.33, 0.03, mx, my, G0), 'cover', { en: `${t.id} cover`, th: `ฝา ${t.id}`, nopick: 1 });
      }
    };
    for (const t of TANKS) {
      const top = r2(t.inL + 0.40);
      add('tanks', lying(t, top), 'tank', { en: `${t.id} treatment tank · ${t.where.en}`, th: `ถังบำบัด ${t.id} · ${t.where.th}`, tag: t.id, tagTh: t.id, kind: 'tank',
        info: lines([`Wastewater treatment tank named ${t.id} on the layout, lying down. Drawn ${t.len.toFixed(2)} m long and ${t.dia.toFixed(2)} m across.`,
          t.pipes.en,
          `Ground taken as ${lv(G0)} · top of tank about ${lv(top)} · underside about ${lv(top - t.dia)}.`,
          'The depth is assumed: the top of the tank is taken 0.40 m above the pipe in. There is no tank detail drawing on file (maker, model, base slab and air pumps are not known).',
          ...(t.extra ? [t.extra.en] : []), SITE_VISIT_TANK.en],
        [`ถังบำบัดน้ำเสียที่ผังเรียกว่า ${t.id} แบบนอน ในผังยาว ${t.len.toFixed(2)} ม. กว้าง ${t.dia.toFixed(2)} ม.`,
          t.pipes.th,
          `ถือว่าระดับพื้น ${lv(G0)} · หลังถังประมาณ ${lv(top)} · ใต้ถังประมาณ ${lv(top - t.dia)}`,
          'ความลึกเป็นค่าสมมติ: ถือว่าหลังถังอยู่สูงกว่าท่อเข้า 0.40 ม. ไม่มีแบบขยายของถัง (ไม่ทราบผู้ผลิต รุ่น ฐานคอนกรีต และปั๊มลม)',
          ...(t.extra ? [t.extra.th] : []), SITE_VISIT_TANK.th], P) }, V(t.x, t.y, G0 + 0.7));
      covers(t, top);
    }
    { // outline with two covers drawn west of the 18,000 L tank: no name, no level, no pipe into it
      const t = { id: 'Unnamed tank', x: 113.15, y: 135.15, rot: -0.8, len: 7.2, dia: 2.0, covers: [[110.65, 135.2], [115.7, 135.15]] }, top = -1.05;
      add('tanks', lying(t, top), 'tank', { en: 'Tank outline with no name · behind the toilets', th: 'แนวถังที่ไม่มีชื่อ · หลังห้องน้ำ', tag: 'Tank (no name on the layout)', tagTh: 'ถัง (ผังไม่ระบุชื่อ)', kind: 'tank',
        info: lines(['A second tank outline with two covers is drawn beside the SP-T-18,000 L tank: 7.20 m long, 2.00 m across.',
          'The layout gives it no name and no level, and draws no pipe into or out of it. The 4" pipe from the north grease traps passes along its north edge.',
          'Shown at the same depth as the SP-T-18,000 L tank (assumed). Check on site what this tank is and whether it is connected.'],
        ['มีแนวถังอีกใบพร้อมฝา 2 ฝา เขียนอยู่ข้างถัง SP-T-18,000 L: ยาว 7.20 ม. กว้าง 2.00 ม.',
          'ผังไม่ได้ระบุชื่อหรือระดับ และไม่ได้เขียนท่อเข้าหรือท่อออก ท่อ 4 นิ้วจากถังดักไขมันด้านหลังเดินผ่านขอบด้านเหนือของถังนี้',
          'แสดงที่ความลึกเดียวกับถัง SP-T-18,000 L (ค่าสมมติ) ต้องตรวจสอบหน้างานว่าเป็นถังอะไรและต่อใช้งานอยู่หรือไม่'], P) }, V(t.x, t.y, G0 + 0.7));
      covers(t, top);
    }

    // ---------- round tanks: grease traps and the two small SP-T-1600 tanks
    const round = (x, y, litres, material, o) => {
      const [dia, h] = ROUND[litres], top = G0 - 0.10;
      add('tanks', cylGeo(dia / 2, h, x, y, top - h), material, o, o.tag ? V(x, y, G0 + 0.6) : null);
      add('tanks', cylGeo(0.35, 0.03, x, y, G0), 'cover', { en: 'Tank cover', th: 'ฝาถัง', nopick: 1 });
      return [dia, h, top];
    };
    const sizeEn = (litres) => { const [dia, h] = ROUND[litres]; return `The layout draws every round tank with the same 1.47 m symbol. The body shown (${dia.toFixed(2)} m across, ${h.toFixed(2)} m high, top 0.10 m below ground) is a typical size for ${litres.toLocaleString('en')} L and is assumed.`; };
    const sizeTh = (litres) => { const [dia, h] = ROUND[litres]; return `ผังเขียนถังกลมทุกใบด้วยสัญลักษณ์ขนาด 1.47 ม. เท่ากัน ตัวถังที่แสดง (กว้าง ${dia.toFixed(2)} ม. สูง ${h.toFixed(2)} ม. หลังถังต่ำกว่าพื้น 0.10 ม.) เป็นขนาดทั่วไปของถัง ${litres.toLocaleString('en')} ลิตร และเป็นค่าสมมติ`; };

    // north shop units: two GT-T-1000, each marked -1.05
    [[96.84, 134.91], [101.83, 134.98]].forEach(([x, y], i) => round(x, y, 1000, 'grease', { en: `North shop grease trap ${i + 1} · GT-T-1000`, th: `ถังดักไขมันร้านค้าด้านหลัง ${i + 1} · GT-T-1000`, ...(i === 0 ? { tag: 'Grease traps', tagTh: 'ถังดักไขมัน' } : {}), kind: 'tank',
      info: lines([`Grease trap GT-T-1000 (1,000 L) behind north shop unit ${i + 1}.`, `Level written at this trap: -1.05 (about ${depth(-1.05)} m below ground). Its 4" PVC outlet runs east along the back wall to the SP-T-18,000 L tank.`, sizeEn(1000)],
        [`ถังดักไขมัน GT-T-1000 (1,000 ลิตร) หลังร้านค้าด้านหลังคูหาที่ ${i + 1}`, `ระดับที่เขียนที่ถังนี้: -1.05 (ลึกจากพื้นประมาณ ${depth(-1.05)} ม.) ท่อออก PVC 4 นิ้ว เดินไปทางขวาตามผนังด้านหลังเข้าถัง SP-T-18,000 L`, sizeTh(1000)], P) }));
    // toilets: GT-T-800
    round(127.26, 129.03, 800, 'grease', { en: 'Toilet block grease trap · GT-T-800', th: 'ถังดักไขมันที่ห้องน้ำ · GT-T-800', tag: 'GT-T-800', tagTh: 'GT-T-800', kind: 'tank',
      info: lines(['Grease trap GT-T-800 (800 L) at the east end of the toilet block.', 'No level is written at it. Its 4" PVC outlet joins the 6" pipe that runs from the SP-T-18,000 L tank to the SP-T-20,000 L tank.', sizeEn(800)],
        ['ถังดักไขมัน GT-T-800 (800 ลิตร) ที่ปลายด้านขวาของอาคารห้องน้ำ', 'ไม่มีระดับเขียนไว้ ท่อออก PVC 4 นิ้ว ต่อเข้าท่อ 6 นิ้วที่เดินจากถัง SP-T-18,000 L ไปถัง SP-T-20,000 L', sizeTh(800)], P) });
    // east shop row: seven traps
    SHOP_GT.forEach(([x, y, litres, l], i) => round(x, y, litres, 'grease', { en: `Shop grease trap ${i + 1} · GT-T-${litres}`, th: `ถังดักไขมันร้านค้า ${i + 1} · GT-T-${litres}`, ...(i === 0 ? { tag: 'Grease traps', tagTh: 'ถังดักไขมัน' } : {}), ...(litres === 2000 ? { tag: 'GT-T-2000', tagTh: 'GT-T-2000' } : {}), kind: 'tank',
      info: lines([`Grease trap GT-T-${litres} (${litres.toLocaleString('en')} L) behind ${i === 6 ? 'the large shop unit' : `shop unit ${i + 1}`}, number ${i + 1} of 7 counting from the north.`,
        l != null ? `Level written at this trap: ${lv(l)} (about ${depth(l)} m below ground).` : 'No level is written at this trap; only the GT-T-2000 at the south end of the row (-1.45) and the tank inlet (-1.75) have levels.',
        'Its 4" PVC outlet joins the pipe behind the shops, which runs NORTH to the SP-T-20,000 L tank.', sizeEn(litres)],
      [`ถังดักไขมัน GT-T-${litres} (${litres.toLocaleString('en')} ลิตร) หลัง${i === 6 ? 'ร้านค้าคูหาใหญ่' : `ร้านค้าคูหาที่ ${i + 1}`} ใบที่ ${i + 1} จาก 7 ใบ นับจากด้านเหนือ`,
        l != null ? `ระดับที่เขียนที่ถังนี้: ${lv(l)} (ลึกจากพื้นประมาณ ${depth(l)} ม.)` : 'ไม่มีระดับเขียนที่ถังนี้ มีเฉพาะที่ถัง GT-T-2000 ปลายแถวด้านใต้ (-1.45) และที่ทางเข้าถังบำบัด (-1.75)',
        'ท่อออก PVC 4 นิ้ว ต่อเข้าท่อหลังร้านค้า ซึ่งเดินขึ้นไปทางเหนือเข้าถัง SP-T-20,000 L', sizeTh(litres)], P) }));
    // KFC: two GT-T-5000 in a row, then the SP-T-1600
    [[118.61, 60.18, 'first (east)', 'ใบแรก (ด้านขวา)'], [115.66, 60.17, 'second (west)', 'ใบที่สอง (ด้านซ้าย)']].forEach(([x, y, en, th], i) => round(x, y, 5000, 'grease', { en: `KFC grease trap, ${en} · GT-T-5000`, th: `ถังดักไขมัน KFC ${th} · GT-T-5000`, ...(i === 0 ? { tag: 'Grease traps', tagTh: 'ถังดักไขมัน' } : {}), kind: 'tank',
      info: lines([`Grease trap GT-T-5000 (5,000 L) north of KFC, the ${en} of two in a row.`, 'The 4" PVC pipe from the KFC kitchen passes through the east trap, then the west trap, then turns north into the SP-T-15,000 L tank. No level is written at the traps (kitchen end -1.05, tank inlet -1.64).', 'Model installed (KFC as-built sheet KFC-ME-03, 2021): DOS SGT-07/BK-5000L.', sizeEn(5000)],
        [`ถังดักไขมัน GT-T-5000 (5,000 ลิตร) ด้านเหนือของ KFC ${th} จาก 2 ใบที่ต่อเรียงกัน`, 'ท่อ PVC 4 นิ้วจากครัว KFC ผ่านถังด้านขวา แล้วถังด้านซ้าย แล้วเลี้ยวขึ้นเหนือเข้าถัง SP-T-15,000 L ไม่มีระดับเขียนที่ถังดักไขมัน (ปลายด้านครัว -1.05 ทางเข้าถังบำบัด -1.64)', 'รุ่นที่ติดตั้งจริง (แบบก่อสร้างจริง KFC-ME-03 ปี 2021): DOS SGT-07/BK-5000L', sizeTh(5000)], P) }));
    round(118.18, 54.46, 1600, 'tank', { en: 'SP-T-1600 tank · KFC toilet', th: 'ถัง SP-T-1600 · ห้องน้ำ KFC', tag: 'SP-T-1600', tagTh: 'SP-T-1600', kind: 'tank',
      info: lines(['Small tank named SP-T-1600 (1,600 L) at the north wall of KFC, beside the KFC toilet.', `Level written at this tank: -1.00 (about ${depth(-1.00)} m below the assumed ground; the ground at KFC may be higher). Its 4" PVC outlet runs north and joins the pipe into the SP-T-15,000 L tank.`, 'Model installed (KFC as-built sheet KFC-ME-03, 2021): DOS OK ST-24/BK-1600L, the treatment tank for the KFC toilet (it takes the toilet\'s soil and waste pipes).', sizeEn(1600)],
        ['ถังขนาดเล็กที่ผังเรียกว่า SP-T-1600 (1,600 ลิตร) ที่ผนังด้านเหนือของ KFC ข้างห้องน้ำ KFC', `ระดับที่เขียนที่ถังนี้: -1.00 (ลึกจากระดับพื้นสมมติประมาณ ${depth(-1.00)} ม. พื้นที่ KFC อาจสูงกว่านี้) ท่อออก PVC 4 นิ้ว เดินขึ้นเหนือไปต่อเข้าท่อที่เข้าถัง SP-T-15,000 L`, 'รุ่นที่ติดตั้งจริง (แบบก่อสร้างจริง KFC-ME-03 ปี 2021): DOS OK ST-24/BK-1600L ถังบำบัดน้ำเสียของห้องน้ำ KFC (รับท่อส้วมและท่อน้ำทิ้งของห้องน้ำ)', sizeTh(1600)], P) });
    round(62.91, 104.73, 1600, 'tank', { en: 'SP-T-1600 tank · small building on the west side', th: 'ถัง SP-T-1600 · อาคารเล็กด้านซ้ายของแบบ', tag: 'SP-T-1600', tagTh: 'SP-T-1600', kind: 'tank',
      info: lines(['Small tank named SP-T-1600 (1,600 L) north of the small building beside the car wash slab. It takes the 4" PVC pipe from that building\'s toilet.', 'No level is written at it. Its outlet runs round the west side to the west drain at manhole W5 (-1.925).', sizeEn(1600)],
        ['ถังขนาดเล็กที่ผังเรียกว่า SP-T-1600 (1,600 ลิตร) ด้านเหนือของอาคารเล็กข้างลานล้างรถ รับท่อ PVC 4 นิ้วจากห้องน้ำของอาคารนั้น', 'ไม่มีระดับเขียนไว้ ท่อออกเดินอ้อมด้านซ้ายไปลงท่อระบายน้ำด้านซ้ายที่บ่อพัก W5 (-1.925)', sizeTh(1600)], P) });

    // ---------- wastewater pipes
    // toilets and north grease traps -> SP-T-18,000 L
    pipe('sewer', [[97.54, 134.92, -1.05], [99.98, 134.91], [100.15, 135.28], [100.16, 135.76], [100.42, 136.04], [116.20, 135.72], [116.98, 135.07], [117.84, 135.07], [118.90, 135.05, -1.45]], 0.05, 'sewerRaw', { en: 'North grease traps to the SP-T-18,000 L tank', th: 'ท่อจากถังดักไขมันด้านหลังไปถัง SP-T-18,000 L', kind: 'pipe',
      info: (m) => lines([`4" PVC from the two north grease traps (-1.05), east along the back boundary to the tank inlet (-1.45). About ${m} m.`, 'Only the two end levels are written; the pipe is shown as one straight fall between them. It is drawn right beside the north site drain.'],
        [`ท่อ PVC 4 นิ้ว จากถังดักไขมันด้านหลัง 2 ใบ (-1.05) เดินไปทางขวาตามแนวเขตด้านหลังเข้าถัง (-1.45) ยาวประมาณ ${m} ม.`, 'มีระดับเขียนเฉพาะที่ปลายทั้งสอง ท่อจึงแสดงเป็นแนวลาดตรงระหว่างสองจุด ในผังท่อนี้เขียนชิดกับท่อระบายน้ำด้านหลัง'], D) });
    pipe('sewer', [[101.08, 134.97, -1.05], [100.45, 134.96], [100.15, 135.28, -1.10]], 0.05, 'sewerRaw', { en: 'North grease trap 2 outlet', th: 'ท่อออกจากถังดักไขมันด้านหลังใบที่ 2', kind: 'pipe',
      info: lines(['Short 4" PVC from the second north grease trap (-1.05) to the pipe that runs to the tank. The level at the join is worked out along that pipe.'], ['ท่อ PVC 4 นิ้วช่วงสั้นจากถังดักไขมันด้านหลังใบที่ 2 (-1.05) ไปต่อเข้าท่อที่เดินไปถัง ระดับที่จุดต่อคำนวณตามแนวท่อหลัก'], P) });
    pipe('sewer', [[111.42, 134.26, -1.38], [116.88, 134.16], [117.41, 135.07], [117.84, 135.07], [118.90, 135.05, -1.45]], 0.075, 'sewerRaw', { en: 'Toilets (west half) to the SP-T-18,000 L tank', th: 'ท่อจากห้องน้ำ (ครึ่งซ้าย) เข้าถัง SP-T-18,000 L', kind: 'pipe',
      info: (m) => lines([`6" soil pipe (S PVC 6") along the back of the toilet block to the tank inlet at -1.45. About ${m} m shown.`, 'The level at the far end is assumed (fall 1:100). The branch pipes under the toilet floor are only in the plan drawing on the ground.'],
        [`ท่อโสโครก 6 นิ้ว (S PVC 6") เดินตามด้านหลังอาคารห้องน้ำเข้าถังที่ระดับ -1.45 แสดงประมาณ ${m} ม.`, 'ระดับที่ปลายด้านไกลเป็นค่าสมมติ (ลาด 1:100) ท่อแยกใต้พื้นห้องน้ำมีเฉพาะในแบบที่วางบนพื้น'], P) });
    pipe('sewer', [[124.26, 133.24, -1.37], [117.75, 133.35], [117.21, 133.90], [117.21, 134.13], [117.70, 135.07], [117.84, 135.07], [118.90, 135.05, -1.45]], 0.075, 'sewerRaw', { en: 'Toilets (east half) to the SP-T-18,000 L tank', th: 'ท่อจากห้องน้ำ (ครึ่งขวา) เข้าถัง SP-T-18,000 L', kind: 'pipe',
      info: (m) => lines([`6" soil pipe along the back wall of the east half of the toilet block to the tank inlet at -1.45. About ${m} m shown.`, 'The level at the far end is assumed (fall 1:100). The branch pipes under the toilet floor are only in the plan drawing on the ground.'],
        [`ท่อโสโครก 6 นิ้ว เดินตามผนังด้านหลังของห้องน้ำครึ่งขวาเข้าถังที่ระดับ -1.45 แสดงประมาณ ${m} ม.`, 'ระดับที่ปลายด้านไกลเป็นค่าสมมติ (ลาด 1:100) ท่อแยกใต้พื้นห้องน้ำมีเฉพาะในแบบที่วางบนพื้น'], P) });
    // SP-T-18,000 L -> SP-T-20,000 L, with the GT-T-800 joining
    const link = pipe('sewer', [[125.39, 134.96, -1.55], [127.69, 134.96], [128.48, 134.16], [128.37, 126.97], [128.35, 125.86], [126.96, 124.42], [126.96, 122.80, -1.65]], 0.075, 'sewerRaw', { en: 'SP-T-18,000 L tank to the SP-T-20,000 L tank', th: 'ท่อจากถัง SP-T-18,000 L ไปถัง SP-T-20,000 L', tag: 'Tank to tank', tagTh: 'ท่อระหว่างถัง', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the east end of the SP-T-18,000 L tank at -1.55, runs south down the east boundary and enters the north end of the SP-T-20,000 L tank at -1.65. About ${m} m.`, 'So the toilet wastewater goes through both tanks before it reaches the drain. The pipe is drawn about 0.5 m west of the east site drain.'],
        [`ท่อ PVC 6 นิ้ว ออกจากปลายด้านขวาของถัง SP-T-18,000 L ที่ -1.55 เดินลงใต้ตามแนวเขตด้านขวา เข้าปลายด้านเหนือของถัง SP-T-20,000 L ที่ -1.65 ยาวประมาณ ${m} ม.`, 'น้ำเสียจากห้องน้ำจึงผ่านถังทั้งสองใบก่อนลงท่อระบายน้ำ ในผังท่อนี้อยู่ห่างจากท่อระบายน้ำด้านขวาไปทางซ้ายประมาณ 0.5 ม.'], D) });
    const linkAt = r2(link.levels[3][2]);
    pipe('sewer', [[127.26, 128.44, r2(linkAt + 0.03)], [127.27, 127.20], [127.50, 126.96], [128.13, 126.97], [128.37, 126.97, linkAt]], 0.05, 'sewerRaw', { en: 'GT-T-800 outlet', th: 'ท่อออกจากถัง GT-T-800', kind: 'pipe',
      info: lines([`4" PVC from the toilet block grease trap to the 6" pipe between the two tanks. No level is written; it is shown at the level of that pipe at the join (about ${lv(linkAt)}).`], [`ท่อ PVC 4 นิ้ว จากถังดักไขมันที่ห้องน้ำไปต่อเข้าท่อ 6 นิ้วระหว่างถังทั้งสอง ไม่มีระดับเขียนไว้ แสดงที่ระดับของท่อหลักตรงจุดต่อ (ประมาณ ${lv(linkAt)})`], P) });
    // SP-T-20,000 L -> east drain
    pipe('sewer', [[126.44, 115.00, -1.65], [126.43, 113.95], [127.98, 112.39], [127.91, 107.95], [128.38, 107.77, -1.80]], 0.075, 'sewerTreated', { en: 'SP-T-20,000 L tank outlet to the east drain', th: 'ท่อออกจากถัง SP-T-20,000 L ลงท่อระบายน้ำด้านขวา', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the south end of the tank at -1.65 and joins the east site drain at manhole E4 (-1.80). About ${m} m.`, 'Check on site: the other pipe at this end of the tank is marked lower (-1.75); see the note on the tank.'],
        [`ท่อ PVC 6 นิ้ว ออกจากปลายด้านใต้ของถังที่ -1.65 ลงท่อระบายน้ำด้านขวาที่บ่อพัก E4 (-1.80) ยาวประมาณ ${m} ม.`, 'ต้องตรวจสอบหน้างาน: ท่ออีกเส้นที่ปลายถังด้านนี้ระบุระดับต่ำกว่า (-1.75) ดูหมายเหตุที่ถัง'], D) });
    // shop grease traps -> SP-T-20,000 L (runs north). Two lines are drawn 0.25 m apart; both end at the tank's -1.75 connection.
    const colA = pipe('sewer', [[125.92, 75.75, -1.45], [125.92, 75.27], [126.06, 75.13], [126.83, 75.13], [126.98, 75.27], [127.15, 86.42], [127.22, 91.38], [127.57, 113.98], [127.34, 114.40], [127.34, 115.00, -1.75]], 0.05, 'sewerRaw', { en: 'Pipe behind the shops to the SP-T-20,000 L tank', th: 'ท่อหลังร้านค้าไปถัง SP-T-20,000 L', tag: 'From the shop grease traps', tagTh: 'จากถังดักไขมันร้านค้า', kind: 'pipe',
      info: (m) => lines([`4" PVC behind the shop row. Starts at the GT-T-2000 trap (-1.45) and runs NORTH, collecting the grease traps, into the south end of the SP-T-20,000 L tank (-1.75). About ${m} m.`, 'Only the two end levels are written; the pipe is shown as one straight fall between them. It is drawn as a broken line about 1 m west of the east site drain.'],
        [`ท่อ PVC 4 นิ้ว หลังแถวร้านค้า เริ่มที่ถัง GT-T-2000 (-1.45) เดินขึ้นไปทางเหนือ รับน้ำจากถังดักไขมัน เข้าปลายด้านใต้ของถัง SP-T-20,000 L (-1.75) ยาวประมาณ ${m} ม.`, 'มีระดับเขียนเฉพาะที่ปลายทั้งสอง ท่อจึงแสดงเป็นแนวลาดตรงระหว่างสองจุด ในผังเขียนเป็นเส้นประห่างจากท่อระบายน้ำด้านขวาไปทางซ้ายประมาณ 1 ม.'], D) });
    const at = (y) => r2(-1.45 - 0.30 * (y - 75.27) / (115.0 - 75.27));   // level of that pipe at a given y
    pipe('sewer', [[127.15, 99.21, at(99.21)], [127.35, 112.46], [127.07, 112.74], [127.07, 113.53], [127.34, 113.79, at(113.79)]], 0.05, 'sewerRaw', { en: 'Second pipe behind shop units 1 to 4', th: 'ท่อเส้นที่สองหลังร้านค้าคูหาที่ 1 ถึง 4', kind: 'pipe',
      info: (m) => lines([`A second 4" PVC line is drawn 0.25 m west of the first, from the traps of shop units 3 and 4 north to the same tank connection. About ${m} m.`, 'No level is written on it; it is shown at the level of the pipe beside it.'],
        [`มีท่อ PVC 4 นิ้วอีกเส้นเขียนห่างจากเส้นแรกไปทางซ้าย 0.25 ม. จากถังดักไขมันของคูหาที่ 3 และ 4 ขึ้นเหนือไปจุดต่อเดียวกันที่ถัง ยาวประมาณ ${m} ม.`, 'ไม่มีระดับเขียนไว้ แสดงที่ระดับเดียวกับท่อข้างเคียง'], P) });
    const outs = [
      [[126.14, 110.75], [126.16, 109.77], [126.27, 109.66], [127.16, 109.66], [127.31, 109.80]],
      [[126.12, 108.66], [126.12, 109.19], [126.27, 109.33], [127.16, 109.33], [127.30, 109.47]],
      [[126.03, 100.48], [126.03, 99.97], [126.13, 99.86], [127.01, 99.86], [127.16, 100.00]],
      [[125.97, 98.86], [125.98, 99.39], [126.12, 99.54], [127.01, 99.54], [127.16, 99.67]],
      [[125.90, 91.92], [125.90, 91.39], [126.05, 91.24], [127.08, 91.24], [127.22, 91.38]],
      [[125.83, 86.95], [125.83, 86.42], [125.97, 86.28], [127.00, 86.28], [127.15, 86.42]],
    ].map((p) => { const l = at(p[4][1]); return pipeGeo(p.map(([x, y], i) => [x, y, i === 0 ? r2(l + 0.03) : i === 4 ? l : null]), 0.05).geometry; });
    add('sewer', merge(outs), 'sewerRaw', { en: 'Shop grease trap outlets', th: 'ท่อออกจากถังดักไขมันร้านค้า', kind: 'pipe',
      info: lines(['Short 4" PVC pipe from each grease trap to the pipe behind the shops. Routes as drawn; levels follow that pipe (assumed).', 'The 2" PVC pipe from each shop unit into its trap is only in the plan drawing on the ground.'], ['ท่อ PVC 4 นิ้วช่วงสั้นจากถังดักไขมันแต่ละใบไปท่อหลังร้านค้า แนวท่อตามผัง ระดับตามท่อหลัก (ค่าสมมติ)', 'ท่อ PVC 2 นิ้วจากร้านค้าแต่ละคูหาเข้าถังดักไขมันมีเฉพาะในแบบที่วางบนพื้น'], P) });
    void colA;
    // KFC: kitchen -> two grease traps -> SP-T-15,000 L; the SP-T-1600 joins before the tank
    const kfc = pipe('sewer', [[122.35, 50.95, -1.05], [122.35, 59.49], [121.66, 60.19], [119.34, 60.19], [117.80, 60.18], [116.43, 60.18], [114.92, 60.17], [114.18, 60.17], [113.77, 60.17], [113.39, 60.54], [113.39, 62.66], [113.69, 62.96], [114.05, 62.96, -1.64]], 0.05, 'sewerRaw', { en: 'KFC kitchen to the grease traps and the SP-T-15,000 L tank', th: 'ท่อจากครัว KFC ผ่านถังดักไขมันไปถัง SP-T-15,000 L', tag: 'From the KFC kitchen', tagTh: 'จากครัว KFC', kind: 'pipe',
      info: (m) => lines([`4" PVC from the chamber at the KFC kitchen wall (-1.05) north, then west through the two GT-T-5000 grease traps, then 6" PVC north into the west end of the tank (-1.64). About ${m} m.`, 'Only the two end levels are written; the pipe is shown as one straight fall between them, straight through the traps.'],
        [`ท่อ PVC 4 นิ้ว จากบ่อที่ผนังครัว KFC (-1.05) ขึ้นเหนือ แล้วไปทางซ้ายผ่านถังดักไขมัน GT-T-5000 2 ใบ แล้วเป็นท่อ PVC 6 นิ้วขึ้นเหนือเข้าปลายด้านซ้ายของถัง (-1.64) ยาวประมาณ ${m} ม.`, 'มีระดับเขียนเฉพาะที่ปลายทั้งสอง ท่อจึงแสดงเป็นแนวลาดตรงระหว่างสองจุด ผ่านถังดักไขมันตรง ๆ'], D) });
    const kfcJoin = r2(kfc.levels[7][2]);
    pipe('sewer', [[118.17, 55.05, -1.00], [118.16, 57.13], [117.76, 57.54], [116.83, 57.54], [114.18, 60.17, kfcJoin]], 0.05, 'sewerRaw', { en: 'KFC SP-T-1600 tank outlet', th: 'ท่อออกจากถัง SP-T-1600 ของ KFC', kind: 'pipe',
      info: (m) => lines([`4" PVC from the SP-T-1600 tank (-1.00) north, then north-west to the pipe that enters the SP-T-15,000 L tank. About ${m} m. It joins AFTER the grease traps.`, `The level at the join is worked out along that pipe (about ${lv(kfcJoin)}).`],
        [`ท่อ PVC 4 นิ้ว จากถัง SP-T-1600 (-1.00) ขึ้นเหนือ แล้วเฉียงไปต่อเข้าท่อที่เข้าถัง SP-T-15,000 L ยาวประมาณ ${m} ม. จุดต่ออยู่หลังถังดักไขมัน`, `ระดับที่จุดต่อคำนวณตามแนวท่อหลัก (ประมาณ ${lv(kfcJoin)})`], P) });
    pipe('sewer', [[121.90, 62.96, -1.89], [126.13, 62.96], [126.72, 62.40], [126.72, 60.10], [127.17, 59.79, -2.05]], 0.075, 'sewerTreated', { en: 'SP-T-15,000 L tank outlet to the east drain', th: 'ท่อออกจากถัง SP-T-15,000 L ลงท่อระบายน้ำด้านขวา', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the east end of the tank at -1.89, runs east under the pump room and joins the east site drain at manhole E9 (-2.05). About ${m} m.`], [`ท่อ PVC 6 นิ้ว ออกจากปลายด้านขวาของถังที่ -1.89 เดินไปทางขวาใต้ห้องปั๊มน้ำ ลงท่อระบายน้ำด้านขวาที่บ่อพัก E9 (-2.05) ยาวประมาณ ${m} ม.`], D) });
    // small building on the west side
    pipe('sewer', [[65.87, 102.59, -1.25], [63.05, 102.66], [62.90, 102.83], [62.91, 104.05, -1.30]], 0.05, 'sewerRaw', { en: 'Small building toilet to its SP-T-1600 tank', th: 'ท่อจากห้องน้ำอาคารเล็กเข้าถัง SP-T-1600', kind: 'pipe',
      info: (m) => lines([`4" PVC (labelled on the layout) from the toilet of the small building to the tank. About ${m} m. No level is written; shown about 0.40 m below ground (assumed).`], [`ท่อ PVC 4 นิ้ว (ตามที่ระบุในผัง) จากห้องน้ำของอาคารเล็กเข้าถัง ยาวประมาณ ${m} ม. ไม่มีระดับเขียนไว้ แสดงที่ลึกจากพื้นประมาณ 0.40 ม. (ค่าสมมติ)`], P) });
    pipe('sewer', [[62.93, 105.40, -1.35], [62.93, 105.71], [62.78, 105.88], [61.73, 105.89], [61.59, 105.74], [61.55, 103.50], [61.00, 103.40, -1.925]], 0.05, 'sewerTreated', { en: 'West SP-T-1600 tank outlet to the west drain', th: 'ท่อออกจากถัง SP-T-1600 ด้านซ้ายลงท่อระบายน้ำด้านซ้าย', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`Pipe from the tank round its west side to the west site drain at manhole W5 (-1.925). About ${m} m.`, 'No level is written at the tank; the pipe is shown leaving it 0.50 m below ground (assumed). Size not stated (drawn like the 4" pipes).'],
        [`ท่อจากถังอ้อมด้านซ้ายไปลงท่อระบายน้ำด้านซ้ายที่บ่อพัก W5 (-1.925) ยาวประมาณ ${m} ม.`, 'ไม่มีระดับเขียนที่ถัง ท่อแสดงออกจากถังที่ลึกจากพื้น 0.50 ม. (ค่าสมมติ) ไม่ระบุขนาดท่อ (เขียนเหมือนท่อ 4 นิ้ว)'], P) });
    // chamber at the KFC kitchen wall
    add('drains', boxGeo(1.0, 1.6, G0 - (-1.25), 122.35, 50.15, -1.25, 0), 'manhole', { en: 'Chamber at the KFC kitchen wall', th: 'บ่อที่ผนังครัว KFC', tag: 'KFC kitchen chamber', tagTh: 'บ่อที่ครัว KFC', lvl: lv(-1.05), kind: 'manhole',
      info: lines(['A 1.00 × 1.60 m box drawn against the east wall of KFC, not named on the layout. Level written beside it: -1.05. The 4" pipe to the KFC grease traps starts here.', `About ${depth(-1.05)} m below the assumed ground (the ground at KFC may be higher). Floor depth assumed. Check on site what it is (kitchen sump or first grease interceptor).`],
        ['กล่องขนาด 1.00 × 1.60 ม. เขียนชิดผนังด้านขวาของ KFC ผังไม่ได้ระบุชื่อ ระดับที่เขียนข้าง ๆ: -1.05 ท่อ 4 นิ้วไปถังดักไขมัน KFC เริ่มจากจุดนี้', `ลึกจากระดับพื้นสมมติประมาณ ${depth(-1.05)} ม. (พื้นที่ KFC อาจสูงกว่านี้) ความลึกก้นบ่อเป็นค่าสมมติ ต้องตรวจสอบหน้างานว่าเป็นอะไร (บ่อพักครัวหรือบ่อดักไขมันชั้นแรก)`], P) });
    add('drains', boxGeo(0.9, 1.5, 0.03, 122.35, 50.15, G0, 0), 'cover', { en: 'Chamber cover', th: 'ฝาบ่อ', nopick: 1 });

    // ---------- site drains and manholes
    const manhole = (x, y, l, id, written, extra) => {
      add('drains', boxGeo(0.6, 0.6, G0 - (l - 0.20), x, y, l - 0.20, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, ...(written ? { lvl: lv(l) } : {}), kind: 'manhole',
        info: lines([written ? `Level written on the layout: ${lv(l)} (pipe level). With the ground taken as ${lv(G0)}, the pipe is about ${depth(l)} m down.` : `No level is written at this manhole. It is shown at about ${lv(l)}, worked out between the manholes either side (about ${depth(l)} m below the assumed ground).`,
          'Drawn 0.60 m square on the layout. The pit floor is taken as 0.20 m below the pipe (assumed).', ...(extra ? [extra.en] : [])],
        [written ? `ระดับที่เขียนในผัง: ${lv(l)} (ระดับท่อ) เมื่อถือว่าระดับพื้น ${lv(G0)} ท่ออยู่ลึกประมาณ ${depth(l)} ม.` : `ไม่มีระดับเขียนที่บ่อนี้ แสดงที่ประมาณ ${lv(l)} โดยคำนวณระหว่างบ่อข้างเคียง (ลึกจากระดับพื้นสมมติประมาณ ${depth(l)} ม.)`,
          'ในผังเขียนเป็นบ่อสี่เหลี่ยม 0.60 ม. ก้นบ่อใช้ค่าต่ำกว่าท่อ 0.20 ม. (ค่าสมมติ)', ...(extra ? [extra.th] : [])], P) });
      add('drains', boxGeo(0.5, 0.5, 0.03, x, y, G0, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    };
    const seen = new Set();
    for (const run of RUNS) {
      const a = run.pts[0][2], b = run.pts.filter((p) => p[2] != null).pop()[2];
      const g = pipe('drains', run.pts, 0.1, 'drain', { en: `Site drain: ${run.en}`, th: `ท่อระบายน้ำภายในสถานี: ${run.th}`, kind: 'drain',
        info: (m) => lines([`About ${m} m. Levels along it run from ${lv(a)} to ${lv(b)}, as written at the manholes on the layout.`, 'Drawn 0.20 m wide on the layout, and the trap detail GN-SEP-01 labels the pipe into the outfall trap PVC 8", so it is shown as a 0.20 m pipe. The layout does not state the size on each run.', GROUND_EN],
          [`ยาวประมาณ ${m} ม. ระดับตามแนวท่อจาก ${lv(a)} ถึง ${lv(b)} ตามที่เขียนที่บ่อพักในผัง`, 'ในผังเขียนกว้าง 0.20 ม. และแบบขยาย GN-SEP-01 ระบุท่อเข้าบ่อดักน้ำมันเป็น PVC 8 นิ้ว จึงแสดงเป็นท่อ 0.20 ม. ผังไม่ได้ระบุขนาดท่อของแต่ละช่วง', GROUND_TH], P) });
      run.pts.forEach(([x, y, l], i) => {
        const k = `${x},${y}`; if (seen.has(k)) return; seen.add(k);
        manhole(x, y, l != null ? l : r2(g.levels[i][2]), `${run.id}${i + 1}`, l != null, MH_NOTE[k]);
      });
    }
    // canopy rainwater pipes to the drain beside the canopy
    const rain = [0, 1, 2, 3, 4].map((i) => { const cx = 90.31 - 1.2175 * i, cy = 78.85 - 9.925 * i, l = -1.65 - 0.05 * i; return pipeGeo([[cx, cy, r2(l + 0.25)], [cx + 0.10, cy + 0.90], [cx + 0.42, cy + 1.02], [95.57, 79.11 - 10 * i, l]], 0.05).geometry; });
    add('drains', merge(rain), 'drain', { en: 'Canopy rainwater pipes', th: 'ท่อน้ำฝนจากหลังคาคลุมหัวจ่าย', kind: 'drain',
      info: lines(['From the canopy column on each of the five pump islands to the drain beside the canopy. Labelled "2-PVC DIA.4" 2-flexible" on the layout: two 4" PVC pipes at each column (one line is shown here).', 'Routes as drawn. No level is written; they are shown falling 0.25 m to the manhole level (assumed).'],
        ['จากเสาหลังคาที่แท่นหัวจ่ายทั้ง 5 แท่นไปท่อระบายน้ำข้างหลังคา ในผังระบุ "2-PVC DIA.4" 2-flexible": ท่อ PVC 4 นิ้ว 2 เส้นต่อเสา (ในโมเดลแสดงเส้นเดียว)', 'แนวท่อตามผัง ไม่มีระดับเขียนไว้ แสดงให้ลาดลง 0.25 ม. ถึงระดับบ่อพัก (ค่าสมมติ)'], P) });

    // ---------- the two outfall traps at the highway (detail GN-SEP-01) and the public drain
    const SITE_VISIT_OUT = {
      en: 'Reported on the site visit (19 Nov 2026), not from the drawings: the pipe from the oil-water separator to the public sewer is probably broken or blocked. The visit note does not say which of the two outfalls.',
      th: 'จากการสำรวจหน้างาน (19 พ.ย. 2026) ไม่ใช่ข้อมูลจากแบบ: ท่อจากบ่อดักน้ำมันไปท่อระบายน้ำสาธารณะน่าจะแตกหรืออุดตัน บันทึกการสำรวจไม่ได้ระบุว่าเป็นทางออกด้านใด',
    };
    const trap = (o) => {
      const top = G0, floor = -3.25, under = -3.35;
      add('drains', boxGeo(1.4, 3.4, top - under, o.x, o.y, under, 0), 'oilTrap', { en: `Oil trap (3 chambers) · ${o.en}`, th: `บ่อดักน้ำมัน 3 ตอน · ${o.th}`, tag: o.tag, tagTh: o.tagTh, lvl: `${lv(o.inL)} / ${lv(o.outL)}`, kind: 'manhole',
        info: lines([`Three-chamber oil and grease trap (oil-water separator), 3.84 m³: 3.40 × 1.40 m outside, about 2.50 m deep, on 150 mm piles (detail GN-SEP-01, "${o.detail.en}"). The last stop before the public drain.`,
          `Levels written on the layout: ${lv(o.inL)} in (north end) · ${lv(o.outL)} out (south end, manhole ${o.outId}). The detail gives the same inlet and an outlet 0.05 m higher.`,
          `From the detail: cover at the site footpath, about ${lv(top)} · chamber floor about ${lv(floor)} · the pipe in is about ${(top - o.inL).toFixed(2)} m below the cover.`,
          `The layout draws the trap 1.00 m wide and puts a manhole at each corner, with a pipe down each side as well as through the trap. ${o.flow.en} Check on site which way the water really goes.`,
          SITE_VISIT_OUT.en],
        [`บ่อดักน้ำมันและไขมัน 3 ตอน (oil-water separator) ขนาด 3.84 ลบ.ม.: ภายนอก 3.40 × 1.40 ม. ลึกประมาณ 2.50 ม. วางบนเสาเข็ม 150 มม. (แบบขยาย GN-SEP-01 "${o.detail.th}") จุดสุดท้ายก่อนลงท่อระบายน้ำสาธารณะ`,
          `ระดับที่เขียนในผัง: เข้า ${lv(o.inL)} (ปลายด้านเหนือ) · ออก ${lv(o.outL)} (ปลายด้านใต้ บ่อพัก ${o.outId}) แบบขยายให้ระดับท่อเข้าเท่ากัน และท่อออกสูงกว่า 0.05 ม.`,
          `จากแบบขยาย: ฝาบ่ออยู่ระดับทางเท้าในสถานี ประมาณ ${lv(top)} · พื้นบ่อประมาณ ${lv(floor)} · ท่อเข้าอยู่ต่ำกว่าฝาประมาณ ${(top - o.inL).toFixed(2)} ม.`,
          `ผังเขียนบ่อกว้าง 1.00 ม. และมีบ่อพักที่มุมทั้งสี่ มีท่อเดินข้างบ่อทั้งสองด้านนอกเหนือจากที่ผ่านบ่อ ${o.flow.th} ต้องตรวจสอบหน้างานว่าน้ำไหลทางใดจริง`,
          SITE_VISIT_OUT.th], P) }, V(o.x, o.y, G0 + 0.7));
      add('drains', boxGeo(1.0, 3.2, 0.03, o.x, o.y, G0, 0), 'cover', { en: 'Oil trap gratings', th: 'ตะแกรงบ่อดักน้ำมัน', nopick: 1 });
      for (const [id, x, y, l, written] of o.mh) manhole(x, y, l, id, written, { en: 'One of the four manholes at the corners of the outfall trap.', th: 'เป็นหนึ่งในบ่อพัก 4 บ่อที่มุมของบ่อดักน้ำมัน' });
      for (const [pts, en, th] of o.links) pipe('drains', pts, 0.1, 'drain', { en: `Pipe beside the oil trap: ${en}`, th: `ท่อข้างบ่อดักน้ำมัน: ${th}`, kind: 'drain',
        info: lines([`Drawn on the layout between two corner manholes, ${lv(pts[0][2])} to ${lv(pts[1][2])}. Shown as a 0.20 m pipe.`], [`ในผังเขียนระหว่างบ่อพักที่มุมสองบ่อ ระดับ ${lv(pts[0][2])} ถึง ${lv(pts[1][2])} แสดงเป็นท่อ 0.20 ม.`], D) });
      // public manhole and the pipe to it
      const [px, py, pl] = o.pub;
      add('drains', boxGeo(1.2, 1.2, FOOTPATH - (-4.24), px, py, -4.24, 0), 'manhole', { en: `Public drain manhole (${o.side.en})`, th: `บ่อพักท่อระบายน้ำสาธารณะ (${o.side.th})`, tag: 'Public drain', tagTh: 'ท่อระบายน้ำสาธารณะ', lvl: lv(pl), kind: 'manhole',
        info: lines([`Manhole on the public drain outside the boundary. Level written on the layout: ${lv(pl)}.`, `From the detail GN-SEP-01: cover at the public footpath, about ${lv(FOOTPATH)}, and floor about -4.24 (the public drain is about 3.2 m deep). Shown 1.20 m square (size assumed).`],
          [`บ่อพักของท่อระบายน้ำสาธารณะนอกแนวเขต ระดับที่เขียนในผัง: ${lv(pl)}`, `จากแบบขยาย GN-SEP-01: ฝาบ่ออยู่ระดับทางเท้าสาธารณะ ประมาณ ${lv(FOOTPATH)} และก้นบ่อประมาณ -4.24 (ท่อสาธารณะลึกประมาณ 3.2 ม.) แสดงเป็นบ่อ 1.20 ม. (ขนาดเป็นค่าสมมติ)`], P) }, V(px, py, FOOTPATH + 0.7));
      add('drains', boxGeo(1.0, 1.0, 0.03, px, py, FOOTPATH, 0), 'cover', { en: 'Public manhole cover', th: 'ฝาบ่อพักสาธารณะ', nopick: 1 });
      pipe('drains', [o.outAt, [px, py, pl]], 0.15, 'drain', { en: `${o.side.en === 'west' ? 'West' : 'East'} outfall to the public drain`, th: `ท่อออกด้าน${o.side.th}ลงท่อระบายน้ำสาธารณะ`, tag: 'To the public drain', tagTh: 'ไปท่อระบายน้ำสาธารณะ', kind: 'drain',
        info: (m) => lines([`From manhole ${o.outId} (${lv(o.outAt[2])}) to the public manhole (${lv(pl)}). About ${m} m. The detail GN-SEP-01 calls for a 0.30 m concrete pipe.`, 'The layout draws no line between the two; the pipe is shown straight. Its real route is not on the drawings.', SITE_VISIT_OUT.en],
          [`จากบ่อพัก ${o.outId} (${lv(o.outAt[2])}) ไปบ่อพักสาธารณะ (${lv(pl)}) ยาวประมาณ ${m} ม. แบบขยาย GN-SEP-01 ระบุเป็นท่อคอนกรีต 0.30 ม.`, 'ผังไม่ได้เขียนเส้นท่อระหว่างสองจุดนี้ จึงแสดงเป็นแนวตรง แนวท่อจริงไม่มีในแบบ', SITE_VISIT_OUT.th], P) });
    };
    trap({ x: 62.625, y: 28.03, en: 'west outfall (entrance side)', th: 'ทางออกด้านตะวันตก (ด้านทางเข้า)', tag: 'Oil trap (west outfall)', tagTh: 'บ่อดักน้ำมัน (ทางออกตะวันตก)', side: { en: 'west', th: 'ตะวันตก' },
      detail: { en: 'entrance side', th: 'ด้านทางเข้าโครงการ' }, inL: -2.12, outL: -2.22, outId: 'TW2', outAt: [61.51, 26.63, -2.22], pub: [50.75, 23.53, -2.32],
      mh: [['TW1', 63.57, 29.31, -2.12, true], ['TW2', 61.51, 26.63, -2.22, true]],
      links: [[[[63.57, 26.63, -2.06], [63.57, 29.31, -2.12]], 'east side, flowing north', 'ด้านขวา ไหลขึ้นเหนือ'], [[[61.51, 29.31, -2.12], [61.51, 26.63, -2.22]], 'west side, flowing south', 'ด้านซ้าย ไหลลงใต้']],
      flow: { en: 'By the levels, the highway-front drain (SW4, -2.06) runs north to TW1 (-2.12) and into the trap with the west drain (W14, -2.12); the trap empties south to TW2 (-2.22).', th: 'ตามระดับ ท่อด้านหน้าทางหลวง (SW4, -2.06) ไหลขึ้นเหนือไป TW1 (-2.12) แล้วเข้าบ่อดักพร้อมกับท่อด้านซ้าย (W14, -2.12) น้ำออกจากบ่อทางใต้ไป TW2 (-2.22)' } });
    trap({ x: 124.995, y: 28.01, en: 'east outfall (exit side)', th: 'ทางออกด้านตะวันออก (ด้านทางออก)', tag: 'Oil trap (east outfall)', tagTh: 'บ่อดักน้ำมัน (ทางออกตะวันออก)', side: { en: 'east', th: 'ตะวันออก' },
      detail: { en: 'exit side', th: 'ด้านทางออกโครงการ' }, inL: -2.20, outL: -2.30, outId: 'TE2', outAt: [126.25, 26.61, -2.30], pub: [134.69, 23.51, -2.40],
      mh: [['TE2', 126.25, 26.61, -2.30, true]],
      links: [[[[123.74, 26.61, -2.15], [123.74, 29.41, -2.20]], 'west side, flowing north', 'ด้านซ้าย ไหลขึ้นเหนือ'], [[[126.25, 29.43, -2.20], [126.25, 26.61, -2.30]], 'east side, flowing south', 'ด้านขวา ไหลลงใต้']],
      flow: { en: 'By the levels, the highway-front drain (SE5, -2.15) runs north to M20 (about -2.20) and into the trap with the drain round KFC (M19, -2.20) and the east drain (E12, -2.20); the trap empties south to TE2 (-2.30).', th: 'ตามระดับ ท่อด้านหน้าทางหลวง (SE5, -2.15) ไหลขึ้นเหนือไป M20 (ประมาณ -2.20) แล้วเข้าบ่อดักพร้อมกับท่ออ้อม KFC (M19, -2.20) และท่อด้านขวา (E12, -2.20) น้ำออกจากบ่อทางใต้ไป TE2 (-2.30)' } });

    // ---------- underground fuel tanks: the layout draws four 7.5 x 2.4 m tanks; two of them carry two product marks
    for (const [label, cx, cy, two] of [['D', 67.35, 89.10, 0], ['B7 + PD', 67.30, 85.72, 1], ['E20 + 95', 67.25, 82.35, 1], ['G95', 67.20, 79.00, 0]]) {
      fuelTank(label, cx, cy, -0.8, { dia: 2.4,
        en: [...(two ? ['The layout marks two products on this tank, so it is shown as one tank with two compartments.'] : []), 'The west site drain runs along the west side of the tank area.'],
        th: [...(two ? ['ผังระบุน้ำมัน 2 ชนิดบนถังใบนี้ จึงแสดงเป็นถังใบเดียวแบ่ง 2 ช่อง'] : []), 'ท่อระบายน้ำด้านตะวันตกวิ่งเลียบด้านตะวันตกของบริเวณถัง'] });
    }

    // ---------- buildings, canopy and pump islands (context)
    const centre = (poly) => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
    const building = (poly, h, o, en = [], th = []) => { const [cx, cy] = centre(poly); return add('buildings', prismGeo(poly, G0, h), 'building', { ...o, kind: 'building', info: lines(en, th, C) }, V(cx, cy, G0 + h + 0.7)); };
    building([[93.8, 125.75], [104.0, 125.75], [104.0, 134.0], [93.8, 134.0]], 4.2, { en: 'North shop units (2 units)', th: 'ร้านค้าด้านหลัง (2 คูหา)', tag: 'Shops (north)', tagTh: 'ร้านค้า (ด้านหลัง)' }, ['Two units, each with a GT-T-1000 grease trap behind it. Not named on the layout.'], ['2 คูหา แต่ละคูหามีถังดักไขมัน GT-T-1000 อยู่ด้านหลัง ผังไม่ได้ระบุชื่อ']);
    building([[108.65, 126.55], [126.55, 126.3], [126.55, 133.0], [108.65, 133.25]], 3.5, { en: 'Toilets', th: 'ห้องน้ำ', tag: 'Toilets', tagTh: 'ห้องน้ำ' });
    building([[117.2, 115.1], [125.4, 115.0], [124.8, 84.9], [116.7, 84.9]], 4.2, { en: 'Shop row (6 units)', th: 'แถวร้านค้า (6 คูหา)', tag: 'Shops', tagTh: 'ร้านค้า' }, ['Six units, numbered 1 to 6 from the north in this model. Each has a grease trap behind it.'], ['6 คูหา ในโมเดลนี้นับ 1 ถึง 6 จากด้านเหนือ แต่ละคูหามีถังดักไขมันอยู่ด้านหลัง']);
    building([[116.7, 80.9], [124.8, 80.8], [124.6, 65.7], [116.4, 65.8]], 4.2, { en: 'Large shop unit', th: 'ร้านค้าคูหาใหญ่', tag: 'Large shop', tagTh: 'ร้านค้าคูหาใหญ่' }, ['Its grease trap is the GT-T-2000 behind it. Not named on the layout.'], ['ถังดักไขมันของคูหานี้คือ GT-T-2000 ที่อยู่ด้านหลัง ผังไม่ได้ระบุชื่อ']);
    building([[123.0, 59.1], [126.45, 59.1], [126.45, 64.45], [123.0, 64.45]], 3.0, { en: 'Pump room and water tanks', th: 'ห้องปั๊มน้ำและถังเก็บน้ำ', tag: 'Pump room', tagTh: 'ห้องปั๊มน้ำ' }, ['Two 3,000 L water tanks and two pumps are drawn inside. The pipe out of the SP-T-15,000 L tank is drawn passing under this room.'], ['ภายในเขียนถังเก็บน้ำ 3,000 ลิตร 2 ใบ และปั๊ม 2 ตัว ท่อออกจากถัง SP-T-15,000 L เขียนผ่านใต้ห้องนี้']);
    building([[110.95, 35.1], [121.45, 35.1], [121.45, 53.35], [110.95, 53.35]], 5.0, { en: 'KFC', th: 'KFC', tag: 'KFC', tagTh: 'KFC' });
    building([[62.9, 95.7], [71.05, 95.7], [71.05, 101.9], [62.9, 101.9]], 3.2, { en: 'Small building beside the car wash slab', th: 'อาคารเล็กข้างลานล้างรถ', tag: 'Small building', tagTh: 'อาคารเล็ก' }, ['Has a toilet in its north-west corner, drained to the SP-T-1600 tank. Not named on the layout.'], ['มีห้องน้ำที่มุมด้านซ้ายบน ระบายลงถัง SP-T-1600 ผังไม่ได้ระบุชื่อ']);
    add('buildings', merge([[117.96, 122.38], [117.96, 119.68], [117.91, 116.98]].map(([x, y]) => boxGeo(1.5, 1.5, 2.6, x, y, G0, 0))), 'building', { en: 'Kiosks (3)', th: 'คีออส (3 หลัง)', tag: 'Kiosk', tagTh: 'คีออส', kind: 'building', info: lines(['Three 1.5 m kiosks marked KIOSK on the layout.'], ['คีออสขนาด 1.5 ม. 3 หลัง ตามที่ผังระบุ KIOSK'], C) }, V(117.96, 119.68, G0 + 3.3));
    add('buildings', prismGeo([[86.3, 83.6], [95.6, 82.4], [89.8, 34.4], [80.4, 35.6]], G0 + 5.6, 0.9), 'roof', { en: 'Pump canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย', kind: 'building', info: lines(['Canopy over the five pump islands.'], ['หลังคาคลุมแท่นหัวจ่าย 5 แท่น'], C) }, V(88, 59, G0 + 7.2));
    add('buildings', merge([0, 1, 2, 3, 4].map((i) => boxGeo(6.9, 1.1, 0.2, 89.6 - 1.2175 * i, 78.93 - 9.925 * i, G0, -6.9))), 'building', { en: 'Pump islands (5)', th: 'แท่นหัวจ่าย (5 แท่น)', kind: 'building', info: lines(['The five pump islands under the canopy.'], ['แท่นหัวจ่าย 5 แท่นใต้หลังคา'], C) });
  },
};
