// Builds a site's 3D model for calwwt.sppwork.com:  node build.mjs 0589
// Reads tools/models/<code>/site.mjs (what is on the site, in drawing coordinates and levels) and
// tools/models/<code>/plan-lines.json (the as-built plan linework), and writes
// portal-proposal/public/sites/models/<code>.glb. The page that shows it is public/sites/viewer.mjs.
//
// Coordinates: the site file uses the drawing's own x, y (metres) and levels in metres from the drawing's datum.
// In the model x = east on the sheet, y = up, z = minus the sheet's y (so the sheet's top is "away").
// Every object carries its name and notes (English + Thai) in the file, so the viewer can show them when it is clicked.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Delaunator from 'delaunator';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATERIALS, LAYERS, VIEWS, SRC, FUEL_TANK, notes } from './style.mjs';   // one look for every site
import { buildSampling } from './sampling.mjs';   // water sampling points + final-design concept (sampling.json)

// GLTFExporter writes its binary file through the browser's FileReader; Node has Blob but not FileReader.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL() { throw new Error('not needed'); }
};

const here = path.dirname(fileURLToPath(import.meta.url));
const code = process.argv[2];
if (!/^\d{4}$/.test(code || '')) { console.error('Usage: node build.mjs <site code>'); process.exit(1); }
const site = (await import(`./${code}/site.mjs`)).default;
const plan = JSON.parse(fs.readFileSync(path.join(here, code, 'plan-lines.json'), 'utf8'));
const [OX, OY] = site.origin;
const samplingFile = path.join(here, code, 'sampling.json');
const sampling = fs.existsSync(samplingFile) ? JSON.parse(fs.readFileSync(samplingFile, 'utf8')) : null;

const V = (x, y, level) => new THREE.Vector3(x - OX, level, -(y - OY));
const rad = (deg) => deg * Math.PI / 180;

// ---- ground: finished levels from the drawing, smoothed between the points; falls to the road outside the boundary
const inside = (poly, x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const distTo = (poly, x, y) => {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
};
const idw = (x, y) => {
  let sw = 0, sv = 0;
  for (const [px, py, pz] of site.ground.points) {
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < 1e-4) return pz;
    const w = 1 / (d2 * d2); sw += w; sv += w * pz;
  }
  return sv / sw;
};
/** Ground level at a drawing point. */
export const ground = (x, y) => {
  const g = idw(x, y);
  if (inside(site.boundary, x, y)) return g;
  const t = Math.min(distTo(site.boundary, x, y) / site.ground.apron, 1), s = t * t * (3 - 2 * t);
  return g * (1 - s) + site.ground.road * s;
};

// ---- materials (one per look; the viewer may change their see-through amount)
const mats = new Map();
const mat = (name) => {
  if (mats.has(name)) return mats.get(name);
  // the shared style wins: a site file can only add a material no other site has
  const [color, opacity = 1] = MATERIALS[name] || site.materials?.[name] || (() => { throw new Error('No material ' + name); })();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, transparent: opacity < 1, opacity, side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide });
  m.name = name; mats.set(name, m); return m;
};

