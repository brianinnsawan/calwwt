// 1156 Samut Prakan (Hitex Theppratarn Company Limited Branch 1): what the 3D model shows.
// Built by tools/models/build.mjs into public/sites/models/1156.glb.
//
// THERE ARE NO DRAWINGS OF THIS SITE (Brian's folder Sites\1156 Samut Prakan\03 Drawings is empty; Brian asked Thada).
// This first version is a rough model put together on 26 Nov 2026 from:
//   S  the Esri World Imagery satellite image (zoom 19, about 0.29 m a pixel), turned 35.5° so the road runs left to right,
//      with a 1 m grid laid over it to read positions and sizes (the image is the same one as the aerial in the Caltex deck);
//   K  the Caltex deck "Caltex WWT Improvement - All Sites" slides 27-28 (aerial with KFC, Toilet, Coffee, Canopy, Office,
//      Mini Big C and the sampling points G2.1 / G2.2 marked);
//   B  Brian's notes and stills from Aqua's 360° sampling video (Nov 2026, "Cal Samut Prakarn wwt Sampling"):
//      - the KFC tanks are in a line under the drive-through lane behind KFC; they drain to a sump with electric pumps that
//        pump the water towards the front of the station into the U-drain further along;
//      - (26 Nov 2026) the grease trap is one large tank with 4 lids; the treatment tank is one large tank with 5 lids (or
//        possibly two, with 2 and 3 lids: not sure); the room with the pumps is about midway along the KFC building;
//      - (26 Nov 2026, markups) the treatment tank is under the lane behind KFC, after (west of) the grease trap; (26 Nov 2026, Brian's stills) the drive-through runs: entry at the
//        front-west corner under a 2 m height limiter, north along the west side past the order point (roof, menu boards,
//        kerbed island), east behind KFC past the tanks, the grease trap and the pump room to the PAY HERE booth, then south
//        between KFC and the toilets past the pick-up window. The box first drawn at the west end of KFC was the order point.
//      - behind KFC, where the grease trap is, a rolling door opens to the room with the air pumps and controls;
//      - a small garbage room next to the toilets, on the exit side of the drive-through;
//      - the toilets have a solids (septic) tank between the building and the back firewall, and an aeration tank on the
//        exit (east) side, behind the women's side beyond the men's urinals;
//      - the fuel tank farm is between the toilets and the office / Mini Big C building, on the exit side;
//      - (26 Nov 2026) three fuel tanks lying parallel to the road, four products: one tank has two compartments;
//      - (26 Nov 2026) the entrance-side outlet is a three-chamber oil-water separator, like the exit side;
//      - the Mini Big C building's treatment tank is between the firewall / U-drain and the KFC and Caltex pole signs
//        (about 12 m tall), right behind the exit-side oil trap;
//      - a newer coffee shop at the front (entrance side); between it and KFC: air pump, EV chargers and parking.
// Coordinates: metres on the turned satellite image, x along the road (to the right = towards the exit side), y away from
// the road; (0, 0) is at 13.64117 N, 100.60475 E. Levels: no levels are known; the forecourt is shown flat at ±0.00.
// Every number here except the outlines read off the image is an assumption: say so in each note.
const A = 'aerial', AC = 'aerialContext';
const X0 = -34.2, X1 = 14.2, Y0 = -26.0, Y1 = 36.0;   // boundary read off the image (walls on three sides, road at the front)

