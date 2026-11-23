// Caltex 2027 wastewater task app (browser, copied from calnkt). All data and permissions come from /api/tasks/state;
// the server decides what each person may see and do. This file only renders and sends actions.
// Every visible string goes through L() (see i18n.js): English is the key, Thai is looked up.
'use strict';
import { L, I18N, setLang, storedLang, rememberLang, trMsg, MON, MONL, WD, areaTh, catTh, tagMatchesTh } from './i18n.js';

/* ================= basics ================= */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s).toLowerCase().replace(/[.\s_-]/g, '');
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const pad = (n) => String(n).padStart(2, '0');
const iso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
const d = (n) => { const x = new Date(TODAY); x.setDate(x.getDate() + n); return iso(x); };
const pd = (s) => { const p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const daysFrom = (s) => Math.round((pd(s) - TODAY) / 864e5);
const fmtD = (s) => { const x = pd(s); return `${WD()[x.getDay()]} ${x.getDate()} ${MON()[x.getMonth()]}`; };
const fmtS = (s) => { const x = pd(s); return `${x.getDate()} ${MON()[x.getMonth()]}`; };
const localDay = (at) => iso(new Date(at));
// Repeating tasks (5 Nov 2026): days are ISO numbers as digits, '1' = Monday … '7' = Sunday.
const DAY_NAME = (d) => WD()[Number(d) % 7];
function repeatLabel(days) {
  const ds = String(days || '');
  if (!ds) return '';
  if (ds === '1234567') return L('Every day');
  if (ds === '123456') return L('Every day except Sunday');
  if (ds === '12345') return L('Weekdays (Mon–Fri)');
  if (ds.length === 1) return L('Every {day}', { day: (I18N.lang === 'th' ? ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])[Number(ds) % 7] });
  return L('Repeats {days}', { days: [...ds].map(DAY_NAME).join(' ') });
}
// The day buttons; aria-pressed holds the choice (read back from the page when saving).
const dayChips = (id, days, act, ro = '') => `<div class="rep-days" id="${id}" role="group" aria-label="${L('Repeat on')}">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<button type="button" class="rep-day" data-act="${act}" data-d="${d}" aria-pressed="${String(days || '').includes(String(d))}" ${ro}>${esc(DAY_NAME(d))}</button>`).join('')}</div>`;
const chosenDays = (id) => [...document.querySelectorAll(`#${id} .rep-day[aria-pressed="true"]`)].map((b) => Number(b.dataset.d));
// The next date (today or later) that falls on one of the days.
const nextOn = (days) => { for (let n = 0; n < 7; n++) { const x = pd(d(n)); if (days.includes(((x.getDay() + 6) % 7) + 1)) return iso(x); } return null; };
// Years as people read them: Buddhist era on Thai screens (2569), as on the rest of the site (Brian, 3 Nov 2026).
const yr = (y) => (I18N.lang === 'th' ? y + 543 : y);
function dueLabel(s) { if (!s) return L('No date'); const n = daysFrom(s); if (n < -1) return L('{n} days late', { n: -n }); if (n === -1) return L('1 day late'); if (n === 0) return L('Today'); if (n === 1) return L('Tomorrow'); return fmtD(s); }
const dueCls = (s, status) => (!s || status === 'done' ? '' : daysFrom(s) < 0 ? 'over' : daysFrom(s) === 0 ? 'today' : '');
function ago(at) { const m = Math.round((Date.now() - new Date(at).getTime()) / 6e4); if (m < 1) return L('just now'); if (m < 60) return L('{n} min ago', { n: m }); const h = Math.round(m / 60); if (h < 24) return L('{n} h ago', { n: h }); const dd = Math.round(h / 24); if (dd < 7) return dd === 1 ? L('yesterday') : L('{n} days ago', { n: dd }); return fmtS(localDay(at)); }

const COMPANY = { spp: { name: 'SPP', c: '#1F5AA6' }, caltex: { name: 'Caltex', c: '#14806F' }, ks: { name: 'KS Consulting', c: '#6B4FA0' }, owner: { name: 'Land owner', c: '#4A7A2C' } };
const coLabel = (c) => (COMPANY[c] ? L(COMPANY[c].name) : c);
const AREA_COLORS = { building: '#4E79A7', office: '#8E6BBF', canopy: '#E07B39', fuel: '#C8463D', sign: '#C99A06', drainage: '#2E8FA3', electrical: '#6C8E2F', concrete: '#7D8793', misc: '#A0708A' };
const STATUS = { todo: 'Not started', doing: 'In progress', hold: 'On hold', review: 'Awaiting sign-off', done: 'Done' };
const PRIO = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' };
const LEVELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff', observer: 'Observer (view only)', team: 'Team member', partner: 'External partner' };
const RQ = { open: 'Waiting for reply', answered: 'Answered', closed: 'Closed' };
const stL = (k) => L(STATUS[k] || k), priL = (k) => L(PRIO[k] || k), lvlL = (k) => (LEVELS[k] ? L(LEVELS[k]) : k || ''), rqL = (k) => L(RQ[k] || k);
const LANGS = [['th', 'ไทย'], ['en', 'English']];

/* ================= state ================= */
let S = null; // server state
const loadUI = () => { try { const u = JSON.parse(localStorage.getItem('tasks.ui') || '{}'); if (u && 'code' in u) { delete u.code; localStorage.setItem('tasks.ui', JSON.stringify(u)); } return u; } catch { return {}; } };
const UI = Object.assign({ view: 'home', layout: 'side', groupBy: 'area', listSort: 'due', calMonth: null, calSel: null, f: { q: '', area: '', cat: '', person: '', mine: false }, hq: '', harea: '' }, loadUI());
Object.assign(UI, { pop: null, modal: null, confirm: null, reassign: false, editPerson: null, draft: null, busy: false });
// /admin opens the same app as the Admin page: people & logins, page access, task rules, change log.
const ADMIN = /^\/admin(\.html)?\/?$/.test(location.pathname);
const ADMIN_TABS = [['people', 'People & logins', 'team'], ['pages', 'Pages & access', 'list'], ['check', 'Check a person', 'home'], ['rules', 'Task rules', 'req'], ['signins', 'Sign-ins', 'hist'], ['backup', 'Backups', 'list'], ['chief', 'Chief (assistant)', 'team'], ['log', 'Change log', 'hist']];
let PREVIEW = null; // Admin → Check a person: last result from /api/tasks/admin/preview
if (!ADMIN_TABS.some(([k]) => k === UI.adminTab)) UI.adminTab = 'pages';
// The Team page was removed (Brian, 1 Nov 2026): people and access are on the Admin page, for admins only.
if (!['home', 'board', 'list', 'requests', 'calendar', 'timeline', 'history'].includes(UI.view)) UI.view = 'home';
// Site audit (10 Nov 2026): `code` (a setup or reset code on screen) is never stored, and one stored earlier is dropped on load.
const saveUI = () => { try { const { pop, modal, confirm, reassign, editPerson, draft, busy, backupBusy, backupProgress, notifEarlier, code, ...rest } = UI; localStorage.setItem('tasks.ui', JSON.stringify(rest)); } catch { /* storage unavailable */ } };
let openTask = null, openReq = null;
let STAGING = null; // test copy only: { enabled, me, viewAs, people }
let ACCOUNTS = null; // login status per person (admins/observers only), from /api/task-accounts/list
/** Language: this device's choice if the person changed it here, else their default from the server, else Thai. */
const applyLang = () => setLang(storedLang(S?.me?.id) || S?.me?.lang || 'th');
async function loadAccounts() {
  try { const r = await api('../task-accounts/list'); ACCOUNTS = new Map(r.accounts.map((a) => [a.personId, a])); }
  catch (e) { ACCOUNTS = new Map(); ACCOUNTS.error = e.status === 503 || e.status === 404 ? 'Logins are managed on the live site.' : e.message; }
  if (ADMIN && (UI.adminTab === 'people' || UI.adminTab === 'signins')) renderBody();
}
async function accountAct(path, body, okMsg) {
  if (UI.busy) return null; UI.busy = true;
  try { const r = await api(`../task-accounts/${path}`, body); if (okMsg) toast(okMsg); await loadAccounts(); return r; }
  catch (e) {
    if (e.message !== 'signed out') toast(trMsg(e.message), null, 'warn'); return null;
  }
  finally { UI.busy = false; wakeWaiters(); }
}

const T = (id) => S.tasks.find((t) => t.id === id);
const R = (id) => S.requests.find((r) => r.id === id);
const areaOf = (id) => { const a = S.areas.find((x) => x.id === id) || { id, name: id }; return { ...a, name: areaTh(id) || a.name, c: AREA_COLORS[id] || '#888' }; };
const catOf = (id) => { const c = S.categories.find((x) => x.id === id) || { id, name: id }; return { ...c, name: catTh(id) || c.name }; };
const person = (id) => S.people.find((p) => p.id === id);
const isMe = (p) => p && p.id === S.me.id;
const prog = (t) => (t.status === 'done' ? 100 : t.progress);
const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || ['urgent', 'high', 'normal', 'low'].indexOf(a.priority) - ['urgent', 'high', 'normal', 'low'].indexOf(b.priority);
const openTasks = () => S.tasks.filter((t) => t.status !== 'done');
const involves = (t, id) => [t.creator, t.lead, ...t.assignees].some((p) => p && p.id === id);

/* ================= server ================= */
/* Audit N04: admin changes need 2-step sign-in and the password confirmed in the last 15 minutes. The server answers
   CONFIRM_PASSWORD (ask for the password + code here, then retry once) or TWO_STEP_REQUIRED (send to the Account page). */
const GATE = /^(CONFIRM_PASSWORD|TWO_STEP_REQUIRED|SIGN_IN_AGAIN): /;
const gateMsg = (m) => String(m || '').replace(GATE, '');
async function gateFetch(url, init) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 403 || attempt > 0) return res;
    const msg = String((await res.clone().json().catch(() => ({}))).error || '');
    if (msg.startsWith('CONFIRM_PASSWORD') && await confirmIdentity()) continue;
    if (msg.startsWith('TWO_STEP_REQUIRED') && await siteConfirm(L('Admin changes need 2-step sign-in (a code from an app on your phone). Open your Account page to set it up now?'))) location.href = '/account.html#two-step';
    return res;
  }
}
// Eye buttons on password boxes (Brian, 3 Nov 2026): the shared helper also covers boxes added later, like this one.
import('/__identity/eye.mjs').catch(() => {});
// The site's own question box instead of the browser's confirm() (English "OK / Cancel" on many phones).
async function siteConfirm(text, opts = {}) {
  try { const { confirmBox } = await import('/__nav/ask.mjs'); return await confirmBox(text, opts); } catch { return confirm(text); }
}
function confirmIdentity() {
  return new Promise((resolve) => {
    const back = document.createElement('div'); back.className = 'modal-back'; back.style.zIndex = '120';
    const form = document.createElement('form'); form.className = 'modal'; form.setAttribute('role', 'dialog'); form.setAttribute('aria-modal', 'true'); form.style.maxWidth = '440px';
    form.innerHTML = `<h2>${L('Confirm it’s you')}</h2><p>${L('For safety, admin changes need your password again (once every 15 minutes).')}</p>
      <label>${L('Password')}<input type="password" name="password" autocomplete="current-password" required maxlength="128" style="width:100%"></label>
      <label class="gate-code" hidden>${L('6-digit code from your authenticator app')}<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="20" style="width:100%"></label>
      <p class="gate-err" role="alert" style="color:var(--bad,#C0392E);font-weight:600;min-height:1em;margin:0"></p>
      <div class="acts"><button type="button" class="btn ghost">${L('Cancel')}</button><button type="submit" class="btn primary">${L('Confirm')}</button></div>`;
    back.append(form); document.body.append(back);
    const done = (ok) => { back.remove(); resolve(ok); };
    form.querySelector('button[type=button]').onclick = () => done(false);
    form.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
    fetch('/api/local-auth/two-step', { credentials: 'same-origin' }).then((r) => r.json()).then((st) => { if (st.enabled) { const row = form.querySelector('.gate-code'); row.hidden = false; row.querySelector('input').required = true; } }).catch(() => {});
    form.querySelector('input').focus();
    form.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(form)), btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        const r = await fetch('/api/local-auth/confirm', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Project-Auth': '1' }, body: JSON.stringify(v) });
        if (r.ok) return done(true);
        form.querySelector('.gate-err').textContent = trMsg((await r.json().catch(() => ({}))).error || L('Something went wrong.'));
        form.querySelectorAll('input').forEach((i) => { i.value = ''; }); form.querySelector('input').focus();
      } finally { btn.disabled = false; }
    };
  });
}
async function api(path, body) {
  const res = await gateFetch(`/api/tasks/${path}`, body === undefined ? { credentials: 'same-origin' } : {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tasks' }, body: JSON.stringify(body),
  });
  if (res.status === 401) { location.href = `/sign-in.html?next=${encodeURIComponent(location.pathname)}`; throw new Error('signed out'); }
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) { const e = new Error(gateMsg(data.error) || 'Something went wrong.'); e.status = res.status; throw e; }
  return data;
}
// Checklist ticks still waiting to be saved (key: task id + step id -> ticked). Kept on screen whatever state arrives meanwhile.
const pendingTicks = new Map();
function setState(x) {
  S = x;
  for (const t of S.tasks) if (t.kind === 'followup' && t.title.startsWith('Follow up: ')) t.title = t.title.slice(11);
  for (const [k, done] of pendingTicks) { const [tid, iid] = k.split('\u0001'); const c = T(tid)?.checklist.find((i) => i.id === iid); if (c) c.done = done; }
}
async function reload() { setState(await api('state')); }
/** Send an action, show any warnings, reload and re-render. */
function setBusy(on) {
  document.body.classList.toggle('busy', on);
  for (const b of document.querySelectorAll('.modal button[type=submit], .quickadd button[type=submit]')) {
    if (on) { b.dataset.label = b.textContent; b.textContent = L('Saving…'); b.disabled = true; }
    else if (b.dataset.label) { b.textContent = b.dataset.label; b.disabled = false; }
  }
}
async function act(path, body, okMsg) {
  if (UI.busy) return null;
  UI.busy = true; setBusy(true);
  try {
    const res = await api(path, body);
    if (res.state) setState(res.state); else await reload();
    refresh();
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(res) : okMsg);
    for (const w of res.warnings || []) toast(trMsg(w), null, /can't|No one/.test(w) ? 'warn' : '');
    return res;
  } catch (e) {
    if (e.message !== 'signed out') {
      toast(trMsg(e.message), null, 'warn');
      if (e.status === 409) await reload();
      refresh();
    }
    return null;
  } finally { UI.busy = false; setBusy(false); wakeWaiters(); }
}
// Quick clicks in a row (Brian, 10 Nov 2026): act() ignores a click while another save is running (so a form is not sent
// twice), which dropped the second of two quick ticks and then unticked it on screen. Ticks and "done" buttons now wait
// their turn instead, in the order they were clicked, so every one is saved.
let waiters = [];
function wakeWaiters() { const w = waiters; waiters = []; for (const r of w) r(); }
async function inTurn(fn) { while (UI.busy) await new Promise((r) => waiters.push(r)); return fn(); }
function tickStep(t, el) {
  const id = t.id, itemId = el.dataset.c, done = el.checked, key = `${id}\u0001${itemId}`;
  pendingTicks.set(key, done);
  const c = t.checklist.find((i) => i.id === itemId); if (c) c.done = done;
  el.closest('.cl-i')?.classList.toggle('done', done);
  inTurn(() => act(`tasks/${encodeURIComponent(id)}`, { action: 'checklist_toggle', itemId, done, version: T(id)?.version })).then(async (res) => {
    if (pendingTicks.get(key) === done) pendingTicks.delete(key);
    if (!res) { try { await reload(); } catch { /* shown on the next refresh */ } refresh(); }
  });
}
const taskAct = (t, action, extra = {}, msg) => act(`tasks/${encodeURIComponent(t.id)}`, { action, version: t.version, ...extra }, msg);
const reqAct = (r, action, extra = {}, msg) => act(`requests/${encodeURIComponent(r.id)}`, { action, version: r.version, ...extra }, msg);

function toast(msg, undo, kind) {
  const el = document.createElement('div');
  el.className = `toast ${kind || ''}`; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${L('Undo')}</button>` : ''}`;
  if (undo) el.querySelector('button').onclick = () => { undo(); el.remove(); };
  $('#toasts').append(el);
  setTimeout(() => el.remove(), undo ? 7000 : 5200);
}

