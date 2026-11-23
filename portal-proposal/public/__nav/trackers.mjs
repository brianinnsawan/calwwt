// Small helpers shared by the tracker pages. Everything is built with DOM calls (no HTML from data).
import { languageFor, whoAmI } from '/__nav/bar.mjs';
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'value') n.value = v; else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
  return n;
}
export async function me() {
  const asked = await whoAmI(); // the same request the navigation bar makes, not a second one
  if (!asked) return null;
  if (asked.status === 401) { location.href = '/sign-in.html'; return null; }
  return asked.body;
}
export const lang = (m) => languageFor(m);
export async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts, headers: { 'X-Requested-With': 'trackers', ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || body.message || `HTTP ${r.status}`);
  return body;
}
export function status(node, text, kind) { node.hidden = !text; node.textContent = text || ''; node.dataset.kind = kind || ''; }
/** Today in Thailand, YYYY-MM-DD. */
export const today = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
export function fmtDate(d, l) {
  if (!d) return '';
  if (d === '-') return '–';
  try { return new Date(`${d}T00:00:00Z`).toLocaleDateString(l === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch { return d; }
}

/** Builds an .xlsx in the browser (ExcelJS from /files/vendor/xlsx.mjs) and hands it to the person as a download. */
export async function downloadWorkbook(fill, filename) {
  const { ExcelJS } = await import('/files/vendor/xlsx.mjs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Caltex Wastewater 2027 (calwwt.sppwork.com)'; wb.created = new Date();
  await fill(wb, ExcelJS);
  const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob), a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
/** YYYY-MM-DD -> a Date Excel shows as that day (no time-zone shift). */
export const xlDate = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : null);
export const PROJECT = 'Design & Construction Caltex Nti Nkt Service Station';
export const CONTRACTOR = 'Supapon Construction & Service Co., Ltd.';
