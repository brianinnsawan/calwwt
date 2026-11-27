// 1622 Ram Intra, Bangkok (CORO NTI Ram Intra): what the 3D model shows. Built by tools/models/build.mjs into public/sites/models/1622.glb.
//
// Sources (PDF only, in portal-proposal/public/sites/layouts/1622/):
//   A  1622-layout-grease-trap-addition-2020.pdf = site layout sheet A-07, 1:250, "FOR AS-BUILD" 15.07.2020, plotted again
//      16 Oct 2020 with the grease trap addition. Positions of manholes, drain runs (size, "SLOPE 1:200", flow arrows),
//      V-gutters, tanks, grease traps, road pits, buildings; a few ground levels. NO pipe levels anywhere on it.
//   B  1622-septic-tank-manhole-details-rev2.pdf = as-built details A-14 (gutter), A-15 (manholes), A-16 (pipe laying,
//      grease trap pit at the road with its levels), A-17 (Biotech BO-6000 treatment tank, slab and piles).
// Positions are sheet metres at 1:250 (x right, y up the sheet, origin bottom-left of the page); the scale was checked
// against the written boundary lengths (72.95, 78.94, 83.10, 80.33 m; all within 0.3 %).
// Levels are metres from the drawing's datum: +/-0.00 = Ram Intra road.
//
// PIPE LEVELS ARE ASSUMED. Rule used for every drain run: pipe top 0.40 m below ground at the start of the run, then
// falling 1:200 in the drawn flow direction; where the ground drops faster than that, the pipe is kept 0.30 m under the
// ground (the minimum cover on detail A-16). Every drain run and manhole is therefore 'part', never 'drawn'.
const D = 'drawn', P = 'part', C = 'context';
const COVER = 0.40, MIN_COVER = 0.30, FALL = 1 / 200;

// Manholes: [x, y, ground]. Ground = the nearest level written on the layout for that kind of surface
// (forecourt spot levels, "lawn +0.70", "+0.20" on the driveway gutters).
const MH = {
  // rear line and west side (RCP 0.40), W1 is the high point of the rear line
  W1: [55.75, 97.04, 0.70], W2: [43.17, 96.41, 0.70], W3: [30.60, 95.78, 0.70], W4: [21.51, 95.33, 0.70], W5: [21.51, 84.86, 0.75],
  W6: [21.51, 74.37, 0.70], W7: [21.51, 62.34, 0.70], W8: [30.58, 62.34, 0.70], W9: [39.70, 62.34, 0.70], W10: [39.70, 53.31, 0.70],
  W11: [39.70, 42.82, 0.70], W12: [39.70, 32.68, 0.70], W13: [39.70, 25.90, 0.70], W14: [29.04, 25.90, 0.70],
  // rear line east and east side (RCP 0.40)
  E1: [68.31, 97.66, 0.70], E2: [70.80, 85.71, 0.80], E3: [78.43, 76.20, 0.75], E4: [79.55, 65.99, 0.75], E5: [80.74, 55.13, 0.75],
  E6: [81.96, 43.93, 0.75], E7: [83.08, 33.71, 0.75], E8: [90.42, 26.77, 0.70],
  // manholes that take the treated water from the two toilet tanks
  T1: [89.17, 85.96, 0.70], T2: [81.96, 82.98, 0.70], T3: [82.76, 71.07, 0.70],
  // west RCP 0.30 line
  B1: [23.21, 81.25, 0.75], B2: [23.21, 63.34, 0.70], B3: [30.58, 63.38, 0.70], B4: [37.51, 63.34, 0.70],
  // canopy area (drawn as open squares = manhole 60 x 60 with a plain cover)
  C1: [58.02, 64.60, 0.85, 1], C2: [63.02, 64.60, 0.85, 1], C3: [58.02, 54.61, 0.85, 1], C4: [63.02, 54.61, 0.85, 1],
  C5: [58.02, 44.62, 0.85, 1], C6: [63.02, 44.62, 0.85, 1], C7: [58.02, 34.63, 0.85, 1], C8: [63.02, 34.63, 0.85, 1],
  // front (road side)
  F1: [60.89, 21.38, 0.65], F2: [62.58, 17.19, 0.20], F3: [46.68, 17.19, 0.20], F4: [39.36, 17.19, 0.20], F5: [39.36, 19.71, 0.20],
  F6: [70.08, 17.19, 0.20], F7: [78.98, 17.19, 0.60], F8: [78.98, 19.71, 0.60],
  // behind building A
  A1: [92.63, 61.91, 0.70], A2: [83.85, 60.95, 0.70],
};
// Manholes on the V-gutters (no pipe is drawn into them): [x, y, ground]
const GMH = {
  N2: [30.16, 81.25, 0.75], N3: [40.63, 81.25, 0.75], N4: [51.11, 81.25, 0.75], N5: [61.59, 81.25, 0.75], N6: [72.07, 81.25, 0.75],
  GW1: [41.25, 63.34, 0.75], GW2: [41.25, 53.31, 0.75], GW3: [41.25, 42.82, 0.75], GW4: [41.25, 32.68, 0.75], GW5: [41.25, 25.90, 0.65],
  GE1: [76.94, 76.04, 0.75], GE2: [78.06, 65.82, 0.75], GE3: [79.82, 49.69, 0.75], GE4: [80.48, 43.76, 0.75], GE5: [81.59, 33.55, 0.75],
};
// Grease trap pits at the road ("บ่อดักไขมัน คสล." on the layout; detail A-16): [x, y, rotation, ground beside it]
const PITS = {
  P1: { x: 19.85, y: 18.72, rot: 0, g: 0.70, tag: 'Grease trap pit (west outfall)', tagTh: 'บ่อดักไขมัน (ทางออกตะวันตก)', where: 'south-west corner', whereTh: 'มุมตะวันตกเฉียงใต้' },
  P2: { x: 38.10, y: 18.68, rot: 0, g: 0.70, tag: 'Grease trap pit (entrance)', tagTh: 'บ่อดักไขมัน (ทางเข้า)', where: 'west of the entrance', whereTh: 'ด้านตะวันตกของทางเข้า' },
  P3: { x: 83.08, y: 18.78, rot: 0, g: 0.60, tag: 'Grease trap pit (exit)', tagTh: 'บ่อดักไขมัน (ทางออก)', where: 'east of the exit', whereTh: 'ด้านตะวันออกของทางออก' },
  P4: { x: 98.55, y: 18.90, rot: 7.3, g: 0.70, tag: 'Grease trap pit (east outfall)', tagTh: 'บ่อดักไขมัน (ทางออกตะวันออก)', where: 'south-east corner', whereTh: 'มุมตะวันออกเฉียงใต้' },
};
const PIT = { top: 0.84, lawn: 0.74, inTop: -0.107, inL: -0.507, outL: -0.557, floor: -1.50, under: -1.60, pubCover: 0.264, pubWater: -1.146, pubFloor: -2.976 };

const XLINK = { en: 'Drawn on the layout as a line between two manholes with no size or arrow written on it: shown as 0.30 m, like the pipe it joins, flowing towards that pipe.', th: 'ในผังเป็นเส้นเชื่อมระหว่างบ่อพักสองบ่อ ไม่ได้เขียนขนาดหรือลูกศร แสดงเป็นท่อ 0.30 ม. เท่ากับท่อที่ไปต่อ และไหลเข้าหาท่อนั้น' };
// Drain runs in flow direction. d = pipe size written on the layout (m). A node is a manhole id or [x, y, ground].
// gutter: [i] = the segment after node i is drawn on the layout as a "narrow-mouth" concrete gutter, not a pipe.
const RUNS = [
  { id: 'W', d: 0.4, pit: 'P1', nodes: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'W13', 'W14', [19.95, 20.42, 0.70]],
    en: 'rear line, west side and round the lawn to the west outfall', th: 'แนวด้านหลัง ด้านตะวันตก อ้อมสนามหญ้าไปทางออกตะวันตก' },
  { id: 'E', d: 0.4, pit: 'P4', nodes: ['W1', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', [98.25, 20.60, 0.70]],
    en: 'rear line and east side to the east outfall', th: 'แนวด้านหลังและด้านตะวันออกไปทางออกตะวันออก',
    extra: { en: 'This is the line that carries the treated water from both toilet tanks (it comes in through drains TB and TW) to the south-east grease trap pit and the public drain.', th: 'แนวท่อนี้รับน้ำที่บำบัดแล้วจากถังบำบัดห้องน้ำทั้งสองถัง (เข้ามาทางท่อ TB และ TW) ไปบ่อดักไขมันมุมตะวันออกเฉียงใต้และท่อระบายน้ำสาธารณะ' } },
  { id: 'TB', d: 0.4, nodes: ['T1', 'T2', 'E3'], en: 'from the men\'s toilet tank to the east drain', th: 'จากถังบำบัดห้องน้ำชายไปท่อระบายน้ำด้านตะวันออก' },
  { id: 'TW', d: 0.4, nodes: ['T3', 'E4'], en: 'from the women\'s toilet tank to the east drain', th: 'จากถังบำบัดห้องน้ำหญิงไปท่อระบายน้ำด้านตะวันออก' },
  { id: 'B', d: 0.3, nodes: ['B1', 'B2', 'B3', 'B4'], en: 'west end of the V-gutter, south and east along the lawn', th: 'จากปลายรางวีด้านตะวันตก ลงใต้และไปทางตะวันออกตามแนวสนามหญ้า',
    extra: { en: 'On the layout this pipe ends at manhole B4, where the west V-gutter starts. How the water carries on from there is not shown: check on site.', th: 'ในผัง ท่อนี้สิ้นสุดที่บ่อพัก B4 ซึ่งเป็นจุดเริ่มของรางวีด้านตะวันตก ผังไม่ได้แสดงว่าน้ำไปต่ออย่างไร ต้องตรวจสอบหน้างาน' } },
  { id: 'G2', d: 0.3, pit: 'P2', nodes: [[41.25, 25.90, 0.65], [38.65, 20.35, 0.70]], en: 'end of the west V-gutter to the entrance pit', th: 'จากปลายรางวีด้านตะวันตกไปบ่อดักไขมันที่ทางเข้า' },
  { id: 'C', d: 0.3, nodes: ['C1', 'C2', 'C4', 'C6', 'C8', 'F1', 'F2'], en: 'canopy area to the front', th: 'จากบริเวณหลังคาคลุมหัวจ่ายไปด้านหน้า',
    extra: { en: 'The eight manholes here are drawn in two rows of four in the middle of the forecourt. The layout shows no canopy, pump islands or fuel tanks, so what these manholes serve is not stated. The first 5 m (C1 to C2) is a cross link with no size written.', th: 'บ่อพัก 8 บ่อนี้เขียนเป็น 2 แถว แถวละ 4 บ่อ กลางลาน ผังไม่ได้แสดงหลังคาคลุมหัวจ่าย แท่นหัวจ่าย หรือถังน้ำมัน จึงไม่ได้ระบุว่าบ่อพักเหล่านี้รับน้ำจากอะไร ช่วง 5 ม. แรก (C1 ถึง C2) เป็นท่อเชื่อมที่ไม่ได้เขียนขนาด' } },
  { id: 'C3', d: 0.3, nodes: ['C3', 'C4'], en: 'canopy area, cross link', th: 'บริเวณหลังคาคลุมหัวจ่าย ท่อเชื่อม', extra: XLINK },
  { id: 'C5', d: 0.3, nodes: ['C5', 'C6'], en: 'canopy area, cross link', th: 'บริเวณหลังคาคลุมหัวจ่าย ท่อเชื่อม', extra: XLINK },
  { id: 'C7', d: 0.3, nodes: ['C7', 'C8'], en: 'canopy area, cross link', th: 'บริเวณหลังคาคลุมหัวจ่าย ท่อเชื่อม', extra: XLINK },
  { id: 'FW', d: 0.3, pit: 'P2', gutter: [1], nodes: ['F2', 'F3', 'F4', 'F5', [38.62, 19.71, 0.70]], en: 'front, flowing west across the entrance to its pit', th: 'ด้านหน้า ไหลไปทางตะวันตกผ่านทางเข้าไปบ่อดักไขมัน',
    extra: { en: 'Only the part from F2 to F3 is labelled RCP 0.30 m. From F3 to F4 the layout shows a narrow-mouth gutter across the entrance. The short pieces F4 to F5 and into the pit are drawn without a size (shown as 0.30 m).', th: 'มีเฉพาะช่วง F2 ถึง F3 ที่ระบุ RCP 0.30 ม. ช่วง F3 ถึง F4 ผังแสดงเป็นรางระบายน้ำชนิดปากแคบขวางทางเข้า ช่วงสั้น F4 ถึง F5 และเข้าบ่อไม่ได้เขียนขนาด (แสดงเป็น 0.30 ม.)' } },
  { id: 'FE', d: 0.3, pit: 'P3', gutter: [0], nodes: ['F2', 'F6', 'F7', 'F8', [82.58, 19.75, 0.60]], en: 'front, flowing east across the exit to its pit', th: 'ด้านหน้า ไหลไปทางตะวันออกผ่านทางออกไปบ่อดักไขมัน',
    extra: { en: 'From F2 to F6 the layout shows a narrow-mouth gutter across the exit. Only the part from F6 to F7 is labelled RCP 0.30 m. The short pieces F7 to F8 and into the pit are drawn without a size (shown as 0.30 m).', th: 'ช่วง F2 ถึง F6 ผังแสดงเป็นรางระบายน้ำชนิดปากแคบขวางทางออก มีเฉพาะช่วง F6 ถึง F7 ที่ระบุ RCP 0.30 ม. ช่วงสั้น F7 ถึง F8 และเข้าบ่อไม่ได้เขียนขนาด (แสดงเป็น 0.30 ม.)' } },
];

