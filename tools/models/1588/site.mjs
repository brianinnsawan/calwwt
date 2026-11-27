// 1588 Samut Sakhon (Porto Go; the drawings call it "Caltex Tha Chin"): what the 3D model shows.
// Built by tools/models/build.mjs into public/sites/models/1588.glb.
//
// Sources (PDF sheets in portal-proposal/public/sites/layouts/1588/, read with tools/models/pdf/pdf-lines.py at 1:250):
//   A  1588-LAY-SN-101-drainage-layout.pdf = LAY-SN-101 "site drainage layout", status AS BUILT, rev 1(SPP) 13/09/2019.
//      Site drains, sumps, pipe sizes, the 1:200 slope marks, buildings, canopy, fuel tank outlines. Its background also shows,
//      WITHOUT any label: a lying tank with three covers in front of building A, and two round outlines plus a square pit
//      east of building B. Its scale box says "NO"; the boundary measures 94.056 m against the written 94056, so it is 1:250.
//   B  1588-SN-103-wastewater-layout.pdf = SN-103 "wastewater collection layout", FOR SUBMISSION 29/03/2019 (Contour / U Plus).
//      A DESIGN drawing, not an as-built: treatment tanks 7.50, 6.00, 4.00 and 1.00 m3, grease trap 6.00 m3, pipe routes.
//   C  1588-SN-101-drainage-layout.pdf = SN-101 design drainage layout (same submission set). Used only for the direction of
//      flow (its slope arrows); the as-built sheet A replaces everything else on it.
// NO LEVELS are written on any of the three sheets. Every depth in this file is an assumption and is marked as one.
// Sheets A and B do not agree on the wastewater tanks; both are shown and flagged: the named tanks of design sheet B in
// layer "tanks", the unnamed outlines of as-built sheet A in this site's own layer "asbuilt".
//
// Positions are sheet A's x, y in metres (x right, y up the sheet, origin bottom-left of the page at 1:250).
// Sheet B was moved by (-1.997, -4.098) m so its site boundary sits on sheet A's (checked on three corners).
// Notes end with the shared source line from ../style.mjs: 'part' = position from a drawing, size or depth assumed;
// 'context' = above-ground context only. Nothing here is 'drawn': no object has both its position AND its level on a drawing.
// The line before it says WHICH sheet (FROM_AB / FROM_DES below), because the two sheets are not equally reliable.
const P = 'part', C = 'context';
const FROM_AB = { en: 'From the as-built drainage sheet LAY-SN-101 (2019).', th: 'จากแบบก่อสร้างจริง LAY-SN-101 (ปี 2019)' };
const FROM_DES = { en: 'From SN-103, a 2019 design drawing issued for submission, not an as-built. The position is as designed and must be confirmed on site.', th: 'จากแบบ SN-103 ซึ่งเป็นแบบออกแบบปี 2019 สำหรับยื่นขออนุญาต ไม่ใช่แบบก่อสร้างจริง ตำแหน่งเป็นไปตามแบบออกแบบ ต้องยืนยันหน้างาน' };

// ---- assumptions (nothing below is from a drawing)
const COVER = 0.5;          // soil over the top of every tank
const PIPE_R = 0.075;       // wastewater pipes shown as 150 mm
const PIPE_START = -(COVER + 2 * PIPE_R);   // underside of a wastewater pipe at its start: 0.5 m of cover over a 150 mm pipe
const PIPE_FALL = 1 / 100;
const DRAIN_START = -0.5;   // underside of a site drain at the top end of its line
const DRAIN_FALL = 1 / 200; // this one IS written on the as-built sheet ("1:200")

// ---- tanks as designed on SN-103 (centre and circle size read off the sheet; height = volume / circle area)
const DESIGN = [
  { id: 'T75', vol: 7.5, x: 42.66, y: 37.94, r: 1.165, where: { en: 'west end of building A', th: 'ปลายด้านตะวันตกของอาคาร A' }, serves: { en: 'Takes the wastewater from the west toilets of building A.', th: 'รับน้ำเสียจากห้องน้ำฝั่งตะวันตกของอาคาร A' },
    inPts: [[46.73, 41.37], [43.27, 41.37], [42.66, 40.76], [42.66, 39.10]], outPts: [[42.66, 36.78], [42.66, 34.93], [42.05, 34.32], [38.58, 34.33]],
    box: [[42.30, 37.74], [41.09, 37.74], [41.07, 36.80]],
    asBuilt: { en: 'The as-built drainage sheet shows no tank at this spot; it shows one lying tank in front of building A instead.', th: 'แบบก่อสร้างจริงไม่แสดงถังที่ตำแหน่งนี้ แต่แสดงถังแบบนอน 1 ใบหน้าอาคาร A แทน' },
    outNote: { en: 'On the sheet the line ends at a round symbol about 1.7 m outside the south boundary. The sheet does not say what it joins; on the as-built sheet the buried site drain runs along this boundary.', th: 'ในแบบ เส้นท่อไปสิ้นสุดที่สัญลักษณ์วงกลมนอกแนวเขตด้านใต้ประมาณ 1.7 ม. แบบไม่ได้ระบุว่าต่อกับอะไร ในแบบก่อสร้างจริงมีท่อระบายน้ำฝังใต้ดินเดินตามแนวเขตนี้' } },
  { id: 'T60', vol: 6.0, x: 63.79, y: 38.14, r: 1.03, where: { en: 'between buildings A and B', th: 'ระหว่างอาคาร A กับอาคาร B' }, serves: { en: 'Takes the wastewater from the east toilets of building A.', th: 'รับน้ำเสียจากห้องน้ำฝั่งตะวันออกของอาคาร A' },
    inPts: [[59.72, 41.47], [63.19, 41.47], [63.79, 40.87], [63.79, 39.17]], outPts: [[63.79, 37.11], [63.79, 33.76], [63.19, 33.16], [59.71, 33.16]],
    box: [[64.03, 37.93], [65.13, 37.93], [65.13, 37.00]],
    asBuilt: { en: 'The as-built drainage sheet shows no tank at this spot; it shows one lying tank in front of building A instead.', th: 'แบบก่อสร้างจริงไม่แสดงถังที่ตำแหน่งนี้ แต่แสดงถังแบบนอน 1 ใบหน้าอาคาร A แทน' },
    outNote: { en: 'On the sheet the line ends at a round symbol about 3 m outside the south boundary. The sheet does not say what it joins; on the as-built sheet the buried site drain runs along this boundary.', th: 'ในแบบ เส้นท่อไปสิ้นสุดที่สัญลักษณ์วงกลมนอกแนวเขตด้านใต้ประมาณ 3 ม. แบบไม่ได้ระบุว่าต่อกับอะไร ในแบบก่อสร้างจริงมีท่อระบายน้ำฝังใต้ดินเดินตามแนวเขตนี้' } },
  { id: 'T40', vol: 4.0, x: 76.33, y: 39.37, r: 0.935, where: { en: 'east of building B', th: 'ด้านตะวันออกของอาคาร B' }, serves: { en: 'Takes the water that has passed the grease trap of building B.', th: 'รับน้ำที่ผ่านถังดักไขมันของอาคาร B' },
    inPts: null, outPts: [[77.27, 39.36], [80.52, 39.36]],
    box: [[76.52, 39.61], [76.52, 40.52], [77.42, 40.53]],
    asBuilt: { en: 'The as-built drainage sheet shows two round outlines and a square pit 1 to 2.5 m east of here. This tank was probably built as one of them. Confirm on site.', th: 'แบบก่อสร้างจริงแสดงแนววงกลม 2 วงและบ่อสี่เหลี่ยม ห่างไปทางตะวันออก 1 ถึง 2.5 ม. ถังนี้น่าจะสร้างจริงเป็นหนึ่งในนั้น ต้องยืนยันหน้างาน' },
    outNote: { en: 'On the sheet the line ends at a round symbol in the planting strip. The sheet does not say what it joins.', th: 'ในแบบ เส้นท่อไปสิ้นสุดที่สัญลักษณ์วงกลมในแถบจัดสวน แบบไม่ได้ระบุว่าต่อกับอะไร' } },
  { id: 'T10', vol: 1.0, x: 98.97, y: 40.12, r: 0.61, where: { en: 'garbage room', th: 'ห้องพักขยะ' }, serves: { en: 'Takes the wash water from the garbage room.', th: 'รับน้ำล้างจากห้องพักขยะ' },
    inPts: [[95.94, 40.12], [98.36, 40.12]], outPts: [[99.58, 40.12], [101.19, 40.12], [101.89, 39.42], [101.88, 37.93]],
    box: [[99.06, 40.38], [99.06, 40.88], [99.78, 40.89]],
    asBuilt: { en: 'The garbage room of the design is not on the as-built sheet. That sheet shows a smaller room just east of this spot and no tank. Confirm on site whether this tank exists.', th: 'ห้องพักขยะตามแบบออกแบบไม่มีในแบบก่อสร้างจริง แบบก่อสร้างจริงแสดงห้องขนาดเล็กกว่าอยู่ถัดไปทางตะวันออก และไม่มีถัง ต้องยืนยันหน้างานว่ามีถังนี้หรือไม่' },
    outNote: { en: 'As designed the pipe runs through the spot where the as-built sheet shows the small room, so the layout here changed. Check on site.', th: 'ตามแบบออกแบบ ท่อเดินผ่านตำแหน่งที่แบบก่อสร้างจริงแสดงห้องขนาดเล็ก แสดงว่าผังบริเวณนี้เปลี่ยนไป ต้องตรวจสอบหน้างาน' } },
];
// Tank models approved by Chevron for Porto Go (Biotech spec pack, Aug 2019, in Sites\1588 Samut Sakhon\03 Drawings\Tank documents;
// also a layout on the site page): BG-600 grease trap; BO-1000, BO-4000, BO-6000 upright treatment tanks; BO-R-7500 lying tank.
// The FX-10-D1.5 water tank in the pack is struck out. Matched to the SN-103 tanks by volume.
const BIOTECH = {
  T75: { en: 'Approved model (Biotech spec pack, Aug 2019): BO-R-7500, a LYING 7,500 L tank with a DLX-80 air pump. The as-built sheet\'s lying tank in front of building A is probably this one.', th: 'รุ่นที่อนุมัติ (เอกสาร Biotech ส.ค. 2019): BO-R-7500 ถังแบบนอน 7,500 ลิตร พร้อมเครื่องเติมอากาศ DLX-80 ถังแบบนอนหน้าอาคาร A ในแบบก่อสร้างจริงน่าจะเป็นถังนี้' },
  T60: { en: 'Approved model (Biotech spec pack, Aug 2019): BO-6000, 6,000 L, with a DLX-120 air pump.', th: 'รุ่นที่อนุมัติ (เอกสาร Biotech ส.ค. 2019): BO-6000 ขนาด 6,000 ลิตร พร้อมเครื่องเติมอากาศ DLX-120' },
  T40: { en: 'Approved model (Biotech spec pack, Aug 2019): BO-4000, 4,000 L, with a DLX-80 air pump.', th: 'รุ่นที่อนุมัติ (เอกสาร Biotech ส.ค. 2019): BO-4000 ขนาด 4,000 ลิตร พร้อมเครื่องเติมอากาศ DLX-80' },
  T10: { en: 'Approved model (Biotech spec pack, Aug 2019): BO-1000, 1,000 L, with a DL-40 air pump.', th: 'รุ่นที่อนุมัติ (เอกสาร Biotech ส.ค. 2019): BO-1000 ขนาด 1,000 ลิตร พร้อมเครื่องเติมอากาศ DL-40' },
};
const GT = { x: 72.86, y: 39.36, side: 1.1, depth: 1.2 };   // design grease trap: 1.1 m square on the sheet
const GT_IN = [[70.05, 41.50], [70.05, 39.70], [70.39, 39.36], [71.75, 39.36], [72.31, 39.36]];
const GT_OUT = [[73.41, 39.36], [75.40, 39.37]];

