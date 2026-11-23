// Typing into PowerPoint and Word files in the browser (Files; Brian, 10 Nov 2026). Own code; the file itself is changed
// by /files/vendor/pptxedit.mjs and docxedit.mjs, which rewrite only the text that was edited.
//
// How it works: the viewer draws each paragraph of the file as its own element. Each one is matched to its paragraph in
// the file (same order, same text); matched paragraphs can be typed in. Changes save by themselves, like Excel cells:
// one person's run of edits goes into one version (the server folds autosaves), and earlier versions are kept.
// Several people: the page checks for a newer version every few seconds. If someone saved first, your changes are put on
// top of their version when they touched other text; if you both changed the same text box (or the same paragraph in
// Word), theirs is kept, yours is shown to you so you can type it again, and nothing else is lost.

const SMALL = 3 * 1048576;          // bigger files (decks full of photos) save less often and are not re-drawn by themselves
const POLL_ACTIVE = 10000, POLL_IDLE = 60000, IDLE_AFTER = 5 * 60000;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const loose = (s) => s.replace(/[\s ]+/g, ' ').trim();

/** Longest run of pairs (i, j) in order where eq(a[i], b[j]): how the file's parts are matched to what is on screen. */
export function align(a, b, eq) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = eq(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  for (let i = 0, j = 0; i < n && j < m;) { if (eq(a[i], b[j])) { out.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return out;
}

/**
 * One editing session on an open file.
 * o: { file, buf, at, canEdit, t, el, status, lang, actions, before, note, driver }
 * driver: { enable(on), snapshot() -> { ops, marks }, build(buf, ops), rebase(snap, buf) -> { snap, lost }, committed(snap),
 *           refresh(buf), focused() -> boolean, count() -> how many texts can be edited }
 */
export function openSession(o) {
  const { file, t, el, status, driver } = o;
  let doc = { buf: o.buf, id: file.id, at: o.at || file.at || '' };
  let editing = false, dirty = false, saving = false, blocked = false, error = '', savedAt = '', timer = 0, lastActive = Date.now(), behind = false, pollTimer = 0;
  const big = () => doc.buf.byteLength > SMALL;
  const state = el('strong', { class: 'fv-save', role: 'status' });
  const doneBtn = el('button', { type: 'button', class: 'btn', onclick: async () => { await run(); setEditing(false); } }, t('doneEdit'));
  const bar = el('div', { class: 'fv-editbar', hidden: true }, state, el('span', {}, o.note), doneBtn);
  const editBtn = el('button', { type: 'button', class: 'btn primary', onclick: () => setEditing(true) }, t('editCells'));
  const newer = el('div', { class: 'fv-old', hidden: true });
  o.before.before(newer, bar);
  if (o.canEdit && driver.count() > 0) o.actions.prepend(editBtn);

  function paint() {
    bar.hidden = !editing; editBtn.hidden = editing;
    state.dataset.kind = error ? 'bad' : '';
    state.textContent = saving ? (big() ? t('savingBig', { mb: (doc.buf.byteLength / 1048576).toFixed(0) }) : t('saving')) : error ? t('notSaved', { msg: error }) : dirty ? t('unsaved') : savedAt ? t('savedAt', { time: savedAt }) : t('autosaveOn');
  }
  function setEditing(on) { editing = on; driver.enable(on); paint(); if (!on && behind) catchUp(); }
  const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(run, ms); paint(); };
  /** Called by the driver: something was typed / the caret left a text. */
  const changed = () => { dirty = true; blocked = false; lastActive = Date.now(); schedule(big() ? 8000 : 3000); };
  const left = () => { if (dirty && !blocked) schedule(big() ? 4000 : 700); else if (behind && !saving) setTimeout(() => { if (!driver.focused() && !dirty) catchUp(); }, 300); };

  async function latest() {
    const r = await fetch(`/api/files/${encodeURIComponent(doc.id)}/latest`, { credentials: 'same-origin', cache: 'no-store' });
    return r.ok ? r.json() : null;
  }
  async function download(id) {
    const r = await fetch(`/api/files/${encodeURIComponent(id)}/download`, { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { buf: await r.arrayBuffer(), at: r.headers.get('X-File-Saved-At') || '' };
  }
  const adopt = (id, at, buf) => { doc = { buf, id, at }; file.id = id; file.at = at; history.replaceState(null, '', `/files/view.html?id=${encodeURIComponent(id)}`); };

  async function run() {
    clearTimeout(timer); timer = 0;
    if (saving) return;
    let snap = driver.snapshot();
    if (!snap.ops.length) { dirty = false; paint(); return; }
    saving = true; error = ''; paint();
    let retry = false, redraw = false, again = false; const lost = [];
    try {
      for (let attempt = 0; snap.ops.length; attempt++) {
        let out;
        try { out = await driver.build(doc.buf, snap.ops); }
        catch (e) {
          // The file does not take these changes (it is not as this page believed): draw it again and hand the text back.
          console.warn('changes not applied', e);
          lost.push(...snap.ops.map((op) => op.text ?? (op.paras || []).map((x) => x.text).filter(Boolean).join(' / ')).filter(Boolean));
          break;
        }
        const q = new URLSearchParams({ folder: file.folder, name: file.name, base: doc.id, baseAt: doc.at, autosave: '1' });
        let r;
        try { r = await fetch(`/api/files/upload?${q}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'files', 'Content-Type': 'application/octet-stream' }, body: out }); }
        catch { retry = true; throw new Error(t('offline')); }
        const body = await r.json().catch(() => ({}));
        if (r.status === 409 && attempt < 4) {
          // Someone saved first: take their version, keep the changes of mine that touch other text, save again.
          const info = await latest();
          if (!info) { retry = true; throw new Error(body.error || 'HTTP 409'); }
          const got = await download(info.id);
          adopt(info.id, got.at || info.at, got.buf); redraw = true;
          const res = await driver.rebase(snap, doc.buf);
          snap = res.snap; lost.push(...res.lost);
          continue;
        }
        if (!r.ok) { retry = r.status >= 500 || r.status === 409; throw new Error(body.error || `HTTP ${r.status}`); }
        adopt(body.id, body.at || '', out.buffer.byteLength === out.byteLength ? out.buffer : out.slice().buffer);
        if ((await driver.committed(snap, doc.buf)) === false) again = true; // the driver lost track: draw the saved file again
        savedAt = new Date().toLocaleTimeString(o.lang === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
        break;
      }
    } catch (e) {
      error = String(e.message || e).slice(0, 80);
      if (!retry) { blocked = true; status(error, 'bad'); } // e.g. no longer allowed, file too large: do not hammer the server
    }
    saving = false;
    if (lost.length || again) {
      // Same text changed by two people: theirs is in the file. Show the newest version and hand back what was typed.
      try { await driver.refresh(doc.buf); driver.enable(editing); behind = false; redraw = false; } catch (e) { console.warn('not redrawn', e); }
      if (lost.length) status(t('textClash', { text: lost.join(' · ').slice(0, 400) }), 'bad');
    }
    dirty = !!driver.snapshot().ops.length;
    if (redraw) { behind = true; if (!driver.focused() && !dirty) await catchUp(true); }
    if (dirty && !blocked) schedule(error ? 5000 : 700); else paint();
  }
  /** Draws the newest version (already in doc, or fetched) when nothing is being typed. */
  async function catchUp(have) {
    if (saving || dirty || driver.focused()) { behind = true; return; }
    try {
      if (!have) {
        const info = await latest();
        if (!info || (info.id === doc.id && info.at === doc.at)) { behind = false; return; }
        const got = await download(info.id);
        if (dirty || saving || driver.focused()) { behind = true; return; }
        adopt(info.id, got.at || info.at, got.buf);
        if (!info.mine) status(info.by ? t('othersSaved', { by: info.by }) : t('updated'), 'ok');
      }
      const y = window.scrollY;
      await driver.refresh(doc.buf); driver.enable(editing); window.scrollTo(0, y);
      behind = false; newer.hidden = true;
    } catch (e) { console.warn('newest version not shown', e); }
  }
  async function poll() {
    clearTimeout(pollTimer);
    try {
      if (document.visibilityState === 'visible' && !saving) {
        if (dirty && !blocked) await run();
        else if (!dirty) {
          const info = await latest();
          if (info && (info.id !== doc.id || info.at !== doc.at)) {
            if (big()) { // a big deck is not downloaded again without asking
              newer.replaceChildren(el('span', {}, t('newerBig', { by: info.by || '' })), el('button', { type: 'button', class: 'btn primary', onclick: () => { newer.hidden = true; catchUp(); } }, t('showNewest')));
              newer.hidden = false;
            } else await catchUp();
          }
        }
      }
    } catch (e) { console.warn('check for changes failed', e); }
    pollTimer = setTimeout(poll, Date.now() - lastActive > IDLE_AFTER ? POLL_IDLE : POLL_ACTIVE);
  }
  window.addEventListener('beforeunload', (ev) => { if (dirty || saving) { run(); ev.preventDefault(); ev.returnValue = t('leaveAsk'); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty && !blocked) run(); });
  pollTimer = setTimeout(poll, POLL_ACTIVE);
  paint();
  return { changed, left, current: () => doc.buf, flush: run };
}

// ---------- what both editors share: paragraphs drawn as elements that can be typed in ----------
/** The text of a drawn paragraph as the file would hold it: line breaks as "\n", the viewer's filler space as nothing. */
export function shownText(p) {
  let s = '';
  for (const n of p.childNodes) s += n.nodeName === 'BR' ? '\n' : n.textContent;
  s = s.replace(/ /g, ' ');
  return s.trim() === '' && !s.includes('\n') ? '' : s;
}
const caretAtStart = (p) => { const s = getSelection(); if (!s.rangeCount || !s.isCollapsed || !p.contains(s.anchorNode)) return false; const r = document.createRange(); r.selectNodeContents(p); r.setEnd(s.anchorNode, s.anchorOffset); return r.toString() === '' && !r.cloneContents().querySelector('br'); };
const caretTo = (node, end) => { const r = document.createRange(); r.selectNodeContents(node); r.collapse(!end); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };

/**
 * Typing behaviour for a host full of paragraphs. units: () -> every paragraph unit (the element that is added / removed
 * as one paragraph); each unit has ._para = { base, from, editable } and holds the text element para(unit).
 * opts: { para(unit) -> element, filler(unit) -> a fresh empty inline element in the paragraph's style, structure: may paragraphs be added and removed }
 */
export function wireTyping(host, session, opts) {
  const unitOf = (node) => { for (let n = node?.nodeType === 1 ? node : node?.parentElement; n && n !== host; n = n.parentElement) if (n._para) return n; return null; };
  const text = opts.text || shownText;
  const blank = (p) => text(p) === '' && !p.querySelector('br');
  const fill = (unit, p, keep) => { if (!blank(p)) return; const f = opts.filler(unit); f.textContent = keep ? '' : ' '; p.replaceChildren(f); };
  host.addEventListener('input', (ev) => { if (unitOf(ev.target)?._para.editable) session().changed(); });
  host.addEventListener('focusin', (ev) => { const u = unitOf(ev.target); if (u?._para.editable && blank(opts.para(u))) { fill(u, opts.para(u), true); caretTo(opts.para(u).firstChild || opts.para(u)); } });
  host.addEventListener('focusout', (ev) => { const u = unitOf(ev.target); if (!u?._para.editable) return; if (u.isConnected) fill(u, opts.para(u), false); session().left(); });
  host.addEventListener('paste', (ev) => {
    const u = unitOf(ev.target); if (!u?._para.editable) return;
    ev.preventDefault();
    document.execCommand('insertText', false, (ev.clipboardData?.getData('text/plain') || '').replace(/\s*\r?\n\s*/g, ' '));
  });
  host.addEventListener('keydown', (ev) => {
    const u = unitOf(ev.target); if (!u?._para.editable) return;
    const p = opts.para(u);
    if (ev.key === 'Escape') { ev.preventDefault(); p.blur(); return; }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (!opts.structure || ev.shiftKey || ev.isComposing) return;
      // A new paragraph after this one, taking the text after the caret (in PowerPoint: a new bullet).
      const sel = getSelection(); if (!sel.rangeCount) return;
      const r = sel.getRangeAt(0); r.deleteContents();
      const tail = document.createRange(); tail.selectNodeContents(p); tail.setStart(r.endContainer, r.endOffset);
      const frag = tail.extractContents(), u2 = opts.clone(u), p2 = opts.para(u2);
      p2.replaceChildren(frag);
      for (const q of [p, p2]) { for (const c of [...q.children]) if (c.textContent === '' && c.nodeName !== 'BR' && q.children.length > 1) c.remove(); }
      u2._para = { base: null, from: u, editable: true };
      u.after(u2);
      fill(u, p, true); fill(u2, p2, true);
      caretTo(p2.firstChild || p2); session().changed();
      return;
    }
    if (ev.key === 'Backspace' && opts.structure && caretAtStart(p)) {
      // At the start of a paragraph: join it to the one before (or remove it if empty).
      const prev = u.previousElementSibling;
      if (!prev?._para?.editable || u._para.keep) return;
      ev.preventDefault();
      const pp = opts.para(prev);
      if (blank(pp)) pp.replaceChildren();
      const mark = pp.lastChild;
      if (!blank(p)) while (p.firstChild) pp.appendChild(p.firstChild);
      u.remove(); fill(prev, pp, true);
      if (mark && mark.isConnected) caretTo(mark, true); else caretTo(pp.firstChild || pp);
      pp.focus?.(); session().changed();
    }
  });
}

// ---------- PowerPoint ----------
/**
 * o: { host (the drawn slides), render(buf) -> draws them again, buf, at, file, canEdit, t, el, status, lang, actions, before }
 */
export async function editSlides(o) {
  const { readSlides, applyEdits } = await import('/files/vendor/pptxedit.mjs');
  const { host } = o;
  let bodies = [], session = null, on = false; // bodies: { path, index, xml: [texts in the file], dom: [texts on screen], wrapper }
  const unitsOf = (wrapper) => [...wrapper.children].filter((d) => d._para);
  const para = (unit) => unit.querySelector('p');
  function map(model) {
    bodies = [];
    const drawn = [...host.querySelectorAll('.pptx-preview-slide-wrapper')];
    if (drawn.length !== model.length) return; // e.g. hidden slides drawn differently: not safe to match
    model.forEach((slide, i) => {
      const own = drawn[i].querySelector('.slide-wrapper'); if (!own) return;
      const boxes = [...own.querySelectorAll('.text-wrapper')].map((w) => ({ w, divs: [...w.children].filter((d) => d.nodeName === 'DIV' && d.querySelector(':scope > p')) }));
      const sigX = slide.bodies.map((b) => b.paras.map((p) => loose(p.text)).join('\n')), sigD = boxes.map((b) => b.divs.map((d) => loose(shownText(para(d)))).join('\n'));
      const withText = (s) => s.replace(/\n/g, '') !== '';
      for (const [bi, di] of align(sigX, sigD, (x, d) => x === d && withText(x))) {
        const xml = slide.bodies[bi].paras, { w, divs } = boxes[di];
        if (xml.length !== divs.length) continue;
        const dom = divs.map((d) => shownText(para(d)));
        divs.forEach((d, j) => { d._para = { base: j, from: null, editable: !xml[j].locked && dom[j] === xml[j].text }; });
        bodies.push({ path: slide.path, index: bi, xml: xml.map((p) => p.text), dom, wrapper: w });
      }
    });
  }
  const likeOf = (u) => { for (let x = u, n = 0; x && n < 50; x = x._para.from, n++) if (x._para.base != null) return x._para.base; return 0; };
  const driver = {
    count: () => bodies.reduce((n, b) => n + unitsOf(b.wrapper).filter((u) => u._para.editable).length, 0),
    focused: () => !!document.activeElement?.isContentEditable && host.contains(document.activeElement),
    enable(yes) {
      on = yes; host.classList.toggle('fv-typing', yes);
      for (const b of bodies) for (const u of unitsOf(b.wrapper)) { const p = para(u); if (yes && u._para.editable) p.setAttribute('contenteditable', 'plaintext-only'); else p.removeAttribute('contenteditable'); }
    },
    snapshot() {
      const ops = [], marks = [];
      for (const b of bodies) {
        const units = unitsOf(b.wrapper), now = units.map((u) => ({ base: u._para.base, text: shownText(para(u)), like: likeOf(u) }));
        if (now.length === b.dom.length && now.every((x, j) => x.base === j && x.text === b.dom[j])) continue;
        ops.push({ path: b.path, body: b.index, sig: b.xml, paras: now.map((x) => (x.base == null ? { base: null, like: x.like, text: x.text } : x.text !== b.dom[x.base] ? { base: x.base, text: x.text } : { base: x.base })) });
        marks.push({ body: b, units, now });
      }
      return { ops, marks };
    },
    build: (buf, ops) => applyEdits(buf, ops),
    async rebase(snap, buf) {
      const model = await readSlides(buf), keep = { ops: [], marks: [] }, lost = [];
      snap.ops.forEach((op, i) => {
        const there = model.find((s) => s.path === op.path)?.bodies[op.body];
        if (there && same(there.paras.map((p) => p.text), op.sig)) { keep.ops.push(op); keep.marks.push(snap.marks[i]); }
        else lost.push(snap.marks[i].now.map((x) => x.text).filter(Boolean).join(' / '));
      });
      return { snap: keep, lost };
    },
    committed(snap) {
      for (const m of snap.marks) {
        m.body.xml = m.now.map((x) => (x.base == null || x.text !== m.body.dom[x.base] ? x.text : m.body.xml[x.base]));
        m.body.dom = m.now.map((x) => x.text);
        m.units.forEach((u, j) => { u._para.base = j; u._para.from = null; });
      }
    },
    async refresh(buf) { await o.render(buf); map(await readSlides(buf)); },
  };
  map(await readSlides(o.buf));
  wireTyping(host, () => session, {
    para, structure: true,
    clone: (u) => { const u2 = u.cloneNode(false), p2 = para(u).cloneNode(false); p2.setAttribute('contenteditable', 'plaintext-only'); u2.appendChild(p2); return u2; },
    filler: (u) => { const from = u.querySelector('span') || u.parentElement?.querySelector('span'); return from ? from.cloneNode(false) : document.createElement('span'); },
  });
  session = openSession({ ...o, note: o.t('slideNote'), driver });
  return session;
}

// ---------- Word ----------
/** The text of a drawn Word paragraph as the file holds it: tabs as "\t", line breaks as "\n". */
export function docText(node) {
  let s = '';
  const walk = (el) => { for (const n of el.childNodes) { if (n.nodeType === 3) s += n.nodeValue; else if (n.nodeName === 'BR') s += '\n'; else if (n.nodeType === 1 && n.classList.contains('docx-tab-stop')) s += '\t'; else if (n.nodeType === 1) walk(n); } };
  walk(node);
  s = s.replace(/\u00a0/g, ' ');
  return s.trim() === '' && !/[\n\t]/.test(s) ? '' : s;
}
/**
 * Matches two lists of texts in order (equal texts; ok(text) false = never matched). Made for long documents: the same
 * start and end are skipped first; a big middle is cut into pieces at texts that appear exactly once on both sides.
 */
export function pairUp(a, b, ok = () => true) {
  const eq = (x, y) => x === y && ok(x), out = [];
  const work = (a0, a1, b0, b1, depth) => { // a[a0, a1) against b[b0, b1)
    while (a0 < a1 && b0 < b1 && eq(a[a0], b[b0])) out.push([a0++, b0++]);
    const tail = [];
    while (a0 < a1 && b0 < b1 && eq(a[a1 - 1], b[b1 - 1])) tail.push([--a1, --b1]);
    const n = a1 - a0, m = b1 - b0;
    if (n && m) {
      if (n * m <= 4e6) { for (const [i, j] of align(a.slice(a0, a1), b.slice(b0, b1), eq)) out.push([a0 + i, b0 + j]); }
      else if (depth < 40) {
        // Texts found once on each side, kept in the longest run that is in the same order on both: fixed points to cut at.
        const count = new Map();
        for (let i = a0; i < a1; i++) if (ok(a[i])) { const c = count.get(a[i]) || [0, 0, 0, 0]; c[0]++; c[2] = i; count.set(a[i], c); }
        for (let j = b0; j < b1; j++) { const c = count.get(b[j]); if (c) { c[1]++; c[3] = j; } }
        const once = [...count.values()].filter((c) => c[0] === 1 && c[1] === 1).map((c) => [c[2], c[3]]).sort((x, y) => x[0] - y[0]);
        const tops = [], prev = new Array(once.length).fill(-1);
        once.forEach(([, j], k) => { let lo = 0, hi = tops.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (once[tops[mid]][1] < j) lo = mid + 1; else hi = mid; } if (lo > 0) prev[k] = tops[lo - 1]; tops[lo] = k; });
        const fixed = []; for (let k = tops.length ? tops[tops.length - 1] : -1; k >= 0; k = prev[k]) fixed.unshift(once[k]);
        if (fixed.length) { let pa = a0, pb = b0; for (const [i, j] of [...fixed, [a1, b1]]) { work(pa, i, pb, j, depth + 1); if (i < a1) out.push([i, j]); pa = i + 1; pb = j + 1; } }
      }
    }
    for (let k = tail.length - 1; k >= 0; k--) out.push(tail[k]);
  };
  work(0, a.length, 0, b.length, 0);
  return out;
}
/**
 * o: { host (the drawn pages), render(buf) -> draws them again, buf, at, file, canEdit, t, el, status, lang, actions, before }
 */
export async function editDocument(o) {
  const { readDoc, applyEdits, same: norm } = await import('/files/vendor/docxedit.mjs');
  const { host } = o;
  let xml = [], dom = [], keep = [], byBase = new Map(), session = null; // per paragraph of the file: its text, the text shown, may it be removed, its element
  const drawn = () => [...host.querySelectorAll('article p')].filter((p) => !p.closest('header, footer'));
  function map(model) {
    xml = model.paras.map((p) => p.text); keep = model.paras.map((p) => p.keep); byBase = new Map();
    const ps = drawn(), shown = ps.map(docText), lx = xml.map(loose), ld = shown.map(loose);
    dom = xml.map(norm);
    // Paragraphs with text are matched in order; runs of empty ones in between only when both sides have the same number.
    const pairs = pairUp(lx, ld, (x) => x !== '');
    const link = (k, i) => { const p = ps[i]; dom[k] = shown[i]; byBase.set(k, p); p._para = { base: k, from: null, keep: keep[k], editable: !model.paras[k].locked && shown[i] === norm(xml[k]) && !p.querySelector('img, svg, canvas, object') }; };
    let pk = -1, pi = -1;
    for (const [k, i] of [...pairs, [xml.length, ps.length]]) {
      if (k - pk === i - pi) for (let g = 1; g < k - pk; g++) if (lx[pk + g] === ld[pi + g]) link(pk + g, pi + g);
      if (k < xml.length) link(k, i);
      pk = k; pi = i;
    }
  }
  const likeOf = (u) => { for (let x = u, n = 0; x && n < 50; x = x._para.from, n++) if (x._para.base != null) return x._para.base; return null; };
  const driver = {
    count: () => [...byBase.values()].filter((u) => u._para.editable).length,
    focused: () => !!document.activeElement?.isContentEditable && host.contains(document.activeElement),
    enable(yes) {
      host.classList.toggle('fv-typing', yes);
      for (const p of drawn()) { if (yes && p._para?.editable) p.setAttribute('contenteditable', 'plaintext-only'); else p.removeAttribute('contenteditable'); }
    },
    snapshot() {
      const ops = [];
      for (const [k, u] of byBase) {
        if (!u.isConnected) { ops.push({ at: k, sig: xml[k], remove: true, was: dom[k] }); continue; }
        const text = docText(u);
        if (u._para.editable && text !== dom[k]) ops.push({ at: k, sig: xml[k], text, unit: u });
      }
      for (const u of drawn()) {
        if (!u._para || u._para.base != null) continue;
        let a = u.previousElementSibling;
        while (a && !(a._para && a._para.base != null)) a = a.previousElementSibling;
        if (!a) continue;
        ops.push({ after: a._para.base, sig: xml[a._para.base], like: likeOf(u) ?? a._para.base, text: docText(u), unit: u });
      }
      return { ops, marks: [] };
    },
    build: (buf, ops) => applyEdits(buf, ops.map(({ at, after, sig, like, text, remove }) => ({ at, after, sig, like, text, remove }))),
    /** Someone saved first: move my changes onto their version where the paragraph is still as I knew it. */
    async rebase(snap, buf) {
      const model = await readDoc(buf), there = model.paras.map((p) => p.text);
      const to = new Map(pairUp(xml, there));
      const keepOps = [], lost = [];
      for (const op of snap.ops) {
        const k = op.at ?? op.after, j = to.get(k);
        if (j === undefined) { lost.push(op.remove ? op.was : op.text); continue; }
        if (op.at != null) op.at = j; else op.after = j;
        if (op.like != null) op.like = to.get(op.like) ?? j;
        op.sig = there[j]; keepOps.push(op);
      }
      const nd = there.map(norm), nb = new Map();
      for (const [k, u] of byBase) { const j = to.get(k); if (j === undefined) { if (u._para) { u._para.editable = false; u.removeAttribute('contenteditable'); u._para = null; } continue; } nd[j] = dom[k]; u._para.base = j; u._para.keep = model.paras[j].keep; nb.set(j, u); }
      xml = there; dom = nd; keep = model.paras.map((p) => p.keep); byBase = nb;
      return { snap: { ops: keepOps, marks: [] }, lost: lost.filter(Boolean) };
    },
    /** After a save: give every paragraph its new number, and read the saved texts back from the file. */
    async committed(snap, buf) {
      const gone = new Set(), mods = new Map(), added = new Map();
      for (const op of snap.ops) { if (op.remove) gone.add(op.at); else if (op.at != null) mods.set(op.at, op); else (added.get(op.after) || added.set(op.after, []).get(op.after)).push(op); }
      const nd = [], nb = new Map();
      for (let k = 0; k < xml.length; k++) {
        if (!gone.has(k)) { const u = byBase.get(k); if (u && u._para) { u._para.base = nd.length; nb.set(nd.length, u); } nd.push(mods.has(k) ? mods.get(k).text : dom[k]); }
        for (const op of added.get(k) || []) { op.unit._para.base = nd.length; op.unit._para.from = null; nb.set(nd.length, op.unit); nd.push(op.text); }
      }
      const model = await readDoc(buf);
      if (model.paras.length !== nd.length) return false;
      xml = model.paras.map((p) => p.text); keep = model.paras.map((p) => p.keep); dom = nd; byBase = nb;
      for (const [k, u] of byBase) u._para.keep = keep[k];
      return true;
    },
    async refresh(buf) { await o.render(buf); map(await readDoc(buf)); },
  };
  map(await readDoc(o.buf));
  wireTyping(host, () => session, {
    para: (u) => u, structure: true, text: docText,
    clone: (u) => { const c = u.cloneNode(false); c.removeAttribute('id'); c.setAttribute('contenteditable', 'plaintext-only'); return c; },
    filler: (u) => { const from = u.querySelector('span') || u.previousElementSibling?.querySelector?.('span'); const f = from ? from.cloneNode(false) : document.createElement('span'); f.removeAttribute('id'); return f; },
  });
  session = openSession({ ...o, note: o.t('docNote'), driver });
  return session;
}
