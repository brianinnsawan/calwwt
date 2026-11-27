// Drawings & files on a site page (calwwt.sppwork.com/sites/<code>/, tab "Drawings"). Brian, 27 Nov 2026: one home for
// every document. The list is the site's own folder in Files (Sites › <code> › Drawings / Photos & video / Lab results /
// Reports & notes, and any folder people add there), read from /api/files with the person's own Files access; what is
// uploaded in Files (or here) shows here at once. Opening picks the viewer by file type:
//   PDF: shown here, every page (the browser's PDF viewer), with "Open PDF" for a new tab (phones);
//   picture: shown here; DWG / DXF: Sites -> CAD workspace (the one CAD tool of the site);
//   Excel, Word, PowerPoint and the rest: the Files viewer.
// A drawing kept as both PDF and DWG (same folder, same name before the extension) gets a "PDF | CAD" switch.
// Site videos (Brian's 360° walkthroughs on YouTube, sites.json "videos"; 27 Nov 2026) are listed with Photos & video and
// play here from youtube-nocookie.com (the one outside page the Sites pages may show, SITES_CSP in src/sites.mjs).
// The wastewater layouts that used to be built into the site (public/sites/layouts, sites.json "layouts") are still shown
// until they are moved into Files (admins: "Move into Files", /api/files/import-site-layouts); then only Files is used.
const T = {
  en: { pick: 'Drawing or file', builtIn: 'Built into the site (not yet in Files)', openPdf: 'Open PDF', download: 'Download', openCad: 'Open in the CAD workspace',
    fullCad: 'Full CAD program', openFile: 'Open', pdf: 'PDF', cad: 'CAD', upload: 'Upload', into: 'Upload into', folder: 'Folder in Files',
    empty: 'No drawings or files for this site yet.', emptyEdit: 'No drawings or files for this site yet. Upload them here or in Files (Sites › {code}).',
    noFiles: 'Files are not open to you, so only the drawings built into the site are shown.', cadNote: 'DWG / DXF drawings open in the CAD workspace: measure, mark up, or open them in the full CAD program.',
    move: 'Move into Files', moveText: '{n} drawings of this site are still built into the site page. Move the built-in drawings of all 8 sites into each site\'s Files folder "Drawings", so everything is in one place?',
    moving: 'Moving… {code}', moved: 'Moved {n} drawings into Files.', uploading: 'Uploading {name}…', uploaded: 'Uploaded {name}.', refused: 'Not uploaded: {e}',
    other: 'This file opens in the Files viewer.', youtube: 'Watch on YouTube', photos: 'Photos & video' },
  th: { pick: 'แบบหรือไฟล์', builtIn: 'แบบที่ติดมากับเว็บไซต์ (ยังไม่ได้ย้ายไปไฟล์)', openPdf: 'เปิด PDF', download: 'ดาวน์โหลด', openCad: 'เปิดในพื้นที่ทำงาน CAD',
    fullCad: 'โปรแกรม CAD เต็มรูปแบบ', openFile: 'เปิด', pdf: 'PDF', cad: 'CAD', upload: 'อัปโหลด', into: 'อัปโหลดไปที่', folder: 'โฟลเดอร์ในไฟล์',
    empty: 'ยังไม่มีแบบหรือไฟล์ของสถานีนี้', emptyEdit: 'ยังไม่มีแบบหรือไฟล์ของสถานีนี้ อัปโหลดได้ที่นี่หรือที่หน้าไฟล์ (สถานี › {code})',
    noFiles: 'คุณไม่มีสิทธิ์หน้าไฟล์ จึงแสดงเฉพาะแบบที่ติดมากับเว็บไซต์', cadNote: 'แบบ DWG / DXF เปิดในพื้นที่ทำงาน CAD: วัดระยะ เขียนโน้ต หรือเปิดในโปรแกรม CAD เต็มรูปแบบ',
    move: 'ย้ายไปไฟล์', moveText: 'สถานีนี้ยังมีแบบ {n} แผ่นที่ติดมากับหน้าสถานี ย้ายแบบของทั้ง 8 สถานีไปไว้ในโฟลเดอร์ "แบบ" ของแต่ละสถานีในหน้าไฟล์ เพื่อให้อยู่ที่เดียวกันหรือไม่',
    moving: 'กำลังย้าย… {code}', moved: 'ย้ายแบบ {n} แผ่นไปที่ไฟล์แล้ว', uploading: 'กำลังอัปโหลด {name}…', uploaded: 'อัปโหลด {name} แล้ว', refused: 'อัปโหลดไม่ได้: {e}',
    other: 'ไฟล์นี้เปิดในโปรแกรมดูไฟล์', youtube: 'ดูบน YouTube', photos: 'รูปและวิดีโอ' },
};
const CSS = `
.sf { position: absolute; inset: 0; display: grid; grid-template-rows: auto auto 1fr; background: var(--paper); }
.sf-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--rule); background: var(--panel); }
.sf-bar select { max-width: min(560px, 100%); }
.sf-bar .sp { flex: 1; }
.sf-bar a { white-space: nowrap; }
.sf-seg { display: inline-flex; border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; }
.sf-seg button { border: 0; border-radius: 0; }
.sf-seg button[aria-pressed="true"] { background: var(--accent); color: #fff; }
.sf-msg { padding: 6px 12px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--rule); background: var(--panel); }
.sf-msg[data-kind="bad"] { color: var(--bad); }
.sf-msg:empty { display: none; }
.sf-msg button { margin-left: 8px; }
/* The viewer always sits in the third row: the message row above it is hidden when empty, and without a fixed row the
   viewer moved up into the short row and had no height (27 Nov 2026: PDFs and videos showed nothing). */
.sf-msg { grid-row: 2; }
.sf-stage { grid-row: 3; min-height: 0; position: relative; overflow: auto; background: #fff; }
.sf-stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.sf-stage img { display: block; max-width: 100%; margin: 0 auto; }
.sf-stage.video { background: #000; }
.sf-card { margin: 40px auto; max-width: 520px; display: grid; gap: 12px; padding: 20px; border: 1px solid var(--rule); border-radius: 10px; background: var(--panel); color: var(--ink); }
.sf-card .row { display: flex; flex-wrap: wrap; gap: 8px; }
.sf-card a.btn { display: inline-block; padding: 6px 12px; border: 1px solid var(--rule); border-radius: 6px; text-decoration: none; color: inherit; }
.sf-card a.btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
`;
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k.startsWith('on')) n[k] = v; else n.setAttribute(k, v); } for (const k of kids) if (k != null) n.append(k); return n; };
const ext = (name) => (/\.([a-z0-9]{1,8})$/i.exec(name)?.[1] || '').toLowerCase();
const base = (name) => name.replace(/\.[^.]+$/, '').toLowerCase();
const IMG = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const CAD = new Set(['dwg', 'dxf']);
const half = (name, l) => { const [th, en] = String(name).split(' · '); return (l === 'th' ? th : en) || th || en || name; };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