export default {
  name: 'Samut Prakan',
  origin: [-10, 5],
  datum: { en: 'No levels are known for this site (no drawings): the forecourt is shown flat at ±0.00 and the road 0.20 m lower. Every depth is assumed.', th: 'ไม่ทราบระดับของสถานีนี้ (ไม่มีแบบ) แสดงลานสถานีเป็นพื้นราบที่ ±0.00 และถนนต่ำกว่า 0.20 ม. ความลึกทั้งหมดเป็นค่าสมมติ' },
  note: { en: 'Rough first version with NO DRAWINGS: outlines from the satellite image, what is where from Brian\'s notes and the Nov 2026 sampling video. Tank sizes, depths, pipe routes and levels are assumed. Not for digging or setting out.', th: 'ฉบับแรกแบบคร่าว ๆ ไม่มีแบบ: แนวอาคารจากภาพถ่ายดาวเทียม ตำแหน่งสิ่งต่าง ๆ จากบันทึกของ Brian และวิดีโอเก็บตัวอย่าง พ.ย. 2026 ขนาดถัง ความลึก แนวท่อ และระดับเป็นค่าสมมติ ห้ามใช้ขุดหรือวางผัง' },
  built: '2026-11-26',
  // North, anticlockwise from +x: the image was turned 35.5° anticlockwise to put the road along x, so north is 90 + 35.5.
  north: 125.5,
  boundary: [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]],
  ground: {
    bbox: [-44, -56, 24, 44], step: 2, apron: 2, road: -0.20,
    roadArea: [[-44, -56], [24, -56], [24, Y0], [-44, Y0]],
    points: [[-30, -20, 0], [10, -20, 0], [-30, 30, 0], [10, 30, 0], [-10, 5, 0]],
    names: { siteGround: { en: 'Forecourt (shown flat at ±0.00, no levels known)', th: 'ลานสถานี (แสดงเป็นพื้นราบที่ ±0.00 ไม่ทราบระดับ)' }, road: { en: 'Road side (frontage road)', th: 'ด้านถนน (ถนนคู่ขนาน)' } },
  },
  layers: ['tanks', 'sewer', 'drains', 'air', 'base', 'water', 'fuel', 'buildings', 'paving', 'surroundings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [-10, -72, 46], to: [-10, 6, 0] },
    { id: 'plan', from: [-10, 4.9, 120], to: [-10, 5, 0] },
    { id: 'kfc', en: 'KFC tanks and pump sump (drive-through lane)', th: 'ถัง KFC และบ่อสูบ (ช่องทางไดรฟ์ทรู)', from: [-30, 20, 12], to: [-18, 34, -1] },
    { id: 'entry', en: 'Drive-through entry: height limiter and order point', th: 'ทางเข้าไดรฟ์ทรู: โครงจำกัดความสูงและจุดสั่งอาหาร', from: [-37.5, 16.5, 5.0], to: [-29.5, 26.0, 1.5] },
    { id: 'pay', en: 'Behind KFC: pump room and pay window', th: 'หลัง KFC: ห้องปั๊มและช่องชำระเงิน', from: [-18.5, 35.8, 4.2], to: [-8.0, 33.6, 1.4] },
    { id: 'drive', en: 'Drive-through exit: pick-up window and toilets', th: 'ทางออกไดรฟ์ทรู: ช่องรับสินค้าและห้องน้ำ', from: [-0.5, 10.5, 6.5], to: [1.5, 27, 1.2] },
    { id: 'toilets', en: 'Toilet tanks (solids tank and aeration tank)', th: 'ถังของห้องน้ำ (ถังแยกกากและถังเติมอากาศ)', from: [-2, 14, 12], to: [9, 29, -1] },
    { id: 'sales', en: 'Mini Big C tank and exit-side oil trap', th: 'ถังของมินิบิ๊กซีและบ่อดักน้ำมันฝั่งทางออก', from: [-4, -42, 13], to: [12, -20, -1] },
    { id: 'fuel', from: [-6, -4, 10], to: [7, 9, -1.6] },
    { id: 'area', from: [-10, -150, 120], to: [-10, 0, 0] },
    { id: 'under', from: [-20, -40, -14], to: [-8, 10, -1] },
  ],

  build({ notes, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, prismGeo, pipeGeo, merge }) {
    const r2 = (n) => Math.round(n * 100) / 100;
    const lines = notes;
    const pipe = (layer, pts, r, material, o) => { const g = pipeGeo(pts, r); if (typeof o.info === 'function') o = { ...o, info: o.info(Math.round(g.length)) }; add(layer, g.geometry, material, o, o.tagAt ? V(...o.tagAt) : null); return g; };
    const lid = (x, y, top, r, name, nameTh, layer = 'tanks', mat = 'tank') => {
      const gm = ground(x, y);
      if (gm > top) add(layer, cylGeo(r, gm - top, x, y, top), mat, { en: name, th: nameTh, nopick: 1 });
      add(layer, cylGeo(r + 0.03, 0.03, x, y, gm), 'cover', { en: name, th: nameTh, nopick: 1 });
    };
    const plate = (x, y, w, l, name, nameTh, layer = 'tanks') => add(layer, boxGeo(w, l, 0.03, x, y, ground(x, y), 0), 'cover', { en: name, th: nameTh, nopick: 1 });
    const ASSUMED = { en: 'Route, size and level are assumed (not seen; no drawings): shown about 0.4 m under the ground, falling to where it goes.', th: 'แนวท่อ ขนาด และระดับเป็นค่าสมมติ (มองไม่เห็นและไม่มีแบบ) แสดงลึกประมาณ 0.4 ม. ลาดไปยังจุดที่ระบายออก' };
    const VIDEO = { en: 'Seen in Aqua\'s sampling video (Nov 2026).', th: 'เห็นในวิดีโอเก็บตัวอย่างของ Aqua (พ.ย. 2026)' };

    // ---------- U-drains round the site (open channels with gratings, seen in the video along the back wall, the front kerb,
    // the east wall and the coffee shop; the Caltex deck draws the same lines). Shown as 0.30 m channels, bottom 0.40 m below
    // ground at the far end, falling 1:200 to the two outlets at the road. Which way each part flows is assumed.
    const W = X0 + 0.5, E = X1 - 0.45, F = Y0 + 0.55, R = Y1 - 0.45, FALL = 1 / 200, START = -0.40;
    const runs = [
      { id: 'back', pts: [[-1.0, R], [W, R]], en: 'along the back wall behind the KFC drive-through (grated)', th: 'ตามแนวกำแพงด้านหลัง หลังช่องทางไดรฟ์ทรู KFC (มีตะแกรง)' },
      { id: 'west', pts: [[W, R], [W, F]], en: 'along the west wall to the front (entrance side)', th: 'ตามแนวกำแพงด้านตะวันตกไปด้านหน้า (ฝั่งทางเข้า)' },
      { id: 'front-w', pts: [[-10.0, F], [W + 0.6, F]], en: 'along the front kerb, west part, to the entrance-side outlet', th: 'ตามขอบหน้าสถานี ช่วงตะวันตก ไปบ่อทางออกฝั่งทางเข้า' },
      { id: 'front-e', pts: [[-10.0, F], [E - 0.8, F]], en: 'along the front kerb, east part, to the exit-side oil trap', th: 'ตามขอบหน้าสถานี ช่วงตะวันออก ไปบ่อดักน้ำมันฝั่งทางออก' },
      { id: 'east', pts: [[E, R], [E, -22.6]], en: 'along the east wall (exit side) to the exit-side oil trap', th: 'ตามแนวกำแพงด้านตะวันออก (ฝั่งทางออก) ไปบ่อดักน้ำมันฝั่งทางออก' },
    ];
    const ul = {};   // level of the channel bottom at a point, for joining pipes
    const levelAlong = (run) => { let L = START; const out = [[...run.pts[0], L]]; for (let i = 1; i < run.pts.length; i++) { L = r2(L - Math.hypot(run.pts[i][0] - run.pts[i - 1][0], run.pts[i][1] - run.pts[i - 1][1]) * FALL); out.push([...run.pts[i], L]); } return out; };
    const west = levelAlong(runs[1]);
    runs[1].start = START; runs[0].end = START;   // the back channel runs into the west channel at the corner
    for (const run of runs) {
      let out = levelAlong(run);
      if (run.id === 'back') { const L = out.length; out = out.map((p, i) => [p[0], p[1], r2(START + (L - 1 - i) * 0 + (p[0] - W) * FALL)]); }
      if (run.id === 'front-w') { const tail = west[west.length - 1][2]; out = out.map((p) => [p[0], p[1], r2(Math.min(p[2], tail + (p[0] - W) * FALL))]); }
      run.out = out;
      // open concrete U-channel (not a pipe): 0.30 m wide inside, 0.08 m walls and floor, built in 2 m pieces that step down
      // with the fall; open at the top under the gratings
      const UW = 0.30, UT = 0.08, parts = [];
      let ulen = 0;
      for (let k = 1; k < out.length; k++) {
        const [ax, ay, al] = out[k - 1], [bx, by, bl] = out[k], L = Math.hypot(bx - ax, by - ay), rot = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
        const n = Math.max(1, Math.ceil(L / 2)), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
        for (let q = 0; q < n; q++) {
          const t = (q + 0.5) / n, cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t, bot = al + (bl - al) * t, g0 = ground(cx, cy), seg = L / n + 0.01;
          parts.push(boxGeo(seg, UW + 2 * UT, UT, cx, cy, bot - UT, rot));   // floor
          for (const sd of [-1, 1]) parts.push(boxGeo(seg, UT, g0 - (bot - UT), cx + nx * sd * (UW + UT) / 2, cy + ny * sd * (UW + UT) / 2, bot - UT, rot));   // side walls
        }
        ulen += L;
      }
      const m = Math.round(ulen);
      add('drains', merge(parts), 'drain', { en: `U-drain: ${run.en}`, th: `รางระบายน้ำ (ยู): ${run.th}`, kind: 'drain',
        info: lines([`Open concrete U-drain (a channel, not a pipe; Brian, 26 Nov 2026) about 0.30 m wide inside, with gratings, about ${m} m. Wall and floor thickness assumed (0.08 m). Bottom shown from about ${lv(out[0][2])} to about ${lv(out[out.length - 1][2])} (assumed: 0.40 m deep at the far end, falling 1:200; which way it flows is assumed).`, VIDEO.en],
          [`รางระบายน้ำ คสล. รูปตัวยูแบบเปิด (เป็นราง ไม่ใช่ท่อ ตาม Brian 26 พ.ย. 2026) กว้างภายในประมาณ 0.30 ม. มีฝาตะแกรง ยาวประมาณ ${m} ม. ความหนาผนังและพื้นรางเป็นค่าสมมติ (0.08 ม.) ก้นรางแสดงจากประมาณ ${lv(out[0][2])} ถึงประมาณ ${lv(out[out.length - 1][2])} (ค่าสมมติ: ลึก 0.40 ม. ที่ปลายต้นราง ลาด 1:200 ทิศการไหลเป็นค่าสมมติ)`, VIDEO.th], A) });
      for (let i = 1; i < out.length; i++) {
        const [ax, ay] = out[i - 1], [bx, by] = out[i], len = Math.hypot(bx - ax, by - ay);
        add('drains', boxGeo(Math.abs(bx - ax) > 0.01 ? len : 0.42, Math.abs(by - ay) > 0.01 ? len : 0.42, 0.03, (ax + bx) / 2, (ay + by) / 2, 0, 0), 'cover', { en: 'U-drain grating', th: 'ฝาตะแกรงรางระบายน้ำ', nopick: 1 });
      }
    }
    ul.west = (y) => r2(START - (R - y) * FALL);
    ul.east = (y) => r2(START - (R - y) * FALL);

    // ---------- the two outlets at the road (Caltex deck: existing sampling points G2.1 at both front corners)
    const outlets = [
      { x: X0 + 0.75, y: Y0 + 2.0, w: 1.0, l: 3.4, chambers: 3, inL: Math.min(runs[1].out[1][2], runs[2].out[1][2]), en: 'Oil-water separator, 3 chambers (entrance side, by the coffee shop)', th: 'บ่อดักน้ำมัน 3 ช่อง (ฝั่งทางเข้า ข้างร้านกาแฟ)', tag: 'Oil trap (entrance side)', tagTh: 'บ่อดักน้ำมัน (ฝั่งทางเข้า)', oil: 1,
        lines: ['Where the west U-drain and the west half of the front drain leave the site, at the front-left corner. The Caltex deck marks the existing sampling point G2.1 here and a new point G2.2 at the coffee shop beside it.', 'Brian (26 Nov 2026): a three-chamber oil-water separator. Size not known: shown as the usual Caltex 3-chamber trap, 3.40 × 1.00 m, lying along the west firewall at the front corner (Brian, 26 Nov 2026).'],
        linesTh: ['จุดที่รางด้านตะวันตกและรางหน้าสถานีช่วงตะวันตกออกจากสถานี ที่มุมหน้าซ้าย ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างเดิม G2.1 ที่นี่ และจุดใหม่ G2.2 ที่ร้านกาแฟข้าง ๆ', 'Brian (26 พ.ย. 2026): เป็นบ่อดักน้ำมัน 3 ช่อง ไม่ทราบขนาด แสดงเป็นบ่อดักน้ำมัน 3 ช่องแบบมาตรฐานของ Caltex ขนาด 3.40 × 1.00 ม. วางตามแนวกำแพงกันไฟด้านตะวันตกที่มุมหน้า (ตาม Brian 26 พ.ย. 2026)'] },
      { x: 12.95, y: -23.6, w: 1.3, l: 2.6, inL: Math.min(runs[3].out[1][2], runs[4].out[1][2]), en: 'Oil trap (exit side)', th: 'บ่อดักน้ำมัน (ฝั่งทางออก)', tag: 'Oil trap (exit side)', tagTh: 'บ่อดักน้ำมัน (ฝั่งทางออก)', oil: 1,
        lines: ['Grated pit with two concrete plank covers against the east wall at the road (video, 3:38), where the east U-drain and the east half of the front drain meet. Size read from the video, about 1.3 × 2.6 m.', 'The Caltex deck marks the existing sampling point G2.1 here. The Mini Big C treatment tank is right behind it (Brian).'],
        linesTh: ['บ่อมีฝาตะแกรงและแผ่นคอนกรีต 2 แผ่น ชิดกำแพงด้านตะวันออกที่ริมถนน (วิดีโอ 3:38) จุดที่รางด้านตะวันออกและรางหน้าสถานีช่วงตะวันออกมาบรรจบ ขนาดประมาณจากวิดีโอ ประมาณ 1.3 × 2.6 ม.', 'ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างเดิม G2.1 ที่นี่ ถังบำบัดของมินิบิ๊กซีอยู่ด้านหลังบ่อนี้ทันที (ตาม Brian)'] },
    ];
    for (const o of outlets) {
      const g0 = ground(o.x, o.y), inL = r2(o.inL), floor = r2(inL - 0.5), outL = r2(inL - 0.05);
      add('drains', boxGeo(o.w, o.l, g0 - floor, o.x, o.y, floor, 0), o.oil ? 'oilTrap' : 'manhole', { en: o.en, th: o.th, tag: o.tag, tagTh: o.tagTh, lvl: `${lv(inL)} / ${lv(outL)}`, kind: 'manhole',
        info: lines([...o.lines, `Levels not known: inlet about ${lv(inL)}, outlet about ${lv(outL)}, floor shown 0.5 m below the inlet (assumed).`], [...o.linesTh, `ไม่ทราบระดับ: ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} ก้นบ่อแสดงต่ำกว่าท่อเข้า 0.5 ม. (ค่าสมมติ)`], A) }, V(o.x, o.y, g0 + 0.8));
      if (o.chambers) {   // three chambers along the long side (y): a grating over each, and the two baffle walls inside
        const cw = o.l / o.chambers;
        for (let k = 0; k < o.chambers; k++) add('drains', boxGeo(o.w - 0.12, cw - 0.12, 0.03, o.x, o.y - o.l / 2 + cw * (k + 0.5), g0, 0), 'cover', { en: 'Steel grating', th: 'ฝาตะแกรงเหล็ก', nopick: 1 });
        for (let k = 1; k < o.chambers; k++) add('drains', boxGeo(o.w - 0.1, 0.1, g0 - 0.15 - floor, o.x, o.y - o.l / 2 + cw * k, floor, 0), 'cover', { en: 'Baffle wall', th: 'ผนังกั้น', nopick: 1 });
      } else add('drains', boxGeo(o.w + 0.1, o.l + 0.1, 0.03, o.x, o.y, g0, 0), 'cover', { en: 'Grating', th: 'ฝาตะแกรง', nopick: 1 });
      pipe('drains', [[o.x, o.y - o.l / 2, outL], [o.x, Y0 - 2.5, r2(outL - 0.05)]], 0.15, 'drain', { en: `${o.tag}: out to the public drain`, th: `${o.tagTh}: ออกท่อระบายน้ำสาธารณะ`, kind: 'drain',
        info: lines(['Out under the road edge to the public drain. Size, route and level assumed.'], ['ออกใต้ขอบถนนไปท่อระบายน้ำสาธารณะ ขนาด แนว และระดับเป็นค่าสมมติ'], A) });
    }

    // ---------- KFC: one grease trap and one treatment tank in a line under the drive-through lane behind KFC, the pump /
    // blower room midway along the back of KFC, pump sump at the back-west corner (Brian, 26 Nov 2026)
    const LANE = 34.3;   // middle of the drive-through lane behind KFC (between the building, about y 32.5, and the back wall)
    const ROOM_X = -15.2;   // the room with the pumps and controls, about midway along KFC (x -28 to -4)
    {
      const top = r2(ground(-18, LANE) - 0.35);
      // grease trap: one large lying tank with four lids, east of the treatment tank, next to the pump room
      const gR = 0.7, gX = -13.9, gLen = 5.4, gAxis = top - gR, gIn = r2(top - 0.2), gOut = r2(gIn - 0.05);
      add('tanks', capsuleGeo(gR, gLen, gX, LANE, gAxis, 0, 0.2), 'grease', { en: 'KFC grease trap (one large tank, 4 lids)', th: 'ถังดักไขมัน KFC (ถังใหญ่ 1 ถัง 4 ฝา)', tag: 'KFC grease trap', tagTh: 'ถังดักไขมัน KFC', kind: 'tank', lvl: `${lv(gIn)} / ${lv(gOut)}`,
        info: lines(['Grease trap for the KFC kitchen: one large tank with four lids under the drive-through lane, by the rolling door to the pump room (Brian, 26 Nov 2026).', `Type and size are not known: shown as a lying tank ${(gR * 2).toFixed(1)} m across and ${gLen.toFixed(1)} m long, top about ${lv(top)}. Takes the kitchen water; out west to the treatment tank.`],
          ['ถังดักไขมันของครัว KFC: ถังใหญ่ 1 ถัง มี 4 ฝา ใต้ช่องทางไดรฟ์ทรู ข้างประตูม้วนของห้องปั๊ม (ตาม Brian 26 พ.ย. 2026)', `ไม่ทราบรุ่นและขนาด แสดงเป็นถังนอน กว้าง ${(gR * 2).toFixed(1)} ม. ยาว ${gLen.toFixed(1)} ม. หลังถังประมาณ ${lv(top)} รับน้ำจากครัว ออกไปทางตะวันตกเข้าถังบำบัด`], A) }, V(gX, LANE, ground(gX, LANE) + 0.8));
      for (const lx of [-16.0, -14.6, -13.2, -11.8]) lid(lx, LANE, top, 0.3, 'Grease trap lid', 'ฝาถังดักไขมัน');
      // treatment tank: one large lying tank with five lids under the lane behind KFC, west of (after) the grease trap
      // (Brian's markup, 26 Nov 2026)
      const tR = 1.0, tX = -22.5, tY = LANE, tLen = 8.6, tTop = r2(ground(tX, tY) - 0.35), tAxis = tTop - tR, tIn = r2(gOut - 0.05), tOut = r2(tIn - 0.1);
      add('tanks', capsuleGeo(tR, tLen, tX, tY, tAxis, 0, 0.25), 'tank', { en: 'KFC treatment tank (one large tank, 5 lids)', th: 'ถังบำบัด KFC (ถังใหญ่ 1 ถัง 5 ฝา)', tag: 'KFC treatment tank', tagTh: 'ถังบำบัด KFC', kind: 'tank', lvl: `${lv(tIn)} / ${lv(tOut)}`,
        info: lines(['KFC\'s treatment tank, under the drive-through lane behind KFC, after the grease trap (west of it), towards the pump sump in the back-west corner (Brian\'s markup, 26 Nov 2026). Brian: one large tank with five lids, or possibly two tanks, one with two lids and one with three: not sure. Shown as one tank.',
          `Type and size are not known: shown as a lying tank ${(tR * 2).toFixed(1)} m across and ${tLen.toFixed(1)} m long along the lane, top about ${lv(tTop)} (0.35 m under the lane), pipe in about ${lv(tIn)} at the east end (assumed). Out at the west end, along the lane to the pump sump.`,
          'The blowers and controls are in the room behind the rolling door, about midway along the back of KFC (Brian).'],
          ['ถังบำบัดของ KFC ใต้ช่องทางไดรฟ์ทรูหลัง KFC ต่อจากถังดักไขมัน (ด้านตะวันตกของถังดักไขมัน) ไปทางบ่อสูบที่มุมหลังด้านตะวันตก (ตามที่ Brian ระบุในภาพ 26 พ.ย. 2026) Brian: ถังใหญ่ 1 ถัง มี 5 ฝา หรืออาจเป็น 2 ถัง (ถังหนึ่ง 2 ฝา อีกถัง 3 ฝา) ยังไม่แน่ใจ แสดงเป็น 1 ถัง',
            `ไม่ทราบรุ่นและขนาด แสดงเป็นถังนอนตามแนวช่องทาง กว้าง ${(tR * 2).toFixed(1)} ม. ยาว ${tLen.toFixed(1)} ม. หลังถังประมาณ ${lv(tTop)} (ต่ำกว่าช่องทาง 0.35 ม.) ท่อเข้าประมาณ ${lv(tIn)} ที่ปลายด้านตะวันออก (ค่าสมมติ) ออกที่ปลายด้านตะวันตก เดินตามช่องทางไปบ่อสูบ`,
            'เครื่องเป่าลมและตู้ควบคุมอยู่ในห้องหลังประตูม้วน ประมาณกึ่งกลางด้านหลัง KFC (ตาม Brian)'], A) }, V(tX, tY, ground(tX, tY) + 0.8));
      for (const lx of [-25.9, -24.2, -22.5, -20.8, -19.1]) lid(lx, tY, tTop, 0.3, 'Treatment tank lid', 'ฝาถังบำบัด');
      add('base', boxGeo(5.8, 2.0, 0.2, gX, LANE, gAxis - gR - 0.2, 0), 'slab', { en: 'KFC grease trap base (assumed)', th: 'ฐานถังดักไขมัน KFC (ค่าสมมติ)', kind: 'base', info: lines(['A concrete base under the grease trap is assumed; not seen.'], ['ฐานคอนกรีตใต้ถังดักไขมันเป็นค่าสมมติ มองไม่เห็น'], A) });
      add('base', boxGeo(9.0, 2.4, 0.2, tX, tY, tAxis - tR - 0.2, 0), 'slab', { en: 'KFC treatment tank base (assumed)', th: 'ฐานถังบำบัด KFC (ค่าสมมติ)', kind: 'base', info: lines(['A concrete base under the treatment tank is assumed; not seen.'], ['ฐานคอนกรีตใต้ถังบำบัดเป็นค่าสมมติ มองไม่เห็น'], A) });
      // pipes: kitchen -> grease trap -> treatment tank -> sump
      pipe('sewer', [[-11.0, 32.5, gIn + 0.08], [-11.0, LANE, gIn + 0.04], [gX + gLen / 2, LANE, gIn]], 0.05, 'sewerRaw', { en: 'KFC kitchen to the grease trap', th: 'ท่อจากครัว KFC ไปถังดักไขมัน', kind: 'pipe', info: lines(['4" pipe from the kitchen out through the back wall.', ASSUMED.en], ['ท่อ 4 นิ้วจากครัวออกผ่านผนังด้านหลัง', ASSUMED.th], A) });
      pipe('sewer', [[gX - gLen / 2, LANE, gOut], [tX + tLen / 2, LANE, tIn]], 0.05, 'sewerRaw', { en: 'Grease trap to the treatment tank', th: 'ท่อจากถังดักไขมันไปถังบำบัด', kind: 'pipe', info: lines(['4" pipe.', ASSUMED.en], ['ท่อ 4 นิ้ว', ASSUMED.th], A) });
      const sx = X0 + 1.3, sy = 34.6, sTop = ground(sx, sy), sFloor = r2(tOut - 1.5), outT = tOut;
      pipe('sewer', [[tX - tLen / 2, LANE, outT], [sx + 0.6, LANE, r2(outT - 0.06)], [sx + 0.6, sy, r2(outT - 0.07)]], 0.05, 'sewerTreated', { en: 'KFC treatment tank to the pump sump', th: 'ท่อจากถังบำบัด KFC ไปบ่อสูบ', kind: 'pipe', info: lines(['From the west end of the treatment tank along the lane to the sump.', ASSUMED.en], ['จากปลายด้านตะวันตกของถังบำบัดตามช่องทางไปบ่อสูบ', ASSUMED.th], A) });
      add('tanks', boxGeo(1.2, 1.6, sTop - sFloor, sx, sy, sFloor, 0), 'manhole', { en: 'KFC pump sump (electric pumps)', th: 'บ่อสูบ KFC (ปั๊มไฟฟ้า)', tag: 'KFC pump sump', tagTh: 'บ่อสูบ KFC', lvl: lv(outT), kind: 'manhole',
        info: lines(['The KFC tanks drain to a sump with electric pumps, which pump the water towards the front of the station into the U-drain further along (Brian). Shown at the back-west corner of the lane: the video (1:40) shows a large grating there with blue PVC pipes coming up, next to an electrical box. The Caltex deck marks a new sampling point G2.2 here.',
          `Size and depth assumed: 1.2 × 1.6 m, floor about ${lv(sFloor)}.`],
          ['ถัง KFC ระบายลงบ่อสูบที่มีปั๊มไฟฟ้า ซึ่งสูบน้ำไปทางด้านหน้าสถานีลงรางระบายน้ำ (ตาม Brian) แสดงที่มุมหลังด้านตะวันตกของช่องทาง ในวิดีโอ (1:40) เห็นฝาตะแกรงขนาดใหญ่ที่มีท่อ PVC สีฟ้าโผล่ขึ้นมา ข้างตู้ไฟฟ้า ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างใหม่ G2.2 ที่นี่',
            `ขนาดและความลึกเป็นค่าสมมติ 1.2 × 1.6 ม. ก้นบ่อประมาณ ${lv(sFloor)}`], A) }, V(sx, sy, sTop + 0.8));
      plate(sx, sy, 1.3, 1.7, 'Sump grating', 'ฝาตะแกรงบ่อสูบ');
      for (const dy of [-0.4, 0.4]) add('tanks', cylGeo(0.12, 0.6, sx, sy + dy, sFloor), 'fixture', { en: 'Pump', th: 'ปั๊ม', nopick: 1 });
      // the pumped line: blue PVC along the foot of the west wall (video 1:31), into the west U-drain further along
      const dy = 16.0;
      pipe('sewer', [[sx, sy, sTop + 0.3], [X0 + 0.25, sy, 0.12], [X0 + 0.25, dy, 0.12], [W, dy, ul.west(dy) + 0.25]], 0.03, 'pvcAbove', { en: 'KFC pumped line (blue PVC along the west wall)', th: 'ท่อส่งน้ำจากปั๊ม KFC (PVC สีฟ้าตามกำแพงด้านตะวันตก)', tag: 'KFC pumped line', tagTh: 'ท่อส่งจากปั๊ม KFC', tagAt: [X0 + 0.3, 25, 1.2], kind: 'pipe',
        info: (m) => lines([`Pumped water from the KFC sump towards the front, into the U-drain further along (Brian). Shown as the blue PVC pipe lying along the foot of the west wall in the video (1:31), about ${m} m, emptying into the west U-drain south of KFC.`, 'Where it actually empties into the U-drain is not known: check on site.'],
          [`น้ำที่สูบจากบ่อสูบ KFC ส่งไปทางด้านหน้าลงรางระบายน้ำ (ตาม Brian) แสดงเป็นท่อ PVC สีฟ้าวางตามโคนกำแพงด้านตะวันตกในวิดีโอ (1:31) ยาวประมาณ ${m} ม. ปล่อยลงรางด้านตะวันตกทางใต้ของ KFC`, 'ไม่ทราบจุดที่ปล่อยลงรางจริง ต้องตรวจสอบหน้างาน'], A) });
      // blowers and controls behind the rolling door
      add('air', boxGeo(1.6, 0.6, 0.8, ROOM_X, 31.9, 0.15, 0), 'airPump', { en: 'KFC pump room: air pumps and controls (behind the rolling door)', th: 'ห้องปั๊ม KFC: เครื่องเป่าลมและตู้ควบคุม (หลังประตูม้วน)', tag: 'KFC pump room', tagTh: 'ห้องปั๊ม KFC', kind: 'tank',
        info: lines(['Behind the rolling door at the back of KFC, by the grease trap, is the room with the air pumps and controls, about midway along the KFC building (Brian, 26 Nov 2026; video 2:00-2:04). Shown as one box; how many and which pumps are not known. The air pipe route to the tanks is not known and not drawn.'],
          ['หลังประตูม้วนด้านหลัง KFC ข้างถังดักไขมัน เป็นห้องเครื่องเป่าลมและตู้ควบคุม ประมาณกึ่งกลางอาคาร KFC (ตาม Brian 26 พ.ย. 2026 วิดีโอ 2:00-2:04) แสดงเป็นกล่องเดียว ไม่ทราบจำนวนและรุ่น ไม่ทราบแนวท่อลมไปถังจึงไม่ได้แสดง'], A) });
      add('buildings', boxGeo(2.6, 0.08, 2.8, ROOM_X, 32.55, 0.15, 0), 'cover', { en: 'Rolling door to the KFC pump room', th: 'ประตูม้วนห้องปั๊ม KFC', kind: 'building',
        info: lines(['Metal rolling door at the back of KFC, about midway along the building, open to the room with the air pumps and controls (Brian; video 2:00-2:04). Width judged from the video.'], ['ประตูม้วนเหล็กด้านหลัง KFC ประมาณกึ่งกลางอาคาร เปิดเข้าห้องเครื่องเป่าลมและตู้ควบคุม (ตาม Brian วิดีโอ 2:00-2:04) ความกว้างประมาณจากวิดีโอ'], AC) });
    }

    // ---------- toilets: solids tank between the building and the back firewall; aeration tank on the exit (east) side
    {
      const sy = 34.3, r = 0.75, len = 6.0, sx = 6.6, top = r2(ground(sx, sy) - 0.25), axis = top - r, inL = r2(top - 0.2), outL = r2(inL - 0.1);
      add('tanks', capsuleGeo(r, len, sx, sy, axis, 0, 0.25), 'tank', { en: 'Toilet solids tank (septic), behind the toilets', th: 'ถังแยกกาก (ถังเกรอะ) ของห้องน้ำ หลังห้องน้ำ', tag: 'Toilet solids tank', tagTh: 'ถังแยกกากห้องน้ำ', kind: 'tank',
        info: lines(['The toilets\' solids (septic) tank, in the strip between the toilet building and the back firewall (Brian; video 2:21: three square chequer-plate covers in a row, a beige water tank at the end). Type and size not known: shown as a lying tank 1.5 m across and 6.0 m long under the three covers.',
          `Top shown about ${lv(top)}, pipe in about ${lv(inL)} at the west end, out about ${lv(outL)} at the east end to the aeration tank (assumed).`],
          ['ถังแยกกาก (ถังเกรอะ) ของห้องน้ำ อยู่ในช่องระหว่างอาคารห้องน้ำกับกำแพงกันไฟด้านหลัง (ตาม Brian วิดีโอ 2:21: ฝาแผ่นเหล็กลายสี่เหลี่ยม 3 ฝาเรียงกัน มีถังน้ำสีเบจที่ปลาย) ไม่ทราบชนิดและขนาด แสดงเป็นถังนอน กว้าง 1.5 ม. ยาว 6.0 ม. ใต้ฝาทั้งสาม',
            `หลังถังแสดงประมาณ ${lv(top)} ท่อเข้าประมาณ ${lv(inL)} ที่ปลายด้านตะวันตก ท่อออกประมาณ ${lv(outL)} ที่ปลายด้านตะวันออกไปถังเติมอากาศ (ค่าสมมติ)`], A) }, V(sx, sy, ground(sx, sy) + 0.8));
      for (const px of [4.4, 6.6, 8.8]) plate(px, sy, 1.1, 1.0, 'Chequer-plate cover', 'ฝาแผ่นเหล็กลาย');
      pipe('sewer', [[4.0, 32.4, inL + 0.12], [3.6, sy, inL]], 0.05, 'sewerRaw', { en: 'Toilets to the solids tank', th: 'ท่อจากห้องน้ำไปถังแยกกาก', kind: 'pipe', info: lines(['4" pipe from the toilets out of the back wall.', ASSUMED.en], ['ท่อ 4 นิ้วจากห้องน้ำออกผนังด้านหลัง', ASSUMED.th], A) });
      // aeration tank on the east side, behind the women's side beyond the men's urinals (video 2:43-2:48: slab with chequer
      // plates and two blowers in the grass strip by the east wall)
      const ax = 12.95, ay = 23.9, ar = 0.65, alen = 4.2, atop = r2(ground(ax, ay) - 0.15), aaxis = atop - ar, aIn = r2(outL - 0.12), aOut = r2(aIn - 0.1);
      pipe('sewer', [[9.6, sy, outL], [12.95, sy, r2(outL - 0.04)], [ax, ay + alen / 2 + 0.1, aIn]], 0.05, 'sewerRaw', { en: 'Solids tank to the aeration tank', th: 'ท่อจากถังแยกกากไปถังเติมอากาศ', kind: 'pipe',
        info: (m) => lines([`Round the back-east corner of the toilets to the aeration tank. About ${m} m.`, ASSUMED.en], [`อ้อมมุมหลังด้านตะวันออกของห้องน้ำไปถังเติมอากาศ ยาวประมาณ ${m} ม.`, ASSUMED.th], A) });
      add('tanks', capsuleGeo(ar, alen, ax, ay, aaxis, 90, 0.25), 'tank', { en: 'Toilet aeration tank (exit side)', th: 'ถังเติมอากาศของห้องน้ำ (ฝั่งทางออก)', tag: 'Toilet aeration tank', tagTh: 'ถังเติมอากาศห้องน้ำ', kind: 'tank',
        info: lines(['The toilets\' aeration tank, on the exit (east) side, behind the women\'s side beyond the men\'s urinals (Brian). The video (2:43, 2:48) shows a concrete slab in the grass strip by the east wall with chequer-plate covers and two blowers on it.',
          `Type and size not known: shown as a lying tank 1.3 m across and 4.2 m long under the slab. Top about ${lv(atop)}, pipe in about ${lv(aIn)}, out about ${lv(aOut)} to the east U-drain (assumed).`],
          ['ถังเติมอากาศของห้องน้ำ อยู่ฝั่งทางออก (ตะวันออก) หลังฝั่งห้องน้ำหญิง ถัดจากโถปัสสาวะชาย (ตาม Brian) ในวิดีโอ (2:43, 2:48) เห็นแผ่นพื้นคอนกรีตในแนวหญ้าข้างกำแพงด้านตะวันออก มีฝาแผ่นเหล็กลายและเครื่องเป่าลม 2 เครื่อง',
            `ไม่ทราบชนิดและขนาด แสดงเป็นถังนอน กว้าง 1.3 ม. ยาว 4.2 ม. ใต้แผ่นพื้น หลังถังประมาณ ${lv(atop)} ท่อเข้าประมาณ ${lv(aIn)} ท่อออกประมาณ ${lv(aOut)} ไปรางด้านตะวันออก (ค่าสมมติ)`], A) }, V(ax, ay, ground(ax, ay) + 0.9));
      add('tanks', boxGeo(1.5, 4.6, 0.12, ax - 0.05, ay, ground(ax, ay), 0), 'slab', { en: 'Aeration tank slab', th: 'แผ่นพื้นถังเติมอากาศ', nopick: 1 });
      for (const py of [22.6, 24.2]) plate(ax - 0.05, py, 1.0, 1.2, 'Chequer-plate cover', 'ฝาแผ่นเหล็กลาย');
      for (const py of [25.4, 25.95]) add('air', boxGeo(0.35, 0.45, 0.45, ax - 0.2, py, ground(ax, py) + 0.12, 0), 'airPump', { en: 'Aeration tank blower', th: 'เครื่องเป่าลมถังเติมอากาศ', kind: 'tank',
        info: lines(['One of the two blowers standing on the aeration tank slab (video 2:48). Model not known.'], ['เครื่องเป่าลม 1 ใน 2 เครื่องบนแผ่นพื้นถังเติมอากาศ (วิดีโอ 2:48) ไม่ทราบรุ่น'], A) });
      pipe('sewer', [[ax, ay - alen / 2 - 0.1, aOut], [ax, 21.0, r2(aOut - 0.02)], [E, 21.0, Math.min(r2(aOut - 0.03), ul.east(21.0) + 0.2)]], 0.05, 'sewerTreated', { en: 'Aeration tank outlet to the east U-drain', th: 'ท่อออกจากถังเติมอากาศไปรางด้านตะวันออก', kind: 'pipe',
        info: lines(['Where the treated water leaves is not known: shown into the east U-drain beside the tank.', ASSUMED.en], ['ไม่ทราบจุดที่น้ำบำบัดแล้วออก แสดงลงรางด้านตะวันออกข้างถัง', ASSUMED.th], A) });
      add('water', cylGeo(0.6, 2.0, 11.0, 34.5, ground(11.0, 34.5)), 'waterTank', { en: 'Water tank (beige, above ground)', th: 'ถังน้ำ (สีเบจ บนพื้น)', kind: 'tank',
        info: lines(['Above-ground water tank at the east end of the strip behind the toilets (video 2:21). Size judged from the video. Not wastewater.'], ['ถังน้ำบนพื้นที่ปลายด้านตะวันออกของช่องหลังห้องน้ำ (วิดีโอ 2:21) ขนาดประมาณจากวิดีโอ ไม่ใช่ระบบน้ำเสีย'], A) });
    }

    // ---------- Mini Big C / office building: treatment tank between the east firewall / U-drain and the pole signs, right
    // behind the exit-side oil trap (Brian; video 3:32-3:34: two round lids in a line along the wall)
    {
      const tx = 12.55, ty = -19.7, r = 0.7, len = 3.6, top = r2(ground(tx, ty) - 0.2), axis = top - r, inL = r2(top - 0.25), outL = r2(inL - 0.1);
      add('tanks', capsuleGeo(r, len, tx, ty, axis, 90, 0.25), 'tank', { en: 'Mini Big C treatment tank', th: 'ถังบำบัดของมินิบิ๊กซี', tag: 'Mini Big C tank', tagTh: 'ถังมินิบิ๊กซี', kind: 'tank',
        info: lines(['Treatment tank for the Mini Big C / office building, between the east firewall and U-drain and the KFC and Caltex pole signs, right behind the exit-side oil trap (Brian). The video (3:32, 3:34) shows two round lids in a line along the wall there.',
          `Type and size not known: shown as a lying tank 1.4 m across and 3.6 m long under the two lids. Top about ${lv(top)}, pipe in about ${lv(inL)}, out about ${lv(outL)} (assumed).`,
          'The Caltex deck marks a new sampling point G2.2 in front of the Mini Big C.'],
          ['ถังบำบัดของอาคารมินิบิ๊กซี / สำนักงาน อยู่ระหว่างกำแพงกันไฟและรางระบายน้ำด้านตะวันออกกับเสาป้าย KFC และ Caltex ด้านหลังบ่อดักน้ำมันฝั่งทางออกทันที (ตาม Brian) ในวิดีโอ (3:32, 3:34) เห็นฝากลม 2 ฝาเรียงตามแนวกำแพง',
            `ไม่ทราบชนิดและขนาด แสดงเป็นถังนอน กว้าง 1.4 ม. ยาว 3.6 ม. ใต้ฝาทั้งสอง หลังถังประมาณ ${lv(top)} ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} (ค่าสมมติ)`,
            'ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างใหม่ G2.2 หน้ามินิบิ๊กซี'], A) }, V(tx, ty, ground(tx, ty) + 0.8));
      for (const ly of [-18.7, -20.7]) lid(tx, ly, top, 0.3, 'Tank lid', 'ฝาถัง');
      pipe('sewer', [[12.2, -15.6, inL + 0.1], [tx, ty + len / 2 + 0.1, inL]], 0.05, 'sewerRaw', { en: 'Mini Big C building to its tank', th: 'ท่อจากอาคารมินิบิ๊กซีไปถังบำบัด', kind: 'pipe', info: lines(['4" pipe from the building.', ASSUMED.en], ['ท่อ 4 นิ้วจากอาคาร', ASSUMED.th], A) });
      pipe('sewer', [[tx, ty - len / 2 - 0.1, outL], [tx, -22.0, r2(outL - 0.02)], [E, -22.1, r2(outL - 0.03)]], 0.05, 'sewerTreated', { en: 'Mini Big C tank outlet', th: 'ท่อออกจากถังมินิบิ๊กซี', kind: 'pipe',
        info: lines(['Where the outlet goes is not known: shown into the east U-drain just before the exit-side oil trap.', ASSUMED.en], ['ไม่ทราบว่าท่อออกไปที่ใด แสดงลงรางด้านตะวันออกก่อนถึงบ่อดักน้ำมันฝั่งทางออก', ASSUMED.th], A) });
    }

    // ---------- fuel tank farm between the toilets and the office / Mini Big C building, exit side (Brian; video 2:53: a pad
    // with round covers; 3:07-3:13: four or five vent pipes against the east wall by the office)
    // Brian (26 Nov 2026): three tanks lying parallel to the road, four products: one tank has two compartments.
    [['T1 · 2 compartments', 6.8, 1], ['T2', 9.8, 0], ['T3', 12.8, 0]].forEach(([label, y, two]) => fuelTank(label, 7.5, y, 0, { src: A,
      en: [two ? 'This tank has two compartments, so it holds two products (Brian, 26 Nov 2026): the split of the 30,000 L between them is not known.' : 'One compartment, one product (Brian, 26 Nov 2026).',
        'No drawings: three tanks, four products in all, lying parallel to the road (Brian). Which tank is which, which product is in each and the spacing are not known: shown side by side under the pad with the round covers (video 2:53).'],
      th: [two ? 'ถังนี้มี 2 ช่อง เก็บน้ำมัน 2 ชนิด (ตาม Brian 26 พ.ย. 2026) ไม่ทราบว่าแบ่ง 30,000 ลิตรอย่างไร' : 'ช่องเดียว น้ำมัน 1 ชนิด (ตาม Brian 26 พ.ย. 2026)',
        'ไม่มีแบบ: มี 3 ถัง น้ำมันรวม 4 ชนิด วางขนานกับถนน (ตาม Brian) ไม่ทราบว่าถังใดเป็นถังใด น้ำมันชนิดใดอยู่ถังใด และระยะห่าง แสดงวางเรียงกันใต้ลานที่มีฝากลม (วิดีโอ 2:53)'] }));
    add('fuel', merge([0, 1, 2, 3, 4].map((k) => cylGeo(0.05, 6.5, 13.55, 0.6 + k * 0.18, 0))), 'fuelPipe', { en: 'Fuel tank vent pipes', th: 'ท่อระบายไอถังน้ำมัน', kind: 'pipe',
      info: lines(['Five white vent pipes on a frame against the east wall at the back corner of the office (video 3:07, 3:13). Height judged from the video, about 6.5 m.'], ['ท่อระบายไอสีขาว 5 ท่อบนโครงชิดกำแพงด้านตะวันออก ที่มุมหลังสำนักงาน (วิดีโอ 3:07, 3:13) ความสูงประมาณจากวิดีโอ ประมาณ 6.5 ม.'], A) });

    // ---------- buildings, canopy and signs (context: outlines from the satellite image, heights from the video)
    const building = (poly, floor, h, material, o) => add('buildings', prismGeo(poly, floor, h), material, { ...o, kind: 'building', info: lines(o.lines || [], o.linesTh || [], AC) },
      o.tag ? V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, floor + h + 0.7) : null);
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    building(rect(-28.0, 22.0, -4.0, 32.5), 0.15, 5.5, 'building', { en: 'KFC drive-through restaurant', th: 'ร้าน KFC (ไดรฟ์ทรู)', tag: 'KFC', tagTh: 'KFC',
      lines: ['Restaurant at the back-left of the site, with the drive-through lane round its west side and behind it (order point on the west side, PAY HERE booth at the back after the pump room, pick-up window on the east side; the lane comes out between KFC and the toilets). Red DRIVE THRU tower at the front-west corner.'],
      linesTh: ['ร้านอาหารที่มุมหลังซ้ายของสถานี ช่องทางไดรฟ์ทรูอ้อมด้านตะวันตกและด้านหลัง (จุดสั่งที่ปลายด้านตะวันตก ช่องจ่ายเงินและรับสินค้าที่ปลายด้านตะวันออก) ถังดักไขมันและประตูม้วนห้องเครื่องเป่าลมอยู่ด้านหลัง'] });
    building(rect(-28.0, 22.0, -26.6, 23.4), 0.15, 9.0, 'signPanel', { en: 'KFC "DRIVE THRU" tower', th: 'หอป้าย "DRIVE THRU" ของ KFC',
      lines: ['Red tower with the DRIVE THRU sign at the front-west corner of KFC (video 1:09). Height judged from the video.'], linesTh: ['หอสีแดงมีป้าย DRIVE THRU ที่มุมหน้าด้านตะวันตกของ KFC (วิดีโอ 1:09) ความสูงประมาณจากวิดีโอ'] });
    // toilets (Brian's photos and video 2:14, 2:43): white-clad walls, open front onto the tiled walkway along the drive-through
    // lane, red slatted screens at the men's (north) and women's (south) entrances, the disabled toilet between them, sink
    // counters inside, flat roof with a red edge. Layout inside judged from the video; sizes approximate.
    {
      const TX0 = 3.9, TX1 = 11.8, TY0 = 21.0, TY1 = 32.5, FL = 0.15, H = 3.0, WT = 0.2, P1 = 25.0, P2 = 28.0;
      add('buildings', merge([boxGeo(TX1 - TX0 + 0.5, TY1 - TY0 + 0.5, 0.35, (TX0 + TX1) / 2, (TY0 + TY1) / 2, FL + H, 0)]), 'roof', { en: 'Toilets', th: 'ห้องน้ำ', tag: 'Toilets', tagTh: 'ห้องน้ำ', kind: 'building',
        info: lines(['Public toilets at the back-right, facing the drive-through lane across a tiled walkway (Brian). Men\'s at the north end (red slatted screen, urinals open onto the grass strip on the east side, video 2:36), the disabled toilet in the middle, women\'s at the south end (red screen). Open front with sink counters inside, white-clad walls, flat roof with a red edge (Brian\'s photo).', 'Inside layout and sizes judged from the video and photos.'],
          ['ห้องน้ำสาธารณะที่มุมหลังขวา หันหน้าไปช่องทางไดรฟ์ทรู มีทางเดินปูกระเบื้องคั่น (ตาม Brian) ห้องน้ำชายอยู่ด้านเหนือ (ฉากระแนงสีแดง โถปัสสาวะเปิดออกแนวหญ้าด้านตะวันออก วิดีโอ 2:36) ห้องน้ำคนพิการอยู่ตรงกลาง ห้องน้ำหญิงอยู่ด้านใต้ (ฉากสีแดง) ด้านหน้าเปิดโล่ง มีเคาน์เตอร์อ่างล้างมือด้านใน ผนังกรุสีขาว หลังคาแบนขอบสีแดง (ภาพของ Brian)', 'ผังภายในและขนาดประมาณจากวิดีโอและภาพถ่าย'], AC) }, V((TX0 + TX1) / 2, (TY0 + TY1) / 2, FL + H + 1.0));
      { const rx0 = TX0 - 0.25, rx1 = TX1 + 0.25, ry0 = TY0 - 0.25, ry1 = TY1 + 0.25, z = FL + H + 0.35, e = 0.15, eh = 0.15;
        add('buildings', merge([boxGeo(rx1 - rx0, e, eh, (rx0 + rx1) / 2, ry0 + e / 2, z, 0), boxGeo(rx1 - rx0, e, eh, (rx0 + rx1) / 2, ry1 - e / 2, z, 0),
          boxGeo(e, ry1 - ry0, eh, rx0 + e / 2, (ry0 + ry1) / 2, z, 0), boxGeo(e, ry1 - ry0, eh, rx1 - e / 2, (ry0 + ry1) / 2, z, 0)]), 'signPanel', { en: 'Toilet roof edge (red)', th: 'ขอบหลังคาห้องน้ำ (สีแดง)', nopick: 1 }); }
      const walls = [
        boxGeo(WT, TY1 - TY0, H, TX1 - WT / 2, (TY0 + TY1) / 2, FL, 0),                 // back (east) wall
        boxGeo(TX1 - TX0, WT, H, (TX0 + TX1) / 2, TY1 - WT / 2, FL, 0),                 // north end
        boxGeo(TX1 - TX0, WT, H, (TX0 + TX1) / 2, TY0 + WT / 2, FL, 0),                 // south end
        boxGeo(TX1 - TX0 - 1.2, WT, H, (TX0 + 1.2 + TX1) / 2, P1, FL, 0),               // partitions, open at the front
        boxGeo(TX1 - TX0 - 1.2, WT, H, (TX0 + 1.2 + TX1) / 2, P2, FL, 0),
      ];
      for (const cy of [TY0 + 0.25, P1, P2, TY1 - 0.25]) walls.push(boxGeo(0.5, 0.5, H, TX0 + 0.25, cy, FL, 0));   // white-clad front columns
      add('buildings', merge(walls), 'fixture', { en: 'Toilet walls', th: 'ผนังห้องน้ำ', nopick: 1 });
      const red = [];
      for (const [y0, y1] of [[29.0, 31.4], [22.0, 24.2]]) for (let y = y0; y < y1; y += 0.25) red.push(boxGeo(0.12, 0.08, 2.5, TX0 + 0.35, y, FL, 0));
      add('buildings', merge(red), 'signPanel', { en: 'Red slatted screens at the entrances', th: 'ฉากระแนงสีแดงที่ทางเข้า', nopick: 1 });
      add('buildings', merge([boxGeo(0.6, 2.6, 0.85, TX0 + 3.6, 30.2, FL, 0), boxGeo(0.6, 2.6, 0.85, TX0 + 3.6, 23.1, FL, 0)]), 'fixture', { en: 'Sink counters', th: 'เคาน์เตอร์อ่างล้างมือ', kind: 'building',
        info: lines(['Sink counters inside the men\'s and women\'s toilets, seen through the open front (Brian\'s photo). Places approximate.'], ['เคาน์เตอร์อ่างล้างมือในห้องน้ำชายและหญิง มองเห็นผ่านด้านหน้าที่เปิดโล่ง (ภาพของ Brian) ตำแหน่งโดยประมาณ'], AC) });
    }
    building(rect(1.4, 32.9, 4.0, 35.75), 0.15, 2.4, 'building', { en: 'Garbage room', th: 'ห้องขยะ', lines: ['Small garbage room with grey double doors next to the toilets, on the exit side of the drive-through (Brian; video 2:14). Place approximate.'], linesTh: ['ห้องขยะเล็กประตูคู่สีเทาข้างห้องน้ำ ฝั่งทางออกของไดรฟ์ทรู (ตาม Brian วิดีโอ 2:14) ตำแหน่งโดยประมาณ'] });
    building(rect(6.0, -15.5, 13.3, 0.0), 0.15, 3.6, 'building', { en: 'Office and Mini Big C', th: 'สำนักงานและมินิบิ๊กซี', tag: 'Office / Mini Big C', tagTh: 'สำนักงาน / มินิบิ๊กซี',
      lines: ['One-storey building on the exit side: the office at the back end (facing the tank farm), Mini Big C at the front under the end of the canopy.'], linesTh: ['อาคารชั้นเดียวฝั่งทางออก สำนักงานอยู่ด้านหลัง (หันหน้าไปลานถังน้ำมัน) มินิบิ๊กซีอยู่ด้านหน้าใต้ปลายหลังคาคลุมหัวจ่าย'] });
    building(rect(-32.6, -17.0, -25.5, -6.5), 0.15, 3.8, 'building', { en: 'Coffee shop', th: 'ร้านกาแฟ', tag: 'Coffee shop', tagTh: 'ร้านกาแฟ',
      lines: ['Newer black one-storey coffee shop at the front, entrance side, with a planter along the front (video 0:07-0:17, 4:07). Outline from the older satellite image (the earlier small shop here); size approximate.'],
      linesTh: ['ร้านกาแฟชั้นเดียวสีดำที่สร้างใหม่กว่า อยู่ด้านหน้าฝั่งทางเข้า มีกระบะต้นไม้ด้านหน้า (วิดีโอ 0:07-0:17, 4:07) แนวจากภาพดาวเทียมรุ่นเก่า (ร้านเล็กเดิมตรงนี้) ขนาดโดยประมาณ'] });
    building([[-15.2, -19.5], [-6.4, -19.5], [-6.4, -16.0], [6.0, -16.0], [6.0, -1.0], [-6.4, -1.0], [-6.4, 15.0], [-15.2, 15.0]], 5.2, 1.0, 'roof', { en: 'Canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย',
      lines: ['L-shaped canopy: the long part runs from the road towards KFC over the pump islands, the short part joins the Mini Big C building (outline from the satellite image; video 4:07).'], linesTh: ['หลังคารูปตัว L: ส่วนยาวจากถนนไปทาง KFC คลุมแท่นหัวจ่าย ส่วนสั้นต่อกับอาคารมินิบิ๊กซี (แนวจากภาพดาวเทียม วิดีโอ 4:07)'] });
    // four pump islands under the long part of the canopy, one behind the other from the road; each island lies along the
    // road (entrance side to exit side) with a canopy column at each end and the dispenser between them (Brian, 26 Nov 2026,
    // with his photo from the exit-side corner). Four islands, four pairs of columns.
    const IX = -10.8, ILEN = 5.6, COL = 2.4;
    [[11.5, '7/8'], [3.8, '5/6'], [-3.9, '3/4'], [-11.6, '1/2']].forEach(([y, n]) => {
      add('buildings', boxGeo(ILEN, 1.2, 0.2, IX, y, 0, 0), 'column', { en: 'Pump island', th: 'แท่นหัวจ่าย', nopick: 1 });
      for (const dx of [-COL, COL]) add('buildings', boxGeo(0.45, 0.45, 5.05, IX + dx, y, 0.15, 0), 'column', { en: 'Canopy column', th: 'เสาหลังคา', nopick: 1 });
      add('buildings', boxGeo(1.0, 0.6, 2.0, IX, y, 0.2, 0), 'islands', { en: `Dispenser ${n}`, th: `ตู้จ่าย ${n}`, kind: 'building', info: lines([`Dispenser for pumps ${n}, numbered from the road (pumps 1, 3, 5, 7 seen in the video). Four islands, one behind the other from the road; each lies along the road with a canopy column at each end and the dispenser between them (Brian, 26 Nov 2026). Island and column spacing judged from the photo.`], [`ตู้จ่ายหัวจ่าย ${n} นับจากถนน (เห็นหัวจ่าย 1, 3, 5, 7 ในวิดีโอ) มี 4 แท่น เรียงจากถนนเข้าไป แต่ละแท่นวางตามแนวถนน มีเสาหลังคาที่ปลายทั้งสองข้างและตู้จ่ายอยู่ตรงกลาง (ตาม Brian 26 พ.ย. 2026) ระยะแท่นและเสาประมาณจากภาพถ่าย`], AC) });
    });
    // ---------- kerbs, walkways and parking (Brian, 26 Nov 2026: estimate them from the video and photos). Outlines judged
    // from the video stills and the satellite image; sizes approximate. Walkways shown 0.15 m above the forecourt.
    {
      const KH = 0.15, KW = 0.15, AP = { en: 'Estimated from Brian\'s video stills and the satellite image; place and size approximate.', th: 'ประมาณจากภาพนิ่งในวิดีโอของ Brian และภาพถ่ายดาวเทียม ตำแหน่งและขนาดโดยประมาณ' };
      // raised walkway [x0, y0, x1, y1] with a painted kerb on the listed sides ('s' road side, 'n' back, 'w', 'e')
      const walk = (x0, y0, x1, y1, sides, kerb, en, th, extra = [], extraTh = []) => {
        const parts = [boxGeo(x1 - x0, y1 - y0, KH, (x0 + x1) / 2, (y0 + y1) / 2, ground((x0 + x1) / 2, (y0 + y1) / 2), 0)];
        add('paving', merge(parts), 'walkway', { en, th, kind: 'building', info: lines([...extra, AP.en], [...extraTh, AP.th], AC) });
        const k = [];
        for (const sd of sides) {
          if (sd === 's') k.push(boxGeo(x1 - x0, KW, KH + 0.01, (x0 + x1) / 2, y0 + KW / 2, 0, 0));
          if (sd === 'n') k.push(boxGeo(x1 - x0, KW, KH + 0.01, (x0 + x1) / 2, y1 - KW / 2, 0, 0));
          if (sd === 'w') k.push(boxGeo(KW, y1 - y0, KH + 0.01, x0 + KW / 2, (y0 + y1) / 2, 0, 0));
          if (sd === 'e') k.push(boxGeo(KW, y1 - y0, KH + 0.01, x1 - KW / 2, (y0 + y1) / 2, 0, 0));
        }
        if (k.length) add('paving', merge(k), kerb, { en: `Kerb: ${en}`, th: `ขอบคันหิน: ${th}`, nopick: 1 });
      };
      walk(-29.3, 20.7, -4.0, 22.0, ['s', 'w'], 'kerbYellow', 'Walkway along the front of KFC', 'ทางเดินด้านหน้า KFC',
        ['Raised walkway along the front of KFC with a yellow-and-black kerb; motorbikes park on it (video 1:09).'], ['ทางเดินยกระดับด้านหน้า KFC ขอบคันหินทาสีเหลืองดำ มีรถจักรยานยนต์จอดอยู่ (วิดีโอ 1:09)']);
      walk(-29.3, 22.0, -28.0, 32.5, ['w'], 'kerbYellow', 'Kerbed walkway along the drive-through side of KFC', 'ทางเดินขอบคันหินด้านไดรฟ์ทรูของ KFC',
        ['Raised walkway with a yellow-and-black kerb along the west side of KFC, round the corner from the front walkway; the order point stands on it (Brian\'s stills, video 1:09-1:34).'], ['ทางเดินยกระดับ ขอบคันหินทาสีเหลืองดำ ตามด้านตะวันตกของ KFC ต่อจากทางเดินด้านหน้า จุดสั่งอาหารตั้งอยู่บนนี้ (ภาพของ Brian วิดีโอ 1:09-1:34)']);
      // the drive-through lane comes out between KFC and the toilets: KFC sidewalk 3 rows of 40 cm tiles + 15 cm kerb, lane
      // 4.0 m, toilet walkway 6 rows of 40 cm tiles + 15 cm kerb (Brian, 26 Nov 2026)
      walk(-4.0, 20.7, -2.65, 32.5, ['e', 's'], 'kerbYellow', 'Sidewalk along the drive-through side of KFC', 'ทางเท้าด้านไดรฟ์ทรูของ KFC',
        ['Tiled sidewalk along the east side of KFC at the pick-up window: three rows of 40 cm tiles (1.2 m) and a 15 cm yellow-and-black kerb (Brian, 26 Nov 2026; video 2:14).'], ['ทางเท้าปูกระเบื้องด้านตะวันออกของ KFC ที่ช่องรับสินค้า กระเบื้อง 40 ซม. 3 แถว (1.2 ม.) และขอบคันหินทาสีเหลืองดำ 15 ซม. (ตาม Brian 26 พ.ย. 2026 วิดีโอ 2:14)']);
      walk(1.35, 19.6, 3.9, 32.5, ['w', 's'], 'kerbPlain', 'Walkway in front of the toilets', 'ทางเดินหน้าห้องน้ำ',
        ['Tiled walkway along the front of the toilets, facing the drive-through lane: six rows of 40 cm tiles (2.4 m) and a 15 cm concrete kerb (Brian, 26 Nov 2026; his photo and video 2:14). The drive-through lane between this kerb and the KFC kerb is 4.0 m wide.'], ['ทางเดินปูกระเบื้องหน้าห้องน้ำ หันไปช่องทางไดรฟ์ทรู กระเบื้อง 40 ซม. 6 แถว (2.4 ม.) และขอบคันหินคอนกรีต 15 ซม. (ตาม Brian 26 พ.ย. 2026 ภาพของ Brian และวิดีโอ 2:14) ช่องทางไดรฟ์ทรูระหว่างขอบคันหินนี้กับขอบคันหินฝั่ง KFC กว้าง 4.0 ม.']);
      walk(3.9, 19.6, 11.8, 21.0, ['s'], 'kerbPlain', 'Walkway at the south end of the toilets', 'ทางเดินด้านใต้ของห้องน้ำ',
        ['The toilet walkway continues round the south end of the building (Brian\'s photo).'], ['ทางเดินห้องน้ำต่อเนื่องอ้อมด้านใต้ของอาคาร (ภาพของ Brian)']);
      // KFC pick-up window: red booth on the KFC sidewalk with a flat roof over the lane and a "PICK UP HERE" sign; bollards
      // along the kerb before it (video 2:14, Brian's still)
      add('buildings', boxGeo(1.25, 2.6, 2.6, -3.35, 24.3, 0.15, 0), 'signPanel', { en: 'KFC pick-up window', th: 'ช่องรับสินค้า KFC', tag: 'Pick-up window', tagTh: 'ช่องรับสินค้า', kind: 'building',
        info: lines(['Red pick-up booth with the drive-through window, on the KFC sidewalk at the east side of KFC, facing the lane (video 2:14, Brian\'s still). Size judged from the video.'], ['ช่องรับสินค้าไดรฟ์ทรูสีแดง อยู่บนทางเท้าด้านตะวันออกของ KFC หันหน้าไปช่องทาง (วิดีโอ 2:14 และภาพของ Brian) ขนาดประมาณจากวิดีโอ'], AC) }, V(-3.35, 24.3, 3.6));
      add('buildings', boxGeo(0.05, 1.5, 1.1, -2.71, 24.3, 1.1, 0), 'signDark', { en: 'Pick-up window glass', th: 'กระจกช่องรับสินค้า', nopick: 1 });
      add('buildings', boxGeo(5.2, 3.6, 0.25, -1.6, 24.3, 3.1, 0), 'roof', { en: 'Roof over the pick-up window', th: 'หลังคาช่องรับสินค้า', kind: 'building',
        info: lines(['Flat roof over the pick-up window, out from the KFC wall across the drive-through lane, with the "PICK UP HERE" sign along its north edge (video 2:14, Brian\'s still). Height and size judged from the video.'], ['หลังคาแบนเหนือช่องรับสินค้า ยื่นจากผนัง KFC คลุมช่องทางไดรฟ์ทรู มีป้าย "PICK UP HERE" ที่ขอบด้านเหนือ (วิดีโอ 2:14 และภาพของ Brian) ความสูงและขนาดประมาณจากวิดีโอ'], AC) });
      add('buildings', boxGeo(5.2, 0.1, 0.25, -1.6, 22.55, 3.1, 0), 'fixture', { en: 'Roof edge', th: 'ขอบหลังคา', nopick: 1 });
      add('buildings', boxGeo(2.6, 0.08, 0.55, -1.0, 26.1, 2.55, 0), 'signDark', { en: 'PICK UP HERE sign', th: 'ป้าย PICK UP HERE', nopick: 1 });
      add('paving', merge([26.6, 28.0, 29.4].map((y) => cylGeo(0.1, 1.0, -2.95, y, 0.15, 12))), 'kerbYellow', { en: 'Bollards (yellow and black)', th: 'เสากันชน (เหลืองดำ)', nopick: 1 });
      walk(4.6, -15.5, 6.0, 0.0, ['w'], 'kerbPlain', 'Walkway along the office and Mini Big C', 'ทางเดินหน้าสำนักงานและมินิบิ๊กซี',
        ['Walkway along the forecourt side of the office / Mini Big C building (assumed width).'], ['ทางเดินด้านลานจอดของอาคารสำนักงาน / มินิบิ๊กซี (ความกว้างสมมติ)']);
      walk(-25.5, -17.0, -24.3, -6.5, ['e'], 'kerbPlain', 'Walkway along the coffee shop', 'ทางเดินข้างร้านกาแฟ',
        ['Walkway on the forecourt side of the coffee shop (assumed width).'], ['ทางเดินด้านลานจอดของร้านกาแฟ (ความกว้างสมมติ)']);
      walk(9.0, -25.3, 12.2, -17.4, ['w', 'n'], 'kerbRed', 'Island with the pole signs', 'เกาะเสาป้าย',
        ['Raised island at the exit-side front corner carrying the KFC and Caltex pole signs, with a red-and-white kerb (video 4:10, Brian\'s photo).'], ['เกาะยกระดับที่มุมหน้าฝั่งทางออก มีเสาป้าย KFC และ Caltex ขอบคันหินทาสีแดงขาว (วิดีโอ 4:10 และภาพของ Brian)']);
      // planter along the front of the coffee shop (video 0:07-0:17; Brian's photo)
      add('paving', boxGeo(6.0, 0.9, 0.5, -29.0, -17.6, 0, 0), 'grass', { en: 'Planter in front of the coffee shop', th: 'กระบะต้นไม้หน้าร้านกาแฟ', kind: 'building',
        info: lines(['Low planter with shrubs along the front of the coffee shop (video 0:07, Brian\'s photo).', AP.en], ['กระบะต้นไม้เตี้ยหน้าร้านกาแฟ (วิดีโอ 0:07 และภาพของ Brian)', AP.th], AC) });
      // drive-through entry (Brian's stills, video 1:09): kerbed island on the west side of the entry, ending in a curve at the
      // height limiter; the lane between it and the KFC kerb is about 4 m
      { const k = [boxGeo(0.3, 5.6, KH, -32.75, 18.2, 0, 0), boxGeo(0.3, 5.6, KH, -33.35, 18.2, 0, 0)], pts = [];
        for (let i = 0; i <= 8; i++) { const t = Math.PI * i / 8; pts.push([-33.05 + 0.3 * Math.cos(t), 21.0 + 0.3 * Math.sin(t)]); }
        for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; k.push(boxGeo(Math.hypot(bx - ax, by - ay) + 0.05, 0.3, KH, (ax + bx) / 2, (ay + by) / 2, 0, Math.atan2(by - ay, bx - ax) * 180 / Math.PI)); }
        add('paving', merge(k), 'kerbYellow', { en: 'Kerbed island at the drive-through entry', th: 'เกาะขอบคันหินที่ทางเข้าไดรฟ์ทรู', kind: 'building',
          info: lines(['Narrow yellow-and-black kerbed island along the west wall at the drive-through entry, ending in a round end at the height limiter (Brian\'s stills, video 1:09). Shape approximate.', AP.en], ['เกาะขอบคันหินแคบทาสีเหลืองดำตามกำแพงด้านตะวันตกที่ทางเข้าไดรฟ์ทรู ปลายโค้งที่โครงจำกัดความสูง (ภาพของ Brian วิดีโอ 1:09) รูปร่างโดยประมาณ', AP.th], AC) });
        add('paving', boxGeo(0.3, 5.8, 0.02, -33.05, 18.2, KH, 0), 'walkway', { en: 'Island top', th: 'ผิวเกาะ', nopick: 1 }); }
      // height limiter across the entry: clear height 2.0 m (Brian), red "DRIVE THRU" sign on top, yellow-and-black bars
      { const LIM = 2.0, gy = 21.2, gx0 = -33.05, gx1 = -28.65;
        add('buildings', merge([boxGeo(0.2, 0.2, LIM + 0.25, gx0, gy, 0.15, 0), boxGeo(0.2, 0.2, LIM + 0.25, gx1, gy, 0.15, 0), boxGeo(gx1 - gx0 + 0.2, 0.2, 0.2, (gx0 + gx1) / 2, gy, 0.15 + LIM, 0)]), 'signDark',
          { en: 'Drive-through height limiter (2.0 m)', th: 'โครงจำกัดความสูงไดรฟ์ทรู (2.0 ม.)', tag: 'Height limiter 2.0 m', tagTh: 'จำกัดความสูง 2.0 ม.', kind: 'building',
            info: lines(['Steel height-limiter frame across the drive-through entry, about 2.0 m clear (Brian, 26 Nov 2026), with the red "ช่องบริการ DRIVE THRU" sign on top and yellow-and-black bars hanging below (Brian\'s stills, video 1:09). Width judged from the stills.'],
              ['โครงเหล็กจำกัดความสูงคร่อมทางเข้าไดรฟ์ทรู สูงโล่งประมาณ 2.0 ม. (ตาม Brian 26 พ.ย. 2026) มีป้ายสีแดง "ช่องบริการ DRIVE THRU" ด้านบน และแผงเหลืองดำห้อยด้านล่าง (ภาพของ Brian วิดีโอ 1:09) ความกว้างประมาณจากภาพ'], AC) }, V((gx0 + gx1) / 2, gy, 3.3));
        add('buildings', boxGeo(gx1 - gx0 - 0.6, 0.12, 0.55, (gx0 + gx1) / 2 + 0.3, gy, 0.15 + LIM + 0.2, 0), 'signPanel', { en: 'DRIVE THRU sign', th: 'ป้าย DRIVE THRU', nopick: 1 });
        add('paving', merge([boxGeo(1.4, 0.05, 0.12, (gx0 + gx1) / 2 - 0.8, gy, 0.15 + LIM - 0.14, 0), boxGeo(1.0, 0.05, 0.12, (gx0 + gx1) / 2 + 0.9, gy, 0.15 + LIM - 0.14, 0)]), 'kerbYellow', { en: 'Hanging yellow-and-black bars', th: 'แผงเหลืองดำห้อย', nopick: 1 }); }
      // order point on the west side of KFC: flat roof out over the lane, menu boards and speaker post, bollards at its south
      // end (Brian's stills, video 1:31-1:34)
      { const ox = -28.0, oy0 = 25.3, oy1 = 28.1;
        add('buildings', boxGeo(2.8, oy1 - oy0, 0.25, ox - 1.4, (oy0 + oy1) / 2, 3.0, 0), 'roof', { en: 'KFC order point (ORDER HERE)', th: 'จุดสั่งอาหาร KFC (ORDER HERE)', tag: 'Order point', tagTh: 'จุดสั่งอาหาร', kind: 'building',
          info: lines(['Drive-through order point on the west side of KFC: a flat roof out from the KFC wall over the lane with the "ORDER HERE" sign, two menu boards and the speaker post on the kerbed walkway, bollards at its south end (Brian\'s stills, video 1:31-1:34). This is what the box at the west end of KFC was meant to be. Sizes judged from the stills.'],
            ['จุดสั่งอาหารไดรฟ์ทรูด้านตะวันตกของ KFC: หลังคาแบนยื่นจากผนัง KFC คลุมช่องทาง มีป้าย "ORDER HERE" ป้ายเมนู 2 แผ่นและเสาลำโพงบนทางเดินขอบคันหิน มีเสากันชนที่ปลายด้านใต้ (ภาพของ Brian วิดีโอ 1:31-1:34) กล่องที่ปลายด้านตะวันตกของ KFC เดิมคือจุดนี้ ขนาดประมาณจากภาพ'], AC) }, V(ox - 1.4, (oy0 + oy1) / 2, 4.0));
        add('buildings', merge([boxGeo(0.15, 0.15, 2.85, ox - 0.9, oy0 + 0.3, 0.15, 0), boxGeo(0.15, 0.15, 2.85, ox - 0.9, oy1 - 0.3, 0.15, 0)]), 'signDark', { en: 'Order point posts', th: 'เสาจุดสั่งอาหาร', nopick: 1 });
        add('buildings', boxGeo(0.1, 2.2, 0.5, ox - 2.7, (oy0 + oy1) / 2, 2.5, 0), 'signDark', { en: 'ORDER HERE sign', th: 'ป้าย ORDER HERE', nopick: 1 });
        add('buildings', merge([boxGeo(0.12, 1.1, 1.8, ox - 1.15, oy0 + 0.9, 0.35, 0), boxGeo(0.12, 0.9, 1.0, ox - 1.15, oy0 + 2.0, 1.1, 0), boxGeo(0.25, 0.3, 1.2, ox - 1.15, oy1 - 0.1, 0.15, 0)]), 'signDark', { en: 'Menu boards and speaker post', th: 'ป้ายเมนูและเสาลำโพง', nopick: 1 });
        add('paving', merge([24.0, 24.5, 25.0].map((y, k) => cylGeo(0.1, 1.0, -29.0 + (k === 1 ? 0.35 : 0), y, 0.15, 12))), 'kerbYellow', { en: 'Bollards (yellow and black)', th: 'เสากันชน (เหลืองดำ)', nopick: 1 });
        add('paving', merge([boxGeo(2.6, 0.12, 0.01, -31.3, 24.4, 0.005, 0), boxGeo(2.6, 0.12, 0.01, -31.3, 28.6, 0.005, 0), boxGeo(0.12, 4.2, 0.01, -32.6, 26.5, 0.005, 0)]), 'kerbYellow', { en: 'Painted stop box at the order point', th: 'กรอบจอดทาสีที่จุดสั่งอาหาร', nopick: 1 }); }
      // PAY HERE booth behind KFC, after the grease trap and the pump room: red booth against the back wall with its window
      // facing the lane, flat roof over the lane with the "PAY HERE" sign, air-conditioner condensers before it, kerbed strip
      // along the back wall (Brian's stills, video 2:00-2:09)
      { const px0 = -9.4, px1 = -7.4, py0 = 32.5, py1 = 33.7;
        add('buildings', boxGeo(px1 - px0, py1 - py0, 2.5, (px0 + px1) / 2, (py0 + py1) / 2, 0.15, 0), 'signPanel', { en: 'KFC PAY HERE booth', th: 'ช่องชำระเงิน KFC (PAY HERE)', tag: 'Pay window', tagTh: 'ช่องชำระเงิน', kind: 'building',
          info: lines(['Red PAY HERE booth against the back wall of KFC, after the grease trap and the pump room (Brian, 26 Nov 2026; video 2:00-2:09). Its window faces the lane; a flat roof with the "PAY HERE" sign reaches over the lane. The air-conditioner condensers stand just before it. Size judged from the stills.'],
            ['ช่องชำระเงินสีแดงชิดผนังด้านหลัง KFC ถัดจากถังดักไขมันและห้องปั๊ม (ตาม Brian 26 พ.ย. 2026 วิดีโอ 2:00-2:09) หน้าต่างหันไปช่องทาง หลังคาแบนมีป้าย "PAY HERE" ยื่นคลุมช่องทาง เครื่องระบายความร้อนแอร์ตั้งอยู่ก่อนถึงช่องนี้ ขนาดประมาณจากภาพ'], AC) }, V((px0 + px1) / 2, py1, 3.4));
        add('buildings', boxGeo(1.3, 0.05, 0.9, (px0 + px1) / 2, py1 + 0.03, 1.1, 0), 'signDark', { en: 'Pay window glass', th: 'กระจกช่องชำระเงิน', nopick: 1 });
        add('buildings', boxGeo(4.2, 3.0, 0.22, (px0 + px1) / 2 - 0.4, 34.0, 2.95, 0), 'roof', { en: 'Roof over the pay window', th: 'หลังคาช่องชำระเงิน', nopick: 1 });
        add('buildings', boxGeo(0.08, 2.0, 0.45, px0 - 1.45, 34.4, 2.45, 0), 'signDark', { en: 'PAY HERE sign', th: 'ป้าย PAY HERE', nopick: 1 });
        add('buildings', merge([-12.6, -11.5, -10.4].map((x) => boxGeo(0.95, 0.8, 1.8, x, 33.0, 0.15, 0))), 'fixture', { en: 'Air-conditioner condensers', th: 'คอยล์ร้อนเครื่องปรับอากาศ', kind: 'building',
          info: lines(['Three large air-conditioner condensers against the back wall of KFC, just before the PAY HERE booth (video 2:09).', AP.en], ['คอยล์ร้อนเครื่องปรับอากาศขนาดใหญ่ 3 เครื่องชิดผนังด้านหลัง KFC ก่อนถึงช่องชำระเงิน (วิดีโอ 2:09)', AP.th], AC) });
        walk(-13.2, 32.5, -4.0, 33.5, ['n'], 'kerbYellow', 'Kerbed strip along the back of KFC', 'แนวขอบคันหินด้านหลัง KFC',
          ['Raised strip with a yellow-and-black kerb along the back wall of KFC from the pump room past the PAY HERE booth (video 2:00-2:09).'], ['แนวยกระดับ ขอบคันหินทาสีเหลืองดำ ตามผนังด้านหลัง KFC จากห้องปั๊มผ่านช่องชำระเงิน (วิดีโอ 2:00-2:09)']); }
      // parking bays along the west wall between the coffee shop and KFC: an air-pump bay, two blue EV bays, then five bays
      const BX0 = X0 + 0.6, BX1 = BX0 + 5.0, lineAt = [], bays = [];
      const bay = (y0, y1, kind) => { bays.push([y0, y1, kind]); lineAt.push(y0, y1); };
      bay(-5.4, -2.9, 'air'); bay(-2.9, -0.4, 'ev'); bay(-0.4, 2.1, 'ev');
      for (let i = 0; i < 5; i++) bay(2.1 + i * 2.5, 4.6 + i * 2.5, 'car');
      for (const [y0, y1, kind] of bays) if (kind === 'ev') add('paving', boxGeo(BX1 - BX0, y1 - y0 - 0.1, 0.01, (BX0 + BX1) / 2, (y0 + y1) / 2, 0.005, 0), 'bayEV', { en: 'EV parking bay (blue)', th: 'ช่องจอดรถยนต์ไฟฟ้า (สีฟ้า)', nopick: 1 });
      const ls = [...new Set(lineAt)].map((y) => boxGeo(BX1 - BX0, 0.1, 0.012, (BX0 + BX1) / 2, y, 0.005, 0));
      ls.push(boxGeo(0.1, bays[bays.length - 1][1] - bays[0][0], 0.012, BX1, (bays[0][0] + bays[bays.length - 1][1]) / 2, 0.005, 0));
      add('paving', merge(ls), 'bayLine', { en: 'Parking bays along the west wall', th: 'ช่องจอดรถตามกำแพงด้านตะวันตก', kind: 'building',
        info: lines(['Parking bays against the west wall between the coffee shop and KFC (Brian): an air-pump bay ("AIR PUMP" painted), two blue EV bays at the chargers (video 0:36, 0:58), then about five car bays up to the kerbed island at the drive-through entry. Each bay shown 2.5 × 5.0 m; number and size approximate.', AP.en],
          ['ช่องจอดรถชิดกำแพงด้านตะวันตกระหว่างร้านกาแฟกับ KFC (ตาม Brian): ช่องปั๊มลม (มีคำว่า AIR PUMP) ช่องจอดรถยนต์ไฟฟ้าสีฟ้า 2 ช่องที่เครื่องชาร์จ (วิดีโอ 0:36, 0:58) และช่องจอดรถประมาณ 5 ช่องจนถึงเกาะขอบคันหินที่ทางเข้าไดรฟ์ทรู แต่ละช่องแสดงขนาด 2.5 × 5.0 ม. จำนวนและขนาดโดยประมาณ', AP.th], AC) });
      // public footpath outside the front boundary, with a red-and-white kerb at the road (Brian's photo; video 4:10)
      add('surroundings', boxGeo(X1 - X0 + 8, 2.4, 0.30, (X0 + X1) / 2, Y0 - 1.2, -0.20, 0), 'walkway', { en: 'Public footpath along the road', th: 'ทางเท้าสาธารณะริมถนน', kind: 'building',
        info: lines(['Public footpath between the station and the road, about 2.4 m wide, with a red-and-white painted kerb at the road edge (Brian\'s photo; video 4:10).', AP.en], ['ทางเท้าสาธารณะระหว่างสถานีกับถนน กว้างประมาณ 2.4 ม. ขอบคันหินทาสีแดงขาวที่ริมถนน (ภาพของ Brian และวิดีโอ 4:10)', AP.th], AC) });
      add('surroundings', boxGeo(X1 - X0 + 8, 0.15, 0.32, (X0 + X1) / 2, Y0 - 2.4 + 0.075, -0.20, 0), 'kerbRed', { en: 'Road kerb', th: 'ขอบถนน', nopick: 1 });
    }
    // EV chargers and the air pump against the west wall between the coffee shop and KFC (Brian; video 0:28, 0:58, 1:02)
    add('buildings', merge([boxGeo(0.8, 0.6, 1.9, X0 + 0.9, -1.6, 0.15, 0), boxGeo(0.8, 0.6, 1.9, X0 + 0.9, 0.9, 0.15, 0)]), 'column', { en: 'EV chargers', th: 'เครื่องชาร์จรถยนต์ไฟฟ้า', kind: 'building',
      info: lines(['Two EV chargers under a small roof against the west wall, with parking bays in front (video 0:58, 1:02). Places approximate.'], ['เครื่องชาร์จรถยนต์ไฟฟ้า 2 เครื่องใต้หลังคาเล็กชิดกำแพงด้านตะวันตก มีช่องจอดด้านหน้า (วิดีโอ 0:58, 1:02) ตำแหน่งโดยประมาณ'], AC) });
    add('buildings', boxGeo(0.5, 0.4, 1.3, X0 + 0.8, -4.3, 0.15, 0), 'column', { en: 'Air pump', th: 'ปั๊มลมเติมยาง', kind: 'building', info: lines(['Tyre air pump against the west wall next to the EV chargers (video 0:28, 0:58). Place approximate.'], ['ปั๊มลมเติมยางชิดกำแพงด้านตะวันตกข้างเครื่องชาร์จ (วิดีโอ 0:28, 0:58) ตำแหน่งโดยประมาณ'], AC) });
    // the two pole signs at the front-right, about 12 m tall (Brian), plain panels
    add('buildings', merge([cylGeo(0.3, 12.0, 10.6, -18.6, 0, 16)]), 'signDark', { en: 'KFC pole sign (about 12 m)', th: 'เสาป้าย KFC (ประมาณ 12 ม.)', tag: 'Pole signs (12 m)', tagTh: 'เสาป้าย (12 ม.)', kind: 'building',
      info: lines(['Pole sign for the KFC drive-through on a single dark pole, about 12 m tall (Brian), between the Mini Big C tank and the canopy. Shown as a plain panel.'], ['เสาป้ายไดรฟ์ทรู KFC เสาเดี่ยวสีเข้ม สูงประมาณ 12 ม. (ตาม Brian) อยู่ระหว่างถังมินิบิ๊กซีกับหลังคาคลุมหัวจ่าย แสดงเป็นแผ่นป้ายเรียบ'], AC) }, V(10.6, -18.6, 12.8));
    add('buildings', boxGeo(0.5, 2.6, 3.2, 10.6, -18.6, 8.6, 0), 'signPanel', { en: 'Sign panel', th: 'แผ่นป้าย', nopick: 1 });
    add('buildings', merge([boxGeo(0.35, 0.35, 12.0, 10.6, -22.2, 0, 0), boxGeo(0.35, 0.35, 12.0, 10.6, -24.6, 0, 0)]), 'column', { en: 'Caltex pole sign (about 12 m)', th: 'เสาป้าย Caltex (ประมาณ 12 ม.)', kind: 'building',
      info: lines(['Caltex price sign on two posts at the front-right corner, about 12 m tall (Brian). Shown as a plain panel.'], ['ป้ายราคา Caltex เสาคู่ที่มุมหน้าขวา สูงประมาณ 12 ม. (ตาม Brian) แสดงเป็นแผ่นป้ายเรียบ'], AC) });
    add('buildings', boxGeo(0.45, 2.8, 5.5, 10.6, -23.4, 6.5, 0), 'signDark', { en: 'Sign panel', th: 'แผ่นป้าย', nopick: 1 });
    // boundary walls (firewalls on the back and both sides)
    for (const [x0, y0, x1, y1] of [[X0, Y1, X1, Y1], [X0, Y0 + 0.8, X0, Y1], [X1, Y0 + 0.8, X1, Y1]]) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      add('buildings', boxGeo(x0 === x1 ? 0.2 : len, x0 === x1 ? len : 0.2, 2.5, (x0 + x1) / 2, (y0 + y1) / 2, 0, 0), 'building', { en: 'Boundary firewall', th: 'กำแพงกันไฟแนวเขต', nopick: 1 });
    }

    // ---------- surroundings (layer can be switched off): the road in front and the elevated structure over it
    add('surroundings', prismGeo([[-90, -56], [70, -56], [70, Y0], [-90, Y0]], -0.25, 0.05), 'road', { en: 'Road in front of the station', th: 'ถนนหน้าสถานี', kind: 'building',
      info: lines(['Frontage road and main road in front of the station (from the satellite image).'], ['ถนนคู่ขนานและถนนสายหลักหน้าสถานี (จากภาพดาวเทียม)'], AC) });
    add('surroundings', merge([boxGeo(160, 8.5, 1.4, -10, -42.5, 8.0, 0), ...[-70, -40, -10, 20, 50].map((x) => boxGeo(1.6, 2.2, 8.0, x, -42.5, 0, 0))]), 'surroundBuilding', { en: 'Elevated road / rail over the main road', th: 'ทางยกระดับเหนือถนนสายหลัก', tag: 'Elevated structure', tagTh: 'ทางยกระดับ', kind: 'building',
      info: lines(['The elevated structure along the main road seen behind the station in the video. Line from the satellite image; height and pier spacing judged.'], ['ทางยกระดับตามแนวถนนสายหลักที่เห็นในวิดีโอ แนวจากภาพดาวเทียม ความสูงและระยะตอม่อเป็นค่าประมาณ'], AC) }, V(-10, -42.5, 10.5));
    add('surroundings', prismGeo(rect(-70, Y0, X0 - 0.3, Y1), 0, 7.0), 'surroundBuilding', { en: 'Neighbouring warehouse (west)', th: 'โกดังข้างเคียง (ด้านตะวันตก)', kind: 'building',
      info: lines(['Large building next to the west wall (satellite image; video 1:31). Height judged.'], ['อาคารขนาดใหญ่ติดกำแพงด้านตะวันตก (ภาพดาวเทียม วิดีโอ 1:31) ความสูงโดยประมาณ'], AC) });
  },
};
