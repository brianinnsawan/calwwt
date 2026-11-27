// Water sampling points and the final design on the site model (Brian, 27 Nov 2026).
// The model's OWN sumps, traps and pipes carry the story; nothing is copied from the PowerPoint's lines:
//   - 2026 sampling: the sump / trap / tank each sample is taken from is coloured (red G2.1, blue G2.2), framed and labelled,
//     and the other labels are hidden.
//   - Final design: every existing pipe system is coloured red or blue as in the Caltex deck's concept; only what is really
//     needed is added (an assumed existing pipe, a flag where waters mix, a place for a new OWS / WWT).
// build.mjs calls this after the site file when tools/models/<code>/sampling.json exists. The viewer does the colouring
// (it changes with the stage switch); this file checks every name against the model so nothing silently goes missing.
//
// sampling.json
// {
//   "risk": "HIGH" | "MEDIUM" | "LOW",  "source": { "en", "th" },
//   "points": [ {                                   // the sampling points, in walk-through order
//       "id": "S1", "group": "G2.1" | "G2.2" | "G2.1+G2.2", "status": "existing" | "new" | "construction",
//       "stage": "now" | "future",                  // only in 2026 sampling / only in the final design (default: both)
//       "at": ["Oil trap (west outfall)"],          // the thing(s) in the model the water is taken from (exact name or start of name)
//       "x": 0, "y": 0,                             // or a position, for a point with nothing in the model yet (a small new sump is drawn)
//       "where": { "en", "th" }, "samples": 1, "upstream": ["names of things that drain here"], "note": { "en", "th" },
//       "src": "deck" | "site" | "drawn" | "part", "take": -0.6, "label": [dx, dy],   // label moved off the sump (m), where two sit close
//       "result": { "date", "lab", "values": { "pH": 7.1 } } } ],
//   "systems": [ { "group": "G2.1", "names": ["Site drain: canopy", "Manhole A"] } ],      // final design: existing pipes and sumps by colour
//   "pipes": [ { "en", "th", "group", "pts": [[x, y, invert or null]], "note": { "en", "th" } } ],   // existing pipes not on the drawing
//   "flags": [ { "x", "y", "en", "th", "note": { "en", "th" } } ],                                // final design: where something needs fixing
//   "future": [ { "x", "y", "en", "th", "note": { "en", "th" } } ]                                // final design: place for a new OWS / WWT
// }
import { SAMPLE_GROUPS, SAMPLE_STATUS, PARAM_NAMES, limitsFor } from './style.mjs';

const SRC_LINE = {
  deck: { en: 'Sampling point from the Caltex deck (SPP Sites R1), put on the sump it marks.', th: 'จุดเก็บตัวอย่างจากเอกสารของ Caltex (SPP Sites R1) วางบนบ่อที่จุดนั้นระบุ' },
  site: { en: 'Sampling point from the site visit (Aqua\'s sampling and Brian\'s notes).', th: 'จุดเก็บตัวอย่างจากการสำรวจหน้างาน (การเก็บตัวอย่างของ Aqua และบันทึกของ Brian)' },
  drawn: { en: 'Position is from the drawings.', th: 'ตำแหน่งมาจากแบบ' },
  part: { en: 'Position is approximate: to confirm on site.', th: 'ตำแหน่งเป็นค่าประมาณ ต้องยืนยันหน้างาน' },
};
const FUT = { en: 'Final design concept (Caltex deck FUTURE slide): the place is marked, the design comes in the 2027 design package.', th: 'แนวคิดแบบสุดท้าย (หน้า FUTURE ในเอกสารของ Caltex): ระบุตำแหน่งไว้ แบบจริงจะอยู่ในชุดแบบปี 2027' };