// ---- shapes
const scene = new THREE.Scene(); scene.name = `${code} ${site.name}`;
const layers = new Map();
{ // layers: the site names the ones it uses (ids, or objects from older site files); names and order come from the shared style
  const wanted = site.layers.map((l) => (typeof l === 'string' ? { id: l } : l));
  if (sampling) for (const id of ['sampling', ...((sampling.future || []).length || (sampling.routes || []).length || sampling.points.some((p) => p.status === 'construction') ? ['proposed'] : [])]) if (!wanted.some((w) => w.id === id)) wanted.push({ id });
  const std = LAYERS.filter((l) => wanted.some((w) => w.id === l.id)), extra = wanted.filter((w) => !LAYERS.some((l) => l.id === w.id));
  for (const l of [...std.filter((l) => !['plan', 'ground'].includes(l.id)), ...extra, ...std.filter((l) => ['plan', 'ground'].includes(l.id))]) {
    if (!l.en || !l.th) throw new Error(`Layer ${l.id} is not in style.mjs and has no en / th name`);
    const g = new THREE.Group(); g.name = l.id; g.userData = { layer: true, en: l.en, th: l.th, on: wanted.find((w) => w.id === l.id)?.on !== false };
    layers.set(l.id, g); scene.add(g);
  }
}
const info = (o) => {
  const u = {};
  for (const k of ['en', 'th', 'tag', 'tagTh', 'lvl', 'kind', 'nopick']) if (o[k] != null) u[k] = o[k];
  if (o.info) { u.infoEn = o.info.en; u.infoTh = o.info.th || o.info.en; }
  if (o.src) u.src = o.src;
  return u;
};
const add = (layer, geometry, material, o, at) => {
  const m = new THREE.Mesh(geometry, mat(material)); m.name = o.en || o.name || material; m.userData = info(o);
  if (at) m.userData.at = [+at.x.toFixed(2), +at.y.toFixed(2), +at.z.toFixed(2)];
  if (geometry.userData?.line) m.userData.line = geometry.userData.line;   // pipe centreline: the viewer draws the final-design colours along it
  layers.get(layer).add(m); return m;
};
const boxGeo = (w, d, h, x, y, base, rot = 0) => {
  const g = new THREE.BoxGeometry(w, h, d); g.rotateY(rad(rot)); const c = V(x, y, base + h / 2); g.translate(c.x, c.y, c.z); return g;
};
const cylGeo = (r, h, x, y, base, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, h, seg); const c = V(x, y, base + h / 2); g.translate(c.x, c.y, c.z); return g; };
const hcylGeo = (r, len, x, y, axisLevel, rot = 0) => { const g = new THREE.CylinderGeometry(r, r, len, 32); g.rotateZ(Math.PI / 2); g.rotateY(rad(rot)); const c = V(x, y, axisLevel); g.translate(c.x, c.y, c.z); return g; };
/** A lying capsule tank: radius r, overall length len (ends included), ends dished by `dish` (slightly rounded, not a ball). */
const capsuleGeo = (r, len, x, y, axisLevel, rot = 0, dish = r * 0.24) => {
  const pts = [], n = 8, half = len / 2 - dish;
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(r * Math.sin(t), -half - dish * Math.cos(t))); }
  for (let i = n; i >= 0; i--) { const t = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(r * Math.sin(t), half + dish * Math.cos(t))); }
  const g = new THREE.LatheGeometry(pts, 32); g.rotateZ(Math.PI / 2); g.rotateY(rad(rot)); const c = V(x, y, axisLevel); g.translate(c.x, c.y, c.z); return g;
};
const latheGeo = (profile, x, y, base, seg = 40) => {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg); const c = V(x, y, base); g.translate(c.x, c.y, c.z); return g;
};
const prismGeo = (poly, base, h) => {
  const s = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - OX, y - OY)));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, base, 0); return g;
};
/** A pipe through drawing points [x, y, level]; level is the INVERT (inside bottom). Missing levels are filled in along the run. */
const pipeGeo = (pts, r) => {
  const p = pts.map((q) => [...q]);
  const known = p.map((q, i) => (q[2] != null ? i : -1)).filter((i) => i >= 0);
  if (!known.length) throw new Error('A pipe needs at least one level');
  const ch = [0]; for (let i = 1; i < p.length; i++) ch.push(ch[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  for (let i = 0; i < p.length; i++) {
    if (p[i][2] != null) continue;
    const a = known.filter((k) => k < i).pop(), b = known.find((k) => k > i);
    p[i][2] = a == null ? p[b][2] : b == null ? p[a][2] : p[a][2] + (p[b][2] - p[a][2]) * (ch[i] - ch[a]) / (ch[b] - ch[a] || 1);
  }
  const v = p.map(([x, y, l]) => V(x, y, l + r)), parts = [];
  for (let i = 0; i < v.length - 1; i++) {
    const len = v[i].distanceTo(v[i + 1]); if (len < 1e-6) continue;
    const g = new THREE.CylinderGeometry(r, r, len, 10, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v[i + 1].clone().sub(v[i]).normalize()));
    const mid = v[i].clone().add(v[i + 1]).multiplyScalar(0.5); g.translate(mid.x, mid.y, mid.z); parts.push(g);
  }
  for (const q of v) { const s = new THREE.SphereGeometry(r, 10, 6); s.translate(q.x, q.y, q.z); parts.push(s); }
  const geometry = mergeGeometries(parts);
  geometry.userData.line = v.map((q) => [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]);   // pipe centreline, kept on the mesh for the viewer
  return { geometry, mid: v[Math.floor(v.length / 2)], levels: p, length: ch[ch.length - 1] };
};
const lv = (n) => (Math.abs(n) < 0.0005 ? '±0.00' : (n > 0 ? '+' : '-') + Math.abs(n).toFixed(Math.abs(n * 100 - Math.round(n * 100)) > 0.01 ? 3 : 2));

/** An underground fuel tank, the same on every site: fuelTank('T1 · G91', x, y, rot of the long axis, { dia, len, en: [...], th: [...] }). */
const fuelTank = (label, x, y, rot = 0, o = {}) => {
  const F = FUEL_TANK, dia = o.dia || F.dia, len = o.len || F.len, g0 = ground(x, y), axis = g0 - F.cover - dia / 2;
  return add('fuel', capsuleGeo(dia / 2, len, x, y, axis, rot, F.dish), 'fuel', { en: `Fuel tank ${label} · 30,000 L`, th: `ถังน้ำมัน ${label} · 30,000 ลิตร`, tag: label, tagTh: label, kind: 'fuel',
    info: notes([`Underground fuel tank ${label}: a lying 30,000 litre capsule tank with slightly rounded ends, ${dia.toFixed(2)} m across and ${len.toFixed(1)} m long.`, ...(o.en || []),
      `The depth is not on these drawings: the top is shown ${F.cover.toFixed(1)} m below ground (about ${lv(g0 - F.cover)}).`, 'Keep clear when planning any digging.'],
    [`ถังน้ำมันใต้ดิน ${label}: ถังแคปซูลแบบนอน 30,000 ลิตร ปลายโค้งเล็กน้อย กว้าง ${dia.toFixed(2)} ม. ยาว ${len.toFixed(1)} ม.`, ...(o.th || []),
      `ในแบบชุดนี้ไม่มีความลึก แสดงหลังถังต่ำกว่าพื้น ${F.cover.toFixed(1)} ม. (ประมาณ ${lv(g0 - F.cover)})`, 'เว้นระยะเมื่อวางแผนงานขุด'], o.src || 'part') }, V(x, y, g0 + 0.5));
};
/** Plan linework in a layer: lines(layer, [[x1, y1, x2, y2, ...] polylines in drawing metres], material, level(x, y) = height of the line). */
const lines = (layer, polylines, material, level) => {
  const arr = [];
  for (const pl of polylines) for (let i = 0; i + 3 < pl.length; i += 2) for (const k of [i, i + 2]) { const v = V(pl[k], pl[k + 1], level(pl[k], pl[k + 1])); arr.push(v.x, v.y, v.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: MATERIALS[material][0] })); l.material.name = material; l.userData = { nopick: 1 };
  layers.get(layer).add(l); return l;
};
const sections = [];   // long sections the viewer can open ("Long section" button), drawn from the same levels as the model
const api = { origin: [OX, OY], section: (x) => sections.push(x), lines, notes, SRC, FUEL_TANK, fuelTank, capsuleGeo, V, ground, lv, add, boxGeo, cylGeo, hcylGeo, latheGeo, prismGeo, pipeGeo, merge: (list) => mergeGeometries(list.every((g) => g.index) ? list : list.map((g) => (g.index ? g.toNonIndexed() : g))), THREE };