/* ================= icons ================= */
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>',
  req: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tl: '<path d="M3 5h9M7 11h11M5 17h8"/><path d="M3 21V3"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4M12 7v5l3 2"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.1 4.4 1.8 5 4.9"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', clist: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>', rep: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lt: '<path d="M15 5l-7 7 7 7"/>', gt: '<path d="M9 5l7 7-7 7"/>',
};
const ic = (k, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${I[k]}</svg>`;

/* ================= people display ================= */
const initials = (n) => { const c = String(n || '?').replace(/[^A-Za-z]/g, ''); return (c.slice(0, 1).toUpperCase() + c.slice(1, 2).toLowerCase()) || '?'; };
/** Names the server hides ("SPP project staff", "Caltex contact") are shown in the reader's language. */
function maskedName(name) {
  const s = String(name || '');
  if (s === 'SPP project staff') return L('SPP project staff');
  const m = /^(.+) contact$/.exec(s);
  if (m) { const co = Object.values(COMPANY).find((c) => c.name === m[1]); return L('{co} contact', { co: co ? L(co.name) : m[1] }); }
  return s;
}
const titleOf = (p) => (p?.title === 'SPP project staff' ? L('SPP project staff') : p?.title || '');
function av(p, cls = '') {
  if (!p) return '';
  if (p.masked || !p.id) return `<span class="av ${cls}" style="--c:var(--faint)" title="${esc(nm(p))}">?</span>`;
  return `<span class="av ${cls}" style="--c:${COMPANY[p.company]?.c || '#666'}" title="${esc(p.name + (titleOf(p) ? ' · ' + titleOf(p) : ''))}">${esc(initials(p.name))}</span>`;
}
const avs = (list) => `<span class="avs">${list.slice(0, 4).map((p) => av(p)).join('')}${list.length > 4 ? `<span class="av" style="--c:var(--faint)">+${list.length - 4}</span>` : ''}</span>`;
const nm = (p) => (p ? (p.masked || !p.id ? maskedName(p.name) : p.name) : L('Someone'));
const coName = (p) => (p ? (p.company === 'spp' ? 'SPP' : COMPANY[p.company] ? coLabel(p.company) : '') : '');
function mentions(text) {
  return esc(text).replace(/@([A-Za-z][\w.]*(?: project staff| contact)?)/g, (m, h) => {
    if (/project staff|contact$/.test(h)) return `<span class="mention">@${esc(maskedName(h))}</span>`;
    const p = findPerson(h); return p ? `<span class="mention">@${esc(p.name)}</span>` : m;
  });
}
function findPerson(h) { const k = norm(h); return S.people.find((p) => norm(p.name) === k || (p.aliases || []).some((a) => norm(a) === k)) || null; }
function kindBadge(t) {
  if (t.kind === 'followup') return `<span class="kb req">${L('Follow-up')}</span>`;
  const c = t.creator;
  if (c && c.company !== 'spp') return `<span class="kb from">${S.me.company === c.company ? L('Sent to SPP') : L('From {who}', { who: esc(COMPANY[c.company] ? coLabel(c.company) : nm(c)) })}</span>`;
  return '';
}

/* ================= render shell ================= */
function render() {
  hideMP();
  applyLang();
  document.body.className = `layout-${UI.layout}`;
  $('#app').innerHTML = `<header class="topbar" id="topbar"></header><div class="shell"><nav class="nav" id="nav" aria-label="${L('Views')}"></nav><main class="main" id="main"></main></div><div id="drawerWrap"></div><div id="modalWrap"></div>`;
  renderTop(); renderNav(); renderMain(); renderDrawer(); renderModal();
}
function refresh() {
  hideMP();
  const keep = (sel) => { const el = $(sel); return el ? [el.scrollLeft, el.scrollTop] : null; };
  const b = keep('.board'), dr = keep('.dr-body'), tl = keep('.tl-wrap');
  // Keep whatever the person is typing (and other unsaved text boxes) when the page redraws after a save.
  const typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.id
    ? { id: document.activeElement.id, start: document.activeElement.selectionStart, end: document.activeElement.selectionEnd } : null;
  const drafts = [...document.querySelectorAll('#dt-cm, #dt-cl, #dt-addass, #dt-addsh, #dt-reass, #dt-reason, #rq-msg, #qa')].filter((e) => e.value).map((e) => [e.id, e.value]);
  const unsaved = typing && ['dt-title', 'dt-desc'].includes(typing.id) ? [typing.id, document.activeElement.value] : null;
  renderTop(); renderNav(); renderMain(); renderDrawer(); renderModal();
  for (const [id, v] of drafts) { const e = document.getElementById(id); if (e && !e.value) e.value = v; }
  if (unsaved) { const e = document.getElementById(unsaved[0]); if (e && !e.disabled) e.value = unsaved[1]; }
  if (typing) { const e = document.getElementById(typing.id); if (e && !e.disabled) { e.focus(); try { e.setSelectionRange(typing.start, typing.end); } catch { /* date inputs */ } } }
  const put = (sel, v) => { const el = $(sel); if (el && v) { el.scrollLeft = v[0]; el.scrollTop = v[1]; } };
  put('.board', b); put('.dr-body', dr); put('.tl-wrap', tl);
}

function notifText(n) {
  const who = `<b>${esc(nm(n.from))}</b>`;
  const ref = n.taskId ? `<span class="mono">${esc(n.taskId)}</span>` : n.requestId ? `<span class="mono">${esc(n.requestId)}</span>` : '';
  const what = {
    assigned: '{who} assigned you {ref}', mentioned: '{who} mentioned you {ref}', commented: '{who} commented on {ref}', shared: '{who} shared a task with you {ref}', signoff: '{who} asked you to sign off {ref}',
    closed: '{who} closed {ref}', returned: '{who} sent this back to you {ref}', reopened: '{who} reopened {ref}', handoff_to_you: '{who} handed you {ref}', handoff: '{who} handed this to {person}: {ref}',
    due_today: 'Due today: {ref}', request_new: '{who} sent you a request {ref}', request_answered: '{who} answered your request {ref}', request_reply: '{who} replied on {ref}', request_closed: '{who} closed the request {ref}', request_reopened: '{who} reopened the request {ref}',
    upline: { created: '{who} created {ref}', submitted: '{who} sent for sign-off {ref}', closed: '{who} closed {ref}', handoff: '{who} handed off {ref}', commented: '{who} commented on {ref}', request: '{who} sent a request {ref}' }[n.data?.what] || '{who} updated {ref}',
  }[n.kind] || '{who} updated {ref}';
  return `${L(what, { who, ref, person: esc(nm(n.data?.person)) })}${n.data?.safety ? ` <span class="pri pri-urgent">${L('Safety')}</span>` : ''}`;
}

function renderTop() {
  const me = S.me, notes = S.notifications, unread = notes.filter((n) => !n.read).length;
  const role = lvlL(me.level);
  $('#topbar').innerHTML = `
  <div class="tb-brand"><div class="tb-title"><b>${ADMIN ? L('Admin') : L('Tasks')}</b><span>${ADMIN ? L('Admin · who can see and change what') : L('Caltex 2027 wastewater · 8 sites · Tasks')}</span></div></div>
  <div class="tb-cell"><span>${L('Job')}</span><b>CAL WWT 2027</b></div>
  <div class="tb-cell"><span>${L('Today')}</span><b>${fmtD(iso(TODAY))}</b></div>
  <div class="tb-spacer"></div>
  <div class="tb-actions">
    ${!ADMIN && me.can.create ? `<button class="btn primary" data-act="new" title="${L('New task')}">${ic('plus')}<span class="lbl">${L('New task')}</span></button>` : ''}
    <div class="pop-root"><button class="icon-btn" data-act="pop" data-p="bell" aria-label="${L('Notifications')}" title="${L('Notifications')}">${ic('bell')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
      ${UI.pop === 'bell' ? `<div class="pop"><div class="pop-h"><b>${L('Notifications')}</b>${unread ? `<button class="btn sm ghost" data-act="readAll">${L('Mark all read')}</button>` : ''}</div>
      ${(() => {
        // Brian, 2 Nov 2026: read notices leave the list; "Show earlier" brings them back.
        const earlier = notes.filter((n) => n.read).length, shown = (UI.notifEarlier ? notes : notes.filter((n) => !n.read)).slice(0, 40);
        const list = shown.length ? shown.map((n) => `<button class="notif ${n.read ? '' : 'unread'}" data-act="notif" data-n="${n.id}">${av(n.from)}<span><span class="t">${notifText(n)}</span><br><span class="t">${esc(n.title)}</span><br><small>${ago(n.at)}</small></span></button>`).join('')
          : `<div class="pop-sec muted">${notes.length ? L('No new notifications.') : L('Nothing yet. You will be told here when someone assigns you, @mentions you or asks for your sign-off.')}</div>`;
        return list + (earlier ? `<div class="pop-sec" style="padding-top:6px;padding-bottom:8px"><button class="btn sm ghost" data-act="notifEarlier">${UI.notifEarlier ? L('Hide earlier') : L('Show earlier ({n})', { n: earlier })}</button></div>` : '');
      })()}</div>` : ''}
    </div>
    <div class="pop-root"><button class="me-btn" data-act="pop" data-p="user" aria-label="${L('Account menu')}">${av(me, 'lg')}<span class="who"><b>${esc(me.name)}</b><small>${esc(role)}</small></span></button>
      ${UI.pop === 'user' ? `<div class="pop">
        <div class="pop-sec" style="display:flex;gap:10px;align-items:center">${av(me, 'lg')}<div><b>${esc(me.name)}</b>${titleOf(me) ? ` <span class="muted">· ${esc(titleOf(me))}</span>` : ''}<div class="muted" style="font-size:12.5px">${esc(coName(me))} · ${esc(role)}</div></div></div>
        <div class="pop-sec pop-prefs">
          <div><div class="eyebrow" style="margin-bottom:6px">${L('Language')}</div><div class="seg" role="group" aria-label="${L('Language')}">${LANGS.map(([k, l]) => `<button lang="${k}" class="${I18N.lang === k ? 'on' : ''}" data-act="lang" data-v="${k}" aria-pressed="${I18N.lang === k}">${l}</button>`).join('')}</div></div>
          <div><div class="eyebrow" style="margin-bottom:6px">${L('Layout')}</div><div class="seg" role="group" aria-label="${L('Layout')}"><button class="${UI.layout === 'side' ? 'on' : ''}" data-act="layout" data-v="side">${L('Side menu')}</button><button class="${UI.layout === 'top' ? 'on' : ''}" data-act="layout" data-v="top">${L('Top tabs')}</button></div></div>
        </div>
        <div class="pop-sec" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="/account.html">${L('My account')}</a><button class="btn sm" data-act="signout">${L('Sign out')}</button></div>
      </div>` : ''}
    </div>
  </div>`;
}

const NAV = [['home', 'My work', 'home'], ['board', 'Board', 'board'], ['list', 'List', 'list'], ['requests', 'Requests', 'req'], ['calendar', 'Calendar', 'cal'], ['timeline', 'Timeline', 'tl'], ['history', 'History', 'hist']];
function renderNav() {
  if (ADMIN) {
    $('#nav').innerHTML = `<div class="navlbl">${L('Admin')}</div>${ADMIN_TABS.filter(([k]) => (k !== 'backup' || S.me?.can?.admin) && (k !== 'chief' || AGENT?.ok)).map(([k, l, i]) => `<button class="${UI.adminTab === k ? 'on' : ''}" data-act="adminTab" data-v="${k}">${ic(i)}<span>${L(l)}</span></button>`).join('')}
    <div class="nav-foot">${L('Signed in as <b>{name}</b>', { name: esc(S.me.name) })}<br>${esc(coName(S.me))}</div>`;
    return;
  }
  const open = openTasks();
  const cnt = { home: open.filter((t) => t.assignees.some(isMe)).length, board: open.length, list: open.length, requests: S.requests.filter((r) => r.status !== 'closed').length, history: S.tasks.length - open.length };
  $('#nav').innerHTML = `<div class="navlbl">${L('Workspace')}</div>${NAV.map(([k, l, i]) => `<button class="${UI.view === k ? 'on' : ''}" data-act="view" data-v="${k}">${ic(i)}<span>${L(l)}</span>${cnt[k] != null ? `<span class="cnt">${cnt[k]}</span>` : ''}</button>`).join('')}
  <div class="nav-foot">${L('Signed in as <b>{name}</b>', { name: esc(S.me.name) })}<br>${esc(coName(S.me))}</div>`;
}

/* ================= filters ================= */
function filtered(list) {
  const f = UI.f, q = f.q.trim().toLowerCase();
  return list.filter((t) => {
    if (f.area && t.area !== f.area) return false;
    if (f.cat && t.category !== f.cat) return false;
    if (f.person && !t.assignees.some((p) => p.id === f.person)) return false;
    if (f.mine && !involves(t, S.me.id)) return false;
    if (q) { const hay = `${t.id} ${t.title} ${t.description} ${t.assignees.map(nm).join(' ')} ${nm(t.creator)} ${S.areas.find((a) => a.id === t.area)?.name || ''} ${areaOf(t.area).name} ${S.categories.find((c) => c.id === t.category)?.name || ''} ${catOf(t.category).name}`.toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
}
function filterBar() {
  const f = UI.f;
  const ppl = [...new Map(S.tasks.flatMap((t) => t.assignees).filter((p) => p.id).map((p) => [p.id, p])).values()].sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="filters">
    <label class="search">${ic('search')}<input type="search" id="f-q" data-input="fq" placeholder="${L('Search tasks, IDs, people')}" value="${esc(f.q)}" aria-label="${L('Search')}"></label>
    <select id="f-area" data-change="filt" data-k="area" aria-label="${L('Area')}"><option value="">${L('All areas')}</option>${S.areas.map((a) => `<option value="${esc(a.id)}" ${f.area === a.id ? 'selected' : ''}>${esc(areaOf(a.id).name)}</option>`).join('')}</select>
    <select id="f-cat" data-change="filt" data-k="cat" aria-label="${L('Bucket')}"><option value="">${L('All buckets')}</option>${S.categories.map((c) => `<option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(catOf(c.id).name)}</option>`).join('')}</select>
    <select id="f-person" data-change="filt" data-k="person" aria-label="${L('Person')}"><option value="">${L('Everyone')}</option>${ppl.map((p) => `<option value="${esc(p.id)}" ${f.person === p.id ? 'selected' : ''}>${esc(p.name)} (${esc(coName(p))})</option>`).join('')}</select>
    <label class="inline"><input type="checkbox" id="f-mine" data-change="fmine" ${f.mine ? 'checked' : ''}> ${L('Only mine')}</label>
    <button class="btn sm ghost" id="f-clear" data-act="clearF" ${f.q || f.area || f.cat || f.person || f.mine ? '' : 'hidden'}>${L('Clear filters')}</button>
  </div>`;
}

/* ================= main ================= */
function renderMain() {
  if (ADMIN) { $('#main').innerHTML = (S.me.level === 'observer' ? `<div class="demo-bar"><span>${L('<b>View only.</b> You can look at everything but cannot change anything.')}</span></div>` : '') + '<div id="vbody"></div>'; renderBody(); return; }
  const v = UI.view; let head = '', showF = false;
  if (v === 'board') {
    showF = true;
    head = `<div class="view-head"><div><h1>${L('Board')}</h1><p>${L('Planner-style columns. Drag a card to another column to re-file it, or tick the circle to finish it.')}</p></div>
    <div class="seg" role="group" aria-label="${L('Group by')}">${[['area', 'Area'], ['cat', 'Bucket'], ['person', 'Person'], ['creator', 'Creator'], ['status', 'Status'], ['prio', 'Priority']].map(([k, l]) => `<button class="${UI.groupBy === k ? 'on' : ''}" data-act="groupBy" data-v="${k}">${L(l)}</button>`).join('')}</div></div>`;
  } else if (v === 'list') {
    showF = true;
    head = `<div class="view-head"><div><h1>${L('List')}</h1><p>${L('Type a task. <b>@name</b> assigns it, <b>#area</b> or <b>#bucket</b> files it, <b>!high</b> sets priority, <b>due 5/11</b> sets the date.')}</p></div>
    <div class="seg" role="group" aria-label="${L('Sort')}">${[['due', 'By due date'], ['created', 'Newest first'], ['area', 'By area'], ['creator', 'By creator']].map(([k, l]) => `<button class="${UI.listSort === k ? 'on' : ''}" data-act="listSort" data-v="${k}">${L(l)}</button>`).join('')}</div>
    ${S.me.can.create ? `<form class="quickadd" data-form="quick"><input type="text" id="qa" data-mention="text" autocomplete="off" placeholder="${L('Add a task… e.g. Fix hoarding gate @Por #misc !high')}" aria-label="${L('Add a task')}"><button class="btn primary" type="submit">${L('Add')}</button></form>` : ''}</div>
    <div class="qa-prev" id="qaPrev"></div>`;
  } else if (v === 'calendar') {
    showF = true; head = `<div class="view-head"><div><h1>${L('Calendar')}</h1><p>${L('Every open task you can see, on its due date. Pick a day to list its tasks.')}</p></div></div>`;
  } else if (v === 'timeline') {
    showF = true; head = `<div class="view-head"><div><h1>${L('Timeline')}</h1><p>${L('Start to due date for each task, grouped by area. The yellow line is today; a red outline means late.')}</p></div></div>`;
  }
  $('#main').innerHTML = stagingBar() + (S.me.level === 'observer' ? `<div class="demo-bar"><span>${L('<b>View only.</b> You can look at everything but cannot change anything.')}</span></div>` : '') + head + (showF ? filterBar() : '') + '<div id="vbody"></div>';
  renderBody();
}
function renderBody() {
  const el = $('#vbody'); if (!el) return;
  if (ADMIN) { el.innerHTML = viewAdmin(); return; }
  const fc = $('#f-clear'); if (fc) { const f = UI.f; fc.hidden = !(f.q || f.area || f.cat || f.person || f.mine); }
  const open = filtered(openTasks());
  const v = UI.view;
  el.innerHTML = v === 'home' ? viewHome() : v === 'board' ? viewBoard(open) : v === 'list' ? viewList(open) : v === 'requests' ? viewReq() : v === 'calendar' ? viewCal(open) : v === 'timeline' ? viewTL(open) : v === 'history' ? viewHist() : viewHome();
}

function stagingBar() {
  if (!STAGING?.enabled) return '';
  const groups = ['spp', 'caltex', 'ks', 'owner'];
  return `<div class="demo-bar"><span><b>${L('Test copy.')}</b> ${STAGING.viewAs ? L('Viewing as <b>{name}</b>. Everything you do now is done as {name}.', { name: esc(S.me.name) }) : L('View the app as anyone to check what they see.')}</span>
    <span style="display:flex;gap:6px;align-items:center"><label for="viewas" class="muted" style="font-size:13px;white-space:nowrap">${L('View as')}</label><select id="viewas" data-change="viewAs" style="width:auto;max-width:100%">
    <option value="">${L('Myself ({name})', { name: esc(STAGING.people.find((p) => p.id === STAGING.me)?.name || '') })}</option>
    ${groups.map((c) => `<optgroup label="${esc(coLabel(c))}">${STAGING.people.filter((p) => p.company === c && p.id !== STAGING.me).map((p) => `<option value="${esc(p.id)}" ${STAGING.viewAs === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(lvlL(p.level))}</option>`).join('')}</optgroup>`).join('')}
    </select></span></div>`;
}

/* ---------- shared pieces ---------- */
function chk(t) {
  const cls = t.status === 'done' ? 'done' : t.status === 'review' ? 'review' : '';
  if (!t.can.edit && !t.can.close) return `<span class="chk ${cls}">${ic('check')}</span>`;
  const lbl = t.can.close ? L('Mark complete') : L('Send for sign-off');
  return `<button class="chk ${cls}" data-act="complete" data-id="${esc(t.id)}" title="${t.status === 'review' ? stL('review') : lbl}" aria-label="${lbl}">${ic('check')}</button>`;
}
function card(t) {
  const pg = prog(t), a = areaOf(t.area), cd = t.checklist.filter((c) => c.done).length;
  const tag = UI.groupBy === 'area' ? `<span class="tag" style="--c:var(--line-2)">${esc(catOf(t.category).name)}</span>` : `<span class="tag" style="--c:${a.c}">${esc(a.name)}</span>`;
  return `<article class="card" ${t.can.edit ? 'draggable="true"' : ''} data-act="open" data-id="${esc(t.id)}">
    <div class="card-top">${tag}<span>${kindBadge(t)} ${t.priority !== 'normal' ? `<span class="pri pri-${t.priority}">${priL(t.priority)}</span>` : ''}${t.status === 'hold' || t.status === 'review' ? ` <span class="pill st-${t.status}">${stL(t.status)}</span>` : ''}</span></div>
    <div class="card-title">${chk(t)}<span>${esc(t.title)}</span></div>
    ${pg > 0 ? `<div class="card-prog"><div class="bar ${pg === 100 ? 'ok' : ''}"><i style="width:${pg}%"></i></div><span>${pg}%</span></div>` : ''}
    <div class="card-meta"><span class="due ${dueCls(t.due, t.status)}">${dueLabel(t.due)}</span>
      ${t.checklist.length ? `<span class="meta-i">${ic('clist')}${cd}/${t.checklist.length}</span>` : ''}
      ${t.comments.length ? `<span class="meta-i">${ic('chat')}${t.comments.length}</span>` : ''}
      ${t.repeatDays ? `<span class="meta-i" title="${esc(repeatLabel(t.repeatDays))}">${ic('rep')}</span>` : ''}
      <span class="meta-i card-by" title="${L('Created by {who}', { who: esc(nm(t.creator)) })}">${L('by {name}', { name: esc(nm(t.creator)) })}</span>
      ${avs(t.assignees)}</div></article>`;
}
function row(t) {
  const pg = prog(t), a = areaOf(t.area);
  return `<div class="row" data-act="open" data-id="${esc(t.id)}">${chk(t)}
    <div style="min-width:0"><div class="row-title">${esc(t.title)}</div><div class="row-sub"><span class="mono">${esc(t.id)}</span>${kindBadge(t)}<span class="tag" style="--c:${a.c}">${esc(a.name)}</span><span>${esc(catOf(t.category).name)}</span><span class="row-by" title="${L('Created by {who}', { who: esc(nm(t.creator)) })}">${L('by {name}', { name: esc(nm(t.creator)) })}</span>${t.status !== 'todo' ? `<span class="pill st-${t.status}">${stL(t.status)}</span>` : ''}${t.priority !== 'normal' ? `<span class="pri pri-${t.priority}">${priL(t.priority)}</span>` : ''}</div></div>
    <div class="row-prog">${pg > 0 ? `<div class="card-prog"><div class="bar ${pg === 100 ? 'ok' : ''}"><i style="width:${pg}%"></i></div><span>${pg}%</span></div>` : ''}</div>
    <div class="row-who">${avs(t.assignees)}</div>
    <div class="due ${dueCls(t.due, t.status)}">${dueLabel(t.due)}</div></div>`;
}
function reqRow(r) {
  const other = S.me.company === 'spp' ? r.recipient : r.sender;
  return `<div class="row" data-act="openReq" data-id="${esc(r.id)}"><span class="chk ${r.status === 'closed' ? 'done' : r.status === 'answered' ? 'review' : ''}">${ic('check')}</span>
    <div style="min-width:0"><div class="row-title">${esc(r.title)}</div><div class="row-sub"><span class="mono">${esc(r.id)}</span><span class="kb ${S.me.company === 'spp' ? 'req' : 'from'}">${S.me.company === 'spp' ? L('To {name} · {co}', { name: esc(nm(r.recipient)), co: esc(coName(r.recipient)) }) : L('From {name} · SPP', { name: esc(nm(r.sender)) })}</span><span>${L('by {name} · {when}', { name: esc(nm(r.sender)), when: ago(r.createdAt) })}</span><span class="pill ${r.status === 'answered' ? 'st-review' : r.status === 'closed' ? 'st-done' : 'st-doing'}">${rqL(r.status)}</span>${r.messages.length ? `<span class="meta-i">${ic('chat')}${r.messages.length}</span>` : ''}</div></div>
    <div class="row-prog"></div><div class="row-who">${av(other)}</div><div class="due ${dueCls(r.due, r.status === 'closed' ? 'done' : '')}">${dueLabel(r.due)}</div></div>`;
}

