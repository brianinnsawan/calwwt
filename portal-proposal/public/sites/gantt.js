// calwwt.sppwork.com (23 Nov 2026): copied from calcr.sppwork.com public/gantt.js. Changes: one timeline per site
// (init({ api, defaultUrl, canEdit })), saves send X-Requested-With: calwwt and are signed with the signed-in person's name,
// and the Edit button only shows for people with Project timeline = edit (Admin page). The server checks again.
// Timeline tab - project Gantt chart (23.11.2026). Loaded from index.html by its own small script:
//   <script type="module"> import('./gantt.js').then(m => m.init({ getLang })) - independent of the 3D viewer
// Adds a "3D model / Timeline" tab switch to the panel header and a full-view Gantt over the 3D view (Thai / English).
// calwwt: a site can have more than one tab before Timeline (views = [{ id, en, th }], e.g. Layouts and 3D model);
// onView(id) is called when one of them is chosen, and the page shows that one (public/sites/site.mjs).
// Data: the last saved version from /api/sites/<code>/timeline (tasks database, shared by everyone); if nothing was saved yet,
// public/sites/data/timelines/<code>.json.
// "Edit dates": Start / Days / End / % per task (Days = working days; Start or Days moves End, End changes Days),
// key milestone dates, work week (Mon-Fri / Mon-Sat / every day). Save shares the change; every save is kept in the history.

const TXT = {
  en: { model: '3D model', time: 'Timeline', close: 'Close timeline', today: 'Today', d: 'd', wd: 'working days',
    done: 'done', ms: 'Milestone', key: 'Key', prog: 'progress', left: (n, nm) => `${nm} in ${n} days`, past: 'All key dates passed',
    next: (nm, n) => `Next start: ${nm} in ${n} d`,
    cS: 'Start', cD: 'Days', cE: 'End', cC: 'Starts in', cP: '%', cIn: n => `${n} d`, cNow: n => `on now · ${n} d left`, cTod: 'today', cLate: n => `late ${n} d`,
    cDone: 'done', cPast: 'passed', nNow: 'now', nLate: n => `late ${n}`,
    src: 'Starting dates set up on 23 Nov 2026 – to be confirmed. Click a bar or milestone for its dates.',
    saved: (w, b) => `Last saved ${w}${b ? ' by ' + b : ''}. Click a bar or milestone for its dates.`,
    pick: 'Click a bar or milestone for its dates.',
    drag: 'Drag a bar to move it · drag its left or right end to change the start or end · drag a milestone to move it.',
    edit: 'Edit dates', editing: 'Editing…', save: 'Save', cancel: 'Cancel', discard: 'Discard changes?', week: 'Work days', name: 'Your name',
    wk: { mf: 'Mon–Fri', ms: 'Mon–Sat', all: 'Every day' }, hist: 'History', histPick: 'Earlier versions…', orig: 'Original chart',
    keyms: 'Key milestones', hint: 'Change Start, Days or End – the others follow (Days = working days). Or drag the bars in the chart: the middle moves the task, the ends change its start or end. Save shares the change with everyone.',
    saving: 'Saving…', okSaved: 'Saved – everyone now sees these dates.', err: 'Could not save. Check the connection and try again.',
    conflict: (w, b) => `Someone saved a newer version (${w}${b ? ', ' + b : ''}). Load it first – your unsaved changes will be lost.`, loadLatest: 'Load latest',
    loaded: w => `Loaded the version of ${w}. Save to make it the current one.`, loadedOrig: 'Loaded the original chart dates. Save to make them the current ones.',
    noStore: 'Saving is not available yet.', unsaved: 'Unsaved changes', wkNote: w => `Work days ${w}` },
  th: { model: 'โมเดล 3D', time: 'แผนงาน', close: 'ปิดแผนงาน', today: 'วันนี้', d: 'วัน', wd: 'วันทำงาน',
    done: 'เสร็จแล้ว', ms: 'หมุดหมาย', key: 'สัญลักษณ์', prog: 'ความคืบหน้า', left: (n, nm) => `อีก ${n} วันถึง ${nm}`, past: 'ผ่านวันสำคัญทั้งหมดแล้ว',
    next: (nm, n) => `งานถัดไป: ${nm} เริ่มในอีก ${n} วัน`,
    cS: 'เริ่ม', cD: 'จำนวนวัน', cE: 'สิ้นสุด', cC: 'เริ่มในอีก', cP: '%', cIn: n => `${n} วัน`, cNow: n => `กำลังทำ · เหลือ ${n} วัน`, cTod: 'วันนี้', cLate: n => `เลยกำหนด ${n} วัน`,
    cDone: 'เสร็จแล้ว', cPast: 'ผ่านแล้ว', nNow: 'กำลังทำ', nLate: n => `เลย ${n}`,
    src: 'วันที่เริ่มต้นตั้งไว้เมื่อ 23 พ.ย. 2026 – รอยืนยัน คลิกแถบงานหรือหมุดหมายเพื่อดูวันที่',
    saved: (w, b) => `บันทึกล่าสุด ${w}${b ? ' โดย ' + b : ''} คลิกแถบงานหรือหมุดหมายเพื่อดูวันที่`,
    pick: 'คลิกแถบงานหรือหมุดหมายเพื่อดูวันที่',
    drag: 'ลากแถบงานเพื่อเลื่อน · ลากปลายซ้ายหรือขวาเพื่อเปลี่ยนวันเริ่มหรือวันสิ้นสุด · ลากหมุดหมายเพื่อเลื่อนวัน',
    edit: 'แก้ไขวันที่', editing: 'กำลังแก้ไข…', save: 'บันทึก', cancel: 'ยกเลิก', discard: 'ทิ้งการแก้ไข?', week: 'วันทำงาน', name: 'ชื่อผู้แก้ไข',
    wk: { mf: 'จ.–ศ.', ms: 'จ.–ส.', all: 'ทุกวัน' }, hist: 'ประวัติ', histPick: 'ฉบับก่อนหน้า…', orig: 'แผนงานเดิม',
    keyms: 'หมุดหมายหลัก', hint: 'แก้วันเริ่ม จำนวนวัน หรือวันสิ้นสุด ค่าอื่นจะปรับตามอัตโนมัติ (จำนวนวัน = วันทำงาน) หรือลากแถบงานในแผนภูมิ: ลากตรงกลางเพื่อเลื่อนงาน ลากปลายเพื่อเปลี่ยนวันเริ่มหรือวันสิ้นสุด กดบันทึกเพื่อให้ทุกคนเห็น',
    saving: 'กำลังบันทึก…', okSaved: 'บันทึกแล้ว ทุกคนจะเห็นวันที่ใหม่นี้', err: 'บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
    conflict: (w, b) => `มีผู้บันทึกฉบับใหม่กว่า (${w}${b ? ', ' + b : ''}) กรุณาโหลดฉบับล่าสุดก่อน การแก้ไขที่ยังไม่บันทึกจะหายไป`, loadLatest: 'โหลดฉบับล่าสุด',
    loaded: w => `โหลดฉบับวันที่ ${w} แล้ว กดบันทึกเพื่อใช้เป็นฉบับปัจจุบัน`, loadedOrig: 'โหลดวันที่ตามแผนงานเดิมแล้ว กดบันทึกเพื่อใช้เป็นฉบับปัจจุบัน',
    noStore: 'ยังไม่สามารถบันทึกได้', unsaved: 'ยังไม่ได้บันทึก', wkNote: w => `วันทำงาน ${w}` },
};
const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] };

