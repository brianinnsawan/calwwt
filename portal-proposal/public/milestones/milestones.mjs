// Schedule -> Milestones. Data: /api/milestones (src/trackers.mjs). Edit needs the Project timeline page at edit.
import { el, me, lang as langOf, api, status, today, fmtDate, downloadWorkbook, xlDate, PROJECT, CONTRACTOR } from '/__nav/trackers.mjs';

const W = {
  th: { title: 'เหตุการณ์สำคัญของโครงการ', sub: 'จากไฟล์ Construction Change Tracking rev02 (30 ต.ค. 2569) แผ่น Timeline · ใส่วันที่จริงเมื่อแต่ละรายการเสร็จ',
    strip: 'ภาพรวมรายเดือน', code: 'รหัส', name: 'รายการ', plan: 'แผน', actual: 'จริง', state: 'สถานะ', remarks: 'หมายเหตุ',
    edit: 'แก้ไข', save: 'บันทึก', cancel: 'ยกเลิก', na: 'ไม่เกี่ยวข้อง (–)', done: 'เสร็จแล้ว', late: 'เลยกำหนด', soon: 'ภายใน 14 วัน', upcoming: 'ตามแผน', tbc: 'รอกำหนด', nA: 'ไม่เกี่ยวข้อง',
    download: 'ดาวน์โหลด Excel (ภาษาอังกฤษ)', saved: 'บันทึกแล้ว', viewOnly: 'ดูอย่างเดียว', failed: 'โหลดข้อมูลไม่ได้', updated: 'แก้ไขล่าสุด {d}' },
  en: { title: 'Project milestones', sub: 'From Construction Change Tracking rev02 (30 Oct 2026), sheet "Timeline". Fill in the actual date as each one is reached.',
    strip: 'By month', code: 'Code', name: 'Milestone', plan: 'Plan', actual: 'Actual', state: 'Status', remarks: 'Remarks',
    edit: 'Edit', save: 'Save', cancel: 'Cancel', na: 'Not applicable (–)', done: 'Done', late: 'Overdue', soon: 'Within 14 days', upcoming: 'On plan', tbc: 'Date TBC', nA: 'Not applicable',
    download: 'Download Excel', saved: 'Saved.', viewOnly: 'View only', failed: 'Could not load the milestones', updated: 'last changed {d}' },
};
const GROUPS = [
  ['design', 'การออกแบบ', 'Design'], ['permission', 'การขออนุญาต', 'Permission'],
  ['registration', 'การจดทะเบียน', 'Registration'], ['construction', 'งานก่อสร้าง', 'Construction key milestones'],
];
let L = 'th', w = W.th, data = null, editing = null, who = '';
const $ = (id) => document.getElementById(id);
const plusDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
function state(m) {
  if (m.actual && m.actual !== '-') return 'done';
  if (m.plan === '-' || m.actual === '-') return 'nA';
  if (!m.plan) return 'tbc';
  const t = today();
  if (m.plan < t) return 'late';
  if (m.plan <= plusDays(t, 14)) return 'soon';
  return 'upcoming';
}
const chipClass = { done: 'done', late: 'late', soon: 'soon' };
const groupName = (g) => { const x = GROUPS.find((y) => y[0] === g); return L === 'th' ? `${x[1]} · ${x[2]}` : x[2]; };

