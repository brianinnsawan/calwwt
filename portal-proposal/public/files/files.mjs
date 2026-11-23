// Project files screen (calwwt.sppwork.com/files/). Data and every permission check: /api/files (src/files.mjs).
// Everything is built with DOM calls (no HTML from data).
import { languageFor } from '/__nav/bar.mjs';
import { ask, confirmBox } from '/__nav/ask.mjs';

const WORDS = {
  th: {
    root: 'ไฟล์โครงการ', upload: 'อัปโหลดไฟล์', newFolder: 'สร้างโฟลเดอร์', folderName: 'ชื่อโฟลเดอร์ใหม่',
    history: 'ประวัติ', open: 'เปิด', present: 'นำเสนอ', download: 'ดาวน์โหลด', del: 'ลบ', delAsk: 'ลบ "{name}"? (ผู้ดูแลระบบยังกู้คืนได้จากบันทึก)',
    empty: 'ยังไม่มีไฟล์ในโฟลเดอร์นี้', emptyEdit: 'ยังไม่มีไฟล์ — ลากไฟล์มาวางที่นี่ หรือกด "อัปโหลดไฟล์"',
    drop: 'วางไฟล์เพื่ออัปโหลด', uploading: 'กำลังอัปโหลด {i}/{n}: {name}', uploaded: 'อัปโหลดแล้ว {n} ไฟล์', failed: 'อัปโหลดไม่สำเร็จ: {name} — {msg}',
    teamOnly: 'เฉพาะทีม SPP', caltexFrom: 'Caltex เห็นตั้งแต่ {d}', caltexNow: 'Caltex เห็นแล้ว', share: 'แชร์กับ Caltex',
    shareAsk: 'Caltex เห็นไฟล์นี้ได้ตั้งแต่วันที่ — เว้นว่างเพื่อไม่แชร์', badDate: 'ใช้วันที่แบบ 2026-11-02',
    noteSpp: 'ทีม SPP และทีมหน้างานเห็นทุกไฟล์ Caltex เห็นเฉพาะไฟล์ที่แชร์ให้ (ป้ายสีเขียว)',
    noteWeekly: 'โฟลเดอร์นี้: Caltex เห็นแต่ละไฟล์ตั้งแต่วันจันทร์ของสัปดาห์ประชุม ตามวันที่ในชื่อไฟล์ (เช่น 2026-11-04) กดชื่อไฟล์เพื่อเปิดดู แล้วกด "นำเสนอ" เพื่อแสดงเต็มจอ',
    notePartner: 'ไฟล์ที่ทีม SPP แชร์ให้คุณ', items: '{n} รายการ', by: 'โดย {name}', close: 'ปิด', fullscreen: 'เต็มจอ',
    loadFail: 'โหลดรายการไฟล์ไม่ได้', viewOnly: 'ดูอย่างเดียว',
    delFolder: 'ลบโฟลเดอร์', delFolderAsk: 'ลบโฟลเดอร์ "{name}" และทุกอย่างในโฟลเดอร์ ({files} ไฟล์, {folders} โฟลเดอร์ย่อย)? ไฟล์ยังเก็บไว้ในระบบและบันทึก ผู้ดูแลระบบกู้คืนได้',
    folderDeleted: 'ลบโฟลเดอร์แล้ว ({files} ไฟล์)', newVersion: 'อัปเดตเป็นเวอร์ชันใหม่',
    versionAsk: 'แทนที่ "{name}" ด้วยไฟล์ "{picked}"? ไฟล์ยังใช้ชื่อเดิม เวอร์ชันเดิมเก็บไว้ในประวัติ และการแชร์กับ Caltex ยังเหมือนเดิม',
    bin: 'ถังรีไซเคิล', binNote: 'สิ่งที่ถูกลบยังเก็บไว้ทั้งหมด กด "กู้คืน" เพื่อนำกลับไปที่เดิม เวอร์ชันเก่าที่ถูกแทนที่ไม่อยู่ในนี้ (เฉพาะผู้ดูแลระบบ)',
    binFolders: 'โฟลเดอร์ที่ลบ', binFiles: 'ไฟล์ที่ลบ', binEmpty: 'ถังรีไซเคิลว่าง', restore: 'กู้คืน', back: '‹ กลับไปที่ไฟล์',
    deletedBy: 'ลบเมื่อ {at} โดย {by}', inWhere: 'อยู่ใน {where}', atRoot: 'ระดับบนสุด', holds: '{files} ไฟล์, {folders} โฟลเดอร์ย่อย',
    restored: 'กู้คืน "{name}" แล้ว', restoreParent: 'กู้คืนโฟลเดอร์ที่อยู่ด้านบนก่อน',
    dropVersion: 'วางเพื่ออัปเดตเป็นเวอร์ชันใหม่', dropOne: 'วางทีละหนึ่งไฟล์เพื่ออัปเดตเวอร์ชัน',
    versionType: 'ไฟล์ใหม่ต้องเป็นชนิดเดียวกัน (.{want}) แต่ไฟล์ที่เลือกเป็น .{got}', versionDone: 'อัปเดต "{name}" เป็นเวอร์ชันใหม่แล้ว',
  },
  en: {
    root: 'Project files', upload: 'Upload files', newFolder: 'New folder', folderName: 'New folder name',
    history: 'History', open: 'Open', present: 'Present', download: 'Download', del: 'Delete', delAsk: 'Delete "{name}"? (Admins can still recover it from the log.)',
    empty: 'No files in this folder yet.', emptyEdit: 'No files yet. Drag files here or press "Upload files".',
    drop: 'Drop files to upload', uploading: 'Uploading {i}/{n}: {name}', uploaded: 'Uploaded {n} file(s).', failed: 'Upload failed: {name} — {msg}',
    teamOnly: 'SPP team only', caltexFrom: 'Caltex from {d}', caltexNow: 'Caltex can see', share: 'Share with Caltex',
    shareAsk: 'Caltex can see this file from this date. Leave it empty to stop sharing.', badDate: 'Use a date like 2026-11-02.',
    noteSpp: 'SPP staff and the site team see every file. Caltex sees only files shared with them (green label).',
    noteWeekly: 'This folder: Caltex sees each file from the Monday of its meeting week, from the date in the file name (for example 2026-11-04). Click a file name to open it, then "Present" to show it full screen.',
    notePartner: 'Files the SPP team has shared with you.', items: '{n} items', by: 'by {name}', close: 'Close', fullscreen: 'Full screen',
    loadFail: 'Could not load the file list.', viewOnly: 'View only',
    delFolder: 'Delete folder', delFolderAsk: 'Delete the folder "{name}" and everything in it ({files} files, {folders} sub-folders)? The files stay in storage and in the log; an admin can restore them.',
    folderDeleted: 'Folder deleted ({files} files).', newVersion: 'Upload new version',
    versionAsk: 'Replace "{name}" with "{picked}"? It keeps the name "{name}"; the current version stays in the history and its Caltex sharing stays the same.',
    bin: 'Recycle bin', binNote: 'Everything deleted is kept. Press "Restore" to put it back where it was. Old versions replaced by a newer upload are not here. (Admins only.)',
    binFolders: 'Deleted folders', binFiles: 'Deleted files', binEmpty: 'The recycle bin is empty.', restore: 'Restore', back: '‹ Back to files',
    deletedBy: 'Deleted {at} by {by}', inWhere: 'In {where}', atRoot: 'Top level', holds: '{files} files, {folders} sub-folders',
    restored: '"{name}" restored.', restoreParent: 'Restore the folder it was in first',
    dropVersion: 'Drop to upload a new version', dropOne: 'Drop one file at a time to update a file.',
    versionType: 'The new version must be the same kind of file (.{want}); the file you picked is .{got}.', versionDone: '"{name}" updated to the new version.',
  },
};
// Opened in the site's viewer (/files/view.html): browser-native, Office readers, or the CAD viewer.
const VIEWABLE = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'csv', 'mp4', 'docx', 'xlsx', 'xlsm', 'pptx', 'pptm', 'dwg', 'dxf']);
const ICON = { pdf: '📕', pptx: '📊', pptm: '📊', ppt: '📊', docx: '📄', doc: '📄', xlsx: '📗', xlsm: '📗', xls: '📗', csv: '📗', png: '🖼', jpg: '🖼', jpeg: '🖼', webp: '🖼', gif: '🖼', dwg: '📐', dxf: '📐', zip: '🗜', mp4: '🎞' };
const ext = (n) => (/\.([a-z0-9]{1,8})$/i.exec(n)?.[1] || '').toLowerCase();
const $ = (id) => document.getElementById(id);
let me = null, lang = 'th', W = WORDS.th, data = null, here = null;
const t = (k, vars = {}) => W[k].replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c);
  return n;
}
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`);
const date = (iso) => { try { return new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }); } catch { return iso?.slice(0, 10) || ''; } };
function splitName(name) { const i = name.indexOf(' · '); return i > 0 ? [name.slice(0, i), name.slice(i + 3)] : [name, '']; }

function status(text, kind) {
  const s = $('status');
  if (!text) { s.hidden = true; s.textContent = ''; return; }
  s.hidden = false; s.textContent = text; s.dataset.kind = kind || '';
}
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts, headers: { 'X-Requested-With': 'files', ...(opts.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || body.message || `HTTP ${r.status}`);
  return body;
}

async function load() {
  try { data = await api('/api/files'); } catch (e) { $('list').replaceChildren(el('p', { class: 'fm-empty' }, `${t('loadFail')} (${e.message})`)); return; }
  const fromHash = decodeURIComponent(location.hash.slice(1));
  here = data.folders.some((f) => f.id === fromHash) ? fromHash : null;
  if (fromHash === BIN && data.canDeleteFolders) { renderBin(); return; }
  render();
}
const BIN = 'recycle-bin';
function go(id) { here = id; history.replaceState(null, '', id ? `#${encodeURIComponent(id)}` : location.pathname); render(); }