// ---- site drains from the as-built sheet. Points are sumps (or the pit / a size change) in flow direction.
// part: [first point, last point, pipe size written on the sheet, what the sheet calls it]
const KIND = {
  pipe: { en: 'buried RC pipe', th: 'ท่อ คสล. ฝังใต้ดิน' },
  vee: { en: 'RC pipe with a V gutter over it', th: 'ท่อ คสล. ราง V' },
  slot: { en: 'RC pipe, narrow-mouth channel', th: 'ท่อ คสล. รางปากแคบ' },
  both: { en: 'buried RC pipe with a V gutter beside it', th: 'ท่อ คสล. ฝังใต้ดิน และราง V ขนานกัน' },
};
const RUNS = [
  { id: 'NE', en: 'north-east side', th: 'ด้านตะวันออกเฉียงเหนือ', start: DRAIN_START, pts: [[124.29, 69.73], [119.16, 76.10], [113.97, 82.34], [108.39, 89.04]], parts: [[0, 3, 0.40, 'slot']] },
  { id: 'N', en: 'north side', th: 'ด้านเหนือ', start: 'NE', pts: [[108.39, 89.04], [101.23, 88.86], [89.23, 88.86], [81.2, 88.86], [77.23, 88.86], [65.23, 88.86], [53.23, 88.86], [41.23, 88.86], [29.23, 88.86], [17.81, 88.86]], parts: [[0, 3, 0.30, 'both'], [3, 7, 0.40, 'both'], [7, 9, 0.50, 'both']], wide: 1 },
  { id: 'C', en: 'under the pump canopy', th: 'ใต้หลังคาคลุมหัวจ่าย', start: DRAIN_START, pts: [[56.87, 65.79], [46.87, 65.79], [36.88, 65.79], [26.87, 65.79], [16.88, 66.66], [17.27, 70.95], [13.00, 75.33]], parts: [[0, 3, 0.30, 'pipe'], [3, 5, 0.40, 'pipe'], [5, 6, 0.50, 'pipe']] },
  { id: 'W', en: 'west side, north part', th: 'ด้านตะวันตก ช่วงเหนือ', start: 'C', pts: [[13.00, 75.33], [14.40, 86.84], [15.00, 88.30]], parts: [[0, 2, 0.40, 'slot']] },
  { id: 'X', en: 'west side, south part', th: 'ด้านตะวันตก ช่วงใต้', start: DRAIN_START, pts: [[10.39, 53.78], [9.25, 44.37], [9.60, 43.95]], parts: [[0, 2, 0.40, 'slot']] },
  { id: 'E', en: 'east side', th: 'ด้านตะวันออก', start: DRAIN_START, pts: [[124.29, 69.73], [123.81, 59.31], [123.33, 48.88], [122.97, 41.13], [122.40, 29.04], [121.92, 18.62], [121.39, 7.20]], parts: [[0, 3, 0.40, 'slot'], [3, 6, 0.40, 'pipe']] },
  { id: 'S', en: 'south end of the south-east plot', th: 'ปลายด้านใต้ของแปลงตะวันออกเฉียงใต้', start: 'E', pts: [[121.39, 7.20], [112.97, 6.56], [104.64, 6.00]], parts: [[0, 2, 0.30, 'pipe']] },
  { id: 'R', en: 'west side of the south-east plot', th: 'ด้านตะวันตกของแปลงตะวันออกเฉียงใต้', start: 'S', pts: [[104.64, 6.00], [105.20, 15.98], [105.75, 25.97], [106.34, 37.02]], parts: [[0, 3, 0.30, 'pipe']] },
  { id: 'F', en: 'front strip, along the south boundary', th: 'แถบด้านหน้า ตามแนวเขตด้านใต้', start: 'R', pts: [[106.34, 37.02], [100.33, 36.95], [93.92, 36.91], [87.98, 36.85], [82.03, 36.80], [76.08, 36.75], [73.09, 36.72], [65.57, 36.66], [62.34, 36.63], [53.72, 36.55], [44.04, 36.47], [36.18, 36.40], [30.24, 36.35], [24.29, 36.30], [18.34, 36.25], [11.40, 36.60]], parts: [[0, 6, 0.30, 'pipe'], [6, 11, 0.40, 'pipe'], [11, 15, 0.50, 'pipe']] },
  { id: 'G', en: 'kerb line round the parking and buildings A and B', th: 'แนวขอบคันหินรอบที่จอดรถและอาคาร A และ B', start: DRAIN_START, pts: [[105.78, 40.96], [98.24, 40.89], [93.89, 40.86], [87.94, 40.80], [81.99, 40.75], [76.05, 40.70], [76.00, 46.80], [69.02, 46.74], [59.50, 46.66], [49.97, 46.57], [40.44, 46.49], [40.52, 38.49], [36.17, 38.45], [30.22, 38.40], [24.27, 38.35], [18.32, 38.30], [18.34, 36.25]], parts: [[0, 10, 0.30, 'vee'], [10, 16, 0.50, 'vee']] },
  { id: 'H', en: 'south edge of the forecourt, east part', th: 'ขอบลานด้านใต้ ช่วงตะวันออก', start: DRAIN_START, pts: [[105.78, 40.96], [110.97, 41.02], [122.97, 41.13]], parts: [[0, 2, 0.40, 'slot']] },
];
// run points that are not a sump of their own (a size change, or the end at an outfall pit)
const NO_SUMP = new Set(['81.2,88.86', '17.81,88.86', '15,88.3', '9.6,43.95', '11.4,36.6']);
// short pipes drawn between a kerb-line sump and the front-strip sump beside it
const CROSS = [[[24.27, 38.35], [24.29, 36.30]], [[30.22, 38.40], [30.24, 36.35]], [[36.17, 38.45], [36.18, 36.40]], [[76.05, 40.70], [76.08, 36.75]], [[81.99, 40.75], [82.03, 36.80]], [[87.94, 40.80], [87.98, 36.85]], [[93.89, 40.86], [93.92, 36.91]]];
// second sump at each pump island, joined to the canopy line
const ISLAND = [[56.87, 67.56], [46.87, 67.56], [36.87, 67.56], [26.87, 67.56]];
// grated pits (three gratings each) where the drains leave the site towards the highway: [x, y, rotation, run that ends here]
const PITS = [
  { x: 16.11, y: 88.86, rot: 0, runs: ['N', 'W'], en: 'north-west', th: 'มุมตะวันตกเฉียงเหนือ' },
  { x: 10.65, y: 43.56, rot: 6.3, runs: ['X'], en: 'west', th: 'ด้านตะวันตก' },
  { x: 9.72, y: 36.69, rot: -7.1, runs: ['F'], en: 'south-west', th: 'มุมตะวันตกเฉียงใต้' },
];

const BOUNDARY = [[14.425, 89.561], [108.46, 89.51], [124.608, 70.014], [121.72, 6.84], [104.25, 5.57], [105.94, 36.61], [7.9, 35.756]];

