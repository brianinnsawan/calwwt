// Water sampling points and the "final design" concept for a site model (Brian, 27 Nov 2026: show the testing points and the
// final designs so people can see and understand them). build.mjs calls this after the site file when
// tools/models/<code>/sampling.json exists.
//
// sampling.json
// {
//   "risk": "HIGH" | "MEDIUM" | "LOW",
//   "source": { "en": "...", "th": "..." },                 // where the points come from (deck slides, Aqua, Brian)
//   "points": [ {
//       "id": "S1",                                            // also the order of the walk-through
//       "group": "G2.1" | "G2.2" | "G2.1+G2.2",
//       "status": "existing" | "new" | "construction",       // construction = future, shown only in "Final design"
//       "stage": "now" | "future",                             // only in "2026 sampling" / only in "Final design" (default: both)
//       "at": "Oil trap (exit side)",                          // name of a thing in the model (start of its name), or:
//       "x": 1181.4, "y": -32.3,                               //   drawing x, y; "dx", "dy" move it from "at"
//       "take": -0.6,                                          // level where the water is taken (default 0.8 m below ground)
//       "where": { "en": "...", "th": "..." },                 // where to dip, in words
//       "samples": 1,
//       "upstream": ["Septic tank", "Toilets"],               // names of things that drain to this point (start of name)
//       "note": { "en": "...", "th": "..." },
//       "src": "deck" | "site" | "drawn" | "part",             // how sure the position is
//       "result": { "date": "2026-11-21", "lab": "Aqua Nishihara", "values": { "pH": 7.1, "COD": 88 } }
//   } ],
//   "routes": [ { "group": "G2.1", "pts": [[x, y], ...] } ],    // final-design water routes (deck FUTURE slide), on the ground
//   "future": [ { "type": "ows" | "tank" | "capsule" | "box", "en": "...", "th": "...", "x": 0, "y": 0, "w": 2, "l": 4, "rot": 0,
//                 "depth": 2.0, "note": { "en": "...", "th": "..." } } ]
// }
import { SAMPLE_GROUPS, SAMPLE_STATUS, PARAM_NAMES, limitsFor } from './style.mjs';

const SRC_LINE = {
  deck: { en: 'Position read from the Caltex deck (SPP Sites R1); the deck is a sketch, so the place can be a few metres out.', th: 'ตำแหน่งอ่านจากเอกสารของ Caltex (SPP Sites R1) ซึ่งเป็นภาพร่าง ตำแหน่งอาจคลาดเคลื่อนได้ไม่กี่เมตร' },
  site: { en: 'Position from the site visit (Aqua\'s sampling and Brian\'s notes) on the model\'s drawing.', th: 'ตำแหน่งจากการสำรวจหน้างาน (การเก็บตัวอย่างของ Aqua และบันทึกของ Brian) บนแบบของโมเดล' },
  drawn: { en: 'Position is from the drawings.', th: 'ตำแหน่งมาจากแบบ' },
  part: { en: 'Position is approximate: to confirm on site.', th: 'ตำแหน่งเป็นค่าประมาณ ต้องยืนยันหน้างาน' },
};