function render() {
  const folders = data.folders, cur = folders.find((f) => f.id === here) || null;
  // Breadcrumbs
  const chain = []; for (let f = cur; f; f = folders.find((x) => x.id === f.parent)) chain.unshift(f);
  const crumbs = [el('button', { type: 'button', onclick: () => go(null), 'aria-current': cur ? null : 'page' }, t('root'))];
  for (const f of chain) crumbs.push(el('span', { 'aria-hidden': 'true' }, '›'), el('button', { type: 'button', onclick: () => go(f.id), 'aria-current': f === cur ? 'page' : null }, splitName(f.name)[lang === 'th' ? 0 : 1] || f.name));
  $('crumbs').replaceChildren(...crumbs);
  // Actions
  const acts = [];
  if (data.canEdit) {
    acts.push(el('button', { type: 'button', class: 'btn', onclick: newFolder }, t('newFolder')));
    if (cur) acts.push(el('button', { type: 'button', class: 'btn primary', onclick: () => $('picker').click() }, t('upload')));
  } else if (data.team) acts.push(el('span', { class: 'chip' }, t('viewOnly')));
  if (data.canDeleteFolders) acts.unshift(el('a', { class: 'btn', href: `#${BIN}` }, t('bin')));
  $('actions').replaceChildren(...acts);
  $('note').textContent = cur?.weekly ? t('noteWeekly') : data.team ? t('noteSpp') : t('notePartner');
  // Rows: sub-folders, then files.
  const subs = folders.filter((f) => (f.parent || null) === here).sort((a, b) => a.name.localeCompare(b.name));
  const files = cur ? data.files.filter((f) => f.folder === here).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })) : [];
  const rows = [];
  for (const f of subs) {
    const [main, sub] = splitName(f.name);
    const count = countIn(f.id);
    rows.push(el('div', { class: 'fm-row folder' },
      el('span', { class: 'ic', 'aria-hidden': 'true' }, '📁'),
      el('div', { class: 'nm' }, el('button', { type: 'button', onclick: () => go(f.id) }, main, sub ? el('small', {}, sub) : null)),
      el('span', { class: 'sz' }, t('items', { n: count })), el('span', { class: 'dt' }),
      el('span', { class: 'ops' }, data.canDeleteFolders && !(data.builtInFolders || []).includes(f.id)
        ? el('button', { type: 'button', class: 'btn sm danger', onclick: () => removeFolder(f) }, t('delFolder')) : null)));
  }
  for (const f of files) rows.push(fileRow(f));
  if (!rows.length) rows.push(el('p', { class: 'fm-empty' }, data.canEdit && cur ? t('emptyEdit') : t('empty')));
  $('list').style.setProperty('--ops', data.canShare ? '520px' : data.canEdit ? '420px' : '180px');
  $('list').replaceChildren(...rows);
}
function countIn(id) {
  let n = data.files.filter((f) => f.folder === id).length;
  for (const s of data.folders.filter((f) => f.parent === id)) n += countIn(s.id);
  return n;
}
function fileRow(f) {
  const e = ext(f.name), url = `/api/files/${f.id}/download`, viewable = VIEWABLE.has(e);
  const viewHref = ['dwg', 'dxf'].includes(e) ? `/files/cad/?dwg=${encodeURIComponent(f.id)}` : `/files/view.html?id=${encodeURIComponent(f.id)}`;
  const nameEl = viewable ? el('a', { href: viewHref }, f.name) : el('a', { href: url, download: f.name }, f.name);
  const small = el('small', {}, el('span', { class: 'mob' }, `${date(f.at)}${f.by ? ' · ' : ''}`), f.by ? t('by', { name: f.by }) : '');
  if ('caltexFrom' in f) {
    const live = f.caltexFrom && f.caltexFrom <= data.today;
    small.append(el('span', { class: `chip${f.caltexFrom ? ' on' : ''}` }, f.caltexFrom ? (live ? t('caltexNow') : t('caltexFrom', { d: f.caltexFrom })) : t('teamOnly')));
  }
  const ops = [];
  if (viewable) ops.push(el('a', { class: 'btn sm', href: viewHref }, t('open')));
  if (e === 'pdf' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(e)) ops.push(el('button', { type: 'button', class: 'btn sm', onclick: () => present(f) }, t('present')));
  ops.push(el('a', { class: 'btn sm', href: url, download: f.name }, t('download')));
  if (data.team) ops.push(el('a', { class: 'btn sm', href: `/files/view.html?id=${encodeURIComponent(f.id)}&history=1` }, t('history')));
  if (data.canShare) ops.push(el('button', { type: 'button', class: 'btn sm', onclick: () => share(f) }, t('share')));
  if (data.canEdit) ops.push(el('button', { type: 'button', class: 'btn sm', onclick: () => newVersion(f) }, t('newVersion')));
  if (data.canEdit) ops.push(el('button', { type: 'button', class: 'btn sm danger', onclick: () => remove(f) }, t('del')));
  const row = el('div', { class: 'fm-row', 'data-drop': data.canEdit ? t('dropVersion') : null },
    el('span', { class: 'ic', 'aria-hidden': 'true' }, ICON[e] || '📄'),
    el('div', { class: 'nm' }, nameEl, small),
    el('span', { class: 'sz' }, size(f.size)), el('span', { class: 'dt' }, date(f.at)), el('span', { class: 'ops' }, ops));
  // Drag a file from the computer onto this row = upload it as the new version of this file (Brian, 5 Nov 2026).
  if (data.canEdit) {
    const hasFiles = (ev) => [...(ev.dataTransfer?.types || [])].includes('Files');
    row.addEventListener('dragover', (ev) => { if (!hasFiles(ev)) return; ev.preventDefault(); ev.stopPropagation(); row.classList.add('drop-on'); });
    row.addEventListener('dragleave', (ev) => { if (!row.contains(ev.relatedTarget)) row.classList.remove('drop-on'); });
    row.addEventListener('drop', (ev) => {
      if (!hasFiles(ev)) return;
      ev.preventDefault(); ev.stopPropagation(); row.classList.remove('drop-on'); $('drop').hidden = true;
      const dropped = ev.dataTransfer.files;
      if (dropped.length !== 1) { status(t('dropOne'), 'bad'); return; }
      replaceWith(f, dropped[0]);
    });
  }
  return row;
}

