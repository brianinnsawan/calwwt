// 3D site model (calwwt.sppwork.com/sites/<code>/), used when sites.json gives the site a "model" (a .glb file in
// public/sites/models/). three.js r170 is kept in public/sites/vendor/ (no outside links: the site's security rules
// only allow its own files). Orbit with the mouse or a finger; "Reset view" goes back to the start.
import * as THREE from '/sites/vendor/three.module.min.js';
import { OrbitControls } from '/sites/vendor/OrbitControls.js';
import { GLTFLoader } from '/sites/vendor/GLTFLoader.js';

export async function show(view, url, w) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  view.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f4f5f2');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f88, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(40, 80, 30); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const gltf = await new GLTFLoader().loadAsync(url);
  scene.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const home = () => {
    const r = Math.max(size.x, size.y, size.z) || 10;
    camera.position.set(mid.x + r * 0.8, mid.y + r * 0.7, mid.z + r * 0.9); controls.target.copy(mid); controls.update();
  };
  home();
  const tools = document.createElement('div'); tools.className = 'vtools';
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = w.reset; reset.onclick = home;
  tools.append(reset); view.append(tools);
  const resize = () => { const W = view.clientWidth, H = view.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / Math.max(H, 1); camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(view); resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
}
