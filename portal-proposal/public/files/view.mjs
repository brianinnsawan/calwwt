// File viewer (calwwt.sppwork.com/files/view.html?id=<file id>): shows a project file in the browser.
// PDF and pictures: the browser itself. Word, Excel, PowerPoint: open-source readers in /files/vendor/ (loaded only when needed).
// DWG / DXF: the CAD viewer at /files/cad/. The file list and every permission check stay on the server (/api/files).
import { languageFor } from '/__nav/bar.mjs';

const WORDS = {
  th: {
    back: '← กลับไปที่โฟลเดอร์', download: 'ดาวน์โหลด', present: 'นำเสนอ', close: 'ปิด', loading: 'กำลังเปิดไฟล์…',
    notFound: 'ไม่พบไฟล์นี้ หรือคุณไม่มีสิทธิ์ดู', failed: 'เปิดไฟล์นี้ในเว็บไม่ได้ ({msg}) — กด "ดาวน์โหลด" เพื่อเปิดในเครื่อง',
    noPreview: 'ไฟล์ชนิดนี้ดูในเว็บไม่ได้ — กด "ดาวน์โหลด" เพื่อเปิดในเครื่อง',
    oldFormat: 'ไฟล์ Office รุ่นเก่า (.doc / .ppt / .xls) ดูในเว็บไม่ได้ — บันทึกเป็น .docx / .pptx / .xlsx แล้วอัปโหลดใหม่ หรือกด "ดาวน์โหลด"',
    approx: 'ภาพตัวอย่างในเว็บอาจต่างจากโปรแกรม Office เล็กน้อย (ฟอนต์ ตำแหน่ง แผนภูมิ) ไฟล์ต้นฉบับคือไฟล์ที่ดาวน์โหลด',
    rowsCut: 'แสดง {n} แถวแรก — ดาวน์โหลดเพื่อดูทั้งหมด', uploaded: 'บันทึกล่าสุด {d} โดย {by} · กด "แก้ไข" เพื่อแก้เซลล์ในหน้านี้ (บันทึกอัตโนมัติ) หรืออัปโหลดไฟล์ Excel ฉบับใหม่ที่แท็บไฟล์ · ฉบับก่อนหน้าเก็บไว้',
    history: 'ประวัติ', historyOf: 'ฉบับก่อนหน้าของ {name}', historyNote: 'ระบบเก็บทุกฉบับที่บันทึกไว้ กด "เปิด" เพื่อดู หรือ "กู้คืน" เพื่อให้ฉบับนั้นกลับมาเป็นฉบับล่าสุด การกู้คืนไม่ลบอะไร ฉบับที่ถูกแทนยังอยู่ในรายการนี้',
    verCurrent: 'ฉบับปัจจุบัน', verViewing: 'กำลังดูอยู่', verBy: 'โดย {by}', howUpload: 'อัปโหลด', howEdit: 'แก้ไขในเว็บ', howRestore: 'กู้คืนจากฉบับวันที่ {d}', howRestorePlain: 'กู้คืนจากฉบับก่อนหน้า',
    verCaltex: 'แชร์กับ Caltex ตั้งแต่ {d}', open: 'เปิด', restore: 'กู้คืน', restoreAsk: 'ให้ฉบับนี้เป็นฉบับล่าสุด?', restoreYes: 'กู้คืน', cancel: 'ยกเลิก', restoring: 'กำลังกู้คืน…',
    historyStale: 'มีคนบันทึกฉบับใหม่เมื่อสักครู่ รายการอัปเดตแล้ว กรุณาลองอีกครั้ง', oldBanner: 'คุณกำลังดูฉบับก่อนหน้า บันทึกเมื่อ {d} โดย {by} แก้ไขที่นี่ไม่ได้', backNewest: 'ไปที่ฉบับล่าสุด', restoreThis: 'กู้คืนฉบับนี้',
    slideNote: 'คลิกข้อความบนสไลด์แล้วพิมพ์ · Enter ขึ้นบรรทัดใหม่ (หัวข้อย่อยใหม่) · Backspace ที่ต้นบรรทัดเพื่อรวมกับบรรทัดก่อนหน้า · บันทึกให้อัตโนมัติ · รูปภาพ การจัดวาง และภาพเคลื่อนไหวไม่เปลี่ยน',
    docNote: 'คลิกข้อความในเอกสารแล้วพิมพ์ · Enter ขึ้นย่อหน้าใหม่ (ลำดับเลขหรือหัวข้อย่อยต่อให้เอง) · Backspace ที่ต้นย่อหน้าเพื่อรวมกับย่อหน้าก่อน · บันทึกให้อัตโนมัติ · รูปแบบ รูปภาพ หัวกระดาษและท้ายกระดาษไม่เปลี่ยน',
    savingBig: 'กำลังบันทึก… ({mb} MB)', textClash: 'มีคนแก้ข้อความเดียวกันพร้อมกับคุณ หน้านี้แสดงฉบับของเขา ข้อความที่คุณพิมพ์คือ: {text}', newerBig: '{by} บันทึกฉบับใหม่ของไฟล์นี้แล้ว', showNewest: 'แสดงฉบับล่าสุด',
    editCells: 'แก้ไข', doneEdit: 'เสร็จ', undo: 'เลิกทำ', saving: 'กำลังบันทึก…', unsaved: 'กำลังจะบันทึก…', autosaveOn: 'บันทึกอัตโนมัติ',
    savedAt: 'บันทึกทั้งหมดแล้ว {time}', notSaved: 'ยังไม่ได้บันทึก ({msg}) จะลองใหม่อัตโนมัติ', offline: 'ไม่มีการเชื่อมต่อ',
    othersSaved: '{by} บันทึกการแก้ไข หน้านี้แสดงฉบับล่าสุดแล้ว', updated: 'มีการบันทึกฉบับใหม่ หน้านี้แสดงฉบับล่าสุดแล้ว',
    clash: 'มีคนแก้ {refs} พร้อมกับคุณ ระบบเก็บค่าที่คุณพิมพ์ (ฉบับของเขายังเก็บไว้ในฉบับก่อนหน้า)', lost: 'บันทึก {refs} ไม่ได้ เพราะฉบับใหม่เปลี่ยนช่องนั้นเป็นสูตรหรือลบออกแล้ว',
    fxNote: 'ช่องสูตร แก้ได้ใน Excel', staleNote: 'สูตรนี้ใช้คำสั่งที่เว็บคำนวณเองไม่ได้ ค่าจะคำนวณใหม่เมื่อเปิดไฟล์ใน Excel',
    editNote: 'คลิกเซลล์แล้วพิมพ์ · Enter, Tab และลูกศรใช้เลื่อนเซลล์เหมือน Excel · วางหลายเซลล์จาก Excel ได้ · บันทึกให้อัตโนมัติ · ผลรวมและสูตรอื่นคำนวณใหม่ทันทีที่คุณพิมพ์ (ตัวสูตรแก้ที่นี่ไม่ได้) · วันที่พิมพ์แบบ 2026-11-20', leaveAsk: 'ยังไม่ได้บันทึกการแก้ไข ออกจากหน้านี้?',
    hesShared: 'Caltex เห็นฉบับนี้ตั้งแต่ {d}', hesNotShared: 'Caltex ยังไม่เห็นฉบับนี้ (แชร์ได้ที่แท็บไฟล์ → แชร์กับ Caltex) และจะเห็นฉบับที่แชร์ล่าสุดแทน',
    hesTitle: 'แผน HES Stewardship', hesMissing: 'ยังไม่มีไฟล์ — อัปโหลดไฟล์ "HES Stewardship Plan ... .xlsx" ที่แท็บไฟล์ (โฟลเดอร์ความปลอดภัย) แล้วไฟล์ล่าสุดจะแสดงที่นี่', slide: 'สไลด์ {i} / {n}', openCad: 'เปิดในพื้นที่ทำงาน CAD',
  },
  en: {
    back: '← Back to folder', download: 'Download', present: 'Present', close: 'Close', loading: 'Opening the file…',
    notFound: 'This file was not found, or you do not have access to it.', failed: 'This file could not be shown in the browser ({msg}). Use "Download" to open it on your computer.',
    noPreview: 'This kind of file cannot be shown in the browser. Use "Download" to open it on your computer.',
    oldFormat: 'Older Office files (.doc / .ppt / .xls) cannot be shown in the browser. Save as .docx / .pptx / .xlsx and upload again, or use "Download".',
    approx: 'The browser preview can differ slightly from Office (fonts, positions, charts). The downloaded file is the original.',
    rowsCut: 'Showing the first {n} rows. Download to see them all.', uploaded: 'Last saved {d} by {by}. Use "Edit" to change cells here (changes save by themselves), or upload a new Excel copy in Files. Earlier versions are kept.',
    history: 'History', historyOf: 'Earlier versions of {name}', historyNote: 'Every saved version is kept. Open one to look at it, or restore it to make it the newest version again. Restoring removes nothing: the version it replaces stays in this list.',
    verCurrent: 'Current', verViewing: 'On screen', verBy: 'by {by}', howUpload: 'Uploaded', howEdit: 'Edited on the site', howRestore: 'Restored from the version of {d}', howRestorePlain: 'Restored from an earlier version',
    verCaltex: 'Shared with Caltex from {d}', open: 'Open', restore: 'Restore', restoreAsk: 'Make this the newest version?', restoreYes: 'Yes, restore', cancel: 'Cancel', restoring: 'Restoring…',
    historyStale: 'Someone saved a newer version just now. The list has been updated; please try again.', oldBanner: 'You are looking at an earlier version, saved {d} by {by}. It cannot be changed here.', backNewest: 'Go to the newest version', restoreThis: 'Restore this version',
    slideNote: 'Click any text on a slide and type. Enter starts a new line (a new bullet); Backspace at the start of a line joins it to the one before. Changes save by themselves. Pictures, layout and animations are not changed.',
    docNote: 'Click any text in the document and type. Enter starts a new paragraph (numbering and bullets carry on); Backspace at the start of a paragraph joins it to the one before. Changes save by themselves. Styles, pictures, headers and footers are not changed.',
    savingBig: 'Saving… ({mb} MB)', textClash: 'Someone else changed the same text at the same time. Their version is shown; what you typed was: {text}', newerBig: '{by} saved a newer version of this file.', showNewest: 'Show the newest version',
    editCells: 'Edit', doneEdit: 'Done', undo: 'Undo', saving: 'Saving…', unsaved: 'Saving in a moment…', autosaveOn: 'Changes save automatically',
    savedAt: 'All changes saved {time}', notSaved: 'Not saved yet ({msg}); trying again by itself', offline: 'no connection',
    othersSaved: '{by} saved changes; this page now shows the newest version.', updated: 'A newer version was saved; this page now shows it.',
    clash: 'Someone else changed {refs} at the same time; your entry was kept (theirs stays in the earlier version).', lost: '{refs} could not be saved: in the newer version that cell holds a formula or was removed.',
    fxNote: 'Formula: change it in Excel', staleNote: 'This formula uses something the site cannot work out itself. Its value is worked out again when the file is opened in Excel.',
    editNote: 'Click a cell and type. Enter, Tab and the arrow keys move between cells, as in Excel. You can paste several cells from Excel. Changes save by themselves. Totals and other formulas update as you type (the formulas themselves cannot be changed here). Type dates like 2026-11-20.', leaveAsk: 'You have unsaved changes. Leave this page?',
    hesShared: 'Caltex sees this version from {d}', hesNotShared: 'Caltex does not see this version yet (share it in Files → Share with Caltex); they see the last shared version instead',
    hesTitle: 'HES Stewardship Plan', hesMissing: 'No file yet. Upload "HES Stewardship Plan ... .xlsx" in Files (Safety folder); the newest copy is shown here.', slide: 'Slide {i} / {n}', openCad: 'Open in the CAD workspace',
  },
};
const ext = (n) => (/\.([a-z0-9]{1,8})$/i.exec(n)?.[1] || '').toLowerCase();
const $ = (id) => document.getElementById(id);
const MAX_ROWS = 3000, MAX_COLS = 200;
let W = WORDS.th, lang = 'th', file = null, canEdit = false;
let FILES = null;   // the /api/files list (for the DWG twin of a PDF)
const t = (k, v = {}) => W[k].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); }
  for (const c of kids.flat()) if (c != null) n.append(c);
  return n;
}
function status(text, kind) { const s = $('status'); s.hidden = !text; s.textContent = text || ''; s.dataset.kind = kind || ''; }
// Pinned mode (<body data-pin="hes">, e.g. Safety -> HES plan): the newest matching file from /api/pins/<pin>.
const PIN = document.body.dataset.pin || '';
let OLD = null; // an earlier version on screen (view.html?id=<file>&v=<version>): { id, at, by }; look only
const src = (inline) => (PIN ? `/api/pins/${PIN}/download/${encodeURIComponent(file.name)}` : `/api/files/${OLD ? OLD.id : file.id}/download${inline ? '?inline=1' : ''}`);
const when = (iso) => new Date(iso).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
let lastAt = ''; // saved time of the version last downloaded (Excel editing compares it with the newest)
async function bytes() {
  const r = await fetch(src(false), { credentials: 'same-origin', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  lastAt = r.headers.get('X-File-Saved-At') || '';
  return r.arrayBuffer();
}

async function start() {
  let me = null;
  try { const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }); if (r.status === 401) { location.href = '/sign-in.html'; return; } me = await r.json(); } catch { /* ignore */ }
  lang = languageFor(me); W = WORDS[lang]; document.documentElement.lang = lang;
  $('back').textContent = t('back');
  if (PIN) {
    $('back').hidden = true;
    let pinned = null;
    try { const r = await fetch(`/api/pins/${PIN}`, { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) pinned = await r.json(); } catch { /* ignore */ }
    file = pinned?.file || null; canEdit = !!pinned?.canEdit;
    if (!file) { $('name').textContent = t(`${PIN}Title`); status(t(`${PIN}Missing`)); return; }
    $('meta').textContent = t('uploaded', { d: new Date(file.at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }), by: file.by });
    if ('caltexFrom' in file) $('meta').textContent += ' · ' + (file.caltexFrom ? t('hesShared', { d: file.caltexFrom }) : t('hesNotShared'));
  }
  const params = new URL(location.href).searchParams, id = params.get('id') || '';
  let list = null, canRestore = false;
  if (!PIN) {
    try { const r = await fetch('/api/files', { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) list = await r.json(); } catch { /* ignore */ }
    FILES = list;
    file = list?.files.find((f) => f.id === id) || null; canEdit = !!list?.canEdit;
    if (!file && /^[0-9a-f-]{36}$/.test(id)) {
      // An older link (the file has been saved again since): go to the newest version.
      try { const r = await fetch(`/api/files/${id}/latest`, { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) { location.replace(`/files/view.html?id=${encodeURIComponent((await r.json()).id)}`); return; } } catch { /* ignore */ }
    }
    const v = params.get('v');
    if (file && v && v !== file.id && list?.team) {
      let found = null;
      try { const r = await fetch(`/api/files/${file.id}/versions`, { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) { const d = await r.json(); found = d.versions.find((x) => x.id === v && !x.current) || null; canRestore = !!d.canRestore; } } catch { /* ignore */ }
      if (!found) { file = null; } else { OLD = found; canEdit = false; }
    }
  }
  if (!file) { $('name').textContent = ''; status(t('notFound'), 'bad'); return; }
  const hasHistory = PIN ? !!file.id : !!list?.team;
  document.title = `${file.name} · Caltex Wastewater 2027`;
  $('name').textContent = file.name;
  if (!PIN) $('back').href = `/files/#${encodeURIComponent(file.folder)}`;
  const e = ext(file.name);
  const acts = [el('a', { class: 'btn', href: src(false), download: file.name }, t('download'))];
  if (hasHistory) acts.push(el('button', { type: 'button', class: 'btn', onclick: () => openHistory() }, t('history')));
  $('actions').replaceChildren(...acts);
  if (OLD) {
    const newest = `/files/view.html?id=${encodeURIComponent(file.id)}`;
    $('status').before(el('div', { class: 'fv-old' }, el('span', {}, t('oldBanner', { d: when(OLD.at), by: OLD.by })),
      el('a', { class: 'btn', href: newest }, t('backNewest')),
      canRestore ? el('button', { type: 'button', class: 'btn primary', onclick: (ev) => restoreVersion(OLD.id, file.id, file.at, ev.currentTarget) }, t('restoreThis')) : null));
  }
  const wantHistory = hasHistory && params.get('history') === '1';
  if (wantHistory) openHistory();
  status(t('loading'));
  try {
    if (e === 'pdf') showPdf();
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(e)) showImage();
    else if (e === 'mp4') $('view').replaceChildren(el('video', { src: src(true), controls: true, class: 'fv-media' }));
    else if (e === 'docx') await showDocx();
    else if (e === 'xlsx' || e === 'xlsm') await showXlsx();
    else if (e === 'pptx' || e === 'pptm') await showPptx();
    else if (e === 'csv') showTable([parseCsv(new TextDecoder().decode(await bytes()))], ['CSV']);
    else if (e === 'txt') $('view').replaceChildren(el('pre', { class: 'fv-text' }, new TextDecoder().decode(await bytes())));
    else if ((e === 'dwg' || e === 'dxf') && (OLD || wantHistory)) { if (!OLD) $('actions').prepend(el('a', { class: 'btn primary', href: cadHref(file) }, t('openCad'))); status(OLD ? t('noPreview') : ''); return; }
    else if (e === 'dwg' || e === 'dxf') { location.replace(cadHref(file)); return; }
    else { status(['doc', 'ppt', 'xls'].includes(e) ? t('oldFormat') : t('noPreview')); return; }
    if (!['docx', 'xlsx', 'xlsm', 'pptx', 'pptm'].includes(e)) status('');
  } catch (err) {
    console.warn('preview failed', err);
    $('view').replaceChildren();
    status(t('failed', { msg: String(err?.message || err).slice(0, 80) }), 'bad');
  }
}

// ---- Version history (SPP people): every saved version, to look at, download or bring back ----
async function restoreVersion(versionId, base, baseAt, btn) {
  if (btn) { btn.disabled = true; btn.textContent = t('restoring'); }
  const q = new URLSearchParams({ base, ...(baseAt ? { baseAt } : {}) });
  const r = await fetch(`/api/files/${encodeURIComponent(versionId)}/restore?${q}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'files' } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(r.status === 409 ? t('historyStale') : body.error || `HTTP ${r.status}`); e.status = r.status; throw e; }
  if (PIN) location.reload(); else location.href = `/files/view.html?id=${encodeURIComponent(body.id)}`;
}
async function openHistory() {
  if (typeof flush === 'function' && (pending.size || inflight)) { try { await flush(); } catch { /* shown in the edit bar */ } }
  const list = el('div', { class: 'fv-hist' }, t('loading')), note = el('p', { class: 'fm-status', hidden: true, role: 'status' });
  const dlg = el('dialog', { class: 'fv-dialog', 'aria-label': t('history') },
    el('div', { class: 'fv-dialog-head' }, el('strong', {}, t('historyOf', { name: file.name })), el('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, t('close'))),
    el('p', { class: 'fm-note' }, t('historyNote')), note, list);
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
  const say = (text) => { note.hidden = !text; note.textContent = text || ''; note.dataset.kind = 'bad'; };
  const load = async () => {
    const r = await fetch(`/api/files/${encodeURIComponent(file.id)}/versions`, { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    list.replaceChildren(...data.versions.map((v) => {
      const onScreen = OLD ? v.id === OLD.id : v.current;
      const how = v.how === 'edit' ? t('howEdit') : v.how === 'restore' ? (v.from ? t('howRestore', { d: when(v.from) }) : t('howRestorePlain')) : t('howUpload');
      const ops = el('span', { class: 'ops' });
      const normal = () => ops.replaceChildren(
        el('a', { class: 'btn', href: v.current ? `/files/view.html?id=${encodeURIComponent(v.id)}` : `/files/view.html?id=${encodeURIComponent(data.current)}&v=${encodeURIComponent(v.id)}` }, t('open')),
        el('a', { class: 'btn', href: `/api/files/${encodeURIComponent(v.id)}/download`, download: file.name }, t('download')),
        data.canRestore && !v.current ? el('button', { type: 'button', class: 'btn', onclick: ask }, t('restore')) : '');
      const ask = () => ops.replaceChildren(el('span', {}, t('restoreAsk')),
        el('button', { type: 'button', class: 'btn primary', onclick: async (ev) => {
          say('');
          try { await restoreVersion(v.id, data.current, data.at, ev.currentTarget); }
          catch (e) { say(e.message); if (e.status === 409) await load().catch(() => {}); else normal(); }
        } }, t('restoreYes')),
        el('button', { type: 'button', class: 'btn', onclick: normal }, t('cancel')));
      normal();
      return el('div', { class: `fv-ver${onScreen ? ' on' : ''}` },
        el('div', { class: 'nm' }, el('strong', {}, when(v.at)), v.current ? el('span', { class: 'chip on' }, t('verCurrent')) : null, onScreen && !v.current ? el('span', { class: 'chip' }, t('verViewing')) : null,
          el('small', {}, [t('verBy', { by: v.by }), kb(v.size), how, v.caltexFrom ? t('verCaltex', { d: v.caltexFrom }) : null].filter(Boolean).join(' · '))),
        ops);
    }));
  };
  try { await load(); } catch (e) { list.textContent = t('failed', { msg: String(e.message || e).slice(0, 80) }); }
}

function presentButton(onclick) { $('actions').prepend(el('button', { type: 'button', class: 'btn primary', onclick }, t('present'))); }
function fullscreen(node) { node.requestFullscreen?.().catch(() => {}); }

// DWG / DXF open in Sites -> CAD workspace, the one CAD tool of the site (Brian, 27 Nov 2026).
const cadHref = (f) => (f.sha256 ? `/cad-workspace/?dwg=${encodeURIComponent(f.sha256)}` : `/files/cad/?dwg=${encodeURIComponent(f.id)}`);
// The same drawing as DWG / DXF next to this PDF (same folder, same name before the extension): "Open in CAD".
function cadTwin(f) {
  const base = f.name.replace(/\.[^.]+$/, '').toLowerCase();
  return (FILES?.files || []).find((x) => x.folder === f.folder && /\.(dwg|dxf)$/i.test(x.name) && x.name.replace(/\.[^.]+$/, '').toLowerCase() === base) || null;
}
function showPdf() {
  const frame = el('iframe', { src: `${src(true)}#view=FitH`, title: file.name, class: 'fv-frame' });
  $('view').replaceChildren(frame);
  presentButton(() => fullscreen(frame));
  const twin = !OLD && cadTwin(file);
  if (twin) $('actions').prepend(el('a', { class: 'btn primary', href: cadHref(twin) }, t('openCad')));
}
function showImage() {
  const img = el('img', { src: src(true), alt: file.name, class: 'fv-media' });
  $('view').replaceChildren(img);
  presentButton(() => fullscreen(img));
}

async function showDocx() {
  const [{ renderAsync }, buf] = await Promise.all([import('/files/vendor/docx.mjs'), bytes()]);
  const host = el('div', { class: 'fv-docx' });
  $('view').replaceChildren(host);
  const render = async (b) => { host.replaceChildren(); // renderAltChunks off: a .docx can carry a piece of raw web page ("altChunk"); the viewer would show it inside this site.
    await renderAsync(b, host, null, { inWrapper: true, ignoreLastRenderedPageBreak: true, experimental: true, useBase64URL: true, renderAltChunks: false }); };
  await render(buf);
  status(t('approx'));
  // Typing into the document (people who may upload to Files), and showing a newer version when someone saves one.
  if (!OLD && !PIN && file.folder) {
    try { const { editDocument } = await import('/files/textedit.mjs'); await editDocument({ host, render, buf, at: lastAt || file.at, file, canEdit, t, el, status, lang, actions: $('actions'), before: $('view') }); }
    catch (e) { console.warn('document editing not available', e); }
  }
}

// ---- Excel ----
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return { rows: rows.map((r) => r.map((v) => ({ text: v }))), merges: [] };
}
function colLetter(n) { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }
async function readSheets(buf) {
  const { readWorkbook } = await import('/files/vendor/xlsx.mjs');
  const wb = await readWorkbook(buf);
  const sheets = [];
  sheets.book = wb; // the whole workbook (hidden sheets too) for working out formulas
  wb.eachSheet((ws) => {
    if (ws.state && ws.state !== 'visible') return;
    const rowCount = Math.min(ws.actualRowCount ? ws.rowCount : 0, MAX_ROWS), colCount = Math.min(ws.columnCount, MAX_COLS);
    const rows = [];
    for (let r = 1; r <= rowCount; r++) {
      const row = ws.getRow(r), out = [];
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c), st = cell.style || {};
        const v = cell.value, formula = !!(cell.formula || cell.sharedFormula || (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)));
        // A formula's saved answer: cell.result (the reader's cell.value leaves it out when it is 0 or FALSE).
        const res = formula ? (cell.result ?? v?.result) : v;
        let text = '', fx = '';
        if (res instanceof Date) text = res.toISOString().slice(0, 10);
        else if (res && typeof res === 'object' && 'error' in res) text = String(res.error);
        else if (formula && typeof res === 'number') text = String(res);
        else if (formula && typeof res === 'boolean') text = res ? 'TRUE' : 'FALSE';
        else { try { text = cell.text ?? ''; } catch { text = String(v ?? ''); } }
        if (formula) { try { fx = cell.formula || v?.formula || ''; } catch { fx = ''; } }
        if (formula && (res === undefined || res === null)) text = `=${fx}`; // never worked out: show the formula
        const fmt = String(cell.numFmt || '');
        out.push({ text, bold: !!st.font?.bold, fill: st.fill?.fgColor?.argb, align: st.alignment?.horizontal, num: typeof res === 'number',
          ref: `${colLetter(c - 1)}${r}`, formula, fx, isDate: v instanceof Date || (/[dy]/i.test(fmt.replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/general/i.test(fmt)), isNum: typeof v === 'number', richOrOther: v != null && typeof v === 'object' && !(v instanceof Date) && !formula });
      }
      rows.push(out);
    }
    sheets.push({ name: ws.name, rows, merges: [...(ws.model?.merges || [])], cut: ws.rowCount > MAX_ROWS, widths: Array.from({ length: colCount }, (_, i) => ws.getColumn(i + 1).width) });
  });
  return sheets;
}
async function showXlsx() {
  const buf = await bytes();
  const sheets = await readSheets(buf);
  doc = { buf, id: file.id || '', at: lastAt || file.at || '' };
  if (canEdit && !OLD) await setBook(sheets.book);
  showTable(sheets, sheets.map((s) => s.name), buf);
  status(t('approx'));
  if (!OLD) setTimeout(poll, POLL_ACTIVE);
}
function cellRef(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) return null; let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [Number(m[2]) - 1, c - 1]; }