const CSS = `
#tabs { display: inline-flex; margin-top: 10px; border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; justify-self: start; }
#tabs button { border: 0; border-radius: 0; padding: 6px 16px; background: var(--paper); font-weight: 600; }
#tabs button + button { border-left: 1px solid var(--rule); }
#tabs button.on { background: var(--accent); color: #fff; }
#gantt { position: absolute; inset: 0; z-index: 99990; background: var(--panel); display: grid; grid-template-rows: auto 1fr auto; }
#gantt[hidden] { display: none; }
#gantt .gh { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 10px 14px 10px 28px; border-bottom: 1px solid var(--rule); }
#gantt-title { font: 600 20px/1.15 var(--font-display); letter-spacing: .02em; flex: 1 1 320px; }
#gantt-sub { font: 11.5px var(--font-mono); color: var(--muted); }
#gantt-x { font: 600 16px/1 var(--font-mono); padding: 5px 10px; }
#gantt-edit { font-weight: 600; }
#gantt-edit.on { background: var(--accent); color: #fff; border-color: var(--accent); }
#gantt-ed { display: grid; gap: 8px; padding: 10px 12px; margin: 0 0 2px; border: 1px solid var(--accent); border-radius: 6px; background: color-mix(in srgb, var(--accent) 7%, var(--panel)); }
#gantt-ed[hidden] { display: none; }
#gantt-ed .er { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
#gantt-ed label { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--muted); }
#gantt-ed select, #gantt-ed input { font: 12.5px var(--font-body); color: var(--ink); background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 4px 6px; }
#gantt-ed input[type=date] { font-family: var(--font-mono); font-size: 12px; }
#gantt-ed .sp { flex: 1; }
#gantt-ed .bt { display: inline-flex; gap: 8px; white-space: nowrap; }
#gantt-ed .hint { font-size: 12px; color: var(--muted); }
#gantt-ed .msg { font-size: 12.5px; color: var(--ink); }
#gantt-ed .msg.bad { color: #d62828; font-weight: 600; }
#gantt-ed .msg.ok { color: var(--accent); font-weight: 600; }
#gantt-ed button.pri { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; min-width: 84px; }
#gantt-ed button.warn { border-color: #d62828; color: #d62828; }
#gantt-ed .kms b { font-weight: 600; color: var(--ink); font-size: 12.5px; }
#gantt .gb { overflow: auto; padding: 10px 14px 6px 28px; }
#gantt svg { display: block; flex: none; }
#gantt .gw { display: flex; width: max-content; }
#gantt-l { position: sticky; left: -14px; z-index: 1; background: var(--panel); }
#gantt.nar #gantt-l { position: static; }
#gantt svg text { fill: var(--ink); font: 500 12.5px var(--font-body); }
#gantt svg text.mu { fill: var(--muted); font: 11px var(--font-mono); }
#gantt svg text.hd { fill: var(--muted); font: 600 12px var(--font-display); letter-spacing: .06em; text-transform: uppercase; }
#gantt svg text.dn { fill: var(--muted); font: 10.5px var(--font-mono); }
#gantt svg text.gl { font: 600 12.5px var(--font-body); }
#gantt svg text.pl { font: 600 13px var(--font-display); letter-spacing: .08em; text-transform: uppercase; }
#gantt svg text.mt { font: 600 12.5px var(--font-body); }
#gantt svg text.td { fill: #d62828; font: 600 11px var(--font-mono); }
#gantt svg text.cd { font: 11px var(--font-mono); }
#gantt svg text.cd.now { fill: var(--accent); font-weight: 600; }
#gantt svg text.cd.late { fill: #d62828; font-weight: 600; }
#gantt svg text.cd.dim { fill: var(--muted); }
#gantt svg .it { cursor: pointer; outline: none; }
#gantt svg .it.hov .hl, #gantt svg .it:focus-visible .hl, #gantt svg .it.sel .hl { fill: color-mix(in srgb, var(--accent) 12%, transparent); }
#gantt svg .it:focus-visible .hl { stroke: var(--accent); stroke-width: 1.5; }
#gantt.cansave svg [data-drag] { cursor: grab; }
#gantt.cansave svg [data-drag=l], #gantt.cansave svg [data-drag=r] { cursor: ew-resize; }
#gantt.editing svg [data-drag] { touch-action: none; }
#gantt.dragging, #gantt.dragging * { cursor: grabbing !important; user-select: none !important; }
#gantt.dragging.dragedge, #gantt.dragging.dragedge * { cursor: ew-resize !important; }
#gantt-tip { position: absolute; z-index: 5; pointer-events: none; white-space: nowrap; transform: translate(-50%, calc(-100% - 12px));
  background: var(--ink); color: var(--panel); font: 600 11.5px var(--font-mono); padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
#gantt-tip[hidden] { display: none; }
#gantt svg .it.chg .hl { fill: color-mix(in srgb, #f2b705 22%, transparent); }
#gantt-l input { box-sizing: border-box; width: 100%; height: 24px; margin: 0; padding: 1px 4px; font: 12px var(--font-mono); color: var(--ink);
  background: var(--panel); border: 1px solid var(--rule); border-radius: 3px; }
#gantt-l input:focus { outline: 2px solid var(--accent); outline-offset: 0; border-color: var(--accent); }
#gantt-l input[type=number] { text-align: right; }
#gantt .gf { border-top: 1px solid var(--rule); padding: 8px 14px 10px 28px; font-size: 12px; color: var(--muted); display: grid; gap: 6px; }
#gantt-det { color: var(--ink); font-size: 13px; min-height: 1.4em; }
#gantt-det b { font-weight: 600; }
#gantt-leg { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; }
#gantt-leg i { display: inline-block; width: 18px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
#gantt-leg i.dm { width: 9px; height: 9px; border-radius: 1px; transform: rotate(45deg); margin-right: 8px; }
#gantt-leg i.tl { width: 2px; height: 12px; border-radius: 0; background: #d62828; }
@media (max-width: 760px) { #gantt { position: fixed; } #gantt .gb, #gantt .gh, #gantt .gf { padding-left: 14px; } }
`;

