// Drawings -> Drawing changes: the on-site design change log. Data: /api/drawing-changes (src/trackers.mjs).
// Adding and changing entries needs the Drawings page at edit (Admin page).
import { el, me, lang as langOf, api, status, fmtDate, downloadWorkbook, xlDate, today, PROJECT, CONTRACTOR } from '/__nav/trackers.mjs';
import { confirmBox } from '/__nav/ask.mjs';

const W = {
  th: { title: 'การเปลี่ยนแปลงแบบหน้างาน', sub: 'On-site design change tracking · ผู้รับเหมา: SPP · จากไฟล์ Construction Change Tracking rev02 แผ่น Design Change',
    add: 'เพิ่มรายการ', no: 'ลำดับ', item: 'รายการ', description: 'รายละเอียด', drawing: 'เลขที่แบบ', requester: 'ผู้ขอเปลี่ยน', factor: 'สาเหตุ', date: 'วันที่',
    save: 'บันทึก', cancel: 'ยกเลิก', edit: 'แก้ไข', del: 'ลบ', delAsk: 'ลบรายการ "{x}"? (ยังเก็บไว้ในบันทึกการแก้ไข)', none: '—',
    empty: 'ยังไม่มีการเปลี่ยนแปลงแบบ', emptyEdit: 'ยังไม่มีการเปลี่ยนแปลงแบบ — กด "เพิ่มรายการ" เพื่อบันทึกรายการแรก', legend: 'สาเหตุของการเปลี่ยนแปลง (Factor)',
    download: 'ดาวน์โหลด Excel', saved: 'บันทึกแล้ว', failed: 'โหลดข้อมูลไม่ได้', newTitle: 'บันทึกการเปลี่ยนแปลงแบบ', editTitle: 'แก้ไขรายการที่ {n}', all: 'ทุกสาเหตุ' },
  en: { title: 'On-site design change tracking', sub: 'Contractor: SPP · from Construction Change Tracking rev02, sheet "Design Change"',
    add: 'Add change', no: 'No.', item: 'Item', description: 'Description', drawing: 'Drawing No.', requester: 'Change requester', factor: 'Factor', date: 'Date',
    save: 'Save', cancel: 'Cancel', edit: 'Edit', del: 'Delete', delAsk: 'Delete "{x}"? (It stays in the change log.)', none: '—',
    empty: 'No drawing changes recorded yet.', emptyEdit: 'No drawing changes recorded yet. Press "Add change" to record the first one.', legend: 'Factor (reason for the change)',
    download: 'Download Excel', saved: 'Saved.', failed: 'Could not load the drawing changes', newTitle: 'Record a drawing change', editTitle: 'Edit entry {n}', all: 'All factors' },
};
const FACTOR = {
  A: ['คำขอเพิ่มเติม', 'Add request', 'Additional requirement from User, Stakeholder, Partner'],
  C: ['ลดต้นทุน', 'Cost efficiency', 'Change design for cost reduction'],
  E: ['แก้ไขข้อผิดพลาด', 'Error', 'For correctness and quality of drawing'],
  I: ['ปรับปรุง', 'Improvement', 'Detail improving for safety and strengthen construction works'],
  R: ['กฎหมาย / ข้อบังคับ', 'Regulation', 'Required by law, area code, regulation or comments from officer'],
  U: ['ปรับตามที่สร้างจริง', 'Update as built', 'Update drawing to align with actual construction condition'],
};
let L = 'th', w = W.th, data = null, filter = '', who = '';
const $ = (id) => document.getElementById(id);
const fname = (f) => (f ? `${f} · ${L === 'th' ? FACTOR[f][0] : FACTOR[f][1]}` : w.none);

