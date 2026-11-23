// QR code for 2-step sign-in set-up (Account page). Builds an SVG with DOM calls; nothing leaves the browser.
import qrcode from 'qrcode-generator';
export function qrSvg(text, px = 4) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 4, size = (n + 2 * m) * px, ns = 'http://www.w3.org/2000/svg';
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + m) * px},${(r + m) * px}h${px}v${px}h-${px}z`;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('role', 'img');
  const bg = document.createElementNS(ns, 'rect'); bg.setAttribute('width', size); bg.setAttribute('height', size); bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.append(bg, path);
  return svg;
}
