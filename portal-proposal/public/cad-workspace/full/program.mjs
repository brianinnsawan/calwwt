// Sites -> CAD workspace -> Full CAD program (calwwt.sppwork.com/cad-workspace/full/?dwg=<drawing>). Copied from calnkt.
// Open CAD Studio 2026.47 (GPL-3.0, github.com/HakanSeven12/OpenCADStudio; calnkt runs 2026.41). Its files are the
// official web build of the v2026.47 release, checked against the tagged source (scripts/import-cad-program.mjs); this page
// replaces the program's own start page so it runs under the site's strict CSP (no inline scripts, no outside loads).
// - Opens the chosen drawing (a project DWG, a Project files DWG / DXF, or a copy saved earlier) through the program's own
//   control channel (op "open" with the file's bytes).
// - The program saves by handing the browser a file to download. This page catches that:
//     Drawings at view (and "View the site as"): nothing can be saved or downloaded from the program.
//     Drawings at edit: "Save to the site" stores a separate numbered copy of the drawing (src/cad-workspace.mjs; the
//     original is never changed), or "Download to this device".
//   The server checks the same rules again (src/cad-workspace.mjs).
// - Works like AutoCAD (Brian, 3 Nov 2026): no donation prompt; with no drawing chosen it opens a blank drawing (like
//   AutoCAD's Drawing1) instead of the program's start page; AutoCAD-style settings and aliases are written to the browser
//   once (seedSettings); links to outside sites from the program (Donate, GitHub, Patreon…) are not opened.
const W = {
  en: {
    back: '‹ CAD workspace', about: 'About', close: 'Close', cancel: 'Cancel', original: 'Original drawing', sharedSpp: "SPP's, shared with Caltex, read only", copyShort: 'copy {seq}', copyItem: 'Copy {seq} · {by} · {at}',
    newDrawing: 'New drawing', downloading: 'Downloading the CAD program… {mb} MB', checking: 'Checking the program…', starting: 'Starting the program…',
    badProgram: 'The CAD program could not be started: {e}', noWebgl: 'This browser cannot show the CAD program (it needs WebGL2). Use a recent Chrome, Edge, Safari or Firefox.',
    opening: 'Opening {name}…', opened: 'Opened. Saving keeps the original drawing unchanged.', openFailed: 'The drawing could not be opened in the program: {e}',
    viewOnly: 'View only: you can open, look and measure here; your Drawings access does not include saving.',
    viewAs: 'You are viewing the site as someone else: nothing can be saved.',
    blocked: 'View only: saving and downloading from the program are not available with your Drawings access.',
    saveTitle: 'Save from the CAD program', saveText: '"{file}" will be stored on the site as a new, separate copy of {name} (copy {seq}). The original drawing is never changed.',
    saveNoSource: '"{file}" can only be downloaded: it is not linked to a drawing on the site.', saveOther: '"{file}" is not a drawing (DWG / DXF): it can only be downloaded.',
    noteLabel: 'Note for this copy (optional)', toSite: 'Save to the site', toDevice: 'Download to this device', saving: 'Saving the copy…', saved: 'Saved as copy {seq} of {name}.',
    leave: 'Changes in the CAD program that are not saved will be lost. Continue?',
    outside: 'Links to outside sites are not opened from the project site.',
    noWebgpu: 'This browser has no WebGPU: Open CAD Studio 2026.47 may not draw the drawing (fixed for its next release). Use a recent Chrome or Edge, or the CAD workspace.',
    aboutText: 'Open CAD Studio {version} (source commit {commit}), free software under the GNU General Public License v3. Source: github.com/HakanSeven12/OpenCADStudio, tag v{version}. The program\'s own menus are in English.',
  },
  th: {
    back: '‹ พื้นที่ทำงาน CAD', about: 'เกี่ยวกับ', close: 'ปิด', cancel: 'ยกเลิก', original: 'แบบต้นฉบับ', sharedSpp: 'ของ SPP ที่แชร์ให้ Caltex ดูอย่างเดียว', copyShort: 'สำเนาที่ {seq}', copyItem: 'สำเนาที่ {seq} · {by} · {at}',
    newDrawing: 'แบบใหม่', downloading: 'กำลังดาวน์โหลดโปรแกรม CAD… {mb} MB', checking: 'กำลังตรวจสอบโปรแกรม…', starting: 'กำลังเริ่มโปรแกรม…',
    badProgram: 'เริ่มโปรแกรม CAD ไม่ได้: {e}', noWebgl: 'เบราว์เซอร์นี้แสดงโปรแกรม CAD ไม่ได้ (ต้องรองรับ WebGL2) กรุณาใช้ Chrome, Edge, Safari หรือ Firefox รุ่นใหม่',
    opening: 'กำลังเปิด {name}…', opened: 'เปิดแล้ว การบันทึกจะไม่เปลี่ยนแบบต้นฉบับ', openFailed: 'เปิดแบบในโปรแกรมไม่ได้: {e}',
    viewOnly: 'ดูอย่างเดียว: เปิด ดู และวัดได้ แต่สิทธิ์หน้าแบบก่อสร้างของคุณไม่รวมการบันทึก',
    viewAs: 'คุณกำลังดูเว็บไซต์ในมุมมองของผู้อื่น: บันทึกอะไรไม่ได้',
    blocked: 'ดูอย่างเดียว: บันทึกหรือดาวน์โหลดจากโปรแกรมไม่ได้ด้วยสิทธิ์หน้าแบบก่อสร้างของคุณ',
    saveTitle: 'บันทึกจากโปรแกรม CAD', saveText: '"{file}" จะถูกเก็บในเว็บไซต์เป็นสำเนาใหม่แยกต่างหากของ {name} (สำเนาที่ {seq}) แบบต้นฉบับจะไม่ถูกแก้ไข',
    saveNoSource: '"{file}" ดาวน์โหลดได้อย่างเดียว เพราะไม่ได้เชื่อมกับแบบในเว็บไซต์', saveOther: '"{file}" ไม่ใช่ไฟล์แบบ (DWG / DXF) จึงดาวน์โหลดได้อย่างเดียว',
    noteLabel: 'หมายเหตุของสำเนานี้ (ไม่บังคับ)', toSite: 'บันทึกลงเว็บไซต์', toDevice: 'ดาวน์โหลดลงเครื่องนี้', saving: 'กำลังบันทึกสำเนา…', saved: 'บันทึกเป็นสำเนาที่ {seq} ของ {name} แล้ว',
    leave: 'การแก้ไขในโปรแกรม CAD ที่ยังไม่ได้บันทึกจะหายไป ต้องการทำต่อหรือไม่',
    outside: 'เว็บไซต์โครงการไม่เปิดลิงก์ไปยังเว็บไซต์ภายนอก',
    noWebgpu: 'เบราว์เซอร์นี้ไม่มี WebGPU: Open CAD Studio 2026.47 อาจแสดงแบบไม่ได้ (แก้แล้วในรุ่นถัดไป) กรุณาใช้ Chrome หรือ Edge รุ่นใหม่ หรือใช้พื้นที่ทำงาน CAD',
    aboutText: 'Open CAD Studio {version} (source commit {commit}) ซอฟต์แวร์เสรีภายใต้สัญญาอนุญาต GNU GPL v3 ซอร์สโค้ด: github.com/HakanSeven12/OpenCADStudio แท็ก v{version} เมนูของโปรแกรมเป็นภาษาอังกฤษ',
  },
};
let L = 'th', w = W.th;
const $ = (id) => document.getElementById(id);
const t = (key, vars = {}) => String(w[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const when = (iso) => { try { return new Date(iso).toLocaleString(L === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }); } catch { return iso || ''; } };
function setStatus(text, kind = '') { $('status').textContent = text; $('status').dataset.kind = kind; $('status').title = text; }
function progress(text, kind = '') { $('progress').textContent = text; $('progress').dataset.kind = kind; }
async function getJSON(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts });
  if (r.status === 401) { location.href = '/sign-in.html'; throw new Error('Sign in again.'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}

let me = null, list = null, item = null, copyInfo = null, canSave = false, savedSeq = 0;
const params = new URL(location.href).searchParams;
// The program itself reads the page address at start: ?file=<address> opens a drawing from that address (2026.42 and
// later), ?embed=1 / ?automation=1 change how it runs. Only this page's own ?dwg= and ?copy= are kept, so a link cannot
// make the program fetch or open anything else (the site's CSP also blocks outside addresses).
{
  const u = new URL(location.href), keep = new URLSearchParams();
  for (const k of ['dwg', 'copy']) if (u.searchParams.has(k)) keep.set(k, u.searchParams.get(k));
  if (u.searchParams.toString() !== keep.toString()) history.replaceState(null, '', `${u.pathname}${keep.toString() ? '?' + keep : ''}`);
}
// Since 2026.42 the program saves with the browser's "Save as" picker (File System Access, Chrome / Edge) when it can,
// writing straight to the person's computer. That would bypass the site's Save rules below (view only: no saving or
// downloading; edit: "Save to the site" or download). Without the picker the program falls back to its download, which
// this page catches. Removed before the program starts; opening files from the computer is unchanged.
try { delete Window.prototype.showSaveFilePicker; } catch { /* not there */ }
try { delete window.showSaveFilePicker; } catch { /* not there */ }
// The program's own hand-over (docs/automation/web.md, "Receiving saved files in the host page"): while this is defined,
// Save, Save As, the save-before-close prompt and the exports give the file to this page and open no picker. The page then
// applies the site's rules (handleDownload: view only = refused; edit = "Save to the site" or download).
window.openCadStudioSaveFile = (name, bytes) => { handleDownload(new Blob([bytes]), String(name || 'drawing.dwg').split(/[\\/]/).pop()); };

// The site has no links to outside sites: the program's own buttons that would open one (Donate, GitHub, Patreon,
// Reddit, its help videos) do nothing here. Same-site addresses still open.
const nativeOpen = window.open.bind(window);
window.open = (url, ...rest) => {
  let target;
  try { target = new URL(String(url ?? ''), location.href); } catch { return null; }
  if (target.origin !== location.origin) { setStatus(t('outside')); return null; }
  return nativeOpen(target.href, ...rest);
};

// AutoCAD-style settings, written to the program's own storage before it starts (it reads them at start).
// Once per device (DEFAULTS_VERSION), so a person's own later changes in Options stay. The donation prompt is marked as
// seen for this program version every time. Aliases: the program's defaults plus AutoCAD's (aliases.txt), only when the
// person has none of their own yet.
const SETTINGS_KEY = 'opencadstudio.settings', ALIASES_KEY = 'opencadstudio.aliases', DEFAULTS_KEY = 'calwwt.cad.defaults', DEFAULTS_VERSION = '1';
async function seedSettings(meta) {
  try {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { stored = {}; }
    if (typeof stored !== 'object' || Array.isArray(stored)) stored = {};
    stored.settings = { ...(stored.settings || {}), donation_prompt_version: meta.version };
    if (localStorage.getItem(DEFAULTS_KEY) !== DEFAULTS_VERSION) {
      // Object snap: Endpoint, Midpoint, Center, Intersection, Extension (AutoCAD OSMODE bits); polar tracking and
      // object snap tracking on; dynamic input on.
      Object.assign(stored.settings, { osmode: 1 | 2 | 4 | 32 | 4096, polar: true, polar_increment_deg: 90, otrack: true, dyn_input: true, dyn_mode: 3 });
      stored.start = { ...(stored.start || {}), section: 'Recent' };
      // Status bar: show coordinates, dynamic input and lineweight, as AutoCAD users expect.
      stored.statusbar = { ...(stored.statusbar || {}), hidden: ['SelCycle', 'Transparency', 'Units', 'Space', 'Vp'] };
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
    localStorage.setItem('opencadstudio.automation', '1');   // 2026.43 and later: no donation prompt for pages that drive it
    if (!localStorage.getItem(ALIASES_KEY)) {
      const r = await fetch('/cad-workspace/full/aliases.txt', { credentials: 'same-origin', cache: 'no-store' });
      if (r.ok) localStorage.setItem(ALIASES_KEY, await r.text());
    }
    localStorage.setItem(DEFAULTS_KEY, DEFAULTS_VERSION);
  } catch (e) { console.warn('CAD settings not written', e); }
}
// An empty drawing, opened when no drawing was chosen, like AutoCAD's Drawing1: blank.dxf (DXF 2018, metres, standard
// layers, line types, text and dimension styles; made with ezdxf).

// Catch the program's downloads (a Blob URL + <a download>.click()). The page keeps the Blob behind each Blob URL it hands
// out (the site's CSP does not allow reading blob: URLs back with fetch), so the file can be taken from there.
const nativeClick = HTMLAnchorElement.prototype.click;
const nativeCreate = URL.createObjectURL.bind(URL), nativeRevoke = URL.revokeObjectURL.bind(URL);
const blobs = new Map();
URL.createObjectURL = (obj) => { const u = nativeCreate(obj); if (obj instanceof Blob) blobs.set(u, obj); return u; };
URL.revokeObjectURL = (u) => { blobs.delete(u); nativeRevoke(u); };
HTMLAnchorElement.prototype.click = function click() {
  if (this.hasAttribute('download') && blobs.has(this.href) && !this.dataset.site) { handleDownload(blobs.get(this.href), this.download || 'drawing.dwg'); return undefined; }
  if (this.hasAttribute('download') && !this.dataset.site && !canSave) { setStatus(me?.viewAs ? t('viewAs') : t('blocked'), 'bad'); return undefined; }
  return nativeClick.call(this);
};
function downloadToDevice(blob, name) {
  const a = document.createElement('a'); a.href = nativeCreate(blob); a.download = name; a.dataset.site = '1';
  document.body.append(a); nativeClick.call(a); a.remove(); setTimeout(() => nativeRevoke(a.href), 30000);
}
function handleDownload(blob, name) {
  if (!canSave) { setStatus(me?.viewAs ? t('viewAs') : t('blocked'), 'bad'); return; }
  const drawing = /\.(dwg|dxf)$/i.test(name);
  const dialog = $('saveDialog');
  const toSite = drawing && !!item;
  $('saveText').textContent = !drawing ? t('saveOther', { file: name }) : !item ? t('saveNoSource', { file: name }) : t('saveText', { file: name, name: label(item), seq: '…' });
  $('saveSite').hidden = !toSite; $('noteRow').hidden = !toSite; $('saveNote').value = '';
  if (toSite) getJSON(`/api/cad/copies/${item.sha256}`).then((r) => { const mine = r.copies.filter((c) => c.company === r.company); $('saveText').textContent = t('saveText', { file: name, name: label(item), seq: (mine.length ? Math.max(...mine.map((c) => c.seq)) : 0) + 1 }); }).catch(() => {});
  $('saveDevice').onclick = () => { dialog.close(); downloadToDevice(blob, name); };
  $('saveCancel').onclick = () => dialog.close();
  $('saveForm').onsubmit = async (e) => {
    e.preventDefault(); dialog.close();
    setStatus(t('saving'));
    try {
      const r = await getJSON(`/api/cad/copies/${item.sha256}`, { method: 'POST', body: blob, headers: {
        'Content-Type': 'application/octet-stream', 'X-Requested-With': 'cad', 'X-Filename': encodeURIComponent(name), 'X-Copy-Note': encodeURIComponent($('saveNote').value) } });
      savedSeq = r.seq; setStatus(t('saved', { seq: r.seq, name: label(item) })); loadCopies();
    } catch (err) { setStatus(err.message, 'bad'); }
  };
  dialog.showModal();
}

const label = (x) => (x.number || x.title ? [x.number, L === 'en' && x.title_en || x.title].filter(Boolean).join(' · ') : x.name);
async function loadCopies() {
  const select = $('copies');
  if (!item) return;
  let r;
  try { r = await getJSON(`/api/cad/copies/${item.sha256}`); } catch { return; }
  select.replaceChildren(new Option(t('original'), ''), ...r.copies.map((c) => new Option(`${t('copyItem', { seq: c.seq, by: c.by, at: when(c.at) })}${c.sharedWithYou ? ` (${t('sharedSpp')})` : c.company !== r.company ? ` (${c.company.toUpperCase()})` : ''}${c.note ? ' · ' + c.note : ''}`, `${c.company}/${String(c.seq).padStart(6, '0')}`)));
  select.value = copyInfo ? `${copyInfo.company}/${copyInfo.seq}` : '';
  select.hidden = !r.copies.length;
  select.onchange = () => {
    if (!confirm(t('leave'))) { select.value = copyInfo ? `${copyInfo.company}/${copyInfo.seq}` : ''; return; }
    const u = new URL(location.href); if (select.value) u.searchParams.set('copy', select.value); else u.searchParams.delete('copy'); location.href = u;
  };
}

// The program's control channel (docs/automation/web.md in its source).
async function control(request) {
  const api = window.wasmBindings;
  const ticket = api.ocs_control_submit(JSON.stringify(request));
  for (let i = 0; i < 1200; i++) {
    const reply = api.ocs_control_take(ticket);
    if (reply) return JSON.parse(reply);
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('no answer');
}
// Actions on the open document need the request envelope (request id, document id, revision).
let serial = 0;
async function act(request) {
  const state = await control({ op: 'state' });
  const id = `calwwt-${Date.now()}-${++serial}`;
  let reply = await control({ ...request, request_id: id, document_id: state.document_id, revision: state.revision });
  for (let i = 0; i < 600 && ['accepted', 'running'].includes(reply.status); i++) {
    await new Promise((r) => setTimeout(r, 50));
    reply = await control({ op: 'operation', request_id: id });
  }
  return reply;
}
const base64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

async function startProgram() {
  const canvasTest = document.createElement('canvas');
  if (!canvasTest.getContext('webgl2') && !navigator.gpu) { progress(t('noWebgl'), 'bad'); return false; }
  const meta = await getJSON('/cad-workspace/full/program.json');
  // The program's files sit in a folder named after its version (cached by the browser; never changed under that name).
  // The program finds its worker and fonts next to the page, so the page's base address is that folder.
  const dir = `/cad-workspace/full/${meta.dir}`;
  const base = document.createElement('base'); base.href = dir; document.head.prepend(base);
  // The WebAssembly file is stored gzip-compressed in parts (each static file is at most 25 MiB; 2026.47 is 50 MB
  // compressed): fetched one after the other, joined, then unpacked and checked below.
  const names = meta.wasmParts || [meta.wasm];
  const pieces = [];
  let got = 0;
  for (const name of names) {
    const r = await fetch(dir + name, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`download ${r.status}`);
    const counted = r.body.pipeThrough(new TransformStream({ transform(chunk, c) { got += chunk.byteLength; progress(t('downloading', { mb: (got / 1e6).toFixed(1) })); c.enqueue(chunk); } }));
    pieces.push(new Uint8Array(await new Response(counted).arrayBuffer()));
  }
  const packed = pieces.length === 1 ? pieces[0] : new Uint8Array(await new Blob(pieces).arrayBuffer());
  if (meta.wasmGzipBytes && packed.length !== meta.wasmGzipBytes) throw new Error('download incomplete');
  // Stored gzip-compressed (static files are at most 25 MiB); unpacked here unless the network already did it.
  const bytes = packed[0] === 0x1f && packed[1] === 0x8b
    ? new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : packed;
  progress(t('checking'));
  const digest = 'sha384-' + btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-384', bytes))));
  if (bytes.length !== meta.wasmBytes || digest !== meta.wasmIntegrity) throw new Error('integrity check failed');
  progress(t('starting'));
  await seedSettings(meta);
  const bindings = await import(dir + meta.glue);
  await bindings.default({ module_or_path: bytes });
  window.wasmBindings = bindings;
  $('aboutText').textContent = t('aboutText', { version: meta.version, commit: meta.commit.slice(0, 12) });
  return true;
}
function hideLoading() {
  const s = $('loading');
  s.classList.add('hide'); setTimeout(() => s.remove(), 450);
}

async function openInProgram() {
  let name, data;
  if (!item) {
    const r = await fetch('/cad-workspace/full/blank.dxf', { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`download ${r.status}`);
    name = 'Drawing1.dxf'; data = base64(new Uint8Array(await r.arrayBuffer()));
  } else {
    const file = copyInfo ? `/api/cad/copies/${item.sha256}/${copyInfo.company}/${copyInfo.seq}` : item.file;
    name = copyInfo ? `${item.name.replace(/\.(dwg|dxf)$/i, '')}-copy-${Number(copyInfo.seq)}.${copyInfo.format || 'dwg'}` : item.name;
    setStatus(t('opening', { name: label(item) }));
    const r = await fetch(file, { credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/sign-in.html'; return; }
    if (!r.ok) throw new Error(`download ${r.status}`);
    data = base64(new Uint8Array(await r.arrayBuffer()));
  }
  for (let i = 0; i < 100; i++) {
    const state = await control({ op: 'state' });
    if (state.modal) { await act({ op: 'action', name: 'close_modal' }); await new Promise((res) => setTimeout(res, 200)); continue; }
    const reply = await act({ op: 'open', name, data_base64: data });
    if (reply.ok === false && /busy/.test(JSON.stringify(reply))) { await new Promise((res) => setTimeout(res, 300)); continue; }
    if (reply.ok === false) throw new Error(reply.error?.message || reply.error || 'open');
    for (let j = 0; j < 100 && (await control({ op: 'state' })).document_id === state.document_id; j++) await new Promise((res) => setTimeout(res, 200));
    if (item) await act({ op: 'action', name: 'zoom_extents' }).catch(() => {});
    setStatus(!item ? (canSave ? '' : me?.viewAs ? t('viewAs') : t('viewOnly')) : canSave ? t('opened', { name: label(item) }) : me?.viewAs ? t('viewAs') : t('viewOnly'));
    return;
  }
  throw new Error('busy');
}

async function main() {
  try { me = await getJSON('/api/me'); } catch { return; }
  try { const v = localStorage.getItem(`tasks.lang.${me?.person || ''}`); L = v === 'en' || v === 'th' ? v : me?.lang === 'en' ? 'en' : 'th'; } catch { L = me?.lang === 'en' ? 'en' : 'th'; }
  w = W[L]; document.documentElement.lang = L;
  for (const n of document.querySelectorAll('[data-t]')) n.textContent = t(n.dataset.t);
  $('about').onclick = () => $('aboutDialog').showModal();
  try { list = await getJSON('/api/cad/drawings'); } catch (e) { progress(e.message, 'bad'); return; }
  canSave = !!list.canSave && !me.viewAs;
  const want = params.get('dwg');
  const all = [...list.groups.flatMap((g) => g.sheets.map((s) => ({ ...s, catalogId: s.id }))), ...list.files, ...list.legacy.map((f) => ({ ...f, title: f.title || f.name }))];
  item = want ? all.find((x) => x.catalogId === want || x.sha256 === want) || null : null;
  const copy = /^([a-z]+)\/(\d{6})$/.exec(params.get('copy') || '');
  if (item && copy) copyInfo = { company: copy[1], seq: copy[2] };
  $('name').textContent = item ? label(item) + (copyInfo ? ` · ${t('copyShort', { seq: Number(copyInfo.seq) })}` : '') : t('newDrawing');
  $('back').href = '/cad-workspace/' + (item ? `?dwg=${encodeURIComponent(item.catalogId || item.sha256)}` : '');
  setStatus(canSave ? '' : me.viewAs ? t('viewAs') : t('viewOnly'));
  if (copyInfo) {
    try { const r = await getJSON(`/api/cad/copies/${item.sha256}`); const c = r.copies.find((x) => x.company === copyInfo.company && x.seq === Number(copyInfo.seq)); if (c) copyInfo.format = c.format; } catch { /* opened below */ }
  }
  try {
    if (!(await startProgram())) return;
  } catch (e) { progress(t('badProgram', { e: String(e?.message || e).slice(0, 120) }), 'bad'); return; }
  for (let i = 0; i < 200 && !document.querySelector('body > canvas'); i++) await new Promise((r) => setTimeout(r, 50));
  hideLoading();
  loadCopies();
  try { await openInProgram(); } catch (e) { setStatus(t('openFailed', { e: String(e?.message || e).slice(0, 100) }), 'bad'); return; }
  // 2026.47 draws circles and arcs with a shader that the browser's older graphics path (WebGL2, used when there is no
  // WebGPU) refuses, so nothing is drawn there; its source after the release has the fix. Say so instead of a blank screen.
  let gpu = null;
  try { gpu = navigator.gpu ? await navigator.gpu.requestAdapter() : null; } catch { gpu = null; }
  if (!gpu) setStatus(t('noWebgpu'), 'bad');
}
main();