// ---- ground surface and plan linework
{
  const [x0, y0, x1, y1] = site.ground.bbox, step = site.ground.step, pts = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) for (let y = y0; y <= y1 + 1e-6; y += step) pts.push([x, y]);
  const edge = (poly) => { for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) / step); for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); } };
  edge(site.boundary); edge(site.ground.roadArea);
  const tri = Delaunator.from(pts).triangles, groups = { siteGround: [], road: [] };
  for (let i = 0; i < tri.length; i += 3) {
    const t = [pts[tri[i]], pts[tri[i + 1]], pts[tri[i + 2]]], cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const where = inside(site.boundary, cx, cy) ? 'siteGround' : inside(site.ground.roadArea, cx, cy) ? 'road' : null;
    if (!where) continue;
    // drawing order is anticlockwise seen from above; keep it so the top face looks up
    for (const [x, y] of [t[0], t[2], t[1]]) { const v = V(x, y, ground(x, y)); groups[where].push(v.x, v.y, v.z); }
  }
  for (const [name, arr] of Object.entries(groups)) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
    add('ground', g, name, { ...site.ground.names[name], nopick: 1 });
  }
  for (const [key, material] of [['general', 'planLine'], ['drainage', 'planDrainLine']]) {
    const arr = [];
    for (const line of plan[key]) {
      for (let i = 0; i + 3 < line.length; i += 2) {
        for (const k of [i, i + 2]) { const x = line[k] / 100 + plan.origin[0], y = line[k + 1] / 100 + plan.origin[1], v = V(x, y, ground(x, y) + 0.03); arr.push(v.x, v.y, v.z); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const [color] = MATERIALS[material];
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color })); l.material.name = material; l.name = key === 'general' ? 'As-built plan' : 'As-built plan (drainage)'; l.userData = { nopick: 1 };
    layers.get('plan').add(l);
  }
}

site.build(api);
const samp = sampling ? buildSampling(sampling, api, scene) : null;
if (samp) { const k = site.views.findIndex((v) => v.id === 'plan'); site.views.splice(k + 1, 0, samp.view); }

scene.userData = { site: code, name: site.name, datum: site.datum, note: site.note, views: site.views.map((v) => ({ ...v, ...(VIEWS[v.id] || {}), pos: V(...v.from).toArray().map((n) => +n.toFixed(2)), target: V(...v.to).toArray().map((n) => +n.toFixed(2)), from: undefined, to: undefined })), north: site.north, built: site.built, ...(sections.length ? { sections } : {}), ...(samp ? { sampling: samp.meta } : {}) };
scene.updateMatrixWorld(true);
const out = path.join(here, '..', '..', 'portal-proposal', 'public', 'sites', 'models', `${code}.glb`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
fs.writeFileSync(out, Buffer.from(glb));
let n = 0; scene.traverse((o) => { if (o.isMesh) n++; });
console.log(`${out}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${n} objects, ${layers.size} layers`);