// Full-screen viewer for PDFs and pictures (the browser's own PDF viewer inside).
function present(f) {
  const isPdf = ext(f.name) === 'pdf', src = `/api/files/${f.id}/download?inline=1`;
  const view = isPdf ? el('iframe', { src: `${src}#view=Fit&toolbar=1`, title: f.name }) : el('img', { src, alt: f.name });
  const box = el('div', { class: 'fm-present', role: 'dialog', 'aria-modal': 'true', 'aria-label': f.name });
  let wasFull = false;
  const close = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); box.remove(); document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFull); };
  const onKey = (ev) => { if (ev.key === 'Escape' && !document.fullscreenElement) close(); };
  // Esc (or the browser's own control) leaves full screen: that also ends the presentation.
  const onFull = () => { if (document.fullscreenElement === box) wasFull = true; else if (wasFull) close(); };
  document.addEventListener('fullscreenchange', onFull);
  box.append(el('div', { class: 'bar' }, el('span', {}, f.name),
    el('button', { type: 'button', class: 'btn sm', onclick: () => box.requestFullscreen?.().catch(() => {}) }, t('fullscreen')),
    el('button', { type: 'button', class: 'btn sm', onclick: close }, t('close'))), view);
  document.body.append(box); document.addEventListener('keydown', onKey);
  box.requestFullscreen?.().catch(() => {});
}

