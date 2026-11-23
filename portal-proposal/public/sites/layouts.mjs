// Wastewater layouts on a site page (calwwt.sppwork.com/sites/<code>/): one sheet at a time, zoom and pan with the mouse,
// a finger or the buttons; "Open PDF" opens the full-quality drawing. Files: public/sites/layouts/<code>/<name>.png / .pdf
// (the PNG is page 1 of the PDF, for quick viewing on a phone).
const T = {
  en: { fit: 'Fit', zoomIn: 'Zoom in', zoomOut: 'Zoom out', pdf: 'Open PDF', sheets: 'Sheets', hint: 'Scroll or pinch to zoom · drag to move' },
  th: { fit: 'พอดีจอ', zoomIn: 'ขยาย', zoomOut: 'ย่อ', pdf: 'เปิด PDF', sheets: 'แผ่นงาน', hint: 'เลื่อนลูกกลิ้งหรือใช้สองนิ้วเพื่อซูม · ลากเพื่อเลื่อน' },
};
const CSS = `
.lv { position: absolute; inset: 0; display: grid; grid-template-rows: auto 1fr; background: var(--paper); }
.lv-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--rule); background: var(--panel); }
.lv-bar select { max-width: min(520px, 100%); }
.lv-bar .sp { flex: 1; }
.lv-bar .hint { font-size: 12px; color: var(--muted); }
.lv-stage { position: relative; overflow: hidden; touch-action: none; cursor: grab; background: #fff; }
.lv-stage.drag { cursor: grabbing; }
.lv-stage img { position: absolute; left: 0; top: 0; transform-origin: 0 0; user-select: none; -webkit-user-drag: none; max-width: none; }
.lv-src { position: absolute; left: 10px; bottom: 8px; font: 11px var(--font-mono); color: #5d6a74; background: rgba(255,255,255,.85); padding: 2px 6px; border-radius: 4px; }
`;
const el = (tag, attrs = {}, text) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };

export function showLayouts(view, site, l, w) {
  const t = T[l];
  if (!document.getElementById('lv-css')) { const s = el('style', { id: 'lv-css' }); s.textContent = CSS; document.head.append(s); }
  const box = el('div', { class: 'lv' });
  const bar = el('div', { class: 'lv-bar' });
  const pick = el('select', { 'aria-label': t.sheets });
  site.layouts.forEach((x, i) => pick.append(el('option', { value: String(i) }, x[l] || x.en)));
  const out = el('button', { type: 'button', title: t.zoomOut, 'aria-label': t.zoomOut }, '−');
  const inn = el('button', { type: 'button', title: t.zoomIn, 'aria-label': t.zoomIn }, '+');
  const fit = el('button', { type: 'button' }, t.fit);
  const pdf = el('a', { class: 'pdf', target: '_blank', rel: 'noopener' }, t.pdf);
  bar.append(pick, out, inn, fit, pdf, el('span', { class: 'sp' }), el('span', { class: 'hint' }, t.hint));
  const stage = el('div', { class: 'lv-stage' });
  const img = el('img', { alt: '', draggable: 'false' });
  const src = el('div', { class: 'lv-src' });
  stage.append(img, src);
  box.append(bar, stage);
  view.append(box);

  let s = 1, x = 0, y = 0;
  const apply = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
  const doFit = () => {
    const W = stage.clientWidth, H = stage.clientHeight, iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    s = Math.min(W / iw, H / ih) * 0.98; x = (W - iw * s) / 2; y = (H - ih * s) / 2; apply();
  };
  const zoomAt = (f, cx, cy) => {
    const ns = Math.min(Math.max(s * f, 0.05), 8); x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns; apply();
  };
  const show = (i) => {
    const sh = site.layouts[i];
    img.onload = doFit;
    img.src = `/sites/layouts/${sh.file}.png`;
    img.alt = sh[l] || sh.en;
    pdf.href = `/sites/layouts/${sh.file}.pdf`;
    src.textContent = sh.source ? `${l === 'th' ? 'ต้นฉบับ' : 'Original'}: ${sh.source}` : '';
  };
  pick.onchange = () => show(Number(pick.value));
  fit.onclick = doFit;
  inn.onclick = () => zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2);
  out.onclick = () => zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const pts = new Map(); let last = null;
  stage.addEventListener('pointerdown', (e) => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); stage.classList.add('drag'); last = null; });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { x += e.clientX - prev[0]; y += e.clientY - prev[1]; apply(); return; }
    const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = stage.getBoundingClientRect();
    if (last) zoomAt(d / last, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
    last = d;
  });
  const up = (e) => { pts.delete(e.pointerId); last = null; if (!pts.size) stage.classList.remove('drag'); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', (e) => { const r = stage.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
  new ResizeObserver(() => { if (img.naturalWidth) doFit(); }).observe(stage);
  show(0);
}