// ---- Excel editing (people who may upload to Files) ----
// Works like Excel online: click a cell and type; Enter / Tab / arrows move between cells. Changes save by themselves a
// moment after you leave a cell (or after a few seconds without typing): only the changed cells are written into the file
// (vendor/xlsxedit.mjs), everything else stays byte for byte. The server folds one person's run of edits into one version.
// Several people at once: the page checks for a newer version every few seconds and shows other people's changes. If
// someone saved first, your changes are laid on top of their version and saved again (same cell: the later entry wins,
// with a notice). Nothing is lost: earlier versions are kept.
const SAVE_AFTER_LEAVE = 700, SAVE_AFTER_TYPING = 3000, RETRY_AFTER = 5000, POLL_ACTIVE = 10000, POLL_IDLE = 60000, IDLE_AFTER = 5 * 60000;
let doc = null;              // the version on screen: { buf, id, at }
const pending = new Map();   // 'Sheet!B4' -> { sheet, ref, kind, value, text, was } not saved yet
let inflight = null;         // the edits being saved right now (same shape)
let editing = false, current = 0, saveTimer = 0, saveError = '', savedAt = '', lastActive = Date.now();
const undoStack = [];        // each entry: [{ sheet, ref, before, after }, ...] (a paste is one entry)
let ui = null;               // { sheets, grid, tds, paint, draw, ... } set by showTable

