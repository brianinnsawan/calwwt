// Sites overview (calwwt.sppwork.com/sites/): one card per Caltex site, from /sites/data/sites.json.
import { languageFor } from '/__nav/bar.mjs';

const W = {
  en: { title: 'Caltex 2027 wastewater improvement', sub: '8 SPP sites · water sampling to Caltex parameters, results and improvement proposal',
    due: (d) => `Everything to Caltex by ${d}`, sampled: (d) => `Sampled ${d}`, notSampled: 'Sampling date to confirm',
    improve: 'Improvement needed', none: 'No improvement for now', prog: 'Programme for all sites →' },
  th: { title: 'ปรับปรุงระบบน้ำเสีย Caltex 2027', sub: '8 สถานีที่ SPP รับผิดชอบ · เก็บตัวอย่างน้ำตามพารามิเตอร์ของ Caltex ผลแล็บ และข้อเสนอปรับปรุง',
    due: (d) => `ส่งงานทั้งหมดให้ Caltex ภายใน ${d}`, sampled: (d) => `เก็บตัวอย่าง ${d}`, notSampled: 'รอยืนยันวันที่เก็บตัวอย่าง',
    improve: 'ต้องปรับปรุง', none: 'ยังไม่ต้องปรับปรุง', prog: 'แผนงานรวมทุกสถานี →' },
};
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] };
const day = (iso, l) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[l][m - 1]} ${y}`; };
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

async function main() {
  const [me, data] = await Promise.all([
    fetch('/api/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/sites/data/sites.json', { cache: 'no-store' }).then((r) => r.json()),
  ]);
  const l = languageFor(me) === 'en' ? 'en' : 'th', w = W[l];
  document.documentElement.lang = l;
  document.getElementById('title').textContent = w.title;
  document.getElementById('sub').textContent = w.sub;
  document.getElementById('due').textContent = w.due(day(data.deliverBy, l));
  document.getElementById('prog').textContent = w.prog;
  const grid = document.getElementById('grid');
  for (const s of data.sites) {
    const a = el('a', 'sx-card'); a.href = `/sites/${s.code}/`;
    a.append(el('span', 'sx-code', s.code), el('span', 'sx-name', s.name[l]),
      el('span', 'sx-meta', s.sampledLabel ? w.sampled(s.sampledLabel[l]) : s.sampled ? w.sampled(day(s.sampled, l)) : w.notSampled));
    const improve = !/^No improvement/.test(s.improvement.en);
    a.append(el('span', `sx-tag ${improve ? 'warn' : 'ok'}`, improve ? w.improve : w.none));
    const ul = el('ul'); for (const n of s.notes[l]) ul.append(el('li', null, n)); a.append(ul);
    grid.append(a);
  }
}
main().catch((e) => { console.warn('sites', e); });