/** Reads the site's files. Returns { items, canEdit, isAdmin, filesOn, uploadFolders, root }. */
export async function loadSiteFiles(site, sites) {
  let data = null;
  try { const r = await fetch('/api/files', { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) data = await r.json(); } catch { data = null; }
  const root = `site-${site.code}`, folders = data?.folders || [];
  const inSite = new Set([root]);
  for (let grew = true; grew;) { grew = false; for (const f of folders) if (!inSite.has(f.id) && inSite.has(f.parent)) { inSite.add(f.id); grew = true; } }
  const order = ['drawings', 'reports', 'lab', 'photos'].map((s) => `${root}-${s}`);
  const rank = (id) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  const folderName = (id) => folders.find((f) => f.id === id)?.name || '';
  const files = (data?.files || []).filter((f) => inSite.has(f.folder))
    .sort((a, b) => rank(a.folder) - rank(b.folder) || folderName(a.folder).localeCompare(folderName(b.folder)) || a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((f) => ({ ...f, kind: 'file', site: site.code, folderName: folderName(f.folder) }));
  // Built-in layouts still to move: those whose file name is not in the site's Drawings folder yet.
  const drawingNames = new Set(files.filter((f) => f.folder === `${root}-drawings`).map((f) => f.name.toLowerCase()));
  const builtIns = (site.layouts || []).filter((x) => !drawingNames.has(builtInName(x).toLowerCase()))
    .map((x) => ({ kind: 'builtIn', id: `builtin:${x.file}`, name: builtInName(x), title: x, folder: '', folderName: '' }));
  // Site videos on YouTube, listed with the site's Photos & video folder.
  const photos = `${root}-photos`;
  const videos = (site.videos || []).filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')).map((v) => ({ kind: 'video', id: `video:${v.youtube}`, name: '', title: v,
    youtube: v.youtube, folder: photos, folderName: folderName(photos) || 'รูปและวิดีโอ · Photos & video' }));
  return { items: [...files, ...videos, ...builtIns], canEdit: !!data?.canEdit, isAdmin: !!data?.canDeleteFolders, filesOn: !!data,
    uploadFolders: folders.filter((f) => inSite.has(f.id) && f.id !== root).sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name)), root };
}
// Same rule as the server (src/files.mjs builtInName).
export const builtInName = (x) => `${String(x.en || x.file.split('/').pop()).normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 190)}.pdf`;

