// One navigation bar for every page of calwwt.sppwork.com: Sites, Milestones, Files, Meetings, Tasks, Admin.
// Each person sees only the tabs their page access allows (Admin page); the server checks again on every request.
// No links leave this site.
const starts = (...prefixes) => (p) => prefixes.some((x) => p === x || p.startsWith(x + '/') || p.startsWith(x + '.'));
export const TABS = [
  { id: 'sites', href: '/sites/', pages: ['drawings'], en: 'Sites', th: 'สถานี', match: starts('/sites', '/drawing-changes', '/cad-workspace'),
    subs: [
      { href: '/sites/', pages: ['drawings'], en: 'All sites', th: 'สถานีทั้งหมด', match: (p) => p === '/sites/' || p === '/sites' || /^\/sites\/\d{4}(\/|$)/.test(p) },
      { href: '/sites/programme/', pages: ['drawings'], en: 'Programme', th: 'แผนงานรวม', match: starts('/sites/programme') },
      { href: '/drawing-changes/', pages: ['drawings'], en: 'Drawing changes', th: 'การเปลี่ยนแปลงแบบ', match: starts('/drawing-changes') },
      { href: '/cad-workspace/', pages: ['drawings'], en: 'CAD workspace', th: 'พื้นที่ทำงาน CAD', match: starts('/cad-workspace') },
    ] },
  { id: 'schedule', href: '/milestones/', pages: ['timeline'], en: 'Milestones', th: 'เหตุการณ์สำคัญ', match: starts('/milestones') },
  { id: 'files', href: '/files/', pages: ['files'], en: 'Files', th: 'ไฟล์', match: starts('/files') },
  { id: 'meetings', href: '/meetings/', pages: ['meetings'], en: 'Meetings', th: 'ประชุม', match: starts('/meetings') },
  { id: 'tasks', href: '/tasks.html', pages: ['tasks'], en: 'Tasks', th: 'งาน', match: starts('/tasks') },
  { id: 'admin', href: '/admin', admin: true, en: 'Admin', th: 'ผู้ดูแลระบบ', match: starts('/admin') },
];
const WORDS = { en: { account: 'Account', signOut: 'Sign out', menu: 'Project pages', toDark: 'Dark mode', toLight: 'Light mode', viewing: 'Viewing the site as {name} — view only. Nothing you do here is saved.', stop: 'Stop viewing' }, th: { account: 'บัญชี', signOut: 'ออกจากระบบ', menu: 'หน้าของโครงการ', toDark: 'โหมดมืด', toLight: 'โหมดสว่าง', viewing: 'กำลังดูเว็บไซต์ในมุมมองของ {name} — ดูอย่างเดียว ไม่มีการบันทึกใด ๆ', stop: 'หยุดดู' } };

// Light / dark mode for the whole site, remembered on this device. No choice = follow the computer's setting.
const THEME_KEY = 'calwwt.theme';
export function storedTheme() { try { const v = localStorage.getItem(THEME_KEY); return v === 'dark' || v === 'light' ? v : null; } catch { return null; } }
export function effectiveTheme() { return storedTheme() || (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
function applyTheme() {
  if (typeof document === 'undefined') return;
  const t = storedTheme();
  // Pages with their own light/dark/auto switch (the S-curve) keep their own attribute handling: press theirs.
  const own = document.querySelector(`button[data-theme-choice="${t || 'auto'}"]`);
  if (own) { if (own.getAttribute('aria-pressed') !== 'true') own.click(); syncFrames(); return; }
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  syncFrames();
}
// The Safety library's TCC view (same-site frame) has its own light/dark switch: keep it in step.
function syncFrames() {
  const want = effectiveTheme();
  for (const f of document.querySelectorAll('iframe')) {
    try {
      const d = f.contentDocument, btn = d?.getElementById('theme-toggle');
      if (btn && (d.documentElement.dataset.theme || 'dark') !== want) btn.click();
    } catch { /* not same-site */ }
  }
}
applyTheme();

/** Tabs this person may open, from /api/me (pages + accessView). */
const allowed = (me, t) => t.pages.some((p) => me?.pages?.[p] && me.pages[p] !== 'none');
export function tabsFor(me) {
  return TABS.filter((t) => (t.admin ? !!me?.accessView : allowed(me, t)));
}
/** Second-row links under a tab (e.g. Schedule: Plan & S-curve | Milestones), only those this person may open. */
export function subsFor(me, tab) {
  return (tab?.subs || []).filter((s) => allowed(me, s));
}
/** First page to open after sign-in: Tasks if allowed, else the first tab. */
export function landingFor(me) {
  const tabs = tabsFor(me);
  // Sites is everybody's home page (Brian, 25 Nov 2026); Tasks next; else the first tab they have.
  return (tabs.find((t) => t.id === 'sites') || tabs.find((t) => t.id === 'tasks') || tabs[0])?.href || '/account.html';
}

const langKey = (me) => `tasks.lang.${me?.person || ''}`;
export function languageFor(me) {
  try { const v = localStorage.getItem(langKey(me)); if (v === 'th' || v === 'en') return v; } catch { /* storage blocked */ }
  return me?.lang === 'en' ? 'en' : 'th';
}

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text) n.textContent = text;
  return n;
}

