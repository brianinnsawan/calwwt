// One site (calwwt.sppwork.com/sites/<code>/) and the all-sites programme (/sites/programme/).
// Left panel: site notes, wastewater layouts and links. Right, as tabs: 3D model (viewer.mjs, when sites.json names a file in
// /sites/models/; it is the first tab and opens by default), Drawings (the site's folder in Files, sitefiles.mjs)
// and Timeline (gantt.js, one shared timeline per site, saved on the server).
import { languageFor } from '/__nav/bar.mjs';

const W = {
  en: { status: 'Status', notes: 'Site notes', links: 'Open', layouts: 'Drawings & files', drawingsTab: 'Drawings', cad: 'CAD workspace', files: 'Files', tasks: 'Tasks', meetings: 'Meetings',
model3d: '3D model', open3d: 'Open the 3D model', all: 'All sites', sampled: (d) => `Sampled ${d}`, notSampled: 'Sampling date to confirm', noModel: 'No 3D model yet',
    noModelSub: 'The 3D model of this site will be added here. The Timeline tab already works.', noLayout: 'No wastewater layout yet for this site.',
    prog: 'Programme · all 8 sites', progSub: 'One timeline for the whole programme. Each site also has its own timeline.',
    foot: 'Caltex 2027 wastewater improvement · SPP', hidePanel: 'Hide this panel', showPanel: 'Show the site panel', info: 'Site info', showInfo: 'Show the site status, notes, drawings and links', hideInfo: 'Fold the site info away', reset: 'Reset view', layoutOf: 'Layout' },
  th: { status: 'สถานะ', notes: 'บันทึกหน้างาน', links: 'เปิด', layouts: 'แบบและไฟล์', drawingsTab: 'แบบ', cad: 'พื้นที่ทำงาน CAD', files: 'ไฟล์', tasks: 'งาน', meetings: 'ประชุม',
model3d: 'โมเดล 3D', open3d: 'เปิดโมเดล 3D', all: 'สถานีทั้งหมด', sampled: (d) => `เก็บตัวอย่าง ${d}`, notSampled: 'รอยืนยันวันที่เก็บตัวอย่าง', noModel: 'ยังไม่มีโมเดล 3D',
    noModelSub: 'โมเดล 3D ของสถานีนี้จะเพิ่มที่นี่ แท็บแผนงานใช้งานได้แล้ว', noLayout: 'ยังไม่มีแบบระบบน้ำเสียของสถานีนี้',
    prog: 'แผนงานรวม · 8 สถานี', progSub: 'แผนงานเดียวสำหรับทั้งโครงการ แต่ละสถานีมีแผนงานของตัวเองด้วย',
    foot: 'ปรับปรุงระบบน้ำเสีย Caltex 2027 · SPP', hidePanel: 'ซ่อนแถบนี้', showPanel: 'แสดงแถบข้อมูลสถานี', info: 'ข้อมูลสถานี', showInfo: 'แสดงสถานะ บันทึก แบบ และลิงก์ของสถานี', hideInfo: 'พับข้อมูลสถานีเก็บ', reset: 'มุมมองเริ่มต้น', layoutOf: 'แบบ' },
};
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] };
const day = (iso, l) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[l][m - 1]} ${y}`; };
const el = (tag, attrs = {}, text) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };
const $ = (id) => document.getElementById(id);

async function main() {
  const m = location.pathname.match(/^\/sites\/(\d{4}|programme)\//);
  const code = m?.[1] === 'programme' ? 'all' : m?.[1];
  const [me, data] = await Promise.all([
    fetch('/api/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/sites/data/sites.json', { cache: 'no-store' }).then((r) => r.json()),
  ]);
  const l = languageFor(me) === 'en' ? 'en' : 'th', w = W[l];
  document.documentElement.lang = l;
  const site = data.sites.find((s) => s.code === code);
  const links = $('links');
  const link = (href, text) => links.append(el('a', { href }, text));
  $('foot').textContent = w.foot;
  $('hLinks').textContent = w.links;
  if (code === 'all') {
    document.title = `${w.prog} · Caltex Wastewater 2027`;
    $('code').textContent = 'ALL'; $('name').textContent = w.prog; $('sub').textContent = w.progSub;
    $('hStatus').closest('details').hidden = true; $('hNotes').closest('details').hidden = true;
    for (const s of data.sites) link(`/sites/${s.code}/`, `${s.code} ${s.name[l]}`);
  } else {
    document.title = `${site.code} ${site.name[l]} · Caltex Wastewater 2027`;
    $('code').textContent = site.code; $('name').textContent = site.name[l];
    $('sub').textContent = site.sampledLabel ? w.sampled(site.sampledLabel[l]) : site.sampled ? w.sampled(day(site.sampled, l)) : w.notSampled;
    $('hStatus').textContent = w.status; $('improve').textContent = site.improvement[l];
    $('hNotes').textContent = w.notes;
    for (const n of site.notes[l]) $('notes').append(el('li', {}, n));
    link('/sites/', '← ' + w.all);
    if (Number.isFinite(site.lat)) {
      const a = el('a', { href: `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`, target: '_blank', rel: 'noopener' }, 'Google Maps ↗');
      links.append(a);
    }
    for (const x of site.links || []) link(x.href, x[l] || x.en);
    if (site.company) $('sub').textContent += ` · ${site.company}`;
  }
  if (code !== 'all') link(`/cad-workspace/?site=${code}`, w.cad);
  link(code === 'all' ? '/files/' : `/files/#site-${code}`, w.files); link('/tasks.html', w.tasks); link('/meetings/', w.meetings);

  railFolding(w);
  const view = $('view');
  let modelTab = null, views = null, onView = null;
  if (code !== 'all') {
    // Drawings & files (Brian, 27 Nov 2026): the site's own folder in Files, listed in the panel and shown in the Drawings tab
    // (sitefiles.mjs); the layouts once built into the site show there until they are moved into Files.
    const sf = await import('/sites/sitefiles.mjs');
    let state = await sf.loadSiteFiles(site, data.sites), pager = null;
    const sec = el('details', { open: '', 'data-k': 'layouts' }); const sm = el('summary'); sm.append(el('h2', {}, w.layouts)); sec.append(sm);
    const body = el('div'); sec.append(body);
    const listPanel = () => {
      body.replaceChildren();
      if (!state.items.length) { body.append(el('p', {}, site.layoutNote?.[l] || w.noLayout)); return; }
      const ul = el('ul');
      for (const it of state.items) {
        const li = el('li'), e = (/\.([a-z0-9]{1,8})$/i.exec(it.name)?.[1] || '').toLowerCase();
        const here = it.kind === 'builtIn' || it.kind === 'video' || ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(e);
        const a = el('a', { href: here ? '#layouts' : sf.itemHref(it) }, sf.itemLabel(it, l));
        if (here) a.onclick = () => { setTimeout(() => pager?.select(it.id), 0); };
        li.append(a); ul.append(li);
      }
      body.append(ul);
    };
    listPanel();
    $('hNotes').closest('details').after(sec);
    const pane = (id) => { const d = el('div', { class: 'pane', id: `pane-${id}` }); view.append(d); return d; };
    const pl = pane('layouts');
    const reload = async () => { state = await sf.loadSiteFiles(site, data.sites); listPanel(); pager = sf.showSiteFiles(pl, site, l, state, data.sites, reload); };
    pager = sf.showSiteFiles(pl, site, l, state, data.sites, reload);
    if (site.model) {
      let started = false;
      const start = (into) => { if (started) return; started = true; import('/sites/viewer.mjs').then((v) => v.show(into, `/sites/models/${site.model}`, w, l, `${site.code} ${site.name[l]}`)).catch((e) => { console.warn('model', e); }); };
      const pm = pane('model'); pl.hidden = true;   // the 3D model is the tab that opens first (Brian, 25 Nov 2026)
      views = [{ id: 'model', en: W.en.model3d, th: W.th.model3d }, { id: 'layouts', en: W.en.drawingsTab, th: W.th.drawingsTab }];
      onView = (id) => { pl.hidden = id !== 'layouts'; pm.hidden = id !== 'model'; if (id === 'model') start(pm); };
    } else modelTab = { en: W.en.drawingsTab, th: W.th.drawingsTab };
  }
  // Timeline: same chart as calcr.sppwork.com. Editing for people with Project timeline = edit (Admin page).
  const { init } = await import('/sites/gantt.js');
  await init({ getLang: () => l, api: `/api/sites/${code}/timeline`, defaultUrl: `/sites/data/timelines/${code}.json`,
    canEdit: me?.pages?.timeline === 'edit' && !me?.viewAs, onlyTimeline: code === 'all', modelTab, views, onView });
}
// Every part of the left panel folds (Brian, 27 Nov 2026: "all menus should be collapsible"). The « button folds the whole
// panel away so the model gets the full width. What is folded is remembered in this browser.
function railFolding(w) {
  const get = (k) => { try { return localStorage.getItem('calwwt.rail.' + k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem('calwwt.rail.' + k, v); } catch { /* storage off: not remembered */ } };
  const btn = $('railBtn');
  // Phones (narrow screens, same rule as sites.css): the panel is the fold-down "Site info", folded when the page opens,
  // and remembered apart from the desktop panel so folding one never changes the other.
  const phone = matchMedia('(max-width: 760px)');
  const key = () => (phone.matches ? 'offPhone' : 'off');
  const isOff = () => (phone.matches ? get('offPhone') !== '0' : get('off') === '1');
  const set = (off) => {
    document.documentElement.classList.toggle('rail-off', off);
    if (phone.matches) { btn.textContent = `${w.info} ${off ? '▾' : '▴'}`; btn.title = off ? w.showInfo : w.hideInfo; }
    else { btn.textContent = off ? '»' : '«'; btn.title = off ? w.showPanel : w.hidePanel; }
    btn.setAttribute('aria-label', btn.title); btn.setAttribute('aria-expanded', String(!off));
    dispatchEvent(new Event('resize'));
  };
  set(isOff());
  phone.addEventListener('change', () => set(isOff()));   // phone turned, or a window made narrow / wide
  const toggle = (off) => { put(key(), off ? '1' : '0'); set(off); };
  btn.onclick = () => toggle(!document.documentElement.classList.contains('rail-off'));
  // on a phone the open panel covers the view: a tap on the view, or opening something from the panel, folds it again
  $('view').addEventListener('click', (e) => { if (phone.matches && !document.documentElement.classList.contains('rail-off')) { e.stopPropagation(); e.preventDefault(); toggle(true); } }, true);
  $('drawer').addEventListener('click', (e) => { if (phone.matches && e.target.closest('a')) toggle(true); });
  const fold = (d) => { const k = d.dataset.k; if (!k) return; if (get(k) === '0') d.open = false; d.addEventListener('toggle', () => put(k, d.open ? '1' : '0')); };
  document.querySelectorAll('#scroll details').forEach(fold);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.matches?.('details[data-k]')) fold(n); }))).observe($('scroll'), { childList: true });
}
main().catch((e) => { console.warn('site', e); });
