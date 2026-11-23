// Meetings tab (/meetings/): SPP–Caltex weekly meeting (Wednesdays) and one-off meetings. Data and permissions:
// /api/meetings (src/meetings.mjs). Action items become Tasks through the task API (/api/tasks/tasks), with its own rules.
import { el, me as getMe, lang as langOf, status, fmtDate } from '/__nav/trackers.mjs';
import { ask, confirmBox } from '/__nav/ask.mjs';

const W = {
  th: {
    title: 'ประชุม', sub: 'ประชุมประจำสัปดาห์ SPP–Caltex ทุกวันพุธ และการประชุมอื่น ๆ · เพิ่มวาระล่วงหน้าได้ทุกคน',
    newMeeting: 'เพิ่มการประชุม', upcoming: 'กำลังจะมาถึง', past: 'ที่ผ่านมา', weekly: 'ประจำสัปดาห์', print: 'พิมพ์',
    date: 'วันที่', time: 'เวลา', place: 'สถานที่ / ลิงก์ประชุม', attendees: 'ผู้เข้าร่วม', saveDetails: 'บันทึกรายละเอียด', mtTitle: 'ชื่อการประชุม',
    agenda: 'วาระการประชุม', agendaHint: 'เพิ่มหัวข้อล่วงหน้าได้ แล้วจดบันทึกใต้แต่ละหัวข้อระหว่างประชุม', addAgenda: 'เพิ่มวาระ', agendaPh: 'หัวข้อที่อยากคุย…', notesPh: 'บันทึกการประชุมสำหรับหัวข้อนี้…',
    actions: 'สิ่งที่ต้องทำต่อ', addAction: 'เพิ่มรายการ', actionPh: 'ต้องทำอะไร…', owner: 'ผู้รับผิดชอบ', due: 'กำหนดเสร็จ', makeTask: 'สร้างเป็นงาน', taskLink: 'งาน {id}',
    spp: 'บันทึกเฉพาะ SPP (Caltex มองไม่เห็น)', sppPh: 'ประเด็นภายในที่จะคุยก่อนหรือหลังประชุม…', addNote: 'เพิ่มบันทึก',
    history: 'ประวัติการแก้ไข', addedBy: 'เพิ่มโดย {by}', editedBy: 'แก้ไขล่าสุดโดย {by}', del: 'ลบ', delAsk: 'ลบรายการนี้?', edit: 'แก้ไข', save: 'บันทึก', cancel: 'ยกเลิก',
    none: 'ยังไม่มี', noOwner: '— ยังไม่ระบุ —', viewOnly: 'ดูอย่างเดียว', saved: 'บันทึกแล้ว', failed: 'โหลดข้อมูลไม่ได้', newTitlePh: 'เช่น ประชุมหน้างานกับ Caltex',
    taskMade: 'สร้างงาน {id} แล้ว', requestMade: 'ส่งคำขอ {id} ถึง {name} แล้ว (มีงานติดตามสำหรับคุณ)', onePartner: 'หนึ่งบรรทัดส่งถึงคนนอก SPP ได้หนึ่งคน กรุณาแยกเป็นบรรทัดละคน', counts: '{a} วาระ · {o} งานค้าง', needOwner: 'เลือกผู้รับผิดชอบก่อนสร้างเป็นงาน', fromMeeting: 'จากการประชุม: {t} ({d})', unsaved: 'ยังไม่ได้บันทึก',
    page: 'บันทึกการประชุม', pageHint: 'ทุกคนพิมพ์พร้อมกันได้ บันทึกอัตโนมัติ', pagePh: 'พิมพ์วาระและบันทึกการประชุมที่นี่… ใช้ "- " เพื่อทำรายการ, "1. " เพื่อใส่เลข, "[ ] " เพื่อทำช่องติ๊ก',
    sppPage: 'บันทึกเฉพาะ SPP (Caltex มองไม่เห็น)', sppPagePh: 'ประเด็นภายในที่จะคุยก่อนหรือหลังประชุม…',
    live: 'ออนไลน์ · บันทึกแล้ว', connecting: 'กำลังเชื่อมต่อ…', offline: 'ออฟไลน์ ข้อความที่พิมพ์จะส่งเมื่อกลับมาออนไลน์', denied: 'เปิดหน้านี้ไม่ได้ กรุณาโหลดหน้าใหม่', full: 'หน้านี้ยาวเกินไปแล้ว ไม่สามารถเพิ่มได้อีก กรุณาเริ่มหน้าใหม่ (การประชุมใหม่)', toobig: 'สิ่งที่วางใหญ่เกินไป จึงยังไม่ได้บันทึก กรุณาโหลดหน้าใหม่ แล้ววางทีละส่วน',
    here: 'กำลังดู: {names}', earlier: 'รายการเดิม (ก่อนมีหน้าบันทึกออนไลน์)', makeTaskHere: 'สร้างงานจากบรรทัดนี้', inTaskLine: 'วางเคอร์เซอร์ในบรรทัดช่องติ๊ก (☐) ก่อน แล้วกด สร้างงาน',
    alreadyTask: 'บรรทัดนี้เป็นงาน {id} แล้ว', taskMine: 'สร้างงาน {id} แล้ว (มอบหมายให้คุณ พิมพ์ @ชื่อ ในบรรทัดเพื่อมอบหมายคนอื่น)', lastSaved: 'บันทึกล่าสุด {at} · {by}',
    tb: { bold: 'ตัวหนา (Ctrl+B)', italic: 'ตัวเอียง (Ctrl+I)', underline: 'ขีดเส้นใต้ (Ctrl+U)', strike: 'ขีดฆ่า', h: 'หัวข้อ', bullet: 'รายการจุด', ordered: 'รายการตัวเลข', task: 'ช่องติ๊ก', indent: 'เยื้องเข้า (Tab)', outdent: 'เยื้องออก (Shift+Tab)', mark: 'ไฮไลต์', link: 'ลิงก์', table: 'ตาราง', undo: 'เลิกทำ', redo: 'ทำซ้ำ' },
    linkAsk: 'ที่อยู่ลิงก์ (เว้นว่างเพื่อเอาลิงก์ออก)', notesAt: 'บันทึก {at}',
  },
  en: {
    title: 'Meetings', sub: 'SPP–Caltex weekly meeting every Wednesday, and other meetings. Anyone can add agenda items in advance.',
    newMeeting: 'New meeting', upcoming: 'Upcoming', past: 'Past', weekly: 'Weekly', print: 'Print',
    date: 'Date', time: 'Time', place: 'Place / meeting link', attendees: 'Attendees', saveDetails: 'Save details', mtTitle: 'Meeting title',
    agenda: 'Agenda', agendaHint: 'Add topics in advance, then take notes under each one during the meeting.', addAgenda: 'Add item', agendaPh: 'Topic to discuss…', notesPh: 'Meeting notes for this item…',
    actions: 'Action items', addAction: 'Add action', actionPh: 'What needs doing…', owner: 'Owner', due: 'Due', makeTask: 'Make it a task', taskLink: 'Task {id}',
    spp: 'SPP-only notes (Caltex cannot see these)', sppPh: 'Internal points to raise before or after the meeting…', addNote: 'Add note',
    history: 'Change history', addedBy: 'added by {by}', editedBy: 'last edited by {by}', del: 'Delete', delAsk: 'Delete this item?', edit: 'Edit', save: 'Save', cancel: 'Cancel',
    none: 'Nothing yet.', noOwner: '— not set —', viewOnly: 'View only', saved: 'Saved.', failed: 'Could not load', newTitlePh: 'e.g. Site meeting with Caltex',
    taskMade: 'Task {id} created.', requestMade: 'Request {id} sent to {name} (follow-up task for you).', onePartner: 'A line can go to one person outside SPP. Split it into one line per person.', counts: '{a} agenda · {o} open actions', needOwner: 'Choose an owner before making it a task.', fromMeeting: 'From the meeting: {t} ({d})', unsaved: 'not saved yet',
    page: 'Meeting notes', pageHint: 'Everyone can type at the same time. Saved automatically.', pagePh: 'Type the agenda and notes here… Start a line with "- " for bullets, "1. " for numbers, "[ ] " for a checkbox.',
    sppPage: 'SPP-only notes (Caltex cannot see these)', sppPagePh: 'Internal points to raise before or after the meeting…',
    live: 'Live · saved', connecting: 'Connecting…', offline: 'Offline. What you type is sent when the connection is back.', denied: 'This page could not be opened. Reload the page.', full: 'This page is too large to add more. Please start a new meeting page.', toobig: 'That paste was too large and was not saved. Reload the page and paste it in smaller parts.',
    here: 'Here now: {names}', earlier: 'Earlier items (before the live page)', makeTaskHere: 'Make task', inTaskLine: 'Put the cursor in a checkbox line (☐) first, then press Make task.',
    alreadyTask: 'This line is already task {id}.', taskMine: 'Task {id} created (assigned to you; type @name in the line to assign someone else).', lastSaved: 'Last saved {at} · {by}',
    tb: { bold: 'Bold (Ctrl+B)', italic: 'Italic (Ctrl+I)', underline: 'Underline (Ctrl+U)', strike: 'Strikethrough', h: 'Heading', bullet: 'Bullet list', ordered: 'Numbered list', task: 'Checkbox list', indent: 'Indent (Tab)', outdent: 'Outdent (Shift+Tab)', mark: 'Highlight', link: 'Link', table: 'Table', undo: 'Undo', redo: 'Redo' },
    linkAsk: 'Link address (leave empty to remove the link)', notesAt: 'notes {at}',
  },
};
let L = 'th', w = W.th, list = null, cur = null, people = [], contacts = [], tasks = new Map(), dirty = false, me0 = null, editors = [];
const $ = (id) => document.getElementById(id);
const t = (k, v = {}) => w[k].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const weekday = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(L === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
async function api(path, opts = {}, kind = 'meetings') {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts, headers: { 'X-Requested-With': kind, ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || b.message || `HTTP ${r.status}`);
  return b;
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
const say = (msg, kind) => status($('status'), msg, kind);

async function loadList() {
  list = await api('/api/meetings');
  const hash = decodeURIComponent(location.hash.slice(1));
  const upcoming = list.meetings.filter((m) => m.date >= list.today).sort((a, b) => a.date.localeCompare(b.date));
  const pick = list.meetings.find((m) => m.id === hash) || upcoming[0] || list.meetings[0];
  renderList(pick?.id);
  if (pick) await open(pick.id);
}
// Under each meeting: when its live page was last saved (or the old counts, for meetings from before the live page).
const listNote = (m) => (m.page_at ? t('notesAt', { at: new Date(m.page_at).toLocaleString(L === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) })
  : m.agenda || m.open_actions ? t('counts', { a: m.agenda, o: m.open_actions }) : '');
function renderList(active) {
  const up = list.meetings.filter((m) => m.date >= list.today).sort((a, b) => a.date.localeCompare(b.date));
  const past = list.meetings.filter((m) => m.date < list.today);
  const link = (m) => el('a', { href: `#${encodeURIComponent(m.id)}`, 'aria-current': m.id === active ? 'page' : null, onclick: async (e) => { e.preventDefault(); if (dirty && !(await confirmBox(t('unsaved')))) return; history.replaceState(null, '', `#${encodeURIComponent(m.id)}`); renderList(m.id); open(m.id); } },
    m.series ? `${t('weekly')} · ${weekday(m.date)}` : m.title, el('small', {}, [m.series ? null : weekday(m.date), listNote(m)].filter(Boolean).join(' · ') || '\u00a0'));
  $('list').replaceChildren(el('h3', {}, t('upcoming')), ...up.map(link), el('h3', {}, t('past')), ...(past.length ? past.map(link) : [el('p', { class: 'mt-empty' }, t('none'))]));
}

async function open(id) {
  try { cur = await api(`/api/meetings/${encodeURIComponent(id)}`); } catch (e) { say(`${t('failed')} (${e.message})`, 'bad'); return; }
  dirty = false; render();
}
const editable = () => cur?.canEdit;
function render() {
  const m = cur.meeting, d = $('detail');
  const meta = (k, v, type = 'text', max = 160) => {
    const input = el('input', { type, value: v || '', maxlength: String(max), disabled: !editable() || (k === 'date' && m.series) ? true : null, 'data-k': k });
    input.addEventListener('input', () => { dirty = true; });
    return input;
  };
  const fields = { title: meta('title', m.title), date: meta('date', m.date, 'date'), time: meta('time', m.time, 'text', 40), place: meta('place', m.place), attendees: meta('attendees', m.attendees, 'text', 1000) };
  const head = el('section', { class: 'tk-card' },
    el('h2', {}, m.series ? `${m.title} · ${weekday(m.date)}` : m.title, el('small', {}, m.series ? t('weekly') : weekday(m.date))),
    el('div', { class: 'mt-meta' },
      m.series ? null : el('label', {}, t('mtTitle'), fields.title),
      el('label', {}, t('date'), fields.date), el('label', {}, t('time'), fields.time), el('label', {}, t('place'), fields.place),
      el('label', { style: 'grid-column:1/-1' }, t('attendees'), fields.attendees)),
    editable() ? el('div', { class: 'mt-add' }, el('button', { type: 'button', class: 'btn', onclick: async () => {
      try { await post(`/api/meetings/${encodeURIComponent(m.id)}`, Object.fromEntries(Object.entries(fields).filter(([k]) => !(m.series && (k === 'date' || k === 'title'))).map(([k, n]) => [k, n.value]))); dirty = false; say(t('saved'), 'ok'); await loadList(); }
      catch (e) { say(e.message, 'bad'); }
    } }, t('saveDetails'))) : null);
  const items = (kind) => cur.items.filter((i) => i.kind === kind);
  for (const x of editors) x.destroy(); editors = [];
  if (!cur.live) { d.replaceChildren(head, agendaCard(items('agenda')), actionsCard(items('action')), ...(cur.spp ? [sppCard(items('spp_note'))] : []), historyCard()); return; }
  // Live page (Loop-style): everyone types in the same page at the same time; no Add buttons, no refresh.
  const earlier = cur.items.length ? el('details', { class: 'tk-card' }, el('summary', { style: 'padding:10px 14px;cursor:pointer;font-weight:600' }, t('earlier')),
    agendaCard(items('agenda')), actionsCard(items('action')), ...(cur.spp ? [sppCard(items('spp_note'))] : [])) : null;
  d.replaceChildren(...[head, livePage('shared'), ...(cur.spp ? [livePage('spp')] : []), earlier, historyCard()].filter(Boolean));
}

/* ---------- live page ---------- */
const COLORS = ['#1F77B4', '#D62728', '#2CA02C', '#9467BD', '#E377C2', '#8C564B', '#17BECF', '#BCBD22', '#FF7F0E'];
const colorOf = (s) => COLORS[[...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
let editorLib = null;
function livePage(part) {
  const m = cur.meeting, box = el('div', { class: 'mt-page' }), state = el('span', { class: 'mt-live', 'data-state': 'connecting' }, t('connecting'));
  const who = el('span', { class: 'mt-who' }), bar = el('div', { class: 'mt-toolbar', role: 'toolbar', 'aria-label': t('page') });
  const saved = cur.docs?.find((x) => x.part === part);
  const card = el('section', { class: `tk-card${part === 'spp' ? ' mt-spp' : ''}` },
    el('h2', {}, part === 'spp' ? t('sppPage') : t('page'), el('small', {}, t('pageHint'))),
    el('div', { class: 'mt-livebar' }, state, who, saved ? el('small', { class: 'mt-saved' }, t('lastSaved', { at: new Date(saved.at).toLocaleString(L === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }), by: saved.by.join(', ') })) : null),
    editable() ? bar : null, box);
  (async () => {
    editorLib ||= await import('/meetings/vendor/editor.mjs');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/meetings/${encodeURIComponent(m.id)}/live?part=${part}`;
    const x = editorLib.createMeetingEditor({
      element: box, url, editable: editable(), placeholder: part === 'spp' ? t('sppPagePh') : t('pagePh'),
      user: { name: me0?.name || me0?.localUsername || '?', color: colorOf(me0?.person || me0?.name || '') },
      onStatus: (s) => { state.dataset.state = s; state.textContent = t(s === 'connected' ? 'live' : s); },
      onChange: () => paintToolbar(),
    });
    editors.push(x);
    const showWho = () => { const names = [...x.provider.awareness.getStates().values()].map((v) => v.user?.name).filter(Boolean); who.textContent = names.length ? t('here', { names: [...new Set(names)].join(', ') }) : ''; };
    x.provider.awareness.on('change', showWho);
    const ed = x.editor, B = (key, label, run, active) => { const b = el('button', { type: 'button', class: 'btn sm', title: w.tb[key] || label, 'aria-label': w.tb[key] || label, onmousedown: (e) => e.preventDefault(), onclick: () => run(ed.chain().focus()).run() }, label); b._active = active; return b; };
    const buttons = [
      B('bold', 'B', (c) => c.toggleBold(), () => ed.isActive('bold')), B('italic', 'I', (c) => c.toggleItalic(), () => ed.isActive('italic')),
      B('underline', 'U', (c) => c.toggleUnderline(), () => ed.isActive('underline')), B('strike', 'S', (c) => c.toggleStrike(), () => ed.isActive('strike')),
      B('h', 'H', (c) => c.toggleHeading({ level: 3 }), () => ed.isActive('heading')),
      B('bullet', '•', (c) => c.toggleBulletList(), () => ed.isActive('bulletList')), B('ordered', '1.', (c) => c.toggleOrderedList(), () => ed.isActive('orderedList')),
      B('task', '☐', (c) => c.toggleTaskList(), () => ed.isActive('taskList')),
      B('outdent', '⇤', (c) => (ed.isActive('taskItem') ? c.liftListItem('taskItem') : c.liftListItem('listItem'))),
      B('indent', '⇥', (c) => (ed.isActive('taskItem') ? c.sinkListItem('taskItem') : c.sinkListItem('listItem'))),
      B('mark', '▍', (c) => c.toggleHighlight(), () => ed.isActive('highlight')),
      (() => { const b = el('button', { type: 'button', class: 'btn sm', title: w.tb.link, 'aria-label': w.tb.link, onmousedown: (e) => e.preventDefault(), onclick: async () => {
        const r0 = await ask({ title: w.tb.link, fields: [{ name: 'href', label: t('linkAsk'), value: ed.getAttributes('link').href || 'https://' }] });
        if (r0 === null) return;
        const href = r0.href.trim(), c = ed.chain().focus().extendMarkRange('link');
        (href && href !== 'https://' ? c.setLink({ href }) : c.unsetLink()).run();
      } }, '🔗'); b._active = () => ed.isActive('link'); return b; })(),
      B('table', '▦', (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
      B('undo', '↶', (c) => c.undo()), B('redo', '↷', (c) => c.redo()),
    ];
    const taskBtn = el('button', { type: 'button', class: 'btn sm primary', onmousedown: (e) => e.preventDefault(), onclick: () => makeTaskFromLine(ed) }, t('makeTaskHere'));
    bar.replaceChildren(...buttons, el('span', { class: 'mt-tb-gap' }), taskBtn);
    function paintToolbar() { for (const b of buttons) if (b._active) b.classList.toggle('on', !!b._active()); }
  })().catch((e) => { state.dataset.state = 'denied'; state.textContent = `${t('denied')} (${e.message})`; });
  return card;
}
/** "☐ Fix gate @Por due 10/11" → a Task assigned to Por, due 10 Nov; the line then shows the task number. */
async function makeTaskFromLine(ed) {
  const { $from } = ed.state.selection;
  let node = null;
  for (let dpt = $from.depth; dpt > 0; dpt--) if ($from.node(dpt).type.name === 'taskItem') { node = $from.node(dpt); break; }
  if (!node) { say(t('inTaskLine'), 'bad'); return; }
  if (node.attrs.taskId) { say(t('alreadyTask', { id: node.attrs.taskId }), 'bad'); return; }
  const line = (node.firstChild?.textContent || '').trim();
  if (!line) { say(t('inTaskLine'), 'bad'); return; }
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
  const named = [...line.matchAll(/@([^\s@,;]+)/g)].map((mm) => [...people, ...contacts].find((p) => norm(p.name) === norm(mm[1]) || (p.aliases || []).some((a) => norm(a) === norm(mm[1]))) ).filter(Boolean);
  const assignees = named.filter((p) => p.canAssign).map((p) => p.id);
  // A line that names someone outside SPP (Caltex, KS…) becomes a request to them, with a follow-up task for you
  // (Brian, 3 Nov 2026: half the actions from an SPP–Caltex meeting are Caltex's).
  const partners = [...new Map(named.filter((p) => !p.canAssign).map((p) => [p.id, p])).values()];
  let due = null; const dm = /(\d{4}-\d{2}-\d{2})|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(line);
  if (dm) { if (dm[1]) due = dm[1]; else { const y = dm[4] ? (dm[4].length === 2 ? 2000 + Number(dm[4]) : Number(dm[4]) > 2400 ? Number(dm[4]) - 543 : Number(dm[4])) : Number(list.today.slice(0, 4)); due = `${y}-${String(dm[3]).padStart(2, '0')}-${String(dm[2]).padStart(2, '0')}`; if (Number.isNaN(Date.parse(due))) due = null; } }
  const title = line.replace(/@[^\s@,;]+/g, '').replace(/\b(due|กำหนด)\b/gi, '').replace(dm?.[0] || '\u0000', '').replace(/\s{2,}/g, ' ').trim().slice(0, 200) || line.slice(0, 200);
  if (partners.length > 1) { say(t('onePartner'), 'bad'); return; }
  try {
    const m = cur.meeting;
    if (partners.length) {
      const q = await api('/api/tasks/requests', { method: 'POST', body: JSON.stringify({ recipient: partners[0].id, title, message: t('fromMeeting', { t: m.title, d: m.date }), ...(due ? { due } : {}) }) }, 'tasks');
      ed.chain().focus().updateAttributes('taskItem', { taskId: q.id }).run();
      say(t('requestMade', { id: q.id, name: partners[0].name }), 'ok'); loadPeople();
      return;
    }
    const r = await api('/api/tasks/tasks', { method: 'POST', body: JSON.stringify({ title, description: t('fromMeeting', { t: m.title, d: m.date }), assignees: [...new Set(assignees)], ...(due ? { due } : {}) }) }, 'tasks');
    ed.chain().focus().updateAttributes('taskItem', { taskId: r.id }).run();
    say(assignees.length ? t('taskMade', { id: r.id }) : t('taskMine', { id: r.id }), 'ok'); loadPeople();
  } catch (e) { say(e.message, 'bad'); }
}

function itemControls(i) {
  if (!editable()) return [];
  return [el('button', { type: 'button', class: 'btn sm', onclick: () => editText(i) }, t('edit')),
    el('button', { type: 'button', class: 'btn sm danger', onclick: async () => { if (!(await confirmBox(t('delAsk'), { danger: true }))) return; try { await post(`/api/meetings/${encodeURIComponent(cur.meeting.id)}/items/${i.id}/delete`, {}); await open(cur.meeting.id); loadList(); } catch (e) { say(e.message, 'bad'); } } }, t('del'))];
}
async function editText(i) {
  const v = (await ask({ title: t('edit'), fields: [{ name: 'v', label: t('edit'), value: i.text, maxlength: 2000 }] }))?.v;
  if (v == null || !v.trim() || v === i.text) return;
  try { await post(`/api/meetings/${encodeURIComponent(cur.meeting.id)}/items/${i.id}`, { text: v }); await open(cur.meeting.id); } catch (e) { say(e.message, 'bad'); }
}
function addRow(kind, placeholder, label, extra = () => ({})) {
  if (!editable()) return null;
  const input = el('input', { type: 'text', placeholder, maxlength: '2000' });
  const add = async () => {
    if (!input.value.trim()) return;
    try { await post(`/api/meetings/${encodeURIComponent(cur.meeting.id)}/items`, { kind, text: input.value, ...extra() }); input.value = ''; await open(cur.meeting.id); loadList(); }
    catch (e) { say(e.message, 'bad'); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  return el('div', { class: 'mt-add' }, input, el('button', { type: 'button', class: 'btn primary', onclick: add }, label));
}
function agendaCard(rows) {
  return el('section', { class: 'tk-card' }, el('h2', {}, t('agenda'), el('small', {}, t('agendaHint'))),
    rows.length ? el('ol', { class: 'mt-items' }, rows.map((i, n) => {
      const notes = el('textarea', { placeholder: t('notesPh'), maxlength: '8000', disabled: !editable() ? true : null });
      notes.value = i.notes || '';
      notes.addEventListener('input', () => { dirty = true; });
      notes.addEventListener('change', async () => { try { await post(`/api/meetings/${encodeURIComponent(cur.meeting.id)}/items/${i.id}`, { notes: notes.value }); dirty = false; say(t('saved'), 'ok'); } catch (e) { say(e.message, 'bad'); } });
      return el('li', {}, el('div', { class: 'mt-item-head' }, el('span', { class: 'num' }, `${n + 1}.`), el('span', { class: 'txt' }, i.text), ...itemControls(i)),
        el('div', { class: 'mt-item-meta' }, t('addedBy', { by: i.by }), i.updatedBy && i.updatedAt !== i.at ? ` · ${t('editedBy', { by: i.updatedBy })}` : ''),
        (editable() || i.notes) ? notes : null);
    })) : el('p', { class: 'mt-empty' }, t('none')),
    addRow('agenda', t('agendaPh'), t('addAgenda')));
}
function ownerSelect(i) {
  const s = el('select', { disabled: !editable() ? true : null, 'aria-label': t('owner') }, el('option', { value: '' }, t('noOwner')), people.map((p) => el('option', { value: p.id }, p.name)));
  if (i?.ownerId && !people.some((p) => p.id === i.ownerId)) s.append(el('option', { value: i.ownerId }, i.owner || i.ownerId));
  s.value = i?.ownerId || '';
  return s;
}
function actionsCard(rows) {
  const newOwner = ownerSelect(null), newDue = el('input', { type: 'date', 'aria-label': t('due') });
  const add = addRow('action', t('actionPh'), t('addAction'), () => ({ ownerId: newOwner.value || null, due: newDue.value || null }));
  if (add) add.insertBefore(el('span', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, newOwner, newDue), add.lastChild);
  return el('section', { class: 'tk-card' }, el('h2', {}, t('actions')),
    rows.length ? el('ul', { class: 'mt-items' }, rows.map((i) => {
      const owner = ownerSelect(i), due = el('input', { type: 'date', value: i.due || '', disabled: !editable() ? true : null, 'aria-label': t('due') });
      const save = (patch) => post(`/api/meetings/${encodeURIComponent(cur.meeting.id)}/items/${i.id}`, patch).then(() => open(cur.meeting.id)).catch((e) => say(e.message, 'bad'));
      owner.addEventListener('change', () => save({ ownerId: owner.value || null }));
      due.addEventListener('change', () => save({ due: due.value || null }));
      const done = el('input', { type: 'checkbox', disabled: !editable() ? true : null, 'aria-label': 'done' }); done.checked = i.done;
      done.addEventListener('change', () => save({ done: done.checked }));
      const task = i.taskId ? el('a', { href: '/tasks.html', class: 'btn sm' }, `${t('taskLink', { id: i.taskId })}${tasks.get(i.taskId) ? ` · ${tasks.get(i.taskId)}` : ''}`)
        : editable() ? el('button', { type: 'button', class: 'btn sm', onclick: () => makeTask(i) }, t('makeTask')) : null;
      return el('li', {}, el('div', { class: `mt-action${i.done ? ' done' : ''}` },
        el('span', { class: 'txt' }, done, ' ', i.text), owner, due, el('span', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, task, ...itemControls(i))),
        el('div', { class: 'mt-item-meta', style: 'margin-left:0' }, t('addedBy', { by: i.by })));
    })) : el('p', { class: 'mt-empty' }, t('none')), add);
}
async function makeTask(i) {
  if (!i.ownerId) { say(t('needOwner'), 'bad'); return; }
  try {
    const m = cur.meeting;
    const r = await api('/api/tasks/tasks', { method: 'POST', body: JSON.stringify({ title: i.text.slice(0, 200), description: t('fromMeeting', { t: m.title, d: m.date }), assignees: [i.ownerId], ...(i.due ? { due_date: i.due } : {}) }) }, 'tasks');
    await post(`/api/meetings/${encodeURIComponent(m.id)}/items/${i.id}`, { taskId: r.id });
    say(t('taskMade', { id: r.id }), 'ok'); await loadPeople(); await open(m.id);
  } catch (e) { say(e.message, 'bad'); }
}
function sppCard(rows) {
  return el('section', { class: 'tk-card mt-spp' }, el('h2', {}, t('spp')),
    rows.length ? el('ul', { class: 'mt-items' }, rows.map((i) => el('li', {}, el('div', { class: 'mt-item-head' }, el('span', { class: 'txt' }, i.text), ...itemControls(i)), el('div', { class: 'mt-item-meta', style: 'margin-left:0' }, t('addedBy', { by: i.by }))))) : el('p', { class: 'mt-empty' }, t('none')),
    addRow('spp_note', t('sppPh'), t('addNote')));
}
function historyCard() {
  const words = { create: '+', update: '✎', delete: '×' };
  return el('details', { class: 'tk-card mt-hist-card' }, el('summary', { style: 'padding:10px 14px;cursor:pointer;font-weight:600' }, t('history')),
    el('ul', { class: 'mt-hist' }, cur.history.map((h) => el('li', {}, `${new Date(h.at).toLocaleString(L === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })} · ${h.by} · ${h.action.replace(/:(\w+)$/, (_, a) => ` ${words[a] || a}`)}`))));
}

async function newMeeting() {
  // One box with a calendar for the date (no typed YYYY-MM-DD).
  const r0 = await ask({ title: t('newMeeting'), fields: [{ name: 'title', label: t('mtTitle'), value: t('newTitlePh'), required: true, maxlength: 160 }, { name: 'date', label: t('date'), type: 'date', value: list.today, required: true }] });
  if (!r0) return;
  const { title, date } = r0;
  if (!title.trim() || !date) return;
  try { const r = await post('/api/meetings', { title, date }); history.replaceState(null, '', `#${encodeURIComponent(r.id)}`); await loadList(); }
  catch (e) { say(e.message, 'bad'); }
}
async function loadPeople() {
  try {
    const st = await api('/api/tasks/state', {}, 'tasks');
    people = (st.people || []).filter((p) => p.id && p.canAssign).sort((a, b) => a.name.localeCompare(b.name));
    contacts = (st.people || []).filter((p) => p.id && !p.canAssign && p.canRequest); // outside SPP: they get requests
    tasks = new Map((st.tasks || []).map((x) => [x.id, x.status]));
  } catch { people = []; }
}

const m0 = await getMe(); me0 = m0;
L = langOf(m0); w = W[L]; document.documentElement.lang = L;
$('title').textContent = t('title'); $('sub').textContent = t('sub');
await loadPeople();
try { await loadList(); } catch (e) { say(`${t('failed')} (${e.message})`, 'bad'); }
$('actions').replaceChildren(el('button', { type: 'button', class: 'btn', onclick: () => print() }, t('print')), ' ',
  ...(list?.canEdit ? [el('button', { type: 'button', class: 'btn primary', onclick: newMeeting }, t('newMeeting'))] : list ? [el('span', { class: 'chip' }, t('viewOnly'))] : []));
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
// Others' changes appear without reloading (skipped while you are typing).
setInterval(() => { if (cur && !cur.live && !dirty && !document.activeElement?.matches?.('input,textarea,select')) open(cur.meeting.id); }, 30000);