let shown = false;
// One "who am I" request per page, shared between this bar and the page's own code (site audit, 10 Nov 2026: most
// pages asked twice). Resolves to { status, ok, body } or null when the site could not be reached.
let asking = null;
export const whoAmI = () => (asking ||= fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' })
  .then(async (r) => ({ status: r.status, ok: r.ok, body: await r.json().catch(() => null) })).catch(() => null));
export async function showBar(meIn) {
  if (shown || typeof document === 'undefined') return;
  shown = true;
  let me = meIn;
  if (!me) {
    const asked = await whoAmI(); if (!asked?.ok || !asked.body) return; me = asked.body;
  }
  const lang = languageFor(me), w = WORDS[lang], path = location.pathname;
  if (!document.querySelector('link[data-cnb]')) document.head.append(el('link', { rel: 'stylesheet', href: '/__nav/bar.css', 'data-cnb': '' }));
  const bar = el('header', { class: 'cnb', role: 'banner' });
  const brand = el('a', { class: 'cnb-brand', href: landingFor(me), 'aria-label': 'Caltex 2027 Wastewater' });
  brand.append(el('span', { class: 'cnb-mark', 'aria-hidden': 'true' }, 'WW'), el('span', { class: 'cnb-name' }, 'Caltex Wastewater 2027'));
  const nav = el('nav', { class: 'cnb-tabs', 'aria-label': w.menu });
  for (const t of tabsFor(me)) {
    const a = el('a', { href: t.href, lang }, t[lang]);
    if (t.match(path)) a.setAttribute('aria-current', 'page');
    nav.append(a);
  }
  const right = el('div', { class: 'cnb-right' });
  const switcher = el('div', { class: 'cnb-lang', role: 'group', 'aria-label': 'Language / ภาษา' });
  for (const [k, label] of [['th', 'ไทย'], ['en', 'EN']]) {
    const b = el('button', { type: 'button', lang: k, 'aria-pressed': String(lang === k) }, label);
    b.addEventListener('click', () => { try { localStorage.setItem(langKey(me), k); } catch { /* ignore */ } location.reload(); });
    switcher.append(b);
  }
  const theme = el('button', { type: 'button', class: 'cnb-theme' });
  const paintTheme = () => { const dark = effectiveTheme() === 'dark'; theme.textContent = dark ? '☀' : '☾'; theme.setAttribute('aria-label', dark ? w.toLight : w.toDark); theme.title = dark ? w.toLight : w.toDark; };
  theme.addEventListener('click', () => { try { localStorage.setItem(THEME_KEY, effectiveTheme() === 'dark' ? 'light' : 'dark'); } catch { /* ignore */ } applyTheme(); paintTheme(); });
  paintTheme();
  const account = el('a', { class: 'cnb-account', href: '/account.html', title: w.account }, me?.viewAs ? (me.viewAs.byName || w.account) : (me?.name || w.account));
  const out = el('button', { type: 'button', class: 'cnb-out' }, w.signOut);
  out.addEventListener('click', async () => {
    try { await fetch('/api/local-auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Project-Auth': '1' }, body: '{}' }); } catch { /* ignore */ }
    location.href = '/sign-in.html';
  });
  right.append(theme, switcher, account, out);
  bar.append(brand, nav, right);
  const active = tabsFor(me).find((t) => t.match(path)), subs = subsFor(me, active);
  let subNav = null;
  if (subs.length > 1) {
    subNav = el('nav', { class: 'cnb-subs', 'aria-label': active[lang] });
    for (const sub of subs) {
      const a = el('a', { href: sub.href, lang }, sub[lang]);
      if (sub.match(path)) a.setAttribute('aria-current', 'page');
      subNav.append(a);
    }
  }
  if (me?.viewAs) {
    // Admin "View the site as": a clear strip and a way back.
    const strip = el('div', { class: 'cnb-viewas', role: 'status' });
    strip.append(el('span', {}, w.viewing.replace('{name}', me.viewAs.name)));
    const stop = el('button', { type: 'button' }, w.stop);
    stop.addEventListener('click', async () => {
      try { await fetch('/api/view-as', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tasks' }, body: JSON.stringify({ person: null }) }); } catch { /* ignore */ }
      location.href = '/admin';
    });
    strip.append(stop);
    document.body.prepend(strip);
  }
  if (subNav) document.body.prepend(subNav);
  document.body.prepend(bar);
  document.documentElement.classList.add('has-cnb');
  syncPageLanguage(lang);
  // Frames created later (e.g. switching to the TCC tab) follow the site theme once loaded.
  new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.tagName === 'IFRAME') n.addEventListener('load', syncFrames); }).observe(document.body, { childList: true, subtree: true });
  for (const f of document.querySelectorAll('iframe')) f.addEventListener('load', syncFrames);
}

// One language switch for the whole site: pages with their own switch follow the bar.
function syncPageLanguage(lang) {
  try { localStorage.setItem('calwwt-lang', lang); } catch { /* storage blocked */ }
  const own = document.querySelector(`button[data-lang="${lang}"], button[data-language="${lang}"]`);
  if (own && own.getAttribute('aria-pressed') !== 'true') own.click();
}

if (typeof document !== 'undefined' && document.currentScript === null && import.meta.url && !globalThis.CALNKT_BAR_MANUAL) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => showBar());
  else showBar();
}

// Dates in words next to every date box (date-words.mjs).
import('/__nav/date-words.mjs').catch(() => {});