/* ---------- home ---------- */
function viewHome() {
  const me = S.me, open = openTasks();
  const mine = open.filter((t) => t.assignees.some(isMe)).sort(byDue);
  const over = mine.filter((t) => t.due && daysFrom(t.due) < 0);
  const sign = open.filter((t) => t.status === 'review' && t.can.close);
  const waiting = open.filter((t) => t.creator?.id === me.id && !t.assignees.some(isMe)).sort(byDue);
  const reqWaiting = S.requests.filter((r) => r.status !== 'closed' && (me.company === 'spp' ? r.sender?.id === me.id : true));
  const hr = new Date().getHours(), greet = hr < 12 ? L('Good morning') : hr < 17 ? L('Good afternoon') : L('Good evening');
  const crew = (me.crew || []).map(person).filter(Boolean);
  const teamPanel = crew.length ? `<div class="panel"><h2>${L('Your team')} <small>${L('People who report to you')}</small></h2><div class="feed">${crew.map((x) => { const ts = open.filter((t) => t.assignees.some((p) => p.id === x.id)); const od = ts.filter((t) => t.due && daysFrom(t.due) < 0).length; const rv = ts.filter((t) => t.status === 'review').length; return `<div class="feed-i" data-act="goPerson" data-u="${esc(x.id)}">${av(x)}<div style="flex:1;min-width:0"><b>${esc(x.name)}</b><small>${L('{n} open', { n: ts.length })}${od ? ` · <span style="color:var(--bad)">${L('{n} late', { n: od })}</span>` : ''}${rv ? ` · ${L('{n} awaiting sign-off', { n: rv })}` : ''}</small></div></div>`; }).join('')}</div></div>` : '';
  // Daily summary for admins/managers (in-app only)
  let digest = '';
  if (me.can.closeAny) {
    const closedToday = S.tasks.filter((t) => t.closedAt && localDay(t.closedAt) === iso(TODAY));
    const overdue = open.filter((t) => t.due && daysFrom(t.due) < 0);
    const upcoming = open.filter((t) => t.due && daysFrom(t.due) >= 0 && daysFrom(t.due) <= 3);
    digest = `<div class="panel"><h2>${L('Today’s summary')} <small>${L('Whole project')}</small></h2><div class="feed">
      ${[['Closed today', closedToday.length, 'history'], ['Awaiting sign-off', open.filter((t) => t.status === 'review').length, 'list'], ['Overdue', overdue.length, 'list'], ['Due in the next 3 days', upcoming.length, 'list']].map(([l, n, v]) => `<div class="feed-i" data-act="view" data-v="${v}"><b style="font-family:var(--f-display);font-size:22px;min-width:34px">${n}</b><div style="align-self:center">${L(l)}</div></div>`).join('')}</div></div>`;
  }
  const quote = (s) => `“${s.slice(0, 70)}${s.length > 70 ? '…' : ''}”`;
  const feed = S.tasks.flatMap((t) => [...t.history.filter((h) => h.kind !== 'commented').map((h) => ({ t, by: h.by, at: h.at, text: histText(h) })), ...t.comments.map((c) => ({ t, by: c.by, at: c.at, text: L('commented: {text}', { text: quote(c.body) }) }))]).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 9);
  const areas = S.areas.map((a) => { const ts = S.tasks.filter((t) => t.area === a.id); const pct = ts.length ? Math.round(ts.reduce((s, t) => s + prog(t), 0) / ts.length) : 0; return { a: areaOf(a.id), ts, pct, done: ts.filter((t) => t.status === 'done').length }; }).filter((x) => x.ts.length);
  return `<div class="view-head"><div><div class="eyebrow">${fmtD(iso(TODAY))} ${yr(TODAY.getFullYear())}</div><h1>${L('{greet}, {name}', { greet, name: esc(me.name) })}</h1><p>${me.can.seesAll ? L('You can see every task on the project.') : L('Your tasks, plus the work you are allowed to follow.')}</p></div></div>
  <div class="stats">
    <button class="stat" data-act="goMine"><b>${mine.length}</b><span>${L('Assigned to you')}</span></button>
    <button class="stat ${over.length ? 'bad' : ''}" data-act="goMine"><b>${over.length}</b><span>${L('Of yours overdue')}</span></button>
    <button class="stat ${sign.length ? 'rev' : ''}" data-act="scrollSign"><b>${sign.length}</b><span>${L('Waiting for your sign-off')}</span></button>
    <button class="stat" data-act="view" data-v="requests"><b>${reqWaiting.length}</b><span>${me.company === 'spp' ? L('Your open requests') : L('Open requests')}</span></button>
  </div>
  <div class="home-grid"><div>
    ${sign.length ? `<div class="panel" id="signPanel"><h2>${L('Needs your sign-off')} <small>${sign.length}</small></h2><div>${sign.map(signRow).join('')}</div></div>` : ''}
    <div class="panel"><h2>${L('Assigned to you')} <small>${L('{n} open', { n: mine.length })}</small></h2>${mine.length ? `<div>${mine.slice(0, 12).map(row).join('')}</div>` : `<div class="empty" style="margin:12px;border-radius:6px">${L('Nothing assigned to you right now.')}</div>`}</div>
    <div class="panel"><h2>${L('You’re waiting on')} <small>${L('Tasks you gave others')}</small></h2>${waiting.length ? `<div>${waiting.slice(0, 8).map(row).join('')}</div>` : `<div class="empty" style="margin:12px;border-radius:6px">${L('Tasks you hand to other people show up here.')}</div>`}</div>
  </div><div>
    ${digest}${teamPanel}
    <div class="panel"><h2>${L('Progress by area')} <small>${L('Tasks you can see')}</small></h2><div style="padding:6px 0">${areas.map((x) => `<div class="area-row"><span class="tag" style="--c:${x.a.c}">${esc(x.a.name)}</span><div class="bar ${x.pct === 100 ? 'ok' : ''}"><i style="width:${x.pct}%"></i></div><span class="n">${x.done}/${x.ts.length} · ${x.pct}%</span></div>`).join('') || `<div class="empty" style="margin:12px">${L('No tasks yet.')}</div>`}</div></div>
    <div class="panel"><h2>${L('Recent activity')}</h2><div class="feed">${feed.map((f) => `<div class="feed-i" data-act="open" data-id="${esc(f.t.id)}">${av(f.by)}<div style="min-width:0"><b>${esc(nm(f.by))}</b> ${esc(f.text)}<small><span class="mono">${esc(f.t.id)}</span> · ${esc(f.t.title)} · ${ago(f.at)}</small></div></div>`).join('') || `<div class="empty" style="margin:12px">${L('No activity yet.')}</div>`}</div></div>
  </div></div>`;
}
function signRow(t) { return `<div class="row" data-act="open" data-id="${esc(t.id)}"><span class="chk review">${ic('check')}</span><div style="min-width:0"><div class="row-title">${esc(t.title)}</div><div class="row-sub"><span class="mono">${esc(t.id)}</span><span>${L('Sent by {names}', { names: esc(t.assignees.map(nm).join(', ')) })}</span></div></div><div class="row-prog"></div><div class="row-who">${S.me.level !== 'observer' ? `<button class="btn sm ok" data-act="approve" data-id="${esc(t.id)}">${L('Approve & close')}</button>` : ''}</div><div class="due ${dueCls(t.due)}">${dueLabel(t.due)}</div></div>`; }
const FIELD_NAMES = { title: 'title', description: 'details', area: 'area', category: 'bucket', priority: 'priority', status: 'status', progress: 'progress', repeat: 'repeat', start_date: 'start', due_date: 'due date', followup_date: 'follow-up date', auto_progress: 'progress mode' };
/** Activity text, shown after the person's name. Plain text (callers escape it). "via Chief" reaches only the person
 *  Chief acted for (the server leaves it out for everyone else). */
function histText(h) { const t0 = histText0(h); return h.via ? `${t0} · ${L('via Chief')}` : t0; }
function histText0(h) {
  const p = h.person ? nm(h.person) : '';
  const q = (s) => `“${s || ''}”`;
  const k = h.kind;
  if (k === 'created') return h.repeatOf ? (h.scheduled ? L('repeating task: new copy after {id}', { id: h.repeatOf }) : L('created this week’s copy of {id}', { id: h.repeatOf })) : h.request ? L('created the follow-up for {id}', { id: h.request }) : L('created the task');
  if (k === 'updated') return L('changed {fields}', { fields: (h.fields || []).map((f) => (FIELD_NAMES[f] ? L(FIELD_NAMES[f]) : f)).join(', ') });
  if (k === 'returned') return h.reason ? L('sent it back: {reason}', { reason: q(h.reason) }) : L('sent it back');
  const tpl = { progress: 'set progress to {v}%', checklist_add: 'added {text}', checklist_done: 'ticked {text}', checklist_undone: 'unticked {text}', checklist_delete: 'removed {text}',
    commented: 'commented', assigned: 'assigned {p}', unassigned: 'removed {p}', lead: 'made {p} the lead', handoff: 'handed the task to {p}', shared: 'shared the task with {p}', unshared: 'stopped sharing with {p}',
    submitted: 'sent for sign-off', closed: 'closed the task', reopened: 'reopened it: {reason}', deleted: 'deleted the task',
    request_sent: 'sent the request to {to}', request_answered: 'marked it answered', request_closed: 'closed the request', request_reopened: 'reopened the request' }[k];
  return tpl ? L(tpl, { v: h.value, text: q(h.text), p, reason: q(h.reason), to: h.to ? nm(h.to) : '' }) : k;
}

/* ---------- board ---------- */
const creatorKey = (t) => (t.creator?.id && !t.creator.masked ? t.creator.id : `~${nm(t.creator)}`);
function creatorGroups(tasks) {
  const m = new Map();
  for (const t of tasks) { const k = creatorKey(t); if (!m.has(k)) m.set(k, { key: k, person: t.creator?.id && !t.creator.masked ? t.creator : null, name: nm(t.creator) + (t.creator && isMe(t.creator) ? ` ${L('(you)')}` : ''), items: [] }); m.get(k).items.push(t); }
  return [...m.values()].sort((a, b) => (a.person && isMe(a.person) ? -1 : b.person && isMe(b.person) ? 1 : 0) || a.name.localeCompare(b.name));
}
function boardCols(g, tasks) {
  if (g === 'area') return S.areas.map((a) => ({ key: a.id, name: areaOf(a.id).name, c: areaOf(a.id).c, items: tasks.filter((t) => t.area === a.id) }));
  if (g === 'cat') return S.categories.filter((c) => !c.archived).map((c) => ({ key: c.id, name: catOf(c.id).name, items: tasks.filter((t) => t.category === c.id) }));
  if (g === 'status') return ['todo', 'doing', 'hold', 'review'].map((s) => ({ key: s, name: stL(s), c: `var(--${{ todo: 'faint', doing: 'info', hold: 'warn', review: 'rev' }[s]})`, items: tasks.filter((t) => t.status === s) }));
  if (g === 'prio') return ['urgent', 'high', 'normal', 'low'].map((s) => ({ key: s, name: priL(s), c: `var(--${{ urgent: 'bad', high: 'warn', normal: 'info', low: 'faint' }[s]})`, items: tasks.filter((t) => t.priority === s) }));
  // Brian, 2 Nov 2026: group by who created the task. Creators hidden from this person stay hidden (masked name).
  if (g === 'creator') return creatorGroups(tasks).map((x) => ({ key: `by:${x.key}`, name: x.name, person: x.person, items: x.items, noAdd: true }));
  const ppl = [...new Map(tasks.flatMap((t) => t.assignees).filter((p) => p.id).map((p) => [p.id, p])).values()].sort((a, b) => (isMe(a) ? -1 : isMe(b) ? 1 : 0) || a.company.localeCompare(b.company) || a.name.localeCompare(b.name));
  const cols = ppl.map((p) => ({ key: p.id, name: p.name + (isMe(p) ? ` ${L('(you)')}` : ''), person: p, items: tasks.filter((t) => t.assignees.some((x) => x.id === p.id)) }));
  const hid = tasks.filter((t) => !t.assignees.some((p) => p.id));
  if (hid.length) cols.push({ key: '__none', name: L('Others'), items: hid });
  return cols;
}
function viewBoard(tasks) {
  const g = UI.groupBy;
  // Busiest columns first (area, bucket, person); status and priority keep their order. Empty columns go last, narrow.
  const raw = boardCols(g, tasks).map((c, i) => ({ ...c, i }));
  const keepOrder = g === 'status' || g === 'prio';
  const cols = raw.sort((a, b) => (!a.items.length - !b.items.length) || (keepOrder ? 0 : b.items.length - a.items.length) || a.i - b.i);
  return `<div class="board" id="board">${cols.map((c) => `<section class="col ${c.items.length ? '' : 'col-empty'}" data-drop="${esc(c.key)}"><header>${c.person ? av(c.person) : `<span class="dot" style="--c:${c.c || 'var(--line-2)'}"></span>`}<span>${esc(c.name)}</span><span class="count">${c.items.length}</span></header>
    <div class="col-body">${c.items.sort(byDue).map(card).join('')}</div>
    ${S.me.can.create && c.key !== '__none' && !c.noAdd ? `<button class="col-add" data-act="new" data-preset="${g}:${esc(c.key)}">${L('+ Add task')}</button>` : ''}</section>`).join('')}
    ${g === 'cat' && S.me.can.addCategory ? `<form class="add-col" data-form="addcat"><b>${L('New bucket')}</b><input type="text" id="nb-name" placeholder="${L('e.g. Quality / ITP')}" aria-label="${L('Bucket name')}" required><button class="btn sm" type="submit">${L('Add bucket')}</button><span class="hint">${L('Buckets are shared by everyone on the project.')}</span></form>` : ''}
    ${!cols.length ? `<div class="empty" style="flex:1">${L('No open tasks match these filters.')}</div>` : ''}</div>`;
}

