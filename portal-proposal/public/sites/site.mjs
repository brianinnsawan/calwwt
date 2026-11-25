// One site (calwwt.sppwork.com/sites/<code>/) and the all-sites programme (/sites/programme/).
// Left panel: site notes, wastewater layouts and links. Right, as tabs: Layouts (wastewater drawings, layouts.mjs),
// 3D model (viewer.mjs, when sites.json names a file in /sites/models/; it loads the first time its tab is opened)
// and Timeline (gantt.js, one shared timeline per site, saved on the server).
import { languageFor } from '/__nav/bar.mjs';

const W = {
  en: { status: 'Status', notes: 'Site notes', links: 'Open', layouts: 'Wastewater layouts', files: 'Files', tasks: 'Tasks', meetings: 'Meetings',
model3d: '3D model', open3d: 'Open the 3D model', all: 'All sites', sampled: (d) => `Sampled ${d}`, notSampled: 'Sampling date to confirm', noModel: 'No 3D model yet',
    noModelSub: 'The 3D model of this site will be added here. The Timeline tab already works.', noLayout: 'No wastewater layout yet for this site.',
    prog: 'Programme · all 8 sites', progSub: 'One timeline for the whole programme. Each site also has its own timeline.',
    foot: 'Caltex 2027 wastewater improvement · SPP', reset: 'Reset view', layoutOf: 'Layout' },
  th: { status: 'สถานะ', notes: 'บันทึกหน้างาน', links: 'เปิด', layouts: 'แบบระบบน้ำเสีย', files: 'ไฟล์', tasks: 'งาน', meetings: 'ประชุม',
model3d: 'โมเดล 3D', open3d: 'เปิดโมเดล 3D', all: 'สถานีทั้งหมด', sampled: (d) => `เก็บตัวอย่าง ${d}`, notSampled: 'รอยืนยันวันที่เก็บตัวอย่าง', noModel: 'ยังไม่มีโมเดล 3D',
    noModelSub: 'โมเดล 3D ของสถานีนี้จะเพิ่มที่นี่ แท็บแผนงานใช้งานได้แล้ว', noLayout: 'ยังไม่มีแบบระบบน้ำเสียของสถานีนี้',
    prog: 'แผนงานรวม · 8 สถานี', progSub: 'แผนงานเดียวสำหรับทั้งโครงการ แต่ละสถานีมีแผนงานของตัวเองด้วย',
    foot: 'ปรับปรุงระบบน้ำเสีย Caltex 2027 · SPP', reset: 'มุมมองเริ่มต้น', layoutOf: 'แบบ' },
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
    $('hStatus').parentElement.hidden = true; $('hNotes').parentElement.hidden = true;
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
  link('/files/', w.files); link('/tasks.html', w.tasks); link('/meetings/', w.meetings);

  const view = $('view');
  let modelTab = null, views = null, onView = null;
  if (code !== 'all') {
    // Layouts listed in the panel, with their PDFs.
    const sec = el('section'); sec.append(el('h2', {}, w.layouts));
    if (site.layouts?.length) {
      const ul = el('ul');
      for (const x of site.layouts) { const li = el('li'); li.append(el('a', { href: `/sites/layouts/${x.file}.pdf`, target: '_blank', rel: 'noopener' }, x[l] || x.en)); ul.append(li); }
      sec.append(ul);
    } else sec.append(el('p', {}, site.layoutNote?.[l] || w.noLayout));
    $('hNotes').parentElement.after(sec);
    const pane = (id) => { const d = el('div', { class: 'pane', id: `pane-${id}` }); view.append(d); return d; };
    if (site.model) {
      let started = false;
      const start = (into) => { if (started) return; started = true; import('/sites/viewer.mjs').then((v) => v.show(into, `/sites/models/${site.model}`, w, l)).catch((e) => { console.warn('model', e); }); };
      if (site.layouts?.length) {
        const pl = pane('layouts'), pm = pane('model'); pm.hidden = true;
        (await import('/sites/layouts.mjs')).showLayouts(pl, site, l, w);
        views = [{ id: 'layouts', en: 'Layouts', th: 'แบบ' }, { id: 'model', en: W.en.model3d, th: W.th.model3d }];
        onView = (id) => { pl.hidden = id !== 'layouts'; pm.hidden = id !== 'model'; if (id === 'model') start(pm); };
        const s3 = el('section'); s3.append(el('h2', {}, w.model3d)); const p3 = el('p'); p3.append(el('a', { href: '#model' }, w.open3d)); s3.append(p3); sec.after(s3);
      } else start(view);
    } else if (site.layouts?.length) {
      (await import('/sites/layouts.mjs')).showLayouts(view, site, l, w);
      modelTab = { en: 'Layouts', th: 'แบบระบบน้ำเสีย' };
    } else {
      modelTab = { en: 'Site', th: 'สถานี' };
      const box = el('div', { class: 'nomodel' });
      box.append(el('b', {}, w.noModel), el('span', {}, site.layoutNote?.[l] || w.noLayout), el('span', {}, w.noModelSub));
      view.append(box);
    }
  }
  // Timeline: same chart as calcr.sppwork.com. Editing for people with Project timeline = edit (Admin page).
  const { init } = await import('/sites/gantt.js');
  await init({ getLang: () => l, api: `/api/sites/${code}/timeline`, defaultUrl: `/sites/data/timelines/${code}.json`,
    canEdit: me?.pages?.timeline === 'edit' && !me?.viewAs, onlyTimeline: code === 'all', modelTab, views, onView });
}
main().catch((e) => { console.warn('site', e); });
