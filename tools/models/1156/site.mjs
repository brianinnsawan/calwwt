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
//      - behind KFC, where the grease traps are, a rolling door opens to the room with the air pumps and controls;
//      - a small garbage room next to the toilets, on the exit side of the drive-through;
//      - the toilets have a solids (septic) tank between the building and the back firewall, and an aeration tank on the
//        exit (east) side, behind the women's side beyond the men's urinals;
//      - the fuel tank farm is between the toilets and the office / Mini Big C building, on the exit side;
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
  layers: ['tanks', 'sewer', 'drains', 'air', 'base', 'water', 'fuel', 'buildings', 'surroundings', 'plan', 'ground'],   // names, order and colours: ../style.mjs
  views: [
    { id: 'site', from: [-10, -72, 46], to: [-10, 6, 0] },
    { id: 'plan', from: [-10, 4.9, 120], to: [-10, 5, 0] },
    { id: 'kfc', en: 'KFC tanks and pump sump (drive-through lane)', th: 'ถัง KFC และบ่อสูบ (ช่องทางไดรฟ์ทรู)', from: [-30, 20, 12], to: [-18, 34, -1] },
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
      pipe('drains', out, 0.15, 'drain', { en: `U-drain: ${run.en}`, th: `รางระบายน้ำ (ยู): ${run.th}`, kind: 'drain',
        info: (m) => lines([`Open U-drain about 0.30 m wide with gratings, about ${m} m. Bottom shown from about ${lv(out[0][2])} to about ${lv(out[out.length - 1][2])} (assumed: 0.40 m deep at the far end, falling 1:200; which way it flows is assumed).`, VIDEO.en],
          [`รางระบายน้ำแบบเปิดกว้างประมาณ 0.30 ม. มีฝาตะแกรง ยาวประมาณ ${m} ม. ก้นรางแสดงจากประมาณ ${lv(out[0][2])} ถึงประมาณ ${lv(out[out.length - 1][2])} (ค่าสมมติ: ลึก 0.40 ม. ที่ปลายต้นราง ลาด 1:200 ทิศการไหลเป็นค่าสมมติ)`, VIDEO.th], A) });
      for (let i = 1; i < out.length; i++) {
        const [ax, ay] = out[i - 1], [bx, by] = out[i], len = Math.hypot(bx - ax, by - ay);
        add('drains', boxGeo(Math.abs(bx - ax) > 0.01 ? len : 0.42, Math.abs(by - ay) > 0.01 ? len : 0.42, 0.03, (ax + bx) / 2, (ay + by) / 2, 0, 0), 'cover', { en: 'U-drain grating', th: 'ฝาตะแกรงรางระบายน้ำ', nopick: 1 });
      }
    }
    ul.west = (y) => r2(START - (R - y) * FALL);
    ul.east = (y) => r2(START - (R - y) * FALL);

    // ---------- the two outlets at the road (Caltex deck: existing sampling points G2.1 at both front corners)
    const outlets = [
      { x: W + 0.2, y: Y0 + 1.1, w: 1.0, l: 1.4, inL: Math.min(runs[1].out[1][2], runs[2].out[1][2]), en: 'Outlet pit (entrance side, by the coffee shop)', th: 'บ่อทางออก (ฝั่งทางเข้า ข้างร้านกาแฟ)', tag: 'Outlet (entrance side)', tagTh: 'บ่อทางออก (ฝั่งทางเข้า)',
        lines: ['Where the west U-drain and the west half of the front drain leave the site, at the front-left corner. The Caltex deck marks the existing sampling point G2.1 here and a new point G2.2 at the coffee shop beside it.', 'Whether this is an oil trap (like the exit side) or a plain pit is not known: check on site.'],
        linesTh: ['จุดที่รางด้านตะวันตกและรางหน้าสถานีช่วงตะวันตกออกจากสถานี ที่มุมหน้าซ้าย ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างเดิม G2.1 ที่นี่ และจุดใหม่ G2.2 ที่ร้านกาแฟข้าง ๆ', 'ไม่ทราบว่าเป็นบ่อดักน้ำมัน (แบบฝั่งทางออก) หรือบ่อธรรมดา ต้องตรวจสอบหน้างาน'] },
      { x: 12.95, y: -23.6, w: 1.3, l: 2.6, inL: Math.min(runs[3].out[1][2], runs[4].out[1][2]), en: 'Oil trap (exit side)', th: 'บ่อดักน้ำมัน (ฝั่งทางออก)', tag: 'Oil trap (exit side)', tagTh: 'บ่อดักน้ำมัน (ฝั่งทางออก)', oil: 1,
        lines: ['Grated pit with two concrete plank covers against the east wall at the road (video, 3:38), where the east U-drain and the east half of the front drain meet. Size read from the video, about 1.3 × 2.6 m.', 'The Caltex deck marks the existing sampling point G2.1 here. The Mini Big C treatment tank is right behind it (Brian).'],
        linesTh: ['บ่อมีฝาตะแกรงและแผ่นคอนกรีต 2 แผ่น ชิดกำแพงด้านตะวันออกที่ริมถนน (วิดีโอ 3:38) จุดที่รางด้านตะวันออกและรางหน้าสถานีช่วงตะวันออกมาบรรจบ ขนาดประมาณจากวิดีโอ ประมาณ 1.3 × 2.6 ม.', 'ในเอกสารของ Caltex ระบุจุดเก็บตัวอย่างเดิม G2.1 ที่นี่ ถังบำบัดของมินิบิ๊กซีอยู่ด้านหลังบ่อนี้ทันที (ตาม Brian)'] },
    ];
    for (const o of outlets) {
      const g0 = ground(o.x, o.y), inL = r2(o.inL), floor = r2(inL - 0.5), outL = r2(inL - 0.05);
      add('drains', boxGeo(o.w, o.l, g0 - floor, o.x, o.y, floor, 0), o.oil ? 'oilTrap' : 'manhole', { en: o.en, th: o.th, tag: o.tag, tagTh: o.tagTh, lvl: `${lv(inL)} / ${lv(outL)}`, kind: 'manhole',
        info: lines([...o.lines, `Levels not known: inlet about ${lv(inL)}, outlet about ${lv(outL)}, floor shown 0.5 m below the inlet (assumed).`], [...o.linesTh, `ไม่ทราบระดับ: ท่อเข้าประมาณ ${lv(inL)} ท่อออกประมาณ ${lv(outL)} ก้นบ่อแสดงต่ำกว่าท่อเข้า 0.5 ม. (ค่าสมมติ)`], A) }, V(o.x, o.y, g0 + 0.8));
      add('drains', boxGeo(o.w + 0.1, o.l + 0.1, 0.03, o.x, o.y, g0, 0), 'cover', { en: 'Grating', th: 'ฝาตะแกรง', nopick: 1 });
      pipe('drains', [[o.x, o.y - o.l / 2, outL], [o.x, Y0 - 2.5, r2(outL - 0.05)]], 0.15, 'drain', { en: `${o.tag}: out to the public drain`, th: `${o.tagTh}: ออกท่อระบายน้ำสาธารณะ`, kind: 'drain',
        info: lines(['Out under the road edge to the public drain. Size, route and level assumed.'], ['ออกใต้ขอบถนนไปท่อระบายน้ำสาธารณะ ขนาด แนว และระดับเป็นค่าสมมติ'], A) });
    }

    // ---------- KFC: grease traps behind the kitchen, a line of tanks under the drive-through lane, pump sump at the back-west corner
    const LANE = 34.3;   // middle of the drive-through lane behind KFC (between the building, about y 32.5, and the back wall)
    {
      // grease traps: the square steel plates along the back of KFC by the rolling door (video 2:00-2:04)
      const gt = [[-9.4, 33.3], [-7.0, 33.3]];
      gt.forEach(([x, y], i) => {
        const g0 = ground(x, y);
        add('tanks', boxGeo(1.8, 1.0, 1.0, x, y, g0 - 1.0, 0), 'grease', { en: `KFC grease trap ${i + 1}`, th: `ถังดักไขมัน KFC ${i + 1}`, ...(i === 0 ? { tag: 'KFC grease traps', tagTh: 'ถังดักไขมัน KFC' } : {}), kind: 'tank',
          info: lines(['Grease trap behind the KFC kitchen, under the square steel plates in the lane next to the rolling door (video 2:00-2:04). How many there are and their size are not known: shown as two 1.8 × 1.0 m traps, 1.0 m deep.', 'Takes the kitchen water; out west to the KFC tanks under the lane.'],
            ['ถังดักไขมันหลังครัว KFC ใต้แผ่นเหล็กสี่เหลี่ยมบนช่องทางข้างประตูม้วน (วิดีโอ 2:00-2:04) ไม่ทราบจำนวนและขนาด แสดงเป็น 2 ถัง ขนาด 1.8 × 1.0 ม. ลึก 1.0 ม.', 'รับน้ำจากครัว ออกไปทางตะวันตกเข้าถัง KFC ใต้ช่องทาง'], A) }, i === 0 ? V(-8.2, y, g0 + 0.8) : null);
        plate(x - 0.45, y, 0.8, 0.8, 'Grease trap plate', 'แผ่นปิดถังดักไขมัน'); plate(x + 0.45, y, 0.8, 0.8, 'Grease trap plate', 'แผ่นปิดถังดักไขมัน');
      });
      // the KFC tanks: a line of about eight round lids down the lane (video 1:40, 1:53). Shown as three lying tanks.
      const tanks = [[-12.6, 4.4], [-18.3, 5.0], [-24.2, 5.0]];   // centre x, length (flow east to west)
      const r = 0.8, top = r2(ground(-18, LANE) - 0.35), axis = top - r, inL = r2(top - 0.25);
      tanks.forEach(([x, len], i) => {
        add('tanks', capsuleGeo(r, len, x, LANE, axis, 0, 0.25), 'tank', { en: `KFC treatment tank ${i + 1} (under the drive-through lane)`, th: `ถังบำบัด KFC ${i + 1} (ใต้ช่องทางไดรฟ์ทรู)`, ...(i === 1 ? { tag: 'KFC tanks', tagTh: 'ถัง KFC' } : {}), kind: 'tank',
          info: lines(['The KFC tanks are in a line under the drive-through lane behind KFC (Brian); the video shows about eight round lids in a row down the lane. How many tanks, which type and what size are not known: shown as three lying tanks, 1.6 m across.',
            `Top shown about ${lv(top)} (0.35 m under the lane), pipe in about ${lv(inL)} (assumed). Water goes from the grease traps west along the line of tanks to the pump sump at the back-west corner.`,
            'Brian (Nov 2026): the blowers and controls are in the room behind the rolling door at the back of KFC.'],
          ['ถังของ KFC อยู่เรียงกันใต้ช่องทางไดรฟ์ทรูหลัง KFC (ตาม Brian) ในวิดีโอเห็นฝากลมประมาณ 8 ฝาเรียงตามช่องทาง ไม่ทราบจำนวน ชนิด และขนาด แสดงเป็นถังนอน 3 ถัง กว้าง 1.6 ม.',
            `หลังถังแสดงประมาณ ${lv(top)} (ต่ำกว่าช่องทาง 0.35 ม.) ท่อเข้าประมาณ ${lv(inL)} (ค่าสมมติ) น้ำไหลจากถังดักไขมันไปทางตะวันตกผ่านถังเรียงกันไปบ่อสูบที่มุมหลังด้านตะวันตก`,
            'Brian (พ.ย. 2026): เครื่องเป่าลมและตู้ควบคุมอยู่ในห้องหลังประตูม้วนด้านหลัง KFC'], A) }, i === 1 ? V(x, LANE, ground(x, LANE) + 0.8) : null);
      });
      for (const lx of [-26.0, -24.0, -22.4, -20.0, -18.0, -16.4, -13.8, -11.4]) lid(lx, LANE, top, 0.3, 'KFC tank lid', 'ฝาถัง KFC');
      add('base', boxGeo(17.0, 2.0, 0.2, -18.6, LANE, axis - r - 0.2, 0), 'slab', { en: 'KFC tank base (assumed)', th: 'ฐานถัง KFC (ค่าสมมติ)', kind: 'base', info: lines(['A concrete base under the KFC tanks is assumed; not seen.'], ['ฐานคอนกรีตใต้ถัง KFC เป็นค่าสมมติ มองไม่เห็น'], A) });
      // pipes: kitchen -> grease traps -> tanks -> sump
      pipe('sewer', [[-8.2, 32.5, inL + 0.25], [-8.2, 32.9, inL + 0.22]], 0.05, 'sewerRaw', { en: 'KFC kitchen to the grease traps', th: 'ท่อจากครัว KFC ไปถังดักไขมัน', kind: 'pipe', info: lines(['4" pipe from the kitchen out through the back wall.', ASSUMED.en], ['ท่อ 4 นิ้วจากครัวออกผ่านผนังด้านหลัง', ASSUMED.th], A) });
      pipe('sewer', [[-10.3, 33.3, inL + 0.12], [-10.6, LANE, inL]], 0.05, 'sewerRaw', { en: 'Grease traps to the KFC tanks', th: 'ท่อจากถังดักไขมันไปถัง KFC', kind: 'pipe', info: lines(['4" pipe.', ASSUMED.en], ['ท่อ 4 นิ้ว', ASSUMED.th], A) });
      const sx = X0 + 1.3, sy = 34.6, sTop = ground(sx, sy), sFloor = r2(inL - 1.5), outT = r2(inL - 0.12);
      pipe('sewer', [[-26.7, LANE, outT], [sx + 0.6, LANE, r2(outT - 0.06)], [sx + 0.6, sy, r2(outT - 0.07)]], 0.05, 'sewerTreated', { en: 'KFC tanks to the pump sump', th: 'ท่อจากถัง KFC ไปบ่อสูบ', kind: 'pipe', info: lines(['From the west end of the line of tanks to the sump.', ASSUMED.en], ['จากปลายด้านตะวันตกของถังไปบ่อสูบ', ASSUMED.th], A) });
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
      add('air', boxGeo(0.7, 0.5, 0.6, -8.2, 31.6, 0.15, 0), 'airPump', { en: 'KFC air pumps and controls (behind the rolling door)', th: 'เครื่องเป่าลมและตู้ควบคุม KFC (หลังประตูม้วน)', kind: 'tank',
        info: lines(['Behind the rolling door at the back of KFC, where the grease traps are, is the room with the air pumps and controls (Brian; video 2:00-2:04). Shown as one box; how many and which pumps are not known. The air pipe route to the tanks is not known and not drawn.'],
          ['หลังประตูม้วนด้านหลัง KFC ตรงที่มีถังดักไขมัน เป็นห้องเครื่องเป่าลมและตู้ควบคุม (ตาม Brian วิดีโอ 2:00-2:04) แสดงเป็นกล่องเดียว ไม่ทราบจำนวนและรุ่น ไม่ทราบแนวท่อลมไปถังจึงไม่ได้แสดง'], A) });
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
    ['T1', 'T2', 'T3', 'T4'].forEach((label, i) => fuelTank(label, 2.6 + i * 2.85, 9.8, 90, { src: A,
      en: ['No drawings: the number of tanks, which way they lie and their products are not known. Shown as four tanks under the pad with the round covers (video 2:53), from the four or five vent pipes by the office.'],
      th: ['ไม่มีแบบ: ไม่ทราบจำนวนถัง ทิศการวาง และชนิดน้ำมัน แสดงเป็น 4 ถังใต้ลานที่มีฝากลม (วิดีโอ 2:53) ประมาณจากท่อระบายไอ 4-5 ท่อข้างสำนักงาน'] }));
    add('fuel', merge([0, 1, 2, 3, 4].map((k) => cylGeo(0.05, 6.5, 13.55, 0.6 + k * 0.18, 0))), 'fuelPipe', { en: 'Fuel tank vent pipes', th: 'ท่อระบายไอถังน้ำมัน', kind: 'pipe',
      info: lines(['Five white vent pipes on a frame against the east wall at the back corner of the office (video 3:07, 3:13). Height judged from the video, about 6.5 m.'], ['ท่อระบายไอสีขาว 5 ท่อบนโครงชิดกำแพงด้านตะวันออก ที่มุมหลังสำนักงาน (วิดีโอ 3:07, 3:13) ความสูงประมาณจากวิดีโอ ประมาณ 6.5 ม.'], A) });

    // ---------- buildings, canopy and signs (context: outlines from the satellite image, heights from the video)
    const building = (poly, floor, h, material, o) => add('buildings', prismGeo(poly, floor, h), material, { ...o, kind: 'building', info: lines(o.lines || [], o.linesTh || [], AC) },
      o.tag ? V(poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length, floor + h + 0.7) : null);
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    building(rect(-28.0, 22.0, -2.5, 32.5), 0.15, 5.5, 'building', { en: 'KFC drive-through restaurant', th: 'ร้าน KFC (ไดรฟ์ทรู)', tag: 'KFC', tagTh: 'KFC',
      lines: ['Restaurant at the back-left of the site, with the drive-through lane round its west side and behind it (order point at the west end, pay and pick-up windows at the east end). Grease traps and the rolling door to the air pump room are at the back.'],
      linesTh: ['ร้านอาหารที่มุมหลังซ้ายของสถานี ช่องทางไดรฟ์ทรูอ้อมด้านตะวันตกและด้านหลัง (จุดสั่งที่ปลายด้านตะวันตก ช่องจ่ายเงินและรับสินค้าที่ปลายด้านตะวันออก) ถังดักไขมันและประตูม้วนห้องเครื่องเป่าลมอยู่ด้านหลัง'] });
    building(rect(-31.0, 22.0, -28.0, 25.0), 0.15, 10.0, 'building', { en: 'KFC "Drive Thru" tower', th: 'หอป้าย "Drive Thru" ของ KFC', lines: ['The tall red tower at the west end of KFC (video 1:09). Height judged from the video.'], linesTh: ['หอสีแดงสูงที่ปลายด้านตะวันตกของ KFC (วิดีโอ 1:09) ความสูงประมาณจากวิดีโอ'] });
    building(rect(-30.2, 26.0, -28.0, 29.5), 0.15, 3.0, 'building', { en: 'Drive-through order point', th: 'จุดสั่งอาหารไดรฟ์ทรู', lines: ['Order point with a small roof on the west side of KFC (video 1:31).'], linesTh: ['จุดสั่งอาหารมีหลังคาเล็กด้านตะวันตกของ KFC (วิดีโอ 1:31)'] });
    building(rect(2.5, 21.0, 11.8, 32.5), 0.15, 3.3, 'building', { en: 'Toilets', th: 'ห้องน้ำ', tag: 'Toilets', tagTh: 'ห้องน้ำ',
      lines: ['Public toilets at the back-right. Men\'s urinals open onto the grass strip on the east side; the women\'s side is beyond them (video 2:36).'], linesTh: ['ห้องน้ำสาธารณะที่มุมหลังขวา โถปัสสาวะชายเปิดออกสู่แนวหญ้าด้านตะวันออก ฝั่งหญิงอยู่ถัดไป (วิดีโอ 2:36)'] });
    building(rect(-0.3, 32.9, 2.4, 35.75), 0.15, 2.4, 'building', { en: 'Garbage room', th: 'ห้องขยะ', lines: ['Small garbage room with grey double doors next to the toilets, on the exit side of the drive-through (Brian; video 2:14). Place approximate.'], linesTh: ['ห้องขยะเล็กประตูคู่สีเทาข้างห้องน้ำ ฝั่งทางออกของไดรฟ์ทรู (ตาม Brian วิดีโอ 2:14) ตำแหน่งโดยประมาณ'] });
    building(rect(6.0, -15.5, 13.3, 0.0), 0.15, 3.6, 'building', { en: 'Office and Mini Big C', th: 'สำนักงานและมินิบิ๊กซี', tag: 'Office / Mini Big C', tagTh: 'สำนักงาน / มินิบิ๊กซี',
      lines: ['One-storey building on the exit side: the office at the back end (facing the tank farm), Mini Big C at the front under the end of the canopy.'], linesTh: ['อาคารชั้นเดียวฝั่งทางออก สำนักงานอยู่ด้านหลัง (หันหน้าไปลานถังน้ำมัน) มินิบิ๊กซีอยู่ด้านหน้าใต้ปลายหลังคาคลุมหัวจ่าย'] });
    building(rect(-32.6, -17.0, -25.5, -6.5), 0.15, 3.8, 'building', { en: 'Coffee shop', th: 'ร้านกาแฟ', tag: 'Coffee shop', tagTh: 'ร้านกาแฟ',
      lines: ['Newer black one-storey coffee shop at the front, entrance side, with a planter along the front (video 0:07-0:17, 4:07). Outline from the older satellite image (the earlier small shop here); size approximate.'],
      linesTh: ['ร้านกาแฟชั้นเดียวสีดำที่สร้างใหม่กว่า อยู่ด้านหน้าฝั่งทางเข้า มีกระบะต้นไม้ด้านหน้า (วิดีโอ 0:07-0:17, 4:07) แนวจากภาพดาวเทียมรุ่นเก่า (ร้านเล็กเดิมตรงนี้) ขนาดโดยประมาณ'] });
    building([[-15.2, -19.5], [-6.4, -19.5], [-6.4, -16.0], [6.0, -16.0], [6.0, -1.0], [-6.4, -1.0], [-6.4, 15.0], [-15.2, 15.0]], 5.2, 1.0, 'roof', { en: 'Canopy', th: 'หลังคาคลุมหัวจ่าย', tag: 'Canopy', tagTh: 'หลังคาคลุมหัวจ่าย',
      lines: ['L-shaped canopy: the long part runs from the road towards KFC over the pump islands, the short part joins the Mini Big C building (outline from the satellite image; video 4:07).'], linesTh: ['หลังคารูปตัว L: ส่วนยาวจากถนนไปทาง KFC คลุมแท่นหัวจ่าย ส่วนสั้นต่อกับอาคารมินิบิ๊กซี (แนวจากภาพดาวเทียม วิดีโอ 4:07)'] });
    for (const [x, y] of [[-12.8, 12], [-8.8, 12], [-12.8, 1], [-8.8, 1], [-12.8, -10], [-8.8, -10], [-12.8, -17.5], [-8.8, -17.5], [-2, -13], [-2, -3.5]]) add('buildings', boxGeo(0.45, 0.45, 5.05, x, y, 0.15, 0), 'column', { en: 'Canopy column', th: 'เสาหลังคา', nopick: 1 });
    [[11.5, '7/8'], [3.8, '5/6'], [-3.9, '3/4'], [-11.6, '1/2']].forEach(([y, n]) => {
      add('buildings', boxGeo(1.2, 4.2, 0.2, -10.8, y, 0, 0), 'column', { en: 'Pump island', th: 'แท่นหัวจ่าย', nopick: 1 });
      add('buildings', boxGeo(0.6, 1.0, 2.0, -10.8, y, 0.2, 0), 'islands', { en: `Dispenser ${n}`, th: `ตู้จ่าย ${n}`, kind: 'building', info: lines([`Dispenser for pumps ${n}, numbered from the road (pumps 1, 3, 5, 7 seen in the video). Number of islands judged from the video.`], [`ตู้จ่ายหัวจ่าย ${n} นับจากถนน (เห็นหัวจ่าย 1, 3, 5, 7 ในวิดีโอ) จำนวนแท่นประมาณจากวิดีโอ`], AC) });
    });
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
