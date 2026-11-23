// SPDX-License-Identifier: GPL-3.0-only
// Private-session helpers for the project site (calwwt.sppwork.com).
// Rewritten for this repository: the original module lived only in the old portal Worker's deployed files.
// - No offline copies: old service workers and Cache Storage are removed.
// - The session is re-checked every minute and when the tab comes back; when it ends, in-memory data is
//   cleared, the page is blanked and the person is sent to the sign-in page.
let ended = false;
const clearers = new Set();
export const privateSessionEnded = () => ended;
export function onPrivateClear(fn) { if (typeof fn === 'function') clearers.add(fn); }
function endSession() {
  if (ended) return;
  ended = true;
  for (const fn of clearers) { try { fn(); } catch { /* keep clearing */ } }
  try { document.body.replaceChildren(); } catch { /* page already gone */ }
  location.replace('/sign-in.html');
}
async function check() {
  if (ended) return;
  try {
    const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
    if (r.status === 401 || r.status === 403) endSession();
  } catch { /* offline: keep the page; the next check decides */ }
}
let installed = false;
export async function installPrivacy() {
  if (installed) return;
  installed = true;
  try { for (const reg of await navigator.serviceWorker?.getRegistrations?.() || []) await reg.unregister(); } catch { /* not available */ }
  try { for (const key of await globalThis.caches?.keys?.() || []) await caches.delete(key); } catch { /* not available */ }
  setInterval(check, 60_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  addEventListener('focus', check);
  addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
}
export function showPrivacyError(error) {
  const message = error?.message || 'This page could not be opened.';
  const box = document.createElement('div');
  box.className = 'version2-error';
  box.setAttribute('role', 'alert');
  const p = document.createElement('p'); p.textContent = message;
  const home = document.createElement('a'); home.href = '/project-home.html'; home.textContent = 'หน้าหลัก / Home';
  const sign = document.createElement('a'); sign.href = '/sign-in.html'; sign.textContent = 'เข้าสู่ระบบ / Sign in';
  box.append(p, home, document.createTextNode(' · '), sign);
  (document.getElementById('main') || document.body).replaceChildren(box);
}
