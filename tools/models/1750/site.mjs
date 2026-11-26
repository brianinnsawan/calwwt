// 1750 Kaeng Khoi, Saraburi (Saraburi CPF): what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/1750.glb.
//
// Sources (Brian's folder "Chevron Hub Site - NTI Saraburi CPF 2022\01. Drawings\As Built Saraburi", SPP as-built set, Dec 2022):
//   A  1.Layout\DWG\SN\ผังบริเวณแสดงตำแหน่งถังบำบัด,ถังดักไขมัน.dwg = LAY-SN-02 wastewater layout (plan positions, the level
//      written at every sump and tank connection, pipe routes). The DWG holds two copies of the plan; this is the right-hand one.
//   B  12.Common COM-07 (treatment tank and grease trap details), COM-02 (3-chamber oil trap), COM-05 (sump standard)
//   C  1.Layout LAY-ST-03 (finished levels of the forecourt; read off the sheet, a few points per row)
// Positions are the drawing's x, y in metres. Levels are metres from the drawing's datum (+/-0.00 = forecourt high line).
// src: 'drawn' = position and levels from the drawings; 'part' = position from the drawings, size or depth assumed or
//      taken from the standard detail; 'context' = above-ground context only (heights assumed).
const D = 'drawn', P = 'part', C = 'context';

// Drain runs: every point is a sump with the level written on LAY-SN-02: [x, y, level]. Listed in flow direction.
const RUNS = [
  { id: 'N', en: 'north side', pts: [[2276.88, -355.79, -0.60], [2265.28, -355.95, -0.72], [2254.75, -355.95, -0.84], [2243.07, -355.95, -0.84]] },
  { id: 'W', en: 'west side to the south-west oil trap', pts: [[2243.07, -355.95, -0.84], [2243.00, -365.55, -0.87], [2242.94, -375.55, -0.91], [2242.88, -385.55, -0.97], [2242.82, -395.55, -1.01], [2242.75, -405.55, -1.04], [2242.67, -415.55, -1.07], [2242.62, -425.55, -1.11], [2242.45, -435.57, -1.13], [2242.14, -443.54, -1.16], [2242.17, -452.92, -1.20], [2242.21, -462.92, -1.23], [2242.25, -472.92, -1.26], [2242.29, -482.92, -1.30], [2242.33, -492.92, -1.33], [2242.38, -502.88, -1.34], [2242.40, -507.34, -1.36], [2243.94, -507.50, -1.37]] },
  { id: 'E', en: 'east side to the south-east oil trap', pts: [[2276.88, -355.79, -0.60], [2278.97, -365.65, -0.80], [2280.10, -371.10, -0.95], [2282.19, -380.89, -0.98], [2284.19, -390.74, -1.01], [2286.42, -401.27, -1.04], [2288.41, -411.12, -1.07], [2290.53, -420.84, -1.10], [2291.99, -428.00, -1.13], [2293.78, -437.01, -1.16], [2295.76, -446.68, -1.17], [2296.29, -458.17, -1.21], [2296.81, -469.62, -1.24], [2299.56, -479.33, -1.27], [2302.30, -488.89, -1.30], [2305.04, -498.51, -1.32], [2307.62, -507.43, -1.35]] },
  { id: 'P', en: 'round Star Park', pts: [[2254.75, -355.95, -0.84], [2254.75, -363.74, -0.86], [2254.75, -371.11, -0.88], [2263.95, -371.11, -0.91], [2272.09, -371.10, -0.93], [2280.10, -371.10, -0.95]] },
  { id: 'X', en: 'across the forecourt, west part', pts: [[2257.20, -433.22, -0.84], [2248.06, -434.68, -0.79], [2242.45, -435.57, -1.13]] },
  { id: 'Y', en: 'across the forecourt, east part', pts: [[2257.20, -433.22, -0.84], [2266.34, -431.76, -0.79], [2278.83, -429.88, -0.99]] },
  { id: 'F', en: 'along the office, toilets and shop fronts', pts: [[2275.07, -405.95, -0.89], [2276.19, -413.00, -0.92], [2277.32, -420.08, -0.95], [2278.83, -429.88, -0.99], [2279.73, -442.19, -1.03], [2281.91, -455.87, -1.08], [2283.16, -463.69, -1.10], [2284.74, -473.62, -1.14], [2287.28, -482.72, -1.17], [2290.02, -492.34, -1.20], [2292.92, -502.55, -1.24], [2296.70, -510.94, -1.29]] },
  { id: 'C', en: 'beside the canopy', pts: [[2267.88, -466.20, -0.89], [2269.77, -478.07, -0.95], [2271.67, -489.95, -1.01], [2273.24, -499.79, -1.06], [2275.25, -511.08, -1.20]] },
  { id: 'SW', en: 'south side, flowing west', pts: [[2275.25, -511.08, -1.20], [2268.86, -511.02, -1.23], [2259.54, -511.09, -1.26], [2250.46, -511.09, -1.30], [2245.35, -510.63, -1.33], [2245.35, -507.40, -1.36], [2243.94, -507.50, -1.37]] },
  { id: 'SE', en: 'south side, flowing east', pts: [[2275.25, -511.08, -1.20], [2283.90, -511.09, -1.24], [2296.70, -510.94, -1.29], [2307.69, -510.94, -1.32]] },
];
// points where a level is written but there is no sump of their own to draw (bends, joins into the oil trap)
const NO_SUMP = new Set(['2245.35,-510.63', '2245.35,-507.4', '2243.94,-507.5', '2307.69,-510.94', '2307.62,-507.43']);

