// Show / hide password (Brian, 3 Nov 2026): every password box gets an eye button. Press to see what you typed, press
// again to hide it. Boxes go back to hidden when the form is sent, and work for boxes added later (e.g. the Admin
// page's "Confirm it's you" box). No HTML strings; styles are set on the elements.
const NS = 'http://www.w3.org/2000/svg';
const words = () => (document.documentElement.lang === 'en' ? { show: 'Show password', hide: 'Hide password' } : { show: 'แสดงรหัสผ่าน', hide: 'ซ่อนรหัสผ่าน' });
function icon(open) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('aria-hidden', 'true');
  const add = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); svg.append(el); };
  const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  add('path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', ...line });
  add('circle', { cx: '12', cy: '12', r: '3', ...line });
  if (!open) add('path', { d: 'M3 3l18 18', ...line });
  return svg;
}
function enhance(input) {
  if (input.dataset.eye) return;
  input.dataset.eye = '1';
  const wrap = document.createElement('span');
  wrap.style.cssText = 'position:relative;display:block;width:100%';
  input.before(wrap); wrap.append(input);
  input.style.paddingRight = '44px'; input.style.boxSizing = 'border-box'; input.style.width = '100%';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pw-eye';
  btn.style.cssText = 'position:absolute;right:4px;top:50%;transform:translateY(-50%);width:36px;height:36px;margin:0;padding:0;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.75;cursor:pointer';
  const paint = () => {
    const shown = input.type === 'text', w = words();
    btn.replaceChildren(icon(shown));
    btn.setAttribute('aria-label', shown ? w.hide : w.show); btn.title = shown ? w.hide : w.show;
    btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
  };
  btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep the cursor in the box
  btn.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; paint(); input.focus(); });
  input._eyePaint = paint;
  wrap.append(btn);
  paint();
}
function hideAll(root) {
  for (const input of root.querySelectorAll('input[data-eye]')) if (input.type === 'text') { input.type = 'password'; input._eyePaint?.(); }
}
function scan(root = document) { for (const input of root.querySelectorAll('input[type=password]')) enhance(input); }
scan();
// Sending or clearing a form always hides the passwords again (runs before the page's own handlers).
document.addEventListener('submit', (e) => hideAll(e.target), true);
document.addEventListener('reset', (e) => hideAll(e.target), true);
new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches?.('input[type=password]')) enhance(n); else scan(n); } })
  .observe(document.documentElement, { childList: true, subtree: true });
// The sign-in page switches Thai / English in place: keep the button labels in step.
new MutationObserver(() => { for (const input of document.querySelectorAll('input[data-eye]')) input._eyePaint?.(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
