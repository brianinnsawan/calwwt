// Map of the 8 sites on the Sites overview (calwwt.sppwork.com/sites/). Pins come from sites.json (lat / lng, copied from
// Brian's Google My Maps "Caltex 2027 Wastewater - SPP Sites"). Click a pin to open that site's page.
// Leaflet 1.9.4 is kept in vendor/leaflet/. Two backgrounds, chosen with the switch at the top left and remembered on this
// device: Map (OpenStreetMap) and Satellite (Esri World Imagery, with place names on top). Both are allowed for the Sites
// pages only (src/sites.mjs SITES_CSP). The pictures are asked for with this site's address only (referrer "origin").
// Click a pin: a small box with Open site page / Zoom to site / Google Maps.
import * as L from '/sites/vendor/leaflet/leaflet-src.esm.js';

const VIEWS = {
  all: null, // fit every pin
  bkk: { codes: ['1156', '1588', '1622', '1703'] },
  hkt: { codes: ['0589', '1642'] },
};
// Zoomed out (whole country), the Bangkok-area and Phuket pins sit on top of each other: one group pin each instead,
// which zooms in when clicked. From zoom GROUP_UNTIL up, every site has its own pin.
const GROUP_UNTIL = 9;
const W = {
  en: { all: 'All sites', bkk: 'Bangkok area', hkt: 'Phuket', open: 'Open site page', zoom: 'Zoom to site', gmaps: 'Google Maps', map: 'Map', sat: 'Satellite' },
  th: { all: 'ทุกสถานี', bkk: 'กรุงเทพฯ และปริมณฑล', hkt: 'ภูเก็ต', open: 'เปิดหน้าสถานี', zoom: 'ซูมไปที่สถานี', gmaps: 'Google Maps', map: 'แผนที่', sat: 'ภาพดาวเทียม' },
};
const CSS = `
.sx-map { position: relative; height: min(56vh, 520px); min-height: 320px; border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; margin-bottom: 16px; background: var(--panel); }
.sx-map .leaflet-container { width: 100%; height: 100%; font: 13px var(--font-body); background: #aad3df; }
.sx-views { position: absolute; z-index: 500; top: 10px; right: 10px; display: flex; gap: 4px; }
.sx-views button { background: var(--panel); font-size: 12.5px; padding: 4px 10px; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.sx-views button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.sx-pin { background: var(--accent); color: #fff; font: 600 11.5px var(--font-mono); border: 2px solid #fff; border-radius: 6px; padding: 2px 6px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,.35); cursor: pointer; text-align: center; }
.sx-pin.warn { background: #b26a00; } .sx-pin.ok { background: #2a7d3f; }
.sx-pin:hover { transform: scale(1.12); }
.sx-pop b { display: block; font-size: 14px; } .sx-pop span { display: block; color: #5d6a74; font-size: 12px; margin: 2px 0 6px; }
.sx-pop .acts { display: flex; flex-wrap: wrap; gap: 6px; }
.sx-pop .acts a, .sx-pop .acts button { font: 600 12.5px var(--font-body); padding: 4px 9px; border: 1px solid #c9d1cf; border-radius: 6px; background: #fff; color: #0f6e74; text-decoration: none; cursor: pointer; }
.sx-pop .acts a.go { background: #0f6e74; border-color: #0f6e74; color: #fff; }
.sx-base { position: absolute; z-index: 500; top: 10px; left: 50px; display: flex; border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.sx-base button { border: 0; border-radius: 0; font-size: 12.5px; padding: 5px 11px; background: var(--panel); }
.sx-base button.on { background: var(--accent); color: #fff; }
`;