// Treatment tanks (COM-07): lying cylinders 2.50 m across on a 0.20 m slab, 3.5 m wide and 1.0 m longer than the tank
const TANKS = [
  { id: 'DLFN-15Q', where: { en: 'Star Park (west side)', th: 'Star Park (ด้านตะวันตก)' }, x: 2255.85, y: -362.40, rot: 90, len: 8.2, inL: -0.43, outL: -0.63, inAt: 'north', outAt: 'south', covers: [[2255.85, -359.16], [2255.85, -361.81], [2255.85, -364.69], [2255.85, -365.53]],
    extra: { en: 'On the layout the Star Park drain line (manholes P1 to P3) runs along the west edge of this tank, so the two overlap in the model. Check on site which is where.', th: 'ในผัง แนวท่อระบายน้ำรอบ Star Park (บ่อพัก P1 ถึง P3) เดินทับขอบด้านตะวันตกของถังนี้ ทำให้ในโมเดลซ้อนกัน ต้องตรวจสอบตำแหน่งจริงหน้างาน' } },
  { id: 'DTNC-15Q', where: { en: 'toilets and garbage room', th: 'ห้องน้ำและห้องพักขยะ' }, x: 2285.73, y: -433.71, rot: 9, len: 6.9, inL: -0.50, outL: -0.70, inAt: 'east', outAt: 'west', covers: [[2288.31, -433.31], [2286.24, -433.63], [2284.12, -433.97], [2283.30, -434.10]] },
  { id: 'DLFN-12Q', where: { en: 'shops (south-east corner)', th: 'ร้านค้า (มุมตะวันออกเฉียงใต้)' }, x: 2300.20, y: -504.19, rot: 16, len: 6.7, inL: -1.01, outL: -1.19, inAt: 'east', outAt: 'west', covers: [[2302.62, -503.50], [2300.70, -504.05], [2298.74, -504.61], [2297.94, -504.84]] },
];
// Grease traps DGT-1000 (COM-07: tank 1.32 m across, 1.37 m high, in a 1.5 m concrete box). Centres from the layout.
const GT = [[2290.81, -438.42], [2291.60, -443.36], [2292.39, -448.29], [2293.17, -453.23], [2293.98, -458.17], [2294.75, -463.11],
  [2296.41, -472.80], [2297.78, -477.61], [2299.15, -482.42], [2300.52, -487.23], [2301.89, -492.03], [2303.26, -496.84]];
const GT_JOIN = [[2291.86, -440.23], [2292.65, -445.16], [2293.43, -450.10], [2294.22, -455.04], [2295.01, -459.98], [2295.79, -464.91],
  [2297.76, -474.44], [2299.13, -479.25], [2300.50, -484.06], [2301.87, -488.87], [2303.24, -493.68], [2304.61, -498.49]];

// Finished levels of the forecourt read off LAY-ST-03, a few per row, plus building and walkway levels from LAY-SN-02
const GROUND = [
  ...[[2242, -0.025], [2249, 0], [2256, -0.025], [2262, -0.05], [2268, -0.075], [2274, -0.10], [2279, -0.15], [2281.5, -0.167]].map(([x, z]) => [x, -375, z]),
  ...[[2242, -0.05], [2247, -0.025], [2252, 0], [2258, -0.025], [2264, -0.05], [2270, -0.075], [2276, -0.10], [2281, -0.125], [2285, -0.15], [2287, -0.172]].map(([x, z]) => [x, -400, z]),
  ...[[2242, -0.075], [2248, -0.05], [2254, -0.025], [2260, 0], [2266, -0.025], [2272, -0.05], [2277, -0.075], [2279.5, -0.10]].map(([x, z]) => [x, -430, z]),
  ...[[2242, -0.10], [2248, -0.075], [2254, -0.05], [2260, -0.025], [2266, 0], [2272, -0.025], [2278, -0.05], [2283, -0.075]].map(([x, z]) => [x, -470, z]),
  ...[[2242, -0.10], [2250, -0.075], [2258, -0.05], [2266, -0.025], [2272, 0], [2278, -0.025], [2284, -0.05], [2290, -0.075]].map(([x, z]) => [x, -500, z]),
  ...[2246, 2256, 2266, 2276, 2286, 2296, 2306].map((x) => [x, -508, -0.10]), ...[2246, 2262, 2278, 2294, 2306].map((x) => [x, -511.3, -0.9]),
  [2248, -358, 0], [2267, -363, 0.18], [2267, -356.5, 0.10], [2281.5, -407.5, 0.115], [2284.5, -422, 0.175], [2286, -452, 0.085], [2296, -487, 0.085],
  [2280, -445, 0.065], [2283, -465, 0.065], [2288, -490, 0.065], [2293, -440, 0], [2298, -470, 0], [2305, -495, 0.04], [2300, -506, 0.04],
];