const clone = o => JSON.parse(JSON.stringify(o));

export async function init({ getLang, api = '/api/timeline', defaultUrl = 'timeline.json', canEdit = true, onlyTimeline = false, modelTab = null, views = null, onView = null }) {
  const orig = await fetch(defaultUrl, { cache: 'no-store' }).then(r => r.json());
  let saved = null;                    // { data, ver, savedAt, by } from the server
  let canSave = true;
  try {
    const r = await fetch(api, { cache: 'no-store', credentials: 'same-origin' });
    if (r.ok) { const j = await r.json(); saved = j && j.data ? j : { data: null, ver: null }; } else canSave = false;
  } catch (e) { canSave = false; }
  if (!canEdit) canSave = false;
  let data = saved?.data || orig;      // what everyone sees
  let edit = false, draft = null, dirty = false, discardArm = false;
  const changed = new Set();           // row indexes edited in this session
  const cur = () => (edit ? draft : data);

  const L = () => (getLang() === 'en' ? 'en' : 'th');
  const T = () => TXT[L()];
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);

  // tab switch in the panel header
  const tabs = document.createElement('div'); tabs.id = 'tabs'; tabs.setAttribute('role', 'tablist');
  const viewIds = views?.length ? views.map(v => v.id) : ['model'];
  let lastView = viewIds[0];
  tabs.innerHTML = [...viewIds, 'time'].map(id => `<button type="button" role="tab" data-tab="${id}"></button>`).join('');
  const hdr = document.querySelector('#rail header'), sub = hdr.querySelector('.sub');
  sub ? sub.after(tabs) : hdr.append(tabs);

  // full-view overlay
  const box = document.createElement('div'); box.id = 'gantt'; box.hidden = true; box.setAttribute('role', 'tabpanel');
  box.innerHTML = `<div class="gh"><div id="gantt-title"></div><span id="gantt-sub"></span><button type="button" id="gantt-edit"></button><button type="button" id="gantt-x">×</button>
</div>
    <div class="gb"><div class="gw"><svg id="gantt-l" xmlns="http://www.w3.org/2000/svg"></svg><svg id="gantt-svg" xmlns="http://www.w3.org/2000/svg" role="img"></svg></div></div>
    <div id="gantt-tip" hidden></div>
    <div class="gf">
      <div id="gantt-ed" hidden>
        <div class="er"><label><span data-e="week"></span><select id="ge-week"><option value="mf"></option><option value="ms"></option><option value="all"></option></select></label>
          <label><span data-e="name"></span><input id="ge-name" maxlength="40" size="14" autocomplete="name"></label>
          <label><span data-e="hist"></span><select id="ge-hist"><option value=""></option></select></label>
          <button type="button" id="ge-orig" data-e="orig"></button>
          <span class="sp"></span><span class="msg" id="ge-msg" role="status"></span>
          <span class="bt"><button type="button" id="ge-cancel"></button><button type="button" id="ge-save" class="pri"></button></span></div>
        <div class="er kms" id="ge-kms"></div>
        <div class="hint" data-e="hint"></div>
      </div>
      <div id="gantt-det"></div><div id="gantt-leg"></div><div id="gantt-src"></div></div>`;
  document.getElementById('view').append(box);
  const svg = box.querySelector('#gantt-svg'), svgL = box.querySelector('#gantt-l'), body = box.querySelector('.gb');
  const $ = s => box.querySelector(s);

  // dates (day numbers since 1970, UTC)
  const P = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const dt = n => new Date(n * 864e5);
  const iso = n => dt(n).toISOString().slice(0, 10);
  const now = new Date(), TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5;
  const fmt = (n, yr = true) => { const d = dt(n); return `${d.getUTCDate()} ${MON[L()][d.getUTCMonth()]}${yr ? ' ' + d.getUTCFullYear() : ''}`; };
  const dfmt = (n, narrow) => { const d = dt(n); return narrow ? `${d.getUTCDate()}/${d.getUTCMonth() + 1}` : `${d.getUTCDate()} ${MON[L()][d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`; };
  const stamp = s => { const d = new Date(s); return `${fmt(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // working-day calendar
  const isWork = (n, d = cur()) => { const w = dt(n).getUTCDay(), wk = d.week || 'mf';
    if (wk === 'mf' && (w === 0 || w === 6)) return false; if (wk === 'ms' && w === 0) return false;
    return !(d.holidays || []).includes(iso(n)); };
  const endFrom = (s, dur) => { if (!(dur > 0)) return s; let n = s, c = 0; for (let k = 0; k < 6000; k++, n++) { if (isWork(n) && ++c === dur) return n; } return s; };
  const workCount = (s, e) => { let c = 0; for (let n = s; n <= e; n++) if (isWork(n)) c++; return c; };

  const rowsOf = d => { const r = []; d.phases.forEach((ph, pi) => ph.groups.forEach((g, gi) => g.tasks.forEach((t, ti) => r.push({ t, ph, g, pi, gi, ti })))); return r; };
  let rows = rowsOf(data);

  // text widths measured with the real SVG styles
  const msv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  msv.setAttribute('style', 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;overflow:hidden');
  const mtx = document.createElementNS('http://www.w3.org/2000/svg', 'text'); msv.append(mtx); box.append(msv);
  const tw = (s, cls = '') => { mtx.setAttribute('class', cls); mtx.textContent = s; return mtx.getComputedTextLength() || s.length * 7; };
  let sel = -1, G = null, drag = null, justDragged = false;

  function cdown(tk, narrow) {
    const t = T(), s = P(tk.ms ? tk.date : tk.start), e = P(tk.ms ? tk.date : tk.end);
    if (!tk.ms && (tk.pct || 0) >= 100) return [t.cDone, 'dim'];
    if (TODAY < s) return [t.cIn(s - TODAY), ''];
    if (tk.ms) return TODAY === s ? [t.cTod, 'now'] : [t.cPast, 'dim'];
    if (TODAY <= e) return [narrow ? t.nNow : t.cNow(e - TODAY + 1), 'now'];
    return [narrow ? t.nLate(TODAY - e) : t.cLate(TODAY - e), 'late'];
  }

  function render() {
    const d = cur(), lg = L(), t = T();
    rows = rowsOf(d);
    // date range: the planned range, widened to take in every (edited) date
    const all = rows.flatMap(R => R.t.ms ? [P(R.t.date)] : [P(R.t.start), P(R.t.end)]).concat((d.milestones || []).map(m => P(m.date)));
    let D0 = Math.min(P(d.from), Math.min(...all) - 3), D1 = Math.max(P(d.to), Math.max(...all) + 6) + 1;
    D0 -= (dt(D0).getUTCDay() + 6) % 7;      // back to a Monday
    if (drag) { D0 = drag.D0; D1 = drag.D1; }  // keep the scale still while dragging
    const ND = D1 - D0;

    const inputs = edit && !(drag && drag.fromView);   // a drag started in view mode keeps the view layout until the drop
    const narrow = body.clientWidth < 560, GW = narrow ? 112 : 160, RH = inputs ? 32 : 30, MON_H = 22, DAY_H = 20, PAD_R = 8, FOOT = 26;
    let heads, CW, cells = [];
    if (inputs) {
      heads = [t.cS, t.cD, t.cE, t.cP]; CW = [136, 66, 136, 60];
    } else {
      heads = [t.cS, t.cD, t.cE, t.cC];
      cells = rows.map(R => { const k = R.t, s0 = P(k.ms ? k.date : k.start), e0 = P(k.ms ? k.date : k.end), cd = cdown(k, narrow);
        return [dfmt(s0, narrow), k.ms ? '—' : `${k.dur} ${t.d}`, k.ms ? '—' : dfmt(e0, narrow), cd[0], cd[1]]; });
      CW = drag?.CW || heads.map((h, k) => Math.ceil(Math.max(tw(h, 'hd'), ...cells.map(c => tw(c[k], 'cd' + (k === 3 && c[4] ? ' ' + c[4] : ''))))) + (narrow ? 10 : 16));
    }
    const LW = GW + CW.reduce((a, b) => a + b, 0);
    const avail = Math.max(body.clientWidth - 42, narrow ? 300 : 600);
    box.classList.toggle('nar', narrow);
    const ppd = drag ? drag.ppd : Math.min(16, Math.max(narrow ? 6 : 5, (avail - LW - PAD_R) / ND));
    const W = Math.round(LW + ND * ppd + PAD_R);
    const X = n => LW + (n - D0) * ppd, XC = n => X(n) + ppd / 2;
    const colX = k => GW + CW.slice(0, k).reduce((a, b) => a + b, 0);

    // top milestone labels, staggered so they don't overlap
    const lvEnd = []; let tops_k = 0;
    const tops = (d.milestones || []).map(m => {
      const n = P(m.date), x = XC(n), name = m[lg], ds = fmt(n);
      const w = Math.max(tw(name, 'mt'), tw(ds, 'mu')) + 12;
      let lv = 0; while (lvEnd[lv] != null && lvEnd[lv] > x - w / 2) lv++;
      lvEnd[lv] = x + w / 2; return { n, x, name, ds, lv, k: tops_k++ };
    });
    const NLV = Math.max(1, lvEnd.length), MS_H = NLV * 32 + 18;
    const Y0 = MS_H + MON_H + DAY_H, YB = Y0 + rows.length * RH;
    const H = YB + FOOT;
    let o = '', oL = '';

    o += `<rect x="${LW}" y="${Y0}" width="${W - LW - PAD_R}" height="${rows.length * RH}" fill="var(--paper)"/>`;
    for (let n = D0; n < D1;) {       // month header
      const js = dt(n), nx = Math.min(D1, Date.UTC(js.getUTCFullYear(), js.getUTCMonth() + 1, 1) / 864e5);
      o += `<rect x="${X(n)}" y="${MS_H}" width="${(nx - n) * ppd}" height="${MON_H}" fill="var(--ink)" fill-opacity=".85"/>`;
      if ((nx - n) * ppd > 40) o += `<text x="${X(n) + 6}" y="${MS_H + 15}" style="fill:var(--panel);font:600 12.5px var(--font-display);letter-spacing:.06em">${MON[lg][js.getUTCMonth()]} ${js.getUTCFullYear()}</text>`;
      o += `<line x1="${X(n)}" x2="${X(n)}" y1="${MS_H}" y2="${YB}" stroke="var(--muted)" stroke-opacity=".45"/>`;
      n = nx;
    }
    o += `<rect x="${LW}" y="${MS_H + MON_H}" width="${W - LW - PAD_R}" height="${DAY_H}" fill="var(--ink)" fill-opacity=".08"/>`;
    for (let n = D0; n < D1; n++) {  // weekly grid (Mondays)
      if (dt(n).getUTCDay() !== 1) continue;
      o += `<line x1="${X(n)}" x2="${X(n)}" y1="${MS_H + MON_H}" y2="${YB}" stroke="var(--rule)"/>`;
      o += `<text class="dn" x="${X(n) + 3}" y="${MS_H + MON_H + 14}">${String(dt(n).getUTCDate()).padStart(2, '0')}</text>`;
    }
    oL += `<text class="hd" x="6" y="${MS_H + MON_H + DAY_H - 6}">${lg === 'th' ? 'งาน' : 'Work'}</text>`;
    oL += `<rect x="${GW}" y="${MS_H}" width="${LW - GW}" height="${MON_H}" fill="var(--ink)" fill-opacity=".85"/><rect x="${GW}" y="${MS_H + MON_H}" width="${LW - GW}" height="${DAY_H}" fill="var(--ink)" fill-opacity=".08"/>`;
    oL += `<text x="${GW + 6}" y="${MS_H + 15}" style="fill:var(--panel);font:600 12.5px var(--font-display);letter-spacing:.06em">${lg === 'th' ? 'กำหนดการ' : 'SCHEDULE'}${edit ? (lg === 'th' ? ' · แก้ไข' : ' · EDITING') : ''}</text>`;
    heads.forEach((h, k) => { oL += `<text class="hd" x="${colX(k) + 6}" y="${MS_H + MON_H + DAY_H - 6}">${h}</text>`; });

    // phase bands + group labels + row lines
    let r = 0;
    d.phases.forEach(ph => {
      const n = ph.groups.reduce((a, g) => a + g.tasks.length, 0), y = Y0 + r * RH;
      if (!n) return;
      oL += `<rect x="0" y="${y}" width="28" height="${n * RH}" fill="${ph.color}"/>`;
      const pw = tw(ph[lg], 'pl'), pfit = pw > n * RH - 10 ? ` textLength="${n * RH - 10}" lengthAdjust="spacingAndGlyphs"` : '';
      oL += `<text class="pl" transform="translate(18 ${y + n * RH / 2}) rotate(-90)" text-anchor="middle" style="fill:${ph.ink}"${pfit}>${esc(ph[lg])}</text>`;
      let gr = r;
      ph.groups.forEach(g => {
        const gy = Y0 + gr * RH, gn = g.tasks.length;
        oL += `<rect x="28" y="${gy}" width="${LW - 28}" height="${gn * RH}" fill="${ph.color}" fill-opacity=".16"/>`;
        const gw = tw(g[lg], 'gl'), gfit = gw > GW - 44 ? ` textLength="${GW - 44}" lengthAdjust="spacingAndGlyphs"` : '';
        oL += `<text class="gl" x="38" y="${gy + 19}"${gfit}>${esc(g[lg])}</text>`;
        const ln = `<line x1="28" x2="${W - PAD_R}" y1="${gy + gn * RH}" y2="${gy + gn * RH}" stroke="var(--panel)" stroke-width="2"/>`; o += ln; oL += ln;
        gr += gn;
      });
      const ln = `<line x1="0" x2="${W - PAD_R}" y1="${y + n * RH}" y2="${y + n * RH}" stroke="var(--panel)" stroke-width="4"/>`; o += ln; oL += ln;
      r += n;
    });

    tops.forEach(m => { o += `<line x1="${m.x}" x2="${m.x}" y1="${MS_H - 4}" y2="${YB}" stroke="#d62828" stroke-opacity=".45" stroke-dasharray="3 4"/>`; });
    if (TODAY >= D0 && TODAY < D1) {
      const x = XC(TODAY);
      o += `<line x1="${x}" x2="${x}" y1="${MS_H + MON_H}" y2="${YB + 6}" stroke="#d62828" stroke-width="2" stroke-opacity=".8"/>`;
      o += `<text class="td" x="${x}" y="${YB + 19}" text-anchor="${x > W - 120 ? 'end' : 'middle'}">${t.today} ${fmt(TODAY)}</text>`;
    }

    // tasks
    const inp = (i, f, type, x, y, w, val, extra = '') =>
      `<foreignObject x="${x + 3}" y="${y + 4}" width="${w - 8}" height="${RH - 8}"><input xmlns="http://www.w3.org/1999/xhtml" id="ge-${i}-${f}" data-i="${i}" data-f="${f}" type="${type}" value="${val}" ${extra}/></foreignObject>`;
    rows.forEach((R, i) => {
      const tk = R.t, ph = R.ph, y = Y0 + i * RH, cy = y + RH / 2, name = esc(tk[lg]), cls = (i === sel ? ' sel' : '') + (edit && changed.has(i) ? ' chg' : '');
      let g = `<g class="it${cls}" data-i="${i}" tabindex="0" role="button" aria-label="${name}">`;
      g += `<rect class="hl" x="${LW}" y="${y + 1}" width="${W - LW - PAD_R}" height="${RH - 2}" fill="transparent"/>`;
      if (tk.ms) {
        const n = P(tk.date), x = XC(n), ds = fmt(n, false), s = 8;
        g += `<path d="M${x} ${cy - s}L${x + s} ${cy}L${x} ${cy + s}L${x - s} ${cy}Z" fill="${ph.color}" stroke="var(--ink)" stroke-opacity=".35"/>`;
        g += `<rect data-drag="ms" data-i="${i}" x="${x - s - 3}" y="${cy - s - 3}" width="${2 * s + 6}" height="${2 * s + 6}" fill="transparent"/>`;
        const wN = tw(tk[lg]), wD = tw(ds, 'mu');
        if (x + s + 8 + wN + 8 + wD < W - PAD_R) g += `<text x="${x + s + 6}" y="${cy + 4.5}">${name}</text><text class="mu" x="${x + s + 6 + wN + 8}" y="${cy + 4}">${ds}</text>`;
        else g += `<text class="mu" x="${x - s - 6}" y="${cy + 4}" text-anchor="end">${ds}</text><text x="${x - s - 6 - wD - 8}" y="${cy + 4.5}" text-anchor="end">${name}</text>`;
      } else {
        const a = P(tk.start), b = P(tk.end) + 1, x0 = X(a), x1 = X(b), w = x1 - x0, bh = 18, by = cy - bh / 2;
        const pct = Math.max(0, Math.min(100, tk.pct || 0));
        g += `<rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="3" fill="${ph.color}"/>`;
        if (pct > 0) g += `<rect x="${x0}" y="${by}" width="${w * pct / 100}" height="${bh}" rx="3" fill="#000" fill-opacity=".28"/>`;
        if (w > 34) g += `<text x="${x0 + 5}" y="${cy + 4}" style="fill:${ph.ink};font:600 11px var(--font-mono)">${pct}%</text>`;
        const hw = Math.min(8, Math.max(4, w / 4));
        g += `<rect data-drag="m" data-i="${i}" x="${x0}" y="${by - 3}" width="${w}" height="${bh + 6}" fill="transparent"/>`;
        g += `<rect data-drag="l" data-i="${i}" x="${x0 - 3}" y="${by - 3}" width="${hw + 3}" height="${bh + 6}" fill="transparent"/>`;
        g += `<rect data-drag="r" data-i="${i}" x="${x1 - hw}" y="${by - 3}" width="${hw + 3}" height="${bh + 6}" fill="transparent"/>`;
        if (x1 + 6 + tw(tk[lg]) < W - PAD_R) g += `<text x="${x1 + 6}" y="${cy + 4.5}">${name}</text>`;
        else g += `<text x="${x0 - 6}" y="${cy + 4.5}" text-anchor="end">${name}</text>`;
      }
      o += g + '</g>';

      // left columns
      let c = `<g class="it${cls}" data-i="${i}">`;
      c += `<rect class="hl" x="${GW}" y="${y + 1}" width="${LW - GW}" height="${RH - 2}" fill="transparent"/>`;
      c += `<line x1="${GW}" x2="${LW}" y1="${y + RH}" y2="${y + RH}" stroke="var(--panel)" stroke-opacity=".8"/>`;
      if (inputs) {
        if (tk.ms) {
          c += inp(i, 's', 'date', colX(0), y, CW[0], tk.date, 'required');
          [1, 2, 3].forEach(k => { c += `<text class="cd dim" x="${colX(k) + 8}" y="${cy + 4}">—</text>`; });
        } else {
          c += inp(i, 's', 'date', colX(0), y, CW[0], tk.start, 'required');
          c += inp(i, 'd', 'number', colX(1), y, CW[1], tk.dur, 'min="0" max="2000" step="1" inputmode="numeric"');
          c += inp(i, 'e', 'date', colX(2), y, CW[2], tk.end, `required min="${tk.start}"`);
          c += inp(i, 'p', 'number', colX(3), y, CW[3], tk.pct || 0, 'min="0" max="100" step="5" inputmode="numeric"');
        }
      } else {
        const [cs, cd, ce, ct, cc] = cells[i];
        c += `<text class="cd" x="${colX(0) + 6}" y="${cy + 4}">${cs}</text>`;
        c += `<text class="cd${tk.ms ? ' dim' : ''}" x="${colX(1) + 6}" y="${cy + 4}">${cd}</text>`;
        c += `<text class="cd${tk.ms ? ' dim' : ''}" x="${colX(2) + 6}" y="${cy + 4}">${ce}</text>`;
        c += `<text class="cd ${cc}" x="${colX(3) + 6}" y="${cy + 4}">${esc(ct)}</text>`;
      }
      oL += c + '</g>';
    });

    tops.forEach(m => {
      const ty = 4 + (NLV - 1 - m.lv) * 32;
      o += `<text class="mt" x="${m.x}" y="${ty + 12}" text-anchor="middle">${esc(m.name)}</text><text class="mu" x="${m.x}" y="${ty + 26}" text-anchor="middle">${m.ds}</text>`;
      o += `<path d="M${m.x - 8} ${MS_H - 14}L${m.x + 8} ${MS_H - 14}L${m.x} ${MS_H}Z" fill="#d62828"/>`;
      o += `<rect data-drag="tm" data-k="${m.k}" x="${m.x - 12}" y="${MS_H - 18}" width="24" height="20" fill="transparent"/>`;
    });

    svg.setAttribute('width', W - LW); svg.setAttribute('height', H); svg.setAttribute('viewBox', `${LW} 0 ${W - LW} ${H}`);
    svgL.setAttribute('width', LW); svgL.setAttribute('height', H); svgL.setAttribute('viewBox', `0 0 ${LW} ${H}`);
    svgL.innerHTML = oL; svg.innerHTML = o;
    G = { D0, D1, ppd, CW: inputs ? null : CW };
    box.classList.toggle('cansave', canSave); box.classList.toggle('editing', edit);
    svg.setAttribute('aria-label', d.title[lg]);
    box.querySelectorAll('svg .it').forEach(el => {
      el.onmouseenter = () => box.querySelectorAll(`svg .it[data-i="${el.dataset.i}"]`).forEach(x => x.classList.add('hov'));
      el.onmouseleave = () => box.querySelectorAll('svg .it.hov').forEach(x => x.classList.remove('hov'));
      el.onclick = e => { if (e.target.closest('input') || justDragged) return; pick(+el.dataset.i); };
      if (el.closest('#gantt-svg')) el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(+el.dataset.i); } };
    });
    text();
  }

  function text() {
    const d = cur(), lg = L(), t = T();
    $('#gantt-title').textContent = d.title[lg];
    const ms = [...(d.milestones || [])].sort((a, b) => P(a.date) - P(b.date)), cc = ms.find(m => P(m.date) >= TODAY) || ms[ms.length - 1], left = cc ? P(cc.date) - TODAY : null;
    const nx = rows.map(R => R.t).filter(k => P(k.ms ? k.date : k.start) > TODAY).sort((a, b) => P(a.ms ? a.date : a.start) - P(b.ms ? b.date : b.start))[0];
    $('#gantt-sub').textContent = `${t.today} ${fmt(TODAY)}` + (nx ? ` · ${t.next(nx[lg], P(nx.ms ? nx.date : nx.start) - TODAY)}` : '')
      + (left != null ? ` · ${left >= 0 ? t.left(left, cc[lg]) : t.past}` : '') + ` · ${t.wkNote(t.wk[d.week || 'mf'])}`;
    $('#gantt-x').setAttribute('aria-label', t.close);
    const eb = $('#gantt-edit'); eb.textContent = t.edit; eb.classList.toggle('on', edit); eb.title = edit ? t.editing : ''; eb.hidden = !canSave;
    $('#gantt-leg').innerHTML = `<span>${t.key}:</span>` +
      d.phases.map(p => `<span><i style="background:${p.color}"></i>${esc(p[lg])}</span>`).join('') +
      `<span><i style="background:linear-gradient(90deg,#2a4f99 50%,#3b6fd4 50%)"></i>${t.prog}</span>` +
      `<span><i class="dm" style="background:#d62828"></i>${t.ms}</span><span><i class="tl"></i>${t.today}</span>`;
    $('#gantt-src').textContent = saved?.data ? t.saved(stamp(saved.savedAt), saved.by) : t.src;
    const det = $('#gantt-det'), R = rows[sel];
    if (flashMsg) det.innerHTML = `<b style="color:var(--accent)">✓ ${esc(flashMsg)}</b>`;
    else if (!R) det.textContent = canSave ? t.drag : t.pick;
    else {
      const tk = R.t, where = `${R.ph[lg]} / ${R.g[lg]}`;
      det.innerHTML = tk.ms
        ? `<b>${esc(tk[lg])}</b> · ${esc(where)} · ${t.ms} ${fmt(P(tk.date))} · ${t.cC}: ${esc(cdown(tk)[0])}`
        : `<b>${esc(tk[lg])}</b> · ${esc(where)} · ${fmt(P(tk.start))} – ${fmt(P(tk.end))} · ${tk.dur} ${t.wd} · ${tk.pct || 0}% ${t.done} · ${t.cC}: ${esc(cdown(tk)[0])}`;
    }
    // editor bar
    const ed = $('#gantt-ed'); ed.hidden = !edit;
    if (!edit) return;
    ed.querySelectorAll('[data-e]').forEach(el => el.textContent = t[el.dataset.e]);
    const wk = $('#ge-week'); [...wk.options].forEach(op => op.textContent = t.wk[op.value]); wk.value = d.week || 'mf';
    $('#ge-hist').options[0].textContent = t.histPick;
    $('#ge-save').textContent = t.save; $('#ge-save').disabled = !dirty;
    const cn = $('#ge-cancel'); cn.textContent = discardArm ? t.discard : t.cancel; cn.classList.toggle('warn', discardArm);
    $('#ge-kms').innerHTML = `<b>${t.keyms}:</b>` + ms.map((m, k) =>
      `<label>${esc(m[lg])}<input type="date" id="ge-km-${k}" data-km="${k}" value="${m.date}" required></label>`).join('');
  }

  function msg(s, cls = '') { const m = $('#ge-msg'); m.textContent = s; m.className = 'msg' + (cls ? ' ' + cls : ''); }
  function pick(i) {
    sel = sel === i ? -1 : i;
    box.querySelectorAll('svg .it').forEach(el => el.classList.toggle('sel', +el.dataset.i === sel));
    text();
  }
  // re-render after a change, keeping the keyboard focus on the field the user moved to
  function rerender() {
    setTimeout(() => {
      const id = document.activeElement?.id, sx = body.scrollLeft, sy = body.scrollTop;
      render(); body.scrollLeft = sx; body.scrollTop = sy;
      if (id) { const el = document.getElementById(id); if (el) { el.focus(); if (el.select && el.type === 'number') el.select(); } }
    }, 0);
  }
  function touch(i) { dirty = true; discardArm = false; if (i != null) changed.add(i); msg(T().unsaved); }

  // edits in the left columns
  svgL.addEventListener('change', e => {
    const el = e.target; if (!el.matches('input[data-f]')) return;
    const i = +el.dataset.i, f = el.dataset.f, tk = rows[i]?.t, v = el.value;
    if (!tk) return;
    if (f === 's') {
      if (!v) return rerender();
      if (tk.ms) tk.date = v;
      else { tk.start = v; tk.end = iso(endFrom(P(v), tk.dur)); }
    } else if (f === 'd') {
      const n = Math.max(0, Math.min(2000, Math.round(+v || 0))); tk.dur = n; tk.end = iso(endFrom(P(tk.start), n));
    } else if (f === 'e') {
      if (!v) return rerender();
      const e2 = Math.max(P(v), P(tk.start)); tk.end = iso(e2); tk.dur = workCount(P(tk.start), e2);
    } else if (f === 'p') {
      tk.pct = Math.max(0, Math.min(100, Math.round(+v || 0)));
    }
    touch(i); rerender();
  });
  $('#ge-kms').addEventListener('change', e => {
    const el = e.target; if (!el.matches('input[data-km]') || !el.value) return;
    draft.milestones[+el.dataset.km].date = el.value; touch(); rerender();
  });
  $('#ge-week').onchange = e => {     // new work week: keep each task's days, move its end
    draft.week = e.target.value;
    rowsOf(draft).forEach((R, i) => { const k = R.t; if (!k.ms) { k.end = iso(endFrom(P(k.start), k.dur)); changed.add(i); } });
    touch(); rerender();
  };
  const nameEl = $('#ge-name');
  nameEl.closest('label').hidden = true; // the server records who saved (the signed-in person)

  async function loadHistory() {
    const sel2 = $('#ge-hist'); sel2.length = 1;
    try {
      const list = await fetch(api + '/history', { cache: 'no-store' }).then(r => r.ok ? r.json() : []);
      list.forEach(h => { const op = document.createElement('option'); op.value = h.ver; op.textContent = stamp(h.savedAt) + (h.by ? ' · ' + h.by : ''); sel2.append(op); });
    } catch (e) {}
  }
  $('#ge-hist').onchange = async e => {
    const v = e.target.value; e.target.value = ''; if (!v) return;
    try {
      const rec = await fetch(api + '/history/' + v, { cache: 'no-store' }).then(r => r.json());
      if (!rec?.data) return;
      draft = clone(rec.data); rowsOf(draft).forEach((_, i) => changed.add(i)); touch(); msg(T().loaded(stamp(rec.savedAt))); rerender();
    } catch (err) { msg(T().err, 'bad'); }
  };
  $('#ge-orig').onclick = () => { draft = clone(orig); rowsOf(draft).forEach((_, i) => changed.add(i)); touch(); msg(T().loadedOrig); rerender(); };

  function startEdit(quiet) {
    edit = true; draft = clone(data); dirty = false; discardArm = false; changed.clear(); msg('');
    const sx = body.scrollLeft, sy = body.scrollTop; render(); body.scrollLeft = sx; body.scrollTop = sy; loadHistory();
    if (quiet !== true) setTimeout(() => document.getElementById('ge-0-s')?.focus(), 0);
  }
  function stopEdit() { edit = false; draft = null; dirty = false; discardArm = false; changed.clear(); render(); }
  $('#gantt-edit').onclick = () => { if (edit) $('#ge-save').focus(); else startEdit(); };
  $('#ge-cancel').onclick = () => {
    if (dirty && !discardArm) { discardArm = true; text(); return; }
    stopEdit();
  };
  $('#ge-save').onclick = async () => {
    const t = T(); if (!dirty) return;
    const by = nameEl.value.trim().slice(0, 40);
    msg(t.saving); $('#ge-save').disabled = true;
    try {
      const r = await fetch(api, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'calwwt' },
        body: JSON.stringify({ data: draft, base: saved?.ver || null, by }) });
      if (r.status === 409) {
        const j = await r.json();
        msg(t.conflict(j.current?.savedAt ? stamp(j.current.savedAt) : '?', j.current?.by), 'bad');
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t.loadLatest;
        b.onclick = async () => { const j2 = await fetch(api, { cache: 'no-store' }).then(x => x.json()); saved = j2; data = j2.data || orig; draft = clone(data); dirty = false; changed.clear(); msg(''); render(); loadHistory(); };
        $('#ge-msg').append(' ', b); $('#ge-save').disabled = false; return;
      }
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      saved = { data: draft, ver: j.ver, savedAt: j.savedAt, by: j.by }; data = draft;
      stopEdit(); flash(t.okSaved);
    } catch (e) { msg(t.err, 'bad'); $('#ge-save').disabled = false; }
  };
  let flashMsg = '', flashTo = 0;
  function flash(s) { flashMsg = s; clearTimeout(flashTo); flashTo = setTimeout(() => { flashMsg = ''; text(); }, 6000); text(); }
  addEventListener('beforeunload', e => { if (edit && dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---- drag bars / milestones in the chart (enters edit mode by itself; Save still needed) ----
  const tip = $('#gantt-tip');
  function showTip(ev, txt) {
    const r = box.getBoundingClientRect();
    tip.textContent = txt; tip.hidden = false;
    tip.style.left = Math.max(80, Math.min(r.width - 80, ev.clientX - r.left)) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px';
  }
  function tipText(dr) {
    const t = T(), d = draft;
    if (dr.kind === 'tm') { const m = d.milestones[dr.k]; return `${m[L()]} · ${fmt(P(m.date))}`; }
    const tk = rowsOf(d)[dr.i].t;
    if (tk.ms) return `${tk[L()]} · ${fmt(P(tk.date))}`;
    return `${fmt(P(tk.start), false)} – ${fmt(P(tk.end))} · ${tk.dur} ${t.d}`;
  }
  svg.addEventListener('pointerdown', ev => {
    const h = ev.target.closest('[data-drag]');
    if (!h || !canSave || ev.button !== 0) return;
    if (!edit && ev.pointerType === 'touch') return;          // phones: swipe scrolls; use Edit dates first
    ev.preventDefault();
    const kind = h.dataset.drag, i = h.dataset.i != null ? +h.dataset.i : null, k = h.dataset.k != null ? +h.dataset.k : null;
    const d = cur(), tk = i != null ? rowsOf(d)[i].t : null;
    drag = { kind, i, k, x0: ev.clientX, dd: 0, moved: false, pending: !edit, fromView: !edit, CW: G.CW, D0: G.D0, D1: G.D1, ppd: G.ppd, id: ev.pointerId,
      s0: tk ? P(tk.ms ? tk.date : tk.start) : null, e0: tk && !tk.ms ? P(tk.end) : null,
      dur: tk && !tk.ms ? workCount(P(tk.start), P(tk.end)) : null,   // a move keeps the bar's own working days
      m0: k != null ? P(d.milestones[k].date) : null, snap: edit ? JSON.stringify(d) : null };
    svg.setPointerCapture(ev.pointerId);
    if (edit) { box.classList.add('dragging'); box.classList.toggle('dragedge', kind === 'l' || kind === 'r'); showTip(ev, tipText(drag)); }
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (Math.abs(ev.clientX - drag.x0) > 3) drag.moved = true;
    if (drag.pending) {                    // view mode: start editing once the bar really moves
      if (!drag.moved) return;
      drag.pending = false; startEdit(true); drag.snap = JSON.stringify(draft);
      box.classList.add('dragging'); box.classList.toggle('dragedge', drag.kind === 'l' || drag.kind === 'r');
    }
    const dd = Math.round((ev.clientX - drag.x0) / drag.ppd);
    if (dd !== drag.dd) {
      drag.dd = dd;
      const d = draft;
      if (drag.kind === 'tm') d.milestones[drag.k].date = iso(drag.m0 + dd);
      else {
        const tk = rowsOf(d)[drag.i].t;
        if (drag.kind === 'ms') tk.date = iso(drag.s0 + dd);
        else if (drag.kind === 'm') { const s1 = drag.s0 + dd; tk.start = iso(s1); tk.end = iso(endFrom(s1, drag.dur)); tk.dur = drag.dur; }
        else if (drag.kind === 'r') { const e1 = Math.max(drag.s0, drag.e0 + dd); tk.end = iso(e1); tk.dur = workCount(drag.s0, e1); }
        else if (drag.kind === 'l') { const s1 = Math.min(drag.e0, drag.s0 + dd); tk.start = iso(s1); tk.dur = workCount(s1, drag.e0); }
      }
      const sx = body.scrollLeft, sy = body.scrollTop; render(); body.scrollLeft = sx; body.scrollTop = sy;
    }
    showTip(ev, tipText(drag));
  });
  function endDrag(ev, cancel) {
    if (!drag) return;
    try { svg.releasePointerCapture(drag.id); } catch (e) {}
    const dr = drag; drag = null; tip.hidden = true; box.classList.remove('dragging', 'dragedge');
    if (dr.pending) return;                // plain click in view mode: the click handler selects it
    if (cancel) { draft = JSON.parse(dr.snap); }
    else if (dr.dd !== 0) { touch(dr.i); }
    if (dr.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); }
    const sx = body.scrollLeft, sy = body.scrollTop; render(); body.scrollLeft = sx; body.scrollTop = sy;
  }
  svg.addEventListener('pointerup', ev => endDrag(ev, false));
  svg.addEventListener('pointercancel', ev => endDrag(ev, true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drag) { e.stopPropagation(); endDrag(e, true); } }, true);

  function setTab(which) {
    const on = which === 'time';
    if (!on) { lastView = which; onView?.(which); }
    box.hidden = !on;
    if (on) { const s = document.getElementById('sect'); if (s) s.hidden = true; render(); }
    tabs.querySelectorAll('button').forEach(b => { const a = b.dataset.tab === which; b.classList.toggle('on', a); b.setAttribute('aria-selected', a); });
    try { history.replaceState(null, '', on ? '#timeline' : which !== viewIds[0] ? '#' + which : location.pathname + location.search); } catch (e) {}
  }
  function relang() {
    tabs.querySelectorAll('button').forEach(b => b.textContent = views?.find(v => v.id === b.dataset.tab)?.[L()] || (b.dataset.tab === 'model' && modelTab?.[L()]) || T()[b.dataset.tab]);
    if (!box.hidden) render();
  }

  tabs.querySelectorAll('button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#gantt-x').onclick = () => setTab(lastView);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden && !edit && !onlyTimeline) setTab(lastView); });
  new MutationObserver(relang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  new ResizeObserver(() => { if (!box.hidden && !box.contains(document.activeElement?.closest?.('foreignObject') || null)) render(); }).observe(body);
  document.fonts?.ready.then(() => { if (!box.hidden) render(); });
  relang();
  setTab(onlyTimeline || location.hash === '#timeline' ? 'time' : viewIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : viewIds[0]);
  if (onlyTimeline) { tabs.hidden = true; $('#gantt-x').hidden = true; }
  addEventListener('hashchange', () => { if (location.hash === '#timeline' && box.hidden) setTab('time'); else if (viewIds.length > 1 && viewIds.includes(location.hash.slice(1)) && (location.hash.slice(1) !== lastView || !box.hidden)) setTab(location.hash.slice(1)); });
  window.calwwtGantt = { open: () => setTab('time'), close: () => setTab(lastView), view: (id) => { if (viewIds.includes(id)) setTab(id); }, edit: () => { setTab('time'); startEdit(); } };
  return window.calwwtGantt;
}