/* ---------- list ---------- */
function viewList(tasks) {
  if (!tasks.length) return `<div class="empty">${L('No open tasks match these filters.')}</div>`;
  let groups;
  if (UI.listSort === 'due') {
    const b = { over: [], today: [], tomorrow: [], week: [], next: [], later: [], none: [] };
    tasks.forEach((t) => { if (!t.due) return b.none.push(t); const n = daysFrom(t.due); (n < 0 ? b.over : n === 0 ? b.today : n === 1 ? b.tomorrow : n <= 7 ? b.week : n <= 14 ? b.next : b.later).push(t); });
    groups = [['over', 'Overdue'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days'], ['next', 'In 2 weeks'], ['later', 'Later'], ['none', 'No date']].map(([k, l]) => ({ k, l: L(l), items: b[k].sort(byDue) }));
  } else if (UI.listSort === 'creator') groups = creatorGroups(tasks).map((x) => ({ k: `by:${x.key}`, l: L('Created by {who}', { who: x.name }), items: x.items.sort(byDue) }));
  else if (UI.listSort === 'area') groups = S.areas.map((a) => ({ k: a.id, l: areaOf(a.id).name, items: tasks.filter((t) => t.area === a.id).sort(byDue) }));
  else { const m = {}; tasks.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((t) => { const k = localDay(t.createdAt); (m[k] = m[k] || []).push(t); }); groups = Object.keys(m).sort().reverse().map((k) => ({ k, l: L('Created {date}', { date: fmtD(k) }), items: m[k] })); }
  return `<div class="rows">${groups.filter((g) => g.items.length).map((g) => `<div class="grp-h ${g.k === 'over' ? 'over' : ''}">${esc(g.l)} <span class="n">${g.items.length}</span></div>${g.items.map(row).join('')}`).join('')}</div>`;
}

/* ---------- requests ---------- */
function viewReq() {
  const me = S.me, partner = me.company !== 'spp';
  const open = S.requests.filter((r) => r.status !== 'closed').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const closed = S.requests.filter((r) => r.status === 'closed');
  const fromPartner = openTasks().filter((t) => t.creator && t.creator.company !== 'spp').sort(byDue);
  const canSend = S.people.some((p) => p.canRequest);
  const grp = (items) => { const m = {}; items.forEach((r) => { const c = r.recipient?.company || 'other'; (m[c] = m[c] || []).push(r); }); return Object.keys(m).map((c) => `<div class="grp-h"><span class="tag" style="--c:${COMPANY[c]?.c || '#888'};font-size:14px;color:var(--ink)">${esc(COMPANY[c] ? coLabel(c) : c === 'other' ? L('Other') : c)}</span><span class="n">${m[c].length}</span></div>${m[c].map(reqRow).join('')}`).join(''); };
  const sec = (title, sub, body, n, empty) => `<div class="panel"><h2>${L(title)} <small>${L('{n} open', { n })}</small></h2><p class="muted" style="margin:0;padding:8px 14px;border-bottom:1px solid var(--line);font-size:13px">${L(sub)}</p>${n ? body : `<div class="empty" style="margin:12px">${L(empty)}</div>`}</div>`;
  const head = `<div class="view-head"><div><h1>${L('Requests')}</h1><p>${partner ? L('What SPP has asked of your team, and the work your team has given SPP.') : L('What SPP asks of Caltex, KS or the land owner: approvals, reviews and sign-offs, not work orders. Each one stays here until the person who asked closes it.')}</p></div>${canSend && me.can.create ? `<button class="btn primary" data-act="newReq">${ic('plus')} ${L('New request')}</button>` : ''}</div>`;
  return head + (partner
    ? sec('Asked of your team', 'When you have replied, press “Mark as answered”. The person who asked will close it.', open.map(reqRow).join(''), open.length, 'No open requests from SPP.')
      + sec('Sent by your team to SPP', 'Work your team has given SPP.', fromPartner.map(row).join(''), fromPartner.length, 'Nothing open.')
    : sec('Waiting on others', 'Requests SPP has sent out and not yet closed.', grp(open), open.length, 'No open requests.')
      + sec('Asked of SPP', 'Work Caltex, KS or the land owner have given SPP.', fromPartner.map(row).join(''), fromPartner.length, 'Nothing open.'))
    + (closed.length ? `<div class="panel"><h2>${L('Closed requests')} <small>${closed.length}</small></h2>${closed.map(reqRow).join('')}</div>` : '');
}

/* ---------- calendar ---------- */
function viewCal(tasks) {
  const base = UI.calMonth ? pd(`${UI.calMonth}-01`) : new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const y = base.getFullYear(), m = base.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7;
  const start = new Date(y, m, 1 - off), last = new Date(y, m + 1, 0), cells = Math.ceil((off + last.getDate()) / 7) * 7;
  const by = {}; tasks.forEach((t) => { if (t.due) (by[t.due] = by[t.due] || []).push(t); });
  const sel = UI.calSel || iso(TODAY);
  let h = `<div class="cal-head"><button class="icon-btn" data-act="calNav" data-v="-1" aria-label="${L('Previous month')}" title="${L('Previous month')}">${ic('lt')}</button><h2>${MONL()[m]} ${yr(y)}</h2><button class="icon-btn" data-act="calNav" data-v="1" aria-label="${L('Next month')}" title="${L('Next month')}">${ic('gt')}</button><button class="btn sm" data-act="calNav" data-v="0">${L('Today')}</button></div><div class="cal">`;
  [1, 2, 3, 4, 5, 6, 0].forEach((i) => { h += `<div class="wd">${WD()[i]}</div>`; });
  for (let i = 0; i < cells; i++) {
    const dt = new Date(start); dt.setDate(start.getDate() + i); const k = iso(dt); const ts = (by[k] || []).sort(byDue);
    h += `<button type="button" class="day ${dt.getMonth() !== m ? 'out' : ''} ${k === iso(TODAY) ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-act="calSel" data-v="${k}" aria-label="${fmtD(k)}${ts.length ? ` · ${L('{n} tasks', { n: ts.length })}` : ''}"><span class="dn"><b>${dt.getDate()}</b>${ts.length ? `<span>${ts.length}</span>` : ''}</span>
      ${ts.slice(0, 3).map((t) => `<span class="ev ${daysFrom(k) < 0 ? 'over' : ''}" style="--c:${areaOf(t.area).c}" data-act="open" data-id="${esc(t.id)}" title="${esc(t.title)}">${esc(t.title)}</span>`).join('')}${ts.length > 3 ? `<span class="more">${L('+{n} more', { n: ts.length - 3 })}</span>` : ''}
      <span class="dots">${ts.slice(0, 6).map((t) => `<i style="--c:${areaOf(t.area).c}"></i>`).join('')}</span></button>`;
  }
  h += '</div>';
  const st = (by[sel] || []).sort(byDue);
  return `${h}<div class="cal-sel"><div class="grp-h" style="border:1px solid var(--line);border-bottom:0;border-radius:8px 8px 0 0">${L('Due {date}', { date: fmtD(sel) })} <span class="n">${st.length}</span></div>${st.length ? `<div class="rows" style="border-radius:0 0 8px 8px">${st.map(row).join('')}</div>` : `<div class="empty" style="border-radius:0 0 8px 8px">${L('Nothing due this day.')}</div>`}</div>`;
}

/* ---------- timeline ---------- */
function viewTL(tasks) {
  const S0 = -14, N = 63, narrow = window.innerWidth < 760, W = narrow ? 18 : 24, LBL = narrow ? 150 : 250, width = N * W;
  const x = (s) => (daysFrom(s) - S0) * W;
  let head = `<div class="tl-row tl-head"><div class="tl-lbl">${L('Task')}</div><div class="tl-track" style="width:${width}px;height:30px">`;
  for (let i = 0; i < N; i++) { const dt = pd(d(S0 + i)); if (dt.getDay() === 1) head += `<span class="tl-wk" style="left:${i * W}px">${dt.getDate()} ${MON()[dt.getMonth()]}</span>`; }
  head += '</div></div>';
  const grid = Array.from({ length: N }, (_, i) => (pd(d(S0 + i)).getDay() === 1 ? `<span class="tl-grid" style="left:${i * W}px"></span>` : '')).join('');
  let body = '';
  S.areas.forEach((a0) => {
    const a = areaOf(a0.id);
    const ts = tasks.filter((t) => t.area === a.id && (t.start || t.due)).sort((p, q) => (p.start || p.due).localeCompare(q.start || q.due));
    if (!ts.length) return;
    body += `<div class="tl-row tl-grp"><div class="tl-lbl"><span class="tag" style="--c:${a.c};font-size:14px;color:var(--ink)">${esc(a.name)}</span><span class="mono muted" style="margin-left:auto">${ts.length}</span></div><div class="tl-track" style="width:${width}px">${grid}</div></div>`;
    ts.forEach((t) => {
      const s = t.start || t.due, e = t.due || t.start; const l = Math.max(0, x(s)), r = Math.min(width, x(e) + W); const pg = prog(t); const late = t.due && daysFrom(t.due) < 0;
      body += `<div class="tl-row"><div class="tl-lbl" data-act="open" data-id="${esc(t.id)}">${avs(t.assignees.slice(0, 2))}<span class="tt">${esc(t.title)}</span></div><div class="tl-track" style="width:${width}px">${grid}${r > l ? `<span class="tl-bar ${late ? 'over' : ''}" data-act="open" data-id="${esc(t.id)}" title="${esc(t.title)} · ${fmtS(s)} → ${fmtS(e)} · ${pg}%${late ? ` · ${L('Late')}` : ''}" style="--c:${a.c};left:${l}px;width:${Math.max(r - l, W)}px"><i style="width:${pg}%"></i></span>` : ''}</div></div>`;
    });
  });
  if (!body) return `<div class="empty">${L('No open tasks with dates match these filters.')}</div>`;
  return `<div class="tl-wrap"><div class="tl">${head}${body}<span class="tl-today" style="left:calc(${LBL}px + ${(-S0) * W + W / 2}px)"></span></div></div>`;
}

/* ---------- history ---------- */
function viewHist() {
  const q = UI.hq.trim().toLowerCase();
  let done = S.tasks.filter((t) => t.status === 'done').sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
  const total = done.length, week = done.filter((t) => t.closedAt && daysFrom(localDay(t.closedAt)) >= -7).length;
  if (UI.harea) done = done.filter((t) => t.area === UI.harea);
  if (q) done = done.filter((t) => `${t.id} ${t.title} ${t.assignees.map(nm).join(' ')} ${nm(t.closedBy)}`.toLowerCase().includes(q));
  return `<div class="view-head"><div><h1>${L('History')}</h1><p>${L('The permanent record of closed tasks: who did it, who closed it and when. Open any item for its full checklist, comments and activity.')}</p></div></div>
  <div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));max-width:620px"><div class="stat"><b>${total}</b><span>${L('Closed tasks you can see')}</span></div><div class="stat"><b>${week}</b><span>${L('Closed in the last 7 days')}</span></div><div class="stat"><b>${openTasks().length}</b><span>${L('Still open')}</span></div></div>
  <div class="filters"><label class="search">${ic('search')}<input type="search" id="h-q" data-input="hq" placeholder="${L('Search closed tasks')}" value="${esc(UI.hq)}" aria-label="${L('Search history')}"></label>
    <select id="h-area" data-change="harea" aria-label="${L('Area')}"><option value="">${L('All areas')}</option>${S.areas.map((a) => `<option value="${esc(a.id)}" ${UI.harea === a.id ? 'selected' : ''}>${esc(areaOf(a.id).name)}</option>`).join('')}</select></div>
  ${done.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L('ID')}</th><th>${L('Task')}</th><th>${L('Area')}</th><th>${L('Done by')}</th><th>${L('Closed by')}</th><th>${L('col|Closed')}</th><th>${L('Days open')}</th></tr></thead><tbody>
    ${done.map((t) => `<tr class="click" data-act="open" data-id="${esc(t.id)}"><td class="num">${esc(t.id)}</td><td style="min-width:220px">${esc(t.title)}<div class="muted" style="font-size:12px">${esc(catOf(t.category).name)}</div></td><td><span class="tag" style="--c:${areaOf(t.area).c}">${esc(areaOf(t.area).name)}</span></td><td>${avs(t.assignees)}</td><td style="white-space:nowrap">${av(t.closedBy)} ${esc(nm(t.closedBy))}</td><td class="num">${t.closedAt ? `${fmtS(localDay(t.closedAt))} ${yr(new Date(t.closedAt).getFullYear())}` : ''}</td><td class="num">${t.closedAt ? Math.max(0, Math.round((new Date(t.closedAt) - new Date(t.createdAt)) / 864e5)) : ''}</td></tr>`).join('')}
  </tbody></table></div>` : `<div class="empty">${L('No closed tasks match.')}</div>`}`;
}

/* ---------- team & access ---------- */
/* ================= Admin page (/admin) ================= */
const PAGE_LABEL = { drawings: 'Drawings, models & drawing changes', safety: 'Safety library (TCC / JLA)', timeline: 'Project timeline', scurve_station: 'S-curve: station portion', scurve_caltex: 'S-curve: Caltex fuel portion', tasks: 'Tasks', files: 'Project files (safety & engineering)', meetings: 'Meetings (SPP–Caltex)' };
const LEVEL_LABEL = { none: 'level|None', view: 'level|View', edit: 'level|Edit' };
function viewAdmin() {
  const me = S.me, adminData = S.admin;
  if (!adminData) return `<div class="empty" style="margin:40px">${L('Only admins can open this page.')}</div>`;
  const canEdit = me.can.admin, tab = UI.adminTab;
  const intro = canEdit ? L('You are an admin. Changes here take effect straight away.') : L('View only. You can see how access is set up but cannot change it.');
  if (tab === 'people') {
    const byCo = {};
    adminData.people.forEach((p) => { (byCo[p.company] = byCo[p.company] || []).push(p); });
    const coOpts = [['spp', 'SPP'], ['caltex', 'Caltex'], ['ks', 'KS Consulting'], ['owner', 'Land owner']];
    const addForm = canEdit ? `<form class="panel add-person" data-form="addPerson"><h2>${L('Add a person')}</h2>
      <div class="add-grid">
        <label>${L('Name')}<input id="ap-name" type="text" maxlength="60" required autocomplete="off"></label>
        <label>${L('Company')}<select id="ap-co" data-change="apCo">${coOpts.map(([k, l]) => `<option value="${k}" ${UI.apCo === k ? 'selected' : ''}>${esc(L(l))}</option>`).join('')}</select></label>
        ${(UI.apCo || 'spp') === 'spp' ? `<label>${L('Access level')}<select id="ap-level">${['team', 'staff', 'manager', 'observer', 'admin'].map((l) => `<option value="${l}">${esc(lvlL(l))}</option>`).join('')}</select></label>` : ''}
        <label>${L('Title')}<input id="ap-title" type="text" maxlength="80" placeholder="${L('e.g. Site engineer')}"></label>
      </div>
      ${(UI.apCo || 'spp') === 'spp' ? `<div class="muted" style="font-size:13px;margin-top:6px">${L('Reports to:')}</div><div class="tog" style="margin-top:4px">${adminData.people.filter((p) => p.company === 'spp' && p.active).map((p) => `<button type="button" class="${(UI.apBoss || []).includes(p.id) ? 'on' : ''}" data-act="apBoss" data-t="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>` : ''}
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn primary" type="submit">${L('Add person')}</button><span class="muted" style="font-size:13px">${L('Then use Edit for who they can see and send requests to, and Create login for their password.')}</span></div>
    </form>` : '';
    return `<div class="view-head"><div><h1>${L('People & logins')}</h1><p>${intro} ${L('Create logins, issue one-time setup or reset codes, change levels and switch accounts off. Edit a person for their reporting lines and request contacts.')}</p></div></div>
    ${addForm}
    <div class="team-grid">${Object.keys(COMPANY).filter((c) => byCo[c]).map((co) => `<div class="panel co"><h3><i style="background:${COMPANY[co].c}"></i>${esc(coLabel(co))} <span class="mono muted" style="margin-left:auto;font-weight:400">${byCo[co].length}</span></h3>
      ${byCo[co].map((x) => personCard(x, adminData)).join('')}</div>`).join('')}</div>`;
  }
  if (tab === 'pages') return pageAccessSection(adminData, canEdit, intro);
  if (tab === 'check') return checkPersonSection(adminData);
  if (tab === 'rules') return taskRulesSection(adminData, canEdit);
  if (tab === 'signins') return signInsSection(adminData);
  if (tab === 'backup') return backupSection();
  if (tab === 'chief') return chiefSection();
  return changeLogSection(adminData);
}
function levelSelect(attrs, options, value, cls, label) {
  return `<select ${attrs} class="lvl-sel lvl-${cls}" aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}
function pageAccessSection(adminData, canEdit, intro) {
  const pa = adminData.pageAccess, dis = canEdit ? '' : 'disabled';
  const head = `<tr><th></th>${pa.pages.map((pg) => `<th>${esc(L(PAGE_LABEL[pg.id]))}${pg.money ? `<br><span class="money-tag">${L('Money')}</span>` : ''}</th>`).join('')}</tr>`;
  const groupName = (id) => L(pa.groups.find((g) => g.id === id)?.name || id);
  const groupRows = pa.groups.map((g) => `<tr><th scope="row">${esc(L(g.name))}</th>${pa.pages.map((pg) => `<td>${levelSelect(`data-change="pageGroup" data-g="${esc(g.id)}" data-p="${pg.id}" ${dis}`, pg.levels.map((l) => [l, L(LEVEL_LABEL[l])]), g.pages[pg.id], g.pages[pg.id], `${L(g.name)} · ${L(PAGE_LABEL[pg.id])}`)}${g.pages[pg.id] !== g.defaults[pg.id] ? `<small class="muted changed">${L('changed')}</small>` : ''}</td>`).join('')}</tr>`).join('');
  const order = ['spp', 'team', 'caltex', 'ks', 'owner'];
  const people = pa.people.map((r) => ({ ...r, p: adminData.people.find((x) => x.id === r.id) })).filter((r) => r.p && r.group)
    .sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group) || x.p.name.localeCompare(y.p.name));
  const personRows = people.map((r) => `<tr${r.p.active ? '' : ' class="muted"'}><th scope="row">${esc(r.p.name)} <small class="muted">${esc(groupName(r.group))}${r.admin ? ` · ${L('admin')}` : r.observer ? ` · ${esc(lvlL('observer'))}` : ''}</small></th>${pa.pages.map((pg) => {
    const groupLv = pa.groups.find((g) => g.id === r.group).pages[pg.id], o = r.overrides[pg.id];
    let levels = pg.levels;
    if (r.observer) levels = levels.filter((l) => l !== 'edit');
    if (r.admin) levels = levels.filter((l) => l !== 'none');
    const opts = [['group', L('As group ({v})', { v: L(LEVEL_LABEL[groupLv]) })], ...levels.map((l) => [l, L(LEVEL_LABEL[l])])];
    return `<td>${levelSelect(`data-change="pagePerson" data-u="${esc(r.id)}" data-p="${pg.id}" ${dis}`, opts, o === undefined ? 'group' : o, r.pages[pg.id], `${r.p.name} · ${L(PAGE_LABEL[pg.id])}`)}${o !== undefined || r.pages[pg.id] !== groupLv ? `<small class="muted changed">${L('now: {v}', { v: L(LEVEL_LABEL[r.pages[pg.id]]) })}</small>` : ''}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="view-head"><div><h1>${L('Pages & access')}</h1><p>${intro}</p></div></div>
    <div class="access-sum"><ul>
      <li>${L('<b>None</b>: the page is hidden from their menus and blocked on the server. <b>View</b>: they can look. <b>Edit</b>: they can also change it.')}</li>
      <li>${L('Pages marked <b>Money</b> show costs or progress value.')}</li>
      <li>${L('Admins always keep at least view on every page. Nobody gets schedule editing automatically; give it to a person below.')}</li>
      <li>${L('Drawings and Safety are view-only on this site for now. The schedule pages arrive with the S-curve move; their settings already apply then.')}</li>
    </ul></div>
    <div class="area-wrap"><table class="area-table"><caption>${L('By group')}</caption><thead>${head}</thead><tbody>${groupRows}</tbody></table></div>
    <h2 class="sec-h">${L('Exceptions for one person')}</h2>
    <div class="area-wrap"><table class="area-table"><thead>${head}</thead><tbody>${personRows}</tbody></table></div>`;
}
function checkPersonSection(adminData) {
  const order = ['spp', 'caltex', 'ks', 'owner'];
  const people = [...adminData.people].sort((x, y) => order.indexOf(x.company) - order.indexOf(y.company) || x.name.localeCompare(y.name));
  const pick = `<label class="inline">${L('Person')} <select data-change="checkPerson" style="width:auto"><option value="">${L('Choose someone…')}</option>${order.map((c) => `<optgroup label="${esc(coLabel(c))}">${people.filter((p) => p.company === c).map((p) => `<option value="${esc(p.id)}" ${PREVIEW?.person.id === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(lvlL(p.level))}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  let body = `<div class="empty" style="margin-top:12px">${L('Choose a person to see exactly what the site shows them.')}</div>`;
  const pv = PREVIEW;
  if (pv?.error) body = `<div class="empty" style="margin-top:12px">${esc(trMsg(pv.error))}</div>`;
  else if (pv) {
    const lv = (id) => pv.pages[id] || 'none';
    const pageRows = Object.keys(PAGE_LABEL).map((id) => `<li><b>${esc(L(PAGE_LABEL[id]))}</b>: <span class="pill ${lv(id) === 'none' ? 'st-todo' : lv(id) === 'edit' ? 'st-done' : 'st-doing'}">${esc(L(LEVEL_LABEL[lv(id)]))}</span></li>`).join('') + `<li><b>${L('Admin page')}</b>: <span class="pill ${pv.adminPage ? 'st-done' : 'st-todo'}">${pv.adminPage ? L('Yes') : L('No')}</span></li>`;
    const names = (list) => list.length ? list.map((p) => `<span class="chip">${esc(p.name)}${p.masked ? ` <small class="muted">(${L('name hidden')})</small>` : ''}</span>`).join(' ') : `<span class="muted">${L('Nobody')}</span>`;
    const items = (list) => list.length ? `<ul class="log-list">${list.slice(0, 60).map((t) => `<li><span class="mono muted">${esc(t.id)}</span> ${esc(t.title)} <span class="pill st-${esc(t.status)}">${esc(stL(t.status) || t.status)}</span></li>`).join('')}</ul>${list.length > 60 ? `<p class="muted">${L('…and {n} more', { n: list.length - 60 })}</p>` : ''}` : `<p class="muted">${L('None')}</p>`;
    body = `<div class="access-sum" style="margin-top:12px"><b>${L('What {name} sees', { name: esc(pv.person.name) })}</b> <span class="muted">(${esc(coLabel(pv.person.company))} · ${esc(lvlL(pv.person.level))}${pv.person.active ? '' : ` · ${L('switched off')}`})</span>
      <p class="muted" style="margin:6px 0 0">${L('This is exactly what the server sends this person. Nothing is changed and you are not signed in as them.')}</p>
      ${pv.person.active && pv.person.id !== S.me.id ? `<button class="btn primary" style="margin-top:8px" data-act="viewAsStart" data-u="${esc(pv.person.id)}">${L('View the site as {name}', { name: esc(pv.person.name) })}</button> <span class="muted" style="font-size:13px">${L('Opens the real pages as they see them. View only, for up to one hour. Logged in the Change log.')}</span>` : ''}</div>
      <div class="check-grid">
        <div class="panel check-box"><h3>${L('Pages')}</h3><ul>${pageRows}</ul>${pv.readOnly ? `<p class="muted">${L('Tasks are view only for this person.')}</p>` : ''}</div>
        <div class="panel check-box"><h3>${L('People they can see')} <span class="muted">${pv.people.length}</span></h3><div>${names(pv.people)}</div>
          <h3 style="margin-top:12px">${L('People hidden from them')} <span class="muted">${pv.hidden.length}</span></h3><div>${names(pv.hidden)}</div></div>
        <div class="panel check-box"><h3>${L('Can assign tasks to')}</h3><div>${names(pv.people.filter((p) => p.canAssign))}</div>
          <h3 style="margin-top:12px">${L('Can send requests to')}</h3><div>${names(pv.people.filter((p) => p.canRequest))}</div></div>
      </div>
      <div class="check-grid two">
        <div class="panel check-box"><h3>${L('Tasks they can see')} <span class="muted">${pv.tasks.length}</span>${pv.seesAll ? ` <small class="muted">(${L('every task')})</small>` : ''}</h3>${items(pv.tasks)}</div>
        <div class="panel check-box"><h3>${L('Requests they can see')} <span class="muted">${pv.requests.length}</span></h3>${items(pv.requests)}</div>
      </div>`;
  }
  return `<div class="view-head"><div><h1>${L('Check a person')}</h1><p>${L('Use this after adding someone or changing their access, to make sure they cannot see things they should not.')}</p></div></div>${pick}${body}`;
}
function taskRulesSection(adminData, canEdit) {
  const nameOf = (id) => adminData.people.find((p) => p.id === id)?.name || id;
  const rows = adminData.people.filter((p) => p.company === 'spp').map((p) => `<tr><th scope="row">${esc(p.name)} <small class="muted">${esc(lvlL(p.level))}</small></th>
    <td>${esc(p.reportsTo.map(nameOf).join(', ') || '–')}</td><td>${esc(p.follows.map(nameOf).join(', ') || '–')}</td>
    <td>${esc(p.requestContacts.map((id) => (id === '*' ? L('any partner') : nameOf(id))).join(', ') || '–')}</td>
    <td>${esc((p.hiddenFrom || []).map((c) => coLabel(c)).join(', ') || '–')}</td>
    <td>${esc([p.safetyReports ? L('all safety items') : '', p.quiet ? L('no team activity') : ''].filter(Boolean).join(', ') || '–')}</td>
    <td>${canEdit ? `<button class="btn sm" data-act="adminEditPerson" data-u="${esc(p.id)}">${L('Edit')}</button>` : ''}</td></tr>`).join('');
  return `<div class="view-head"><div><h1>${L('Task rules')}</h1><p>${L('Who reports to whom, whose work people follow, who may send requests to partners, and who is hidden from which company.')}</p></div></div>
    <div class="area-wrap"><table class="area-table rules"><thead><tr><th></th><th>${L('Reports to')}</th><th>${L('Also sees the work of')}</th><th>${L('Requests to')}</th><th>${L('Hidden from')}</th><th>${L('Notices')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sec"><h2>${L('How access works')}</h2><div class="access-sum"><ul>
      <li>${L('<b>Admin, Manager, Staff, Observer</b> see every task. Observers cannot change anything and are hidden from everyone below Staff.')}</li>
      <li>${L('<b>Site team members</b> see their own tasks and every task that has a site team member on it.')}</li>
      <li>${L('<b>Caltex</b> sees SPP people (except A) and only work that involves Caltex.')}</li>
      <li>${L('<b>KS Consulting and the land owner</b> see each other plus Brian, Bo and Noom, and only work that involves them.')}</li>
      <li>${L('SPP sends <b>requests</b>, not tasks, to Caltex, KS and the land owner, and only along the request contacts set on each person.')}</li>
    </ul></div></div>`;
}
// Sign-ins (Brian, 2 Nov 2026): last sign-in, last activity and full account history per person. Admins only (task-accounts API).
const HIST = new Map();
const fmtUnix = (t) => (t ? new Date(t * 1000).toLocaleString(I18N.lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '');
const agoUnix = (t) => (t ? ago(new Date(t * 1000).toISOString()) : '');
function eventLabel(ev) {
  const [kind, extra] = String(ev).split(':');
  const dev = { phone: L('phone'), tablet: L('tablet'), computer: L('computer') }[extra];
  if (kind === 'login') return L('Signed in') + (dev ? ` · ${dev}` : '');
  if (kind === 'login_failed' && String(extra).startsWith('code-')) { const d2 = { phone: L('phone'), tablet: L('tablet'), computer: L('computer') }[String(extra).slice(5)]; return L('Right password, wrong 2-step code') + (d2 ? ` · ${d2}` : ''); }
  if (kind === 'login_failed') return L('Wrong password') + (dev ? ` · ${dev}` : '');
  if (kind === 'login_failed_code') return L('Right password, wrong 2-step code') + (dev ? ` · ${dev}` : '');
  return L({ password_changed_by_self: 'Changed own password', task_account_created: 'Login created', task_account_created_with_temporary_password: 'Login created with a temporary password',
    task_account_linked: 'Login linked', ticket_issued: 'Setup / reset code issued', task_account_enabled: 'Login switched on', task_account_disabled: 'Login switched off', disabled: 'Login switched off',
    two_step_enabled: '2-step sign-in turned on', two_step_disabled_by_self: '2-step sign-in turned off', two_step_removed_by_admin: '2-step sign-in removed by an admin', two_step_recovery_code_used: 'Recovery code used' }[kind] || kind);
}
function signInsSection(adminData) {
  if (!ACCOUNTS) return `<div class="view-head"><div><h1>${L('Sign-ins')}</h1></div></div><div class="empty">${L('Loading…')}</div>`;
  if (ACCOUNTS.error) return `<div class="view-head"><div><h1>${L('Sign-ins')}</h1></div></div><div class="empty">${esc(trMsg(ACCOUNTS.error))}</div>`;
  const rows = adminData.people.filter((p) => ACCOUNTS.get(p.id)?.username).map((p) => ({ p, a: ACCOUNTS.get(p.id) }))
    .sort((x, y) => (y.a.lastLogin || 0) - (x.a.lastLogin || 0) || x.p.name.localeCompare(y.p.name));
  const never = adminData.people.filter((p) => p.active && !ACCOUNTS.get(p.id)?.username);
  const hist = (id) => {
    const h = HIST.get(id);
    if (!h) return `<div class="muted" style="padding:8px 0">${L('Loading…')}</div>`;
    if (h.error) return `<div class="muted">${esc(trMsg(h.error))}</div>`;
    return h.length ? `<ul class="log-list">${h.map((e) => `<li><span class="mono muted">${esc(fmtUnix(e.at))}</span> ${String(e.event).startsWith('login_failed') ? '<b style="color:var(--bad,#C0392E)">' : '<b>'}${esc(eventLabel(e.event))}</b>${e.by && !String(e.event).startsWith('login') ? ` · ${esc(e.by)}` : ''}</li>`).join('')}</ul>` : `<p class="muted">${L('No sign-ins recorded yet.')}</p>`;
  };
  return `<div class="view-head"><div><h1>${L('Sign-ins')}</h1><p>${L('When each person last signed in and last used the site, and their history. Sign-ins are recorded from 2 Nov 2026 and kept for 90 days; account changes (logins, codes, passwords, on/off) are kept for the whole project. Only the kind of device is kept.')}</p></div></div>
    <div class="panel" style="overflow-x:auto"><table class="signins"><thead><tr><th>${L('Person')}</th><th>${L('Username')}</th><th>${L('Last signed in')}</th><th>${L('Last active')}</th><th>${L('Sign-ins (30 days)')}</th><th>${L('Wrong passwords (7 days)')}</th><th></th></tr></thead><tbody>
    ${rows.map(({ p, a }) => `<tr><td><b>${esc(p.name)}</b>${a.status === 'off' ? ` <span class="pill st-todo">${L('Login off')}</span>` : a.status === 'waiting' ? ` <span class="pill st-doing">${L('Waiting for password')}</span>` : ''}</td><td class="mono">${esc(a.username)}</td>
      <td>${a.lastLogin ? `${esc(fmtUnix(a.lastLogin))}<br><small class="muted">${esc(agoUnix(a.lastLogin))}</small>` : `<span class="muted">${L('Not yet')}</span>`}</td>
      <td>${a.lastActive ? esc(agoUnix(a.lastActive)) : '<span class="muted">–</span>'}</td><td>${a.logins30d}</td>
      <td>${a.failed7d ? `<b style="color:var(--bad,#C0392E)">${a.failed7d}</b>` : '0'}</td>
      <td><button class="btn sm" data-act="signinHist" data-u="${esc(p.id)}">${UI.histFor === p.id ? L('Hide history') : L('History')}</button></td></tr>
      ${UI.histFor === p.id ? `<tr><td colspan="7">${hist(p.id)}</td></tr>` : ''}`).join('')}
    </tbody></table></div>
    ${never.length ? `<p class="muted" style="margin-top:12px">${L('No login yet:')} ${never.map((p) => esc(p.name)).join(', ')}</p>` : ''}`;
}
/* Admin -> Backups (audit F11): the weekly automatic copy, "Back up now" and "Download backup". Admins only. */
let BACKUP = null;
// Admin → Chief (owner only, 5 Nov 2026): the AI assistant's keys and what it did. The tab only shows if the site says
// this person owns assistant keys (GET /api/agent-keys answers).
let AGENT = null;
async function loadAgent() {
  try {
    const [k, a] = await Promise.all([fetch('/api/agent-keys', { credentials: 'same-origin' }), fetch('/api/agent-activity', { credentials: 'same-origin' })]);
    if (!k.ok) { AGENT = { ok: false }; if (UI.adminTab === 'chief') { UI.adminTab = 'pages'; render(); } return; }
    AGENT = { ok: true, newKey: AGENT?.newKey || null, ...(await k.json()), activity: a.ok ? (await a.json()).activity : [] };
  } catch { AGENT = { ok: false }; }
  renderNav(); if (UI.adminTab === 'chief') renderBody();
}
async function agentPost(path) {
  const r = await gateFetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tasks' }, body: '{}' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { toast(trMsg(d.error || L('Something went wrong.')), null, 'warn'); return null; }
  return d;
}
const AGENT_KINDS = { created: 'created the task', updated: 'changed', progress: 'updated progress', commented: 'commented', checklist_add: 'added a step', checklist_done: 'ticked a step', checklist_undone: 'unticked a step', assigned: 'added a person', meeting_notes: 'added to the meeting notes' };
function chiefSection() {
  if (!AGENT?.ok) return `<div class="empty">${L('Loading…')}</div>`;
  const live = (k) => !k.revoked_at && k.expires_at > new Date().toISOString();
  const keys = AGENT.keys || [];
  const fresh = AGENT.newKey ? `<div class="card" style="border:2px solid var(--accent);margin:0 0 14px"><div class="card-b">
      <h3 style="margin:0 0 6px">${L('Chief’s new key')}</h3>
      <p class="muted" style="margin:0 0 8px">${L('Copy it now and give it to the assistant. It is shown only this once; the site keeps only a fingerprint of it.')}</p>
      <textarea id="agent-key-box" readonly rows="2" style="width:100%;font-family:var(--f-mono,monospace)">${esc(AGENT.newKey)}</textarea>
      <div class="acts" style="margin-top:8px"><button class="btn" data-act="agentCopy">${L('Copy key')}</button><button class="btn ghost" data-act="agentHide">${L('I have copied it')}</button></div></div></div>` : '';
  const rows = keys.map((k) => `<tr><td>${esc(fmtUnix(Date.parse(k.created_at) / 1000))}</td><td>${esc(fmtUnix(Date.parse(k.expires_at) / 1000))}</td><td>${k.last_used_at ? esc(fmtUnix(Date.parse(k.last_used_at) / 1000)) : '—'}</td>
      <td>${k.revoked_at ? `<span class="pill">${L('Revoked')}</span>` : live(k) ? `<span class="pill st-doing">${L('Active')}</span>` : `<span class="pill">${L('Expired')}</span>`}</td>
      <td>${live(k) ? `<button class="btn sm danger" data-act="agentRevoke" data-id="${esc(k.id)}">${L('Revoke')}</button>` : ''}</td></tr>`).join('');
  const acts = (AGENT.activity || []).map((x) => `<li><span class="muted">${esc(fmtUnix(Date.parse(x.at) / 1000))}</span> · ${esc(L(AGENT_KINDS[x.kind] || x.kind))} ${x.taskId ? `<a href="#" data-act="open" data-id="${esc(x.taskId)}"><span class="mono">${esc(x.taskId)}</span></a> ${esc(x.title)}` : x.kind === 'meeting_notes' ? `<a href="/meetings/#${esc(encodeURIComponent(x.data.meeting || ''))}">${esc(x.data.title || '')} · ${esc(x.data.date || '')}</a> (${esc(x.data.part === 'spp' ? L('SPP only') : L('shared'))}, ${esc(String(x.data.lines || 0))})` : ''}</li>`).join('');
  return `<div class="view-head"><div><h1>${L('Chief (assistant)')}</h1><p>${L('Chief is your AI assistant. It acts as you: everyone else sees your name. It can read your tasks, requests and meetings, create tasks for you or SPP colleagues, comment, update progress, details and dates, add and tick checklist steps, and add people to tasks. It cannot close, approve, delete, hand off or share tasks, send or answer requests (to Caltex, KS or the land owner it makes you a task instead), or open any other page.')}</p></div>
    <button class="btn primary" data-act="agentNew">${L('Create a key')}</button></div>
    ${fresh}
    <div class="card"><div class="card-b"><h3 style="margin:0 0 8px">${L('Keys')}</h3>
    ${keys.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L('Created')}</th><th>${L('Expires')}</th><th>${L('Last used')}</th><th>${L('Status')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">${L('No keys yet. Create one and give it to the assistant.')}</p>`}
    <p class="muted" style="font-size:12.5px;margin:8px 0 0">${L('Keys last 90 days. Revoke a key at once if you think it was seen by someone else.')}</p></div></div>
    <div class="card" style="margin-top:14px"><div class="card-b"><h3 style="margin:0 0 8px">${L('What Chief did')}</h3>
    ${acts ? `<ul class="agent-log">${acts}</ul>` : `<p class="muted">${L('Nothing yet.')}</p>`}</div></div>`;
}
async function loadBackup() {
  try { const r = await fetch('/api/backup/status', { credentials: 'same-origin' }); const d = await r.json().catch(() => ({})); BACKUP = r.ok ? d : { error: d.error || L('Something went wrong.') }; }
  catch { BACKUP = { error: L('Something went wrong.') }; }
  if (ADMIN && UI.adminTab === 'backup') renderBody();
}
async function backupPost(path, body) {
  const r = await gateFetch(`/api/backup/${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tasks' }, body: JSON.stringify(body || {}) });
  if (r.ok) return r;
  const d = await r.json().catch(() => ({}));
  toast(trMsg(gateMsg(d.error) || L('Something went wrong.')), null, 'warn'); return null;
}
const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n || 0} B`);
function backupSection() {
  const head = `<div class="view-head"><div><h1>${L('Backups')}</h1><p>${L('Every Sunday at 02:00 the site copies all its data and files to a separate, locked storage area (copies cannot be deleted or changed for 90 days). Once a month, download a backup here and save it in the project SharePoint folder. Sign-ins are kept for 90 days, then removed automatically; account changes are kept for the whole project.')}</p></div></div>`;
  if (!BACKUP) return `${head}<div class="empty">${L('Loading…')}</div>`;
  if (BACKUP.error) return `${head}<div class="empty">${esc(trMsg(BACKUP.error))}</div>`;
  // "Back up now" runs in pieces; join each start with its follow-up pieces into one line.
  const groups = [];
  for (const r of [...(BACKUP.runs || [])].reverse()) {
    const g = groups[groups.length - 1];
    if (r.part && g && g.by === r.by) { g.files = { total: r.files?.total ?? g.files.total, copied: (g.files.copied || 0) + (r.files?.copied || 0), bytes: (g.files.bytes || 0) + (r.files?.bytes || 0), waiting: r.files?.waiting ?? g.files.waiting }; g.errors = [...g.errors, ...(r.errors || [])]; }
    else groups.push({ ...r, files: { ...(r.files || {}) }, errors: [...(r.errors || [])] });
  }
  const runs = groups.reverse().slice(0, 8), last = runs[0];
  const runLine = (r) => {
    const dbs = Object.values(r.databases || {}), rows = dbs.reduce((n, d) => n + d.rows, 0), f = r.files || {};
    const who = r.by === 'schedule' ? L('automatic') : esc(person(r.by)?.name || r.by);
    return `<li><span class="mono muted">${esc(fmtUnix(Math.floor(new Date(r.at).getTime() / 1000)))}</span> <b>${who}</b> · ${L('{n} rows of data', { n: rows.toLocaleString() })} · ${L('{n} files new', { n: f.copied || 0 })}${f.copied ? ` (${fmtBytes(f.bytes)})` : ''}${f.waiting ? ` · <b style="color:var(--warn,#B7791F)">${L('{n} files left for next time', { n: f.waiting })}</b>` : ''}${(r.errors || []).length ? ` · <b style="color:var(--bad,#C0392E)">${L('{n} problems', { n: r.errors.length })}</b><br><small class="mono muted">${esc(r.errors.slice(0, 3).join(' | '))}</small>` : ''}</li>`;
  };
  const auto = !BACKUP.connected ? `<p class="muted">${L('The backup storage is not connected yet. Until it is, use Download backup.')}</p>`
    : last ? `<p>${L('Last backup:')} <b>${esc(fmtUnix(Math.floor(new Date(last.at).getTime() / 1000)))}</b> · ${L('{n} files in storage', { n: last.files?.total ?? 0 })}${last.files?.waiting ? '' : ` · ${L('all copied')}`}</p>`
    : `<p class="muted">${L('No backup has run yet. The first one runs on Sunday at 02:00, or press Back up now.')}</p>`;
  return `${head}
    <div class="panel"><h2>${L('Automatic weekly backup')}</h2><div style="padding:4px 14px 12px">${auto}
      ${BACKUP.connected ? `<button class="btn" data-act="backupRun" ${UI.backupBusy ? 'disabled' : ''}>${L('Back up now')}</button>` : ''}
      ${UI.backupProgress ? `<p role="status" style="margin-top:8px"><b>${esc(UI.backupProgress)}</b></p>` : ''}
      ${runs.length ? `<ul class="log-list" style="margin-top:10px">${runs.map(runLine).join('')}</ul>` : ''}</div></div>
    <div class="panel" style="margin-top:12px"><h2>${L('Download backup')}</h2><div style="padding:4px 14px 14px">
      <p>${L('A zip file with all the data (tasks, people, page access, meetings, trackers, sign-in history) and the current version of every file in Files. Passwords are not included. Save it in the project SharePoint folder and keep it private.')}</p>
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="bk-files" checked> ${L('Include the files (larger download)')}</label>
      <button class="btn primary" data-act="backupDownload" ${UI.backupBusy ? 'disabled' : ''}>${L('Download backup')}</button></div></div>`;
}
function changeLogSection(adminData) {
  const pa = adminData.pageAccess;
  const nameOf = (id) => adminData.people.find((p) => p.id === id)?.name || id;
  const groupName = (id) => L(pa.groups.find((g) => g.id === id)?.name || id);
  const subj = (s) => { const [k, id] = s.split(':'); return k === 'group' ? groupName(id) : nameOf(id); };
  const items = [
    ...(pa.log || []).map((e) => ({ at: e.at, by: e.by, text: L('{who}: {page} → {level}', { who: subj(e.subject), page: L(PAGE_LABEL[e.page] || e.page), level: e.level === null ? L('as group') : L(LEVEL_LABEL[e.level]) }) })),
    ...(pa.personChanges || []).map((e) => ({ at: e.at, by: e.by, text: e.kind === 'view_as' ? L('viewed the site as {who}', { who: nameOf(e.person) }) : e.kind === 'backup_download' ? (e.files ? L('downloaded a backup (with files)') : L('downloaded a backup (data only)')) : e.kind === 'backup_run' ? L('ran a backup') : (e.fields || []).includes('removed') ? L('{who}: removed from the project (tasks handed over: {n})', { who: nameOf(e.person), n: e.tasks || 0 }) : L('{who}: changed {fields}', { who: nameOf(e.person), fields: (e.fields || []).join(', ') }) })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 150);
  return `<div class="view-head"><div><h1>${L('Change log')}</h1><p>${L('Every change to page access and to people, newest first. It cannot be edited or deleted.')}</p></div></div>
    ${items.length ? `<div class="panel"><ul class="log-list">${items.map((e) => `<li><span class="mono muted">${esc(fmtS(localDay(e.at)))} ${esc(String(e.at).slice(11, 16))}</span> <b>${esc(nameOf(e.by))}</b> · ${esc(e.text)}</li>`).join('')}</ul></div>` : `<div class="empty">${L('No changes yet.')}</div>`}`;
}
function loginBadge(a) {
  if (!a) return '';
  const map = { none: [L('No login yet'), 'st-todo'], waiting: [L('Waiting for password'), 'st-hold'], active: [L('Login: {u}', { u: a.username }), 'st-done'], off: [L('Login switched off ({u})', { u: a.username }), 'st-review'] };
  const [txt, cls] = map[a.status] || ['', ''];
  return `<span class="pill ${cls}">${esc(txt)}${a.owner ? ` · ${L('owner')}` : ''}</span>${a.twoStep === 'on' ? ` <span class="pill st-done">${L('2-step on')}</span>` : ''}`;
}
const twoStepOffButton = (x, a) => (a.twoStep === 'on' && !a.owner && !isMe(x) ? `<button class="btn sm ghost" data-act="lgTwoOff" data-u="${esc(x.id)}">${L('Remove 2-step')}</button>` : '');
function loginButtons(x, a) {
  if (a.status === 'none') return UI.confirm === `login:${x.id}` ? `<span class="cl-add" style="margin:0"><input type="text" id="lg-user" placeholder="${L('username')}" aria-label="${L('username')}" value="${esc(x.name.toLowerCase().replace(/[^a-z0-9]/g, ''))}" style="width:130px"><button class="btn sm primary" data-act="lgCreate" data-u="${esc(x.id)}">${L('Create login')}</button><button class="btn sm ghost" data-act="cancelConfirm">${L('Cancel')}</button></span>` : `<button class="btn sm" data-act="lgStart" data-u="${esc(x.id)}">${L('Create login')}</button>`;
  return `${a.status !== 'off' ? `<button class="btn sm" data-act="lgCode" data-u="${esc(x.id)}">${a.status === 'waiting' ? L('Issue setup code') : L('Issue reset code')}</button>` : ''}${isMe(x) ? '' : `<button class="btn sm ghost" data-act="${a.status === 'off' ? 'lgOn' : 'lgOff'}" data-u="${esc(x.id)}">${a.status === 'off' ? L('Switch login on') : L('Switch login off')}</button>`}${twoStepOffButton(x, a)}`;
}
function personCard(x, adminData) {
  const full = adminData?.people.find((p) => p.id === x.id);
  const editing = UI.editPerson === x.id && S.me.can.admin && full;
  const nameOf = (id) => adminData?.people.find((p) => p.id === id)?.name || id;
  let detail = '';
  if (full) {
    const bits = [];
    if (full.reportsTo.length) bits.push(L('reports to {names}', { names: full.reportsTo.map(nameOf).join(', ') }));
    if (full.follows.length) bits.push(L('follows {names}', { names: full.follows.map(nameOf).join(', ') }));
    if (full.requestContacts.length) bits.push(L('requests to {names}', { names: full.requestContacts.map((id) => (id === '*' ? L('any partner') : nameOf(id))).join(', ') }));
    if (full.safetyReports) bits.push(L('notified of all team safety items'));
    if (full.quiet) bits.push(L('no team activity notices'));
    if ((full.hiddenFrom || []).length) bits.push(L('hidden from {cos}', { cos: full.hiddenFrom.map((c) => (COMPANY[c] ? coLabel(c) : c)).join(', ') }));
    if (full.language === 'en') bits.push(L('English by default'));
    if (!full.active) bits.push(L('switched off'));
    detail = bits.length ? `<small>${esc(bits.join(' · '))}</small>` : '';
  }
  const spp = adminData?.people.filter((p) => p.company === 'spp' && p.id !== x.id) || [];
  const partners = adminData?.people.filter((p) => p.company !== 'spp') || [];
  const tog = (act, list, on) => `<div class="tog" style="margin-top:4px">${list.map((p) => `<button type="button" class="${on.includes(p.id) ? 'on' : ''}" data-act="${act}" data-u="${esc(x.id)}" data-t="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>`;
  const acct = ACCOUNTS?.get(x.id);
  const loginLine = !full || !ACCOUNTS ? '' : ACCOUNTS.error ? `<div class="acct hint">${esc(trMsg(L(ACCOUNTS.error)))}</div>` : `<div class="acct">${loginBadge(acct)}${S.me.can.admin && acct && !acct.owner ? loginButtons(x, acct) : ''}</div>`;
  const plang = full?.language === 'en' ? 'en' : 'th';
  return `<div class="person">${av(x, 'lg')}<div class="pi"><b>${esc(x.name)}</b>${isMe(x) ? ` <span class="muted">${L('(you)')}</span>` : ''}<small>${[titleOf(x) ? esc(titleOf(x)) : '', full ? `<b>${esc(lvlL(full.level))}</b>` : ''].filter(Boolean).join(' · ')}</small>${detail}
    ${editing ? `<div style="margin-top:8px;display:grid;gap:6px">
      <label class="inline">${L('Access level')} <select data-change="pLevel" data-u="${esc(x.id)}" style="width:auto">${(full.company === 'spp' ? ['admin', 'manager', 'staff', 'observer', 'team'] : ['partner']).map((l) => `<option value="${l}" ${full.level === l ? 'selected' : ''}>${esc(lvlL(l))}</option>`).join('')}</select></label>
      <label class="inline">${L('Title')} <input type="text" data-change="pTitle" data-u="${esc(x.id)}" value="${esc(full.title)}" style="width:180px;max-width:100%"></label>
      <label class="inline">${L('Default language')} <select data-change="pLang" data-u="${esc(x.id)}" style="width:auto">${LANGS.map(([k, l]) => `<option value="${k}" lang="${k}" ${plang === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${full.company === 'spp' ? `<div class="muted" style="font-size:13px">${L('Reports to:')}</div>${tog('pBoss', spp, full.reportsTo)}
        <div class="muted" style="font-size:13px">${L('Also sees the work of:')}</div>${tog('pFollow', spp, full.follows)}
        <div class="muted" style="font-size:13px">${L('Can send requests to:')}</div><div class="tog" style="margin-top:4px"><button type="button" class="${full.requestContacts.includes('*') ? 'on' : ''}" data-act="pContact" data-u="${esc(x.id)}" data-t="*">${L('Any partner')}</button>${full.requestContacts.includes('*') ? '' : partners.map((p) => `<button type="button" class="${full.requestContacts.includes(p.id) ? 'on' : ''}" data-act="pContact" data-u="${esc(x.id)}" data-t="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>
        <label class="inline"><input type="checkbox" data-change="pFlag" data-k="safetyReports" data-u="${esc(x.id)}" ${full.safetyReports ? 'checked' : ''}> ${L('Notify about every safety item the site team raises or comments on (even if they don’t report to this person)')}</label>
        <label class="inline"><input type="checkbox" data-change="pFlag" data-k="quiet" data-u="${esc(x.id)}" ${full.quiet ? 'checked' : ''}> ${L('Don’t notify about team activity (who created, closed or handed off tasks). Still notified when assigned, @mentioned or asked to sign off')}</label>
        ${['caltex', 'ks', 'owner'].map((c) => `<label class="inline"><input type="checkbox" data-change="pHide" data-c="${c}" data-u="${esc(x.id)}" ${(full.hiddenFrom || []).includes(c) ? 'checked' : ''}> ${L('Hidden from {co}', { co: esc(coLabel(c)) })}</label>`).join('')}` : ''}
      <label class="inline"><input type="checkbox" data-change="pFlag" data-k="active" data-u="${esc(x.id)}" ${full.active ? 'checked' : ''}> ${L('Account switched on')}</label>
      ${isMe(x) || acct?.owner ? '' : `<div><button type="button" class="btn sm danger" data-act="rmPerson" data-u="${esc(x.id)}">${L('Remove from the project')}</button></div>`}
    </div>` : ''}
    ${loginLine}
  </div>${S.me.can.admin && full ? `<button class="btn sm" data-act="editPerson" data-u="${esc(x.id)}">${editing ? L('btn|Done') : L('Edit')}</button>` : ''}</div>`;
}

/* ================= task drawer ================= */
function renderDrawer() {
  const w = $('#drawerWrap'); if (!w) return;
  if (openReq) return renderReqDrawer(w);
  const t = openTask && T(openTask);
  if (!t) { openTask = null; w.innerHTML = ''; return; }
  const me = S.me, ed = t.can.edit, done = t.status === 'done', ro = ed ? '' : 'disabled';
  const pg = prog(t), cd = t.checklist.filter((c) => c.done).length;
  let actions = '';
  if (done) actions = `<span class="pill st-done">${L('Closed by {name}', { name: esc(nm(t.closedBy)) })}${t.closedAt ? ` · ${fmtS(localDay(t.closedAt))}` : ''}</span>${t.can.reopen ? (UI.confirm === 'reopen' ? `<input type="text" id="dt-reason" placeholder="${L('Why reopen? (required)')}" aria-label="${L('Why reopen? (required)')}" style="flex:1 1 200px"><button class="btn sm" data-act="reopen2">${L('Reopen')}</button><button class="btn sm ghost" data-act="cancelConfirm">${L('Cancel')}</button>` : `<button class="btn sm" data-act="reopen">${L('Reopen')}</button>`) : ''}`;
  else if (t.status === 'review' && t.can.close) actions = `<button class="btn ok" data-act="approve" data-id="${esc(t.id)}">${ic('check')} ${L('Approve & close')}</button>${UI.confirm === 'return' ? `<input type="text" id="dt-reason" placeholder="${L('What still needs doing?')}" aria-label="${L('What still needs doing?')}" style="flex:1 1 200px"><button class="btn sm" data-act="return2">${L('Send back')}</button><button class="btn sm ghost" data-act="cancelConfirm">${L('Cancel')}</button>` : `<button class="btn" data-act="return">${L('Send back')}</button>`}<span class="dr-note">${L('{names} marked this ready.', { names: esc(t.assignees.map(nm).join(', ')) })}</span>`;
  else if (t.can.close) actions = `<button class="btn ok" data-act="complete" data-id="${esc(t.id)}">${ic('check')} ${L('Mark complete')}</button>`;
  else if (t.status === 'review') actions = `<span class="pill st-review">${L('Waiting for sign-off from {name} or a lead', { name: esc(nm(t.creator)) })}</span>`;
  else if (ed) actions = `<button class="btn primary" data-act="complete" data-id="${esc(t.id)}">${ic('check')} ${L('Send for sign-off')}</button><span class="dr-note">${L('{name} (owner), a lead, a manager or admin closes this task.', { name: esc(nm(t.creator)) })}</span>`;
  const sel = (id, k, opts, val) => `<select id="${id}" data-change="tf" data-k="${k}" ${ro}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const parent = t.parentId && T(t.parentId);
  const children = S.tasks.filter((x) => x.parentId === t.id);
  w.innerHTML = `<div class="overlay" data-act="backdrop"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="${L('Task {id}', { id: esc(t.id) })}">
    <div class="dr-head"><span class="mono">${esc(t.id)}</span><span class="pill st-${t.status}">${stL(t.status)}</span>${kindBadge(t)}${t.repeatDays ? `<span class="chip">${ic('rep', 'style="width:13px;height:13px"')} ${esc(repeatLabel(t.repeatDays))}</span>` : ''}<button class="icon-btn" data-act="closeDrawer" aria-label="${L('Close')}" title="${L('Close')}">${ic('x')}</button></div>
    <div class="dr-body">
      ${parent ? `<button class="btn sm ghost" data-act="open" data-id="${esc(parent.id)}" style="align-self:flex-start;white-space:normal;text-align:left">← ${L('Part of {id}: {title}', { id: esc(parent.id), title: esc(parent.title) })}</button>` : ''}
      <textarea id="dt-title" class="dr-title" data-change="tTitle" rows="2" ${ro} aria-label="${L('task|Title')}">${esc(t.title)}</textarea>
      <div class="dr-actions">${actions}</div>
      <div class="dr-note">${L('Created by {who}', { who: `${av(t.creator)} <b>${esc(nm(t.creator))}</b>${t.creator && !t.creator.masked ? ` (${esc(coName(t.creator))})` : ''}` })} · ${ago(t.createdAt)}${!ed && !done && me.can.create ? ` · ${L('You can comment but not change this task.')}` : ''}</div>
      <div class="fields">
        <div class="fld"><label for="dt-area">${L('Area')}</label>${sel('dt-area', 'area', S.areas.map((a) => [a.id, areaOf(a.id).name]), t.area)}</div>
        <div class="fld"><label for="dt-cat">${L('Bucket')}</label>${sel('dt-cat', 'category', S.categories.map((c) => [c.id, catOf(c.id).name]), t.category)}</div>
        <div class="fld"><label for="dt-prio">${L('Priority')}</label>${sel('dt-prio', 'priority', Object.keys(PRIO).map((k) => [k, priL(k)]), t.priority)}</div>
        <div class="fld"><label for="dt-status">${L('Status')}</label>${done || t.status === 'review' ? `<input type="text" id="dt-status" disabled value="${esc(stL(t.status))}">` : sel('dt-status', 'status', ['todo', 'doing', 'hold'].map((k) => [k, stL(k)]), t.status)}</div>
        <div class="fld"><label for="dt-start">${L('Start')}</label><input type="date" id="dt-start" data-change="tf" data-k="start" value="${t.start || ''}" ${ro}></div>
        <div class="fld"><label for="dt-due">${L('Due')}</label><input type="date" id="dt-due" data-change="tf" data-k="due" value="${t.due || ''}" ${ro}></div>
        <div class="fld"><label for="dt-fu">${L('Follow up on')}</label><input type="date" id="dt-fu" data-change="tf" data-k="followup" value="${t.followup || ''}" ${ro}></div>
        <div class="fld fld-rep"><label>${L('Repeat on')} <span class="muted">${esc(repeatLabel(t.repeatDays) || L('Does not repeat'))}</span></label>${dayChips('dt-rep', t.repeatDays, 'repDayTask', ro)}</div>
      </div>
      <div class="fb"><label>${L('Assigned to')} <span>${t.lead ? L('Lead: {name}', { name: esc(nm(t.lead)) }) : ''}</span></label><div class="chips">${t.assignees.map((p) => `<span class="chip">${av(p)} ${esc(nm(p))}${t.lead && p.id && t.lead.id === p.id ? ` <small class="muted">${L('lead')}</small>` : ''}${ed && p.id ? `${t.assignees.length > 1 && (!t.lead || t.lead.id !== p.id) ? `<button data-act="makeLead" data-u="${esc(p.id)}" title="${L('Make lead')}" aria-label="${L('Make {name} the lead', { name: esc(p.name) })}">★</button>` : ''}<button data-act="unassign" data-u="${esc(p.id)}" aria-label="${L('Remove {name}', { name: esc(p.name) })}">×</button>` : ''}</span>`).join('') || `<span class="muted">${L('Nobody yet')}</span>`}
        ${ed ? `<input type="text" id="dt-addass" data-mention="add-assignee" placeholder="${L('@ add person')}" aria-label="${L('@ add person')}" autocomplete="off">` : ''}</div>
        ${t.can.handoff ? (UI.reassign ? `<div class="cl-add"><input type="text" id="dt-reass" data-mention="reassign" placeholder="${L('@ who should take this over?')}" aria-label="${L('@ who should take this over?')}" autocomplete="off"><button class="btn sm ghost" data-act="reassignCancel">${L('Cancel')}</button></div><div class="hint" style="margin-top:4px">${L('You come off the task but can still follow it. {name} is told who has it now.', { name: esc(nm(t.creator)) })}</div>` : `<button class="btn sm" style="margin-top:8px" data-act="reassign">${L('Hand this to someone else')}</button>`) : ''}</div>
      <div class="fb"><label>${L('Progress')} <span>${t.autoProgress && t.checklist.length ? L('From checklist') : L('Your estimate')}</span></label><div class="prog-row"><input type="range" id="dt-prog" min="0" max="100" step="5" value="${pg}" data-input="tProg" data-change="tProgSave" ${ro || (t.autoProgress && t.checklist.length ? 'disabled' : '')} aria-label="${L('Progress')}"><b id="dt-progv">${pg}%</b></div>
        ${ed && !(t.autoProgress && t.checklist.length) ? `<div class="tog" style="margin-top:6px" role="group" aria-label="${L('Quick progress')}">${[0, 25, 50, 75, 100].map((v) => `<button type="button" class="${pg === v ? 'on' : ''}" data-act="setProg" data-v="${v}">${v}%</button>`).join('')}<span class="hint" style="align-self:center;margin-left:4px">${L('A rough estimate is fine. 100% does not close the task.')}</span></div>` : ''}
        ${t.checklist.length ? `<label class="inline" style="margin-top:4px"><input type="checkbox" id="dt-auto" data-change="tAuto" ${t.autoProgress ? 'checked' : ''} ${ro}> ${L('Work out progress from the checklist')}</label>` : ''}</div>
      <div class="fb"><label for="dt-desc">${L('Details')}</label><textarea id="dt-desc" rows="3" data-change="tf" data-k="description" placeholder="${ed ? L('Notes, drawing numbers, locations…') : L('No details')}" ${ro}>${esc(t.description)}</textarea></div>
      <div class="fb"><label>${L('Checklist')} <span>${t.checklist.length ? L('{a} of {b}', { a: cd, b: t.checklist.length }) : ''}</span></label>
        ${t.checklist.length ? `<div class="cl">${t.checklist.map((c) => `<div class="cl-i ${c.done ? 'done' : ''}"><input type="checkbox" data-change="clT" data-c="${esc(c.id)}" ${c.done ? 'checked' : ''} ${ro} aria-label="${L('Done')}"><span class="tx">${mentions(c.text)}</span>${ed ? `<button class="x" data-act="clDel" data-c="${esc(c.id)}" aria-label="${L('Delete step')}" title="${L('Delete step')}">×</button>` : ''}</div>`).join('')}</div>` : ''}
        ${ed ? `<div class="cl-add"><input type="text" id="dt-cl" data-mention="checklist" placeholder="${L('Add a step… (@name works here too)')}" aria-label="${L('Add a step')}" autocomplete="off"><button class="btn sm" data-act="clAdd">${L('Add')}</button></div>` : ''}</div>
      <div class="fb"><label>${L('Sub-tasks')} <span>${children.length || ''}</span></label>
        ${children.map((c) => `<div class="row" data-act="open" data-id="${esc(c.id)}" style="padding:6px 0;grid-template-columns:22px minmax(0,1fr) auto">${chk(c)}<div class="row-title">${esc(c.title)}</div><div class="due ${dueCls(c.due, c.status)}">${dueLabel(c.due)}</div></div>`).join('')}
        ${ed && t.kind === 'task' ? `<button class="btn sm" data-act="newChild" data-id="${esc(t.id)}">${L('+ Add a sub-task')}</button>` : children.length ? '' : `<span class="hint">${L('None')}</span>`}</div>
      <div class="fb"><label>${L('Who can see this')}</label>
        <div class="hint">${S.me.company === 'spp' ? L('The people on it, their leads, and SPP staff and above.') : L('The people on it, your company, and SPP management.')}</div>
        <div class="chips" style="margin-top:8px"><span class="hint">${L('Also shared with:')}</span>${t.shared.map((p) => `<span class="chip">${av(p)} ${esc(nm(p))}${t.can.manage && p.id ? `<button data-act="unshare" data-u="${esc(p.id)}" aria-label="${L('Remove {name}', { name: esc(p.name) })}">×</button>` : ''}</span>`).join('') || `<span class="hint">${L('nobody extra')}</span>`}
          ${t.can.manage && !done ? `<input type="text" id="dt-addsh" data-mention="add-shared" placeholder="${L('@ share with')}" aria-label="${L('@ share with')}" autocomplete="off">` : ''}</div></div>
      <div class="fb"><label>${L('Updates & comments')} <span>${t.comments.length || ''}</span></label>
        ${t.comments.map((c) => `<div class="cm">${av(c.by)}<div class="b"><div class="h"><b>${esc(nm(c.by))}</b> · ${ago(c.at)}</div><p>${mentions(c.body)}</p></div></div>`).join('')}
        ${t.can.comment ? `<div class="composer"><textarea id="dt-cm" rows="2" data-mention="comment" placeholder="${L('Write an update. Type @ to bring someone in.')}" aria-label="${L('Write an update')}"></textarea><div class="r"><span>${L('Ctrl + Enter to post')}</span><button class="btn sm primary" data-act="comment">${L('Post')}</button></div></div>` : ''}</div>
      <details class="log"><summary>${L('Activity ({n})', { n: t.history.length })}</summary><ul>${t.history.slice().reverse().map((h) => `<li><b>${esc(nm(h.by))}</b> ${esc(histText(h))} · ${ago(h.at)}</li>`).join('')}</ul></details>
      ${t.can.manage && !done ? `<div>${UI.confirm === 'del' ? `<button class="btn danger sm" data-act="delTask2">${L('Yes, delete {id}', { id: esc(t.id) })}</button> <button class="btn ghost sm" data-act="cancelConfirm">${L('Cancel')}</button>` : `<button class="btn ghost sm" data-act="delTask" style="color:var(--bad)">${L('Delete task')}</button>`}</div>` : ''}
    </div></aside>`;
}

function renderReqDrawer(w) {
  const r = R(openReq);
  if (!r) { openReq = null; w.innerHTML = ''; return; }
  const partner = S.me.company !== 'spp';
  w.innerHTML = `<div class="overlay" data-act="backdrop"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="${L('Request {id}', { id: esc(r.id) })}">
    <div class="dr-head"><span class="mono">${esc(r.id)}</span><span class="pill ${r.status === 'answered' ? 'st-review' : r.status === 'closed' ? 'st-done' : 'st-doing'}">${rqL(r.status)}</span><span class="kb ${partner ? 'from' : 'req'}">${partner ? L('Request from SPP') : L('Request to {co}', { co: esc(coName(r.recipient)) })}</span><button class="icon-btn" data-act="closeDrawer" aria-label="${L('Close')}" title="${L('Close')}">${ic('x')}</button></div>
    <div class="dr-body">
      <h2 style="font-size:24px">${esc(r.title)}</h2>
      <div class="dr-note">${L('{from} asked {to} ({co})', { from: `${av(r.sender)} <b>${esc(nm(r.sender))}</b>`, to: `${av(r.recipient)} <b>${esc(nm(r.recipient))}</b>`, co: esc(coName(r.recipient)) })} · ${ago(r.createdAt)}${r.due ? ` · ${L('reply needed by <b>{date}</b>', { date: fmtD(r.due) })}` : ''}</div>
      <div class="dr-actions">
        ${r.can.answer ? (UI.confirm === 'answer' ? '' : `<button class="btn ok" data-act="rqAnswer">${L('Mark as answered')}</button>`) : ''}
        ${r.can.close ? `<button class="btn ${r.status === 'answered' ? 'ok' : ''}" data-act="rqClose">${ic('check')} ${L('Close request')}</button>` : ''}
        ${r.can.reopen ? `<button class="btn" data-act="rqReopen">${L('Reopen')}</button>` : ''}
        ${!partner && r.followupTaskId ? `<button class="btn ghost" data-act="open" data-id="${esc(r.followupTaskId)}">${L('Internal follow-up {id}', { id: esc(r.followupTaskId) })}</button>` : ''}
      </div>
      ${r.message ? `<div class="fb"><label>${L('Request')}</label><div class="cm"><div class="b"><p>${esc(r.message)}</p></div></div></div>` : ''}
      <div class="fb"><label>${L('Replies')} <span>${r.messages.length || ''}</span></label>
        ${r.messages.map((m) => `<div class="cm">${av(m.by)}<div class="b"><div class="h"><b>${esc(nm(m.by))}</b> · ${ago(m.at)}</div><p>${esc(m.body)}</p></div></div>`).join('') || `<span class="hint">${L('No replies yet.')}</span>`}
        ${r.can.reply ? `<div class="composer"><textarea id="rq-msg" rows="2" placeholder="${partner ? L('Reply to SPP') : L('Write to {name}', { name: esc(nm(r.recipient)) })}" aria-label="${L('Reply')}"></textarea><div class="r"><span>${partner ? L('SPP sees your reply.') : L('They will see this. Keep private notes on the internal follow-up.')}</span><button class="btn sm primary" data-act="rqReply">${L('Send')}</button></div></div>` : ''}</div>
      <details class="log"><summary>${L('Activity ({n})', { n: r.history.length })}</summary><ul>${r.history.slice().reverse().map((h) => `<li><b>${esc(nm(h.by))}</b> ${esc(histText(h))} · ${ago(h.at)}</li>`).join('')}</ul></details>
    </div></aside>`;
}

/* ================= modals ================= */
function renderModal() {
  const w = $('#modalWrap'); if (!w) return;
  if (UI.modal === 'new') return renderNewTask(w);
  if (UI.modal === 'req') return renderNewReq(w);
  if (UI.modal === 'code' && UI.code) {
    const c = UI.code;
    w.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-label="${L('One-time code')}">
      <h2>${c.purpose === 'reset' ? L('Password reset code for {name}', { name: esc(c.name) }) : L('Setup code for {name}', { name: esc(c.name) })}</h2>
      <p>${c.expiresInDays ? L('Give this code to {name} privately (in person, by phone or a private message). It works once and expires in {n} days. It is shown only now.', { name: esc(c.name), n: esc(c.expiresInDays) }) : L('Give this code to {name} in person or by phone. It works once and expires in {n} minutes. It is shown only now.', { name: esc(c.name), n: esc(c.expiresInMinutes) })}</p>
      <textarea id="code-box" readonly rows="2" style="font-family:var(--f-mono);font-size:15px" aria-label="${L('One-time code')}">${esc(c.code)}</textarea>
      <div class="hint">${L('On the sign-in page they open <b>ตั้งหรือตั้งใหม่รหัสผ่าน</b> (Set or reset password), paste this code and choose a password of 15 characters or more. Then they sign in with username <b>{u}</b>.', { u: esc(c.username) })}${c.purpose === 'reset' ? ` ${L('Their old password and sessions have already stopped working.')}` : ''}</div>
      <div class="acts"><button class="btn" data-act="copyCode">${L('Copy code')}</button><button class="btn primary" data-act="closeCode">${L('btn|Done')}</button></div></div></div>`;
    return;
  }
  w.innerHTML = '';
}
function renderNewTask(w) {
  const dr = UI.draft, partner = S.me.company !== 'spp';
  const parent = dr.parentId && T(dr.parentId);
  w.innerHTML = `<div class="modal-back" data-act="backdropModal"><form class="modal" data-form="newtask" role="dialog" aria-modal="true" aria-label="${parent ? L('New sub-task') : L('New task')}">
    <h2>${parent ? L('New sub-task') : L('New task')}</h2>${parent ? `<div class="hint">${L('Part of {id}: {title}', { id: esc(parent.id), title: esc(parent.title) })}</div>` : ''}
    <div><input type="text" id="nt-title" data-mention="text" autocomplete="off" placeholder="${L('What needs doing? e.g. Pour pylon footing @A #sign !high')}" aria-label="${L('What needs doing?')}" required style="font-size:16px;padding:10px"></div>
    <div class="qa-prev" id="ntPrev" style="margin:0"></div>
    <div class="hint">${L('Shortcuts in the title: <code>@name</code> assign · <code>#canopy</code> area or bucket · <code>!urgent</code> priority · <code>due 12/11</code> date')}</div>
    <div class="grid3">
      <div class="fld"><label for="nt-area">${L('Area')}</label><select id="nt-area">${S.areas.map((a) => `<option value="${esc(a.id)}" ${dr.area === a.id ? 'selected' : ''}>${esc(areaOf(a.id).name)}</option>`).join('')}</select></div>
      <div class="fld"><label for="nt-cat">${L('Bucket')}</label><select id="nt-cat">${S.categories.filter((c) => !c.archived).map((c) => `<option value="${esc(c.id)}" ${dr.category === c.id ? 'selected' : ''}>${esc(catOf(c.id).name)}</option>`).join('')}</select></div>
      <div class="fld"><label for="nt-prio">${L('Priority')}</label><select id="nt-prio">${Object.keys(PRIO).map((k) => `<option value="${k}" ${dr.priority === k ? 'selected' : ''}>${priL(k)}</option>`).join('')}</select></div>
      <div class="fld"><label for="nt-start">${L('Start')}</label><input type="date" id="nt-start" value="${iso(TODAY)}"></div>
      <div class="fld"><label for="nt-due">${L('Due')}</label><input type="date" id="nt-due" value="${d(7)}"></div>
      <div class="fld"><label for="nt-fu">${L('Follow up on')}</label><input type="date" id="nt-fu" value=""></div>
    </div>
    <div class="fb"><label>${L('Repeat on')} <span id="nt-rep-note">${L('Pick days to repeat (optional). Each chosen morning at 6:00 a new copy appears with a reminder on the bell.')}</span></label>${dayChips('nt-rep', '', 'repDayNew')}</div>
    <div class="fb"><label>${L('Assign to')} <span>${L('The first person is the lead')}</span></label><div class="chips" id="ntAss"></div></div>
    <div class="fb"><label for="nt-desc">${L('Details')}</label><textarea id="nt-desc" rows="2" placeholder="${L('Drawing refs, location, notes')}"></textarea></div>
    <div class="fb"><label for="nt-cl">${L('Checklist')} <span>${L('one step per line')}</span></label><textarea id="nt-cl" rows="3" placeholder="${L('Rebar inspected&#10;Anchor bolts set&#10;Cube samples × 6')}"></textarea></div>
    ${partner ? `<div class="hint">${L('Only your company, the SPP people you assign and SPP management will see this.')}</div>` : `<div class="hint">${L('To ask Caltex, KS or the land owner for something, use <b>New request</b> on the Requests page.')}</div>`}
    <div class="acts"><button type="button" class="btn ghost" data-act="closeModal">${L('Cancel')}</button><button class="btn primary" type="submit">${L('Create task')}</button></div>
  </form></div>`;
  renderNtAss(); setTimeout(() => $('#nt-title')?.focus(), 30);
}
function renderNtAss() { const el = $('#ntAss'); if (!el) return; el.innerHTML = UI.draft.assignees.map((id) => { const p = person(id); return `<span class="chip">${av(p)} ${esc(nm(p))}<button type="button" data-act="ntUn" data-u="${esc(id)}" aria-label="${L('Remove {name}', { name: esc(nm(p)) })}">×</button></span>`; }).join('') + `<input type="text" id="nt-ass" data-mention="nt-assign" placeholder="${L('@ add person')}" aria-label="${L('@ add person')}" autocomplete="off">`; }
function openNew(preset, parentId) {
  const partner = S.me.company !== 'spp';
  UI.draft = { area: 'misc', category: partner ? 'client' : 'general', priority: 'normal', assignees: [], parentId: parentId || null };
  if (parentId) { const p = T(parentId); if (p) Object.assign(UI.draft, { area: p.area, category: p.category }); }
  if (preset) {
    const [g, k] = preset.split(':');
    if (g === 'area') UI.draft.area = k; else if (g === 'cat') UI.draft.category = k; else if (g === 'prio') UI.draft.priority = k;
    else if (g === 'person' && person(k)?.canAssign) UI.draft.assignees = [k];
  }
  UI.modal = 'new'; UI.pop = null; renderTop(); renderModal();
}
function renderNewReq(w) {
  const to = S.people.filter((p) => p.canRequest);
  w.innerHTML = `<div class="modal-back" data-act="backdropModal"><form class="modal" data-form="newreq" role="dialog" aria-modal="true" aria-label="${L('New request')}">
    <h2>${L('New request')}</h2>
    <div class="hint">${L('Ask for an approval, review or sign-off. It stays on your Requests page as a reminder until you close it.')}</div>
    <div class="fld"><label for="rq-to">${L('Send to')}</label><select id="rq-to" required>${to.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(coName(p))}${titleOf(p) ? ` (${esc(titleOf(p))})` : ''}</option>`).join('')}</select></div>
    <div class="fld"><label for="rq-title">${L('What do you need?')}</label><input type="text" id="rq-title" required placeholder="${L('e.g. Sign off progress payment claim #3')}"></div>
    <div class="fld"><label for="rq-body">${L('Message (they will see this)')}</label><textarea id="rq-body" rows="3"></textarea></div>
    <div class="grid3"><div class="fld"><label for="rq-due">${L('Reply needed by')}</label><input type="date" id="rq-due" value="${d(3)}"></div>
      <div class="fld"><label for="rq-fu">${L('Remind me on')}</label><input type="date" id="rq-fu" value="${d(3)}"></div>
      <div class="fld"><label for="rq-area">${L('Area')}</label><select id="rq-area">${S.areas.map((a) => `<option value="${esc(a.id)}" ${a.id === 'misc' ? 'selected' : ''}>${esc(areaOf(a.id).name)}</option>`).join('')}</select></div></div>
    <div class="fld"><label for="rq-note">${L('Private note (SPP only, never shown to them)')}</label><textarea id="rq-note" rows="2" placeholder="${L('e.g. Chase at Thursday meeting if not signed')}"></textarea></div>
    <div class="acts"><button type="button" class="btn ghost" data-act="closeModal">${L('Cancel')}</button><button class="btn primary" type="submit">${L('Send request')}</button></div>
  </form></div>`;
  setTimeout(() => $('#rq-title')?.focus(), 30);
}

/* ================= quick-text parsing ================= */
// Tags may be typed in English (#canopy, #safety) or Thai (#แคนโนปี้, #ความปลอดภัย).
const TAG_RE = /(^|\s)#([A-Za-z฀-๿][\w฀-๿-]*)/g;
const tagHit = (x, k, h, kind) => norm(x.id) === k || norm(x.name) === k || (k.length > 2 && norm(x.name).startsWith(k)) || tagMatchesTh(kind, x.id, h);
function parseQuick(text) {
  const r = { assignees: [], warn: [], area: null, category: null, priority: null, due: null, title: text };
  r.title = r.title.replace(/(^|\s)@([A-Za-z][\w.]*)/g, (m, sp, h) => { const p = findPerson(h); if (!p || !p.canAssign) { r.warn.push(p && p.canRequest ? L('{name} is outside SPP. Send a request instead', { name: p.name }) : L('No one called “{name}” you can assign', { name: h })); return m; } if (!r.assignees.includes(p.id)) r.assignees.push(p.id); return sp; });
  r.title = r.title.replace(TAG_RE, (m, sp, h) => { const k = norm(h); const a = S.areas.find((x) => tagHit(x, k, h, 'area')); if (a && !r.area) { r.area = a.id; return sp; } const c = S.categories.find((x) => tagHit(x, k, h, 'cat')); if (c && !r.category) { r.category = c.id; return sp; } return m; });
  const PRIO_WORD = { urgent: 'urgent', high: 'high', normal: 'normal', low: 'low', 'ด่วน': 'urgent', 'สูง': 'high', 'ปกติ': 'normal', 'ต่ำ': 'low' };
  r.title = r.title.replace(/(^|\s)!(urgent|high|normal|low|ด่วน|สูง|ปกติ|ต่ำ)(?=\s|$)/i, (m, sp, p) => { r.priority = PRIO_WORD[p.toLowerCase()]; return sp; });
  r.title = r.title.replace(/(^|\s)(?:due|by|กำหนด|ภายใน)\s*:?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/i, (m, sp, dd, mm, yy) => { const y = yy ? (+yy < 100 ? 2000 + +yy : +yy) : TODAY.getFullYear(); let dt = new Date(y, +mm - 1, +dd); if (dt.getDate() !== +dd || dt.getMonth() !== +mm - 1) { r.warn.push(L('{date} is not a real date', { date: `${dd}/${mm}` })); return m; } if (!yy && daysFrom(iso(dt)) < -60) dt = new Date(y + 1, +mm - 1, +dd); r.due = iso(dt); return sp; });
  r.title = r.title.replace(/(^|\s)(?:กำหนด|ภายใน)\s*(วันนี้|พรุ่งนี้)(?=\s|$)/, (m, sp, w) => { r.due = d(w === 'วันนี้' ? 0 : 1); return sp; });
  r.title = r.title.replace(/(^|\s)(?:due|by)\s+(today|tomorrow|mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i, (m, sp, w) => { w = w.toLowerCase(); if (w === 'today') r.due = d(0); else if (w === 'tomorrow') r.due = d(1); else { const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(w); r.due = d((idx - TODAY.getDay() + 7) % 7 || 7); } return sp; });
  r.title = r.title.replace(/\s+/g, ' ').trim();
  return r;
}
function previewHTML(r) {
  const bits = [];
  r.assignees.forEach((id) => bits.push(`<span class="chip">${av(person(id))} ${esc(nm(person(id)))}</span>`));
  if (r.area) bits.push(`<span class="chip"><span class="tag" style="--c:${areaOf(r.area).c}">${esc(areaOf(r.area).name)}</span></span>`);
  if (r.category) bits.push(`<span class="chip">${esc(catOf(r.category).name)}</span>`);
  if (r.priority) bits.push(`<span class="chip"><span class="pri pri-${r.priority}">${priL(r.priority)}</span></span>`);
  if (r.due) bits.push(`<span class="chip">${L('Due {date}', { date: fmtD(r.due) })}</span>`);
  r.warn.forEach((w) => bits.push(`<span class="warn">${esc(w)}</span>`));
  return bits.join('');
}

/* ================= mention popup ================= */
const MP = { input: null, items: [], idx: 0, start: 0 };
function mpCands(mode) {
  let list = S.people.filter((p) => p.id && !p.inactive);
  const t = openTask && T(openTask);
  if (['text', 'nt-assign', 'add-assignee', 'reassign', 'add-shared'].includes(mode)) list = list.filter((p) => p.canAssign);
  if ((mode === 'add-assignee' || mode === 'reassign') && t) list = list.filter((p) => !t.assignees.some((a) => a.id === p.id) && !(mode === 'reassign' && isMe(p))); // you can add yourself; you cannot hand a task over to yourself
  if (mode === 'add-shared' && t) list = list.filter((p) => ![t.creator, t.lead, ...t.assignees, ...t.shared].some((a) => a && a.id === p.id));
  if (mode === 'nt-assign') list = list.filter((p) => !UI.draft.assignees.includes(p.id));
  return list;
}
function updateMP(el) {
  const mode = el.dataset.mention, direct = ['add-assignee', 'add-shared', 'nt-assign', 'reassign'].includes(mode);
  let q;
  if (direct) { q = el.value.replace(/^@/, '').trim(); MP.start = 0; } else {
    const pos = el.selectionStart, m = el.value.slice(0, pos).match(/(^|\s)@([\w.]*)$/);
    if (!m) { hideMP(); return; } q = m[2]; MP.start = pos - q.length - 1;
  }
  const k = norm(q);
  const rank = (p) => (norm(p.name).startsWith(k) || (p.aliases || []).some((a) => norm(a).startsWith(k)) ? 0 : 1);
  const items = mpCands(mode).filter((p) => !k || rank(p) === 0 || norm(p.title || '').includes(k) || norm(coName(p)).startsWith(k) || norm(COMPANY[p.company]?.name || '').startsWith(k)).sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  MP.input = el; MP.items = items; MP.idx = 0;
  const pop = $('#mp');
  pop.innerHTML = items.length ? items.map((p, i) => `<div class="opt ${i === 0 ? 'on' : ''}" data-i="${i}">${av(p)}<div><b>${esc(p.name)}</b><small>${esc(titleOf(p))}${titleOf(p) ? ' · ' : ''}${esc(coName(p))}</small></div></div>`).join('') : `<div class="none">${mode === 'add-shared' ? L('Everyone you can add already sees this task.') : L('Nobody you can pick matches “{q}”.', { q: esc(q) })}</div>`;
  const r = el.getBoundingClientRect(); pop.hidden = false;
  const ph = pop.offsetHeight; let top = r.bottom + 4; if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 4);
  pop.style.top = `${top}px`; pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 280))}px`;
}
function hideMP() { const p = $('#mp'); if (p) p.hidden = true; MP.input = null; MP.items = []; }
function pickMP(i) {
  const p = MP.items[i], el = MP.input; if (!p || !el) return;
  const mode = el.dataset.mention, t = openTask && T(openTask);
  hideMP();
  if (mode === 'add-assignee') return taskAct(t, 'assign', { person: p.id }, L('{name} assigned.', { name: p.name })).then(() => setTimeout(() => $('#dt-addass')?.focus(), 0));
  if (mode === 'reassign') { UI.reassign = false; return taskAct(t, 'handoff', { person: p.id }, L('Handed to {name}.', { name: p.name })); }
  if (mode === 'add-shared') return taskAct(t, 'share', { person: p.id }, L('Shared with {name}.', { name: p.name }));
  if (mode === 'nt-assign') { UI.draft.assignees.push(p.id); renderNtAss(); $('#nt-ass')?.focus(); return; }
  const v = el.value, pos = el.selectionStart, ins = `@${p.name} `;
  el.value = v.slice(0, MP.start) + ins + v.slice(pos); const c = MP.start + ins.length; el.setSelectionRange(c, c); el.focus();
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ================= events ================= */
const closeAll = () => { openTask = null; openReq = null; UI.confirm = null; UI.reassign = false; renderDrawer(); };
const ACT = {
  // New task: choosing days sets the due date to the next chosen day (the first reminder).
  repDayNew: (el) => {
    el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
    const days = chosenDays('nt-rep'), due = $('#nt-due');
    if (days.length && due) { due.value = nextOn(days); due.dispatchEvent(new Event('input', { bubbles: true })); }
    const note = $('#nt-rep-note'); if (note) note.textContent = days.length ? `${repeatLabel(days.join(''))} · ${L('reminder at 6:00 on each chosen day')}` : L('Pick days to repeat (optional). Each chosen morning at 6:00 a new copy appears with a reminder on the bell.');
  },
  repDayTask: (el) => {
    const t = openTask && T(openTask); if (!t) return;
    el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
    taskAct(t, 'update', { fields: { repeatDays: chosenDays('dt-rep') } });
  },
  view: (el) => { UI.view = el.dataset.v; closeAll(); saveUI(); renderNav(); renderMain(); window.scrollTo(0, 0); },
  pop: (el) => { UI.pop = UI.pop === el.dataset.p ? null : el.dataset.p; UI.notifEarlier = false; renderTop(); },
  notifEarlier: () => { UI.notifEarlier = !UI.notifEarlier; renderTop(); },
  layout: (el) => { UI.layout = el.dataset.v; saveUI(); document.body.className = `layout-${UI.layout}`; renderTop(); },
  // Remember the choice on this device only; picking your server default again clears the override.
  lang: (el) => { const v = el.dataset.v; rememberLang(v === (S.me.lang || 'th') ? null : v, S.me.id); applyLang(); render(); },
  signout: async () => { try { await fetch('/api/local-auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Project-Auth': '1' }, body: '{}' }); } catch { /* ignore */ } location.href = '/sign-in.html'; },
  readAll: () => act('notifications/read', {}),
  notif: async (el) => { const n = S.notifications.find((x) => String(x.id) === el.dataset.n); UI.pop = null; if (n) { if (n.taskId) { openTask = n.taskId; openReq = null; } else if (n.requestId) { openReq = n.requestId; openTask = null; } await act('notifications/read', { ids: [n.id] }); } else renderTop(); },
  new: (el) => openNew(el.dataset.preset),
  newChild: (el) => openNew(null, el.dataset.id),
  newReq: () => { UI.modal = 'req'; renderModal(); },
  closeModal: () => { UI.modal = null; renderModal(); },
  backdropModal: (el, e) => { if (e.target === el) { UI.modal = null; renderModal(); } },
  backdrop: (el, e) => { if (e.target === el) closeAll(); },
  open: (el) => { openTask = el.dataset.id; openReq = null; UI.confirm = null; UI.reassign = false; renderDrawer(); },
  openReq: (el) => { openReq = el.dataset.id; openTask = null; UI.confirm = null; renderDrawer(); },
  closeDrawer: closeAll,
  complete: (el) => {
    const t = T(el.dataset.id); if (!t) return; if (t.status === 'review' && !t.can.close) return toast(L('Already waiting for sign-off.'));
    el.classList.add('wait'); el.disabled = true;
    // Waits its turn if another save is running (several sub-tasks ticked in a row); uses the task as it is by then.
    inTurn(() => { const x = T(t.id); if (!x || x.status === 'done' || (x.status === 'review' && !x.can.close)) return null; const closing = x.can.close; return taskAct(x, closing ? 'complete' : 'submit', {}, closing ? L('{id} closed and moved to History.', { id: x.id }) : L('{id} sent for sign-off.', { id: x.id })); })
      .finally(() => { el.classList.remove('wait'); el.disabled = false; });
  },
  approve: (el) => { const t = T(el.dataset.id); taskAct(t, 'approve', {}, (r) => `${L('{id} closed.', { id: t.id })}${r.next ? ` ${L('Next week’s copy is {id}.', { id: r.next })}` : ''}`); },
  return: () => { UI.confirm = 'return'; renderDrawer(); setTimeout(() => $('#dt-reason')?.focus(), 0); },
  return2: () => { const t = T(openTask); UI.confirm = null; taskAct(t, 'return', { reason: $('#dt-reason')?.value || '' }, L('{id} sent back.', { id: t.id })); },
  reopen: () => { UI.confirm = 'reopen'; renderDrawer(); setTimeout(() => $('#dt-reason')?.focus(), 0); },
  reopen2: () => { const t = T(openTask), reason = ($('#dt-reason')?.value || '').trim(); if (reason.length < 3) return toast(L('Write why the task is being reopened.'), null, 'warn'); UI.confirm = null; taskAct(t, 'reopen', { reason }, L('{id} reopened.', { id: t.id })); },
  reassign: () => { UI.reassign = true; renderDrawer(); setTimeout(() => $('#dt-reass')?.focus(), 0); },
  reassignCancel: () => { UI.reassign = false; renderDrawer(); },
  unassign: (el) => taskAct(T(openTask), 'unassign', { person: el.dataset.u }),
  makeLead: (el) => taskAct(T(openTask), 'lead', { person: el.dataset.u }),
  unshare: (el) => taskAct(T(openTask), 'unshare', { person: el.dataset.u }),
  setProg: (el) => { const t = T(openTask); taskAct(t, 'progress', { progress: Number(el.dataset.v) }, Number(el.dataset.v) === 100 ? (t.can.close ? L('At 100%. Press “Mark complete” to close it.') : L('At 100%. Use “Send for sign-off” when it is ready.')) : null); },
  clAdd: async () => { const el = $('#dt-cl'), v = el?.value.trim(); if (!v) return; el.value = ''; const ok = await taskAct(T(openTask), 'checklist_add', { text: v }); const e = $('#dt-cl'); if (e) { if (!ok && !e.value) e.value = v; e.focus(); } },
  clDel: (el) => taskAct(T(openTask), 'checklist_delete', { itemId: el.dataset.c }),
  comment: async () => { const el = $('#dt-cm'), v = el?.value.trim(); if (!v) return; el.value = ''; if (!(await taskAct(T(openTask), 'comment', { body: v }))) { const e = $('#dt-cm'); if (e && !e.value) e.value = v; } },
  delTask: () => { UI.confirm = 'del'; renderDrawer(); },
  delTask2: () => { const t = T(openTask); UI.confirm = null; openTask = null; taskAct(t, 'delete', {}, L('{id} deleted.', { id: t.id })); },
  cancelConfirm: () => { UI.confirm = null; renderDrawer(); },
  rqAnswer: () => { const r = R(openReq); reqAct(r, 'answer', { body: $('#rq-msg')?.value || '' }, L('Marked as answered.')); },
  rqClose: () => { const r = R(openReq); reqAct(r, 'close', {}, L('{id} closed.', { id: r.id })); },
  rqReopen: () => { const r = R(openReq); reqAct(r, 'reopen', {}, L('{id} reopened.', { id: r.id })); },
  rqReply: async () => { const el = $('#rq-msg'), v = el?.value.trim(); if (!v) return; el.value = ''; if (!(await reqAct(R(openReq), 'reply', { body: v }, L('Sent.')))) { const e = $('#rq-msg'); if (e && !e.value) e.value = v; } },
  groupBy: (el) => { UI.groupBy = el.dataset.v; saveUI(); renderMain(); },
  listSort: (el) => { UI.listSort = el.dataset.v; saveUI(); renderMain(); },
  clearF: () => { UI.f = { q: '', area: '', cat: '', person: '', mine: false }; saveUI(); renderMain(); },
  goMine: () => { UI.view = 'list'; UI.listSort = 'due'; UI.f = { q: '', area: '', cat: '', person: S.me.id, mine: false }; saveUI(); renderNav(); renderMain(); },
  goPerson: (el) => { UI.view = 'list'; UI.listSort = 'due'; UI.f = { q: '', area: '', cat: '', person: el.dataset.u, mine: false }; saveUI(); renderNav(); renderMain(); window.scrollTo(0, 0); },
  scrollSign: () => $('#signPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  calNav: (el) => { const v = +el.dataset.v; if (!v) { UI.calMonth = null; UI.calSel = iso(TODAY); } else { const b = UI.calMonth ? pd(`${UI.calMonth}-01`) : new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); const n = new Date(b.getFullYear(), b.getMonth() + v, 1); UI.calMonth = `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; } renderBody(); },
  calSel: (el) => { UI.calSel = el.dataset.v; renderBody(); },
  ntUn: (el) => { UI.draft.assignees = UI.draft.assignees.filter((x) => x !== el.dataset.u); renderNtAss(); },
  apBoss: (el) => { const set = new Set(UI.apBoss || []); if (set.has(el.dataset.t)) set.delete(el.dataset.t); else set.add(el.dataset.t); UI.apBoss = [...set]; el.classList.toggle('on'); },
  viewAsStart: async (el) => {
    try {
      const r = await gateFetch('/api/view-as', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tasks' }, body: JSON.stringify({ person: el.dataset.u }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); toast(trMsg(gateMsg(d.error) || 'Something went wrong.'), null, 'warn'); return; }
      location.href = '/';
    } catch { toast(L('Something went wrong.'), null, 'warn'); }
  },
  backupRun: async () => {
    // The first backup copies every stored file; the server works in 20-second pieces and this keeps asking until done.
    if (UI.backupBusy) return; UI.backupBusy = true; UI.backupProgress = L('Saving the data…'); renderBody();
    let problems = 0, idle = 0;
    try {
      for (let piece = 0; piece < 300; piece++) {
        const r = await backupPost('run', { continue: piece > 0 });
        if (!r) break;
        const { report } = await r.json(), f = report.files || {};
        problems += (report.errors || []).length;
        if (!f.waiting) { toast(problems ? L('Backup finished with {n} problems. See the list below.', { n: problems }) : L('Backup done.'), null, problems ? 'warn' : ''); break; }
        // A piece that copied nothing: try again (twice) unless it reported problems.
        idle = f.copied ? 0 : idle + 1;
        if (idle && ((report.errors || []).length || idle > 2)) { toast(L('Backup stopped: files could not be copied. See the list below.'), null, 'warn'); break; }
        UI.backupProgress = L('Copying files… {n} left. Keep this page open.', { n: f.waiting }); renderBody();
      }
    } catch { toast(L('The backup was interrupted. Press Back up now again; it continues where it stopped.'), null, 'warn'); }
    finally { UI.backupBusy = false; UI.backupProgress = null; }
    loadBackup();
  },
  backupDownload: async () => {
    if (UI.backupBusy) return; const files = !!$('#bk-files')?.checked; UI.backupBusy = true; renderBody(); toast(L('Preparing the download… keep this page open.'));
    try {
      const r = await backupPost('download', { files });
      if (!r) return;
      const name = (/filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '') || [])[1] || 'calwwt-backup.zip';
      const url = URL.createObjectURL(await r.blob()), a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast(L('Downloaded {name}.', { name }));
    } catch { toast(L('The download did not finish. Try again.'), null, 'warn'); }
    finally { UI.backupBusy = false; renderBody(); }
  },
  signinHist: async (el) => {
    const id = el.dataset.u;
    if (UI.histFor === id) { UI.histFor = null; renderBody(); return; }
    UI.histFor = id; HIST.delete(id); renderBody();
    try { const r = await api(`../task-accounts/history?personId=${encodeURIComponent(id)}`); HIST.set(id, r.events); } catch (e) { const x = []; x.error = e.message; HIST.set(id, x); }
    if (UI.histFor === id) renderBody();
  },
  adminTab: (el) => { UI.adminTab = el.dataset.v; closeAll(); saveUI(); renderNav(); renderMain(); window.scrollTo(0, 0); if (UI.adminTab === 'people' || UI.adminTab === 'signins') loadAccounts(); if (UI.adminTab === 'backup') loadBackup(); },
  adminEditPerson: (el) => { UI.adminTab = 'people'; UI.editPerson = el.dataset.u; saveUI(); renderNav(); renderMain(); loadAccounts(); setTimeout(() => document.querySelector(`[data-act="editPerson"][data-u="${CSS.escape(el.dataset.u)}"]`)?.scrollIntoView({ block: 'center' }), 50); },
  editPerson: (el) => { UI.editPerson = UI.editPerson === el.dataset.u ? null : el.dataset.u; renderBody(); },
  lgStart: (el) => { UI.confirm = `login:${el.dataset.u}`; renderBody(); setTimeout(() => $('#lg-user')?.select(), 0); },
  lgCreate: async (el) => { const username = $('#lg-user')?.value.trim().toLowerCase(); UI.confirm = null; await accountAct('create', { personId: el.dataset.u, username }, L('Login “{u}” created. Now issue a setup code.', { u: username })); },
  lgCode: async (el) => { const r = await accountAct('code', { personId: el.dataset.u }); if (r) { UI.modal = 'code'; UI.code = { ...r, name: nm(person(el.dataset.u)) }; renderModal(); } },
  lgTwoOff: async (el) => { if (await siteConfirm(L('Remove 2-step sign-in for {name}? Use this only if they lost their phone and their recovery codes. They can then sign in with the password alone and set it up again.', { name: nm(person(el.dataset.u)) }))) accountAct('two-step-off', { personId: el.dataset.u }, L('2-step sign-in removed.')); },
  // Remove from the project (Brian, 15 Nov 2026): one step switches the person and their login off and gives their open tasks to this admin.
  rmPerson: async (el) => {
    const p = person(el.dataset.u), name = nm(p);
    const n = S.tasks.filter((t) => t.status !== 'done' && t.assignees.some((a) => a.id === p.id)).length;
    if (!(await siteConfirm(L('Remove {name} from the project? Their account and login are switched off, they are signed out everywhere, and their reporting lines and personal page settings are cleared. Their open tasks ({n}) are given to you. Closed tasks and the history keep their name.', { name, n }), { danger: true }))) return;
    const r = await act(`admin/people/${encodeURIComponent(p.id)}/remove`, {}, (res) => L('{name} removed from the project. Tasks now yours: {n}.', { name, n: res.moved.length }));
    if (r) { UI.editPerson = null; renderBody(); loadAccounts(); }
  },
  lgOff: (el) => accountAct('disable', { personId: el.dataset.u }, L('Login switched off. They are signed out everywhere.')),
  lgOn: (el) => accountAct('enable', { personId: el.dataset.u }, L('Login switched on.')),
  agentNew: async () => { const r = await agentPost('/api/agent-keys'); if (r) { AGENT.newKey = r.key; await loadAgent(); } },
  agentRevoke: async (el) => { if (!(await siteConfirm(L('Revoke this key? Chief stops working until you give it a new key.'), { danger: true }))) return; if (await agentPost(`/api/agent-keys/${encodeURIComponent(el.dataset.id)}/revoke`)) { toast(L('Key revoked.')); await loadAgent(); } },
  agentCopy: async () => { try { await navigator.clipboard.writeText(AGENT.newKey); toast(L('Copied.')); } catch { const el = $('#agent-key-box'); if (el) { el.focus(); el.select(); } } },
  agentHide: () => { AGENT.newKey = null; renderBody(); },
  copyCode: async () => { const c = UI.code?.code; try { await navigator.clipboard.writeText(c); toast(L('Copied.')); } catch { const el = $('#code-box'); if (el) { el.focus(); el.select(); } toast(L('Select the code and copy it.')); } },
  closeCode: () => { UI.code = null; UI.modal = null; renderModal(); },
  pBoss: (el) => toggleList(el, 'reportsTo'),
  pFollow: (el) => toggleList(el, 'follows'),
  pContact: (el) => toggleList(el, 'requestContacts'),
};
function toggleList(el, key) {
  const p = S.admin.people.find((x) => x.id === el.dataset.u), v = el.dataset.t;
  let list = p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v];
  if (key === 'requestContacts' && v === '*') list = p[key].includes('*') ? [] : ['*'];
  act(`admin/people/${encodeURIComponent(p.id)}`, { [key]: list }, L('Saved.'));
}

document.addEventListener('click', (e) => {
  if (!S) return;
  if (UI.pop && !e.target.closest('.pop-root')) { UI.pop = null; renderTop(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (f) { e.stopPropagation(); f(el, e); }
});
document.addEventListener('mousedown', (e) => { if (e.target.closest('#mp')) { e.preventDefault(); const o = e.target.closest('#mp .opt'); if (o) pickMP(+o.dataset.i); } });
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.mention !== undefined) updateMP(el);
  if (el.id === 'qa') { const p = $('#qaPrev'); if (p) p.innerHTML = el.value.trim() ? previewHTML(parseQuick(el.value)) : ''; }
  if (el.id === 'nt-title') { const p = $('#ntPrev'); if (p) p.innerHTML = el.value.trim() ? previewHTML(parseQuick(el.value)) : ''; }
  const k = el.dataset.input;
  if (k === 'fq') { UI.f.q = el.value; renderBody(); }
  else if (k === 'hq') { UI.hq = el.value; const pos = el.selectionStart; renderBody(); const n = $('#h-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  else if (k === 'tProg') { const v = $('#dt-progv'); if (v) v.textContent = `${el.value}%`; }
});
document.addEventListener('change', (e) => {
  const el = e.target, k = el.dataset.change; if (!k) return;
  if (k === 'filt') { UI.f[el.dataset.k] = el.value; saveUI(); renderMain(); return; }
  if (k === 'fmine') { UI.f.mine = el.checked; saveUI(); renderBody(); return; }
  if (k === 'harea') { UI.harea = el.value; renderBody(); return; }
  if (k === 'viewAs') { api('../tasks-staging/view-as', { person: el.value || null }).then(async (r) => { STAGING.viewAs = r.viewAs; openTask = null; openReq = null; UI.view = 'home'; await reload(); render(); toast(r.viewAs ? L('Now viewing as {name}.', { name: S.me.name }) : L('Back to yourself.')); }).catch((e) => toast(trMsg(e.message), null, 'warn')); return; }
  if (k === 'pLevel') { act(`admin/people/${encodeURIComponent(el.dataset.u)}`, { level: el.value }, L('Saved.')); return; }
  if (k === 'pTitle') { act(`admin/people/${encodeURIComponent(el.dataset.u)}`, { title: el.value }, L('Saved.')); return; }
  if (k === 'pLang') { act(`admin/people/${encodeURIComponent(el.dataset.u)}`, { language: el.value }, L('Saved.')).then((r) => { if (r && el.dataset.u === S.me.id) { applyLang(); refresh(); } }); return; }
  if (k === 'pHide') { const p = S.admin.people.find((x) => x.id === el.dataset.u); const list = new Set(p.hiddenFrom || []); if (el.checked) list.add(el.dataset.c); else list.delete(el.dataset.c); act(`admin/people/${encodeURIComponent(p.id)}`, { hiddenFrom: [...list] }, L('Saved.')); return; }
  if (k === 'apCo') { UI.apCo = el.value; const keep = { name: $('#ap-name')?.value || '', title: $('#ap-title')?.value || '' }; renderBody(); if ($('#ap-name')) { $('#ap-name').value = keep.name; $('#ap-title').value = keep.title; } return; }
  if (k === 'checkPerson') { if (!el.value) { PREVIEW = null; renderBody(); return; } api(`admin/preview?person=${encodeURIComponent(el.value)}`).then((r) => { PREVIEW = r; renderBody(); }).catch((e) => { PREVIEW = { error: e.message, person: { id: el.value } }; renderBody(); }); return; }
  if (k === 'pageGroup') { act('admin/pages', { subject: `group:${el.dataset.g}`, page: el.dataset.p, level: el.value }, L('Saved.')); return; }
  if (k === 'pagePerson') { act('admin/pages', { subject: `person:${el.dataset.u}`, page: el.dataset.p, level: el.value === 'group' ? null : el.value }, L('Saved.')); return; }
  if (k === 'pFlag') { act(`admin/people/${encodeURIComponent(el.dataset.u)}`, { [el.dataset.k]: el.checked }, L('Saved.')); return; }
  const t = openTask && T(openTask); if (!t) return;
  // Changes made in a row wait their turn (each one is sent with the task as it is after the one before), so none is lost.
  const later = (fn) => { const id = t.id; inTurn(() => { const x = T(id); return x ? fn(x) : null; }); };
  if (k === 'tTitle') { const v = el.value.trim(); later((x) => (v && v !== x.title ? taskAct(x, 'update', { fields: { title: v } }) : null)); return; }
  if (k === 'tf') { const f = el.dataset.k, v = el.value; later((x) => ((x[f] ?? '') === v ? null : taskAct(x, 'update', { fields: { [f]: v } }))); return; }
  if (k === 'tProgSave') { const v = Number(el.value); later((x) => taskAct(x, 'progress', { progress: v })); return; }
  if (k === 'tAuto') { const v = el.checked; later((x) => taskAct(x, 'update', { fields: { autoProgress: v } })); return; }
  if (k === 'clT') { tickStep(t, el); }
});
document.addEventListener('keydown', (e) => {
  if (MP.input && !$('#mp').hidden) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); MP.idx = (MP.idx + (e.key === 'ArrowDown' ? 1 : -1) + MP.items.length) % Math.max(1, MP.items.length); document.querySelectorAll('#mp .opt').forEach((o, i) => o.classList.toggle('on', i === MP.idx)); return; }
    if ((e.key === 'Enter' || e.key === 'Tab') && MP.items.length) { e.preventDefault(); e.stopPropagation(); pickMP(MP.idx); return; }
    if (e.key === 'Escape') { hideMP(); return; }
  }
  if (e.key === 'Escape') { if (UI.modal) { UI.modal = null; UI.code = null; renderModal(); } else if (openTask || openReq) closeAll(); else if (UI.pop) { UI.pop = null; renderTop(); } }
  if (e.target.id === 'dt-cl' && e.key === 'Enter') { e.preventDefault(); ACT.clAdd(); }
  if (e.target.id === 'dt-cm' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACT.comment(); }
  if (['dt-addass', 'dt-addsh', 'nt-ass', 'dt-reass'].includes(e.target.id) && e.key === 'Enter') e.preventDefault();
}, true);
document.addEventListener('focusout', (e) => { if (e.target === MP.input) setTimeout(() => { if (document.activeElement !== MP.input) hideMP(); }, 120); });
// Keep the @ list open while scrolling: ignore scrolling inside the list, and move it with its box otherwise.
window.addEventListener('scroll', (e) => {
  if (!MP.input) return;
  if (e.target instanceof Element && e.target.closest('#mp')) return;
  const pop = $('#mp'); if (pop.hidden) return;
  const r = MP.input.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) { hideMP(); return; }
  const ph = pop.offsetHeight; let top = r.bottom + 4; if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 4);
  pop.style.top = `${top}px`; pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 280))}px`;
}, true);

const FORMS = {
  addPerson: async () => {
    const name = $('#ap-name')?.value.trim(); if (!name) return toast(L('Name is required.'), null, 'warn');
    const company = $('#ap-co')?.value || 'spp';
    const body = { name, company, title: $('#ap-title')?.value.trim() || '', level: $('#ap-level')?.value || undefined, reportsTo: company === 'spp' ? (UI.apBoss || []) : [] };
    const r = await act('admin/people', body, L('Added {name}. Use Edit to set what they can see, then Create login.', { name }));
    if (r?.id) { UI.apBoss = []; UI.editPerson = r.id; renderBody(); loadAccounts(); setTimeout(() => document.querySelector(`[data-act="editPerson"][data-u="${CSS.escape(r.id)}"]`)?.scrollIntoView({ block: 'center' }), 60); }
  },
  quick: async () => {
    const inp = $('#qa'), v = inp.value.trim(); if (!v) return;
    const r = parseQuick(v); if (!r.title) return toast(L('Add a few words describing the task.'), null, 'warn');
    if (r.warn.length) return toast(L('{w}. Fix the name or remove it.', { w: r.warn[0] }), null, 'warn');
    inp.value = ''; const prev = $('#qaPrev'); if (prev) prev.innerHTML = '';
    const res = await act('tasks', { title: r.title, area: r.area || UI.f.area || 'misc', category: r.category || UI.f.cat || undefined, assignees: r.assignees, priority: r.priority || 'normal', due: r.due || d(7), start: iso(TODAY) }, (x) => L('{id} added.', { id: x.id }));
    const box = $('#qa'); if (box) { if (!res && !box.value) box.value = v; box.focus(); }
  },
  newtask: async () => {
    const r = parseQuick($('#nt-title').value.trim()); if (!r.title) return toast(L('Add a few words describing the task.'), null, 'warn');
    if (r.warn.length) return toast(L('{w}. Fix the name or remove it.', { w: r.warn[0] }), null, 'warn');
    const ass = [...new Set([...UI.draft.assignees, ...r.assignees])];
    const body = { title: r.title, area: r.area || $('#nt-area').value, category: r.category || $('#nt-cat').value, priority: r.priority || $('#nt-prio').value, start: $('#nt-start').value || null, due: r.due || $('#nt-due').value || null, followup: $('#nt-fu').value || null, assignees: ass, repeatDays: chosenDays('nt-rep'), description: $('#nt-desc').value.trim(), checklist: $('#nt-cl').value.split('\n').map((s) => s.trim()).filter(Boolean), parentId: UI.draft.parentId || undefined };
    const res = await act('tasks', body, (x) => L('{id} created.', { id: x.id }));
    if (res) { UI.modal = null; renderModal(); }
  },
  newreq: async () => {
    const body = { recipient: $('#rq-to').value, title: $('#rq-title').value.trim(), message: $('#rq-body').value.trim(), due: $('#rq-due').value || null, followup: $('#rq-fu').value || null, area: $('#rq-area').value, privateNote: $('#rq-note').value.trim() };
    const res = await act('requests', body, (x) => L('{id} sent. Your follow-up is {fu}.', { id: x.id, fu: x.followupTaskId }));
    if (res) { UI.modal = null; renderModal(); }
  },
  addcat: async (f) => { const v = f.querySelector('#nb-name').value.trim(); if (v) await act('categories', { name: v }, L('Bucket “{name}” added.', { name: v })); },
};
document.addEventListener('submit', (e) => { e.preventDefault(); const f = FORMS[e.target.dataset.form]; if (f) f(e.target); });

/* drag & drop on the board */
let dragId = null;
document.addEventListener('dragstart', (e) => { const c = e.target.closest?.('.card'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch { /* ignore */ } });
document.addEventListener('dragend', () => { document.querySelectorAll('.card.dragging').forEach((c) => c.classList.remove('dragging')); document.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop')); });
document.addEventListener('dragover', (e) => { const col = e.target.closest?.('.col'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.col.drop').forEach((c) => c !== col && c.classList.remove('drop')); col.classList.add('drop'); });
document.addEventListener('drop', (e) => {
  const col = e.target.closest?.('.col'); if (!col || !dragId) return; e.preventDefault();
  const t = T(dragId), src = document.querySelector(`.card[data-id="${CSS.escape(dragId)}"]`)?.closest('.col')?.dataset.drop; dragId = null;
  const key = col.dataset.drop, g = UI.groupBy;
  if (!t || src === key || g === 'creator') return refresh(); // who created a task cannot be changed by dragging
  if (g === 'person') {
    if (key === '__none') return refresh();
    return taskAct(t, 'assign', { person: key }, L('{id} assigned to {name}.', { id: t.id, name: nm(person(key)) })).then((ok) => (ok && src && src !== '__none' ? taskAct(T(t.id), 'unassign', { person: src }) : null));
  }
  if (g === 'status' && key === 'review') return taskAct(t, 'submit', {}, L('{id} sent for sign-off.', { id: t.id }));
  const field = { area: 'area', cat: 'category', status: 'status', prio: 'priority' }[g];
  taskAct(t, 'update', { fields: { [field]: key } }, L('{id} moved.', { id: t.id }));
});

/* ================= start ================= */
(async () => {
  applyLang();
  const boot = $('#app .empty'); if (boot) boot.textContent = L('Loading tasks…');
  try {
    // Asked for at the same moment as the task data, not after it (site audit, 10 Nov 2026: on the live site this
    // call only answers "not a test copy", and waiting for it held back the first screen by one round trip).
    const staging = api('../tasks-staging/view-as').catch(() => null);
    await reload(); STAGING = await staging;
    if (location.hash === '#access' && !ADMIN) { location.replace('/admin'); return; }
    render(); if (ADMIN && S.admin && (UI.adminTab === 'people' || UI.adminTab === 'signins')) loadAccounts();
    if (ADMIN && UI.adminTab === 'backup') { if (S.me?.can?.admin) loadBackup(); else { UI.adminTab = 'pages'; render(); } }
    if (ADMIN) loadAgent();
  }
  catch (e) { if (e.message !== 'signed out') $('#app').innerHTML = `<div class="empty" style="margin:40px">${esc(trMsg(e.message))}</div>`; }
})();
