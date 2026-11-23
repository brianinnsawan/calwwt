// Dates in words next to every date box (Brian, 3 Nov 2026). The browser draws a date box in the phone's own format, so
// an English-set phone shows 11/04/2026 (month first), which a Thai reader takes as 11 April. Next to each date box this
// shows the same date in words, in the page language: "พ. 11 พ.ย. 2569" (Buddhist year) or "Wed 11 Nov 2026".
// Works for boxes added later too. No HTML strings; styles are set on the element.
const LABEL = 'dateWords';
function words(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const th = (document.documentElement.lang || 'th').startsWith('th');
  try {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(th ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch { return ''; }
}
function paint(input) {
  const span = input[LABEL];
  if (!span) return;
  const text = words(input.value);
  span.textContent = text;
  span.hidden = !text;
}
function enhance(input) {
  if (input[LABEL] || input.closest('[data-no-date-words]')) return;
  const span = document.createElement('span');
  span.className = 'date-words';
  span.setAttribute('aria-hidden', 'true'); // screen readers already read the date box itself
  span.style.cssText = 'margin-left:6px;font-size:12px;opacity:.75;white-space:nowrap';
  input[LABEL] = span;
  input.after(span);
  for (const type of ['input', 'change']) input.addEventListener(type, () => paint(input));
  paint(input);
}
function scan(root = document) {
  if (root.matches?.('input[type=date]')) enhance(root);
  for (const input of root.querySelectorAll?.('input[type=date]') || []) enhance(input);
}
scan();
new MutationObserver((list) => {
  for (const m of list) {
    for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
    // A page that redraws a date box's value without an input event (e.g. after saving) is caught here.
    if (m.type === 'attributes' && m.target.matches?.('input[type=date]')) paint(m.target);
  }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
// Language switched in place: repaint.
new MutationObserver(() => { for (const input of document.querySelectorAll('input[type=date]')) paint(input); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
