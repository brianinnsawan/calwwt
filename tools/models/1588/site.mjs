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
  layers: ['tanks', 'sewer', 'drains', 'fuel', 'buildings',
    { id: 'asbuilt', en: 'Tank outlines on the as-built sheet (not named there)', th: 'แนวถังตามแบบก่อสร้างจริง (ในแบบไม่ระบุชื่อ)' }, 'plan', 'ground'],
  views: [
    { id: 'site', from: [66, -62, 85], to: [66, 44, 0] },
    { id: 'plan', from: [66, 46.9, 140], to: [66, 47, 0] },
    { id: 'a', en: 'Building A tanks', th: 'ถังที่อาคาร A', from: [52, 20.5, 13], to: [53, 38, -1] },
    { id: 'b', en: 'Building B tanks', th: 'ถังที่อาคาร B', from: [80.5, 26.5, 10], to: [76.3, 38.6, -1] },
    { id: 'garbage', en: 'Garbage room tank (design)', th: 'ถังที่ห้องพักขยะ (ตามแบบออกแบบ)', from: [103.5, 31.5, 6.5], to: [99.3, 39.8, -0.6] },
    { id: 'fuel', from: [85, 49, 6], to: [72.7, 65.8, -1.8] },
    { id: 'under', from: [58, 20, -8], to: [60, 38, -0.8] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, hcylGeo, prismGeo, pipeGeo, merge }) {
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

    // ---------- buildings and canopies (context)
    const centre = (poly) => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
    const building = (poly, h, o) => add('buildings', prismGeo(poly, 0, h), 'building', { ...o, kind: 'building', info: ab(o.lines || [], o.linesTh || [], C) }, V(...centre(poly), h + 0.7));
    building([[44.07, 38.20], [62.25, 38.35], [62.22, 43.75], [44.04, 43.62]], 3.5, { en: 'Building A (toilets)', th: 'อาคาร A (ห้องน้ำ)', tag: 'Building A', tagTh: 'อาคาร A' });
    building([[65.33, 38.52], [72.78, 38.58], [72.74, 44.00], [65.30, 43.95]], 3.5, { en: 'Building B', th: 'อาคาร B', tag: 'Building B', tagTh: 'อาคาร B' });
    building([[100.81, 38.52], [103.30, 38.54], [103.28, 40.69], [100.81, 40.67]], 2.6, { en: 'Small room (not named on the as-built sheet)', th: 'ห้องขนาดเล็ก (แบบก่อสร้างจริงไม่ระบุชื่อ)', tag: 'Small room', tagTh: 'ห้องขนาดเล็ก',
      lines: ['A room of 2.50 × 1.95 m with double doors. The garbage room of the 2019 design stood about 3 to 8 m west of here and is not on the as-built sheet, so this may be the garbage room as built.'], linesTh: ['ห้องขนาด 2.50 × 1.95 ม. มีประตูบานคู่ ห้องพักขยะตามแบบออกแบบปี 2019 อยู่ห่างไปทางตะวันตกประมาณ 3 ถึง 8 ม. และไม่มีในแบบก่อสร้างจริง ห้องนี้จึงอาจเป็นห้องพักขยะที่สร้างจริง'] });
    const roof = (poly, level, o) => add('buildings', prismGeo(poly, level, 0.9), 'roof', { ...o, kind: 'building', info: ab(o.lines, o.linesTh, C) }, V(...centre(poly), level + 1.6));
    roof([[24.66, 63.26], [63.26, 63.26], [63.26, 71.86], [24.66, 71.86]], 5.6, { en: 'Pump canopy (building C)', th: 'หลังคาคลุมหัวจ่าย (อาคาร C)', tag: 'Building C (canopy)', tagTh: 'อาคาร C (หลังคาคลุมหัวจ่าย)', lines: ['Canopy over the four pump islands.'], linesTh: ['หลังคาคลุมแท่นหัวจ่าย 4 แท่น'] });
    roof([[95.02, 55.23], [104.65, 54.80], [105.45, 72.40], [95.85, 72.80]], 5.6, { en: 'Second canopy (dashed outline on the as-built sheet)', th: 'หลังคาคลุมหลังที่สอง (เส้นประในแบบก่อสร้างจริง)', tag: 'Second canopy', tagTh: 'หลังคาคลุมหลังที่สอง', lines: ['Dashed outline over two diesel pump islands on the east side. Not on the 2019 design sheets.'], linesTh: ['แนวเส้นประคลุมแท่นหัวจ่ายดีเซล 2 แท่นด้านตะวันออก ไม่มีในแบบออกแบบปี 2019'] });
  },
};