async function newFolder() {
  const r0 = await ask({ title: t('folderName'), fields: [{ name: 'name', label: t('folderName'), required: true, maxlength: 120 }] });
  const name = r0?.name;
  if (!name || !name.trim()) return;
  try { const r = await api('/api/files/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent: here, name: name.trim() }) }); await load(); go(r.id); }
  catch (e) { status(e.message, 'bad'); }
}
async function share(f) {
  // A calendar instead of typed YYYY-MM-DD; leave it empty to stop sharing.
  const r0 = await ask({ title: f.name, text: t('shareAsk'), fields: [{ name: 'd', label: t('shareAsk'), type: 'date', value: f.caltexFrom || data.today }] });
  if (r0 === null) return;
  const d = r0.d.trim();
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) { status(t('badDate'), 'bad'); return; }
  try { await api(`/api/files/${f.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caltexFrom: d || null }) }); status(''); await load(); }
  catch (e) { status(e.message, 'bad'); }
}
async function remove(f) {
  if (!(await confirmBox(t('delAsk', { name: f.name }), { danger: true }))) return;
  try { await api(`/api/files/${f.id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); status(''); await load(); }
  catch (e) { status(e.message, 'bad'); }
}
// Delete a folder with everything in it (admins; the built-in folders have no button and the site refuses them).
async function removeFolder(f) {
  const subs = []; for (let i = -1, ids = [f.id]; ++i < ids.length;) for (const x of data.folders) if (x.parent === ids[i]) { ids.push(x.id); subs.push(x); }
  const name = splitName(f.name)[lang === 'th' ? 0 : 1] || f.name;
  if (!(await confirmBox(t('delFolderAsk', { name, files: countIn(f.id), folders: subs.length }), { danger: true, ok: t('delFolder') }))) return;
  try { const r = await api(`/api/files/folder/${encodeURIComponent(f.id)}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); status(t('folderDeleted', { files: r.files }), 'ok'); await load(); }
  catch (e) { status(e.message, 'bad'); }
}
// Upload a new version of a file edited offline (Brian, 4 Nov 2026): whatever the file on your computer is called, it
// replaces this file under this file's name, so its history, Caltex sharing and links stay the same.
function newVersion(f) {
  const want = ext(f.name);
  const pick = el('input', { type: 'file', accept: want ? `.${want}` : null, hidden: true });
  pick.addEventListener('change', () => { const file = pick.files?.[0]; pick.remove(); if (file) replaceWith(f, file); });
  document.body.append(pick); pick.click();
}
async function replaceWith(f, file) {
  const want = ext(f.name);
  {
    const got = ext(file.name);
    if (want && got !== want) { status(t('versionType', { want, got: got || '?' }), 'bad'); return; }
    if (!(await confirmBox(t('versionAsk', { name: f.name, picked: file.name }), { ok: t('newVersion') }))) return;
    status(t('uploading', { i: 1, n: 1, name: file.name }));
    try {
      await api(`/api/files/upload?folder=${encodeURIComponent(f.folder)}&name=${encodeURIComponent(f.name)}&base=${encodeURIComponent(f.id)}&source=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
      status(t('versionDone', { name: f.name }), 'ok'); await load();
    } catch (e) { status(t('failed', { name: file.name, msg: e.message }), 'bad'); await load(); }
  }
}
// Recycle bin (admins): deleted folders (with what was in them) and deleted files; Restore puts them back.
async function renderBin() {
  $('crumbs').replaceChildren(el('button', { type: 'button', onclick: () => go(null) }, t('root')), el('span', { 'aria-hidden': 'true' }, '›'), el('button', { type: 'button', 'aria-current': 'page' }, t('bin')));
  $('actions').replaceChildren(el('button', { type: 'button', class: 'btn', onclick: () => go(null) }, t('back')));
  $('note').textContent = t('binNote');
  status('');
  let bin;
  try { bin = await api('/api/files/bin'); } catch (e) { $('list').replaceChildren(el('p', { class: 'fm-empty' }, `${t('loadFail')} (${e.message})`)); return; }
  const nameOf = (n) => splitName(n)[lang === 'th' ? 0 : 1] || n;
  const whereOf = (w) => (w ? w.split(' › ').map(nameOf).join(' › ') : t('atRoot'));
  const restoreBtn = (kind, x, blocked) => el('button', { type: 'button', class: 'btn sm primary', disabled: blocked ? true : null, title: blocked ? t('restoreParent') : null, onclick: async () => {
    try {
      const r = await api(`/api/files/bin/${kind}/${encodeURIComponent(x.id)}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      data = await api('/api/files'); await renderBin(); status(t('restored', { name: nameOf(r.name) }), 'ok');
    } catch (e) { status(e.message, 'bad'); }
  } }, t('restore'));
  const rows = [];
  if (bin.folders.length) rows.push(el('h3', { class: 'fm-bin-h' }, t('binFolders')));
  for (const x of bin.folders) rows.push(el('div', { class: 'fm-row folder' }, el('span', { class: 'ic', 'aria-hidden': 'true' }, '📁'),
    el('div', { class: 'nm' }, el('span', {}, nameOf(x.name)), el('small', {}, `${t('inWhere', { where: whereOf(x.where) })} · ${t('holds', { files: x.files, folders: x.folders })} · ${t('deletedBy', { at: date(x.at), by: x.by })}`)),
    el('span', { class: 'sz' }), el('span', { class: 'dt' }, date(x.at)), el('span', { class: 'ops' }, restoreBtn('folder', x, x.parentDeleted))));
  if (bin.files.length) rows.push(el('h3', { class: 'fm-bin-h' }, t('binFiles')));
  for (const x of bin.files) rows.push(el('div', { class: 'fm-row' }, el('span', { class: 'ic', 'aria-hidden': 'true' }, ICON[ext(x.name)] || '📄'),
    el('div', { class: 'nm' }, el('span', {}, x.name), el('small', {}, `${t('inWhere', { where: whereOf(x.where) })} · ${t('deletedBy', { at: date(x.at), by: x.by })}`)),
    el('span', { class: 'sz' }, size(x.size)), el('span', { class: 'dt' }, date(x.at)), el('span', { class: 'ops' }, restoreBtn('file', x, x.folderDeleted))));
  if (!rows.length) rows.push(el('p', { class: 'fm-empty' }, t('binEmpty')));
  $('list').style.setProperty('--ops', '120px');
  $('list').replaceChildren(...rows);
}
async function upload(list) {
  const files = [...list];
  if (!files.length || !here || !data.canEdit) return;
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    status(t('uploading', { i: i + 1, n: files.length, name: f.name }));
    try { await api(`/api/files/upload?folder=${encodeURIComponent(here)}&name=${encodeURIComponent(f.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f }); ok++; }
    catch (e) { status(t('failed', { name: f.name, msg: e.message }), 'bad'); await load(); return; }
  }
  status(t('uploaded', { n: ok }), 'ok');
  await load();
}

async function start() {
  try { const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }); if (r.status === 401) { location.href = '/sign-in.html'; return; } me = await r.json(); } catch { /* bar shows nothing */ }
  lang = languageFor(me); W = WORDS[lang]; document.documentElement.lang = lang;
  $('drop').firstElementChild.textContent = t('drop');
  $('picker').addEventListener('change', (ev) => { upload(ev.target.files); ev.target.value = ''; });
  // Drag and drop anywhere on the page (only where uploading is allowed).
  let depth = 0;
  const can = (ev) => data?.canEdit && here && [...(ev.dataTransfer?.types || [])].includes('Files');
  document.addEventListener('dragenter', (ev) => { if (!can(ev)) return; ev.preventDefault(); depth++; $('drop').hidden = false; });
  document.addEventListener('dragover', (ev) => { if (can(ev)) ev.preventDefault(); });
  document.addEventListener('dragleave', () => { if (depth && --depth === 0) $('drop').hidden = true; });
  document.addEventListener('drop', (ev) => { if (!can(ev)) return; ev.preventDefault(); depth = 0; $('drop').hidden = true; upload(ev.dataTransfer.files); });
  window.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (data && id === BIN && data.canDeleteFolders) { renderBin(); return; } if (data && (id === '' || data.folders.some((f) => f.id === id))) { here = id || null; render(); } });
  await load();
}
start();