// ---- Formulas that follow your changes (vendor-free: /files/formula.mjs) ----
// Formulas that depend on a changed cell are worked out here and shown at once; on save their new results are written
// next to the formulas in the file, so everyone on the site sees the right totals. Everything else keeps the value Excel
// saved. A formula the site cannot work out is shown as its formula (never as a number that may be wrong).
const MAX_FORMULAS = 20000;
let calcBook = null;         // { wb, names, formulas: [[si, r, c]], text: Map(key -> formula), done: Map(key -> { v } | { fv }), tables, defined, epoch, off }
let createCalc = null;
const shownCalc = new Map(); // 'Sheet!B4' -> { text, stale } for formulas that follow unsaved changes
const cellKey = (si, r, c) => (si * 16384 + (c - 1)) * 1048576 + (r - 1);
const fromExcel = (x, epoch) => {
  if (x === null || x === undefined) return x;
  if (x instanceof Date) return (x.getTime() - epoch) / 864e5;
  if (typeof x !== 'object') return x;
  if ('error' in x) return { e: String(x.error) };
  if (Array.isArray(x.richText)) return x.richText.map((p) => p.text).join('');
  if ('text' in x) return String(x.text ?? '');
  if ('formula' in x || 'sharedFormula' in x) return fromExcel(x.result, epoch);
  return String(x);
};
async function setBook(wb) {
  shownCalc.clear();
  if (!createCalc) ({ createCalc } = await import('/files/formula.mjs'));
  const b = { wb, names: wb.worksheets.map((w) => w.name), formulas: [], text: new Map(), done: new Map(), tables: new Map(), defined: new Map(), off: false,
    epoch: wb.properties?.date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30) };
  wb.worksheets.forEach((ws, si) => {
    ws.eachRow((row, r) => row.eachCell((cell, c) => {
      if (cell.type !== 6 || b.off) return;
      let f = ''; try { f = cell.formula || ''; } catch { f = ''; }
      b.formulas.push([si, r, c]); b.text.set(cellKey(si, r, c), f);
      if (b.formulas.length > MAX_FORMULAS) b.off = true;
    }));
    for (const t of Object.values(ws.tables || {})) {
      const m = t.model || t.table || {}, a = /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/.exec(m.tableRef || '');
      if (!a || !m.name) continue;
      const cn = (x) => [...x].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
      const def = { si, r1: +a[2], c1: cn(a[1]), r2: +a[4], c2: cn(a[3]), header: m.headerRow !== false, totals: !!m.totalsRow, cols: (m.columns || []).map((x) => String(x.name)) };
      b.tables.set(String(m.name).toLowerCase(), def); if (m.displayName) b.tables.set(String(m.displayName).toLowerCase(), def);
    }
  });
  for (const n of wb.definedNames?.model || []) if (n.ranges?.length === 1 && !/^_xlnm\./i.test(n.name)) b.defined.set(String(n.name).toLowerCase(), n.ranges[0]);
  calcBook = b;
}
/** Works out every formula that depends on the given unsaved changes: [{ si, r, c, sheet, ref, v, stale }]. */
function recalc(maps) {
  const b = calcBook, out = [];
  if (!b || b.off) return out;
  const ov = new Map();
  for (const m of maps) if (m) for (const e of m.values()) {
    const si = b.names.indexOf(e.sheet), p = cellRef(e.ref);
    if (si < 0 || !p) continue;
    ov.set(cellKey(si, p[0] + 1, p[1] + 1), { v: e.kind === 'clear' ? null : e.kind === 'number' ? Number(e.value) : e.kind === 'date' ? (Date.parse(`${e.value}T00:00:00Z`) - b.epoch) / 864e5 : String(e.value) });
  }
  if (!ov.size) return out;
  const engine = createCalc({
    sheets: b.names, tables: b.tables, names: b.defined, epoch: b.epoch,
    today: () => Math.floor((Date.now() + 7 * 3600 * 1000 - b.epoch) / 864e5), // the date in Thailand
    dims: (si) => [b.wb.worksheets[si].rowCount, b.wb.worksheets[si].columnCount],
    rowHidden: (si, r) => !!b.wb.worksheets[si].findRow(r)?.hidden,
    overlay: (si, r, c) => ov.get(cellKey(si, r, c)), anyOverlay: () => ov.size > 0,
    cell: (si, r, c) => {
      const k = cellKey(si, r, c), done = b.done.get(k), cell = b.wb.worksheets[si].findCell(r, c);
      if (!cell && !done) return undefined;
      const f = b.text.has(k) ? b.text.get(k) : null, x = cell ? cell.value : null;
      if (done) return { f, v: 'fv' in done ? done.fv : done.v, arr: false };
      return { f, v: f !== null ? fromExcel(cell.result ?? x?.result, b.epoch) : fromExcel(x, b.epoch) ?? null, arr: f !== null && (x?.shareType === 'array' || f === '') };
    },
  });
  for (const [si, r, c] of b.formulas) {
    const res = engine.result(si, r, c);
    if (res.dirty) out.push({ si, r, c, sheet: b.names[si], ref: `${colLetter(c - 1)}${r}`, v: res.v, stale: res.stale });
  }
  return out;
}
/** How a worked-out value is written in a cell. */
function calcText(v, cell) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return v.e;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return cell?.isDate ? new Date(calcBook.epoch + Math.round(v) * 864e5).toISOString().slice(0, 10) : Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(15)));
  return v;
}
/** Shows the formulas that follow the unsaved changes (and puts back those that no longer do). */
function showCalc() {
  if (!ui || !calcBook) return;
  let results = [];
  try { results = recalc([inflight, pending]); } catch (e) { console.warn('formulas not updated', e); }
  const next = new Map();
  for (const x of results) { const cell = findCell(ui.sheets, x.sheet, x.ref); if (cell) next.set(keyOf(x.sheet, x.ref), { text: x.stale ? `=${cell.fx}` : calcText(x.v, cell), stale: x.stale }); }
  for (const key of new Set([...shownCalc.keys(), ...next.keys()])) {
    const was = shownCalc.get(key), now = next.get(key), td = ui.tds.get(key);
    if (now) shownCalc.set(key, now); else shownCalc.delete(key);
    if (!td || (was?.text === now?.text && was?.stale === now?.stale)) continue;
    const i = key.lastIndexOf('!'), cell = findCell(ui.sheets, key.slice(0, i), key.slice(i + 1));
    td.textContent = now ? now.text : cell?.text ?? '';
    td.classList.toggle('stale', !!now?.stale); td.title = now?.stale ? t('staleNote') : '';
    td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash');
  }
}
let calcTimer = 0;
const calcSoon = () => { clearTimeout(calcTimer); calcTimer = setTimeout(showCalc, 150); };