export default {
  name: 'Samut Sakhon (Porto Go)',
  origin: [66, 48],
  datum: {
    en: 'No levels are written on any of the drawings. The model takes the whole site as flat at ±0.00. Every depth is an assumption: tanks with 0.5 m of cover, wastewater pipes with 0.5 m of cover falling 1:100, site drains 0.5 m deep at the top end falling 1:200 (the slope written on the as-built sheet). Levels shown with "~" are assumed, not from a drawing.',
    th: 'ในแบบทุกแผ่นไม่มีระดับระบุ โมเดลนี้ถือว่าพื้นทั้งสถานีเรียบที่ ±0.00 ความลึกทุกค่าเป็นค่าสมมติ: ถังมีดินกลบ 0.5 ม. ท่อน้ำเสียมีดินกลบ 0.5 ม. ลาด 1:100 ท่อระบายน้ำลึก 0.5 ม. ที่ต้นทาง ลาด 1:200 (ความลาดตามที่ระบุในแบบก่อสร้างจริง) ระดับที่มีเครื่องหมาย "~" เป็นค่าสมมติ ไม่ได้มาจากแบบ',
  },
  note: {
    en: 'First version, from PDF drawings only. Drains, manholes, buildings and the blue tank outlines (not named) are from the as-built drainage sheet LAY-SN-101 (2019). The teal tanks, the grease trap and the wastewater pipes are from SN-103, a 2019 design drawing issued for submission, NOT an as-built: positions are as designed and must be confirmed on site. The two sheets do not agree on the tanks. No levels are on any sheet, so all depths are assumed. Check on site before any digging; not for setting out.',
    th: 'ฉบับแรก จัดทำจากแบบ PDF เท่านั้น ท่อระบายน้ำ บ่อพัก อาคาร และแนวถังสีน้ำเงิน (ไม่ระบุชื่อ) มาจากแบบก่อสร้างจริง LAY-SN-101 (ปี 2019) ถังสีเขียวอมฟ้า ถังดักไขมัน และท่อน้ำเสียมาจาก SN-103 ซึ่งเป็นแบบออกแบบปี 2019 สำหรับยื่นขออนุญาต ไม่ใช่แบบก่อสร้างจริง ตำแหน่งเป็นไปตามแบบออกแบบ ต้องยืนยันหน้างาน แบบสองแผ่นนี้แสดงถังไม่ตรงกัน ไม่มีระดับในแบบทุกแผ่น ความลึกทั้งหมดจึงเป็นค่าสมมติ ต้องตรวจสอบหน้างานก่อนขุด ห้ามใช้วางผัง',
  },
  built: '2026-11-25',
  // no north arrow on any of the three sheets, so no `north`; the highway is on the left (west side of the sheet)
  boundary: BOUNDARY,
  ground: {
    bbox: [1, 2, 128, 94], step: 2, apron: 3, road: 0,
    roadArea: [[1, 30], [7.2, 30], [7.9, 35.756], [14.425, 89.561], [14.9, 93.5], [1, 93.5]],
    points: [[14.4, 89.5, 0], [124.6, 70, 0], [121.7, 6.9, 0], [7.9, 35.8, 0], [66, 48, 0]],
    names: { siteGround: { en: 'Forecourt and paving (taken as flat)', th: 'ลานและพื้นผิว (ถือว่าเรียบ)' }, road: { en: 'Highway side', th: 'ด้านทางหลวง' } },
  },
  // names, order and colours: ../style.mjs. 'asbuilt' is this site's own layer: tank outlines that the as-built sheet shows
  // but does not name, kept apart from the named tanks of the 2019 design so that each set can be switched off.
  layers: ['tanks', 'sewer', 'drains', 'water', 'fuel', 'buildings', 'paving',
    { id: 'asbuilt', en: 'Tank outlines on the as-built sheet (not named there)', th: 'แนวถังตามแบบก่อสร้างจริง (ในแบบไม่ระบุชื่อ)' }, 'plan', 'ground'],
  views: [
    { id: 'site', from: [66, -62, 85], to: [66, 44, 0] },
    { id: 'plan', from: [66, 46.9, 140], to: [66, 47, 0] },
    { id: 'a', en: 'Building A tanks', th: 'ถังที่อาคาร A', from: [52, 20.5, 13], to: [53, 38, -1] },
    { id: 'b', en: 'Building B tanks', th: 'ถังที่อาคาร B', from: [80.5, 26.5, 10], to: [76.3, 38.6, -1] },
    { id: 'garbage', en: 'Garbage room tank (design)', th: 'ถังที่ห้องพักขยะ (ตามแบบออกแบบ)', from: [103.5, 31.5, 6.5], to: [99.3, 39.8, -0.6] },
    { id: 'bld', en: 'Buildings, kiosks and water tanks', th: 'อาคาร ซุ้มร้านค้า และถังน้ำ', from: [30, 58, 14], to: [52, 40, 1] },
    { id: 'carwash', en: 'Car wash (south-east plot)', th: 'ล้างรถ (แปลงตะวันออกเฉียงใต้)', from: [92, 2, 18], to: [113, 22, 1] },
    { id: 'fuel', from: [85, 49, 6], to: [72.7, 65.8, -1.8] },
    { id: 'under', from: [58, 20, -8], to: [60, 38, -0.8] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, hcylGeo, latheGeo, prismGeo, pipeGeo, merge, THREE }) {
    const r2 = (n) => Math.round(n * 100) / 100;
    const as = (n) => '~' + lv(r2(n));   // every level in this model is assumed: always shown with "~"
    // notes(en, th, kind) adds the shared source line; ab() / des() first add which sheet the thing comes from
    const ab = (en, th, kind = P) => notes([...en, FROM_AB.en], [...th, FROM_AB.th], kind);
    const des = (en, th) => notes([...en, FROM_DES.en], [...th, FROM_DES.th], P);
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.max(1, Math.round(g.length))) }; add(layer, g.geometry, material, o, o.tag ? g.mid.clone().setY(0.6) : null); return g; };
    // levels along a line of points: starts at `start`, falls by `fall` per metre
    const grade = (pts, start, fall) => { let l = start; return pts.map(([x, y], i) => { if (i) l -= Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]) * fall; return [x, y, r2(l)]; }); };
    const last = (a) => a[a.length - 1];

    // ---------- tanks shown (without a name) on the as-built sheet
    { // lying tank in front of building A: end arcs at x = 50.29 and 57.19, 2.00 m across, three covers
      const x = 53.74, y = 37.52, rot = 0.5, len = 6.9, r = 1.0, top = -COVER, axis = top - r;
      const parts = [capsuleGeo(r, len, x, y, axis, rot)];   // lying capsule, slightly rounded ends
      add('asbuilt', merge(parts), 'tankOlder', { en: 'Lying tank in front of building A (as-built sheet, not named)', th: 'ถังแบบนอนหน้าอาคาร A (ตามแบบก่อสร้างจริง ไม่ระบุชื่อ)', tag: 'Lying tank (not named)', tagTh: 'ถังแบบนอน (ไม่ระบุชื่อ)', kind: 'tank',
        info: ab(['Outline of a lying tank with three round covers, along the south wall of building A (toilets). The outline is 6.90 m long and 2.00 m across.',
          'The as-built drainage sheet shows the outline only: no name, size, level or pipes.',
          'The 2019 design sheet SN-103 shows no tank here. It shows two upright tanks instead: 7.50 m³ at the west end of building A and 6.00 m³ at the east end. This lying tank may have been built in their place. Confirm on site which tanks exist.',
          'The approved tank list (Biotech spec pack, Aug 2019) has one lying tank, the BO-R-7500 (7,500 L), for the west toilets of building A: this outline is probably that tank.',
          'As drawn, its north edge is about 0.2 m under the wall line of building A, and a manhole of the buried site drain sits on its south edge. Check on site.',
          `Depth assumed: ${COVER.toFixed(2)} m of cover, so top ${as(top)} and underside ${as(top - 2 * r)}.`],
        ['แนวถังแบบนอน มีฝากลม 3 ฝา อยู่ตามแนวผนังด้านใต้ของอาคาร A (ห้องน้ำ) แนวถังยาว 6.90 ม. กว้าง 2.00 ม.',
          'แบบก่อสร้างจริงแสดงเฉพาะแนวถัง ไม่มีชื่อ ขนาด ระดับ หรือท่อ',
          'แบบออกแบบ SN-103 ปี 2019 ไม่มีถังที่ตำแหน่งนี้ แต่แสดงถังแบบตั้ง 2 ใบ: 7.50 ลบ.ม. ที่ปลายด้านตะวันตกของอาคาร A และ 6.00 ลบ.ม. ที่ปลายด้านตะวันออก ถังแบบนอนนี้อาจสร้างแทนถังทั้งสองใบ ต้องยืนยันหน้างานว่ามีถังใดอยู่จริง',
          'รายการถังที่อนุมัติ (เอกสาร Biotech ส.ค. 2019) มีถังแบบนอน 1 ใบ คือ BO-R-7500 (7,500 ลิตร) สำหรับห้องน้ำฝั่งตะวันตกของอาคาร A แนวถังนี้น่าจะเป็นถังดังกล่าว',
          'ตามที่เขียนในแบบ ขอบถังด้านเหนือล้ำเข้าไปใต้แนวผนังอาคาร A ประมาณ 0.2 ม. และมีบ่อพักของท่อระบายน้ำฝังใต้ดินอยู่ตรงขอบถังด้านใต้ ต้องตรวจสอบหน้างาน',
          `ความลึกเป็นค่าสมมติ: ดินกลบ ${COVER.toFixed(2)} ม. หลังถัง ${as(top)} ใต้ถัง ${as(top - 2 * r)}`]) }, V(x, y, 0.7));
      for (const [mx, my] of [[51.25, 37.50], [53.54, 37.52], [56.49, 37.55]]) {
        add('asbuilt', cylGeo(0.295, COVER, mx, my, top), 'tankOlder', { en: 'Lying tank access', th: 'ช่องเปิดถังแบบนอน', nopick: 1 });
        add('asbuilt', cylGeo(0.33, 0.03, mx, my, 0), 'cover', { en: 'Lying tank cover', th: 'ฝาถังแบบนอน', nopick: 1 });
      }
    }
    [[75.12, 38.13, 'west', 'ตะวันตก'], [77.49, 38.15, 'east', 'ตะวันออก']].forEach(([x, y, w, wTh], i) => {
      const r = 1.0, h = 2.0, top = -COVER;
      add('asbuilt', cylGeo(r, h, x, y, top - h), 'tankOlder', { en: `Round tank at building B, ${w} one (as-built sheet, not named)`, th: `ถังกลมที่อาคาร B ใบด้าน${wTh} (ตามแบบก่อสร้างจริง ไม่ระบุชื่อ)`, ...(i ? {} : { tag: 'Round tanks (not named)', tagTh: 'ถังกลม (ไม่ระบุชื่อ)' }), kind: 'tank',
        info: ab(['Round outline 2.00 m across, east of building B. One of two side by side, with a 1.5 m square pit next to them.',
          'The as-built drainage sheet shows the outline only: no name, size, level or pipes.',
          'The 2019 design sheet SN-103 shows a grease trap (6.00 m³) and a treatment tank (4.00 m³) for building B, 1 to 2.5 m west of here. These two outlines are probably those as built, but the sheet does not say which is which. Confirm on site.',
          `Depth assumed: ${COVER.toFixed(2)} m of cover and ${h.toFixed(2)} m high, so top ${as(top)} and underside ${as(top - h)}.`],
        ['แนววงกลมกว้าง 2.00 ม. ด้านตะวันออกของอาคาร B เป็น 1 ใน 2 ใบที่อยู่ติดกัน และมีบ่อสี่เหลี่ยม 1.5 ม. อยู่ข้างกัน',
          'แบบก่อสร้างจริงแสดงเฉพาะแนวถัง ไม่มีชื่อ ขนาด ระดับ หรือท่อ',
          'แบบออกแบบ SN-103 ปี 2019 แสดงถังดักไขมัน (6.00 ลบ.ม.) และถังบำบัด (4.00 ลบ.ม.) ของอาคาร B ห่างไปทางตะวันตก 1 ถึง 2.5 ม. แนวถังสองใบนี้น่าจะเป็นถังดังกล่าวที่สร้างจริง แต่แบบไม่ได้ระบุว่าใบใดเป็นถังใด ต้องยืนยันหน้างาน',
          `ความลึกเป็นค่าสมมติ: ดินกลบ ${COVER.toFixed(2)} ม. ถังสูง ${h.toFixed(2)} ม. หลังถัง ${as(top)} ใต้ถัง ${as(top - h)}`]) }, i ? null : V(76.3, 38.14, 0.7));
    });
    add('asbuilt', boxGeo(1.5, 1.5, 1.5, 79.62, 38.245, -1.5, 0.5), 'manhole', { en: 'Square pit at building B (as-built sheet, not named)', th: 'บ่อสี่เหลี่ยมที่อาคาร B (ตามแบบก่อสร้างจริง ไม่ระบุชื่อ)', tag: 'Square pit (not named)', tagTh: 'บ่อสี่เหลี่ยม (ไม่ระบุชื่อ)', kind: 'tank',
      info: ab(['Square outline 1.50 × 1.50 m beside the two round tanks, east of building B.', 'Not named on the as-built sheet. It could be a grease trap, a sump or a sampling pit. Confirm on site.', `Drawn 1.50 m deep from the ground (assumed), so the bottom is ${as(-1.5)}.`],
        ['แนวสี่เหลี่ยม 1.50 × 1.50 ม. ข้างถังกลมสองใบ ด้านตะวันออกของอาคาร B', 'แบบก่อสร้างจริงไม่ระบุชื่อ อาจเป็นถังดักไขมัน บ่อพัก หรือบ่อเก็บตัวอย่างน้ำ ต้องยืนยันหน้างาน', `แสดงลึก 1.50 ม. จากผิวพื้น (ค่าสมมติ) ก้นบ่อ ${as(-1.5)}`]) }, V(79.62, 38.245, 0.7));

    // ---------- tanks, grease trap and pipes as designed on SN-103 (2019, for submission)
    const NOTE_DES = { en: 'No size or level is written on the sheet: shown as a 150 mm pipe with 0.50 m of cover at its start, falling 1:100 (assumed).', th: 'ในแบบไม่มีขนาดหรือระดับระบุ แสดงเป็นท่อ 150 มม. มีดินกลบ 0.50 ม. ที่ต้นทาง ลาด 1:100 (ค่าสมมติ)' };
    const node = (x, y, l, en, th, treated) => add('sewer', cylGeo(0.3, -l, x, y, l), treated ? 'sewerTreated' : 'sewerRaw', { en, th, kind: 'pipe',
      info: des(['Round symbol at the end of the pipe line on SN-103. The sheet has no legend for it; it marks where the line starts or ends.'], ['สัญลักษณ์วงกลมที่ปลายเส้นท่อในแบบ SN-103 แบบไม่มีคำอธิบายสัญลักษณ์ ใช้บอกจุดเริ่มหรือจุดสิ้นสุดของเส้นท่อ']) });
    const sewerIn = (pts, start, en, th, extraEn, extraTh) => {
      const g = grade(pts, start, PIPE_FALL);
      pipe('sewer', g, PIPE_R, 'sewerRaw', { en, th, kind: 'pipe', info: (m) => des([`About ${m} m. Underside ${as(g[0][2])} at the start and ${as(last(g)[2])} at the end.`, NOTE_DES.en, ...(extraEn ? [extraEn] : [])], [`ยาวประมาณ ${m} ม. ท้องท่อ ${as(g[0][2])} ที่ต้นทาง และ ${as(last(g)[2])} ที่ปลายทาง`, NOTE_DES.th, ...(extraTh ? [extraTh] : [])]) });
      return g;
    };
    const sewerOut = (pts, start, en, th, extraEn, extraTh, tag) => {
      const g = grade(pts, start, PIPE_FALL);
      pipe('sewer', g, PIPE_R, 'sewerTreated', { en, th, ...(tag ? { tag: 'Treated water out', tagTh: 'น้ำที่บำบัดแล้ว' } : {}), kind: 'pipe', info: (m) => des([`About ${m} m. Underside ${as(g[0][2])} at the tank and ${as(last(g)[2])} at the end.`, NOTE_DES.en, ...(extraEn ? [extraEn] : [])], [`ยาวประมาณ ${m} ม. ท้องท่อ ${as(g[0][2])} ที่ถัง และ ${as(last(g)[2])} ที่ปลายทาง`, NOTE_DES.th, ...(extraTh ? [extraTh] : [])]) });
      return g;
    };

    // building B: kitchen -> grease trap -> 4.00 m3 tank
    const gIn = sewerIn(GT_IN, PIPE_START, 'Design: pipe from building B to the grease trap', 'ตามแบบออกแบบ: ท่อจากอาคาร B ไปถังดักไขมัน');
    node(GT_IN[0][0], GT_IN[0][1], gIn[0][2], 'Design: start symbol inside building B', 'ตามแบบออกแบบ: สัญลักษณ์จุดเริ่มในอาคาร B');
    const gtIn = last(gIn)[2], gtOut = r2(gtIn - 0.05);
    const gOut = sewerIn(GT_OUT, gtOut, 'Design: pipe from the grease trap to the 4.00 m³ tank', 'ตามแบบออกแบบ: ท่อจากถังดักไขมันไปถัง 4.00 ลบ.ม.');

    for (const t of DESIGN) {
      const volTxt = t.vol.toFixed(2), h = r2(t.vol / (Math.PI * t.r * t.r)), top = -COVER, name = { en: `Design: treatment tank ${volTxt} m³ (${t.where.en})`, th: `ตามแบบออกแบบ: ถังบำบัด ${volTxt} ลบ.ม. (${t.where.th})` };
      let inL;
      if (t.inPts) {
        const g = sewerIn(t.inPts, PIPE_START, `Design: pipe into the ${volTxt} m³ tank`, `ตามแบบออกแบบ: ท่อเข้าถัง ${volTxt} ลบ.ม.`);
        node(t.inPts[0][0], t.inPts[0][1], g[0][2], `Design: start symbol of the pipe into the ${volTxt} m³ tank`, `ตามแบบออกแบบ: สัญลักษณ์จุดเริ่มของท่อเข้าถัง ${volTxt} ลบ.ม.`);
        inL = last(g)[2];
      } else inL = last(gOut)[2];
      const outL = r2(inL - 0.05);
      const o = sewerOut(t.outPts, outL, `Design: pipe out of the ${volTxt} m³ tank`, `ตามแบบออกแบบ: ท่อออกจากถัง ${volTxt} ลบ.ม.`, t.outNote.en, t.outNote.th, t.id !== 'T10');
      node(last(t.outPts)[0], last(t.outPts)[1], last(o)[2], `Design: end symbol of the pipe out of the ${volTxt} m³ tank`, `ตามแบบออกแบบ: สัญลักษณ์จุดสิ้นสุดของท่อออกจากถัง ${volTxt} ลบ.ม.`, 1);
      add('tanks', cylGeo(t.r, h, t.x, t.y, top - h), 'tank', { ...name, tag: `${volTxt} m³ tank`, tagTh: `ถัง ${volTxt} ลบ.ม.`, kind: 'tank',
        info: des([`Underground wastewater treatment tank, ${volTxt} m³, as designed on SN-103 (issued for submission 29/03/2019).`,
          t.serves.en,
          BIOTECH[t.id].en,
          `The sheet gives the volume only. Drawn as an upright cylinder ${(2 * t.r).toFixed(2)} m across (the circle on the sheet) and ${h.toFixed(2)} m high, which holds ${volTxt} m³. The real tank will be somewhat taller.`,
          `Depth assumed: ${COVER.toFixed(2)} m of cover, so top ${as(top)} and underside ${as(top - h)}. Pipe in ${as(inL)}, pipe out ${as(outL)} (assumed).`,
          t.asBuilt.en],
        [`ถังบำบัดน้ำเสียใต้ดิน ${volTxt} ลบ.ม. ตามแบบ SN-103 (ออกแบบเพื่อยื่นขออนุญาต 29/03/2019)`,
          t.serves.th,
          BIOTECH[t.id].th,
          `แบบระบุเฉพาะปริมาตร ในโมเดลแสดงเป็นถังทรงกระบอกตั้ง กว้าง ${(2 * t.r).toFixed(2)} ม. (ตามวงกลมในแบบ) สูง ${h.toFixed(2)} ม. ซึ่งจุได้ ${volTxt} ลบ.ม. ถังจริงจะสูงกว่านี้เล็กน้อย`,
          `ความลึกเป็นค่าสมมติ: ดินกลบ ${COVER.toFixed(2)} ม. หลังถัง ${as(top)} ใต้ถัง ${as(top - h)} ท่อเข้า ${as(inL)} ท่อออก ${as(outL)} (ค่าสมมติ)`,
          t.asBuilt.th]) }, V(t.x, t.y, t.id === 'T40' ? 1.3 : 0.7));
      // small box drawn on a thin line from the tank
      const b = last(t.box);
      add('tanks', merge([boxGeo(0.25, 0.25, 0.3, b[0], b[1], 0, 0), pipeGeo(t.box.map(([x, y]) => [x, y, -0.3]), 0.02).geometry]), 'airPump', { en: `Design: small box beside the ${volTxt} m³ tank`, th: `ตามแบบออกแบบ: กล่องเล็กข้างถัง ${volTxt} ลบ.ม.`, kind: 'air',
        info: des(['A small box on a thin line from the tank, drawn on SN-103 without a label. Probably the air pump or the vent of the tank. Confirm on site.', 'Shown at ground level with its line 0.3 m down (assumed).'], ['กล่องเล็กบนเส้นบางจากถัง เขียนในแบบ SN-103 โดยไม่มีชื่อ น่าจะเป็นปั๊มลมหรือท่ออากาศของถัง ต้องยืนยันหน้างาน', 'แสดงที่ระดับพื้น เส้นท่ออยู่ลึก 0.3 ม. (ค่าสมมติ)']) });
    }

    // grease trap of building B (added after the tanks so that the layer's legend colour is the treatment-tank colour)
    add('tanks', boxGeo(GT.side, GT.side, GT.depth, GT.x, GT.y, -GT.depth, 0), 'grease', { en: 'Design: grease trap labelled 6.00 m³ (building B)', th: 'ตามแบบออกแบบ: ถังดักไขมันระบุ 6.00 ลบ.ม. (อาคาร B)', tag: 'Grease trap', tagTh: 'ถังดักไขมัน', kind: 'tank',
      info: des(['Grease trap for building B, labelled 6.00 m³ on SN-103 (issued for submission 29/03/2019).',
        'On the sheet it is a 1.10 m square with a round cover about 1.0 m across. That is far too small to hold 6.00 m³, so either the label or the symbol is not to scale. Check on site.',
        'The approved model (Biotech spec pack, Aug 2019) is a BG-600 grease trap, 600 L: so the 6.00 m³ label is probably a slip for 0.60 m³.',
        `Shown here as the 1.10 m square, ${GT.depth.toFixed(2)} m deep from the ground (assumed). Pipe in ${as(gtIn)}, pipe out ${as(gtOut)} (assumed).`,
        'As drawn it overlaps the south-east corner of building B on the as-built sheet. The as-built sheet shows two round outlines and a square pit 2 to 7 m east of here instead.'],
      ['ถังดักไขมันของอาคาร B ในแบบ SN-103 ระบุ 6.00 ลบ.ม. (ออกแบบเพื่อยื่นขออนุญาต 29/03/2019)',
        'ในแบบเขียนเป็นสี่เหลี่ยม 1.10 ม. มีฝากลมกว้างประมาณ 1.0 ม. ซึ่งเล็กเกินไปสำหรับ 6.00 ลบ.ม. แสดงว่าตัวเลขหรือสัญลักษณ์ไม่ตรงมาตราส่วน ต้องตรวจสอบหน้างาน',
        'รุ่นที่อนุมัติ (เอกสาร Biotech ส.ค. 2019) คือถังดักไขมัน BG-600 ขนาด 600 ลิตร ตัวเลข 6.00 ลบ.ม. จึงน่าจะพิมพ์ผิดจาก 0.60 ลบ.ม.',
        `ในโมเดลแสดงเป็นสี่เหลี่ยม 1.10 ม. ลึก ${GT.depth.toFixed(2)} ม. จากผิวพื้น (ค่าสมมติ) ท่อเข้า ${as(gtIn)} ท่อออก ${as(gtOut)} (ค่าสมมติ)`,
        'ตามที่เขียน ตำแหน่งนี้ทับมุมตะวันออกเฉียงใต้ของอาคาร B ในแบบก่อสร้างจริง แบบก่อสร้างจริงแสดงแนววงกลม 2 วงและบ่อสี่เหลี่ยม ห่างไปทางตะวันออก 2 ถึง 7 ม. แทน']) }, V(GT.x, GT.y, 1.9));
    add('tanks', cylGeo(0.5, 0.03, GT.x, GT.y, 0), 'cover', { en: 'Grease trap cover (design)', th: 'ฝาถังดักไขมัน (ตามแบบออกแบบ)', nopick: 1 });

    // ---------- site drains, sumps and outfall pits (as-built sheet; depths assumed)
    const ends = {}, levelAt = new Map(), key = (x, y) => `${+x.toFixed(2)},${+y.toFixed(2)}`;
    const flowNote = { en: 'Direction of flow is taken from the slope arrows of the 2019 design sheet SN-101; the as-built sheet marks the 1:200 slope but not clearly which way. Check on site.', th: 'ทิศทางการไหลอ้างอิงจากลูกศรความลาดในแบบออกแบบ SN-101 ปี 2019 แบบก่อสร้างจริงระบุความลาด 1:200 แต่ไม่ชัดเจนว่าไหลไปทางใด ต้องตรวจสอบหน้างาน' };
    const sump = (x, y, l, id, wide) => {
      const k = key(x, y); if (levelAt.has(k) || NO_SUMP.has(k)) return; levelAt.set(k, l);
      add('drains', boxGeo(0.8, wide ? 1.3 : 0.8, -(l - 0.2), x, y, l - 0.2, 0), 'manhole', { en: `Manhole ${id}`, th: `บ่อพัก ${id}`, kind: 'manhole',
        info: ab([`No level is written at this manhole: the pipe level shown (${as(l)}) is assumed, taking the line as 0.50 m deep at its top end and falling 1:200.`, 'Manhole size (0.60 m inside) and the pit floor 0.20 m below the pipe are assumed.'],
          [`ในแบบไม่มีระดับที่บ่อพักนี้ ระดับท่อที่แสดง (${as(l)}) เป็นค่าสมมติ โดยถือว่าท่อลึก 0.50 ม. ที่ต้นทาง ลาด 1:200`, 'ขนาดบ่อพัก (ภายใน 0.60 ม.) และก้นบ่อต่ำกว่าท่อ 0.20 ม. เป็นค่าสมมติ']) });
      add('drains', boxGeo(0.7, wide ? 1.2 : 0.7, 0.03, x, y, 0, 0), 'cover', { en: `Manhole ${id} cover`, th: `ฝาบ่อพัก ${id}`, nopick: 1 });
    };
    for (const run of RUNS) {
      const g = grade(run.pts, typeof run.start === 'string' ? ends[run.start] : run.start, DRAIN_FALL); ends[run.id] = last(g)[2];
      let n = 0; g.forEach(([x, y, l]) => { if (!NO_SUMP.has(key(x, y)) && !levelAt.has(key(x, y))) sump(x, y, l, `${run.id}${++n}`, run.wide); });
      for (const [a, b, dia, kind] of run.parts) {
        const seg = g.slice(a, b + 1), size = dia.toFixed(2);
        pipe('drains', seg, dia / 2, 'drain', { en: `Site drain: ${run.en}, Ø${size} m`, th: `ท่อระบายน้ำ: ${run.th} Ø${size} ม.`, kind: 'drain',
          info: (m) => ab([`About ${m} m. The as-built sheet writes "Ø${size} M.RCP": ${KIND[kind].en}, slope 1:200.`, `No levels are written. Shown from ${as(seg[0][2])} to ${as(last(seg)[2])}, taking the line as 0.50 m deep at its top end (assumed).`, flowNote.en],
            [`ยาวประมาณ ${m} ม. แบบก่อสร้างจริงระบุ "Ø${size} M.RCP": ${KIND[kind].th} ความลาด 1:200`, `ไม่มีระดับระบุ แสดงจาก ${as(seg[0][2])} ถึง ${as(last(seg)[2])} โดยถือว่าท่อลึก 0.50 ม. ที่ต้นทาง (ค่าสมมติ)`, flowNote.th]) });
      }
    }
    // cross pipes and the pump-island sumps
    const lvlOf = (p) => levelAt.get(key(p[0], p[1]));
    add('drains', merge(CROSS.map(([a, b]) => pipeGeo([[...a, lvlOf(a)], [...b, lvlOf(b)]], 0.1).geometry)), 'drain', { en: 'Cross pipes from the kerb-line manholes to the front-strip drain', th: 'ท่อเชื่อมจากบ่อพักแนวขอบคันหินไปท่อระบายน้ำแถบด้านหน้า', kind: 'drain',
      info: ab(['Seven short lines drawn on the as-built sheet between a kerb-line manhole and the front-strip manhole beside it. No size or level is written; shown as 0.20 m pipes between the assumed levels of the two manholes.'], ['เส้นสั้น 7 เส้นในแบบก่อสร้างจริง ระหว่างบ่อพักแนวขอบคันหินกับบ่อพักแถบด้านหน้าที่อยู่ข้างกัน ไม่มีขนาดหรือระดับระบุ แสดงเป็นท่อ 0.20 ม. ระหว่างระดับสมมติของบ่อพักทั้งสอง']) });
    ISLAND.forEach(([x, y], i) => { const l = lvlOf([x === 36.87 ? 36.88 : x, 65.79]); sump(x, y, r2(l + 0.01), `C${i + 1}a`); });
    add('drains', merge(ISLAND.map(([x, y]) => { const l = lvlOf([x === 36.87 ? 36.88 : x, 65.79]); return pipeGeo([[x, y, l + 0.01], [x, 65.79, l]], 0.1).geometry; })), 'drain', { en: 'Short pipes from the pump-island manholes', th: 'ท่อสั้นจากบ่อพักที่แท่นหัวจ่าย', kind: 'drain',
      info: ab(['Each pump island has a second manhole joined to the canopy drain by a short line on the as-built sheet. No size or level is written; shown as 0.20 m pipes (assumed).'], ['แท่นหัวจ่ายแต่ละแท่นมีบ่อพักอีก 1 บ่อ ต่อกับท่อระบายน้ำใต้หลังคาด้วยเส้นสั้นในแบบก่อสร้างจริง ไม่มีขนาดหรือระดับระบุ แสดงเป็นท่อ 0.20 ม. (ค่าสมมติ)']) });
    for (const p of PITS) {
      const l = Math.min(...p.runs.map((r) => ends[r])), depth = 1.5;
      add('drains', boxGeo(3.4, 1.2, depth, p.x, p.y, -depth, p.rot), 'oilTrap', { en: `Grated trap pit at the ${p.en} outfall`, th: `บ่อฝาตะแกรงที่ปลายทาง${p.th}`, tag: `Trap pit (${p.en} outfall)`, tagTh: `บ่อดัก (${p.th})`, kind: 'manhole',
        info: ab(['Pit with three gratings, 3.40 × 1.20 m on the as-built sheet, where the site drain leaves towards the highway. The sheet writes "connect to the public drain" beside it.',
          'The as-built sheet does not name the pit. The 2019 design sheet SN-101 marks a grease trap ("บ่อดักไขมัน") at the south-west outfall, so these are probably trap pits. Confirm on site.',
          `No levels are written. Shown ${depth.toFixed(2)} m deep, with the drain arriving at ${as(l)} (both assumed).`],
        ['บ่อมีฝาตะแกรง 3 ช่อง ขนาด 3.40 × 1.20 ม. ตามแบบก่อสร้างจริง เป็นจุดที่ท่อระบายน้ำออกจากสถานีไปทางทางหลวง แบบเขียนกำกับว่า "ต่อลงท่อระบายน้ำสาธารณะ"',
          'แบบก่อสร้างจริงไม่ระบุชื่อบ่อ แบบออกแบบ SN-101 ปี 2019 ระบุ "บ่อดักไขมัน" ที่ปลายทางมุมตะวันตกเฉียงใต้ บ่อเหล่านี้จึงน่าจะเป็นบ่อดัก ต้องยืนยันหน้างาน',
          `ไม่มีระดับระบุ แสดงลึก ${depth.toFixed(2)} ม. ท่อระบายน้ำเข้าที่ ${as(l)} (ค่าสมมติทั้งสองค่า)`]) }, V(p.x, p.y, 0.7));
    }

    // ---------- underground fuel tanks: the as-built sheet shows four 7.50 x 2.38 m outlines, no names
    [[69.68, 72.06], [66.30, 68.68], [62.92, 65.30], [59.54, 61.92]].forEach(([y0, y1], i) => {
      fuelTank(`${i + 1}`, 72.7, (y0 + y1) / 2, 0, { dia: 2.38,
        en: [`Tank ${i + 1} of 4, counted from the north. The as-built sheet shows four tank outlines and does not name them.`, 'The 2019 design sheets show five tanks in a different arrangement, so the tank farm was changed.'],
        th: [`ถังที่ ${i + 1} จาก 4 นับจากด้านเหนือ แบบก่อสร้างจริงแสดงแนวถัง 4 ใบและไม่ระบุชื่อ`, 'แบบออกแบบปี 2019 แสดงถัง 5 ใบในตำแหน่งที่ต่างกัน แสดงว่ากลุ่มถังน้ำมันถูกเปลี่ยน'] });
    });

    // ---------- buildings, canopy, signs and site furniture (27-28 Nov 2026, Brian: "properly model out the buildings")
    // Plan positions from the 2021 "check actual" site plan `2021 Dec Check actual ARC-LAYOUT_R.01.dwg` (Brian's
    // Tah Chin (Porto Go) folder, New Toilet 2022 Project). It sits on this model by a plain shift (x - 359.08, y + 21.93,
    // drawing in mm): every boundary corner agrees within about 0.15 m. Heights from the SPP as-built set (As Built Porto Go:
    // TOILET (A) A-201/A-102, OFFICE (B) B-A-201/B-A-103, CANOPY (C) C-A-201, GARBAGE ROOM, water-tank screen, HIGHWAY SIGN
    // HS-ST-002, PRICE SIGN). Drawing levels are from the site road (+0.30); this model's ±0.00 is the road, so 0.30 is taken off.
    // What the drawings do not show (car wash, kiosks, the stall and sink area, the walkway roof) is from Brian's 360° video of
    // 20 Nov 2026 and the satellite image, and says so.
    const FROM_ARC = { en: 'Outline from the 2021 "check actual" site plan; heights from the SPP as-built building drawings (2019).', th: 'แนวจากผังตรวจสอบตามจริงปี 2021 ความสูงจากแบบก่อสร้างจริงของอาคารโดย SPP (ปี 2019)' };
    const FROM_VID = { en: 'Not on any drawing: position and size judged from Brian\'s 360° site video (20 Nov 2026) and the satellite image. Check on site.', th: 'ไม่มีในแบบ: ตำแหน่งและขนาดประมาณจากวิดีโอ 360° ของ Brian (20 พ.ย. 2026) และภาพถ่ายดาวเทียม ควรตรวจสอบที่หน้างาน' };
    const arc = (en, th) => notes([...en, FROM_ARC.en], [...th, FROM_ARC.th], 'context');
    const vid = (en, th) => notes([...en, FROM_VID.en], [...th, FROM_VID.th], 'context');
    const centre = (poly) => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
    // a turned box: w along the building's x, d across it, rot in degrees (anticlockwise on plan)
    const tbox = (w, d, h, x, y, base, rot) => boxGeo(w, d, h, x, y, base, rot);
    // gable roof over a w × d footprint centred at (x, y): eaves level e, ridge level r, ridge along 'x' or 'y', overhang o
    const rad = (d) => d * Math.PI / 180;
    const gable = (w, d, x, y, e, r, along, rot = 0, o = 0.4) => {
      const span = (along === 'x' ? d : w) + 2 * o, len = (along === 'x' ? w : d) + 2 * o;
      const sh = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, r - e)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
      g.translate(0, 0, -len / 2);                       // shape in x-y (across, up), extruded along z
      if (along === 'x') g.rotateY(Math.PI / 2);          // ridge along model x
      g.rotateY(rad(rot)); const c = V(x, y, e); g.translate(c.x, c.y, c.z); return g;
    };
    const ROT_A = 0.5, ROT_B = 0.5;                       // the building row runs about 0.5° off the drawing's x axis

    // Building A (toilets): columns at x 44.1 / 52.1 / 55.1 / 62.1 (grid A1-A4) and y 38.3 (back) to 41.9; two front porches
    // to y 43.6. Two gables with the ridge running front to back (8 m wing west, 7 m wing east) and a flat 3 m link between.
    // Eaves +4.35, ridges +7.42 and +7.13, floor +0.45 on the drawings.
    const A = { wings: [[44.1, 52.1, 6.83 + 0.29], [55.1, 62.1, 6.83]], y0: 38.33, y1: 41.95, eave: 4.05 };
    const aInfo = arc(['Building A, the public toilets (men, women, disabled, plant room). Two gable roofs, metal sheet (Suntec KL-690 posh grey), ridge running front to back: 8 m wing on the highway side (ridge about +7.12), 7 m wing on the far side (ridge about +6.83), a flat 3 m link between them, and two entrance porches on the parking side. Walls light-weight block, rendered.',
      'Size about 18.0 × 3.6 m plus the porches (1.65 m deep). Floor 0.15 m above the road.'],
      ['อาคาร A ห้องน้ำสาธารณะ (ชาย หญิง คนพิการ ห้องเครื่อง) หลังคาจั่ว 2 หลัง เมทัลชีท (Suntec KL-690 สีเทา) สันหลังคาวิ่งหน้า-หลัง ปีกกว้าง 8 ม. ด้านทางหลวง (สันประมาณ +7.12) ปีกกว้าง 7 ม. ด้านใน (สันประมาณ +6.83) มีส่วนเชื่อมหลังคาแบนกว้าง 3 ม. ตรงกลาง และมุขทางเข้า 2 มุขด้านที่จอดรถ ผนังก่ออิฐมวลเบาฉาบปูน',
      'ขนาดประมาณ 18.0 × 3.6 ม. รวมมุข (ลึก 1.65 ม.) พื้นสูงกว่าถนน 0.15 ม.']);
    const aWalls = [tbox(62.1 - 44.1, A.y1 - A.y0, A.eave, 53.1, (A.y0 + A.y1) / 2, 0, ROT_A)];
    [[45.77, 50.37], [56.77, 61.17]].forEach(([x0, x1]) => aWalls.push(tbox(x1 - x0, 43.6 - A.y1, 4.05, (x0 + x1) / 2, (A.y1 + 43.6) / 2 + 0.05, 0, ROT_A)));
    add('buildings', merge(aWalls), 'building', { en: 'Building A (toilets)', th: 'อาคาร A (ห้องน้ำ)', tag: 'Building A (toilets)', tagTh: 'อาคาร A (ห้องน้ำ)', kind: 'building', info: aInfo }, V(53.1, 40.1, 7.9));
    add('buildings', merge([
      ...A.wings.map(([x0, x1, r]) => gable(x1 - x0, A.y1 - A.y0, (x0 + x1) / 2, (A.y0 + A.y1) / 2 + (x0 - 53.1) * 0.0087, A.eave, r, 'y', ROT_A, 0.2)),
      tbox(3.0, A.y1 - A.y0, 0.3, 53.6, (A.y0 + A.y1) / 2, A.eave, ROT_A),
      ...[[45.77, 50.37], [56.77, 61.17]].map(([x0, x1]) => tbox(x1 - x0 + 0.4, 1.85, 0.2, (x0 + x1) / 2, 42.8, 4.05, ROT_A)),
    ]), 'roof', { en: 'Building A roofs', th: 'หลังคาอาคาร A', nopick: 1 });

    // Building B (office, staff room, electrical room): columns x 66.6 / 70.6 / 73.6, y 38.6 to 43.6. One gable, ridge running
    // along the building (gable ends face the highway and the far side), eaves +4.35, ridge +7.11. Dark grey metal cladding.
    add('buildings', tbox(7.0, 5.0, 4.05, 70.1, 41.12, 0, ROT_B), 'building', { en: 'Building B (office)', th: 'อาคาร B (สำนักงาน)', tag: 'Building B (office)', tagTh: 'อาคาร B (สำนักงาน)', kind: 'building',
      info: arc(['Building B: station office, staff room with lockers, electrical room and two staff toilets. One gable roof, ridge along the building (the gable ends face the highway and the far side, as in the site video), eaves about +4.05, ridge about +6.81 above the road. Dark grey metal cladding on the gables.', 'Size 7.0 × 5.0 m.'],
        ['อาคาร B สำนักงานสถานี ห้องพักพนักงาน (ล็อกเกอร์) ห้องไฟฟ้า และห้องน้ำพนักงาน 2 ห้อง หลังคาจั่ว 1 หลัง สันหลังคาวิ่งตามแนวยาวอาคาร (หน้าจั่วหันไปทางทางหลวงและด้านใน ตรงกับวิดีโอหน้างาน) ชายคาประมาณ +4.05 สันประมาณ +6.81 จากระดับถนน หน้าจั่วกรุเมทัลชีทสีเทาเข้ม', 'ขนาด 7.0 × 5.0 ม.']) }, V(70.1, 41.1, 7.6));
    add('buildings', gable(7.0, 5.0, 70.1, 41.12, 4.05, 6.81, 'x', ROT_B, 0.25), 'roof', { en: 'Building B roof', th: 'หลังคาอาคาร B', nopick: 1 });

    // Walkway roof along the parking side of buildings A and B, with the kiosks under it (video 2:00, 8:25, 8:50)
    const walkPosts = []; for (let x = 37.5; x <= 75.5; x += 4.75) walkPosts.push(cylGeo(0.06, 3.0, x, 45.85, 0, 8));
    add('buildings', merge([tbox(38.6, 2.4, 0.12, 56.5, 44.85, 3.0, ROT_A), ...walkPosts]), 'roof', { en: 'Walkway roof in front of the buildings', th: 'หลังคาทางเดินหน้าอาคาร', kind: 'building',
      info: vid(['Light steel roof (translucent sheet) over the walkway between the buildings and the parking, from the highway end of the kiosks to past building B. Underside taken as about 3.0 m. Its exact length is not known.'],
        ['หลังคาโครงเหล็กเบา (แผ่นโปร่งแสง) คลุมทางเดินระหว่างอาคารกับที่จอดรถ ตั้งแต่ซุ้มร้านค้าด้านทางหลวงจนเลยอาคาร B ใต้หลังคาประมาณ 3.0 ม. ไม่ทราบความยาวที่แน่นอน']) }, V(56.5, 44.9, 3.6));

    // Kiosks: red container shops between the coffee shop and building A (video 2:00, 7:20, 8:50; Brian's still)
    const kiosk = (x, y, w, d, n, en, th) => add('buildings', tbox(w, d, 2.6, x, y, 0, ROT_A), 'kiosk', { en, th, kind: 'building',
      tag: n === 1 ? 'Kiosks (container shops)' : undefined, tagTh: n === 1 ? 'ซุ้มร้านค้า (ตู้คอนเทนเนอร์)' : undefined,
      info: vid([`${en}: a red steel container shop with a roll-up front facing the walkway. About ${w.toFixed(1)} × ${d.toFixed(1)} m, 2.6 m high (estimated).`],
        [`${th}: ร้านค้าตู้คอนเทนเนอร์เหล็กสีแดง หน้าร้านเปิดหันออกทางเดิน ขนาดประมาณ ${w.toFixed(1)} × ${d.toFixed(1)} ม. สูง 2.6 ม. (ประมาณ)`]) }, n === 1 ? V(x, y, 3.4) : null);
    kiosk(43.35, 43.15, 2.4, 2.2, 1, 'Kiosk 1', 'ซุ้มร้านค้า 1');
    kiosk(43.35, 40.55, 1.4, 2.6, 2, 'Kiosk 2', 'ซุ้มร้านค้า 2');

    // Coffee shop (new, after 2021; not on any drawing): white flat-roofed box with a green glass shopfront to the parking,
    // at the highway end of the building row (Brian, 28 Nov 2026: video 7:20, looking towards the toilets; his still).
    add('buildings', tbox(6.8, 4.2, 3.6, 39.2, 40.6, 0, ROT_A), 'kioskWhite', { en: 'Coffee shop', th: 'ร้านกาแฟ', tag: 'Coffee shop', tagTh: 'ร้านกาแฟ', kind: 'building',
      info: vid(['Coffee shop built after the station (not on the 2021 plan): single storey, white flat-roofed box with a deep white fascia and a green glass shopfront facing the parking, a low step along its front. At the highway end of the building row, west of the kiosks and the toilets (Brian, 28 Nov 2026). About 6.8 × 4.2 m and 3.6 m high, judged from the video.'],
        ['ร้านกาแฟที่สร้างภายหลังสถานี (ไม่มีในผังปี 2021): ชั้นเดียว กล่องสีขาวหลังคาแบน ขอบหลังคาสีขาวลึก หน้าร้านกระจกสีเขียวหันออกที่จอดรถ มีขั้นบันไดเตี้ยตลอดหน้าร้าน อยู่ปลายแถวอาคารด้านทางหลวง ทางตะวันตกของซุ้มร้านค้าและห้องน้ำ (Brian, 28 พ.ย. 2026) ขนาดประมาณ 6.8 × 4.2 ม. สูง 3.6 ม. ประมาณจากวิดีโอ']) }, V(39.2, 40.6, 4.4));
    add('buildings', tbox(6.6, 0.08, 2.2, 39.2, 42.72, 0.2, ROT_A), 'glassGreen', { en: 'Coffee shop front', th: 'หน้าร้านกาแฟ', nopick: 1 });
    add('paving', tbox(6.8, 0.6, 0.15, 39.2, 43.0, 0, ROT_A), 'walkway', { en: 'Coffee shop step', th: 'ขั้นหน้าร้านกาแฟ', nopick: 1 });

    // Coffee shop front and side (Brian's stills, video 7:55 and 8:02): dark-green awning over a timber deck with a low
    // bench step, artificial-grass strips in the paving; on its highway side a grey water tank and a food cart under a tent.
    add('buildings', merge([tbox(6.8, 1.6, 0.08, 39.2, 43.5, 2.9, ROT_A), ...[36.0, 42.4].map((x) => cylGeo(0.04, 2.9, x, 44.25, 0, 6))]), 'awningGreen', { en: 'Coffee shop awning', th: 'กันสาดร้านกาแฟ', kind: 'building',
      info: vid(['Dark-green awning on thin steel arms over the coffee shop front and its timber deck.'], ['กันสาดสีเขียวเข้มบนแขนเหล็กเหนือหน้าร้านกาแฟและพื้นไม้']) });
    add('paving', tbox(6.4, 1.2, 0.35, 39.2, 43.1, 0, ROT_A), 'deck', { en: 'Coffee shop timber deck', th: 'พื้นไม้หน้าร้านกาแฟ', nopick: 1 });
    add('water', cylGeo(0.6, 2.0, 35.1, 41.6, 0, 20), 'waterTankGrey', { en: 'Grey water tank (coffee shop)', th: 'ถังน้ำสีเทา (ร้านกาแฟ)', kind: 'tank',
      info: vid(['Grey plastic water tank (about 1,000 to 1,500 L) on the highway side of the coffee shop, with a pump and blue pipes at its foot.'], ['ถังน้ำพลาสติกสีเทา (ประมาณ 1,000 ถึง 1,500 ลิตร) ด้านทางหลวงของร้านกาแฟ มีปั๊มและท่อสีฟ้าที่ฐาน']) });
    add('buildings', merge([tbox(1.6, 0.9, 0.9, 34.6, 39.2, 0, ROT_A), cylGeo(0.03, 2.4, 34.6, 39.2, 0, 6), tbox(2.4, 2.4, 0.06, 34.6, 39.2, 2.3, ROT_A + 10)]), 'clutter', { en: 'Food cart under a tent', th: 'รถเข็นขายอาหารใต้เต็นท์', kind: 'building',
      info: vid(['Food cart with blue tubs and boxes under a brown sun tent, on the highway side of the coffee shop.'], ['รถเข็นขายอาหารพร้อมถังและกล่องสีฟ้า ใต้เต็นท์กันแดดสีน้ำตาล ด้านทางหลวงของร้านกาแฟ']) });

    // Lean-to sheds and storage behind the buildings (video 1:00 to 2:00, Brian's still at 8:06 and the lean-to beside the
    // red stall): metal-sheet roofs on light posts against the back walls and the boundary wall, used as stores and stall kitchens.
    const leanTo = (x0, x1, y0, y1, hi, lo, en, th, lines, linesTh) => add('buildings', merge([
      (() => { const g = tbox(x1 - x0, y1 - y0, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, (hi + lo) / 2, ROT_A); g.rotateX(0); return g; })(),
      ...[[x0 + 0.1, y0 + 0.1], [x1 - 0.1, y0 + 0.1]].map(([x, y]) => cylGeo(0.04, lo, x, y, 0, 6))]), 'roofSheet', { en, th, kind: 'building', info: vid(lines, linesTh) }, V((x0 + x1) / 2, (y0 + y1) / 2, hi + 0.6));
    leanTo(42.65, 44.05, 37.0, 41.9, 2.7, 2.5, 'Lean-to store between the coffee shop and building A', 'เพิงเก็บของระหว่างร้านกาแฟกับอาคาร A',
      ['Narrow metal-sheet lean-to over the alley between the coffee shop and the toilets, used as a store (crates, gas bottles, tables).'], ['เพิงหลังคาเมทัลชีทแคบ ๆ คลุมช่องทางระหว่างร้านกาแฟกับห้องน้ำ ใช้เก็บของ (ลัง ถังแก๊ส โต๊ะ)']);
    leanTo(44.4, 52.0, 36.55, 38.15, 2.6, 2.3, 'Tarp-roofed stall area behind building A', 'พื้นที่ร้านหลังคาผ้าใบหลังอาคาร A',
      ['Stall and kitchen space behind the 8 m wing of the toilets: tarp and sheet roof on posts, red sheet walls, cupboards, cool boxes and tables.'], ['พื้นที่ร้านและครัวหลังปีก 8 ม. ของห้องน้ำ หลังคาผ้าใบและเมทัลชีทบนเสา ผนังเมทัลชีทสีแดง ตู้ ถังน้ำแข็ง และโต๊ะ']);
    leanTo(66.2, 74.2, 36.55, 38.45, 2.8, 2.4, 'Lean-to stores behind the office (building B)', 'เพิงเก็บของหลังสำนักงาน (อาคาร B)',
      ['Metal-sheet lean-to along the back of the office, out to the boundary wall: small lockers and storage for the station staff and the stalls.'], ['เพิงหลังคาเมทัลชีทตามแนวหลังสำนักงานถึงกำแพงเขต เป็นตู้ล็อกเกอร์เล็กและที่เก็บของของพนักงานสถานีและร้านค้า']);
    add('buildings', merge([[67.2, 37.15], [68.2, 37.15], [69.2, 37.15], [72.4, 37.2]].map(([x, y]) => tbox(0.9, 0.55, 1.8, x, y, 0, ROT_A))), 'locker', { en: 'Lockers and storage cabinets behind the office', th: 'ตู้ล็อกเกอร์และตู้เก็บของหลังสำนักงาน', kind: 'building',
      info: vid(['Steel lockers and storage cabinets under the lean-to behind the office (number and sizes estimated).'], ['ตู้ล็อกเกอร์เหล็กและตู้เก็บของใต้เพิงหลังสำนักงาน (จำนวนและขนาดประมาณ)']) });

    // Benches, tables, bins, crates and umbrellas along the walkway and in the stall areas (video): clutter shown loosely
    const clutter = [];
    [47.2, 51.4, 58.6, 64.6, 69.0, 72.8].forEach((x) => clutter.push(tbox(1.6, 0.45, 0.45, x, 45.35, 0, ROT_A)));           // benches on the walkway
    [[64.3, 40.6], [64.3, 42.3], [46.5, 37.4]].forEach(([x, y]) => clutter.push(tbox(1.5, 0.75, 0.75, x, y, 0, ROT_A)));     // stall tables
    [[44.8, 44.7], [45.4, 44.7], [62.9, 44.8], [74.6, 44.9], [75.2, 44.9]].forEach(([x, y]) => clutter.push(cylGeo(0.3, 0.95, x, y, 0, 12)));   // wheelie bins
    [[43.4, 38.0], [43.4, 38.6], [49.5, 37.1], [50.2, 37.1], [70.6, 37.15], [71.3, 37.15]].forEach(([x, y]) => clutter.push(tbox(0.6, 0.45, 0.5, x, y, 0, 0)));   // crates and cool boxes
    add('buildings', merge(clutter), 'clutter', { en: 'Benches, tables, bins and crates', th: 'ม้านั่ง โต๊ะ ถังขยะ และลัง', kind: 'building',
      info: vid(['Benches along the walkway, tables in the stall areas, wheelie bins, crates and cool boxes, shown loosely to give an idea of how busy the area is. Not surveyed.'],
        ['ม้านั่งตามทางเดิน โต๊ะในพื้นที่ร้าน ถังขยะล้อเลื่อน ลังและถังน้ำแข็ง แสดงคร่าว ๆ ให้เห็นว่าพื้นที่มีของวางอยู่มาก ไม่ได้สำรวจ']) });
    add('buildings', merge([[54.2, 37.3], [56.4, 37.3]].map(([x, y]) => merge([cylGeo(0.03, 2.2, x, y, 0, 6), latheGeo([[0.02, 0], [1.2, -0.45], [0.01, -0.46]], x, y, 2.4, 16)]))), 'umbrellaBlue', { en: 'Market umbrellas behind building A', th: 'ร่มร้านค้าหลังอาคาร A', kind: 'building',
      info: vid(['Large blue market umbrellas over the stall area behind the toilets.'], ['ร่มร้านค้าสีน้ำเงินขนาดใหญ่เหนือพื้นที่ร้านหลังห้องน้ำ']) });
    add('buildings', merge([cylGeo(0.03, 2.4, 44.1, 42.2, 0, 6), latheGeo([[0.02, 0], [1.4, -0.6], [0.01, -0.61]], 44.1, 42.2, 2.9, 4)]), 'tentRed', { en: 'Red sun tent in the alley', th: 'เต็นท์สีแดงในช่องทาง', kind: 'building',
      info: vid(['Red pyramid sun tent over the alley between kiosk 1 and the toilets (Brian\'s still at 8:06).'], ['เต็นท์ทรงพีระมิดสีแดงคลุมช่องทางระหว่างซุ้มร้านค้า 1 กับห้องน้ำ (ภาพนิ่งของ Brian ที่ 8:06)']) });

    // Stall and kitchen area with sinks behind the buildings (video 1:00 to 1:50): a sheet-roofed area against the boundary
    // wall in the gap between buildings A and B, with two stainless sinks, each with a small under-sink grease trap.
    add('buildings', merge([tbox(4.0, 6.6, 0.1, 64.35, 39.9, 2.7, ROT_A), ...[[62.6, 36.8], [66.1, 36.8], [62.6, 43.0], [66.1, 43.0]].map(([x, y]) => cylGeo(0.05, 2.7, x, y, 0, 8))]), 'roof',
      { en: 'Sheet roof over the stall and kitchen area', th: 'หลังคาเมทัลชีทคลุมพื้นที่ร้านและครัว', kind: 'building',
        info: vid(['Metal-sheet roof on light posts over the stall and kitchen area behind the buildings (red sheet walls, tables, two sinks). Taken here as the 4 m gap between buildings A and B, out to the boundary wall; it may also run along the back of building A.'],
          ['หลังคาเมทัลชีทบนเสาเหล็กเบาคลุมพื้นที่ร้านและครัวหลังอาคาร (ผนังเมทัลชีทสีแดง โต๊ะ อ่างล้าง 2 อ่าง) ในที่นี้ถือว่าอยู่ในช่องกว้าง 4 ม. ระหว่างอาคาร A กับ B จนถึงกำแพงเขต อาจต่อยาวไปตามด้านหลังอาคาร A ด้วย']) }, V(64.35, 39.9, 3.4));
    [[63.3, 37.05], [65.0, 37.05]].forEach(([x, y], i) => {
      add('tanks', merge([tbox(1.2, 0.6, 0.12, x, y, 0.8, ROT_A), ...[[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]].map(([dx, dy]) => cylGeo(0.02, 0.8, x + dx, y + dy, 0, 6))]), 'fixture',
        { en: `Stall sink ${i + 1}`, th: `อ่างล้างร้านค้า ${i + 1}`, kind: 'tank', tag: i === 0 ? 'Stall sinks + small grease traps' : undefined, tagTh: i === 0 ? 'อ่างล้าง + ถังดักไขมันเล็ก' : undefined,
          info: vid(['Stainless single-bowl sink on legs against the boundary wall, used by the food stalls. Where its water goes is not known: probably to the site drain along the wall.'],
            ['อ่างล้างสแตนเลสหลุมเดียวมีขา ชิดกำแพงเขต ใช้โดยร้านอาหาร ไม่ทราบว่าน้ำทิ้งไปที่ใด น่าจะลงรางระบายน้ำตามแนวกำแพง']) }, i === 0 ? V(x, y, 1.6) : null);
      add('tanks', cylGeo(0.18, 0.35, x, y, 0.05, 16), 'grease', { en: `Under-sink grease trap ${i + 1}`, th: `ถังดักไขมันใต้อ่าง ${i + 1}`, kind: 'tank',
        info: vid(['Small plastic grease trap (about 20 to 30 L) standing under the sink. Size estimated.'], ['ถังดักไขมันพลาสติกขนาดเล็ก (ประมาณ 20 ถึง 30 ลิตร) วางใต้อ่าง ขนาดประมาณ']) });
    });

    // Garbage room (drawing GB-A-101, hidden-roof outline on the 2021 plan): open steel shelter with mesh doors and a sheet roof
    add('buildings', tbox(3.72, 2.19, 2.4, 102.85, 39.66, 0, 0.2), 'building', { en: 'Garbage room', th: 'ห้องพักขยะ', tag: 'Garbage room', tagTh: 'ห้องพักขยะ', kind: 'building',
      info: arc(['Garbage room: concrete floor, light steel frame with mesh doors on the parking side and a metal-sheet roof (as in the site video). 3.7 × 2.2 m on the 2021 plan; about 2.4 m to the eaves.'],
        ['ห้องพักขยะ: พื้นคอนกรีต โครงเหล็กเบา ประตูตะแกรงด้านที่จอดรถ หลังคาเมทัลชีท (ตามวิดีโอหน้างาน) ขนาด 3.7 × 2.2 ม. ตามผังปี 2021 สูงถึงชายคาประมาณ 2.4 ม.']) }, V(102.85, 39.66, 3.4));
    add('buildings', tbox(4.4, 2.8, 0.12, 102.85, 39.66, 2.5, 0.2), 'roof', { en: 'Garbage room roof', th: 'หลังคาห้องพักขยะ', nopick: 1 });

    // Clean-water tanks (2 × 10,000 L, circles of Ø2.0 m on the 2021 plan) inside a white slatted screen with a 1.2 m door
    [[89.67, 39.12], [92.32, 39.17]].forEach(([x, y], i) => add('water', cylGeo(1.0, 3.2, x, y, 0.15, 32), 'waterTank', { en: `Clean-water tank ${i + 1} (10,000 L)`, th: `ถังน้ำดี ${i + 1} (10,000 ลิตร)`, kind: 'tank',
      tag: i === 0 ? 'Clean-water tanks 2 × 10,000 L' : undefined, tagTh: i === 0 ? 'ถังน้ำดี 2 × 10,000 ลิตร' : undefined,
      info: arc(['Above-ground clean-water tank, 10,000 L, Ø2.0 m on the 2021 plan (written "Water Tank 10000L"); height about 3.2 m is assumed. Not wastewater: shown because it stands where digging might go.'],
        ['ถังน้ำดีบนดิน 10,000 ลิตร Ø2.0 ม. ตามผังปี 2021 (เขียนว่า "Water Tank 10000L") ความสูงประมาณ 3.2 ม. เป็นค่าสมมติ ไม่ใช่น้ำเสีย แสดงไว้เพราะตั้งอยู่ในแนวที่อาจต้องขุด']) }, i === 0 ? V(91, 39.15, 4.2) : null));
    {
      const x0 = 88.2, x1 = 93.8, y0 = 37.75, y1 = 40.55, h = 2.4, t = 0.08;
      add('buildings', merge([tbox(x1 - x0, t, h, (x0 + x1) / 2, y1, 0, 0), tbox(t, y1 - y0, h, x0, (y0 + y1) / 2, 0, 0), tbox(t, y1 - y0, h, x1, (y0 + y1) / 2, 0, 0), tbox(x1 - x0 - 1.4, t, h, (x0 + x1) / 2 + 0.7, y0, 0, 0)]), 'screen',
        { en: 'Screen wall round the clean-water tanks', th: 'ผนังบังถังน้ำดี', kind: 'building',
          info: arc(['Screen round the water tanks (drawing "ผนังบังถังน้ำดี"): steel posts with white composite-timber slats, a 1.2 × 2.0 m door. Taken as 2.4 m high round the two tanks; its exact outline is not on the 2021 plan.'],
            ['ผนังบังถังน้ำดี (แบบ "ผนังบังถังน้ำดี"): เสาเหล็กกรุไม้เทียมสีขาวเว้นร่อง ประตู 1.2 × 2.0 ม. ในที่นี้ถือว่าสูง 2.4 ม. ล้อมถังทั้งสองใบ แนวที่แน่นอนไม่มีในผังปี 2021']) });
    }

    // Pump canopy (building C): 39 × 9 m roof on the 2021 plan (the first model had it about 2.4 m too far north; the fuel
    // tanks were already right). Ceiling +5.50, top +6.50 (1 m fascia), four islands 1.2 × 8.0 m at 10 m centres.
    add('buildings', tbox(39.0, 9.0, 1.0, 43.92, 65.15, 5.2, 0), 'roof', { en: 'Pump canopy (building C)', th: 'หลังคาคลุมหัวจ่าย (อาคาร C)', tag: 'Building C (canopy)', tagTh: 'อาคาร C (หลังคาคลุมหัวจ่าย)', kind: 'building',
      info: arc(['Pump canopy, 39.0 × 9.0 m, 1.0 m deep fascia, ceiling about +5.20 and top about +6.20 above the road (+5.50 / +6.50 on drawing C-A-201). Four columns, one in each island, at 10 m centres.'],
        ['หลังคาคลุมหัวจ่าย 39.0 × 9.0 ม. ขอบหลังคาลึก 1.0 ม. ฝ้าประมาณ +5.20 และหลังคาสูงสุดประมาณ +6.20 จากระดับถนน (+5.50 / +6.50 ในแบบ C-A-201) เสา 4 ต้น อยู่กลางเกาะจ่ายแต่ละเกาะ ห่างกัน 10 ม.']) }, V(43.92, 65.15, 7.0));
    add('buildings', merge([28.92, 38.92, 48.92, 58.92].map((x) => cylGeo(0.25, 5.2, x, 65.15, 0, 16))), 'column', { en: 'Canopy columns', th: 'เสาหลังคาคลุมหัวจ่าย', nopick: 1 });
    add('buildings', merge([28.92, 38.92, 48.92, 58.92].map((x) => tbox(1.2, 8.0, 0.2, x, 65.15, 0, 0))), 'islands', { en: 'Pump islands', th: 'เกาะจ่ายน้ำมัน', kind: 'building',
      info: arc(['Four pump islands, 1.2 × 8.0 m, at 10 m centres under the canopy.'], ['เกาะจ่ายน้ำมัน 4 เกาะ ขนาด 1.2 × 8.0 ม. ห่างกัน 10 ม. ใต้หลังคา']) });
    add('buildings', prismGeo([[95.02, 55.23], [104.65, 54.80], [105.45, 72.40], [95.85, 72.80]], 0, 0.03), 'bayLine', { en: 'Second canopy area (dashed outline on the drawings, not built)', th: 'พื้นที่หลังคาคลุมหลังที่สอง (เส้นประในแบบ ยังไม่ก่อสร้าง)', kind: 'building',
      info: arc(['The 2019 and 2021 plans show a second canopy with two islands here in dashed lines. The site video shows open paving here, so it is drawn as a flat outline only.'], ['ผังปี 2019 และ 2021 แสดงหลังคาคลุมหลังที่สองพร้อมเกาะจ่าย 2 เกาะเป็นเส้นประ วิดีโอหน้างานเห็นเป็นลานเปิดโล่ง จึงแสดงเป็นเส้นขอบบนพื้นเท่านั้น']) });

    // Highway sign (HS-ST-002): 20.0 m, panel 4.60 m wide × 7.21 m on a single steel pipe; base outline on the 2021 plan
    add('buildings', cylGeo(0.4, 12.8, 15.0, 42.47, 0, 20), 'column', { en: 'Highway sign (20 m)', th: 'ป้ายเสาสูงริมทางหลวง (20 ม.)', tag: 'Highway sign (20 m)', tagTh: 'ป้ายริมทางหลวง (20 ม.)', kind: 'building',
      info: arc(['Caltex highway sign, 20.0 m high, panel 4.60 m wide and 7.21 m high on a single steel pipe column, piled footing (drawing HS-ST-002). Plain panel, no logo.'], ['ป้ายคาลเท็กซ์ริมทางหลวง สูง 20.0 ม. แผ่นป้ายกว้าง 4.60 ม. สูง 7.21 ม. บนเสาท่อเหล็กต้นเดียว ฐานรากเสาเข็ม (แบบ HS-ST-002) แสดงเป็นแผ่นเรียบไม่มีโลโก้']) }, V(15.0, 42.47, 20.6));
    add('buildings', tbox(4.6, 0.6, 7.21, 15.0, 42.47, 12.79, 0), 'signPanel', { en: 'Highway sign panel', th: 'แผ่นป้ายริมทางหลวง', nopick: 1 });
    // Price sign (PRICE SIGN sheet): 2.0 m wide, 8.0 m high, on the island by the entrance
    add('buildings', merge([tbox(2.0, 0.55, 5.3, 14.42, 65.03, 2.7, 0)]), 'signPanel', { en: 'Price sign (8 m)', th: 'ป้ายราคา (8 ม.)', tag: 'Price sign', tagTh: 'ป้ายราคา', kind: 'building',
      info: arc(['Price and product sign, 2.0 m wide and 8.0 m high, steel frame on a piled footing, by the entrance (drawing PRICE SIGN, 2019).'], ['ป้ายราคาและผลิตภัณฑ์ กว้าง 2.0 ม. สูง 8.0 ม. โครงเหล็กบนฐานรากเสาเข็ม ข้างทางเข้า (แบบ PRICE SIGN ปี 2019)']) }, V(14.42, 65.03, 8.6));
    add('buildings', merge([tbox(0.2, 0.2, 2.7, 13.62, 65.03, 0, 0), tbox(0.2, 0.2, 2.7, 15.22, 65.03, 0, 0)]), 'column', { en: 'Price sign posts', th: 'เสาป้ายราคา', nopick: 1 });

    // Car wash in the south-east plot (video 3:00 to 4:30): self-service bays against the plot's west wall near its north end
    // (red booth with coin units, a blue water tank and two coin vacuums) and a white self-service wash kiosk at the south end.
    add('buildings', merge([tbox(3.4, 1.4, 2.6, 107.2, 31.0, 0, 92), tbox(3.8, 2.6, 0.12, 107.9, 31.0, 2.7, 92)]), 'kiosk', { en: 'Car wash booth (red, coin)', th: 'ตู้ล้างรถหยอดเหรียญ (สีแดง)', tag: 'Car wash', tagTh: 'ล้างรถ', kind: 'building',
      info: vid(['Self-service coin car wash: red booth with coin units for water, foam and air on its front, a roof over the washing bay and a sign board on top. It stands against the west wall of the south-east plot near its north end, beside a blue plastic water tank.'],
        ['ล้างรถหยอดเหรียญแบบบริการตัวเอง: ตู้สีแดงมีเครื่องหยอดเหรียญน้ำ โฟม และลมด้านหน้า มีหลังคาคลุมช่องล้างและป้ายด้านบน ตั้งชิดกำแพงด้านตะวันตกของแปลงตะวันออกเฉียงใต้ใกล้ปลายด้านเหนือ ข้างถังน้ำพลาสติกสีน้ำเงิน']) }, V(107.2, 31.0, 3.6));
    add('water', cylGeo(0.6, 1.6, 106.7, 33.4, 0, 20), 'waterTank', { en: 'Car wash water tank', th: 'ถังน้ำล้างรถ', kind: 'tank',
      info: vid(['Blue plastic water tank (about 1,000 L) for the car wash.'], ['ถังน้ำพลาสติกสีน้ำเงิน (ประมาณ 1,000 ลิตร) สำหรับล้างรถ']) });
    add('buildings', merge([tbox(0.6, 0.5, 1.2, 106.4, 26.2, 0, 0), tbox(0.6, 0.5, 1.2, 106.4, 25.2, 0, 0)]), 'kiosk', { en: 'Coin vacuums', th: 'เครื่องดูดฝุ่นหยอดเหรียญ', kind: 'building',
      info: vid(['Two coin-operated vacuum cleaners against the west wall.'], ['เครื่องดูดฝุ่นหยอดเหรียญ 2 เครื่องชิดกำแพงด้านตะวันตก']) });
    add('buildings', merge([tbox(3.6, 2.4, 2.6, 116.0, 10.5, 0.15, 2), tbox(4.4, 3.2, 0.15, 116.0, 10.5, 2.8, 2), tbox(4.6, 3.4, 0.15, 116.0, 10.5, 0, 2)]), 'kioskWhite', { en: 'Wash kiosk (white, self-service)', th: 'ตู้ล้างรถบริการตัวเอง (สีขาว)', kind: 'building',
      info: vid(['White self-service car wash kiosk on a raised base with a roof overhang and coin units on its front, near the south end of the south-east plot.'],
        ['ตู้ล้างรถบริการตัวเองสีขาว ตั้งบนฐานยก มีหลังคายื่นและเครื่องหยอดเหรียญด้านหน้า ใกล้ปลายด้านใต้ของแปลงตะวันออกเฉียงใต้']) }, V(116.0, 10.5, 3.6));
  },
};
