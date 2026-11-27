// 3D site model (calwwt.sppwork.com/sites/<code>/, "3D model" tab), used when sites.json gives the site a "model" (a .glb file
// in public/sites/models/, built by tools/models/build.mjs). three.js r170 is kept in public/sites/vendor/ (no outside links:
// the site's security rules only allow its own files).
// What you can do: turn with the mouse or a finger, switch layers on and off, see through the ground, jump to ready-made
// views, and click a tank, pipe or manhole to read its size and levels. The names and notes come from inside the .glb file.
// A model can carry long sections (scene userData "sections", made in tools/models from the same levels as the 3D pipes):
// a "Long section" button then opens a profile with a level table and key plan, like the drainage sections on calcr.sppwork.com.
import * as THREE from '/sites/vendor/three.module.min.js';
import { OrbitControls } from '/sites/vendor/OrbitControls.js';
import { GLTFLoader } from '/sites/vendor/GLTFLoader.js';

const T = {
  en: { layers: 'Layers', views: 'Views', more: 'More views…', labels: 'Names', levels: 'Pipe levels at manholes', see: 'See through the ground', tall: 'Stretch height ×3',
    hint: 'Click a tank, pipe or manhole to see its size and levels. Drag to turn, scroll or pinch to zoom, right-drag or two fingers to move.',
    close: 'Close', north: 'North', loading: 'Loading the 3D model…', failed: 'The 3D model could not be shown on this device.', built: 'Model updated',
    section: 'Long section', vert: 'Vertical ×', rows: ['Ground RL', 'Invert RL  in / out', 'Pipe top RL', 'Depth to invert (m)', 'Chainage (m)', 'Length · fall'], datum: 'Datum RL', key: 'Key plan',
    leg: ['Proposed pipe', 'Ground', 'Existing drain crossing', 'Clash with existing drain', 'Water level'], clash: 'clash', clear: 'clear', grating: 'Grating', in: 'In', out: 'Out', water: 'Water', top: 'Top', bottom: 'Bottom',
    stages: ['Existing', '2026 sampling', 'Final design (concept)'], stageTip: ['What is on site today', 'Where the water is sampled in 2026', 'The proposed new works and new sampling points (concept, not built)'],
    fold: 'Fold this card', unfold: 'Open this card', about: 'About this model', walk: 'Walk the sampling points', of: 'of', prev: '‹ Back', next: 'Next ›', byResult: 'Colour sampling points by test result', risk: 'Risk', samples: (n) => `${n} sample${n > 1 ? 's' : ''}`, params: (n) => `${n} parameters tested`,
    take: 'Where to take it', tested: 'Tested for', limit: 'Limit', result: 'Result', noResult: 'Lab results not in yet.', pass: 'Within limit', fail: 'Over limit', drains: 'What drains here (lit up)', sump: 'Sampled at', framed: 'The sampled sump is coloured', flag: 'To fix in the final design', red: 'Red pipes: G2.1 system', blue: 'Blue pipes: G2.2 system',
    level: (a, b, as) => `Water taken at about ${a} (${b} m below ground${as ? ', assumed' : ''}).`, sampleLeg: 'Sampling points', g21: 'G2.1 oil side (forecourt, fuel, oil change)', g22: 'G2.2 wastewater side (toilets, kitchens, shops)',
    st: { existing: 'Existing sampling point', new: 'New sampling point', construction: 'Construction sampling point (final design)', ows: 'New OWS or new WWT (final design)' }, mgl: 'mg/L', resultOn: (d, lab) => `Result ${d}${lab ? ` (${lab})` : ''}:` },
  th: { layers: 'ชั้นข้อมูล', views: 'มุมมอง', more: 'มุมมองอื่น…', labels: 'ชื่อ', levels: 'ระดับท่อที่บ่อพัก', see: 'มองทะลุพื้น', tall: 'ขยายความสูง ×3',
    hint: 'คลิกที่ถัง ท่อ หรือบ่อพัก เพื่อดูขนาดและระดับ ลากเพื่อหมุน เลื่อนลูกกลิ้งหรือใช้สองนิ้วเพื่อซูม คลิกขวาลากหรือใช้สองนิ้วเพื่อเลื่อน',
    close: 'ปิด', north: 'ทิศเหนือ', loading: 'กำลังโหลดโมเดล 3D…', failed: 'ไม่สามารถแสดงโมเดล 3D บนอุปกรณ์นี้ได้', built: 'ปรับปรุงโมเดลเมื่อ',
    section: 'รูปตัดตามยาว', vert: 'แนวดิ่งขยาย ×', rows: ['ระดับพื้น RL', 'ระดับท้องท่อ เข้า / ออก', 'ระดับหลังท่อ RL', 'ความลึกถึงท้องท่อ (ม.)', 'ระยะ (ม.)', 'ความยาว · ความลาด'], datum: 'ระดับอ้างอิง RL', key: 'แปลนตำแหน่ง',
    leg: ['ท่อที่เสนอ', 'ผิวพื้น', 'ท่อระบายน้ำเดิมที่ตัดผ่าน', 'ชนท่อระบายน้ำเดิม', 'ระดับน้ำ'], clash: 'ชน', clear: 'ไม่ชน', grating: 'ตะแกรง', in: 'เข้า', out: 'ออก', water: 'น้ำ', top: 'หลังถัง', bottom: 'ก้นถัง',
    stages: ['สภาพปัจจุบัน', 'เก็บตัวอย่างปี 2026', 'แบบสุดท้าย (แนวคิด)'], stageTip: ['สิ่งที่มีอยู่หน้างานวันนี้', 'จุดที่เก็บตัวอย่างน้ำในปี 2026', 'งานใหม่ที่เสนอและจุดเก็บตัวอย่างใหม่ (แนวคิด ยังไม่ได้สร้าง)'],
    fold: 'พับการ์ดนี้', unfold: 'เปิดการ์ดนี้', about: 'เกี่ยวกับโมเดลนี้', walk: 'ไล่ดูจุดเก็บตัวอย่าง', of: 'จาก', prev: '‹ ก่อนหน้า', next: 'ถัดไป ›', byResult: 'แสดงสีจุดเก็บตัวอย่างตามผลตรวจ', risk: 'ความเสี่ยง', samples: (n) => `${n} ตัวอย่าง`, params: (n) => `ตรวจ ${n} พารามิเตอร์`,
    take: 'จุดตักน้ำ', tested: 'รายการตรวจ', limit: 'ค่ามาตรฐาน', result: 'ผล', noResult: 'ยังไม่ได้รับผลจากห้องแล็บ', pass: 'ผ่านเกณฑ์', fail: 'เกินเกณฑ์', drains: 'สิ่งที่ระบายมาที่จุดนี้ (ไฮไลต์)', sump: 'เก็บที่', framed: 'บ่อที่เก็บตัวอย่างแสดงเป็นสี', flag: 'ต้องแก้ไขในแบบสุดท้าย', red: 'ท่อสีแดง: ระบบ G2.1', blue: 'ท่อสีน้ำเงิน: ระบบ G2.2',
    level: (a, b, as) => `ตักน้ำที่ระดับประมาณ ${a} (ต่ำกว่าพื้น ${b} ม.${as ? ' ค่าสมมติ' : ''})`, sampleLeg: 'จุดเก็บตัวอย่าง', g21: 'G2.1 ฝั่งน้ำมัน (ลานจ่ายน้ำมัน เปลี่ยนน้ำมันเครื่อง)', g22: 'G2.2 ฝั่งน้ำเสีย (ห้องน้ำ ครัว ร้านค้า)',
    st: { existing: 'จุดเก็บตัวอย่างเดิม', new: 'จุดเก็บตัวอย่างใหม่', construction: 'จุดเก็บตัวอย่างที่จะก่อสร้าง (แบบสุดท้าย)', ows: 'OWS ใหม่ หรือระบบบำบัดใหม่ (แบบสุดท้าย)' }, mgl: 'มก./ล.', resultOn: (d, lab) => `ผลตรวจ ${d}${lab ? ` (${lab})` : ''}:` },
};
const CSS = `
.v3 { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
.v3 canvas { display: block; width: 100%; height: 100%; }
.v3-msg { position: absolute; inset: 0; display: grid; place-content: center; color: var(--muted); padding: 24px; text-align: center; }
.v3-views { position: absolute; left: 10px; top: 10px; z-index: 5; max-width: calc(100% - 270px); display: flex; align-items: flex-start; gap: 6px; }
.v3-views > summary { flex: none; cursor: pointer; list-style: none; font-size: 12.5px; font-weight: 600; padding: 5px 10px; border: 1px solid var(--rule); border-radius: 6px; background: var(--panel); }
.v3-views > summary::-webkit-details-marker { display: none; }
.v3-views > summary::before { content: '▸ '; } .v3-views[open] > summary::before { content: '▾ '; }
.v3-row { display: flex; flex-wrap: wrap; gap: 6px; }
.v3-row select { flex: none; width: auto; max-width: 220px; padding: 5px 8px; }
.v3-views button, .v3-views select, .v3-panel summary, .v3-info button { font-size: 12.5px; }
.v3-views button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.v3-panel { position: absolute; right: 10px; top: 10px; z-index: 6; width: 240px; max-height: calc(100% - 20px); overflow: auto; background: color-mix(in srgb, var(--panel) 94%, transparent); border: 1px solid var(--rule); border-radius: 8px; font-size: 12.5px; }
.v3-panel summary { cursor: pointer; padding: 7px 10px; font-weight: 600; list-style-position: inside; }
.v3-panel .rows { display: grid; gap: 3px; padding: 2px 10px 10px; }
.v3-panel label { display: flex; gap: 7px; align-items: center; cursor: pointer; line-height: 1.3; }
.v3-panel label input { margin: 0; flex: none; padding: 0; }
.v3-panel i { flex: none; width: 10px; height: 10px; border-radius: 2px; border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent); }
.v3-panel .rows summary { padding: 2px 0; font-weight: 600; }
.v3-panel hr { width: 100%; border: 0; border-top: 1px solid var(--rule); margin: 4px 0; }
.v3-info { position: absolute; left: 10px; bottom: 10px; z-index: 6; width: max-content; max-width: min(440px, calc(100% - 20px)); max-height: 46%; overflow: auto; background: color-mix(in srgb, var(--panel) 95%, transparent); border: 1px solid var(--rule); border-radius: 8px; padding: 9px 12px 10px; font-size: 12.5px; line-height: 1.45; }
.v3-info b { display: block; font: 600 16px/1.2 var(--font-display); margin: 0 26px 4px 0; }
.v3-info p { margin: 0 0 3px; }
.v3-info p.s { color: var(--muted); font-size: 12px; margin-top: 5px; }
.v3-info .x { position: absolute; right: 6px; top: 6px; padding: 1px 7px; line-height: 1.3; }
.v3-lab { position: absolute; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
.v3-lab span { position: absolute; left: 0; top: 0; white-space: nowrap; font: 600 11.5px var(--font-body); color: var(--ink); background: color-mix(in srgb, var(--panel) 88%, transparent); border: 1px solid var(--rule); border-radius: 4px; padding: 0 5px; will-change: transform; }
.v3-lab span.v3-lvl { font: 500 10.5px var(--font-mono); border-color: transparent; padding: 0 3px; }
.v3-n { position: absolute; right: 12px; bottom: 12px; z-index: 5; width: 44px; height: 44px; border-radius: 50%; background: color-mix(in srgb, var(--panel) 92%, transparent); border: 1px solid var(--rule); display: grid; place-items: center; }
.v3-n svg { width: 34px; height: 34px; }
/* long sections (as on calcr.sppwork.com) */
.v3-views button.v3-secbtn { border-color: #d9468f; color: #b02a6f; font-weight: 600; }
.v3-sect { position: absolute; inset: 0; z-index: 20; background: var(--panel); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
.v3-sect[hidden] { display: none; }
.v3-sect .sh { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 8px 12px 8px 16px; border-bottom: 1px solid var(--rule); }
.v3-sect .st { font: 600 16px/1.2 var(--font-display); flex: 1 1 320px; }
.v3-sect .sc { font: 11px var(--font-mono); color: var(--muted); }
.v3-sect .sb { overflow: auto; padding: 10px 12px 10px 16px; }
.v3-sect svg { display: block; }
.v3-sect svg text { fill: var(--ink); font: 11px var(--font-mono); }
.v3-sect svg text.v2 { font-size: 10px; }
.v3-sect svg text.ax { font-size: 10.5px; fill: var(--muted); }
.v3-sect svg text.rt { font: 500 11.5px var(--font-body); }
.v3-sect svg text.lb { font: 600 12px var(--font-body); }
.v3-sect svg text.bad { fill: #d62728; font: 600 11.5px var(--font-body); }
.v3-sect svg text.wt { fill: #2f6db5; font: 600 11.5px var(--font-body); }
.v3-sect .sf { border-top: 1px solid var(--rule); padding: 8px 12px 10px 16px; font-size: 12px; color: var(--muted); display: grid; grid-template-columns: auto 1fr; gap: 6px 18px; align-items: start; max-height: 330px; overflow: auto; }
.v3-sect .sf .kt { font: 600 11px var(--font-mono); margin-bottom: 2px; }
.v3-sect .sf svg { max-width: 100%; }
.v3-sect .sf svg text { font: 600 10px var(--font-body); fill: var(--ink); }
.v3-sect .lg { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-bottom: 6px; }
.v3-sect .lg i { display: inline-block; width: 18px; height: 3px; margin-right: 6px; vertical-align: middle; }
/* water sampling points: stage switch, walk-through, result table */
.v3-stage { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 7; display: flex; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; background: var(--panel); }
.v3-stage button { border: 0; border-radius: 0; font-size: 12.5px; padding: 6px 12px; }
.v3-stage button + button { border-left: 1px solid var(--rule); }
.v3-stage button.on { background: var(--accent); color: #fff; }
.v3-views button.v3-walk { border-color: #e8590c; color: #b8430a; font-weight: 600; }
.v3-info .risk { display: inline-block; font: 700 11px var(--font-body); letter-spacing: .04em; padding: 1px 7px; border-radius: 4px; color: #fff; background: #dc2626; margin-right: 6px; }
.v3-info .risk.MEDIUM { background: #d97706; } .v3-info .risk.LOW { background: #16a34a; }
.v3-info .chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 3px 0 5px; }
.v3-info .chips span { font-size: 11.5px; padding: 0 6px; border-radius: 10px; border: 1px solid var(--rule); }
.v3-info .g21 { color: #c8102e; font-weight: 600; } .v3-info .g22 { color: #1f6fe0; font-weight: 600; }
.v3-info table { border-collapse: collapse; margin: 4px 0; font-size: 12px; }
.v3-info td, .v3-info th { padding: 1px 8px 1px 0; text-align: left; }
.v3-info td.bad { color: #dc2626; font-weight: 600; } .v3-info td.ok { color: #16a34a; }
.v3-info .hd { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-right: 4px; }
.v3-info .hd b { display: inline; margin: 0; font: 600 15px/1.25 var(--font-display); }
.v3-info .hd .fd { flex: none; border: 0; background: none; padding: 0 2px; color: var(--muted); font-size: 12px; line-height: 1; }
.v3-info .hd .risk { margin-right: 0; }
.v3-info .bd { margin-top: 5px; }
.v3-info details.ab { margin-top: 6px; border-top: 1px solid var(--rule); padding-top: 5px; }
.v3-info details.ab > summary { cursor: pointer; font-weight: 600; color: var(--muted); font-size: 12px; }
.v3-info details.ab[open] > summary { margin-bottom: 4px; }
.v3-info.folded { padding: 6px 10px; }
.v3-info.folded .bd { display: none; }
.v3-info .nav { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
.v3-panel .leg { display: grid; gap: 2px; padding: 0 0 4px; color: var(--muted); font-size: 11.5px; }
.v3-panel .leg b { color: var(--ink); font-weight: 600; }
@media (max-width: 760px) { .v3-stage { bottom: auto; top: 88px; } .v3-stage button { padding: 5px 7px; font-size: 11.5px; } }
@media (max-width: 760px) { .v3-sect .sf { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .v3-views { max-width: calc(100% - 20px); top: 46px; } .v3-panel { width: 210px; } .v3-info { max-height: 40%; } .v3-n { bottom: auto; top: 132px; right: 10px; } }
`;
// light up a picked thing. A see-through sampled sump uses a basic material with no "emissive": setting one there broke
// three.js's drawing (seen on the walk-through), so those are brightened instead.
const glow = (m, hex, k) => { if ('emissive' in m && m.emissive) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = k; } else m.color.lerp(new THREE.Color(hex), k * 0.6); return m; };
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
  // Brian, 27 Nov 2026 ("the views buttons is too much"): only Whole site, Plan and Sampling points as buttons, every other
  // ready-made view in one "More views" list, and the whole bar folds away.
  const vwrap = el('details', { class: 'v3-views' }); vwrap.open = view.clientWidth > 760;
  const vbar = el('div', { class: 'v3-row' }); vwrap.append(el('summary', {}, t.views), vbar);
  const MAIN = ['site', 'plan', 'samples'], mainViews = views.filter((v) => MAIN.includes(v.id));
  if (!mainViews.length) mainViews.push(views[0]);
  for (const v of mainViews) { const b = el('button', { type: 'button' }, name(v)); b.onclick = () => go(scaled(v.pos), scaled(v.target)); vbar.append(b); }
  const moreViews = views.filter((v) => !mainViews.includes(v));
  if (moreViews.length) {
    const sel = el('select', { 'aria-label': t.more }); sel.append(el('option', { value: '' }, t.more));
    moreViews.forEach((v, i) => sel.append(el('option', { value: String(i) }, name(v))));
    sel.onchange = () => { const v = moreViews[Number(sel.value)]; if (v) go(scaled(v.pos), scaled(v.target)); sel.value = ''; };
    vbar.append(sel);
  }
  box.append(vwrap);
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
  const layerBox = new Map();
  for (const g of layers) { g.visible = g.userData.on !== false; layerBox.set(g.name, check(name(g.userData), g.visible, (on) => { g.visible = on; }, colourOf(g))); }
  rows.append(el('hr'));
  const lab = el('div', { class: 'v3-lab' }); box.append(lab);
  const marks = [];
  const layerOf = (o) => { let p = o; while (p && !p.userData?.layer) p = p.parent; return p; };
  root.traverse((o) => {
    const u = o.userData || {};
    if (u.tag && u.at) { const s = el('span', {}, (l === 'th' && u.tagTh) || u.tag); lab.append(s); marks.push({ s, p: new THREE.Vector3(...u.at), kind: 'tag', layer: layerOf(o), o }); }
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
  const lit = [];   // things lit up because they drain to the picked sampling point
  const unpick = () => { if (picked) { picked.material = pickedMat; picked = null; } for (const [m, mt] of lit.splice(0)) m.material = mt; };
  let sampleSummary = () => {}, pickSample = () => {}, pickTarget = () => false, onlySampleLabels = false;
  // The card folds to its title bar instead of closing (Brian, 27 Nov 2026: a closed card could not be found again).
  // Folded or open is remembered in this browser and kept when another thing is clicked.
  let folded = false; try { folded = localStorage.getItem('calwwt.v3.card') === 'folded'; } catch { /* storage off */ }
  const frame = (...title) => {
    card.replaceChildren(); card.hidden = false; card.classList.toggle('folded', folded);
    const hd = el('div', { class: 'hd', role: 'button', tabindex: '0' }), fd = el('span', { class: 'fd', 'aria-hidden': 'true' }, folded ? '▸' : '▾');
    hd.title = folded ? t.unfold : t.fold; hd.setAttribute('aria-expanded', String(!folded));
    const flip = () => { folded = !folded; try { localStorage.setItem('calwwt.v3.card', folded ? 'folded' : 'open'); } catch { /* not remembered */ }
      card.classList.toggle('folded', folded); fd.textContent = folded ? '▸' : '▾'; hd.title = folded ? t.unfold : t.fold; hd.setAttribute('aria-expanded', String(!folded)); };
    hd.onclick = flip; hd.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    hd.append(fd, ...title); const bd = el('div', { class: 'bd' }); card.append(hd, bd); return bd;
  };
  // Brian, 27 Nov 2026: the how-to hint, datum and model notes were too much in view, then he wanted them back folded away:
  // they sit in "About this model" at the foot of the summary card, closed until opened (remembered in this browser).
  const about = (body) => {
    const d = el('details', { class: 'ab' }); d.append(el('summary', {}, t.about));
    try { d.open = localStorage.getItem('calwwt.v3.about') === 'open'; } catch { /* storage off */ }
    d.addEventListener('toggle', () => { try { localStorage.setItem('calwwt.v3.about', d.open ? 'open' : 'closed'); } catch { /* not remembered */ } });
    d.append(el('p', {}, t.hint));
    if (meta.datum) d.append(el('p', { class: 's' }, name(meta.datum)));
    if (meta.note) d.append(el('p', { class: 's' }, name(meta.note) + (meta.built ? ` ${t.built} ${meta.built}.` : '')));
    if (meta.sampling?.source) d.append(el('p', { class: 's' }, name(meta.sampling.source)));
    body.append(d);
  };
  const idle = () => {
    unpick(); card.replaceChildren(); card.hidden = true;
    if (meta.sampling) sampleSummary(); else about(frame(el('b', {}, t.about)));
  };
  const pick = (o) => {
    if (o.userData.sample) return pickSample(o);
    if (pickTarget(o)) return;
    unpick(); picked = o; pickedMat = o.material;
    const m = glow(o.material.clone(), 0xff9d00, 0.55); m.opacity = Math.max(m.opacity, 0.9); o.material = m;
    const u = o.userData, body = frame(el('b', {}, name(u)));
    const lines = (l === 'th' ? u.infoTh : u.infoEn) || [];
    lines.forEach((line, i) => body.append(el('p', i === lines.length - 1 && lines.length > 1 ? { class: 's' } : {}, line)));
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
    const hit = hits.find((h) => h.object.userData.sample) || hits.find((h) => !['building', 'fuel'].includes(h.object.userData.kind)) || hits[0];
    hit ? pick(hit.object) : idle();
  });

  // ---- long sections
  if (meta.sections?.length) {
    const ov = el('div', { class: 'v3-sect' }); ov.hidden = true; box.append(ov);
    const sb = el('button', { type: 'button', class: 'v3-secbtn' }, t.section); vbar.append(sb);
    sb.onclick = () => { ov.hidden = false; drawSection(ov, meta.sections[0], l, t); };
    ov.addEventListener('click', (e) => { if (e.target.closest('.x')) ov.hidden = true; });
    ['pointerdown', 'wheel'].forEach((k) => ov.addEventListener(k, (e) => e.stopPropagation()));
  }

  // ---- water sampling points (scene userData "sampling", made in tools/models/sampling.mjs from <code>/sampling.json).
  // The model's own sumps and pipes tell the story: in "2026 sampling" the sumps that are sampled turn red (G2.1) or blue (G2.2)
  // and only their labels show; in "Final design" every existing pipe system is coloured red or blue too.
  if (meta.sampling) {
    const S = meta.sampling, f2s = (v) => (Math.abs(v) < 0.005 ? '±0.00' : (v > 0 ? '+' : '-') + Math.abs(v).toFixed(2));
    const byId = new Map(), byName = new Map();
    root.traverse((o) => {
      const u = o.userData;
      if (!o.isMesh) return;
      if (u.sample) { if (!byId.has(u.sample.id)) byId.set(u.sample.id, []); byId.get(u.sample.id).push(o); }
      else if (u.en) { if (!byName.has(u.en)) byName.set(u.en, []); byName.get(u.en).push(o); }
    });
    const frameOf = (id) => { const l = byId.get(id) || []; return l.find((q) => q.userData.tag) || l[0]; };
    const targetOf = new Map();   // name of a sampled sump -> its sampling point id (so clicking the sump opens the point)
    for (const [id, l] of byId) for (const n of l[0].userData.sample.targets) targetOf.set(n, id);
    const verdict = (sm) => {
      const v = sm.result?.values; if (!v) return 'pending';
      let all = true;
      for (const k of sm.params) { const x = v[k], [lo, hi] = sm.limits[k]; if (x == null) { all = false; continue; } if ((lo != null && x < lo) || (hi != null && x > hi)) return 'fail'; }
      return all ? 'pass' : 'pending';
    };
    // ---- colouring (undone when the stage changes)
    const COL = { 'G2.1': 0xd7263d, 'G2.2': 0x1f6fe0, pass: 0x16a34a, fail: 0xdc2626, pending: 0x9ca3af }, mats = {}, kept = new Map();
    const matFor = (k) => (mats[k] ||= new THREE.MeshStandardMaterial({ color: COL[k], roughness: 0.6, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    const tmats = {}, throughMat = (k) => (tmats[k] ||= new THREE.MeshBasicMaterial({ color: COL[k], transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }));
    const paint = (o, k) => { if (!kept.has(o)) kept.set(o, o.material); o.material = matFor(k); };
    // a coloured pipe also gets a bold line along it that shows through the ground and the buildings
    const bold = new THREE.Group(); bold.renderOrder = 10; root.add(bold);
    const boldMats = {}, boldMat = (k) => (boldMats[k] ||= new THREE.MeshBasicMaterial({ color: COL[k], transparent: true, opacity: 0.9, depthTest: false }));
    const boldLine = (o, k) => {
      const L = o.userData.line; if (!L || L.length < 2) return;
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < L.length - 1; i++) {
        const a = new THREE.Vector3(...L[i]), b = new THREE.Vector3(...L[i + 1]), len = a.distanceTo(b); if (len < 0.01) continue;
        const g = new THREE.CylinderGeometry(0.22, 0.22, len, 8, 1, true);
        const m = new THREE.Mesh(g, boldMat(k)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); m.renderOrder = 10; m.userData = { nopick: 1 };
        bold.add(m);
      }
    };
    const unpaint = () => { for (const [o, m] of kept) o.material = m; kept.clear(); for (const c of [...bold.children]) { c.geometry.dispose(); bold.remove(c); } };
    let byResult = false;
    const lay = (id) => layers.find((g) => g.name === id);
    const setLayer = (id, on) => { const g = lay(id); if (g) { g.visible = on; const c = layerBox.get(id); if (c) c.checked = on; } };
    const staged = []; root.traverse((o) => { if (o.isMesh && o.userData?.stage) staged.push(o); });
    const shownAt = (st, k) => (st === 'future' ? k === 2 : st === 'now' ? k === 1 : k >= 1);
    let stageAt = 1;
    const planOn = lay('plan')?.visible !== false, proposedOn = lay('proposed')?.visible !== false;
    const bar = el('div', { class: 'v3-stage' }), sbtn = [];
    const stage = (k) => {
      stageAt = k; walkAt = -1; unpick(); unpaint();
      sbtn.forEach((b, i) => b && b.classList.toggle('on', i === k));
      setLayer('sampling', k >= 1); setLayer('plan', k === 0 ? planOn : false);
      if (lay('proposed')) setLayer('proposed', k === 0 ? proposedOn : k === 2);   // a proposed option the site shows (Kathu KFC option) comes back with "Existing"
      for (const o of staged) o.visible = o.userData.sample ? shownAt(o.userData.sample.stage, k) : o.userData.stage === 'future' ? k === 2 : true;
      onlySampleLabels = k >= 1;
      if (k === 2) for (const s of S.systems || []) for (const n of s.names) for (const o of byName.get(n) || []) { paint(o, s.group); boldLine(o, s.group); }
      if (k >= 1) for (const [id, l] of byId) {
        const sm = l[0].userData.sample; if (!shownAt(sm.stage, k)) continue;
        const key = byResult ? verdict(sm) : sm.group.split('+')[0];
        for (const n of sm.targets) for (const o of byName.get(n) || []) { paint(o, key); o.material = throughMat(key); }
      }
      idle();
    };
    t.stages.forEach((s0, i) => { if (i === 2 && !S.hasFuture) return; const b = el('button', { type: 'button', title: t.stageTip[i] }, s0); b.onclick = () => stage(i); sbtn[i] = b; bar.append(b); });
    box.append(bar);
    // ---- legend and the result switch
    const leg = el('div', { class: 'leg' });
    const key = (c, txt, shape) => { const r = el('span'), i = el('i'); i.style.cssText = `display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;background:${c};${shape}`; r.append(i, txt); leg.append(r); };
    key('#d7263d', t.g21, ''); key('#1f6fe0', t.g22, '');
    leg.append(el('span', {}, t.framed));
    if (S.hasFuture) { key('#ff66cc', t.st.ows, 'clip-path:polygon(50% 0,100% 100%,0 100%)'); key('#f08c00', t.flag, 'clip-path:polygon(0 0,100% 0,50% 100%)'); }
    const legBox = el('details'); legBox.append(el('summary', {}, t.sampleLeg), leg);
    rows.append(el('hr'), legBox);
    check(t.byResult, false, (on) => { byResult = on; stage(stageAt); });
    // ---- summary on the idle card, in the deck's words ("2.1 – 2 samples – 4 parameters tested")
    sampleSummary = () => {
      const body = frame(...(S.risk ? [el('span', { class: 'risk ' + S.risk }, `${S.risk}`)] : []), el('b', {}, t.sampleLeg));
      for (const c of (stageAt === 2 ? S.futureCounts : S.counts)) { const p = el('p'); p.append(el('span', { class: c.group === 'G2.1' ? 'g21' : 'g22' }, c.group.replace(/G/g, '')), ` – ${t.samples(c.samples)} – ${t.params(c.params)}`); body.append(p); }
      if (stageAt === 2 && S.systems?.length) { const p = el('p'); p.append(el('span', { class: 'g21' }, t.red), ' · ', el('span', { class: 'g22' }, t.blue)); body.append(p); }
      about(body);
    };
    // ---- the card of one sampling point
    let walkAt = -1, order = [];
    pickSample = (o) => {
      unpick(); const sm = o.userData.sample, fr = frameOf(sm.id) || o;
      picked = fr; pickedMat = fr.material;
      const m = glow(fr.material.clone(), 0xffffff, 0.35); fr.material = m;
      for (const n of sm.upstream || []) root.traverse((q) => {
        const u = q.userData; if (!q.isMesh || u.sample || !u.en || !(u.en === n || u.en.startsWith(n) || u.tag === n)) return;
        const mm = glow(q.material.clone(), 0x00c2ff, 0.6); mm.opacity = Math.max(mm.opacity, 0.9); lit.push([q, q.material]); q.material = mm;
      });
      const body = frame(el('b', {}, name(fr.userData)));
      const gl = el('p'); sm.group.split('+').forEach((g, i) => { if (i) gl.append(' + '); gl.append(el('span', { class: g === 'G2.1' ? 'g21' : 'g22' }, name(S.groups[g]))); }); body.append(gl);
      if (sm.targets?.length) body.append(el('p', {}, `${t.sump}: ${sm.targets.join(', ')}`));
      if (sm.where) body.append(el('p', {}, `${t.take}: ${name(sm.where)}`));
      body.append(el('p', {}, `${t.samples(sm.samples)} · ${t.level(f2s(sm.level), (sm.ground - sm.level).toFixed(2), sm.levelAssumed)}`));
      const v = sm.result?.values || null, tb = el('table'), hr = el('tr');
      for (const h of [t.tested, t.limit, ...(v ? [t.result] : [])]) hr.append(el('th', {}, h));
      tb.append(hr);
      for (const k of sm.params) {
        const [lo, hi] = sm.limits[k], tr = el('tr'), unit = k === 'pH' ? '' : ` ${t.mgl}`;
        tr.append(el('td', {}, name(S.params[k])), el('td', {}, lo != null && hi != null ? `${lo} – ${hi}` : `≤ ${hi}${unit}`));
        if (v) { const xv = v[k], bad = xv != null && ((lo != null && xv < lo) || (hi != null && xv > hi)); tr.append(el('td', { class: xv == null ? '' : bad ? 'bad' : 'ok', title: xv == null ? '' : bad ? t.fail : t.pass }, xv == null ? '–' : String(xv))); }
        tb.append(tr);
      }
      if (v) body.append(el('p', {}, t.resultOn(sm.result.date || '', sm.result.lab || '')));
      body.append(tb);
      if (!v) body.append(el('p', { class: 's' }, t.noResult));
      if (sm.upstream?.length) body.append(el('p', {}, `${t.drains}: ${sm.upstream.join(', ')}`));
      if (sm.note) body.append(el('p', {}, name(sm.note)));
      const src = (l === 'th' ? fr.userData.infoTh : fr.userData.infoEn) || []; if (src.length) body.append(el('p', { class: 's' }, src[src.length - 1]));
      if (walkAt >= 0) {
        const nav = el('div', { class: 'nav' }), a = el('button', { type: 'button' }, t.prev), b = el('button', { type: 'button' }, t.next);
        a.disabled = walkAt === 0; b.disabled = walkAt === order.length - 1;
        a.onclick = () => walk(walkAt - 1); b.onclick = () => walk(walkAt + 1);
        nav.append(a, el('span', {}, `${walkAt + 1} ${t.of} ${order.length}`), b); card.append(nav);
      }
    };
    // clicking the sampled sump itself opens its sampling point
    pickTarget = (o) => (stageAt >= 1 && targetOf.has(o.userData.en) && frameOf(targetOf.get(o.userData.en))?.visible ? (pickSample(frameOf(targetOf.get(o.userData.en))), true) : false);
    // ---- walk-through: fly to each point in turn, in the order of sampling.json
    const walk = (i) => {
      if (stageAt === 0) stage(1);
      order = S.order.filter((id) => byId.has(id) && shownAt(byId.get(id)[0].userData.sample.stage, stageAt));
      walkAt = Math.max(0, Math.min(order.length - 1, i));
      const list = byId.get(order[walkAt]), b = new THREE.Box3(); list.forEach((q) => b.expandByObject(q)); const c = b.getCenter(new THREE.Vector3());
      const sm = list[0].userData.sample, tgt = [c.x, sm.ground, c.z], pos = [c.x + 5, sm.ground + 8, c.z + 10];
      const w0 = walkAt; go(scaled(pos), scaled(tgt), 700); pickSample(frameOf(order[w0])); 
    };
    const wb = el('button', { type: 'button', class: 'v3-walk' }, `▶ ${t.walk}`); wb.onclick = () => walk(walkAt < 0 ? 0 : walkAt); vbar.append(wb);
    stage(1);
  }

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
      let on = showKind[m.kind] && (!m.layer || m.layer.visible) && (!m.o || m.o.visible) && (!onlySampleLabels || ['sample', 'flag', 'future'].includes(m.o?.userData.kind));
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

// ---------------------------------------------------------------- long section drawing
const SC = { surf: '#3a9d4a', pipe: '#d9468f', exist: '#7b8794', bad: '#d62728', water: '#3d7ea6', flow: '#16a34a', tank: '#a0662f' };
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const f2 = (v) => (v == null ? '' : Math.abs(v) < 0.005 ? '±0.00' : (v > 0 ? '+' : '') + v.toFixed(2));
function drawSection(ov, s, l, t) {
  const nm = (o) => (l === 'th' && o.th) || o.en || '';
  ov.replaceChildren();
  const head = el('div', { class: 'sh' }), body = el('div', { class: 'sb' }), foot = el('div', { class: 'sf' });
  head.append(el('div', { class: 'st' }, nm(s)), el('span', { class: 'sc' }, `${t.vert}${s.ve}`));
  const x = el('button', { type: 'button', class: 'x', title: t.close, 'aria-label': t.close }, '×'); head.append(x);
  ov.append(head, body, foot);
  // ---- profile
  const VE = s.ve || 10, TC = 150, L0 = TC + 20, RH = 26, NR = 6, avail = Math.max(700, (ov.clientWidth || 1200) - 40);
  const PX = Math.max(6, Math.min(26, (avail - L0 - 70) / s.length)), VY = PX * VE, D0 = s.datum, TOP = s.top;
  const yD = 52 + (TOP - D0) * VY, W = L0 + s.length * PX + 70, H = yD + NR * RH + 8;
  const X = (c) => L0 + c * PX, Y = (rl) => yD - (rl - D0) * VY, o = [];
  const line = (x1, y1, x2, y2, c, w = 1, d = '') => o.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''}/>`);
  const poly = (pts, c, w = 1.5, fill = 'none', d = '') => o.push(`<polyline points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${c}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''}/>`);
  const text = (x0, y0, s0, a = 'middle', cls = '') => o.push(`<text x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${a}"${cls ? ` class="${cls}"` : ''}>${esc(s0)}</text>`);
  const mut = 'var(--muted)', rule = 'var(--rule)', ink = 'var(--ink)';
  for (let k = Math.ceil(D0 / 0.5); k <= Math.floor(TOP / 0.5); k++) {
    const rl = k * 0.5; line(TC, Y(rl), TC + 5, Y(rl), mut); text(TC - 4, Y(rl) + 4, f2(rl), 'end', 'ax');
    line(X(0), Y(rl), X(s.length), Y(rl), 'color-mix(in srgb, var(--muted) 40%, transparent)', 1, '1.5 4');
  }
  line(TC + 5, Y(TOP), TC + 5, yD, mut); text(6, yD - 4, `${t.datum} ${D0.toFixed(2)}`, 'start', 'ax');
  // table
  const xe = X(s.length) + 40;
  for (let r = 0; r <= NR; r++) line(0, yD + r * RH, xe, yD + r * RH, rule);
  line(0, yD, 0, yD + NR * RH, rule); line(TC, yD, TC, yD + NR * RH, rule); line(xe, yD, xe, yD + NR * RH, rule);
  t.rows.forEach((n, r) => text(6, yD + r * RH + RH / 2 + 4, n, 'start', 'rt'));
  const cx = s.cols.map((c) => X(c.ch)), tx = cx.slice();
  for (let i = 1; i < tx.length; i++) if (tx[i] - tx[i - 1] < 50) { const m = (tx[i] + tx[i - 1]) / 2; tx[i - 1] = Math.min(tx[i - 1], m - 25); tx[i] = Math.max(tx[i], m + 25); }
  const cell = (i, r, vals) => { const yc = yD + r * RH + RH / 2; if (vals.length === 1) text(tx[i], yc + 4, vals[0]); else { text(tx[i], yc - 2, vals[0], 'middle', 'v2'); text(tx[i], yc + 9, vals[1], 'middle', 'v2'); } };
  s.cols.forEach((c, i) => {
    line(cx[i], yD, cx[i], Y(Math.min(...c.inv)), rule);
    const two = Math.abs(c.inv[0] - c.inv[1]) > 0.004;
    cell(i, 0, [f2(c.g)]);
    cell(i, 1, two ? [f2(c.inv[0]), f2(c.inv[1])] : [f2(c.inv[0])]);
    cell(i, 2, two ? [f2(c.inv[0] + 0.168), f2(c.inv[1] + 0.168)] : [f2(c.inv[0] + 0.168)]);
    cell(i, 3, [(c.g - Math.min(...c.inv)).toFixed(2)]);
    cell(i, 4, [c.ch.toFixed(2)]);
  });
  const mctx = document.createElement('canvas').getContext('2d'); mctx.font = '11px monospace';
  for (const g of s.segs) {
    const wpx = (g.ch1 - g.ch0) * PX, xm = X((g.ch0 + g.ch1) / 2), yc = yD + 5 * RH + RH / 2;
    const full = `${g.L.toFixed(1)} m · ${g.fall.toFixed(2)}% · ${g.rr}`, sh = `${g.fall.toFixed(2)}% · ${g.rr}`;
    if (mctx.measureText(full).width < wpx - 8) text(xm, yc + 4, full); else if (mctx.measureText(sh).width < wpx - 4) text(xm, yc + 4, sh);
    else { text(xm, yc - 2, `${g.fall.toFixed(2)}%`, 'middle', 'v2'); text(xm, yc + 9, g.rr, 'middle', 'v2'); }
  }
  // ground
  poly(s.surface.map(([a, b]) => [X(a), Y(b)]), SC.surf, 2);
  // tank
  if (s.tank) {
    const k = s.tank, x0 = Math.min(X(k.ch0), X(k.ch1)), w = Math.abs(X(k.ch1) - X(k.ch0)), rx = Math.min(w / 2, (k.top - k.bot) / 2 * VY * 0.35);
    o.push(`<rect x="${x0.toFixed(1)}" y="${Y(k.top).toFixed(1)}" width="${w.toFixed(1)}" height="${((k.top - k.bot) * VY).toFixed(1)}" rx="${rx.toFixed(1)}" fill="color-mix(in srgb, ${SC.pipe} 12%, transparent)" stroke="${SC.pipe}" stroke-width="1.8"/>`);
    line(x0 + 3, Y(k.outl + 0.168 / 2), x0 + w - 3, Y(k.outl + 0.168 / 2), SC.water, 1.4, '5 3');
    const ym = Y((k.top + k.bot) / 2);
    text(x0 - 8, ym - 8, nm(k), 'end', 'lb');
    text(x0 - 8, ym + 7, `${t.in} ${f2(k.inl)} · ${t.out} ${f2(k.outl)}`, 'end', 'v2');
    text(x0 - 8, ym + 20, `${t.top} ${f2(k.top)} · ${t.bottom} ${f2(k.bot)}`, 'end', 'v2');
  }
  // oil trap
  if (s.ows) {
    const k = s.ows, x0 = X(k.ch0), w = X(k.ch1) - X(k.ch0);
    o.push(`<rect x="${x0.toFixed(1)}" y="${Y(k.top).toFixed(1)}" width="${w.toFixed(1)}" height="${((k.top - k.bot) * VY).toFixed(1)}" fill="color-mix(in srgb, var(--ink) 6%, transparent)" stroke="${ink}" stroke-width="1.6"/>`);
    line(x0, Y(k.top), x0 + w, Y(k.top), ink, 4);
    line(x0 + 2, Y(k.out), x0 + w - 2, Y(k.out), SC.water, 1.6, '5 3');
    text(x0 + w + 6, Y(k.inl) - 2, `${t.in} ${f2(k.inl)}`, 'start', 'v2'); text(x0 + w + 6, Y(k.out) + 10, `${t.out} ${f2(k.out)}`, 'start', 'v2');
  }
  // pipes, with flow arrows
  for (const p of s.pipes) {
    poly([[X(p.ch0), Y(p.ila)], [X(p.ch1), Y(p.ilb)], [X(p.ch1), Y(p.ilb + p.dia)], [X(p.ch0), Y(p.ila + p.dia)], [X(p.ch0), Y(p.ila)]], SC.pipe, 1.4, `color-mix(in srgb, ${SC.pipe} 22%, transparent)`);
    if (X(p.ch1) - X(p.ch0) > 46) { const xm = (X(p.ch0) + X(p.ch1)) / 2, ym = Y((p.ila + p.ilb) / 2 + p.dia + 0.1); o.push(`<path d="M${(xm - 9).toFixed(1)},${(ym - 4.5).toFixed(1)} L${(xm + 9).toFixed(1)},${ym.toFixed(1)} L${(xm - 9).toFixed(1)},${(ym + 4.5).toFixed(1)} Z" fill="${SC.flow}"/>`); }
  }
  for (const j of s.joins || []) o.push(`<circle cx="${X(j.ch).toFixed(1)}" cy="${Y(j.rl + j.dia / 2).toFixed(1)}" r="4.5" fill="var(--panel)" stroke="${SC.pipe}" stroke-width="2"/>`);
  // standing water
  if (s.water) { const w = s.water; line(X(w.ch0), Y(w.rl), X(w.ch1), Y(w.rl), SC.water, 2, '7 4'); line(X(w.ch0), Y(w.rl), X(w.ch0) - 10, Y(w.rl - 0.26), SC.water, 1); text(X(w.ch0) - 12, Y(w.rl - 0.30), nm(w), 'end', 'wt'); }
  // existing drains the pipe crosses
  const labs = s.cols.map((c, i) => [cx[i], nm(c), '']);
  for (const c of s.cross || []) {
    const col = c.clash ? SC.bad : SC.exist;
    o.push(`<ellipse cx="${X(c.ch).toFixed(1)}" cy="${Y(c.rl + c.dia / 2).toFixed(1)}" rx="${Math.max(3, (c.dia / 2) * PX).toFixed(1)}" ry="${((c.dia / 2) * VY).toFixed(1)}" fill="color-mix(in srgb, ${col} 18%, transparent)" stroke="${col}" stroke-width="2"/>`);
    line(X(c.ch), Y(c.rl + c.dia), X(c.ch), Y(TOP - 0.18), col, 1, '2 2');
    labs.push([X(c.ch), `${nm(c)} ${f2(c.rl)} · ${c.clash ? t.clash : t.clear}`, c.clash ? 'bad' : '']);
  }
  // station names above the ground, up to 3 rows, no overlaps
  const rows = [Y(TOP) - 2, Y(TOP) + 13, Y(TOP) + 28], placed = [[], [], []];
  labs.sort((a, b) => a[0] - b[0]).forEach(([x0, s0, cls]) => {
    const w = mctx.measureText(s0).width * 1.12 + 10;
    for (let r = 0; r < 3; r++) if (placed[r].every(([a, b]) => x0 + w / 2 < a || x0 - w / 2 > b)) { placed[r].push([x0 - w / 2, x0 + w / 2]); text(x0, rows[r], s0, 'middle', cls || 'lb'); break; }
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`); svg.setAttribute('width', W.toFixed(0)); svg.setAttribute('height', H.toFixed(0)); svg.innerHTML = o.join('');
  body.append(svg);
  // ---- key plan, legend, notes
  const kbox = el('div'); kbox.append(el('div', { class: 'kt' }, t.key));
  if (s.key) {
    const K = s.key, [x0, x1, y0, y1] = K.box, sc = 300 / (x1 - x0), P = (q) => `${((q[0] - x0) * sc).toFixed(1)},${((y1 - q[1]) * sc).toFixed(1)}`, k = [];
    const pl = (pts, attrs, close) => k.push(`<${close ? 'polygon' : 'polyline'} points="${pts.map(P).join(' ')}" ${attrs}/>`);
    if (K.boundary) pl(K.boundary, 'fill="none" stroke="var(--ink)" stroke-width="1.2"', true);
    (K.blds || []).forEach((b) => pl(b, 'fill="color-mix(in srgb, var(--ink) 10%, transparent)" stroke="var(--muted)" stroke-width=".8"', true));
    (K.drains || []).forEach((d) => pl(d, `fill="none" stroke="${SC.exist}" stroke-width="1" stroke-dasharray="3 2"`));
    if (K.tank) pl(K.tank, `fill="color-mix(in srgb, ${SC.pipe} 30%, transparent)" stroke="${SC.pipe}" stroke-width="1.2"`, true);
    pl(K.route, `fill="none" stroke="${SC.pipe}" stroke-width="3" stroke-linejoin="round"`);
    for (const c of s.cross || []) if (c.clash) { /* crossing points are not in the key data: shown in the section */ }
    (K.marks || []).forEach(([mx, my, s0]) => k.push(`<text x="${((mx - x0) * sc).toFixed(1)}" y="${((y1 - my) * sc - 6).toFixed(1)}" text-anchor="middle">${esc(s0)}</text>`));
    const e = K.route[K.route.length - 1], f = K.route[K.route.length - 2], ang = (Math.atan2(-(e[1] - f[1]), e[0] - f[0]) * 180) / Math.PI;
    k.push(`<path d="M0,0 L-9,-4.5 L-9,4.5 Z" fill="${SC.pipe}" transform="translate(${P(e)}) rotate(${ang.toFixed(1)})"/>`);
    const ks = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ks.setAttribute('viewBox', `0 0 300 ${((y1 - y0) * sc).toFixed(0)}`); ks.setAttribute('width', 240); ks.setAttribute('height', ((y1 - y0) * sc * 0.8).toFixed(0)); ks.innerHTML = k.join(''); kbox.append(ks);
  }
  const ft = el('div'), lg = el('div', { class: 'lg' });
  [[SC.pipe, 0], [SC.surf, 1], [SC.exist, 2], [SC.bad, 3], [SC.water, 4]].forEach(([c, i]) => { const sp = el('span'), sw = el('i'); sw.style.background = c; sp.append(sw, t.leg[i]); lg.append(sp); });
  ft.append(lg); if (s.foot) ft.append(el('div', {}, nm(s.foot)));
  foot.append(kbox, ft);
}