function kindFor(cell, text) {
  const s = text.replace(/ /g, ' ').trim();
  if (!s) return { kind: 'clear' };
  if (cell.isDate && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))) return { kind: 'date', value: s };
  if ((cell.isNum || (!cell.text && !cell.isDate)) && /^-?\d+(\.\d+)?$/.test(s)) return { kind: 'number', value: s };
  return { kind: 'text', value: text.replace(/ /g, ' ') };
}
const keyOf = (sheet, ref) => `${sheet}!${ref}`;
const typeable = (cell) => !!cell && !cell.formula && !cell.richOrOther;
const cellText = (td) => td.innerText.replace(/\r/g, '').replace(/\n$/, '');
function findCell(sheets, sheet, ref) { const sh = sheets.find((s) => s.name === sheet), p = cellRef(ref); return sh && p ? sh.rows[p[0]]?.[p[1]] || null : null; }
function busy(key) { return pending.has(key) || !!inflight?.has(key); }
function shown(e) { return e.kind === 'clear' ? '' : e.text; }

/** Records what a cell should now hold (compared with the saved version) and marks it until it is saved. */
function setCell(sheet, cell, text) {
  const key = keyOf(sheet, cell.ref), prior = pending.get(key) || inflight?.get(key);
  if (text === cell.text && !inflight?.has(key)) pending.delete(key);
  else pending.set(key, { sheet, ref: cell.ref, text, was: prior ? prior.was : cell.text, ...kindFor(cell, text) });
  const td = ui?.tds.get(key);
  if (td) td.classList.toggle('pend', busy(key));
  calcSoon();
}
function scheduleSave(ms) { clearTimeout(saveTimer); saveTimer = pending.size ? setTimeout(flush, ms) : 0; ui?.paint(); }