export function itemLabel(it, l) {
  if (it.kind === 'video') return `${it.title[l] || it.title.en}${it.title.date ? ` · ${it.title.date}` : ''}`;
  return it.kind === 'builtIn' ? (it.title[l] || it.title.en) : it.name;
}
export function itemHref(it) {
  if (it.kind === 'builtIn') return `/sites/layouts/${it.title.file}.pdf`;
  if (it.kind === 'video') return `https://youtu.be/${it.youtube}`;
  const e = ext(it.name);
  if (CAD.has(e)) return `/cad-workspace/?dwg=${encodeURIComponent(it.sha256 || '')}${it.site ? `&site=${it.site}` : ''}`;
  return `/files/view.html?id=${encodeURIComponent(it.id)}`;
}

/** The Drawings pane. Returns { select(id) } so the left panel can open an item here. */
export function showSiteFiles(view, site, l, state, sites, reload) {
  const t = T[l];
  if (!document.getElementById('sf-css')) { const s = el('style', { id: 'sf-css' }); s.textContent = CSS; document.head.append(s); }
  const { items } = state;
  const box = el('div', { class: 'sf' });
  const bar = el('div', { class: 'sf-bar' }), msg = el('div', { class: 'sf-msg', role: 'status' }), stage = el('div', { class: 'sf-stage' });
  box.append(bar, msg, stage); view.replaceChildren(box);
  const say = (text, kind = '') => { msg.textContent = text; msg.dataset.kind = kind; };

  const pick = el('select', { 'aria-label': t.pick });
  const groups = new Map();
  for (const it of items) {
    const g = it.kind === 'builtIn' ? t.builtIn : half(it.folderName, l);
    if (!groups.has(g)) { const og = el('optgroup', { label: g }); groups.set(g, og); pick.append(og); }
    groups.get(g).append(el('option', { value: it.id }, itemLabel(it, l)));
  }
  const seg = el('span', { class: 'sf-seg' });
  const actions = el('span', { class: 'sf-act' });
  bar.append(pick, seg, actions, el('span', { class: 'sp' }));
  if (state.filesOn) bar.append(el('a', { href: `/files/#${state.root}` }, `${t.folder} ›`));
  // Upload into one of the site's folders (Files edit: SPP and Caltex). Pricing / contract papers are refused by the server.
  if (state.canEdit && state.uploadFolders.length) {
    const where = el('select', { 'aria-label': t.into });
    for (const f of state.uploadFolders) where.append(el('option', { value: f.id }, half(f.name, l)));
    const input = el('input', { type: 'file', multiple: '', hidden: '' });
    input.onchange = async () => {
      for (const file of input.files) {
        say(fill(t.uploading, { name: file.name }));
        try {
          const r = await fetch(`/api/files/upload?folder=${encodeURIComponent(where.value)}&name=${encodeURIComponent(file.name)}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'files', 'Content-Type': 'application/octet-stream' }, body: file });
          const body = await r.json().catch(() => ({}));
          if (!r.ok) { say(fill(t.refused, { e: body.error || `HTTP ${r.status}` }), 'bad'); return; }
          say(fill(t.uploaded, { name: file.name }));
        } catch (e) { say(fill(t.refused, { e: e.message }), 'bad'); return; }
      }
      input.value = ''; await reload();
    };
    bar.append(where, el('button', { type: 'button', onclick: () => input.click() }, t.upload), input);
  }

  const twinOf = (it) => it.kind === 'file' && items.find((x) => x !== it && x.kind === 'file' && x.folder === it.folder && base(x.name) === base(it.name) && (CAD.has(ext(it.name)) ? ext(x.name) === 'pdf' : CAD.has(ext(x.name))));
  const link = (href, text, primary) => el('a', { class: `btn${primary ? ' primary' : ''}`, href }, text);
  function show(id) {
    const it = items.find((x) => x.id === id) || items[0];
    if (!it) return;
    pick.value = it.id;
    const e = it.kind === 'builtIn' ? 'pdf' : ext(it.name);
    const twin = twinOf(it);
    seg.replaceChildren();
    if (twin) {
      const isCad = CAD.has(e), pdfIt = isCad ? twin : it, cadIt = isCad ? it : twin;
      seg.append(el('button', { type: 'button', 'aria-pressed': String(!isCad), onclick: () => show(pdfIt.id) }, t.pdf),
        el('button', { type: 'button', 'aria-pressed': String(isCad), onclick: () => show(cadIt.id) }, t.cad));
    }
    const fileUrl = it.kind === 'builtIn' ? itemHref(it) : `/api/files/${it.id}/download`;
    actions.replaceChildren();
    stage.classList.toggle('video', it.kind === 'video');
    if (it.kind === 'video') {
      // The site sends no referrer by default; YouTube's player needs the site's address to play, so this frame sends it.
      actions.append(el('a', { href: itemHref(it), target: '_blank', rel: 'noopener noreferrer' }, t.youtube));
      stage.replaceChildren(el('iframe', { src: `https://www.youtube-nocookie.com/embed/${it.youtube}?rel=0`, title: itemLabel(it, l),
        referrerpolicy: 'strict-origin-when-cross-origin', allow: 'accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '' }));
    } else if (e === 'pdf') {
      const inline = it.kind === 'builtIn' ? fileUrl : `${fileUrl}?inline=1`;
      actions.append(el('a', { href: inline, target: '_blank', rel: 'noopener' }, t.openPdf));
      stage.replaceChildren(el('iframe', { src: `${inline}#view=FitH`, title: itemLabel(it, l) }));
    } else if (IMG.has(e)) {
      actions.append(el('a', { href: fileUrl, download: it.name }, t.download));
      stage.replaceChildren(el('img', { src: `${fileUrl}?inline=1`, alt: it.name }));
    } else if (CAD.has(e)) {
      stage.replaceChildren(el('div', { class: 'sf-card' }, el('b', {}, it.name), el('span', {}, t.cadNote),
        el('div', { class: 'row' }, link(itemHref(it), t.openCad, true), link(`/cad-workspace/full/?dwg=${encodeURIComponent(it.sha256 || '')}`, t.fullCad), link(fileUrl, t.download))));
    } else {
      stage.replaceChildren(el('div', { class: 'sf-card' }, el('b', {}, it.name), el('span', {}, t.other),
        el('div', { class: 'row' }, link(itemHref(it), t.openFile, true), link(fileUrl, t.download))));
    }
  }
  pick.onchange = () => show(pick.value);
  if (!items.length) {
    pick.hidden = true;
    stage.replaceChildren(el('div', { class: 'sf-card' }, el('span', {}, state.canEdit ? fill(t.emptyEdit, { code: site.code }) : t.empty)));
  } else show((items.find((x) => x.kind === 'builtIn' || ext(x.name) === 'pdf' || IMG.has(ext(x.name))) || items[0]).id);   // open on a drawing to look at
  if (!state.filesOn && items.length) say(t.noFiles);

  // Admins: move the drawings still built into the site into Files (all 8 sites in one go).
  const pendingHere = items.filter((x) => x.kind === 'builtIn').length;
  if (state.isAdmin && pendingHere) {
    const btn = el('button', { type: 'button' }, t.move);
    btn.onclick = async () => {
      btn.disabled = true; let n = 0;
      for (const s of sites) {
        say(fill(t.moving, { code: s.code }));
        try {
          const r = await fetch(`/api/files/import-site-layouts/${s.code}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'files' } });
          const body = await r.json().catch(() => ({}));
          if (!r.ok) { say(fill(t.refused, { e: body.error || `HTTP ${r.status}` }), 'bad'); btn.disabled = false; return; }
          n += (body.moved || []).length;
        } catch (e) { say(fill(t.refused, { e: e.message }), 'bad'); btn.disabled = false; return; }
      }
      say(fill(t.moved, { n })); await reload();
    };
    msg.replaceChildren(fill(t.moveText, { n: pendingHere }), btn);
  }
  return { select: show };
}