// Concrete V-gutters, 25 cm wide (layout legend), in flow direction. Points [x, y].
const GUTTERS = [
  { en: 'across the forecourt, west half (flows west)', th: 'ขวางลาน ครึ่งตะวันตก (ไหลไปทางตะวันตก)', pts: [[51.11, 81.25], [40.63, 81.25], [30.16, 81.25], [23.21, 81.25]] },
  { en: 'across the forecourt, east half (flows east)', th: 'ขวางลาน ครึ่งตะวันออก (ไหลไปทางตะวันออก)', pts: [[51.11, 81.25], [61.59, 81.25], [72.07, 81.25]] },
  { en: 'west side of the forecourt (flows south)', th: 'ด้านตะวันตกของลาน (ไหลลงใต้)', pts: [[37.51, 63.34], [41.25, 63.34], [41.25, 53.31], [41.25, 42.82], [41.25, 32.68], [41.25, 25.90]] },
  { en: 'east side of the forecourt (flows south to the exit pit)', th: 'ด้านตะวันออกของลาน (ไหลลงใต้ไปบ่อดักไขมันที่ทางออก)', pts: [[76.94, 76.04], [78.06, 65.82], [79.82, 49.69], [80.48, 43.76], [81.59, 33.55], [83.00, 20.50]] },
];

// The two treatment tanks (plan position from the layout; model, size and pipe depths from detail A-17)
const LAWN = 0.70;
const TANKS = [
  { id: 'men', x: 89.45, y: 83.55, en: 'men\'s toilets', th: 'ห้องน้ำชาย', inAt: [89.55, 82.52], outAt: [89.35, 84.58], mh: 'T1' },
  { id: 'women', x: 86.05, y: 71.65, en: 'women\'s toilets', th: 'ห้องน้ำหญิง', inAt: [87.08, 71.75], outAt: [85.02, 71.55], mh: 'T3' },
];
// outside shape of a BO-6000 tank read off the A-17 section: [radius, height above its base]
const BO6000 = [[0, 0], [0.84, 0], [0.92, 0.5], [1.0, 1.3], [1.0175, 1.64], [0.82, 2.1], [0.79, 2.44], [0.40, 2.44], [0.40, 2.64]];

// Levels written on the layout: [x, y, level]. Spot levels first, then levels written as a label on an area.
const SPOT = [[32.35, 96.5, 0.70], [58.0, 95.55, 0.70], [17.4, 86.45, 0.75], [35.0, 86.45, 0.80], [58.0, 86.45, 0.80], [70.9, 86.3, 0.80], [58.0, 81.55, 0.75],
  [36.7, 74.1, 0.75], [58.0, 67.1, 0.85], [58.0, 61.25, 0.85], [45.4, 56.55, 0.75], [67.4, 58.05, 0.75], [45.4, 41.3, 0.75], [58.0, 41.5, 0.85], [72.7, 42.8, 0.75],
  [58.0, 29.0, 0.85], [45.15, 21.6, 0.65], [59.05, 22.4, 0.65], [66.6, 19.75, 0.65], [54.5, 17.55, 0.65], [66.6, 17.0, 0.20], [41.5, 17.4, 0.20]];
const AREA = [[21.0, 72.0, 0.70], [26.5, 44.5, 0.70], [24.5, 20.6, 0.70], [87.0, 66.2, 0.70], [50.0, 18.5, 0.60], [60.3, 18.2, 0.60], [79.6, 18.2, 0.60],
  [76.0, 83.2, 0.90], [81.3, 71.0, 0.90], [83.7, 43.5, 0.90], [55.5, 50.0, 0.85]];
// extra points only to shape the ground surface between the written levels (same values as the nearest written level)
const FILL = [...[20, 32, 45, 58, 70, 80, 88].map((x) => [x, 98.2 + (x - 58) * 0.045, 0.70]), ...[90, 80, 70, 62, 50, 40, 30, 24].map((y) => [92.5 + (62 - y) * 0.105, y, 0.70]),
  ...[30, 40, 52, 62, 70, 78, 86, 92].map((y) => [19.5, y, 0.70]), [30, 55, 0.70], [30, 35, 0.70], [34, 22, 0.70], [93, 22, 0.70], [86, 88, 0.70], [91, 90, 0.70], [84, 84, 0.70],
  ...[78, 66, 55, 44, 33].map((y) => [80.0 + (76 - y) * 0.108, y, 0.75]), ...[62, 52, 42, 34, 26].map((y) => [42.5, y, 0.75]), ...[30, 45, 65].map((x) => [x, 79.5, 0.75]),
  ...[66, 56, 46, 36].map((y) => [50, y, 0.80]), ...[66, 56, 46, 36].map((y) => [70, y, 0.80]), ...[60, 50, 40].map((y) => [60.5, y, 0.85]),
  ...[82.5, 60, 40, 22].map((y) => [82.2 + (72 - y) * 0.108, y, 0.90]), [43, 17.2, 0.20], [63.5, 17.1, 0.20], [69, 17.1, 0.20], [74, 17.6, 0.60], [56, 20.5, 0.65], [52, 23, 0.65], [72, 22, 0.65]];