export function buildSampling(data, api, scene) {
  const { THREE, V, ground, add, cylGeo, boxGeo, capsuleGeo, lv } = api;
  const OXY = api.origin;
  const meshes = []; scene.traverse((o) => { if (o.isMesh && o.userData?.en) meshes.push(o); });
  const find = (n) => { const ex = meshes.filter((o) => o.userData.en === n); return ex.length ? ex : meshes.filter((o) => o.userData.en.startsWith(n) || o.userData.tag === n); };
  const centre = (list) => { const b = new THREE.Box3(); list.forEach((o) => b.expandByObject(o)); const c = b.getCenter(new THREE.Vector3()); return [c.x + OXY[0], OXY[1] - c.z, b]; };

  const pts = [];
  for (const p of data.points) {
    if (!SAMPLE_GROUPS[p.group.split('+')[0]] || !SAMPLE_STATUS[p.status]) throw new Error(`Sampling point ${p.id}: bad group or status`);
    let x = p.x, y = p.y;
    if (p.at) { const f = find(p.at); if (!f.length) throw new Error(`Sampling point ${p.id}: nothing called "${p.at}" in the model`); [x, y] = centre(f); }
    x += p.dx || 0; y += p.dy || 0;
    const up = [];
    for (const n of p.upstream || []) { const f = find(n); if (!f.length) throw new Error(`Sampling point ${p.id}: upstream "${n}" is not in the model`); up.push(n); }
    const g0 = ground(x, y), take = p.take ?? g0 - 0.8;
    pts.push({ ...p, x, y, g0, take, take0: p.take ?? null, upstream: up });
  }

  const status = (s) => SAMPLE_STATUS[s];
  const groupMat = (g) => (g === 'G2.1' ? 'sampleG21' : 'sampleG22');
  const headMat = { existing: 'sampleExisting', new: 'sampleNew', construction: 'sampleBuild' };
  for (const [i, p] of pts.entries()) {
    const groups = p.group.split('+'), lim = limitsFor(p.group), st = status(p.status);
    const stage = p.stage || (p.status === 'construction' ? 'future' : null);   // null = shown in both 2026 sampling and final design
    const label = `${p.id} · ${p.group}`;
    const sample = { id: p.id, n: i + 1, group: p.group, status: p.status, stage, samples: p.samples || 1, params: Object.keys(lim), limits: lim,
      where: p.where || null, note: p.note || null, upstream: p.upstream, result: p.result || null, src: p.src || 'part',
      level: +p.take.toFixed(2), levelAssumed: p.take0 == null, ground: +p.g0.toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2) };
    const en = `${label} · ${st.en}`, th = `${label} · ${st.th}`;
    const info = {
      en: [`${st.en}, ${groups.map((g) => SAMPLE_GROUPS[g].en).join(' and ')}.`, ...(p.where ? [`Take the sample: ${p.where.en}`] : []),
        `${sample.samples} sample${sample.samples > 1 ? 's' : ''}, ${sample.params.length} parameters: ${sample.params.map((k) => PARAM_NAMES[k].en).join(', ')}.`,
        `Water taken at about ${lv(p.take)} (${(p.g0 - p.take).toFixed(2)} m below ground${p.take0 == null ? ', assumed' : ''}).`, ...(p.note ? [p.note.en] : []), SRC_LINE[sample.src].en],
      th: [`${st.th} ${groups.map((g) => SAMPLE_GROUPS[g].th).join(' และ ')}`, ...(p.where ? [`จุดตักน้ำ: ${p.where.th}`] : []),
        `${sample.samples} ตัวอย่าง ${sample.params.length} พารามิเตอร์: ${sample.params.map((k) => PARAM_NAMES[k].th).join(', ')}`,
        `ตักน้ำที่ระดับประมาณ ${lv(p.take)} (ต่ำกว่าพื้น ${(p.g0 - p.take).toFixed(2)} ม.${p.take0 == null ? ' ค่าสมมติ' : ''})`, ...(p.note ? [p.note.th] : []), SRC_LINE[sample.src].th],
    };
    const o = (extra = {}) => ({ en, th, kind: 'sample', info, ...extra });
    const tagged = (m) => { m.userData.sample = sample; m.userData.status = p.status; if (stage) m.userData.stage = stage; return m; };
    const H = 3.4, top = p.g0 + H, headAt = V(p.x, p.y, top + 0.5);   // tall enough to see over cars and canopies from the whole-site view
    // pole, coloured bands for the group (two bands for a combined G2.1+G2.2 point) and the head: the deck's marker
    tagged(add('sampling', cylGeo(0.06, H, p.x, p.y, p.g0, 10), 'samplePole', o()));
    groups.forEach((g, k) => tagged(add('sampling', cylGeo(0.14, 0.45, p.x, p.y, top - 0.6 - k * 0.5, 16), groupMat(g), o())));
    const head = p.status === 'construction' ? new THREE.BoxGeometry(0.95, 0.95, 0.95) : new THREE.SphereGeometry(0.52, 24, 16);
    head.translate(headAt.x, headAt.y, headAt.z);
    tagged(add('sampling', head, headMat[p.status], o({ tag: label, tagTh: label }), V(p.x, p.y, top + 1.45)));
    // ring on the ground and a dashed line down to where the water is taken, in the group colour
    const ring = new THREE.TorusGeometry(0.5, 0.05, 6, 32); ring.rotateX(Math.PI / 2); const gp = V(p.x, p.y, p.g0 + 0.04); ring.translate(gp.x, gp.y, gp.z);
    tagged(add('sampling', ring, groupMat(groups[0]), o()));
    const dash = [], d = p.g0 - p.take;
    for (let z = 0; z < d - 0.02; z += 0.2) dash.push(cylGeo(0.03, Math.min(0.12, d - z), p.x, p.y, p.take + z, 8));
    if (dash.length) tagged(add('sampling', api.merge(dash), groupMat(groups[0]), o()));
    const dot = new THREE.SphereGeometry(0.13, 16, 10); const dp = V(p.x, p.y, p.take); dot.translate(dp.x, dp.y, dp.z);
    tagged(add('sampling', dot, groupMat(groups[0]), o()));
    // a construction point is a new standard sampling chamber (the same on every site): concrete box 0.80 x 0.80 m inside
    if (p.status === 'construction') {
      const bot = p.take - 0.3, h = p.g0 - bot, w = 0.8, t = 0.1, walls = [];
      for (const [dx, dy, a, b] of [[0, (w + t) / 2, w + 2 * t, t], [0, -(w + t) / 2, w + 2 * t, t], [(w + t) / 2, 0, t, w], [-(w + t) / 2, 0, t, w]]) walls.push(boxGeo(a, b, h, p.x + dx, p.y + dy, bot));
      walls.push(boxGeo(w + 2 * t, w + 2 * t, 0.1, p.x, p.y, bot - 0.1));
      const m = add('proposed', api.merge(walls), 'proposedTank', { en: `${p.id} · New sampling chamber (concept)`, th: `${p.id} · บ่อเก็บตัวอย่างใหม่ (แนวคิด)`, kind: 'future',
        info: { en: [`Standard sampling chamber for ${p.id}, 0.80 × 0.80 m inside, bottom ${lv(bot)}, so the water can be taken from the outlet pipe without entering the chamber.`, 'Concept only: size and depth to be set in the 2027 design package.'],
          th: [`บ่อเก็บตัวอย่างมาตรฐานของ ${p.id} ขนาดภายใน 0.80 × 0.80 ม. ก้นบ่อ ${lv(bot)} ให้ตักน้ำจากท่อออกได้โดยไม่ต้องลงบ่อ`, 'เป็นแนวคิดเท่านั้น ขนาดและความลึกจะกำหนดในชุดแบบปี 2027'] } });
      m.userData.stage = 'future';
    }
  }

  // final design (deck "FUTURE" slides): where a new OWS or wastewater treatment goes, and the water routes to the outlets
  const FUT = { en: 'Final design concept from the Caltex deck "FUTURE" slide (SPP Sites R1): a sketch of the idea, not a design. Sizes, routes and levels come in the 2027 design package.',
    th: 'แนวคิดแบบสุดท้ายจากหน้า "FUTURE" ในเอกสารของ Caltex (SPP Sites R1) เป็นภาพร่างแนวคิด ไม่ใช่แบบ ขนาด แนวท่อ และระดับจะอยู่ในชุดแบบปี 2027' };
  for (const [k, f] of (data.future || []).entries()) {
    if (f.type === 'ows') {
      const g0 = ground(f.x, f.y), H = 3.4, en = f.en || 'New OWS or new wastewater treatment', th = f.th || 'บ่อแยกน้ำมันใหม่ หรือระบบบำบัดน้ำเสียใหม่';
      const o = { en: `${en} (final design)`, th: `${th} (แบบสุดท้าย)`, kind: 'future', info: { en: [`${en}.`, ...(f.note ? [f.note.en] : []), FUT.en], th: [`${th}`, ...(f.note ? [f.note.th] : []), FUT.th] } };
      const cone = new THREE.ConeGeometry(0.62, 1.1, 3); const c = V(f.x, f.y, g0 + H + 0.55); cone.translate(c.x, c.y, c.z);
      const parts = [add('proposed', cylGeo(0.045, H, f.x, f.y, g0, 10), 'samplePole', o), add('proposed', cone, 'sampleOWS', { ...o, tag: f.tag || 'New OWS / WWT', tagTh: f.tagTh || 'OWS / ระบบบำบัดใหม่' }, V(f.x, f.y, g0 + H + 1.5))];
      const zone = new THREE.CircleGeometry(f.r || 2.0, 40); zone.rotateX(-Math.PI / 2); const z = V(f.x, f.y, g0 + 0.06); zone.translate(z.x, z.y, z.z);
      parts.push(add('proposed', zone, 'sampleZone', o));
      parts.forEach((m) => { m.userData.stage = 'future'; });
    } else {
      const g0 = ground(f.x, f.y), depth = f.depth ?? 2.0, w = f.w ?? 2.0, l = f.l ?? 4.0;
      const geo = f.type === 'capsule' ? capsuleGeo(w / 2, l, f.x, f.y, g0 - 0.5 - w / 2, f.rot || 0) : boxGeo(w, l, depth, f.x, f.y, g0 - depth, f.rot || 0);
      const m = add('proposed', geo, 'proposedTank', { en: f.en, th: f.th, tag: f.tag || f.en, tagTh: f.tagTh || f.th, kind: 'future',
        info: { en: [...(f.note ? [f.note.en] : []), FUT.en], th: [...(f.note ? [f.note.th] : []), FUT.th] } }, V(f.x, f.y, g0 + 1.2));
      m.userData.stage = 'future';
    }
  }
  for (const r of data.routes || []) {
    const en = `${r.group} water route (final design)`, th = `แนวน้ำ ${r.group} (แบบสุดท้าย)`;
    const pipe = api.pipeGeo(r.pts.map(([x, y]) => [x, y, ground(x, y) + 0.06]), 0.13);
    const m = add('proposed', pipe.geometry, r.group === 'G2.1' ? 'sampleRoute21' : 'sampleRoute22', { en, th, kind: 'future',
      info: { en: [`How the ${r.group === 'G2.1' ? 'oil-side (G2.1: forecourt, fuel)' : 'wastewater-side (G2.2: toilets, kitchens, shops)'} water is collected in the final design, drawn on the ground to show the idea.`, ...(r.note ? [r.note.en] : []), FUT.en],
        th: [`แนวรวบรวมน้ำ${r.group === 'G2.1' ? 'ฝั่งน้ำมัน (G2.1: ลานจ่ายน้ำมัน)' : 'ฝั่งน้ำเสีย (G2.2: ห้องน้ำ ครัว ร้านค้า)'}ในแบบสุดท้าย วาดบนพื้นเพื่อแสดงแนวคิด`, ...(r.note ? [r.note.th] : []), FUT.th] } });
    m.userData.stage = 'future';
  }

  // the "Sampling points" view: from the south, high enough to see every point
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of [...pts, ...(data.future || [])]) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(x1 - x0, y1 - y0, 25);
  const view = { id: 'samples', from: [cx - span * 0.1, cy - span * 0.58, span * 1.55], to: [cx - span * 0.1, cy - span * 0.3, 0] };   // almost from above, shifted so no point hides behind the info card (bottom left)

  const stageOf = (p) => p.stage || (p.status === 'construction' ? 'future' : null);
  const count = (g, st) => pts.filter((p) => p.group === g && stageOf(p) !== st).reduce((s, p) => s + (p.samples || 1), 0);
  const counts = (st) => ['G2.1', 'G2.2', 'G2.1+G2.2'].map((g) => ({ group: g, samples: count(g, st), params: Object.keys(limitsFor(g)).length })).filter((c) => c.samples);
  const meta = { risk: data.risk || null, source: data.source || null, order: pts.map((p) => p.id),
    counts: counts('future'), futureCounts: counts('now'),
    groups: SAMPLE_GROUPS, params: PARAM_NAMES, status: SAMPLE_STATUS, hasFuture: (data.future || []).length > 0 || (data.routes || []).length > 0 || pts.some((p) => stageOf(p)) };
  return { meta, view };
}