async function flush() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (inflight || !pending.size || !doc) return;
  inflight = new Map(pending); pending.clear(); saveError = ''; ui?.paint();
  let retry = false;
  try {
    const { applyEdits } = await import('/files/vendor/xlsxedit.mjs');
    for (let attempt = 0; ; attempt++) {
      if (!inflight.size) break; // everything was dropped while catching up
      // The formulas that follow these changes: their new results go into the file with them.
      let follow = [];
      try { follow = recalc([inflight]); } catch (e) { console.warn('formulas not updated', e); }
      const out = await applyEdits(doc.buf, [...[...inflight.values()].map(({ sheet, ref, kind, value }) => ({ sheet, ref, kind, value })),
        ...follow.map((x) => (x.stale ? { sheet: x.sheet, ref: x.ref, kind: 'uncache' } : { sheet: x.sheet, ref: x.ref, kind: 'cached', value: x.v }))]);
      const saved = [...inflight.values()], book = calcBook;
      const q = new URLSearchParams({ folder: file.folder, name: file.name, base: doc.id, baseAt: doc.at, autosave: '1' });
      let r;
      try { r = await fetch(`/api/files/upload?${q}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'files', 'Content-Type': 'application/octet-stream' }, body: out }); }
      catch { retry = true; throw new Error(t('offline')); }
      const body = await r.json().catch(() => ({}));
      if (r.status === 409 && attempt < 4) { await catchUp(); continue; }
      if (!r.ok) { retry = r.status >= 500 || r.status === 409; throw new Error(body.error || `HTTP ${r.status}`); }
      for (const e of inflight.values()) { const c = findCell(ui.sheets, e.sheet, e.ref); if (c) c.text = e.text; }
      if (book && book === calcBook) {
        // What is now in the saved file, for the next round of working out.
        for (const e of saved) { const si = book.names.indexOf(e.sheet), p = cellRef(e.ref); if (si >= 0 && p) book.done.set(cellKey(si, p[0] + 1, p[1] + 1), { v: e.kind === 'clear' ? null : e.kind === 'number' ? Number(e.value) : e.kind === 'date' ? (Date.parse(`${e.value}T00:00:00Z`) - book.epoch) / 864e5 : String(e.value) }); }
        for (const x of follow) { book.done.set(cellKey(x.si, x.r, x.c), { fv: x.stale ? undefined : x.v }); const c = findCell(ui.sheets, x.sheet, x.ref); if (c) c.text = x.stale ? `=${c.fx}` : calcText(x.v, c); }
      }
      doc = { buf: out, id: body.id, at: body.at || '' };
      file.id = body.id; file.at = body.at;
      if (!PIN) history.replaceState(null, '', `/files/view.html?id=${encodeURIComponent(body.id)}`);
      savedAt = new Date().toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
      break;
    }
    const done = inflight; inflight = null;
    for (const key of done.keys()) ui?.tds.get(key)?.classList.toggle('pend', busy(key));
    showCalc();
  } catch (e) {
    const failed = inflight; inflight = null;
    if (retry) {
      // Keep the changes and try again shortly (no connection on site, a server hiccup).
      for (const [k, v] of failed) if (!pending.has(k)) pending.set(k, v);
      saveError = String(e.message || e).slice(0, 80);
    } else {
      // The file cannot take these changes (e.g. a 1904-date workbook): put the cells back as saved and say why.
      for (const [k, v] of failed) {
        if (pending.has(k)) continue;
        const c = findCell(ui.sheets, v.sheet, v.ref), td = ui.tds.get(k);
        if (td && c) { td.textContent = c.text; td.classList.remove('pend'); }
      }
      status(String(e.message || e), 'bad');
    }
    showCalc();
  }
  if (pending.size) scheduleSave(saveError ? RETRY_AFTER : SAVE_AFTER_LEAVE); else ui?.paint();
}

/** The newest version's id and saved time (what this person may see), or null. */
async function latestInfo() {
  if (PIN) {
    const r = await fetch(`/api/pins/${PIN}`, { credentials: 'same-origin', cache: 'no-store' });
    const f = r.ok ? (await r.json()).file : null;
    return f ? { id: f.id || '', at: f.at, by: f.by || '', name: f.name, folder: f.folder } : null;
  }
  const r = await fetch(`/api/files/${encodeURIComponent(doc.id)}/latest`, { credentials: 'same-origin', cache: 'no-store' });
  return r.ok ? r.json() : null;
}
/** If a newer version was saved, load it, show it, and lay any unsaved changes on top. Returns true if it changed. */
async function catchUp() {
  const info = await latestInfo();
  if (!info || (info.id === doc.id && info.at === doc.at)) return false;
  if (PIN) { file.name = info.name || file.name; file.folder = info.folder || file.folder; }
  file.id = info.id; file.at = info.at;
  const buf = await bytes();
  const fresh = await readSheets(buf);
  doc = { buf, id: info.id, at: lastAt || info.at };
  if (calcBook) await setBook(fresh.book);
  const clash = [], lost = [];
  for (const m of [inflight, pending]) if (m) for (const [key, e] of m) {
    const c = findCell(fresh, e.sheet, e.ref);
    if (!typeable(c)) { m.delete(key); lost.push(e.ref); continue; }
    if (c.text !== e.was && c.text !== e.text) clash.push(e.ref);
    e.was = c.text; Object.assign(e, kindFor(c, e.text));
  }
  ui.adopt(fresh);
  showCalc();
  if (!info.mine) {
    const notes = [info.by ? t('othersSaved', { by: info.by }) : t('updated')];
    if (clash.length) notes.push(t('clash', { refs: clash.slice(0, 6).join(', ') }));
    if (lost.length) notes.push(t('lost', { refs: lost.slice(0, 6).join(', ') }));
    status(notes.join(' '), clash.length || lost.length ? 'bad' : 'ok');
  }
  return true;
}
async function poll() {
  clearTimeout(poll.t);
  try {
    if (document.visibilityState === 'visible' && !inflight && doc) {
      if (pending.size) await flush(); // saving also catches up with anyone else's changes
      else await catchUp();
    }
  } catch (e) { console.warn('check for changes failed', e); }
  poll.t = setTimeout(poll, Date.now() - lastActive > IDLE_AFTER ? POLL_IDLE : POLL_ACTIVE);
}
function undoLast() {
  const entry = undoStack.pop();
  if (!entry) return;
  for (const u of entry) {
    const c = findCell(ui.sheets, u.sheet, u.ref);
    if (!typeable(c)) continue;
    setCell(u.sheet, c, u.before);
    const td = ui.tds.get(keyOf(u.sheet, u.ref));
    if (td) td.textContent = u.before;
  }
  const where = entry[0], si = ui.sheets.findIndex((s) => s.name === where.sheet);
  if (si >= 0 && si !== current) ui.draw(si);
  ui.tds.get(keyOf(where.sheet, where.ref))?.focus();
  scheduleSave(SAVE_AFTER_LEAVE);
}
/** Text copied from Excel: rows on lines, cells split by tabs; "quoted" cells may hold tabs and line breaks. */
function parseTsv(text) {
  const rows = []; let row = [], cell = '', q = false, start = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && start) { q = true; start = false; continue; }
    start = false;
    if (ch === '\t') { row.push(cell); cell = ''; start = true; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; start = true; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function selectAll(td) { const r = document.createRange(); r.selectNodeContents(td); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function caretAt(td) {
  const s = getSelection();
  if (!s.rangeCount || !td.contains(s.anchorNode)) return { start: true, end: true };
  if (!s.isCollapsed) return { all: s.toString() === td.innerText || s.toString() === cellText(td) };
  const r = s.getRangeAt(0), before = document.createRange(); before.selectNodeContents(td); before.setEnd(r.startContainer, r.startOffset);
  const n = before.toString().length;
  return { start: n === 0, end: n >= td.textContent.length };
}

function showTable(sheets, names, buf) {
  const view = $('view');
  const editable = !!buf && canEdit && !!file?.folder;
  const bar = el('div', { class: 'fv-editbar', hidden: true });
  const state = el('strong', { class: 'fv-save', role: 'status' });
  const undoBtn = el('button', { type: 'button', class: 'btn', onclick: () => undoLast() }, t('undo'));
  const doneBtn = el('button', { type: 'button', class: 'btn', onclick: async () => { await flush(); editing = false; $('editBtn').hidden = false; paint(); draw(current); } }, t('doneEdit'));
  const refBox = el('b', { class: 'fv-ref' }), fxBox = el('span', { class: 'fv-fx' });
  const cellBar = el('div', { class: 'fv-cellbar', hidden: true }, refBox, fxBox);
  bar.append(state, el('span', {}, t('editNote')), undoBtn, doneBtn);
  let grid = [], focusTd = null, focusStart = '';
  const tds = new Map();
  function paint() {
    bar.hidden = !editing; cellBar.hidden = !editing; undoBtn.disabled = !undoStack.length;
    state.dataset.kind = saveError ? 'bad' : '';
    state.textContent = inflight ? t('saving') : saveError ? t('notSaved', { msg: saveError }) : pending.size ? t('unsaved') : savedAt ? t('savedAt', { time: savedAt }) : t('autosaveOn');
  }
  if (editable) {
    $('actions').prepend(el('button', { type: 'button', class: 'btn primary', id: 'editBtn', onclick: () => { editing = true; $('editBtn').hidden = true; paint(); draw(current); } }, t('editCells')));
    view.before(bar, cellBar);
    window.addEventListener('beforeunload', (ev) => { if (pending.size || inflight) { flush(); ev.preventDefault(); ev.returnValue = t('leaveAsk'); } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  const sheetName = () => ui.sheets[current].name ?? names[current];
  const modelOf = (td) => ui.sheets[current].rows[Number(td.dataset.r)]?.[Number(td.dataset.c)];
  const go = (td, dr, dc) => {
    const r0 = Number(td.dataset.r), c0 = Number(td.dataset.c);
    const r = dr > 0 ? r0 + (td.rowSpan || 1) : dr < 0 ? r0 - 1 : r0, c = dc > 0 ? c0 + (td.colSpan || 1) : dc < 0 ? c0 - 1 : c0;
    const next = grid[r]?.[c];
    if (next) { next.focus(); if (next.isContentEditable) selectAll(next); }
  };
  function onKey(ev) {
    const td = ev.target.closest?.('td[data-r]');
    if (!td || !editing) return;
    lastActive = Date.now();
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && !ev.shiftKey && ev.key.toLowerCase() === 'z' && cellText(td) === focusStart) { ev.preventDefault(); undoLast(); return; }
    if (ev.key === 'Enter' && ev.altKey && td.isContentEditable) { ev.preventDefault(); document.execCommand('insertText', false, '\n'); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); go(td, ev.shiftKey ? -1 : 1, 0); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); go(td, 0, ev.shiftKey ? -1 : 1); return; }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); go(td, ev.key === 'ArrowUp' ? -1 : 1, 0); return; }
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      const at = td.isContentEditable ? caretAt(td) : { all: true };
      if (at.all || (ev.key === 'ArrowLeft' ? at.start : at.end)) { ev.preventDefault(); go(td, 0, ev.key === 'ArrowLeft' ? -1 : 1); }
      return;
    }
    if (ev.key === 'Escape' && td.isContentEditable) { ev.preventDefault(); td.textContent = focusStart; setCell(sheetName(), modelOf(td), focusStart); selectAll(td); ui.paint(); return; }
    if (ev.key === 'F2' && td.isContentEditable) { ev.preventDefault(); const s = getSelection(); s.selectAllChildren(td); s.collapseToEnd(); }
  }
  function onFocusIn(ev) {
    const td = ev.target.closest?.('td[data-r]');
    if (!td) return;
    focusTd = td; focusStart = cellText(td);
    const cell = modelOf(td);
    refBox.textContent = cell?.ref || '';
    fxBox.textContent = cell?.formula ? `=${cell.fx}  ·  ${t('fxNote')}` : cell?.richOrOther ? t('fxNote') : focusStart;
  }
  function onFocusOut(ev) {
    const td = ev.target.closest?.('td[data-r]');
    if (!td || td !== focusTd) return;
    focusTd = null;
    const text = cellText(td), cell = modelOf(td);
    if (td.isContentEditable && cell && text !== focusStart) undoStack.push([{ sheet: sheetName(), ref: cell.ref, before: focusStart, after: text }]);
    if (pending.size) scheduleSave(SAVE_AFTER_LEAVE); else paint();
  }
  function onInput(ev) {
    const td = ev.target.closest?.('td[data-r]'), cell = td && modelOf(td);
    if (!typeable(cell)) return;
    lastActive = Date.now();
    const text = cellText(td);
    setCell(sheetName(), cell, text);
    fxBox.textContent = text;
    scheduleSave(SAVE_AFTER_TYPING);
  }
  function onPaste(ev) {
    const td = ev.target.closest?.('td[data-r]');
    if (!td || !td.isContentEditable) return;
    const rows = parseTsv(ev.clipboardData?.getData('text/plain') || '');
    if (rows.length <= 1 && (rows[0]?.length || 0) <= 1) return; // one value: the browser pastes it into this cell
    ev.preventDefault();
    const r0 = Number(td.dataset.r), c0 = Number(td.dataset.c), sheet = sheetName(), entry = [];
    rows.forEach((vals, dr) => vals.forEach((v, dc) => {
      const target = grid[r0 + dr]?.[c0 + dc], cell = target && modelOf(target);
      if (!target || !target.isContentEditable || !typeable(cell) || Number(target.dataset.r) !== r0 + dr || Number(target.dataset.c) !== c0 + dc) return;
      entry.push({ sheet, ref: cell.ref, before: cellText(target), after: v });
      target.textContent = v; setCell(sheet, cell, v);
    }));
    if (entry.length) { undoStack.push(entry); focusStart = cellText(td); scheduleSave(SAVE_AFTER_LEAVE); }
  }
  const draw = (i) => {
    current = i;
    const sh = ui.sheets[i], sheet = sh.name ?? names[i], skip = new Set(), span = new Map();
    for (const m of sh.merges) {
      const [a, b] = m.split(':').map(cellRef); if (!a || !b) continue;
      span.set(`${a[0]},${a[1]}`, [b[0] - a[0] + 1, b[1] - a[1] + 1]);
      for (let r = a[0]; r <= b[0]; r++) for (let c = a[1]; c <= b[1]; c++) if (r !== a[0] || c !== a[1]) skip.add(`${r},${c}`);
    }
    const cols = Math.max(0, ...sh.rows.map((r) => r.length));
    grid = sh.rows.map(() => new Array(cols)); tds.clear();
    const head = el('tr', {}, el('th', { class: 'corner' }), Array.from({ length: cols }, (_, c) => el('th', { style: sh.widths?.[c] ? `min-width:${Math.min(60, Math.round(sh.widths[c]))}ch` : null }, colLetter(c))));
    const body = sh.rows.map((row, r) => el('tr', {}, el('th', {}, String(r + 1)), row.map((cell, c) => {
      if (skip.has(`${r},${c}`)) return null;
      const sp = span.get(`${r},${c}`), style = [];
      if (cell.bold) style.push('font-weight:600');
      if (cell.fill && /^[0-9A-F]{8}$/i.test(cell.fill) && cell.fill.slice(2).toUpperCase() !== 'FFFFFF') style.push(`background:#${cell.fill.slice(2)}`, 'color:#111');
      if (cell.align && /^(left|right|center)$/.test(cell.align)) style.push(`text-align:${cell.align}`); else if (cell.num) style.push('text-align:right');
      const key = keyOf(sheet, cell.ref), wait = pending.get(key) || inflight?.get(key), follows = shownCalc.get(key);
      const canType = editing && !!buf && typeable(cell);
      const td = el('td', { rowspan: sp && sp[0] > 1 ? sp[0] : null, colspan: sp && sp[1] > 1 ? sp[1] : null, style: style.join(';') || null,
        contenteditable: canType ? 'plaintext-only' : null, tabindex: editing && !canType ? '-1' : null,
        class: [canType ? 'ed' : '', editing && !canType ? 'ro' : '', wait ? 'pend' : '', follows?.stale ? 'stale' : ''].filter(Boolean).join(' ') || null,
        title: follows?.stale ? t('staleNote') : null,
        'data-r': String(r), 'data-c': String(c) }, wait ? shown(wait) : follows ? follows.text : cell.text);
      for (let rr = r; rr < r + (sp?.[0] || 1); rr++) for (let cc = c; cc < c + (sp?.[1] || 1); cc++) if (grid[rr]) grid[rr][cc] = td;
      tds.set(key, td);
      return td;
    })));
    const table = el('table', {}, el('thead', {}, head), el('tbody', {}, body));
    if (editing) for (const [type, fn] of [['keydown', onKey], ['focusin', onFocusIn], ['focusout', onFocusOut], ['input', onInput], ['paste', onPaste]]) table.addEventListener(type, fn);
    const wrap = el('div', { class: 'fv-sheet' }, table);
    view.replaceChildren(...(sh.cut ? [el('p', { class: 'fm-note' }, t('rowsCut', { n: MAX_ROWS }))] : []), wrap);
    for (const b of $('tabs').children) b.setAttribute('aria-selected', String(b.dataset.i === String(i)));
  };
  const tabs = () => {
    $('tabs').hidden = ui.sheets.length < 2;
    $('tabs').replaceChildren(...ui.sheets.map((s, i) => el('button', { type: 'button', role: 'tab', 'data-i': String(i), onclick: () => draw(i) }, s.name ?? names[i])));
  };
  // A newer version arrived: change only the cells that differ (and flash them); redraw if the layout changed.
  const look = (c) => c ? [c.text, c.formula, c.richOrOther, c.bold, c.fill, c.align].join('\u0001') : '';
  function adopt(fresh) {
    const old = ui.sheets, sameShape = fresh.length === old.length && fresh.every((s, i) => s.name === old[i].name && s.rows.length === old[i].rows.length
      && s.merges.join() === old[i].merges.join() && s.rows.every((row, r) => row.length === old[i].rows[r].length && row.every((c, k) => typeable(c) === typeable(old[i].rows[r][k]))));
    const name = old[current]?.name, at = focusTd ? modelOf(focusTd)?.ref : null;
    ui.sheets = fresh;
    if (!sameShape) {
      tabs();
      const i = Math.max(0, fresh.findIndex((s) => s.name === name));
      draw(i);
      if (at) tds.get(keyOf(fresh[i].name, at))?.focus();
      return;
    }
    const sh = fresh[current], before = old[current];
    sh.rows.forEach((row, r) => row.forEach((c, k) => {
      if (look(c) === look(before.rows[r][k])) return;
      const key = keyOf(sh.name, c.ref), td = tds.get(key);
      if (!td || busy(key) || shownCalc.has(key) || (td === focusTd && cellText(td) !== focusStart)) return;
      td.textContent = c.text;
      if (td === focusTd) focusStart = c.text;
      td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash');
    }));
  }
  ui = { sheets, tds, paint, draw, adopt };
  tabs();
  draw(0);
}

