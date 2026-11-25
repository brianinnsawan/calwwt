// 3D site model (calwwt.sppwork.com/sites/<code>/, "3D model" tab), used when sites.json gives the site a "model" (a .glb file
// in public/sites/models/, built by tools/models/build.mjs). three.js r170 is kept in public/sites/vendor/ (no outside links:
// the site's security rules only allow its own files).
// What you can do: turn with the mouse or a finger, switch layers on and off, see through the ground, jump to ready-made
// views, and click a tank, pipe or manhole to read its size and levels. The names and notes come from inside the .glb file.
import * as THREE from '/sites/vendor/three.module.min.js';
import { OrbitControls } from '/sites/vendor/OrbitControls.js';
import { GLTFLoader } from '/sites/vendor/GLTFLoader.js';

const T = {
  en: { layers: 'Layers', views: 'Views', labels: 'Names', levels: 'Pipe levels at manholes', see: 'See through the ground', tall: 'Stretch height ×3',
    hint: 'Click a tank, pipe or manhole to see its size and levels. Drag to turn, scroll or pinch to zoom, right-drag or two fingers to move.',
    close: 'Close', north: 'North', loading: 'Loading the 3D model…', failed: 'The 3D model could not be shown on this device.', built: 'Model updated' },
  th: { layers: 'ชั้นข้อมูล', views: 'มุมมอง', labels: 'ชื่อ', levels: 'ระดับท่อที่บ่อพัก', see: 'มองทะลุพื้น', tall: 'ขยายความสูง ×3',
    hint: 'คลิกที่ถัง ท่อ หรือบ่อพัก เพื่อดูขนาดและระดับ ลากเพื่อหมุน เลื่อนลูกกลิ้งหรือใช้สองนิ้วเพื่อซูม คลิกขวาลากหรือใช้สองนิ้วเพื่อเลื่อน',
    close: 'ปิด', north: 'ทิศเหนือ', loading: 'กำลังโหลดโมเดล 3D…', failed: 'ไม่สามารถแสดงโมเดล 3D บนอุปกรณ์นี้ได้', built: 'ปรับปรุงโมเดลเมื่อ' },
};
const CSS = `
.v3 { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
.v3 canvas { display: block; width: 100%; height: 100%; }
.v3-msg { position: absolute; inset: 0; display: grid; place-content: center; color: var(--muted); padding: 24px; text-align: center; }
.v3-views { position: absolute; left: 10px; top: 10px; display: flex; flex-wrap: wrap; gap: 6px; z-index: 5; max-width: calc(100% - 270px); }
.v3-views button, .v3-panel summary, .v3-info button { font-size: 12.5px; }
.v3-views button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.v3-panel { position: absolute; right: 10px; top: 10px; z-index: 6; width: 240px; max-height: calc(100% - 20px); overflow: auto; background: color-mix(in srgb, var(--panel) 94%, transparent); border: 1px solid var(--rule); border-radius: 8px; font-size: 12.5px; }
.v3-panel summary { cursor: pointer; padding: 7px 10px; font-weight: 600; list-style-position: inside; }
.v3-panel .rows { display: grid; gap: 3px; padding: 2px 10px 10px; }
.v3-panel label { display: flex; gap: 7px; align-items: center; cursor: pointer; line-height: 1.3; }
.v3-panel label input { margin: 0; flex: none; padding: 0; }
.v3-panel i { flex: none; width: 10px; height: 10px; border-radius: 2px; border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent); }
.v3-panel hr { width: 100%; border: 0; border-top: 1px solid var(--rule); margin: 4px 0; }
.v3-info { position: absolute; left: 10px; bottom: 10px; z-index: 6; width: min(440px, calc(100% - 20px)); max-height: 46%; overflow: auto; background: color-mix(in srgb, var(--panel) 95%, transparent); border: 1px solid var(--rule); border-radius: 8px; padding: 9px 12px 10px; font-size: 12.5px; line-height: 1.45; }
.v3-info b { display: block; font: 600 16px/1.2 var(--font-display); margin: 0 26px 4px 0; }
.v3-info p { margin: 0 0 3px; }
.v3-info p.s { color: var(--muted); font-size: 12px; margin-top: 5px; }
.v3-info .x { position: absolute; right: 6px; top: 6px; padding: 1px 7px; line-height: 1.3; }
.v3-lab { position: absolute; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
.v3-lab span { position: absolute; left: 0; top: 0; white-space: nowrap; font: 600 11.5px var(--font-body); color: var(--ink); background: color-mix(in srgb, var(--panel) 88%, transparent); border: 1px solid var(--rule); border-radius: 4px; padding: 0 5px; will-change: transform; }
.v3-lab span.v3-lvl { font: 500 10.5px var(--font-mono); border-color: transparent; padding: 0 3px; }
.v3-n { position: absolute; right: 12px; bottom: 12px; z-index: 5; width: 44px; height: 44px; border-radius: 50%; background: color-mix(in srgb, var(--panel) 92%, transparent); border: 1px solid var(--rule); display: grid; place-items: center; }
.v3-n svg { width: 34px; height: 34px; }
@media (max-width: 760px) { .v3-views { max-width: calc(100% - 20px); top: 46px; } .v3-panel { width: 210px; } .v3-info { max-height: 40%; } .v3-n { bottom: auto; top: 132px; right: 10px; } }
`;
const el = (tag, attrs = {}, text) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };

export async function show(view, url, w, lang = 'en') {
  const l = lang === 'th' ? 'th' : 'en', t = T[l];
  if (!document.getElementById('v3-css')) { const s = el('style', { id: 'v3-css' }); s.textContent = CSS; document.head.append(s); }
  const box = el('div', { class: 'v3' }); view.append(box);
  const msg = el('div', { class: 'v3-msg' }, t.loading); box.append(msg);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { msg.textContent = t.failed; throw e; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.append(renderer.domElement);
  const scene = new THREE.Scene();
  const paper = () => { scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f4f5f2'); };
  paper();
  new MutationObserver(paper).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa09a, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(40, 80, 30); scene.add(sun);
  const low = new THREE.DirectionalLight(0xffffff, 0.6); low.position.set(-30, -60, -20); scene.add(low);   // so things seen from below are not black
  const camera = new THREE.PerspectiveCamera(45, 1, 0.2, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.zoomToCursor = true; controls.minDistance = 1.5; controls.maxDistance = 600;

  let gltf;
  try { gltf = await new GLTFLoader().loadAsync(url); } catch (e) { msg.textContent = t.failed; throw e; }
  msg.remove();
  const root = gltf.scene, meta = root.userData || {};
  scene.add(root);
  const name = (u) => (l === 'th' && u.th) || u.en || '';
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()), mid = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());

  // ---- views
  let fly = null;
  const go = (pos, target, ms = 550) => { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target), at: performance.now(), ms }; };
  const views = meta.views?.length ? meta.views : [{ id: 'site', en: 'Whole site', th: 'ทั้งสถานี', pos: [mid.x, mid.y + Math.max(size.x, size.z) * 0.6, mid.z + Math.max(size.x, size.z) * 0.7], target: mid.toArray() }];
  const yScale = () => root.scale.y;
  const scaled = (p) => [p[0], p[1] < 0 ? p[1] * yScale() : p[1], p[2]];   // "stretch height" on: only points below ground move
  const vbar = el('div', { class: 'v3-views' });
  for (const v of views) { const b = el('button', { type: 'button' }, name(v)); b.onclick = () => go(scaled(v.pos), scaled(v.target)); vbar.append(b); }
  box.append(vbar);
  camera.position.set(...views[0].pos); controls.target.set(...views[0].target); controls.update();

  // ---- layers, labels and other switches
  const layers = root.children.filter((c) => c.userData?.layer);
  const panel = el('details', { class: 'v3-panel' }); if (view.clientWidth > 760) panel.open = true;
  panel.append(el('summary', {}, t.layers));
  const rows = el('div', { class: 'rows' }); panel.append(rows);
  const check = (text, on, change, colour) => {
    const lab = el('label'), i = el('input', { type: 'checkbox' }); i.checked = on; i.onchange = () => change(i.checked);
    lab.append(i); if (colour) { const sw = el('i'); sw.style.background = colour; lab.append(sw); } lab.append(el('span', {}, text)); rows.append(lab); return i;
  };
  const colourOf = (g) => { let c = null; g.traverse((o) => { if (!c && (o.isMesh || o.isLineSegments) && o.material?.color) c = '#' + o.material.color.getHexString(THREE.SRGBColorSpace); }); return c; };
  for (const g of layers) { g.visible = g.userData.on !== false; check(name(g.userData), g.visible, (on) => { g.visible = on; }, colourOf(g)); }
  rows.append(el('hr'));
  const lab = el('div', { class: 'v3-lab' }); box.append(lab);
  const marks = [];
  const layerOf = (o) => { let p = o; while (p && !p.userData?.layer) p = p.parent; return p; };
  root.traverse((o) => {
    const u = o.userData || {};
    if (u.tag && u.at) { const s = el('span', {}, (l === 'th' && u.tagTh) || u.tag); lab.append(s); marks.push({ s, p: new THREE.Vector3(...u.at), kind: 'tag', layer: layerOf(o) }); }
    if (u.lvl && o.isMesh) { const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()); const s = el('span', { class: 'v3-lvl' }, u.lvl); lab.append(s); marks.push({ s, p: new THREE.Vector3(c.x, b.max.y + 0.25, c.z), kind: 'lvl', layer: layerOf(o) }); }
  });
  const showKind = { tag: true, lvl: false };
  check(t.labels, true, (on) => { showKind.tag = on; });
  check(t.levels, false, (on) => { showKind.lvl = on; });
  // the ground and the buildings are see-through in the file; "see through the ground" off makes the ground solid
  const groundMats = []; root.traverse((o) => { if (o.isMesh && layerOf(o)?.name === 'ground') groundMats.push([o.material, o.material.opacity]); });
  const solid = (on) => { for (const [m, op] of groundMats) { m.opacity = on ? op : 1; m.transparent = on; m.depthWrite = !on; m.needsUpdate = true; } };
  check(t.see, true, solid);
  check(t.tall, false, (on) => { const k = on ? 3 : 1; controls.target.y *= k / root.scale.y; root.scale.y = k; controls.update(); });
  box.append(panel);

  // ---- information card
  const card = el('div', { class: 'v3-info' }); box.append(card);
  let picked = null, pickedMat = null;
  const unpick = () => { if (picked) { picked.material = pickedMat; picked = null; } };
  const idle = () => {
    unpick(); card.replaceChildren();
    card.append(el('p', {}, t.hint));
    if (meta.datum) card.append(el('p', { class: 's' }, name(meta.datum)));
    if (meta.note) card.append(el('p', { class: 's' }, name(meta.note) + (meta.built ? ` ${t.built} ${meta.built}.` : '')));
  };
  const pick = (o) => {
    unpick(); picked = o; pickedMat = o.material;
    const m = o.material.clone(); m.emissive = new THREE.Color(0xff9d00); m.emissiveIntensity = 0.55; m.opacity = Math.max(m.opacity, 0.9); o.material = m;
    const u = o.userData; card.replaceChildren();
    const x = el('button', { type: 'button', class: 'x', title: t.close, 'aria-label': t.close }, '×'); x.onclick = idle;
    card.append(x, el('b', {}, name(u)));
    const lines = (l === 'th' ? u.infoTh : u.infoEn) || [];
    lines.forEach((line, i) => card.append(el('p', i === lines.length - 1 && lines.length > 1 ? { class: 's' } : {}, line)));
  };
  idle();
  const ray = new THREE.Raycaster(); let down = null;
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hits = ray.intersectObject(root, true).filter((h) => h.object.isMesh && h.object.userData.en && !h.object.userData.nopick && shown(h.object));
    // what is under the ground wins over the building or fuel-tank outline in front of it
    const hit = hits.find((h) => !['building', 'fuel'].includes(h.object.userData.kind)) || hits[0];
    hit ? pick(hit.object) : idle();
  });

  // ---- north arrow (turns with the view)
  let needle = null;
  if (Number.isFinite(meta.north)) {
    const n = el('div', { class: 'v3-n', title: t.north });
    n.innerHTML = '<svg viewBox="-20 -20 40 40" aria-hidden="true"><g><path d="M0 -15 L6 4 L0 0 L-6 4 Z" fill="currentColor"/><text y="15" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">N</text></g></svg>';
    needle = n.querySelector('g'); box.append(n);
  }
  const north = Number.isFinite(meta.north) ? new THREE.Vector3(Math.cos(meta.north * Math.PI / 180), 0, -Math.sin(meta.north * Math.PI / 180)) : null;

  const resize = () => { const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(box); resize();
  const v = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (!box.offsetParent) return;                       // the tab is not showing
    if (fly) {
      const k = Math.min((performance.now() - fly.at) / fly.ms, 1), s = k * k * (3 - 2 * k);
      camera.position.lerpVectors(fly.p0, fly.p1, s); controls.target.lerpVectors(fly.t0, fly.t1, s); if (k >= 1) fly = null;
    }
    controls.update(); renderer.render(scene, camera);
    const W = box.clientWidth, H = box.clientHeight, ky = root.scale.y;
    for (const m of marks) {
      let on = showKind[m.kind] && (!m.layer || m.layer.visible);
      if (on) { v.set(m.p.x, m.p.y * ky, m.p.z).project(camera); on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; }
      m.s.style.display = on ? '' : 'none';
      if (on) m.s.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * H).toFixed(1)}px) translate(-50%, -50%)`;
    }
    if (needle) {
      // where north points on the screen: compare the middle of the view with a point 1 m north of it
      v.copy(controls.target).project(camera); const x0 = v.x * camera.aspect, y0 = v.y;
      v.copy(controls.target).add(north).project(camera);
      needle.setAttribute('transform', `rotate(${(Math.atan2(v.x * camera.aspect - x0, v.y - y0) * 180 / Math.PI).toFixed(1)})`);
    }
  });
  return { go: (id) => { const x = views.find((q) => q.id === id); if (x) go(scaled(x.pos), scaled(x.target)); } };
}