export function buildSampling(data, api, scene) {
  const { THREE, V, ground, add, boxGeo } = api;
  const [OX, OY] = api.origin;
  const meshes = () => { const l = []; scene.traverse((o) => { if (o.isMesh && o.userData?.en) l.push(o); }); return l; };
  const find = (n, all = meshes()) => { const ex = all.filter((o) => o.userData.en === n); return ex.length ? ex : all.filter((o) => o.userData.en.startsWith(n) || o.userData.tag === n); };
  const need = (n, what) => { const f = find(n); if (!f.length) throw new Error(`${what}: nothing called "${n}" in the model`); return f; };
  const toXY = (v) => [v.x + OX, OY - v.z];
  const groupMat = (g) => (g === 'G2.1' ? 'sampleG21' : 'sampleG22');
  /** A frame on the ground round a plan rectangle: 4 bars `w` wide, `h` high. */
  const frame = (x0, y0, x1, y1, w, h) => {
    const g = (x, y) => ground(x, y), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, L = x1 - x0 + 2 * w, D = y1 - y0;
    return api.merge([boxGeo(L, w, h, cx, y0 - w / 2, g(cx, y0) + 0.01), boxGeo(L, w, h, cx, y1 + w / 2, g(cx, y1) + 0.01),
      boxGeo(w, D, h, x0 - w / 2, cy, g(x0, cy) + 0.01), boxGeo(w, D, h, x1 + w / 2, cy, g(x1, cy) + 0.01)]);
  };

  const extra = [];
  // existing pipes that are not on the drawing (from Brian): drawn like the site drains, route marked as assumed
  for (const q of data.pipes || []) {
    const pipe = api.pipeGeo(q.pts.map(([x, y, l]) => [x, y, l ?? null]), 0.1);
    add('drains', pipe.geometry, 'drain', { en: q.en, th: q.th, kind: 'drain',
      info: { en: [...(q.note ? [q.note.en] : []), 'Not on the drawing: the route is assumed, to confirm on site.'], th: [...(q.note ? [q.note.th] : []), 'ไม่มีในแบบ แนวท่อเป็นค่าสมมติ ต้องยืนยันหน้างาน'] } });
    extra.push([q.group, q.en]);
  }
  // ---------- sampling points: the sump itself is the marker (the viewer colours it); a frame and a label mark it
  const order = [], spots = [];
  for (const [i, p] of data.points.entries()) {
    if (!SAMPLE_GROUPS[p.group.split('+')[0]] || !SAMPLE_STATUS[p.status]) throw new Error(`Sampling point ${p.id}: bad group or status`);
    const groups = p.group.split('+'), lim = limitsFor(p.group), st = SAMPLE_STATUS[p.status];
    const stage = p.stage || (p.status === 'construction' ? 'future' : null);
    for (const n of p.upstream || []) need(n, `Sampling point ${p.id} upstream`);
    const targets = [];
    let x0, y0, x1, y1;
    if (p.at) {
      for (const n of [].concat(p.at)) targets.push(...need(n, `Sampling point ${p.id}`));
      const b = new THREE.Box3(); targets.forEach((o) => b.expandByObject(o));
      const [ax, ay] = toXY(b.min), [bx, by] = toXY(b.max);
      x0 = Math.min(ax, bx); x1 = Math.max(ax, bx); y0 = Math.min(ay, by); y1 = Math.max(ay, by);
    } else { x0 = p.x - 0.4; x1 = p.x + 0.4; y0 = p.y - 0.4; y1 = p.y + 0.4; }
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2, g0 = ground(x, y), take = p.take ?? g0 - 0.8;
    const word = { existing: ['', ''], new: [' · new', ' · ใหม่'], construction: [' · to build', ' · จะก่อสร้าง'] }[p.status];
    const label = `${p.id} · ${p.group}${word[0]}`, labelTh = `${p.id} · ${p.group}${word[1]}`;
    const sample = { id: p.id, n: i + 1, group: p.group, status: p.status, stage, samples: p.samples || 1, params: Object.keys(lim), limits: lim,
      where: p.where || null, note: p.note || null, upstream: p.upstream || [], result: p.result || null, src: p.src || 'part',
      targets: [...new Set(targets.map((o) => o.userData.en))], level: +take.toFixed(2), levelAssumed: p.take == null, ground: +g0.toFixed(2), x: +x.toFixed(2), y: +y.toFixed(2) };
    const info = {
      en: [`${st.en}, ${groups.map((g) => SAMPLE_GROUPS[g].en).join(' and ')}.`, ...(p.where ? [`Take the sample: ${p.where.en}`] : []),
        `${sample.samples} sample${sample.samples > 1 ? 's' : ''}, ${sample.params.length} parameters: ${sample.params.map((k) => PARAM_NAMES[k].en).join(', ')}.`,
        ...(p.note ? [p.note.en] : []), SRC_LINE[sample.src].en],
      th: [`${st.th} ${groups.map((g) => SAMPLE_GROUPS[g].th).join(' และ ')}`, ...(p.where ? [`จุดตักน้ำ: ${p.where.th}`] : []),
        `${sample.samples} ตัวอย่าง ${sample.params.length} พารามิเตอร์: ${sample.params.map((k) => PARAM_NAMES[k].th).join(', ')}`,
        ...(p.note ? [p.note.th] : []), SRC_LINE[sample.src].th],
    };
    const o = { en: `${label} · ${st.en}`, th: `${labelTh} · ${st.th}`, kind: 'sample', info };
    // frame round the sump (a combined point gets a red frame and a blue one round it); the label sits above
    const parts = groups.map((g, k) => {
      const d = 0.45 + k * 0.45;
      return add('sampling', frame(x0 - d, y0 - d, x1 + d, y1 + d, 0.32, 0.25), groupMat(g), k === 0 ? { ...o, tag: label, tagTh: labelTh } : o, k === 0 ? V(x + (p.label?.[0] || 0), y + (p.label?.[1] || 0), g0 + 1.4) : undefined);
    });
    if (!p.at) parts.push(add('sampling', boxGeo(0.8, 0.8, g0 - (take - 0.3), x, y, take - 0.3), groupMat(groups[0]), o));   // nothing there yet: a small new sump
    for (const m of parts) { m.userData.sample = sample; m.userData.status = p.status; if (stage) m.userData.stage = stage; }
    order.push(p.id); spots.push([x, y]);
  }

  // ---------- final design: which existing pipes and sumps are G2.1 (red) and G2.2 (blue); the viewer colours them
  const systems = (data.systems || []).map((s) => ({ group: s.group, names: [...new Set(s.names.flatMap((n) => need(n, `System ${s.group}`).map((m) => m.userData.en)))] }));
  const sys = (g) => systems.find((s) => s.group === g) || (systems.push({ group: g, names: [] }), systems[systems.length - 1]);
  for (const [g, n] of extra) sys(g).names.push(n);
  // flags: something in the final design to fix (shown only in the final design)
  for (const f of data.flags || []) {
    const g0 = ground(f.x, f.y), cone = new THREE.ConeGeometry(0.4, 0.8, 4), c = V(f.x, f.y, g0 + 0.45); cone.rotateX(Math.PI); cone.translate(c.x, c.y, c.z);
    const m = add('sampling', cone, 'sampleFlag', { en: f.en, th: f.th, tag: f.tag || f.en, tagTh: f.tagTh || f.th, kind: 'flag',
      info: { en: [...(f.note ? [f.note.en] : [])], th: [...(f.note ? [f.note.th] : [])] } }, V(f.x, f.y, g0 + 1.3));
    m.userData.stage = 'future';
  }
  // places for a new OWS / WWT (final design): a pink triangle on the ground, no size (not designed yet)
  for (const f of data.future || []) {
    const g0 = ground(f.x, f.y), r = f.r || 1.3, en = f.en || 'New OWS or new WWT (concept)', th = f.th || 'OWS ใหม่ หรือระบบบำบัดใหม่ (แนวคิด)';
    const pad = new THREE.CylinderGeometry(r, r, 0.1, 3); const c = V(f.x, f.y, g0 + 0.06); pad.translate(c.x, c.y, c.z);
    const m = add('proposed', pad, 'sampleOWS', { en, th, tag: f.tag || 'New OWS / WWT', tagTh: f.tagTh || 'OWS / ระบบบำบัดใหม่', kind: 'future',
      info: { en: [...(f.note ? [f.note.en] : []), FUT.en], th: [...(f.note ? [f.note.th] : []), FUT.th] } }, V(f.x, f.y, g0 + 1.1));
    m.userData.stage = 'future';
  }

  // the "Sampling points" view: almost from above, shifted so no point hides behind the info card (bottom left)
  const xs = spots.map((s) => s[0]), ys = spots.map((s) => s[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 25);
  const view = { id: 'samples', from: [cx - span * 0.1, cy - span * 0.58, span * 1.55], to: [cx - span * 0.1, cy - span * 0.3, 0] };

  const stageOf = (p) => p.stage || (p.status === 'construction' ? 'future' : null);
  const count = (g, st) => data.points.filter((p) => p.group === g && stageOf(p) !== st).reduce((s, p) => s + (p.samples || 1), 0);
  const counts = (st) => ['G2.1', 'G2.2', 'G2.1+G2.2'].map((g) => ({ group: g, samples: count(g, st), params: Object.keys(limitsFor(g)).length })).filter((c) => c.samples);
  const meta = { risk: data.risk || null, source: data.source || null, order, counts: counts('future'), futureCounts: counts('now'),
    groups: SAMPLE_GROUPS, params: PARAM_NAMES, status: SAMPLE_STATUS, systems,
    hasFuture: systems.length > 0 || (data.future || []).length > 0 || (data.flags || []).length > 0 || data.points.some((p) => stageOf(p)) };
  return { meta, view };
}