// ---- PowerPoint ----
async function showPptx() {
  const [{ init }, buf] = await Promise.all([import('/files/vendor/pptx.mjs'), bytes()]);
  const view = $('view'), host = el('div', { class: 'fv-pptx' });
  view.replaceChildren(host);
  const width = Math.min(1100, Math.max(320, view.clientWidth - 8));
  let shown = buf, list = null;
  const render = async (b) => { list?.destroy?.(); host.replaceChildren(); list = init(host, { width, height: Math.round(width * 9 / 16), mode: 'list' }); await list.preview(b); shown = b; };
  await render(buf);
  status(t('approx'));
  let session = null;
  presentButton(async () => { await session?.flush(); present(session ? session.current() : shown); });
  // Typing into the slides (people who may upload to Files), and showing a newer version when someone saves one.
  if (!OLD && !PIN && file.folder) {
    try { const { editSlides } = await import('/files/textedit.mjs'); session = await editSlides({ host, render, buf, at: lastAt || file.at, file, canEdit, t, el, status, lang, actions: $('actions'), before: view }); }
    catch (e) { console.warn('slide editing not available', e); }
  }
}
// Full-screen slide show: one slide at a time, arrows / space / click to move, Esc to leave.
async function present(buf) {
  const { init } = await import('/files/vendor/pptx.mjs');
  const stage = el('div', { class: 'fv-show-stage' });
  const count = el('span', { class: 'fv-count' });
  const box = el('div', { class: 'fv-show', role: 'dialog', 'aria-modal': 'true', 'aria-label': file.name, tabindex: '-1' }, stage, el('div', { class: 'fv-show-bar' }, count, el('button', { type: 'button', class: 'btn sm', onclick: () => close() }, t('close'))));
  document.body.append(box);
  const fit = () => { const w = window.innerWidth, h = window.innerHeight - 44; return w / h > 16 / 9 ? { width: Math.round(h * 16 / 9), height: h } : { width: w, height: Math.round(w * 9 / 16) }; };
  let show = null, idx = 0;
  const paint = () => { count.textContent = t('slide', { i: idx + 1, n: show.slideCount }); };
  const draw = async () => {
    stage.replaceChildren(); show?.destroy?.();
    show = init(stage, { ...fit(), mode: 'slide' });
    await show.load(buf); show.renderSingleSlide(idx); paint();
  };
  const go = (d) => { const n = Math.min(Math.max(idx + d, 0), show.slideCount - 1); if (n !== idx) { idx = n; show.renderSingleSlide(idx); paint(); } };
  const onKey = (ev) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(ev.key)) { ev.preventDefault(); go(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(ev.key)) { ev.preventDefault(); go(-1); }
    else if (ev.key === 'Escape' && !document.fullscreenElement) close();
  };
  let wasFull = false;
  const onFull = () => { if (document.fullscreenElement === box) wasFull = true; else if (wasFull) close(); else draw(); };
  const onResize = () => { clearTimeout(onResize.t); onResize.t = setTimeout(draw, 150); };
  function close() { document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFull); window.removeEventListener('resize', onResize); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); show?.destroy?.(); box.remove(); }
  stage.addEventListener('click', (ev) => go(ev.clientX < window.innerWidth / 3 ? -1 : 1));
  document.addEventListener('keydown', onKey); document.addEventListener('fullscreenchange', onFull); window.addEventListener('resize', onResize);
  box.requestFullscreen?.().catch(() => {});
  box.focus();
  await draw();
}

start();