export default {
  name: 'Ram Intra, Bangkok',
  origin: [58, 57],
  datum: { en: 'Levels are in metres from the drawing datum: ±0.00 is the Ram Intra road. The forecourt is +0.65 to +0.85, lawns +0.60 to +0.70, buildings +0.85 to +1.00.',
    th: 'ระดับเป็นเมตรจากระดับอ้างอิงของแบบ: ±0.00 คือผิวถนนรามอินทรา ลานคอนกรีตอยู่ที่ +0.65 ถึง +0.85 สนามหญ้า +0.60 ถึง +0.70 อาคาร +0.85 ถึง +1.00' },
  note: { en: 'First version, built from the 2020 as-built PDF drawings (layout A-07, details A-14 to A-17). The drawings give ground levels and pipe slopes but no pipe levels: the depth of every drain pipe and manhole here is worked out from an assumed cover and the drawn slope 1:200, not measured. Check on site before any digging; not for setting out.',
    th: 'ฉบับแรก จัดทำจากแบบก่อสร้างจริงปี 2020 (ไฟล์ PDF ผังบริเวณ A-07 และแบบขยาย A-14 ถึง A-17) แบบมีระดับพื้นและความลาดท่อ แต่ไม่มีระดับท่อ ความลึกของท่อระบายน้ำและบ่อพักทุกจุดในโมเดลนี้คำนวณจากระยะดินถมหลังท่อที่สมมติและความลาด 1:200 ตามแบบ ไม่ใช่ค่าที่วัดจริง ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง' },
  built: '2026-11-25',
  // North, as a drawing angle anticlockwise from the sheet's +x. The road labels on A-07 (Lak Si to the left, Min Buri to
  // the right) put north UP the sheet, and every "north / south / east / west" in the notes below is written that way.
  // The small north symbol at the right of the sheet reads as pointing the other way (264.4): to confirm against the map.
  north: 84.4,
  boundary: [[17.4, 95.75], [17.5, 78.4], [18.1, 42.7], [19.15, 16.95], [99.35, 16.95], [90.2, 99.4]],
  ground: {
    bbox: [12, 4, 106, 104], step: 2, apron: 4, road: 0,
    roadArea: [[12, 4], [106, 4], [106, 16.95], [12, 16.95]],
    points: [...SPOT, ...AREA, ...FILL, ...Object.values(MH).map(([x, y, g]) => [x, y, g]), ...Object.values(GMH).map(([x, y, g]) => [x, y, g]),
      ...TANKS.map((t) => [t.x, t.y, LAWN]), [94.3, 28.15, LAWN], [90.45, 88.1, LAWN]],
    names: { siteGround: { en: 'Forecourt, paving and lawn', th: 'ลาน ทางเดิน และสนามหญ้า' }, road: { en: 'Ram Intra road side and entrances', th: 'ด้านถนนรามอินทราและทางเข้าออก' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'air', 'base', 'water', 'buildings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [58, -42, 78], to: [58, 52, 0] },
    { id: 'plan', from: [58, 56.9, 150], to: [58, 57, 0] },
    { id: 'toilets', en: 'Toilet tanks', th: 'ถังบำบัดห้องน้ำ', from: [117, 80, 15], to: [88, 80.5, -1.5] },
    { id: 'bldgA', en: 'Building A grease trap and east outfall', th: 'ถังดักไขมันอาคาร A และทางออกตะวันออก', from: [112, 3, 17], to: [94, 23, -2] },
    { id: 'west', en: 'West outfall pits', th: 'บ่อดักไขมันด้านตะวันตก', from: [28, -10, 19], to: [29, 21, -1.5] },
    { id: 'kfc', en: 'KFC tanks', th: 'ถังของ KFC', from: [21, 43, 11], to: [31.5, 57.5, -1.2] },
    { id: 'under', from: [106, 62, -8], to: [87, 79, -0.3] },
  ],

  build({ notes, V, ground, lv, add, boxGeo, cylGeo, capsuleGeo, fuelTank, latheGeo, prismGeo, pipeGeo, merge }) {
    const r2 = (n) => Math.round(n * 100) / 100;   // worked-out levels are shown to the centimetre
    const lines = notes;   // (en lines, th lines, 'drawn' | 'part' | 'context')
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tagAt ? V(...o.tagAt) : o.tag ? g.mid.clone().setY(g.mid.y + 0.6) : null); return g; };
    const ASSUMED = { en: 'No pipe level is written on the drawings. The depth shown is assumed from the slope, not measured.', th: 'ในแบบไม่มีระดับท่อ ความลึกที่แสดงเป็นค่าสมมติจากความลาด ไม่ใช่ค่าที่วัดจริง' };

    // ---------- work out the assumed pipe levels of every drain run
    const node = (n) => (typeof n === 'string' ? MH[n] : n);
    const mhLevel = {};   // lowest assumed pipe level at each manhole
    for (const run of RUNS) {
      let inv = null, prev = null; run.pts = []; run.held = false;
      for (const n of run.nodes) {
        const [x, y, g] = node(n);
        if (inv == null) inv = g - COVER - run.d;
        else { inv -= Math.hypot(x - prev[0], y - prev[1]) * FALL; const lim = g - MIN_COVER - run.d; if (inv > lim) { inv = lim; run.held = true; } }
        run.pts.push([x, y, r2(inv)]); prev = [x, y];
        if (typeof n === 'string') mhLevel[n] = Math.min(mhLevel[n] ?? Infinity, r2(inv));
      }
    }
    // behind building A: small pits and their pipes to manholes A1 and A2 (size not written; drawn as 150 mm, levels assumed)
    const aStart = LAWN - COVER - 0.15, a1 = r2(aStart - 5.1 * FALL), a2 = r2(a1 - 8.8 * FALL);
    mhLevel.A1 = a1; mhLevel.A2 = a2;

    // ---------- treatment tanks (Biotech BO-6000, detail A-17), their slabs and piles
    const inC = LAWN - 0.425, outC = LAWN - 0.45, base = LAWN - 2.64, inInv = r2(inC - 0.05), outInv = r2(outC - 0.05);
    const slabs = [], piles = [], rot = 6, ca = Math.cos(rot * Math.PI / 180), sa = Math.sin(rot * Math.PI / 180);
    for (const t of TANKS) {
      add('tanks', latheGeo(BO6000, t.x, t.y, base), 'tank', { en: `BO-6000 treatment tank · ${t.en}`, th: `ถังบำบัด BO-6000 · ${t.th}`, tag: 'BO-6000', tagTh: 'BO-6000', kind: 'tank',
        info: lines([`Package wastewater treatment tank for the ${t.en}. The layout draws it but does not name it: the as-built detail sheet A-17 shows one model, Biotech BO-6000 (fibreglass), and the plan symbol is the same size.`,
          'Size (A-17): 2.035 m across, 2.64 m high, with a 0.80 m cover at ground level. For wastewater up to BOD 250 mg/l.',
          `Pipe in (4" PVC) 0.425 m below ground and pipe out (4" PVC) 0.45 m below ground (A-17). Ground here is taken as ${lv(LAWN)} (lawn), so: in about ${lv(inC)}, out about ${lv(outC)}, underside of tank about ${lv(base)}.`,
          'Aerated tank: A-17 shows an air pump (120 l/min) and a 1/2" air pipe. The layout does not show where the pump is, so it is not in the model.',
          'The ground level at the tank is not written on the layout; confirm the model and depth on site.'],
        [`ถังบำบัดน้ำเสียสำเร็จรูปของ${t.th} ผังแสดงตำแหน่งแต่ไม่ได้ระบุรุ่น แบบขยาย A-17 ของชุดแบบก่อสร้างจริงแสดงรุ่นเดียวคือ Biotech BO-6000 (ไฟเบอร์กลาส) และสัญลักษณ์ในผังมีขนาดเท่ากัน`,
          'ขนาด (A-17): กว้าง 2.035 ม. สูง 2.64 ม. ฝาเปิดกว้าง 0.80 ม. ที่ระดับพื้น รองรับน้ำเสีย BOD ไม่เกิน 250 มก./ล.',
          `ท่อเข้า (PVC 4 นิ้ว) ต่ำกว่าพื้น 0.425 ม. ท่อออก (PVC 4 นิ้ว) ต่ำกว่าพื้น 0.45 ม. (A-17) ใช้ระดับพื้นตรงนี้ ${lv(LAWN)} (สนามหญ้า) จึงได้: ท่อเข้าประมาณ ${lv(inC)} ท่อออกประมาณ ${lv(outC)} ใต้ถังประมาณ ${lv(base)}`,
          'ถังเติมอากาศ: A-17 แสดงปั๊มลม (120 ลิตร/นาที) และท่อลม 1/2 นิ้ว ผังไม่ได้แสดงตำแหน่งปั๊มลม จึงยังไม่มีในโมเดล',
          'ระดับพื้นที่ถังไม่ได้เขียนไว้ในผัง ต้องยืนยันรุ่นและความลึกหน้างาน'], P) }, V(t.x, t.y, LAWN + 0.7));
      add('tanks', cylGeo(0.42, 0.03, t.x, t.y, LAWN), 'cover', { en: 'BO-6000 cover', th: 'ฝาถัง BO-6000', nopick: 1 });
      slabs.push(boxGeo(2.0, 2.0, 0.10, t.x, t.y, base - 0.10, rot));
      for (const i of [-0.75, 0, 0.75]) for (const j of [-0.5, 0.5]) piles.push(boxGeo(0.15, 0.15, 4.0, t.x + i * ca - j * sa, t.y + i * sa + j * ca, base - 0.10 - 4.0, rot));
    }
    add('base', merge(slabs), 'slab', { en: 'Treatment tank base slabs', th: 'ฐานคอนกรีตใต้ถังบำบัด', kind: 'base', info: lines(
      ['Reinforced concrete slab 2.00 × 2.00 m, 0.10 m thick, on 0.05 m lean concrete and 0.10 m compacted sand (detail A-17).', `Top of slab about ${lv(base)}, worked out from the tank height and a ground level of ${lv(LAWN)}.`],
      ['พื้นคอนกรีตเสริมเหล็ก 2.00 × 2.00 ม. หนา 0.10 ม. บนคอนกรีตหยาบ 0.05 ม. และทรายอัดแน่น 0.10 ม. (แบบ A-17)', `ระดับหลังฐานประมาณ ${lv(base)} คำนวณจากความสูงถังและระดับพื้น ${lv(LAWN)}`], P) });
    add('base', merge(piles), 'pile', { en: 'Piles under the treatment tanks', th: 'เสาเข็มใต้ถังบำบัด', kind: 'base', info: lines(
      ['Six piles under each tank, 0.15 × 0.15 × 4.00 m, at 0.75 m and 1.00 m centres (detail A-17).', 'Which way the pile rows run under each tank is not on the layout.'],
      ['เสาเข็ม 6 ต้นต่อถัง ขนาด 0.15 × 0.15 × 4.00 ม. ระยะห่าง 0.75 ม. และ 1.00 ม. (แบบ A-17)', 'ผังไม่ได้ระบุทิศทางของแถวเสาเข็มใต้ถังแต่ละใบ'], P) });

    // ---------- grease traps
    { // DOS HRGT-1000L beside building B: round on plan, about 1.55 m across
      const x = 90.45, y = 88.10, top = LAWN - 0.15;
      add('tanks', cylGeo(0.78, 1.0, x, y, top - 1.0), 'grease', { en: 'Grease trap DOS HRGT-1000L · building B', th: 'ถังดักไขมัน DOS HRGT-1000L · อาคาร B', tag: 'Grease trap HRGT-1000L', tagTh: 'ถังดักไขมัน HRGT-1000L', kind: 'tank',
        info: lines(['Grease trap for commercial building B, labelled "DOS HRGT-1000L" on the layout (1,000 L). Drawn round, about 1.55 m across.',
          'Waste comes in from the building (the Chao Doi coffee shop) through a 2" PVC pipe and a U-trap. It leaves along the east boundary to the building A grease trap DGLFN-2.0Q beside the minimart (Brian, 27 Nov 2026); the 2020 layout wrongly draws it into the men\'s toilet tank.',
          'Its height and depth are not on the drawings: shown 1.0 m high with the top 0.15 m below ground (assumed).'],
        ['ถังดักไขมันของอาคารพาณิชย์ B ในผังระบุ "DOS HRGT-1000L" (1,000 ลิตร) เขียนเป็นถังกลม กว้างประมาณ 1.55 ม.',
          'น้ำทิ้งจากอาคาร (ร้านกาแฟเจ้าดอย) เข้าทางท่อ PVC 2 นิ้ว ผ่าน U-trap แล้วออกไปตามแนวเขตด้านตะวันออก ไปถังดักไขมัน DGLFN-2.0Q ของอาคาร A ข้างมินิมาร์ท (Brian, 27 พ.ย. 2026) ผังปี 2020 เขียนผิดว่าเข้าถังบำบัดห้องน้ำชาย',
          'ในแบบไม่มีความสูงและความลึก แสดงสูง 1.0 ม. หลังถังต่ำกว่าพื้น 0.15 ม. (ค่าสมมติ)'], P) }, V(x, y, LAWN + 0.7));
      add('tanks', cylGeo(0.3, 0.15, x, y, top), 'grease', { en: 'Grease trap access', th: 'ช่องเปิดถังดักไขมัน', nopick: 1 });
      add('tanks', cylGeo(0.33, 0.03, x, y, LAWN), 'cover', { en: 'Grease trap cover', th: 'ฝาถังดักไขมัน', nopick: 1 });
    }
    { // DGLFN-2.0Q south-east of building A: lying capsule about 5.0 x 1.25 m on plan, three covers
      const x = 94.30, y = 28.15, r = 0.625, len = 5.0, ang = 96.9, top = LAWN - 0.30, axis = top - r;
      add('tanks', capsuleGeo(r, len, x, y, axis, ang), 'grease', { en: 'Grease trap DGLFN-2.0Q · building A', th: 'ถังดักไขมัน DGLFN-2.0Q · อาคาร A', tag: 'Grease trap DGLFN-2.0Q', tagTh: 'ถังดักไขมัน DGLFN-2.0Q', kind: 'tank',
        info: lines(['Grease trap for commercial building A, labelled "DGLFN-2.0Q" on the layout. Drawn as a long lying tank, about 5.0 m long and 1.25 m across, with three covers.',
          'Waste comes from the back of building A in a 2" PVC pipe along the east boundary and through a U-trap; it leaves through a U-trap and a 4" PVC pipe to the grease trap pit at the south-east corner, then to the public drain. It does not pass through a treatment tank.',
          'Its depth is not on the drawings: shown as a lying tank with rounded ends, 1.25 m across, with the top 0.30 m below ground (assumed).'],
        ['ถังดักไขมันของอาคารพาณิชย์ A ในผังระบุ "DGLFN-2.0Q" เขียนเป็นถังนอนยาวประมาณ 5.0 ม. กว้าง 1.25 ม. มีฝาเปิด 3 จุด',
          'น้ำทิ้งมาจากด้านหลังอาคาร A ทางท่อ PVC 2 นิ้ว เลียบแนวเขตด้านตะวันออก ผ่าน U-trap แล้วออกทาง U-trap และท่อ PVC 4 นิ้ว ไปบ่อดักไขมันที่มุมตะวันออกเฉียงใต้ แล้วลงท่อระบายน้ำสาธารณะ ไม่ได้ผ่านถังบำบัด',
          'ในแบบไม่มีความลึก แสดงเป็นถังนอนปลายมน กว้าง 1.25 ม. หลังถังต่ำกว่าพื้น 0.30 ม. (ค่าสมมติ)'], P) }, V(x, y, LAWN + 0.7));
      for (const [mx, my] of [[94.17, 29.95], [94.37, 28.05], [94.55, 26.55]]) {
        add('tanks', cylGeo(0.26, LAWN - top, mx, my, top), 'grease', { en: 'DGLFN-2.0Q access', th: 'ช่องเปิด DGLFN-2.0Q', nopick: 1 });
        add('tanks', cylGeo(0.29, 0.03, mx, my, LAWN), 'cover', { en: 'DGLFN-2.0Q cover', th: 'ฝา DGLFN-2.0Q', nopick: 1 });
      }
    }

    // ---------- wastewater pipes (routes from the layout; levels assumed, fixed only by the tank depths on A-17)
    const tIn = inInv, tOut = outInv;
    pipe('sewer', [[87.6, 80.30, r2(tIn + 0.045)], [89.75, 80.55], [89.65, 81.30], [89.55, 82.52, tIn]], 0.05, 'sewerRaw', { en: 'Men\'s toilets to their BO-6000 tank', th: 'ท่อจากห้องน้ำชายเข้าถัง BO-6000', kind: 'pipe',
      info: (m) => lines([`Wastewater pipe out of the east wall of the men's toilets, then north into the south side of the tank. About ${m} m. Drawn as 4" PVC (tank inlet size on A-17).`,
        `Enters the tank about ${lv(inC)} (0.425 m below ground, A-17). The level at the toilet end is assumed (fall 1:100).`],
      [`ท่อน้ำเสียออกจากผนังด้านตะวันออกของห้องน้ำชาย แล้วขึ้นเหนือเข้าด้านใต้ของถัง ยาวประมาณ ${m} ม. แสดงเป็นท่อ PVC 4 นิ้ว (ขนาดท่อเข้าถังตาม A-17)`,
        `เข้าถังที่ประมาณ ${lv(inC)} (ต่ำกว่าพื้น 0.425 ม. ตาม A-17) ระดับที่ปลายด้านห้องน้ำเป็นค่าสมมติ (ลาด 1:100)`], P) });
    pipe('sewer', [[88.6, 91.60, r2(tIn + 0.19)], [90.0, 90.40], [90.38, 89.75], [90.40, 88.90, r2(tIn + 0.15)]], 0.025, 'sewerRaw', { en: 'Building B to its grease trap', th: 'ท่อจากอาคาร B เข้าถังดักไขมัน', kind: 'pipe',
      info: lines(['2" PVC waste pipe (class 8.5) from building B, through a U-trap, into the grease trap. Levels are assumed.'], ['ท่อน้ำทิ้ง PVC 2 นิ้ว (ชั้น 8.5) จากอาคาร B ผ่าน U-trap เข้าถังดักไขมัน ระดับเป็นค่าสมมติ'], P) });
    // Building B (the Chao Doi coffee shop): its grease trap drains along the east boundary to the building A grease trap
    // beside the minimart, not into the men's toilet tank or manhole T1 as the 2020 layout draws (Brian, 27 Nov 2026, from site)
    pipe('sewer', [[90.95, 87.75, r2(tIn + 0.08)], [96.70, 87.05], [97.55, 40.00], [97.25, 33.75, 0.27]], 0.05, 'sewerRaw', { en: 'Building B grease trap to the building A grease trap', th: 'ท่อจากถังดักไขมันอาคาร B ไปถังดักไขมันอาคาร A', kind: 'pipe',
      info: (m) => lines([`Waste pipe from the coffee shop's grease trap (building B), east to the boundary, then south along the east boundary to the line of building A just before its grease trap DGLFN-2.0Q beside the minimart; from there into the grease trap and on to the south-east pit. About ${m} m.`,
          'From Brian (27 Nov 2026): this is how it runs on site. The 2020 layout instead draws it into the men\'s toilet tank, with a second line to manhole T1; neither exists. Size and levels are assumed (shown 4").'],
        [`ท่อน้ำทิ้งจากถังดักไขมันของร้านกาแฟ (อาคาร B) ไปทางตะวันออกถึงแนวเขต แล้วลงใต้เลียบแนวเขตด้านตะวันออก ไปต่อแนวท่อของอาคาร A ก่อนถังดักไขมัน DGLFN-2.0Q ข้างมินิมาร์ท จากนั้นเข้าถังดักไขมันและไปบ่อมุมตะวันออกเฉียงใต้ ยาวประมาณ ${m} ม.`,
          'จาก Brian (27 พ.ย. 2026): หน้างานเดินท่อแบบนี้ ผังปี 2020 เขียนท่อเข้าถังบำบัดห้องน้ำชาย และมีอีกแนวไปบ่อพัก T1 ซึ่งไม่มีจริงทั้งสองแนว ขนาดและระดับเป็นค่าสมมติ (แสดง 4 นิ้ว)'], P) });
    pipe('sewer', [[88.55, 75.30, r2(tIn + 0.05)], [88.90, 71.90], [87.08, 71.75, tIn]], 0.05, 'sewerRaw', { en: 'Women\'s toilets to their BO-6000 tank', th: 'ท่อจากห้องน้ำหญิงเข้าถัง BO-6000', kind: 'pipe',
      info: (m) => lines([`Wastewater pipe out of the south-east corner of the women's toilets, then west into the east side of the tank. About ${m} m. Drawn as 4" PVC (tank inlet size on A-17). The layout marks an inspection point where it turns.`,
        `Enters the tank about ${lv(inC)} (0.425 m below ground, A-17). The level at the toilet end is assumed (fall 1:100).`],
      [`ท่อน้ำเสียออกจากมุมตะวันออกเฉียงใต้ของห้องน้ำหญิง แล้วไปทางตะวันตกเข้าด้านตะวันออกของถัง ยาวประมาณ ${m} ม. แสดงเป็นท่อ PVC 4 นิ้ว (ขนาดท่อเข้าถังตาม A-17) ผังมีสัญลักษณ์จุดตรวจที่จุดหักเลี้ยว`,
        `เข้าถังที่ประมาณ ${lv(inC)} (ต่ำกว่าพื้น 0.425 ม. ตาม A-17) ระดับที่ปลายด้านห้องน้ำเป็นค่าสมมติ (ลาด 1:100)`], P) });
    for (const t of TANKS) {
      const [mx, my] = MH[t.mh], d = Math.hypot(mx - t.outAt[0], my - t.outAt[1]), k = (d - 0.4) / d;
      pipe('sewer', [[...t.outAt, tOut], [t.outAt[0] + (mx - t.outAt[0]) * k, t.outAt[1] + (my - t.outAt[1]) * k, r2(tOut - 0.02)]], 0.05, 'sewerTreated', { en: `Treated water from the ${t.en} tank to manhole ${t.mh}`, th: `ท่อน้ำที่บำบัดแล้วจากถัง${t.th}ไปบ่อพัก ${t.mh}`, tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว', tagAt: [t.outAt[0] + (t.id === 'men' ? -1.9 : -1.0), t.outAt[1] + (t.id === 'men' ? 0.5 : -1.7), LAWN + 0.6], kind: 'pipe',
        info: lines([`4" PVC. Leaves the tank about ${lv(outC)} (0.45 m below ground, A-17) and drops into manhole ${t.mh}, where the 0.40 m site drain starts. From there the water goes down the east side to the grease trap pit at the south-east corner and the public drain.`],
          [`ท่อ PVC 4 นิ้ว ออกจากถังที่ประมาณ ${lv(outC)} (ต่ำกว่าพื้น 0.45 ม. ตาม A-17) ลงบ่อพัก ${t.mh} ซึ่งเป็นจุดเริ่มของท่อระบายน้ำ 0.40 ม. จากนั้นน้ำไหลลงด้านตะวันออกไปบ่อดักไขมันที่มุมตะวันออกเฉียงใต้และท่อระบายน้ำสาธารณะ`], P) });
    }
    // building A: kitchen waste to the DGLFN-2.0Q grease trap, then to the east pit
    pipe('sewer', [[91.6, 56.10, 0.40], [94.72, 56.42], [97.25, 33.75], [93.93, 33.30], [93.92, 32.55], [94.02, 32.00], [94.05, 30.62, 0.25]], 0.025, 'sewerRaw', { en: 'Building A to its grease trap', th: 'ท่อจากอาคาร A เข้าถังดักไขมัน', kind: 'pipe',
      info: (m) => lines([`2" PVC waste pipe (class 8.5): out of the back of building A, south along the east boundary, round the south-east corner of the building and through a U-trap into the north end of the grease trap. About ${m} m.`, 'Levels are assumed (0.30 m below ground at the building, 0.45 m at the grease trap).'],
        [`ท่อน้ำทิ้ง PVC 2 นิ้ว (ชั้น 8.5): ออกจากด้านหลังอาคาร A ลงใต้เลียบแนวเขตด้านตะวันออก อ้อมมุมตะวันออกเฉียงใต้ของอาคาร ผ่าน U-trap เข้าปลายด้านเหนือของถังดักไขมัน ยาวประมาณ ${m} ม.`, 'ระดับเป็นค่าสมมติ (ต่ำกว่าพื้น 0.30 ม. ที่อาคาร และ 0.45 ม. ที่ถังดักไขมัน)'], P) });
    pipe('sewer', [[94.60, 25.65, 0.20], [94.80, 24.40], [94.95, 23.62], [98.10, 24.00], [98.36, 20.62, 0.10]], 0.05, 'sewerRaw', { en: 'Building A grease trap to the east pit', th: 'ท่อจากถังดักไขมันอาคาร A ไปบ่อดักไขมันด้านตะวันออก', kind: 'pipe',
      info: (m) => lines([`4" PVC waste pipe (class 8.5): out of the south end of the grease trap through a U-trap, east, then south into the grease trap pit at the road. About ${m} m.`, 'Levels are assumed.'],
        [`ท่อน้ำทิ้ง PVC 4 นิ้ว (ชั้น 8.5): ออกจากปลายด้านใต้ของถังดักไขมันผ่าน U-trap ไปทางตะวันออก แล้วลงใต้เข้าบ่อดักไขมันริมถนน ยาวประมาณ ${m} ม.`, 'ระดับเป็นค่าสมมติ'], P) });
    // behind building A: four small pits, their pipes to manhole A1, and A1 to A2
    const SMALL = [[92.22, 66.95], [93.20, 55.50], [93.80, 50.62], [94.05, 48.45]];
    SMALL.forEach(([x, y], i) => {
      add('sewer', boxGeo(0.6, 0.6, 0.6, x, y, LAWN - 0.6, 6), 'manhole', { en: `Small pit ${i + 1} behind building A`, th: `บ่อเล็ก ${i + 1} หลังอาคาร A`, kind: 'manhole',
        info: lines([`A small square, about 0.6 m, on the layout${i ? ' behind building A, with a short line to the building wall' : ' in the lawn north of building A'}. It has no label: what it is and how deep it is are not on the drawings. Shown 0.6 m deep (assumed).`],
          [`สี่เหลี่ยมเล็กประมาณ 0.6 ม. ในผัง${i ? ' หลังอาคาร A มีเส้นสั้นต่อเข้าผนังอาคาร' : ' ในสนามหญ้าด้านเหนือของอาคาร A'} ไม่มีป้ายกำกับ ในแบบไม่ได้ระบุว่าเป็นอะไรและลึกเท่าใด แสดงลึก 0.6 ม. (ค่าสมมติ)`], P) });
      add('sewer', boxGeo(0.55, 0.55, 0.03, x, y, LAWN, 6), 'cover', { en: 'Small pit cover', th: 'ฝาบ่อเล็ก', nopick: 1 });
    });
    const aNote = { en: 'The layout gives no size or level for these lines: shown as 150 mm pipe, top 0.40 m below ground at the start, falling 1:200 (assumed).', th: 'ผังไม่ได้ระบุขนาดและระดับของแนวท่อเหล่านี้ แสดงเป็นท่อ 150 มม. หลังท่อต่ำกว่าพื้น 0.40 ม. ที่ต้นทาง ลาด 1:200 (ค่าสมมติ)' };
    add('sewer', merge([
      pipeGeo([[92.22, 66.65, r2(aStart)], [92.60, 62.25, a1]], 0.075).geometry,
      pipeGeo([[91.20, 63.95, r2(a1 + 0.02)], [92.45, 64.05, r2(a1 + 0.01)]], 0.075).geometry,
      pipeGeo([[93.20, 55.80, r2(a1 + 0.03)], [92.68, 61.58, a1]], 0.075).geometry,
      pipeGeo([[93.85, 50.95, r2(a1 + 0.06)], [93.90, 51.25], [94.45, 51.20], [93.25, 62.00], [92.95, 61.97, a1]], 0.075).geometry,
      pipeGeo([[94.38, 48.50, r2(a1 + 0.08)], [95.30, 48.60], [93.85, 62.05], [92.95, 62.02, a1]], 0.075).geometry,
    ]), 'sewerRaw', { en: 'Lines from the small pits to manhole A1', th: 'แนวท่อจากบ่อเล็กไปบ่อพัก A1', kind: 'pipe',
      info: lines(['Each small pit behind building A has its own line north to manhole A1; the pit in the lawn runs south to A1 (arrows on the layout point to A1).', aNote.en],
        ['บ่อเล็กหลังอาคาร A แต่ละบ่อมีแนวท่อของตัวเองขึ้นเหนือไปบ่อพัก A1 ส่วนบ่อในสนามหญ้าเดินลงใต้ไป A1 (ลูกศรในผังชี้เข้า A1)', aNote.th], P) });
    pipe('sewer', [[92.30, 61.88, a1], [84.20, 60.99, a2]], 0.075, 'sewerRaw', { en: 'Manhole A1 to manhole A2', th: 'ท่อจากบ่อพัก A1 ไปบ่อพัก A2', kind: 'pipe',
      info: (m) => lines([`Line west along the north side of building A, about ${m} m.`, 'The layout draws nothing leaving manhole A2. It most likely crosses under the walkway to the east drain 3.5 m away, but that is not drawn: check on site.', aNote.en],
        [`แนวท่อไปทางตะวันตกเลียบด้านเหนือของอาคาร A ยาวประมาณ ${m} ม.`, 'ผังไม่ได้แสดงท่อออกจากบ่อพัก A2 น่าจะลอดใต้ทางเดินไปท่อระบายน้ำด้านตะวันออกซึ่งห่าง 3.5 ม. แต่ไม่มีในแบบ ต้องตรวจสอบหน้างาน', aNote.th], P) });
    pipe('sewer', [[91.92, 66.94, r2(tIn + 0.08)], [90.35, 66.90], [89.75, 71.85], [88.95, 71.90, tIn]], 0.05, 'sewerRaw', { en: 'Line from small pit 1 to the women\'s toilet tank inlet', th: 'แนวท่อจากบ่อเล็ก 1 ไปทางเข้าถังบำบัดห้องน้ำหญิง', kind: 'pipe',
      info: (m) => lines([`A line from small pit 1 west, then north to join the pipe into the women's toilet tank, about ${m} m; the arrow on it points north, towards the tank.`,
        'The same pit also has a line south to manhole A1, with arrows pointing south, so the layout shows water leaving this pit two ways. A short piece also carries on south and is cut off with a break mark. Size and level are not given (shown as 4" at an assumed level). Check on site.'],
      [`แนวท่อจากบ่อเล็ก 1 ไปทางตะวันตก แล้วขึ้นเหนือไปต่อเข้าท่อที่เข้าถังบำบัดห้องน้ำหญิง ยาวประมาณ ${m} ม. ลูกศรในผังชี้ขึ้นเหนือเข้าหาถัง`,
        'บ่อเดียวกันนี้มีแนวท่อลงใต้ไปบ่อพัก A1 ด้วย โดยลูกศรชี้ลงใต้ ผังจึงแสดงน้ำออกจากบ่อนี้สองทาง และมีท่อช่วงสั้นเดินต่อลงใต้แล้วตัดด้วยเครื่องหมายขาดช่วง ไม่ได้ระบุขนาดและระดับ (แสดงเป็นท่อ 4 นิ้วที่ระดับสมมติ) ต้องตรวจสอบหน้างาน'], P) });

    // ---------- site drains: manholes
    for (const [id, [x, y, g, plain]] of Object.entries(MH)) {
      const l = mhLevel[id], floor = l - 0.20, small = id[0] === 'A';
      const extra = id === 'A2' ? { en: 'The layout draws nothing leaving this manhole: check on site where it drains to.', th: 'ผังไม่ได้แสดงท่อออกจากบ่อพักนี้ ต้องตรวจสอบหน้างานว่าระบายไปที่ใด' }
        : id === 'W1' ? { en: 'High point of the rear line: the layout shows the pipe falling away from here to the west and to the east.', th: 'จุดสูงสุดของแนวท่อด้านหลัง ผังแสดงท่อลาดออกจากจุดนี้ไปทั้งทางตะวันตกและตะวันออก' }
          : id === 'T1' || id === 'T3' ? { en: `Treated water from the BO-6000 tank comes in here at about ${lv(outC)}.`, th: `น้ำที่บำบัดแล้วจากถัง BO-6000 เข้าบ่อนี้ที่ประมาณ ${lv(outC)}` }
            : id === 'B4' ? { en: 'The 0.30 m pipe ends here and the west V-gutter starts here on the layout: check on site how they join.', th: 'ในผัง ท่อ 0.30 ม. สิ้นสุดที่นี่และรางวีด้านตะวันตกเริ่มที่นี่ ต้องตรวจสอบหน้างานว่าต่อกันอย่างไร' } : null;
      add('drains', boxGeo(0.8, 0.8, g - floor, x, y, floor, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, lvl: lv(l), kind: 'manhole',
        info: lines([`Manhole 0.60 × 0.60 m ${plain ? '(drawn with a plain cover)' : 'with a steel grating cover'} (layout legend). Ground about ${lv(g)}, from the nearest level written on the layout.`,
          `Pipe level shown ${lv(l)}, about ${(g - l).toFixed(2)} m below ground. ${small ? 'The layout gives no pipe size or level here.' : 'No pipe level is written on the drawings.'} This depth is assumed from the slope, not measured.`,
          'Floor drawn 0.20 m below the pipe (manhole detail A-15, where the depth is marked "varies").', ...(extra ? [extra.en] : [])],
        [`บ่อพัก 0.60 × 0.60 ม. ${plain ? '(ในผังเป็นฝาทึบ)' : 'ฝาตะแกรงเหล็ก'} (ตามสัญลักษณ์ในผัง) ระดับพื้นประมาณ ${lv(g)} จากระดับที่เขียนไว้ใกล้ที่สุดในผัง`,
          `ระดับท่อที่แสดง ${lv(l)} ต่ำกว่าพื้นประมาณ ${(g - l).toFixed(2)} ม. ${small ? 'ผังไม่ได้ระบุขนาดและระดับท่อที่จุดนี้' : 'ในแบบไม่มีระดับท่อ'} ความลึกนี้เป็นค่าสมมติจากความลาด ไม่ใช่ค่าที่วัดจริง`,
          'ก้นบ่อแสดงต่ำกว่าท่อ 0.20 ม. (แบบขยายบ่อพัก A-15 ซึ่งระบุความลึกว่า "varies")', ...(extra ? [extra.th] : [])], P) });
      add('drains', boxGeo(0.7, 0.7, 0.03, x, y, g, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    }
    for (const [id, [x, y, g]] of Object.entries(GMH)) {
      add('drains', boxGeo(0.8, 0.8, 0.6, x, y, g - 0.6, 0), 'manhole', { en: `Manhole ${id} (on the V-gutter)`, th: `บ่อพัก ${id} (บนรางวี)`, kind: 'manhole',
        info: lines([`Manhole 0.60 × 0.60 m with a steel grating cover, on the V-gutter (layout legend). Ground about ${lv(g)}, from the nearest level written on the layout.`,
          'The layout draws no pipe into or out of it, and no depth is given: shown 0.60 m deep (assumed). Check on site whether it is joined to the drain pipe beside it.'],
        [`บ่อพัก 0.60 × 0.60 ม. ฝาตะแกรงเหล็ก อยู่บนแนวรางวี (ตามสัญลักษณ์ในผัง) ระดับพื้นประมาณ ${lv(g)} จากระดับที่เขียนไว้ใกล้ที่สุดในผัง`,
          'ผังไม่ได้แสดงท่อเข้าหรือออก และไม่มีความลึก แสดงลึก 0.60 ม. (ค่าสมมติ) ต้องตรวจสอบหน้างานว่าต่อกับท่อระบายน้ำข้างเคียงหรือไม่'], P) });
      add('drains', boxGeo(0.7, 0.7, 0.03, x, y, g, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    }

    // ---------- site drains: pipe runs
    for (const run of RUNS) {
      const a = run.pts[0][2], b = run.pts[run.pts.length - 1][2], r = run.d / 2, gset = new Set(run.gutter || []);
      const pipeParts = [], gutParts = []; let len = 0, glen = 0;
      for (let i = 0; i < run.pts.length - 1; i++) {
        const p = run.pts[i], q = run.pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (gset.has(i)) { const g0 = Math.min(ground(p[0], p[1]), ground(q[0], q[1])), bot = Math.min(p[2], q[2]); gutParts.push(boxGeo(L, 0.30, g0 + 0.02 - bot, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, bot, Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI)); glen += L; }
        else { pipeParts.push(pipeGeo([p, q], r).geometry); len += L; }
      }
      const mm = run.d.toFixed(2), endDiff = run.pit ? b - PIT.inL : 0;
      const low = endDiff < -0.15, high = endDiff > 0.15;
      const pitEn = run.pit ? [`It reaches the grease trap pit at about ${lv(b)}. The pit detail (A-16) shows one inlet, at ${lv(PIT.inL)}${low ? `: this pipe would arrive ${Math.abs(endDiff).toFixed(2)} m lower than that, so the drawn slope and the pit detail do not agree on this run. Check on site.` : high ? `: this pipe would come in ${endDiff.toFixed(2)} m above it. Check on site.` : '.'}`] : [];
      const pitTh = run.pit ? [`ถึงบ่อดักไขมันที่ประมาณ ${lv(b)} แบบขยายบ่อ (A-16) แสดงท่อเข้าจุดเดียวที่ระดับ ${lv(PIT.inL)}${low ? ` ท่อนี้จะมาถึงต่ำกว่าระดับนั้น ${Math.abs(endDiff).toFixed(2)} ม. ความลาดในผังกับแบบขยายบ่อจึงไม่ตรงกันในแนวนี้ ต้องตรวจสอบหน้างาน` : high ? ` ท่อนี้จะเข้าบ่อสูงกว่าระดับนั้น ${endDiff.toFixed(2)} ม. ต้องตรวจสอบหน้างาน` : ''}`] : [];
      const heldEn = run.held ? ['Where the ground drops faster than 1:200 the pipe is kept 0.30 m under the ground (minimum cover on detail A-16).'] : [];
      const heldTh = run.held ? ['ช่วงที่พื้นลาดลงเร็วกว่า 1:200 ให้ท่ออยู่ใต้พื้น 0.30 ม. (ระยะดินถมขั้นต่ำตามแบบ A-16)'] : [];
      add('drains', merge(pipeParts), 'drain', { en: `Site drain ${run.id}: ${run.en}`, th: `ท่อระบายน้ำ ${run.id}: ${run.th}`, kind: 'drain',
        info: lines([`Concrete pipe (RCP) ${mm} m, slope 1:200, size and flow direction as written on the layout. About ${Math.round(len)} m of pipe.`,
          `${ASSUMED.en} Shown with the pipe top ${COVER.toFixed(2)} m below ground at the start (${lv(a)}), falling 1:200 to ${lv(b)}.`, ...heldEn, ...pitEn, ...(run.extra ? [run.extra.en] : [])],
        [`ท่อคอนกรีต (RCP) ${mm} ม. ลาด 1:200 ขนาดและทิศทางการไหลตามที่เขียนในผัง ความยาวท่อประมาณ ${Math.round(len)} ม.`,
          `${ASSUMED.th} แสดงโดยให้หลังท่อต่ำกว่าพื้น ${COVER.toFixed(2)} ม. ที่ต้นทาง (${lv(a)}) แล้วลาด 1:200 ถึง ${lv(b)}`, ...heldTh, ...pitTh, ...(run.extra ? [run.extra.th] : [])], P) });
      if (gutParts.length) add('drains', merge(gutParts), 'drain', { en: `Narrow-mouth concrete gutter across the ${run.id === 'FW' ? 'entrance' : 'exit'}`, th: `รางระบายน้ำ คสล. ชนิดปากแคบ ขวาง${run.id === 'FW' ? 'ทางเข้า' : 'ทางออก'}`, kind: 'drain',
        info: lines([`Drawn on the layout as a "narrow-mouth" concrete gutter, slope 1:200, about ${Math.round(glen)} m, on the boundary line where the driveway is at +0.20.`, 'Its width and depth are not on the drawings: shown 0.30 m wide and as deep as the assumed pipe level of this run.'],
          [`ในผังเป็นรางระบายน้ำ คสล. ชนิดปากแคบ ลาด 1:200 ยาวประมาณ ${Math.round(glen)} ม. อยู่บนแนวเขตที่ดิน ตรงที่ทางรถมีระดับ +0.20`, 'ในแบบไม่มีความกว้างและความลึก แสดงกว้าง 0.30 ม. และลึกเท่าระดับท่อสมมติของแนวนี้'], P) });
    }
    // V-gutters at the surface
    for (const gt of GUTTERS) {
      const parts = []; let len = 0;
      for (let i = 0; i < gt.pts.length - 1; i++) {
        const p = gt.pts[i], q = gt.pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]), g0 = Math.min(ground(p[0], p[1]), ground(q[0], q[1]));
        parts.push(boxGeo(L, 0.25, 0.27, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, g0 - 0.25, Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI)); len += L;
      }
      add('drains', merge(parts), 'drain', { en: `Concrete V-gutter: ${gt.en}`, th: `รางระบายน้ำ คสล. (รางวี): ${gt.th}`, kind: 'drain',
        info: lines([`Surface gutter 25 cm wide (layout legend), slope 1:200, about ${Math.round(len)} m. Detail A-14 shows a U-shaped gutter with a steel grating, 0.25 m wide overall and 0.20 m deep inside.`, 'Shown at ground level, 0.25 m deep. The layout gives no levels along it; check on site which gutter section was built.'],
          [`รางระบายน้ำผิวดิน กว้าง 25 ซม. (ตามสัญลักษณ์ในผัง) ลาด 1:200 ยาวประมาณ ${Math.round(len)} ม. แบบ A-14 แสดงรางตัวยูฝาตะแกรงเหล็ก กว้างรวม 0.25 ม. ลึกภายใน 0.20 ม.`, 'แสดงที่ระดับพื้น ลึก 0.25 ม. ผังไม่มีระดับตามแนวราง ต้องตรวจสอบหน้างานว่าก่อสร้างรางแบบใด'], P) });
    }
    pipe('drains', [[72.37, 80.95, 0.35], [76.64, 76.34, 0.32]], 0.15, 'drain', { en: 'Link from manhole N6 to manhole GE1', th: 'แนวเชื่อมจากบ่อพัก N6 ไปบ่อพัก GE1', kind: 'drain',
      info: (m) => lines([`A single line on the layout joining the east end of the cross gutter to the top of the east gutter, about ${m} m. No size, slope or level is written on it: shown as a 0.30 m pipe 0.40 m below ground (assumed). Check on site.`],
        [`เส้นเดี่ยวในผังเชื่อมปลายด้านตะวันออกของรางขวางลานกับต้นรางด้านตะวันออก ยาวประมาณ ${m} ม. ไม่มีขนาด ความลาด หรือระดับ แสดงเป็นท่อ 0.30 ม. ต่ำกว่าพื้น 0.40 ม. (ค่าสมมติ) ต้องตรวจสอบหน้างาน`], P) });

    // ---------- grease trap pits at the road (detail A-16) and their outlets to the public drain
    for (const [id, p] of Object.entries(PITS)) {
      const a = (p.rot + 90) * Math.PI / 180, sx = p.x - Math.cos(a) * 1.7, sy = p.y - Math.sin(a) * 1.7;   // south end
      const feeds = { P1: 'site drain W (rear line and west side)', P2: 'the west V-gutter (through drain G2) and front drain FW', P3: 'the east V-gutter and front drain FE', P4: 'site drain E, which carries the treated water from both toilet tanks, and the 4" pipe from the building A grease trap' }[id];
      const feedsTh = { P1: 'ท่อระบายน้ำ W (แนวด้านหลังและด้านตะวันตก)', P2: 'รางวีด้านตะวันตก (ผ่านท่อ G2) และท่อด้านหน้า FW', P3: 'รางวีด้านตะวันออกและท่อด้านหน้า FE', P4: 'ท่อระบายน้ำ E ซึ่งรับน้ำที่บำบัดแล้วจากถังบำบัดห้องน้ำทั้งสองถัง และท่อ 4 นิ้วจากถังดักไขมันอาคาร A' }[id];
      add('drains', boxGeo(1.0, 3.4, PIT.top - PIT.under, p.x, p.y, PIT.under, p.rot), 'oilTrap', { en: `Grease trap pit (3 chambers) · ${p.where}`, th: `บ่อดักไขมัน คสล. 3 ตอน · ${p.whereTh}`, tag: p.tag, tagTh: p.tagTh, lvl: `${lv(PIT.inL)} / ${lv(PIT.outL)}`, kind: 'manhole',
        info: lines([`Concrete grease trap pit with steel grating covers, the last stop before the public drain. Takes ${feeds}.`,
          'Size from detail A-16: 3.40 × 1.00 m outside, three chambers, on six-sided piles 150 mm across.',
          `Levels from detail A-16: cover ${lv(PIT.top)}, water in ${lv(PIT.inL)}, pipe out ${lv(PIT.outL)}, floor ${lv(PIT.floor)}, underside ${lv(PIT.under)}. A-16 shows one pit; the layout has four, and these levels are not confirmed for each one.`,
          `A-16 writes the top of the inlet pipe as "+0.107" but draws it below ±0.00; with the water-in level 0.40 m lower at ${lv(PIT.inL)}, it reads as ${lv(PIT.inTop)}. A-16 also shows the lawn at ${lv(PIT.lawn)}; ${id === 'P4' ? 'the layout writes no lawn level at this corner (its other lawns are +0.70)' : `the layout shows ${lv(p.g)} here`}. Check on site.`],
        [`บ่อดักไขมันคอนกรีต ฝาตะแกรงเหล็ก จุดสุดท้ายก่อนลงท่อระบายน้ำสาธารณะ รับน้ำจาก${feedsTh}`,
          'ขนาดตามแบบ A-16: ภายนอก 3.40 × 1.00 ม. แบ่ง 3 ตอน วางบนเสาเข็มหกเหลี่ยม 150 มม.',
          `ระดับตามแบบ A-16: ฝาบ่อ ${lv(PIT.top)} ระดับน้ำเข้า ${lv(PIT.inL)} ท่อน้ำออก ${lv(PIT.outL)} พื้นบ่อ ${lv(PIT.floor)} ใต้บ่อ ${lv(PIT.under)} แบบ A-16 แสดงบ่อเดียว แต่ในผังมี 4 บ่อ ระดับเหล่านี้ยังไม่ได้ยืนยันทีละบ่อ`,
          `แบบ A-16 เขียนระดับหลังท่อเข้าเป็น "+0.107" แต่เขียนไว้ต่ำกว่า ±0.00 และระดับน้ำเข้าต่ำลงอีก 0.40 ม. ที่ ${lv(PIT.inL)} จึงอ่านได้เป็น ${lv(PIT.inTop)} นอกจากนี้ A-16 แสดงระดับสนามหญ้า ${lv(PIT.lawn)} ${id === 'P4' ? 'แต่ผังไม่ได้เขียนระดับสนามหญ้าที่มุมนี้ (สนามหญ้าส่วนอื่น +0.70)' : `แต่ผังแสดง ${lv(p.g)} ที่จุดนี้`} ต้องตรวจสอบหน้างาน`], P) }, V(p.x - Math.cos(a) * 2.7, p.y - Math.sin(a) * 2.7, PIT.top + 0.7));
      add('drains', boxGeo(0.9, 3.3, 0.03, p.x, p.y, PIT.top, p.rot), 'cover', { en: 'Grease trap pit grating', th: 'ฝาตะแกรงบ่อดักไขมัน', nopick: 1 });
      pipe('drains', [[sx, sy, PIT.outL], [sx + Math.cos(a) * -1.5, sy + Math.sin(a) * -1.5, PIT.outL]], 0.15, 'drain', { en: `Outlet to the public drain · ${p.where}`, th: `ท่อออกลงท่อระบายน้ำสาธารณะ · ${p.whereTh}`, kind: 'drain',
        info: lines([`0.30 m concrete pipe from the pit to the public drain in front of the station, at ${lv(PIT.outL)} (detail A-16). The layout only marks "connects to the public drain" here: the length shown is not real.`,
          `A-16 also gives the public manhole: cover ${lv(PIT.pubCover)}, water level ${lv(PIT.pubWater)}, bottom ${lv(PIT.pubFloor)}. Its position is not on the layout, so it is not in the model.`],
        [`ท่อคอนกรีต 0.30 ม. จากบ่อไปท่อระบายน้ำสาธารณะหน้าสถานี ที่ระดับ ${lv(PIT.outL)} (แบบ A-16) ผังระบุเพียง "ต่อลงทางระบายน้ำสาธารณะ" ที่จุดนี้ ความยาวที่แสดงไม่ใช่ค่าจริง`,
          `แบบ A-16 ให้ข้อมูลบ่อพักสาธารณะด้วย: ฝาบ่อ ${lv(PIT.pubCover)} ระดับน้ำ ${lv(PIT.pubWater)} ก้นบ่อ ${lv(PIT.pubFloor)} ผังไม่ได้แสดงตำแหน่ง จึงไม่มีในโมเดล`], P) });
    }

    // ---------- buildings (context). The layout shows no canopy outline, pump islands or fuel tanks, so none are in the model.
    const building = (poly, floor, h, o) => add('buildings', prismGeo(poly, floor, h), 'building', { ...o, kind: 'building', info: lines(o.lines || [], o.linesTh || [], C) }, V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, floor + h + 0.7));
    // ---------- KFC drive-through (built after the 2020 station layout, on what A-07 shows as lawn): Biotech system from KFC's
    // M&E design SN-01 / SN-02 (THE QSR OF ASIA, EEE Engineering, 12 Feb 2020; Brian's email "M&E KFC GSDT Caltex Ramindra").
    // SN-01 was placed on this model by its drain manholes: W7, W9 to W13 on SN-01 land within about 0.1 m of the model's
    // manholes at one scale, so positions are from the drawing. Depths and levels are not written: assumed as said below.
    // Copies of the sheets: Sites\1622 Ram Intra\03 Drawings\CAD\KFC 2020 (from email)\.
    {
      const KFC = { en: 'From KFC\'s M&E design sheets SN-01 / SN-02 (Feb 2020), placed on this model by the station drain manholes drawn on SN-01. Design drawings, not as-built: check on site.', th: 'จากแบบงานระบบของ KFC แผ่น SN-01 / SN-02 (ก.พ. 2020) วางลงโมเดลนี้โดยเทียบกับบ่อพักท่อระบายน้ำของสถานีที่เขียนใน SN-01 เป็นแบบออกแบบ ไม่ใช่แบบก่อสร้างจริง ต้องตรวจสอบหน้างาน' };
      // treatment tank Biotech BC-K-15-D2.5: lying, Ø2.50 m, 7.40 m long, four Ø0.60 m lids, on a 3.10 x 7.40 m pile cap
      const tx = 33.09, ty = 59.36, tLen = 7.4, tr = 1.25, g0 = r2(ground(tx, ty)), top = r2(g0 - 0.2), axis = top - tr, tIn = r2(top - 0.4), tOut = r2(tIn - 0.1);
      add('tanks', capsuleGeo(tr, tLen, tx, ty, axis, 0, 0.3), 'tank', { en: 'KFC treatment tank · Biotech BC-K-15-D2.5', th: 'ถังบำบัดน้ำเสีย KFC · Biotech BC-K-15-D2.5', tag: 'KFC BC-K-15', tagTh: 'KFC BC-K-15', kind: 'tank',
        info: lines(['KFC\'s wastewater treatment tank (Biotech BC-K-15-D2.5, flow 15 m³/day): lying, Ø2.50 m, 7.40 m long, four Ø0.60 m lids, aerated by the SCB-50 air blower in the KFC pump room. Solid separation, anaerobic filter, aerobic filter and settling chambers inside.',
          'Takes the toilets (through the round BS-3000 tank) and the kitchen (through the two grease traps). Treated water out of the east end in 6" PVC to a small sump (KFC-1), then north into the station\'s west drain at the corner manhole W9 (as on site, Brian, Nov 2026; SN-01 draws it south to W10).',
          `Ground about ${lv(g0)} · top of tank about ${lv(top)} · pipe in about ${lv(tIn)}, out about ${lv(tOut)} (assumed; SN-02 gives a hole about 2.7 m deep).`,
          'On a reinforced concrete pile cap (DB12 @ 0.25 m, 2 layers) 3.10 × 7.40 m on 32 piles, the tank strapped down with wire rope; piles not drawn.',
          'Aqua, 19–21 Nov 2026: KFC aeration weak, with fats, oils and grease in the sump.', KFC.en],
        ['ถังบำบัดน้ำเสียของ KFC (Biotech BC-K-15-D2.5 อัตรา 15 ลบ.ม./วัน) แบบนอน Ø2.50 ม. ยาว 7.40 ม. ฝา Ø0.60 ม. 4 ฝา เติมอากาศด้วยเครื่องเป่าลม SCB-50 ในห้องปั๊มของ KFC ภายในมีห้องแยกตะกอน กรองไร้อากาศ กรองใช้อากาศ และตกตะกอน',
          'รับน้ำจากห้องน้ำ (ผ่านถังกลม BS-3000) และจากครัว (ผ่านถังดักไขมัน 2 ถัง) น้ำที่บำบัดแล้วออกปลายด้านตะวันออกด้วยท่อ PVC 6 นิ้วไปบ่อพัก แล้วไปทางเหนือเข้าบ่อพักมุม W9 ของท่อระบายน้ำด้านตะวันตกของสถานี (ตามหน้างานจริง Brian พ.ย. 2026 แบบ SN-01 เขียนลงใต้ไป W10)',
          `ระดับพื้นประมาณ ${lv(g0)} · หลังถังประมาณ ${lv(top)} · ท่อเข้าประมาณ ${lv(tIn)} ท่อออกประมาณ ${lv(tOut)} (ค่าสมมติ แบบ SN-02 ระบุหลุมลึกประมาณ 2.7 ม.)`,
          'วางบนฐานคอนกรีตเสริมเหล็กบนเสาเข็ม (DB12 @ 0.25 ม. 2 ชั้น) ขนาด 3.10 × 7.40 ม. เสาเข็ม 32 ต้น ยึดถังด้วยลวดสลิง ไม่ได้แสดงเสาเข็ม',
          'Aqua 19–21 พ.ย. 2026: การเติมอากาศของ KFC อ่อน มีไขมันและน้ำมันในบ่อพัก', KFC.th], P) }, V(tx, ty, g0 + 0.8));
      for (const lx of [30.14, 32.14, 34.65, 36.0]) {
        add('tanks', cylGeo(0.3, g0 - top, lx, ty, top), 'tank', { en: 'KFC tank lid', th: 'ฝาถัง KFC', nopick: 1 });
        add('tanks', cylGeo(0.33, 0.03, lx, ty, g0), 'cover', { en: 'KFC tank lid', th: 'ฝาถัง KFC', nopick: 1 });
      }
      add('base', boxGeo(7.4, 3.1, 0.2, tx, ty, axis - tr - 0.2, 0), 'slab', { en: 'KFC treatment tank pile cap', th: 'ฐานถังบำบัด KFC', kind: 'base',
        info: lines(['Reinforced concrete 3.10 × 7.40 m, DB12 @ 0.25 m two layers, on lean concrete and compacted sand, on 32 piles (8 × 4); level assumed.', KFC.en], ['คอนกรีตเสริมเหล็ก 3.10 × 7.40 ม. DB12 @ 0.25 ม. 2 ชั้น บนคอนกรีตหยาบและทรายบดอัด บนเสาเข็ม 32 ต้น (8 × 4) ระดับเป็นค่าสมมติ', KFC.th], P) });
      // two grease traps Biotech BG-R-3000-1-M4 (2.15 x 1.45 m, about 1.35 m deep), south of the tank
      [[30.45, 'KFC grease trap 1', 'ถังดักไขมัน KFC 1'], [33.12, 'KFC grease trap 2', 'ถังดักไขมัน KFC 2']].forEach(([x, en, th], i) => {
        const gy = 56.92, gg = ground(x, gy);
        add('tanks', boxGeo(2.15, 1.45, 1.35, x, gy, gg - 1.35, 0), 'grease', { en: `${en} · Biotech BG-R-3000`, th: `${th} · Biotech BG-R-3000`, ...(i === 0 ? { tag: 'KFC grease traps', tagTh: 'ถังดักไขมัน KFC' } : {}), kind: 'tank',
          info: lines(['Kitchen grease trap, Biotech BG-R-3000-1-M4 (3 m³/day), 2.15 × 1.45 m, about 1.35 m deep, two 0.50 × 0.50 m covers. Kitchen 4" pipe in at the east end of trap 2; trap 1 out to the treatment tank.', KFC.en],
            ['ถังดักไขมันของครัว Biotech BG-R-3000-1-M4 (3 ลบ.ม./วัน) 2.15 × 1.45 ม. ลึกประมาณ 1.35 ม. ฝา 0.50 × 0.50 ม. 2 ฝา ท่อครัว 4 นิ้วเข้าปลายด้านตะวันออกของถังที่ 2 ถังที่ 1 ออกไปถังบำบัด', KFC.th], P) }, i === 0 ? V(31.8, gy - 1.2, gg + 0.8) : null);
        for (const dx of [-0.5, 0.5]) add('tanks', boxGeo(0.5, 0.5, 0.03, x + dx, gy, gg, 0), 'cover', { en: 'Grease trap cover', th: 'ฝาถังดักไขมัน', nopick: 1 });
      });
      add('base', boxGeo(4.8, 1.45, 0.2, 31.79, 56.92, ground(31.79, 56.92) - 1.55, 0), 'slab', { en: 'KFC grease trap base', th: 'ฐานถังดักไขมัน KFC', kind: 'base', info: lines(['Reinforced concrete base 4.80 × 1.45 m, at least 0.20 m thick, on piles (SN-02); level assumed.', KFC.en], ['ฐานคอนกรีตเสริมเหล็ก 4.80 × 1.45 ม. หนาไม่น้อยกว่า 0.20 ม. บนเสาเข็ม (SN-02) ระดับเป็นค่าสมมติ', KFC.th], P) });
      // round solid-separation tank Biotech BS-3000 (Ø1.635 m, 2.17 m high) taking the toilets, west of the KFC building
      { const bx = 23.94, by = 36.58, bg = ground(bx, by);
        add('tanks', cylGeo(0.82, 2.17, bx, by, bg - 0.15 - 2.17), 'tank', { en: 'KFC solid separation tank · Biotech BS-3000', th: 'ถังบำบัดแบบแยกกากตะกอน KFC · Biotech BS-3000', tag: 'KFC BS-3000', tagTh: 'KFC BS-3000', kind: 'tank',
          info: lines(['Round solid-separation tank for the KFC toilets, Biotech BS-3000 (3 m³/day), Ø1.635 m, 2.17 m high, on a 2.20 × 2.20 m base. 6" soil pipe in from the toilets; out north in 6" PVC to the treatment tank.', KFC.en],
            ['ถังบำบัดแบบแยกกากตะกอนสำหรับห้องน้ำ KFC Biotech BS-3000 (3 ลบ.ม./วัน) Ø1.635 ม. สูง 2.17 ม. บนฐาน 2.20 × 2.20 ม. ท่อโสโครก 6 นิ้วจากห้องน้ำเข้า ออกไปทางเหนือด้วยท่อ PVC 6 นิ้วไปถังบำบัด', KFC.th], P) }, V(bx, by, bg + 0.8));
        add('tanks', cylGeo(0.3, 0.03, bx, by, bg), 'cover', { en: 'BS-3000 lid', th: 'ฝาถัง BS-3000', nopick: 1 }); }
      // under-sink kitchen grease trap (installation detail on SN-01: about 0.80 x 1.20 m pit)
      { const kx = 28.24, ky = 50.68, kg = ground(kx, ky);
        add('tanks', boxGeo(1.2, 0.8, 1.0, kx, ky, kg - 1.0, 0), 'grease', { en: 'KFC kitchen grease trap (in the building)', th: 'ถังดักไขมันในครัว KFC', kind: 'tank',
          info: lines(['Small grease trap by the kitchen, in a pit about 0.80 × 1.20 m (installation detail on SN-01). Kitchen 4" pipe out east, then north to the grease traps.', KFC.en], ['ถังดักไขมันขนาดเล็กข้างครัว ในบ่อประมาณ 0.80 × 1.20 ม. (แบบติดตั้งใน SN-01) ท่อครัว 4 นิ้วออกทางตะวันออกแล้วขึ้นเหนือไปถังดักไขมัน', KFC.th], P) }); }
      // pipes (levels assumed, falling about 1:100 to the tank inlet)
      pipe('sewer', [[26.0, 33.4, tIn + 0.45], [24.0, 34.6], [23.94, 35.75, tIn + 0.4]], 0.075, 'sewerRaw', { en: 'KFC toilets to the BS-3000 tank', th: 'ท่อจากห้องน้ำ KFC เข้าถัง BS-3000', kind: 'pipe',
        info: (m) => lines([`6" soil pipe from the KFC toilets to the BS-3000 tank. About ${m} m.`, ASSUMED.en, KFC.en], [`ท่อโสโครก 6 นิ้วจากห้องน้ำ KFC เข้าถัง BS-3000 ยาวประมาณ ${m} ม.`, ASSUMED.th, KFC.th], P) });
      pipe('sewer', [[23.9, 37.4, tIn + 0.25], [23.9, 54.0], [27.6, 57.9], [28.3, 59.0], [29.45, 59.36, tIn]], 0.075, 'sewerRaw', { en: 'BS-3000 tank to the KFC treatment tank', th: 'ท่อจากถัง BS-3000 ไปถังบำบัด KFC', kind: 'pipe',
        info: (m) => lines([`6" PVC (13.5) along the west side of the KFC building to the treatment tank inlet, slope 1:200 on SN-01. About ${m} m.`, ASSUMED.en, KFC.en], [`ท่อ PVC 6 นิ้ว (13.5) ตามด้านตะวันตกของอาคาร KFC ไปท่อเข้าถังบำบัด ลาด 1:200 ตาม SN-01 ยาวประมาณ ${m} ม.`, ASSUMED.th, KFC.th], P) });
      pipe('sewer', [[28.9, 50.68, tIn + 0.2], [35.29, 50.68], [35.29, 56.92], [34.25, 56.92, tIn + 0.12]], 0.05, 'sewerRaw', { en: 'KFC kitchen to the grease traps', th: 'ท่อจากครัว KFC ไปถังดักไขมัน', kind: 'pipe',
        info: (m) => lines([`4" pipe from the kitchen grease trap east, then north to grease trap 2, slope 1:200 on SN-01. About ${m} m.`, ASSUMED.en, KFC.en], [`ท่อ 4 นิ้วจากถังดักไขมันในครัวไปทางตะวันออกแล้วขึ้นเหนือไปถังดักไขมันใบที่ 2 ลาด 1:200 ตาม SN-01 ยาวประมาณ ${m} ม.`, ASSUMED.th, KFC.th], P) });
      pipe('sewer', [[29.35, 56.92, tIn + 0.05], [28.17, 56.92], [28.17, 59.1], [29.45, 59.2, tIn]], 0.05, 'sewerRaw', { en: 'KFC grease traps to the treatment tank', th: 'ท่อจากถังดักไขมัน KFC ไปถังบำบัด', kind: 'pipe',
        info: (m) => lines([`4" transfer pipe from grease trap 1 to the treatment tank inlet. About ${m} m.`, ASSUMED.en, KFC.en], [`ท่อ 4 นิ้วจากถังดักไขมันใบที่ 1 ไปท่อเข้าถังบำบัด ยาวประมาณ ${m} ม.`, ASSUMED.th, KFC.th], P) });
      const kmh = r2(tOut - 0.02);
      pipe('sewer', [[36.8, 59.36, tOut], [38.68, 59.36, kmh]], 0.075, 'sewerTreated', { en: 'KFC treatment tank outlet', th: 'ท่อออกจากถังบำบัด KFC', kind: 'pipe',
        info: lines(['6" PVC (13.5) from the east end of the tank to the KFC outlet manhole, slope 1:200.', ASSUMED.en, KFC.en], ['ท่อ PVC 6 นิ้ว (13.5) จากปลายถังด้านตะวันออกไปบ่อพักท่อออกของ KFC ลาด 1:200', ASSUMED.th, KFC.th], P) });
      pipe('drains', [[38.68, 59.36, kmh], [39.70, 62.34, r2(kmh - 0.02)]], 0.15, 'drain', { en: 'KFC sump KFC-1 to W9', th: 'ท่อจากบ่อพัก KFC-1 ไป W9', kind: 'drain',
        info: (m) => lines([`Pipe from the small KFC sump north into the corner manhole W9 of the station\'s west drain, as on site (Brian, from the Nov 2026 sampling video). SN-01 draws a 0.30 m concrete pipe south to W10 instead. Pipe size not known (drawn 0.30 m); shown entering W9 above the drain pipe there. About ${m} m.`, ASSUMED.en, KFC.en], [`ท่อจากบ่อพักเล็กของ KFC ไปทางเหนือเข้าบ่อพักมุม W9 ของท่อระบายน้ำด้านตะวันตกของสถานี ตามหน้างานจริง (Brian จากวิดีโอเก็บตัวอย่าง พ.ย. 2026) แบบ SN-01 เขียนท่อคอนกรีต 0.30 ม. ลงใต้ไป W10 แต่หน้างานจริงไป W9 ไม่ทราบขนาดท่อ (แสดง 0.30 ม.) แสดงเข้า W9 สูงกว่าท่อระบายน้ำเดิม ยาวประมาณ ${m} ม.`, ASSUMED.th, KFC.th], P) });
      { const mg = ground(38.68, 59.36);
        add('drains', boxGeo(0.6, 0.6, mg - (kmh - 0.15), 38.68, 59.36, kmh - 0.15, 0), 'manhole', { en: 'Sump KFC-1 (KFC outlet)', th: 'บ่อพัก KFC-1 (ท่อออก KFC)', lvl: lv(kmh), kind: 'manhole',
          info: lines([`Small sump with a square lid on the KFC tank outlet (sump 1 in Brian\'s video): tank → KFC-1 → W9. Drawn on SN-01. Pipe level about ${lv(kmh)} (assumed). Ground about ${lv(mg)}.`, KFC.en], [`บ่อพักเล็กฝาสี่เหลี่ยมที่ท่อออกถัง KFC (บ่อที่ 1 ในวิดีโอของ Brian): ถัง → KFC-1 → W9 ตาม SN-01 ระดับท่อประมาณ ${lv(kmh)} (ค่าสมมติ) ระดับพื้นประมาณ ${lv(mg)}`, KFC.th], P) });
        add('drains', boxGeo(0.7, 0.7, 0.03, 38.68, 59.36, mg, 0), 'cover', { en: 'Manhole cover', th: 'ฝาบ่อพัก', nopick: 1 }); }
      // KFC pump room: SCB-50 air blower (0.96 m³/min) and two round water tanks (size from the plan)
      { const pg = ground(23.4, 60.0);
        add('air', boxGeo(0.6, 0.5, 0.6, 22.24, 61.26, pg, 0), 'airPump', { en: 'KFC air blower SCB-50', th: 'เครื่องเป่าลม KFC SCB-50', kind: 'tank',
          info: lines(['Air blower for the KFC treatment tank, capacity 0.96 m³/min (SN-01), in the KFC pump room. 2" air pipe to the tank.', KFC.en], ['เครื่องเป่าลมของถังบำบัด KFC อัตรา 0.96 ลบ.ม./นาที (SN-01) ในห้องปั๊มของ KFC ท่อลม 2 นิ้วไปถัง', KFC.th], P) });
        add('air', pipeGeo([[22.6, 61.0, pg + 0.3], [29.0, 60.9, top + 0.1], [33.0, 60.9, top + 0.1], [33.0, 60.3, top]], 0.03).geometry, 'airLine', { en: 'KFC air pipe', th: 'ท่อลม KFC', kind: 'pipe', info: lines(['2" air pipe from the blower to the tank; route assumed.', KFC.en], ['ท่อลม 2 นิ้วจากเครื่องเป่าลมไปถัง แนวท่อเป็นค่าสมมติ', KFC.th], P) });
        for (const wx of [23.36, 25.12]) add('water', cylGeo(0.95, 1.8, wx, 59.56, pg), 'waterTank', { en: 'KFC water tank (pump room)', th: 'ถังน้ำ KFC (ห้องปั๊ม)', kind: 'tank',
          info: lines(['One of two round water tanks drawn in the KFC pump room (SN-01), shown above ground, about 1.9 m across; height assumed. Not wastewater.', KFC.en], ['ถังน้ำทรงกลม 1 ใน 2 ใบในห้องปั๊มของ KFC (SN-01) แสดงวางบนพื้น กว้างประมาณ 1.9 ม. ความสูงเป็นค่าสมมติ ไม่ใช่ระบบน้ำเสีย', KFC.th], P) }); }
      building([[27.5, 50.1], [37.6, 50.1], [37.6, 33.3], [27.5, 33.3]], 0.85, 4.0, { en: 'KFC drive-through restaurant', th: 'ร้าน KFC (ไดรฟ์ทรู)', tag: 'KFC', tagTh: 'KFC',
        lines: ['Outline traced from SN-01 (KFC M&E design, Feb 2020); floor level and height assumed. Built after the 2020 station layout, which shows a lawn here.'], linesTh: ['แนวอาคารจาก SN-01 (แบบงานระบบ KFC ก.พ. 2020) ระดับพื้นและความสูงเป็นค่าสมมติ สร้างหลังผังสถานีปี 2020 ซึ่งแสดงเป็นสนามหญ้า'] });
    }

    building([[83.1, 96.5], [88.7, 89.6], [85.3, 85.4], [83.4, 87.3], [82.1, 85.6], [77.3, 89.6]], 1.00, 4.0, { en: 'Commercial building B', th: 'อาคารพาณิชย์ B', tag: 'Commercial building B', tagTh: 'อาคารพาณิชย์ B', lines: ['Floor level +1.00 (layout).'], linesTh: ['ระดับพื้น +1.00 (ตามผัง)'] });
    building([[81.45, 81.0], [88.35, 81.75], [89.2, 73.75], [82.4, 72.9]], 0.85, 3.2, { en: 'Toilets (men\'s to the north, women\'s to the south)', th: 'ห้องน้ำ (ห้องน้ำชายด้านเหนือ ห้องน้ำหญิงด้านใต้)', tag: 'Toilets', tagTh: 'ห้องน้ำ', lines: ['Floor level +0.85 (layout).'], linesTh: ['ระดับพื้น +0.85 (ตามผัง)'] });
    building([[83.9, 59.3], [92.0, 60.2], [94.8, 34.0], [86.6, 33.1]], 0.90, 4.5, { en: 'Commercial building A', th: 'อาคารพาณิชย์ A', tag: 'Commercial building A', tagTh: 'อาคารพาณิชย์ A', lines: ['The layout writes no floor level for it; shown at +0.90, the level of the walkway in front.'], linesTh: ['ผังไม่ได้เขียนระดับพื้นของอาคารนี้ แสดงที่ +0.90 ซึ่งเป็นระดับทางเดินด้านหน้า'] });
  },
};