export function showMap(box, sites, l) {
  const w = W[l];
  if (!document.getElementById('sx-map-css')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/sites/vendor/leaflet/leaflet.css'; document.head.append(link);
    const st = document.createElement('style'); st.id = 'sx-map-css'; st.textContent = CSS; document.head.append(st);
  }
  const pins = sites.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const map = L.map(box, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
  const bases = {
    map: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, referrerPolicy: 'origin', attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }),
    sat: L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, maxNativeZoom: 19, referrerPolicy: 'origin', attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, referrerPolicy: 'origin',
      }),
    ]),
  };
  const BASE_KEY = 'calwwt.mapBase';
  let base = 'map'; try { if (localStorage.getItem(BASE_KEY) === 'sat') base = 'sat'; } catch { /* storage blocked */ }
  bases[base].addTo(map);
  const baseBar = document.createElement('div'); baseBar.className = 'sx-base';
  for (const k of ['map', 'sat']) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = w[k]; btn.dataset.base = k; btn.classList.toggle('on', k === base);
    btn.onclick = (e) => {
      e.stopPropagation(); if (k === base) return;
      map.removeLayer(bases[base]); base = k; bases[base].addTo(map);
      baseBar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.base === base));
      try { localStorage.setItem(BASE_KEY, base); } catch { /* storage blocked */ }
    };
    baseBar.append(btn);
  }
  L.DomEvent.disableClickPropagation(baseBar);
  box.append(baseBar);
  map.attributionControl.setPrefix(false);
  // The map only scrolls-to-zoom after a click on it, so the page itself still scrolls.
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  const marks = {}, single = L.layerGroup(), grouped = L.layerGroup();
  for (const s of pins) {
    const improve = !/^No improvement/.test(s.improvement?.en || '');
    const icon = L.divIcon({ className: '', html: `<div class="sx-pin ${improve ? 'warn' : 'ok'}">${s.code}</div>`, iconSize: [44, 22], iconAnchor: [22, 11] });
    const m = L.marker([s.lat, s.lng], { icon, title: `${s.code} ${s.name[l]}`, riseOnHover: true });
    single.addLayer(m);
    if (!Object.values(VIEWS).some((v) => v?.codes.includes(s.code))) grouped.addLayer(L.marker([s.lat, s.lng], { icon, title: `${s.code} ${s.name[l]}` })
      .on('click', () => { map.flyTo([s.lat, s.lng], GROUP_UNTIL + 4); map.once('moveend', () => marks[s.code]?.openPopup()); })
      .bindTooltip(`${s.code} ${s.name[l]}`, { direction: 'top', offset: [0, -12] }));
    const pop = document.createElement('div'); pop.className = 'sx-pop';
    const b = document.createElement('b'); b.textContent = `${s.code} ${s.name[l]}`;
    const c = document.createElement('span'); c.textContent = s.company || '';
    const acts = document.createElement('div'); acts.className = 'acts';
    const go = document.createElement('a'); go.className = 'go'; go.href = `/sites/${s.code}/`; go.textContent = w.open + ' →';
    const zm = document.createElement('button'); zm.type = 'button'; zm.textContent = w.zoom;
    zm.onclick = () => { map.closePopup(); map.flyTo([s.lat, s.lng], 18); };
    const gm = document.createElement('a'); gm.href = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`; gm.target = '_blank'; gm.rel = 'noopener'; gm.textContent = w.gmaps + ' ↗';
    acts.append(go, zm, gm);
    pop.append(b, c, acts);
    // Click a pin: the box with the three choices.
    m.bindPopup(pop, { offset: [0, -8] });
    m.bindTooltip(`${s.code} ${s.name[l]}`, { direction: 'top', offset: [0, -12] });
    m.on('popupopen', () => m.closeTooltip());
    marks[s.code] = m;
  }
  const fit = (codes) => {
    const pts = (codes ? pins.filter((s) => codes.includes(s.code)) : pins).map((s) => [s.lat, s.lng]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
  };
  for (const k of ['bkk', 'hkt']) {
    const g = pins.filter((s) => VIEWS[k].codes.includes(s.code)); if (!g.length) continue;
    const lat = g.reduce((a, s) => a + s.lat, 0) / g.length, lng = g.reduce((a, s) => a + s.lng, 0) / g.length;
    const icon = L.divIcon({ className: '', html: `<div class="sx-pin warn">${w[k]} (${g.length})</div>`, iconSize: null, iconAnchor: [0, 11] });
    grouped.addLayer(L.marker([lat, lng], { icon, title: g.map((s) => `${s.code} ${s.name[l]}`).join(' · ') })
      .on('click', () => { pick(k); fit(VIEWS[k].codes); }));
  }
  const layers = () => { const z = map.getZoom(); if (z < GROUP_UNTIL) { map.removeLayer(single); grouped.addTo(map); } else { map.removeLayer(grouped); single.addTo(map); } };
  map.on('zoomend', layers);
  const bar = document.createElement('div'); bar.className = 'sx-views';
  const pick = (k) => bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.view === k));
  for (const [k, v] of Object.entries(VIEWS)) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = w[k]; btn.dataset.view = k;
    btn.onclick = (e) => { e.stopPropagation(); pick(k); fit(v?.codes); };
    if (k === 'all') btn.classList.add('on');
    bar.append(btn);
  }
  L.DomEvent.disableClickPropagation(bar);
  box.append(bar);
  fit(null); layers();
  new ResizeObserver(() => map.invalidateSize()).observe(box);
  return { map, marks };
}