function form(entry) {
  const card = $('formCard');
  if (!entry) { card.hidden = true; card.replaceChildren(); return; }
  const v = (k) => entry[k] ?? '';
  const f = {
    item: el('input', { type: 'text', value: v('item'), maxlength: '200', required: true }),
    drawing_no: el('input', { type: 'text', value: v('drawing_no'), maxlength: '200', placeholder: 'e.g. 1703 LAY-ME-02' }),
    requester: el('input', { type: 'text', value: v('requester'), maxlength: '120' }),
    factor: el('select', {}, el('option', { value: '' }, w.none), Object.keys(FACTOR).map((k) => el('option', { value: k }, fname(k)))),
    date: el('input', { type: 'date', value: v('date') }),
    description: el('textarea', { maxlength: '2000' }),
  };
  f.factor.value = v('factor'); f.description.value = v('description');
  const save = async () => {
    const body = Object.fromEntries(Object.entries(f).map(([k, n]) => [k, n.value]));
    try {
      await api(entry.id ? `/api/drawing-changes/${entry.id}` : '/api/drawing-changes', { method: 'POST', body: JSON.stringify(body) });
      form(null); status($('status'), w.saved, 'ok'); await load();
    } catch (e) { status($('status'), e.message, 'bad'); }
  };
  card.replaceChildren(el('h2', {}, entry.id ? w.editTitle.replace('{n}', entry.no) : w.newTitle),
    el('div', { class: 'tk-form' },
      el('label', { class: 'wide' }, w.item, f.item),
      el('label', {}, w.drawing, f.drawing_no), el('label', {}, w.requester, f.requester), el('label', {}, w.factor, f.factor), el('label', {}, w.date, f.date),
      el('label', { class: 'wide' }, w.description, f.description),
      el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', onclick: () => form(null) }, w.cancel), el('button', { type: 'button', class: 'btn primary', onclick: save }, w.save))));
  card.hidden = false; f.item.focus();
}

// Excel download laid out like the "Design Change" sheet (English headings, entries as typed).
async function exportExcel() {
  await downloadWorkbook((wb) => {
    const ws = wb.addWorksheet('Design Change', { views: [{ state: 'frozen', ySplit: 7 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    ws.columns = [{ width: 6 }, { width: 30 }, { width: 46 }, { width: 18 }, { width: 18 }, { width: 8 }, { width: 12 }, { width: 3 }, { width: 5 }, { width: 52 }];
    ws.addRow(['On-Site Design Change Tracking']).font = { bold: true, size: 14 };
    ws.addRow([]);
    ws.addRow(['Project Name :', '', PROJECT]);
    ws.addRow(['Contractor :', '', CONTRACTOR]);
    ws.addRow(['Record By :', '', who, '', 'Date :', '', xlDate(today())]);
    ws.getCell('G5').numFmt = 'd-mmm-yy';
    ws.addRow([]);
    const head = ws.addRow(['NO.', 'Items', 'Description', 'Drawing No.', 'Change Requester', 'Factor', 'Date']);
    head.font = { bold: true };
    for (let c = 1; c <= 7; c++) { const cell = head.getCell(c); cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3EEF8' } }; cell.border = { bottom: { style: 'thin' } }; }
    for (const r of data.items) {
      const row = ws.addRow([r.no, r.item, r.description || '', r.drawing_no || '', r.requester || '', r.factor || '', xlDate(r.date)]);
      row.alignment = { wrapText: true, vertical: 'top' };
      row.getCell(7).numFmt = 'd-mmm-yy';
      row.getCell(1).alignment = row.getCell(6).alignment = { horizontal: 'center', vertical: 'top' };
    }
    // Factor legend, as on the right of the original sheet.
    ws.getCell('I7').value = 'Factor :'; ws.getCell('I7').font = { bold: true };
    Object.entries(FACTOR).forEach(([k, [, en, desc]], i) => {
      const r = 8 + i * 2;
      ws.getCell(`I${r}`).value = k; ws.getCell(`I${r}`).font = { bold: true };
      ws.getCell(`J${r}`).value = en; ws.getCell(`J${r}`).font = { bold: true };
      ws.getCell(`J${r + 1}`).value = desc;
    });
  }, `Caltex_Nti_Nkt_Design_Change_Tracking_${today()}.xlsx`);
}

function render() {
  $('actions').replaceChildren(el('button', { type: 'button', class: 'btn', onclick: () => exportExcel().catch((e) => status($('status'), e.message, 'bad')) }, w.download), ' ',
    ...(data.canEdit ? [el('button', { type: 'button', class: 'btn primary', onclick: () => form({}) }, w.add)] : []));
  const items = data.items.filter((r) => !filter || r.factor === filter);
  const sel = el('select', { 'aria-label': w.factor, onchange: (e) => { filter = e.target.value; render(); } }, el('option', { value: '' }, w.all), Object.keys(FACTOR).map((k) => el('option', { value: k }, fname(k))));
  sel.value = filter;
  if (!data.items.length) { $('list').replaceChildren(el('p', { class: 'muted', style: 'padding:24px;text-align:center;margin:0' }, data.canEdit ? w.emptyEdit : w.empty)); return; }
  const head = el('tr', {}, [w.no, w.item, w.description, w.drawing, w.requester].map((h, i) => el('th', { class: i === 2 ? 'hide-sm' : null }, h)), el('th', {}, sel), el('th', {}, w.date), data.canEdit ? el('th') : null);
  const body = items.map((r) => el('tr', {},
    el('td', { class: 'code' }, String(r.no)), el('td', {}, r.item), el('td', { class: 'hide-sm', style: 'white-space:pre-wrap' }, r.description || ''),
    el('td', {}, r.drawing_no || ''), el('td', {}, r.requester || ''),
    el('td', {}, r.factor ? el('span', { class: 'chip', title: FACTOR[r.factor][2] }, fname(r.factor)) : ''),
    el('td', { class: 'd' }, fmtDate(r.date, L)),
    data.canEdit ? el('td', { class: 'd' }, el('button', { type: 'button', class: 'btn sm', onclick: () => form(r) }, w.edit), ' ',
      el('button', { type: 'button', class: 'btn sm danger', onclick: async () => {
        if (!(await confirmBox(w.delAsk.replace('{x}', r.item), { danger: true }))) return;
        try { await api(`/api/drawing-changes/${r.id}/delete`, { method: 'POST', body: '{}' }); await load(); } catch (e) { status($('status'), e.message, 'bad'); }
      } }, w.del)) : null));
  $('list').replaceChildren(el('table', {}, el('thead', {}, head), el('tbody', {}, body)));
}

async function load() {
  try { data = await api('/api/drawing-changes'); } catch (e) { status($('status'), `${w.failed} (${e.message})`, 'bad'); return; }
  render();
}
const m0 = await me();
L = langOf(m0); w = W[L]; document.documentElement.lang = L;
$('title').textContent = w.title; $('sub').textContent = w.sub; $('legendTitle').textContent = w.legend; who = m0?.viewAs?.name || m0?.name || '';
$('legend').replaceChildren(...Object.entries(FACTOR).map(([k, [th, en, desc]]) => el('div', {}, el('b', {}, k), el('strong', {}, L === 'th' ? `${th} · ${en}` : en), el('div', { class: 'muted' }, desc))));
await load();