function strip() {
  const dated = data.items.flatMap((m) => [m.plan, m.actual]).filter((d) => d && d !== '-').sort();
  const box = $('strip'); box.replaceChildren();
  if (!dated.length) return;
  const months = [];
  for (let d = `${dated[0].slice(0, 7)}-01`; d.slice(0, 7) <= dated.at(-1).slice(0, 7);) {
    months.push(d.slice(0, 7));
    const [y, mo] = d.split('-').map(Number); d = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, '0')}-01`;
  }
  box.style.gridTemplateColumns = `minmax(130px,170px) repeat(${months.length}, minmax(90px,1fr))`;
  box.append(el('div', { class: 'm' }));
  for (const m of months) box.append(el('div', { class: 'm' }, new Date(`${m}-01T00:00:00Z`).toLocaleDateString(L === 'th' ? 'th-TH' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })));
  const nowM = today().slice(0, 7);
  for (const [g] of GROUPS) {
    box.append(el('div', { class: 'g' }, groupName(g).split(' · ').at(L === 'th' ? 0 : -1)));
    const items = data.items.filter((m) => m.grp === g);
    for (const mo of months) {
      const cell = el('div', { class: `c${mo === nowM ? ' now' : ''}` });
      for (const m of items) {
        const s = state(m), when = s === 'done' ? m.actual : m.plan;
        if (when && when !== '-' && when.slice(0, 7) === mo) cell.append(el('span', { class: `pin ${chipClass[s] || ''}`, title: `${m.id} ${m.name} · ${fmtDate(when, L)} · ${w[s]}` }, m.id));
      }
      box.append(cell);
    }
  }
}

function row(m) {
  const s = state(m);
  if (editing === m.id) {
    const plan = el('input', { type: 'date', value: m.plan && m.plan !== '-' ? m.plan : '' });
    const actual = el('input', { type: 'date', value: m.actual && m.actual !== '-' ? m.actual : '' });
    const na = el('input', { type: 'checkbox' }); na.checked = m.plan === '-';
    const remarks = el('input', { type: 'text', value: m.remarks || '', maxlength: '400' });
    const save = async () => {
      try {
        await api(`/api/milestones/${encodeURIComponent(m.id)}`, { method: 'POST', body: JSON.stringify({ plan: na.checked ? '-' : plan.value, actual: na.checked ? '-' : actual.value, remarks: remarks.value }) });
        editing = null; status($('status'), w.saved, 'ok'); await load();
      } catch (e) { status($('status'), e.message, 'bad'); }
    };
    return el('tr', {}, el('td', { class: 'code' }, m.id), el('td', {}, m.name),
      el('td', { class: 'd' }, plan, el('label', { class: 'muted', style: 'display:flex;gap:4px;font-size:12px;margin-top:4px' }, na, w.na)),
      el('td', { class: 'd' }, actual), el('td', { class: 'hide-sm' }), el('td', {}, remarks),
      el('td', { class: 'd' }, el('button', { type: 'button', class: 'btn sm primary', onclick: save }, w.save), ' ', el('button', { type: 'button', class: 'btn sm', onclick: () => { editing = null; render(); } }, w.cancel)));
  }
  return el('tr', {}, el('td', { class: 'code' }, m.id), el('td', {}, m.name),
    el('td', { class: 'd' }, fmtDate(m.plan, L)), el('td', { class: 'd' }, fmtDate(m.actual, L)),
    el('td', { class: 'hide-sm' }, el('span', { class: `chip ${chipClass[s] || ''}` }, w[s])),
    el('td', {}, m.remarks || ''),
    data.canEdit ? el('td', { class: 'd' }, el('button', { type: 'button', class: 'btn sm', onclick: () => { editing = m.id; render(); } }, w.edit)) : null);
}

function render() {
  strip();
  const out = [];
  for (const [g] of GROUPS) {
    const items = data.items.filter((m) => m.grp === g);
    if (!items.length) continue;
    const done = items.filter((m) => state(m) === 'done').length, counted = items.filter((m) => state(m) !== 'nA').length;
    const head = el('tr', {}, [w.code, w.name, w.plan, w.actual, w.state, w.remarks].map((h, i) => el('th', { class: i === 4 ? 'hide-sm' : null }, h)), data.canEdit ? el('th') : null);
    out.push(el('section', { class: 'tk-card' }, el('h2', {}, groupName(g), el('small', {}, `${done} / ${counted}`)),
      el('div', { class: 'tk-scroll' }, el('table', {}, el('thead', {}, head), el('tbody', {}, items.map(row))))));
  }
  $('groups').replaceChildren(...out);
}

// Excel download, always in English (Brian, 1 Nov 2026), laid out like the "Timeline" sheet it came from.
async function exportExcel() {
  const E = W.en, GN = { design: 'Design', permission: 'Permission', registration: 'Registration', construction: 'Construction Key Milestone' };
  await downloadWorkbook((wb) => {
    const ws = wb.addWorksheet('Timeline', { views: [{ state: 'frozen', ySplit: 6 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    ws.columns = [{ width: 8 }, { width: 34 }, { width: 13 }, { width: 13 }, { width: 15 }, { width: 40 }];
    ws.addRow(['Project Timeline Tracking']).font = { bold: true, size: 14 };
    ws.addRow([]);
    ws.addRow(['Project Name :', '', PROJECT]);
    ws.addRow(['Contractor :', '', CONTRACTOR]);
    ws.addRow(['Record By :', '', who, 'Date :', xlDate(today())]);
    ws.getCell('E5').numFmt = 'd-mmm-yy';
    ws.addRow([]);
    for (const [g] of GROUPS) {
      const items = data.items.filter((m) => m.grp === g);
      if (!items.length) continue;
      const h = ws.addRow([`${GN[g]} :`, '', 'Plan', 'Actual', 'Status', 'Remarks']);
      h.font = { bold: true }; h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3EEF8' } }; });
      for (const m of items) {
        const r = ws.addRow([m.id, m.name, m.plan === '-' ? '-' : xlDate(m.plan), m.actual === '-' ? '-' : xlDate(m.actual), E[state(m)], m.remarks || '']);
        r.getCell(3).numFmt = r.getCell(4).numFmt = 'd-mmm-yy';
        r.getCell(3).alignment = r.getCell(4).alignment = { horizontal: 'center' };
      }
      ws.addRow([]);
    }
    // Month view, like the sheet's "Consolidated Timeline".
    const dated = data.items.flatMap((m) => [m.plan, m.actual]).filter((d) => d && d !== '-').sort();
    if (dated.length) {
      const months = [];
      for (let y = +dated[0].slice(0, 4), mo = +dated[0].slice(5, 7); `${y}-${String(mo).padStart(2, '0')}` <= dated.at(-1).slice(0, 7); mo === 12 ? (y++, mo = 1) : mo++) months.push(`${y}-${String(mo).padStart(2, '0')}`);
      const mws = wb.addWorksheet('By month', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
      mws.columns = [{ width: 16 }, { width: 9 }, ...months.map(() => ({ width: 15 }))];
      mws.addRow(['Consolidated Timeline']).font = { bold: true, size: 14 };
      const hr = mws.addRow(['', '', ...months.map((m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }))]); hr.font = { bold: true };
      for (const [g] of GROUPS) {
        const items = data.items.filter((m) => m.grp === g);
        for (const which of ['PLAN', 'ACTUAL']) {
          const cells = months.map((mo) => items.filter((m) => { const d = which === 'PLAN' ? m.plan : m.actual; return d && d !== '-' && d.slice(0, 7) === mo; }).map((m) => m.id).join(', '));
          const r = mws.addRow([which === 'PLAN' ? GN[g] : '', which, ...cells]);
          r.alignment = { wrapText: true, vertical: 'top' };
          if (which === 'PLAN') r.getCell(1).font = { bold: true };
        }
      }
    }
  }, `Caltex_Nti_Nkt_Milestones_${today()}.xlsx`);
}

async function load() {
  try { data = await api('/api/milestones'); } catch (e) { status($('status'), `${w.failed} (${e.message})`, 'bad'); return; }
  render();
}
const m0 = await me();
L = langOf(m0); w = W[L]; document.documentElement.lang = L;
$('title').textContent = w.title; $('sub').textContent = w.sub; $('stripTitle').textContent = w.strip; who = m0?.viewAs?.name || m0?.name || '';
$('actions').replaceChildren(el('button', { type: 'button', class: 'btn', onclick: () => exportExcel().catch((e) => status($('status'), e.message, 'bad')) }, w.download));
await load();