export default {
  name: 'Kaeng Khoi, Saraburi',
  origin: [2275, -433],
  datum: { en: 'Levels are in metres from the drawing datum: ±0.00 is the high line of the forecourt. Buildings are about +0.09 to +0.23, the highway about -1.20.', th: 'ระดับเป็นเมตรจากระดับอ้างอิงของแบบ: ±0.00 คือแนวสูงสุดของลานคอนกรีต อาคารอยู่ที่ประมาณ +0.09 ถึง +0.23 ทางหลวงประมาณ -1.20' },
  note: { en: 'First version, built from the 2022 as-built drawings. Check on site before any digging; not for setting out.', th: 'ฉบับแรก จัดทำจากแบบก่อสร้างจริงปี 2022 ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง' },
  built: '2026-11-25',
  north: 90,   // north is up on the sheet
  boundary: [[2242.10, -355.21], [2241.60, -432.93], [2241.16, -442.20], [2241.44, -511.48], [2309.30, -511.48], [2297.34, -469.49], [2296.36, -446.44], [2277.41, -355.21]],
  ground: {
    bbox: [2236, -521, 2314, -351], step: 2, apron: 5, road: -1.2,
    roadArea: [[2236, -521], [2314, -521], [2314, -511.48], [2236, -511.48]],
    points: GROUND,
    names: { siteGround: { en: 'Forecourt and paving', th: 'ลานและพื้นผิว' }, road: { en: 'Highway side and entrances', th: 'ด้านทางหลวงและทางเข้าออก' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'base', 'fuel', 'buildings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', en: 'Whole site', th: 'ทั้งสถานี', from: [2275, -585, 85], to: [2275, -445, 0] },
    { id: 'plan', en: 'Plan', th: 'ผัง', from: [2275, -433.1, 245], to: [2275, -433, 0] },
    { id: 'starpark', en: 'Star Park tank', th: 'ถังที่ Star Park', from: [2244, -376, 10], to: [2256, -362, -1] },
    { id: 'toilets', en: 'Toilet tank', th: 'ถังที่ห้องน้ำ', from: [2276, -447, 9], to: [2286, -434, -1] },
    { id: 'shops', en: 'Shop grease traps and tank', th: 'ถังดักไขมันและถังของร้านค้า', from: [2318, -520, 16], to: [2299, -488, -1] },
    { id: 'fuel', from: [2272, -461, 6], to: [2259.8, -447.6, -1.8] },
    { id: 'under', en: 'From below ground', th: 'มองจากใต้ดิน', from: [2262, -528, -9], to: [2296, -500, -0.5] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, hcylGeo, prismGeo, pipeGeo, merge }) {
    const r2 = (n) => Math.round(n * 100) / 100;   // worked-out levels are shown to the centimetre
    const lines = notes;   // (en lines, th lines, 'drawn' | 'part' | 'context')
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tag ? g.mid.clone().setY(g.mid.y + 0.6) : null); return g; };
    const unit = (rot) => { const a = rot * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; };

    // ---------- treatment tanks
    const slabs = [];
    for (const t of TANKS) {
      const r = 1.25, top = r2(t.inL + 0.475), axis = top - r, g0 = r2(ground(t.x, t.y)), [ux, uy] = unit(t.rot);
      const parts = [capsuleGeo(r, t.len, t.x, t.y, axis, t.rot, 0.3)];   // lying capsule, slightly rounded ends
      add('tanks', merge(parts), 'tank', { en: `${t.id} treatment tank · ${t.where.en}`, th: `ถังบำบัด ${t.id} · ${t.where.th}`, tag: t.id, tagTh: t.id, kind: 'tank',
        info: lines([`Package wastewater treatment tank ${t.id}, lying down: ${t.len.toFixed(2)} m long, 2.50 m across.`,
          `Pipe in (PVC 6") ${lv(t.inL)} at the ${t.inAt} end · pipe out (PVC 6") ${lv(t.outL)} at the ${t.outAt} end.`,
          `Ground about ${lv(g0)} · top of tank about ${lv(top)} · underside about ${lv(top - 2.5)}.`,
          'Aerated tank: air comes from air pumps AP-01 to AP-04 (drawing LAY-EE-09; the pumps are not in this model yet).',
          'Tank depth is worked out from the inlet level and the standard detail COM-07.', ...(t.extra ? [t.extra.en] : [])],
        [`ถังบำบัดน้ำเสียสำเร็จรูป ${t.id} แบบนอน: ยาว ${t.len.toFixed(2)} ม. กว้าง 2.50 ม.`,
          `ท่อเข้า (PVC 6 นิ้ว) ${lv(t.inL)} · ท่อออก (PVC 6 นิ้ว) ${lv(t.outL)}`,
          `ระดับพื้นประมาณ ${lv(g0)} · หลังถังประมาณ ${lv(top)} · ใต้ถังประมาณ ${lv(top - 2.5)}`,
          'ถังเติมอากาศ: ลมมาจากปั๊มลม AP-01 ถึง AP-04 (แบบ LAY-EE-09 ยังไม่ได้ใส่ปั๊มลมในโมเดลนี้)',
          'ความลึกของถังคำนวณจากระดับท่อเข้าและแบบมาตรฐาน COM-07', ...(t.extra ? [t.extra.th] : [])], P) }, V(t.x, t.y, g0 + 0.7));
      for (const [mx, my] of t.covers) { // access openings, where the layout shows them
        const gm = ground(mx, my);
        if (gm > top) add('tanks', cylGeo(0.3, gm - top, mx, my, top), 'tank', { en: `${t.id} access`, th: `ช่องเปิด ${t.id}`, nopick: 1 });
        add('tanks', cylGeo(0.33, 0.03, mx, my, Math.max(gm, top)), 'cover', { en: `${t.id} cover`, th: `ฝา ${t.id}`, nopick: 1 });
      }
      slabs.push(boxGeo(t.len + 1.0, 3.5, 0.2, t.x, t.y, top - 2.5 - 0.2, t.rot));
    }
    add('base', merge(slabs), 'slab', { en: 'Treatment tank base slabs', th: 'ฐานคอนกรีตใต้ถังบำบัด', kind: 'base', info: lines(
      ['Concrete slab 0.20 m thick on 0.05 m lean concrete and 0.10 m sand, 3.50 m wide and 1.00 m longer than the tank.', 'On piles at about 0.96 × 1.00 m centres (piles are not drawn in the model). The tank is strapped down to the slab.'],
      ['พื้นคอนกรีตหนา 0.20 ม. บนคอนกรีตหยาบ 0.05 ม. และทราย 0.10 ม. กว้าง 3.50 ม. ยาวกว่าถัง 1.00 ม.', 'วางบนเสาเข็มระยะประมาณ 0.96 × 1.00 ม. (ไม่ได้แสดงเสาเข็มในโมเดล) ถังยึดกับพื้นด้วยสายรัด'], P) });

    // ---------- grease traps
    const gt = (x, y, o, r = 0.66, h = 1.37, lids = [[0, 0]]) => {
      const g0 = ground(x, y);
      add('tanks', cylGeo(r, h, x, y, g0 - 0.15 - h), 'grease', o, o.tag ? V(x, y, g0 + 0.6) : null);
      for (const [dx, dy] of lids) add('tanks', cylGeo(0.35, 0.03, x + dx, y + dy, g0), 'cover', { en: 'Grease trap cover', th: 'ฝาถังดักไขมัน', nopick: 1 });
    };
    GT.forEach(([x, y], i) => gt(x, y, { en: `Shop grease trap ${i + 1} · GT-T-1000`, th: `ถังดักไขมันร้านค้า ${i + 1} · GT-T-1000`, ...(i === 0 || i === 6 ? { tag: 'Grease traps', tagTh: 'ถังดักไขมัน' } : {}), kind: 'tank',
      info: lines([`Grease trap behind shop unit ${i + 1} (1,000 L; detail COM-07, DGT-1000: 1.32 m across, 1.37 m high, in a 1.5 m concrete surround).`,
        i === 0 ? 'Level written at this one: -0.30.' : 'No level is written at this one; the first one in the row is marked -0.30.', 'Its outlet joins the 6" pipe behind the shops, which runs south to the DLFN-12Q tank.'],
      [`ถังดักไขมันหลังร้านค้าคูหาที่ ${i + 1} (1,000 ลิตร แบบ COM-07 รุ่น DGT-1000: กว้าง 1.32 ม. สูง 1.37 ม. ในบ่อคอนกรีต 1.5 ม.)`,
        i === 0 ? 'ระดับที่ระบุที่ถังนี้: -0.30' : 'ไม่มีระดับระบุที่ถังนี้ ถังแรกในแถวระบุ -0.30', 'ท่อออกต่อเข้าท่อ 6 นิ้วหลังร้านค้า ซึ่งเดินลงใต้ไปเข้าถัง DLFN-12Q'], P) }));
    gt(2285.58, -403.06, { en: 'Round tank at the office', th: 'ถังกลมที่สำนักงาน', tag: 'Office tank', tagTh: 'ถังสำนักงาน', kind: 'tank',
      info: lines(['Drawn with the same symbol as the grease traps; level written here: -0.30. A 4" PVC pipe runs to it from the office.', 'The layout does not name the model (the detail sheet also shows a small DTNC-1.6Q treatment tank). DOS\'s 2022 diagram for the station (a proposal, not an as-built) shows a DFSOK-2000L treatment tank for the bathroom and office. To confirm on site.'],
        ['เขียนด้วยสัญลักษณ์เดียวกับถังดักไขมัน ระดับที่ระบุ: -0.30 มีท่อ PVC 4 นิ้วจากสำนักงานมาที่ถังนี้', 'ผังไม่ได้ระบุรุ่น (ในแบบขยายมีถังบำบัดขนาดเล็ก DTNC-1.6Q ด้วย) ต้องยืนยันหน้างาน แผนภาพของ DOS ปี 2022 (เป็นข้อเสนอ ไม่ใช่แบบก่อสร้างจริง) แสดงถังบำบัด DFSOK-2000L สำหรับห้องน้ำและสำนักงาน'], P) });
    gt(2292.13, -508.87, { en: 'Grease trap at Five Star · Premier GT-1600 (replaced 2025)', th: 'ถังดักไขมันที่ Five Star · Premier GT-1600 (เปลี่ยนใหม่ 2025)', tag: 'Five Star grease trap', tagTh: 'ถังดักไขมัน Five Star', kind: 'tank',
      info: lines(['Grease trap at the Five Star kiosk; levels written here: -0.23 and -0.25. A 4" pipe takes it to the inlet of the DLFN-12Q tank (-1.01).',
        'Replaced in 2025 with a 1,600 L Premier GT-1600 (SPP\'s 2025 replacement drawings, in Sites\\1750 Kaeng Khoi Saraburi\\03 Drawings\\Tank documents): 1.60 m across, 1.40 m high, two lids, pipe in 0.20 m and pipe out 0.25 m below the ground, on a 2.00 × 2.00 m concrete base 0.15 m thick over five 0.15 m piles 4 m long.'],
        ['ถังดักไขมันที่ร้าน Five Star ระดับที่ระบุ: -0.23 และ -0.25 มีท่อ 4 นิ้วต่อไปเข้าถัง DLFN-12Q (-1.01)',
          'เปลี่ยนใหม่ในปี 2025 เป็นถัง Premier GT-1600 ขนาด 1,600 ลิตร (แบบเปลี่ยนถังปี 2025 ของ SPP): กว้าง 1.60 ม. สูง 1.40 ม. มี 2 ฝา ท่อเข้าต่ำกว่าพื้น 0.20 ม. ท่อออก 0.25 ม. วางบนฐานคอนกรีต 2.00 × 2.00 ม. หนา 0.15 ม. บนเสาเข็ม 0.15 ม. ยาว 4 ม. 5 ต้น'], P) }, 0.8, 1.4, [[-0.4, 0], [0.4, 0]]);

    // ---------- wastewater pipes
    pipe('sewer', [[2271.5, -357.40, -0.27], [2257.2, -357.50], [2255.85, -357.9, -0.43], [2255.85, -358.4, -0.43]], 0.075, 'sewerRaw', { en: 'Star Park toilets to the DLFN-15Q tank', th: 'ท่อจากห้องน้ำ Star Park เข้าถัง DLFN-15Q', kind: 'pipe',
      info: (m) => lines([`6" soil pipe along the north wall of Star Park to the tank inlet at -0.43. About ${m} m shown.`, 'Route follows the pipe labels on the layout; the level at the far end is assumed (fall 1:100).'],
        [`ท่อโสโครก 6 นิ้ว เดินตามผนังด้านเหนือของ Star Park เข้าถังที่ระดับ -0.43 แสดงประมาณ ${m} ม.`, 'แนวท่อตามป้ายท่อในผัง ระดับปลายทางด้านไกลเป็นค่าสมมติ (ลาด 1:100)'], P) });
    pipe('sewer', [[2255.85, -366.4, -0.63], [2255.55, -366.98, -0.63], [2254.42, -371.34, -0.86]], 0.075, 'sewerTreated', { en: 'DLFN-15Q outlet to the site drain', th: 'ท่อออกจากถัง DLFN-15Q ลงท่อระบายน้ำ', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the tank at -0.63 and joins the Star Park drain at the sump marked -0.88. About ${m} m.`], [`ท่อ PVC 6 นิ้ว ออกจากถังที่ -0.63 ลงท่อระบายน้ำรอบ Star Park ที่บ่อพักระดับ -0.88 ยาวประมาณ ${m} ม.`], D) });
    pipe('sewer', [[2287.4, -414.5, -0.31], [2290.2, -432.6], [2289.63, -433.06, -0.50], [2289.1, -433.2, -0.50]], 0.075, 'sewerRaw', { en: 'Toilets to the DTNC-15Q tank', th: 'ท่อจากห้องน้ำเข้าถัง DTNC-15Q', kind: 'pipe',
      info: (m) => lines([`6" soil pipe down the east side of the toilets to the tank inlet at -0.50. About ${m} m shown.`, 'Route follows the pipe labels on the layout; the level at the far end is assumed (fall 1:100). The vent pipe is fixed to the boundary wall.'],
        [`ท่อโสโครก 6 นิ้ว เดินลงด้านตะวันออกของห้องน้ำ เข้าถังที่ระดับ -0.50 แสดงประมาณ ${m} ม.`, 'แนวท่อตามป้ายท่อในผัง ระดับปลายทางด้านไกลเป็นค่าสมมติ (ลาด 1:100) ท่ออากาศยึดกับกำแพงรั้ว'], P) });
    pipe('sewer', [[2282.4, -434.25, -0.70], [2280.88, -434.19, -0.70], [2281.30, -436.82], [2290.01, -435.44], [2293.41, -437.09, -1.14]], 0.075, 'sewerTreated', { en: 'DTNC-15Q outlet to the east drain', th: 'ท่อออกจากถัง DTNC-15Q ลงท่อระบายน้ำด้านตะวันออก', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the west end of the tank at -0.70, turns back east and joins the east drain at the sump marked -1.16. About ${m} m.`], [`ท่อ PVC 6 นิ้ว ออกจากปลายถังด้านตะวันตกที่ -0.70 แล้ววกกลับไปทางตะวันออก ลงท่อระบายน้ำที่บ่อพักระดับ -1.16 ยาวประมาณ ${m} ม.`], D) });
    pipe('sewer', [[2291.89, -440.22, -0.35], [2296.84, -471.24], [2305.77, -502.62], [2303.87, -503.15, -1.01], [2303.4, -503.28, -1.01]], 0.075, 'sewerRaw', { en: 'Pipe behind the shops to the DLFN-12Q tank', th: 'ท่อหลังร้านค้าไปถัง DLFN-12Q', tag: 'From the shop grease traps', tagTh: 'จากถังดักไขมันร้านค้า', kind: 'pipe',
      info: (m) => lines([`6" PVC behind the two shop buildings. Collects the 12 grease traps and runs south to the tank inlet at -1.01. About ${m} m.`, 'Only the levels at the first grease trap (-0.30) and the tank inlet (-1.01) are on the drawing; the pipe is drawn straight between them.'],
        [`ท่อ PVC 6 นิ้ว หลังอาคารร้านค้าทั้งสอง รับน้ำจากถังดักไขมัน 12 ถัง เดินลงใต้เข้าถังที่ระดับ -1.01 ยาวประมาณ ${m} ม.`, 'ในแบบมีเฉพาะระดับที่ถังดักไขมันใบแรก (-0.30) และทางเข้าถัง (-1.01) ท่อแสดงเป็นแนวลาดตรงระหว่างสองจุด'], P) });
    add('sewer', merge(GT.map(([x, y], i) => pipeGeo([[x + 0.5, y - 0.4, -0.33 - 0.66 * (i / 11)], [...GT_JOIN[i], -0.36 - 0.66 * (i / 11)]], 0.05).geometry)), 'sewerRaw', { en: 'Grease trap outlets', th: 'ท่อออกจากถังดักไขมัน', kind: 'pipe',
      info: lines(['Short pipe from each grease trap to the 6" pipe behind the shops. Levels follow that pipe (assumed).'], ['ท่อสั้นจากถังดักไขมันแต่ละใบไปท่อ 6 นิ้วหลังร้านค้า ระดับตามท่อหลัก (ค่าสมมติ)'], P) });
    pipe('sewer', [[2292.6, -508.75, -0.25], [2293.00, -508.67, -0.25], [2306.21, -504.94], [2306.35, -504.70], [2305.77, -502.62, -1.0]], 0.05, 'sewerRaw', { en: 'Five Star grease trap to the DLFN-12Q inlet', th: 'ท่อจากถังดักไขมัน Five Star ไปทางเข้าถัง DLFN-12Q', kind: 'pipe',
      info: (m) => lines([`4" PVC from the Five Star grease trap (-0.25) east to the pipe that enters the tank. About ${m} m.`], [`ท่อ PVC 4 นิ้ว จากถังดักไขมัน Five Star (-0.25) ไปทางตะวันออกต่อเข้าท่อที่เข้าถัง ยาวประมาณ ${m} ม.`], D) });
    pipe('sewer', [[2297.0, -505.1, -1.19], [2295.30, -505.28, -1.19], [2293.36, -505.84, -1.26], [2295.21, -508.67], [2296.70, -510.94, -1.29]], 0.075, 'sewerTreated', { en: 'DLFN-12Q outlet to the south drain', th: 'ท่อออกจากถัง DLFN-12Q ลงท่อระบายน้ำด้านใต้', tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', kind: 'pipe',
      info: (m) => lines([`6" PVC. Leaves the west end of the tank at -1.19, passes -1.26 and joins the south drain at the sump marked -1.29. About ${m} m.`], [`ท่อ PVC 6 นิ้ว ออกจากปลายถังด้านตะวันตกที่ -1.19 ผ่านระดับ -1.26 ลงท่อระบายน้ำด้านใต้ที่บ่อพักระดับ -1.29 ยาวประมาณ ${m} ม.`], D) });
    pipe('sewer', [[2283.63, -409.82, -0.20], [2283.74, -410.52], [2286.72, -410.04], [2285.78, -404.16, -0.30]], 0.05, 'sewerRaw', { en: 'Office to its round tank', th: 'ท่อจากสำนักงานไปถังกลม', kind: 'pipe',
      info: (m) => lines([`4" PVC from the office, round its south-east corner, north to the round tank (-0.30). About ${m} m. The level at the office end is assumed.`], [`ท่อ PVC 4 นิ้ว จากสำนักงาน อ้อมมุมตะวันออกเฉียงใต้ ขึ้นเหนือไปถังกลม (-0.30) ยาวประมาณ ${m} ม. ระดับที่ปลายด้านสำนักงานเป็นค่าสมมติ`], P) });

    // ---------- site drains, sumps and oil traps
    const seen = new Set();
    for (const run of RUNS) {
      run.pts.forEach(([x, y, l], i) => {
        const k = `${x},${y}`; if (seen.has(k) || NO_SUMP.has(k)) return; seen.add(k);
        const g0 = r2(ground(x, y)), id = `${run.id}${i + 1}`;
        add('drains', boxGeo(0.84, 0.84, g0 - (l - 0.35), x, y, l - 0.35, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, lvl: lv(l), kind: 'manhole',
          info: lines([`Level written on the layout: ${lv(l)} (taken as the pipe level). Ground here about ${lv(g0)}, so the pipe is about ${(g0 - l).toFixed(2)} m down.`, 'Drawn as the standard 0.60 m concrete sump (COM-05); the pit floor is taken as 0.20 m below the pipe.'],
            [`ระดับที่ระบุในผัง: ${lv(l)} (ถือเป็นระดับท่อ) ระดับพื้นตรงนี้ประมาณ ${lv(g0)} ท่อจึงอยู่ลึกประมาณ ${(g0 - l).toFixed(2)} ม.`, 'แสดงเป็นบ่อพักคอนกรีตมาตรฐาน 0.60 ม. (COM-05) ก้นบ่อใช้ค่าต่ำกว่าท่อ 0.20 ม.'], P) });
        add('drains', boxGeo(0.7, 0.7, 0.03, x, y, g0, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
      });
      const a = run.pts[0][2], b = run.pts[run.pts.length - 1][2];
      pipe('drains', run.pts, 0.2, 'drain', { en: `Site drain: ${run.en}`, th: 'ท่อระบายน้ำภายในสถานี', kind: 'drain',
        info: (m) => lines([`About ${m} m. Levels along it run from ${lv(a)} to ${lv(b)}, as written at each sump on the layout.`, 'Drawn as 0.40 m concrete pipe (standard detail COM-05); the layout does not state the pipe size on each run.'],
          [`ยาวประมาณ ${m} ม. ระดับตามแนวท่อจาก ${lv(a)} ถึง ${lv(b)} ตามที่ระบุที่แต่ละบ่อพักในผัง`, 'แสดงเป็นท่อคอนกรีต 0.40 ม. (แบบมาตรฐาน COM-05) ผังไม่ได้ระบุขนาดท่อของแต่ละช่วง'], P) });
    }
    pipe('drains', [[2278.94, -430.25, -0.99], [2280.64, -441.66], [2282.82, -455.33], [2284.07, -463.14], [2285.75, -473.68], [2290.95, -491.96], [2290.27, -492.15, -1.20]], 0.1, 'drain', { en: 'Second line along the shop fronts', th: 'ท่อแนวที่สองหน้าร้านค้า', kind: 'drain',
      info: (m) => lines([`A second line drawn about 1.2 m east of the shop-front drain, from the toilets to shop building 2, about ${m} m. No size or level is written on it; it is shown at the level of the drain beside it.`], [`แนวท่อที่สอง ห่างจากท่อระบายน้ำหน้าร้านไปทางตะวันออกประมาณ 1.2 ม. จากห้องน้ำถึงอาคารร้านค้า 2 ยาวประมาณ ${m} ม. ไม่มีขนาดหรือระดับระบุ แสดงที่ระดับเดียวกับท่อข้างเคียง`], P) });
    const ows = (x, y, rot, inL, outL, where, whereTh, tag, tagTh) => {
      const g0 = ground(x, y);
      add('drains', boxGeo(1.4, 3.8, 2.5, x, y, g0 - 2.5, rot), 'oilTrap', { en: `Oil trap (3 chambers) · ${where}`, th: `บ่อดักน้ำมัน 3 ตอน · ${whereTh}`, tag, tagTh, lvl: `${lv(inL)} / ${lv(outL)}`, kind: 'manhole',
        info: lines([`Three-chamber oil and grease trap (OWS), 3.84 m³: 3.40 × 1.00 m inside, about 2.5 m deep (detail COM-02). The last stop before the public drain.`, `Levels written on the layout: ${lv(inL)} in · ${lv(outL)} out.`, 'This is the outfall for everything the site drains carry, including the treated water from the tanks.'],
          [`บ่อดักน้ำมันและไขมัน 3 ตอน (OWS) ขนาด 3.84 ลบ.ม.: ภายใน 3.40 × 1.00 ม. ลึกประมาณ 2.5 ม. (แบบ COM-02) จุดสุดท้ายก่อนลงท่อระบายน้ำสาธารณะ`, `ระดับที่ระบุในผัง: เข้า ${lv(inL)} · ออก ${lv(outL)}`, 'เป็นจุดปล่อยน้ำของทุกอย่างที่ท่อระบายน้ำในสถานีรับ รวมถึงน้ำที่บำบัดแล้วจากถัง'], P) }, V(x, y, g0 + 0.7));
    };
    ows(2243.94, -509.28, 0, -1.37, -1.40, 'south-west corner', 'มุมตะวันตกเฉียงใต้', 'Oil trap (west outfall)', 'บ่อดักน้ำมัน (ทางออกตะวันตก)');
    ows(2308.20, -509.44, 16, -1.35, -1.40, 'south-east corner', 'มุมตะวันออกเฉียงใต้', 'Oil trap (east outfall)', 'บ่อดักน้ำมัน (ทางออกตะวันออก)');
    pipe('drains', [[2243.96, -511.0, -1.40], [2243.96, -513.4, -1.42]], 0.15, 'drain', { en: 'West outfall to the public drain', th: 'ท่อออกด้านตะวันตกลงท่อสาธารณะ', kind: 'drain', info: lines(['0.30 m concrete pipe from the oil trap to the public manhole (COM-02). Level -1.40 at the trap; the far end is not on the layout.'], ['ท่อคอนกรีต 0.30 ม. จากบ่อดักน้ำมันไปบ่อพักสาธารณะ (COM-02) ระดับ -1.40 ที่บ่อดัก ปลายทางไม่มีในผัง'], P) });
    pipe('drains', [[2308.66, -511.08, -1.40], [2309.3, -513.3, -1.42]], 0.15, 'drain', { en: 'East outfall to the public drain', th: 'ท่อออกด้านตะวันออกลงท่อสาธารณะ', kind: 'drain', info: lines(['0.30 m concrete pipe from the oil trap to the public manhole (COM-02). Level -1.40 at the trap; the far end is not on the layout.'], ['ท่อคอนกรีต 0.30 ม. จากบ่อดักน้ำมันไปบ่อพักสาธารณะ (COM-02) ระดับ -1.40 ที่บ่อดัก ปลายทางไม่มีในผัง'], P) });

    // ---------- underground fuel tanks: the layout draws four 7.5 x 2.35 m tanks (blocks T1, T2, T4, T6 "Tank PSE");
    // the T4 and T6 blocks each carry two product names, so each is one tank with two compartments.
    for (const [label, cx, cy, two] of [['T6 · G91 + T5 · PD', 2258.13, -443.35, 1], ['T4 · G95 + T3 · E20', 2261.50, -443.35, 1], ['T1 · B7', 2258.15, -451.85, 0], ['T2 · B10', 2261.50, -451.85, 0]]) {
      fuelTank(label, cx, cy, 90, { dia: 2.35, en: two ? ['The layout draws this as one tank carrying two products, so it is shown as one tank with two compartments.'] : [], th: two ? ['ในผังเป็นถังใบเดียวที่ระบุน้ำมัน 2 ชนิด จึงแสดงเป็นถังใบเดียวแบ่ง 2 ช่อง'] : [] });
    }

    // ---------- buildings and canopy (context)
    const building = (poly, floor, h, o) => add('buildings', prismGeo(poly, floor, h), 'building', { ...o, kind: 'building', info: lines([], [], C) }, V(poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length, floor + h + 0.7));
    building([[2258.5, -357.5], [2275.6, -357.5], [2275.6, -369.0], [2258.5, -369.0]], 0.18, 4.5, { en: 'Star Park (toilets and rest area)', th: 'Star Park (ห้องน้ำและจุดพัก)', tag: 'Star Park', tagTh: 'Star Park' });
    building([[2276.7, -405.3], [2285.3, -404.0], [2286.3, -409.8], [2277.6, -411.1]], 0.115, 3.2, { en: 'Office', th: 'สำนักงาน', tag: 'Office', tagTh: 'สำนักงาน' });
    building([[2278.0, -412.3], [2285.9, -411.1], [2286.3, -413.6], [2278.4, -414.8]], 0.1, 2.8, { en: 'Pump room and 20,000 L water tank', th: 'ห้องปั๊มน้ำและถังน้ำ 20,000 ลิตร', tag: 'Pump room', tagTh: 'ห้องปั๊มน้ำ' });
    building([[2279.8, -415.6], [2286.4, -414.6], [2288.9, -428.9], [2282.0, -430.0]], 0.175, 3.5, { en: 'Toilets', th: 'ห้องน้ำ', tag: 'Toilets', tagTh: 'ห้องน้ำ' });
    building([[2289.8, -431.3], [2292.2, -430.9], [2292.8, -434.6], [2290.4, -435.0]], 0.05, 2.6, { en: 'Garbage room', th: 'ห้องพักขยะ', tag: 'Garbage room', tagTh: 'ห้องพักขยะ' });
    building([[2282.0, -438.2], [2290.4, -436.9], [2295.1, -466.7], [2286.9, -468.0]], 0.085, 4.2, { en: 'Shop building 1 (6 units)', th: 'อาคารร้านค้า 1 (6 คูหา)', tag: 'Shops 1', tagTh: 'ร้านค้า 1' });
    building([[2287.9, -473.6], [2296.1, -471.3], [2304.4, -500.5], [2296.2, -502.8]], 0.085, 4.2, { en: 'Shop building 2 (6 units)', th: 'อาคารร้านค้า 2 (6 คูหา)', tag: 'Shops 2', tagTh: 'ร้านค้า 2' });
    add('buildings', prismGeo([[2259.3, -464.3], [2269.5, -462.7], [2275.6, -503.6], [2265.4, -505.2]], 5.6, 0.9), 'roof', { en: 'Pump canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย', kind: 'building', info: lines(['Canopy over the four pump islands.'], ['หลังคาคลุมแท่นหัวจ่าย 4 แท่น'], C) }, V(2267.5, -484, 7.2));
  },
};
