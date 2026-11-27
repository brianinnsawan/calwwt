// Line icons for the CAD workspace ribbon, drawn for this site (no icon fonts, nothing loaded from outside).
// Each icon is a list of SVG shapes on a 32 x 32 grid; "a" marks the parts drawn in the accent blue, "f" filled shapes.
const P = (d, x = '') => ['path', { d }, x];
const ICONS = {
  line: [P('M6 26 L26 6'), ['rect', { x: 3.5, y: 23.5, width: 5, height: 5 }, 'a'], ['rect', { x: 23.5, y: 3.5, width: 5, height: 5 }, 'a']],
  pline: [P('M4 25 L11 10 L20 21 L28 7'), ['rect', { x: 2, y: 23, width: 4, height: 4 }, 'a'], ['rect', { x: 9, y: 8, width: 4, height: 4 }, 'a'], ['rect', { x: 18, y: 19, width: 4, height: 4 }, 'a'], ['rect', { x: 26, y: 5, width: 4, height: 4 }, 'a']],
  leader: [P('M6 26 L18 12 H27'), P('M6 26 l1.2 -5.6 l3.6 3.2 z', 'af'), P('M19 7 H27 M19 9.5 H25', 'a')],
  rect: [['rect', { x: 5, y: 8, width: 22, height: 16 }], ['rect', { x: 3, y: 6, width: 4, height: 4 }, 'a'], ['rect', { x: 25, y: 22, width: 4, height: 4 }, 'a']],
  circle: [['circle', { cx: 16, cy: 16, r: 11 }], P('M13 16 H19 M16 13 V19', 'a')],
  cloud: [P('M7 20 a3.2 3.2 0 0 1 0.6 -6.2 a4 4 0 0 1 6.4 -4 a4.2 4.2 0 0 1 7.6 1.2 a3.4 3.4 0 0 1 3.2 5.6 a3 3 0 0 1 -2.4 4.8 a3.4 3.4 0 0 1 -5.4 1.4 a3.6 3.6 0 0 1 -6 0.2 a3 3 0 0 1 -4 -3z', 'a')],
  text: [P('M8 25 L16 6 L24 25 M11 18 H21'), P('M5 28 H27', 'a')],
  undo: [P('M10 9 L5 14 L10 19'), P('M5 14 H19 a7 7 0 0 1 0 14 H12', 'a')],
  redo: [P('M22 9 L27 14 L22 19'), P('M27 14 H13 a7 7 0 0 0 0 14 H20', 'a')],
  erase: [P('M13 25 L5 17 L16 6 L27 17 L19 25 Z'), P('M10 12 L21 23', 'a'), P('M13 25 H28')],
  finish: [P('M25 7 V17 H8'), P('M12 12 L7 17 L12 22', 'a')],
  distance: [P('M5 16 H27'), P('M5 16 l4 -3 v6 z M27 16 l-4 -3 v6 z', 'af'), P('M5 9 V23 M27 9 V23', 'a')],
  chain: [P('M4 24 L11 12 L19 20 L28 7'), ['circle', { cx: 4, cy: 24, r: 2 }, 'af'], ['circle', { cx: 11, cy: 12, r: 2 }, 'af'], ['circle', { cx: 19, cy: 20, r: 2 }, 'af'], ['circle', { cx: 28, cy: 7, r: 2 }, 'af']],
  area: [P('M5 25 L8 8 L22 5 L27 18 L16 27 Z'), P('M9 20 L15 10 M12 24 L21 9 M17 24 L24 14', 'a')],
  angle: [P('M5 26 H28 M5 26 L22 6'), P('M15 26 a10 10 0 0 0 -3.2 -7.4', 'a')],
  extents: [['rect', { x: 9, y: 9, width: 10, height: 10 }, 'a'], P('M4 10 V4 H10 M22 4 H28 V10 M28 22 V28 H22 M10 28 H4 V22'), P('M18 18 L26 26')],
  pan: [P('M16 4 V28 M4 16 H28'), P('M16 4 l-3 4 h6 z M16 28 l-3 -4 h6 z M4 16 l4 -3 v6 z M28 16 l-4 -3 v6 z', 'af')],
  layouts: [['rect', { x: 6, y: 4, width: 20, height: 24 }], ['rect', { x: 10, y: 9, width: 12, height: 9 }, 'a'], P('M10 22 H22')],
  save: [P('M5 5 H23 L27 9 V27 H5 Z'), ['rect', { x: 10, y: 5, width: 11, height: 7 }, 'a'], ['rect', { x: 9, y: 17, width: 14, height: 10 }]],
  history: [['circle', { cx: 16, cy: 16, r: 11 }], P('M16 9 V16 L21 19', 'a'), P('M3 13 L5 17 L8 14')],
  share: [['circle', { cx: 9, cy: 16, r: 3.5 }, 'a'], ['circle', { cx: 23, cy: 8, r: 3.5 }], ['circle', { cx: 23, cy: 24, r: 3.5 }], P('M12 14.2 L20 9.8 M12 17.8 L20 22.2')],
  download: [P('M16 4 V20'), P('M10 14 L16 20 L22 14', 'a'), P('M5 21 V27 H27 V21')],
  program: [['rect', { x: 4, y: 6, width: 24, height: 20 }], P('M4 11 H28'), P('M9 22 L15 15 L19 19 L24 14', 'a')],
  background: [['rect', { x: 5, y: 5, width: 22, height: 22 }], P('M5 5 H27 V27 Z', 'af')],
  start: [P('M5 15 L16 5 L27 15 M8 13 V27 H24 V13'), ['rect', { x: 13, y: 19, width: 6, height: 8 }, 'a']],
  palette: [['rect', { x: 4, y: 5, width: 24, height: 22 }], P('M19 5 V27'), P('M22 10 H26 M22 14 H26 M22 18 H26', 'a')],
  plus: [P('M16 7 V25 M7 16 H25')],
};
const NS = 'http://www.w3.org/2000/svg';
/** <svg> for an icon; size in CSS pixels (32 large, 16 small). */
export function icon(name, size = 32) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('width', String(size)); svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('class', 'ac-icon');
  for (const [tag, attrs, kind = ''] of ICONS[name] || []) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    n.setAttribute('class', `${kind.includes('a') ? 'ac-i-a' : 'ac-i'}${kind.includes('f') ? ' ac-i-f' : ''}`);
    svg.append(n);
  }
  return svg;
}
export const ICON_NAMES = Object.keys(ICONS);
