// Thai / English text for the task app. English is the source text and the lookup key:
// L('Board') gives 'บอร์ด' in Thai and 'Board' in English. {name} style placeholders are filled from vars
// (callers escape any HTML they pass in). Unknown keys fall back to the English text.
// Thai wording was written by Claude and should be reviewed by a native speaker.
'use strict';

export const I18N = { lang: 'th' };
const KEY = 'tasks.lang';

/** The language this person picked on this device, or null if they never changed it here. */
export function storedLang(personId = '') { try { const v = localStorage.getItem(`${KEY}.${personId}`); return v === 'th' || v === 'en' ? v : null; } catch { return null; } }
/** Save (or with null, forget) this device's language choice. */
export function rememberLang(v, personId = '') { try { const k = `${KEY}.${personId}`; if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* storage unavailable */ } }
export function setLang(v) {
  I18N.lang = v === 'en' ? 'en' : 'th';
  document.documentElement.lang = I18N.lang;
  document.title = L('Caltex Wastewater Tasks');
  return I18N.lang;
}

// A key may carry a context prefix ('col|Closed') when one English word needs two Thai words; English drops the prefix.
export function L(s, vars) {
  let out = I18N.lang === 'th' && Object.prototype.hasOwnProperty.call(TH, s) ? TH[s] : s.includes('|') ? s.slice(s.indexOf('|') + 1) : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
  return out;
}

/* ---------- dates (Gregorian years, Thai abbreviations) ---------- */
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONL_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const MON = () => (I18N.lang === 'th' ? MON_TH : MON_EN);
export const MONL = () => (I18N.lang === 'th' ? MONL_TH : MONL_EN);
export const WD = () => (I18N.lang === 'th' ? WD_TH : WD_EN);

/* ---------- built-in areas and buckets (by id; other ids keep the server name) ---------- */
const AREA_TH = { building: 'อาคาร', office: 'สำนักงาน', canopy: 'แคนโนปี้', fuel: 'ระบบน้ำมัน', sign: 'ป้ายริมทางหลวง', drainage: 'ระบบระบายน้ำ', electrical: 'ระบบไฟฟ้า', concrete: 'งานคอนกรีต', misc: 'อื่นๆ' };
const CAT_TH = { general: 'ทั่วไป', safety: 'ความปลอดภัย', engineering: 'วิศวกรรม', permits: 'ใบอนุญาตและการอนุมัติ', client: 'คำขอจากลูกค้า', misc: 'อื่นๆ' };
// Extra Thai words accepted after # in quick add (the Thai names above always work too).
const AREA_TAGS = { canopy: ['หลังคา', 'แคโนปี้', 'แคนโนปี้', 'ลานจ่ายน้ำมัน'], fuel: ['น้ำมัน', 'ถังน้ำมัน'], sign: ['ป้าย'], drainage: ['ระบายน้ำ', 'ท่อระบายน้ำ'], electrical: ['ไฟฟ้า', 'ไฟ'], concrete: ['คอนกรีต'], building: ['ตึก'] };
const CAT_TAGS = { safety: ['ปลอดภัย', 'จป'], permits: ['ใบอนุญาต', 'อนุญาต', 'อนุมัติ'], client: ['ลูกค้า'] };
export const areaTh = (id) => (I18N.lang === 'th' ? AREA_TH[id] : undefined);
export const catTh = (id) => (I18N.lang === 'th' ? CAT_TH[id] : undefined);
/** True if a #tag typed in Thai names this area/bucket (exact, or the start of the Thai name, or a listed alias). */
export function tagMatchesTh(kind, id, tag) {
  if (!/[฀-๿]/.test(tag)) return false;
  const name = (kind === 'area' ? AREA_TH : CAT_TH)[id];
  const alias = (kind === 'area' ? AREA_TAGS : CAT_TAGS)[id] || [];
  return !!name && (name === tag || (tag.length >= 3 && name.startsWith(tag)) || name.replace(/^(ระบบ|งาน)/, '') === tag || alias.includes(tag));
}

/* ---------- server messages (arrive in English) ---------- */
const FIELD_TH = { Title: 'ชื่องาน', Due: 'วันกำหนดเสร็จ', Start: 'วันเริ่ม', 'Follow-up': 'วันติดตาม', 'Checklist item': 'รายการในเช็กลิสต์', Area: 'ส่วนงาน', Comment: 'ความคิดเห็น', Message: 'ข้อความ', Bucket: 'หมวด', Details: 'รายละเอียด', 'Bucket name': 'ชื่อหมวด', Name: 'ชื่อ', 'Private note': 'บันทึกภายใน', Reason: 'เหตุผล' };
const SERVER_TH = {
  'You do not have access to this.': 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
  'Not found.': 'ไม่พบข้อมูล',
  'Your account is not set up for the task app. Ask Brian or Ming.': 'บัญชีของคุณยังไม่ได้ตั้งค่าให้ใช้แอปงาน กรุณาติดต่อ Brian หรือ Ming',
  'Counter missing.': 'ระบบเลขงานผิดพลาด กรุณาแจ้งผู้ดูแลระบบ',
  'Title is required.': 'ต้องใส่ชื่อ',
  'Unknown priority.': 'ไม่รู้จักระดับความสำคัญนี้',
  'Use the complete/sign-off actions to finish a task.': 'ใช้ปุ่มปิดงานหรือส่งขออนุมัติเพื่อจบงาน',
  'Progress must be 0–100.': 'ความคืบหน้าต้องอยู่ระหว่าง 0–100',
  'Unknown repeat.': 'ไม่รู้จักรูปแบบการทำซ้ำนี้',
  'Unknown area.': 'ไม่พบส่วนงานนี้',
  'Unknown bucket.': 'ไม่พบหมวดนี้',
  'Assignees must be a list.': 'รายชื่อผู้รับงานไม่ถูกต้อง',
  'Too many assignees.': 'ผู้รับงานมากเกินไป',
  'You cannot assign that person.': 'คุณมอบหมายงานให้คนนี้ไม่ได้',
  'Your account can look but not make changes.': 'บัญชีของคุณดูได้อย่างเดียว แก้ไขไม่ได้',
  'The due date is before the start date.': 'วันกำหนดเสร็จอยู่ก่อนวันเริ่ม',
  'You cannot add sub-tasks to that task.': 'คุณเพิ่มงานย่อยในงานนี้ไม่ได้',
  'You can see this task but cannot change it.': 'คุณเห็นงานนี้ได้ แต่แก้ไขไม่ได้',
  'Someone else changed this task. Reload and try again.': 'มีคนอื่นแก้ไขงานนี้ไปแล้ว ข้อมูลโหลดใหม่แล้ว กรุณาลองอีกครั้ง',
  'Only the owner, a manager or admin, or a lead can do this.': 'เฉพาะเจ้าของงาน ผู้จัดการ ผู้ดูแลระบบ หรือหัวหน้าของผู้รับงานเท่านั้นที่ทำได้',
  'Nothing to change.': 'ไม่มีอะไรเปลี่ยน',
  'This task is waiting for sign-off.': 'งานนี้กำลังรออนุมัติ',
  'Write the step first.': 'พิมพ์ขั้นตอนก่อน',
  'Write something first.': 'พิมพ์ข้อความก่อน',
  'Already assigned.': 'มอบหมายให้คนนี้แล้ว',
  'Not assigned.': 'คนนี้ไม่ได้อยู่ในงานนี้',
  'The lead must be one of the assignees.': 'ผู้รับผิดชอบหลักต้องเป็นหนึ่งในผู้รับงาน',
  'Only someone assigned can hand the task on.': 'เฉพาะผู้รับงานเท่านั้นที่ส่งต่องานได้',
  'Pick someone who is not already on the task.': 'เลือกคนที่ยังไม่ได้อยู่ในงานนี้',
  'Only the owner, a manager or admin can change who sees this task.': 'เฉพาะเจ้าของงาน ผู้จัดการ หรือผู้ดูแลระบบเท่านั้นที่เปลี่ยนคนที่เห็นงานนี้ได้',
  'You cannot share with that person.': 'คุณแชร์ให้คนนี้ไม่ได้',
  'They can already see it.': 'คนนี้เห็นงานนี้อยู่แล้ว',
  'Not shared with them.': 'ไม่ได้แชร์ให้คนนี้',
  'Already closed.': 'ปิดไปแล้ว',
  'Already waiting for sign-off.': 'กำลังรออนุมัติอยู่แล้ว',
  'This task is not waiting for sign-off.': 'งานนี้ไม่ได้รออนุมัติ',
  'Only the owner, a manager or admin, or a lead can reopen.': 'เฉพาะเจ้าของงาน ผู้จัดการ ผู้ดูแลระบบ หรือหัวหน้าของผู้รับงานเท่านั้นที่เปิดงานใหม่ได้',
  'This task is not closed.': 'งานนี้ยังไม่ได้ปิด',
  'Give a reason for reopening.': 'ใส่เหตุผลที่เปิดงานใหม่',
  'Only the owner, a manager or admin can delete this task.': 'เฉพาะเจ้าของงาน ผู้จัดการ หรือผู้ดูแลระบบเท่านั้นที่ลบงานนี้ได้',
  'Unknown action.': 'ไม่รู้จักคำสั่งนี้',
  'You cannot send requests to that person.': 'คุณส่งคำขอถึงคนนี้ไม่ได้',
  'Someone else changed this request. Reload and try again.': 'มีคนอื่นแก้ไขคำขอนี้ไปแล้ว ข้อมูลโหลดใหม่แล้ว กรุณาลองอีกครั้ง',
  'Only the people asked can mark this as answered.': 'เฉพาะคนที่ถูกขอเท่านั้นที่ระบุว่าตอบแล้วได้',
  'Only the person who asked, a manager or admin can do this.': 'เฉพาะคนที่ส่งคำขอ ผู้จัดการ หรือผู้ดูแลระบบเท่านั้นที่ทำได้',
  'Not closed.': 'ยังไม่ได้ปิด',
  'Only SPP can add buckets.': 'เฉพาะ SPP เท่านั้นที่เพิ่มหมวดได้',
  'Name the bucket.': 'ตั้งชื่อหมวดก่อน',
  'That bucket already exists.': 'มีหมวดนี้อยู่แล้ว',
  'Only admins can change people and access.': 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขรายชื่อและสิทธิ์ได้',
  'That access level does not fit this company.': 'ระดับสิทธิ์นี้ใช้กับบริษัทนี้ไม่ได้',
  "You can't remove your own admin access.": 'คุณเอาสิทธิ์ผู้ดูแลระบบของตัวเองออกไม่ได้',
  'Name is required.': 'ต้องใส่ชื่อ',
  'Unknown company.': 'ไม่รู้จักบริษัทนี้',
  'Only SPP people can be hidden.': 'ซ่อนได้เฉพาะคนของ SPP',
  "You can't switch off your own account.": 'คุณปิดบัญชีของตัวเองไม่ได้',
  'Leads must be SPP people.': 'หัวหน้าต้องเป็นคนของ SPP',
  'Can only follow SPP people.': 'ติดตามงานได้เฉพาะคนของ SPP',
  'Requests can only go to Caltex, KS or the land owner.': 'ส่งคำขอได้เฉพาะถึง Caltex, KS หรือเจ้าของที่ดิน',
  'Language must be th or en.': 'ภาษาต้องเป็นไทยหรืออังกฤษ',
  'Send JSON.': 'รูปแบบข้อมูลไม่ถูกต้อง',
  'Too much data in one request.': 'ข้อมูลมากเกินไปในครั้งเดียว',
  'Invalid JSON.': 'รูปแบบข้อมูลไม่ถูกต้อง',
  'The task app is not switched on yet.': 'แอปงานยังไม่เปิดใช้งาน',
  'Sign in first.': 'กรุณาเข้าสู่ระบบก่อน',
  'Method not allowed.': 'ไม่อนุญาตให้ทำแบบนี้',
  'Request blocked (wrong origin).': 'คำขอถูกบล็อก (ที่มาไม่ถูกต้อง)',
  'Request blocked.': 'คำขอถูกบล็อก',
  'Request blocked. Reload the page and try again.': 'คำขอถูกบล็อก กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง',
  'Something went wrong. Nothing was changed.': 'เกิดข้อผิดพลาด ไม่มีอะไรถูกเปลี่ยนแปลง',
  'Something went wrong.': 'เกิดข้อผิดพลาด',
  // logins (portal)
  'Logins are not switched on.': 'ระบบบัญชีเข้าใช้ยังไม่เปิด',
  'Only admins can manage logins.': 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการบัญชีเข้าใช้ได้',
  'View only.': 'ดูได้อย่างเดียว',
  'For safety, sign out and sign in again before changing logins.': 'เพื่อความปลอดภัย กรุณาออกจากระบบแล้วเข้าใหม่ก่อนแก้ไขบัญชีเข้าใช้',
  'Person not found.': 'ไม่พบรายชื่อนี้',
  'Usernames are 1–40 letters, numbers, dots, dashes or underscores.': 'ชื่อผู้ใช้ยาว 1–40 ตัว ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีด หรือขีดล่าง',
  'That username is taken.': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว',
  'Login not found.': 'ไม่พบบัญชีเข้าใช้นี้',
  'That login is already linked to someone.': 'บัญชีเข้าใช้นี้ผูกกับคนอื่นแล้ว',
  "The owner's login can only be reset through owner recovery.": 'บัญชีของเจ้าของระบบรีเซ็ตได้ผ่านขั้นตอนกู้คืนของเจ้าของเท่านั้น',
  'This login is switched off. Switch it on first.': 'บัญชีเข้าใช้นี้ถูกปิดอยู่ กรุณาเปิดก่อน',
  'The login changed. Reload and try again.': 'บัญชีเข้าใช้มีการเปลี่ยนแปลง กรุณาโหลดใหม่แล้วลองอีกครั้ง',
  "You can't switch off your own login.": 'คุณปิดบัญชีเข้าใช้ของตัวเองไม่ได้',
  'Admin changes need 2-step sign-in. Set it up on your Account page, then try again.': 'การเปลี่ยนแปลงของผู้ดูแลระบบต้องใช้การยืนยันตัวตน 2 ขั้นตอน ตั้งค่าที่หน้าบัญชีของคุณ แล้วลองอีกครั้ง',
  'For safety, confirm your password before making admin changes.': 'เพื่อความปลอดภัย กรุณายืนยันรหัสผ่านก่อนทำการเปลี่ยนแปลงของผู้ดูแลระบบ',
  'Your password is not right.': 'รหัสผ่านไม่ถูกต้อง', 'Enter the newest 6-digit code from your authenticator app.': 'กรอกรหัส 6 หลักล่าสุดจากแอปยืนยันตัวตน',
  'A backup started less than 2 minutes ago. Try again later.': 'เพิ่งเริ่มสำรองข้อมูลไปไม่ถึง 2 นาที กรุณาลองใหม่ภายหลัง',
  'The backup storage is not connected yet.': 'ยังไม่ได้เชื่อมต่อพื้นที่สำรองข้อมูล',
  'View only: you are viewing the site as someone else.': 'ดูอย่างเดียว: คุณกำลังดูในมุมมองของคนอื่น',
};
const field = (f) => FIELD_TH[f] || f;
const SERVER_RE = [
  [/^(.+) was added to “Shared with” so they can see this task\.$/, (m) => `เพิ่ม ${m[1]} ใน “แชร์เพิ่มกับ” แล้ว เพื่อให้เห็นงานนี้`],
  [/^(.+) can't see this task\.$/, (m) => `${m[1]} มองไม่เห็นงานนี้`],
  [/^No one called “(.+)” in your contacts\.$/, (m) => `ไม่พบ “${m[1]}” ในรายชื่อของคุณ`],
  [/^(.+) is outside SPP\. Send them a request instead\.$/, (m) => `${m[1]} อยู่นอก SPP ให้ส่งคำขอแทน`],
  [/^(.+) must be text\.$/, (m) => `${field(m[1])} ต้องเป็นข้อความ`],
  [/^(.+) is too long \(max (\d+) characters\)\.$/, (m) => `${field(m[1])} ยาวเกินไป (ไม่เกิน ${m[2]} ตัวอักษร)`],
  [/^(.+) must be a real date \(YYYY-MM-DD\)\.$/, (m) => `${field(m[1])} ต้องเป็นวันที่ที่ถูกต้อง`],
  [/^(.+) already reports to (.+)\.$/, (m) => `${m[1]} รายงานต่อ ${m[2]} อยู่แล้ว`],
  [/^(.+) already has a login\.$/, (m) => `${m[1]} มีบัญชีเข้าใช้แล้ว`],
  [/^(.+) has no login yet\.$/, (m) => `${m[1]} ยังไม่มีบัญชีเข้าใช้`],
];
/** Show a server error/warning in the reader's language; unknown messages stay in English. */
export function trMsg(msg) {
  const s = String(msg ?? '');
  if (I18N.lang !== 'th') return s;
  if (Object.prototype.hasOwnProperty.call(SERVER_TH, s)) return SERVER_TH[s];
  for (const [re, f] of SERVER_RE) { const m = re.exec(s); if (m) return f(m); }
  return Object.prototype.hasOwnProperty.call(TH, s) ? TH[s] : s;
}

/* ---------- app text ---------- */
const TH = {
  'Caltex Wastewater Tasks': 'งาน · ปรับปรุงระบบน้ำเสีย Caltex',
  'Loading tasks…': 'กำลังโหลดงาน…',
  'Logins are managed on the live site.': 'จัดการบัญชีเข้าใช้ได้ที่เว็บไซต์จริง',

  // dates and times
  'No date': 'ไม่มีกำหนด', '{n} days late': 'เลยกำหนด {n} วัน', '1 day late': 'เลยกำหนด 1 วัน', Today: 'วันนี้', Tomorrow: 'พรุ่งนี้',
  'just now': 'เมื่อสักครู่', '{n} min ago': '{n} นาทีที่แล้ว', '{n} h ago': '{n} ชม. ที่แล้ว', yesterday: 'เมื่อวาน', '{n} days ago': '{n} วันที่แล้ว',

  // companies, levels, statuses
  'Land owner': 'เจ้าของที่ดิน', 'SPP project staff': 'เจ้าหน้าที่โครงการ SPP', '{co} contact': 'ผู้ติดต่อ {co}', Someone: 'ใครบางคน',
  'Not started': 'ยังไม่เริ่ม', 'In progress': 'กำลังทำ', 'On hold': 'พักไว้', 'Awaiting sign-off': 'รออนุมัติ', Done: 'เสร็จแล้ว',
  Urgent: 'ด่วนมาก', High: 'สูง', Normal: 'ปกติ', Low: 'ต่ำ',
  Admin: 'ผู้ดูแลระบบ', Manager: 'ผู้จัดการ', Staff: 'เจ้าหน้าที่', 'Observer (view only)': 'ผู้สังเกตการณ์ (ดูอย่างเดียว)', 'Team member': 'ทีมงาน', 'External partner': 'หน่วยงานภายนอก',
  'Waiting for reply': 'รอคำตอบ', Answered: 'ตอบแล้ว', Closed: 'ปิดแล้ว',

  // toasts and busy states
  'Saving…': 'กำลังบันทึก…', Undo: 'เลิกทำ', 'Saved.': 'บันทึกแล้ว', 'Sent.': 'ส่งแล้ว', 'Copied.': 'คัดลอกแล้ว', 'Select the code and copy it.': 'เลือกรหัสแล้วคัดลอกเอง',
  'Already waiting for sign-off.': 'กำลังรออนุมัติอยู่แล้ว',
  '{id} closed and moved to History.': 'ปิด {id} แล้ว ย้ายไปที่ประวัติ', '{id} sent for sign-off.': 'ส่ง {id} ขออนุมัติแล้ว', '{id} closed.': 'ปิด {id} แล้ว',
  'Next week’s copy is {id}.': 'งานของสัปดาห์หน้าคือ {id}', '{id} sent back.': 'ส่ง {id} กลับไปแก้แล้ว', '{id} reopened.': 'เปิด {id} ใหม่แล้ว', '{id} deleted.': 'ลบ {id} แล้ว',
  'Write why the task is being reopened.': 'เขียนเหตุผลที่เปิดงานใหม่',
  'At 100%. Press “Mark complete” to close it.': 'ครบ 100% แล้ว กด “ปิดงาน” เพื่อปิดงาน', 'At 100%. Use “Send for sign-off” when it is ready.': 'ครบ 100% แล้ว กด “ส่งขออนุมัติ” เมื่องานพร้อม',
  'Marked as answered.': 'ระบุว่าตอบแล้ว', '{name} assigned.': 'มอบหมายให้ {name} แล้ว', 'Handed to {name}.': 'ส่งต่อให้ {name} แล้ว', 'Shared with {name}.': 'แชร์กับ {name} แล้ว',
  'Login “{u}” created. Now issue a setup code.': 'สร้างบัญชี “{u}” แล้ว ขั้นต่อไปให้ออกรหัสตั้งค่า', 'Login switched off. They are signed out everywhere.': 'ปิดการเข้าใช้แล้ว ระบบออกจากระบบให้ทุกเครื่องแล้ว', 'Login switched on.': 'เปิดการเข้าใช้แล้ว',
  'Now viewing as {name}.': 'กำลังดูในนามของ {name}', 'Back to yourself.': 'กลับมาเป็นตัวคุณเองแล้ว',
  'Add a few words describing the task.': 'พิมพ์คำอธิบายงานสั้นๆ ก่อน', '{w}. Fix the name or remove it.': '{w} แก้ชื่อหรือลบออก',
  '{id} added.': 'เพิ่ม {id} แล้ว', '{id} created.': 'สร้าง {id} แล้ว', '{id} sent. Your follow-up is {fu}.': 'ส่ง {id} แล้ว งานติดตามของคุณคือ {fu}', 'Bucket “{name}” added.': 'เพิ่มหมวด “{name}” แล้ว',
  '{id} assigned to {name}.': 'มอบหมาย {id} ให้ {name} แล้ว', '{id} moved.': 'ย้าย {id} แล้ว',

  // badges
  'Follow-up': 'งานติดตาม', 'Sent to SPP': 'ส่งถึง SPP', 'From {who}': 'จาก {who}', Safety: 'ความปลอดภัย',

  // notifications
  '{who} assigned you {ref}': '{who} มอบหมายงาน {ref} ให้คุณ', '{who} mentioned you {ref}': '{who} กล่าวถึงคุณใน {ref}', '{who} commented on {ref}': '{who} แสดงความคิดเห็นใน {ref}',
  '{who} shared a task with you {ref}': '{who} แชร์งาน {ref} กับคุณ', '{who} asked you to sign off {ref}': '{who} ขอให้คุณอนุมัติ {ref}', '{who} closed {ref}': '{who} ปิดงาน {ref}',
  '{who} sent this back to you {ref}': '{who} ส่ง {ref} กลับมาให้คุณแก้', '{who} reopened {ref}': '{who} เปิดงาน {ref} ใหม่', '{who} handed you {ref}': '{who} ส่งต่องาน {ref} ให้คุณ',
  '{who} handed this to {person}: {ref}': '{who} ส่งต่องานให้ {person}: {ref}', '{who} sent you a request {ref}': '{who} ส่งคำขอถึงคุณ {ref}', '{who} answered your request {ref}': '{who} ตอบคำขอของคุณ {ref}',
  '{who} replied on {ref}': '{who} ตอบกลับใน {ref}', '{who} closed the request {ref}': '{who} ปิดคำขอ {ref}', '{who} reopened the request {ref}': '{who} เปิดคำขอ {ref} ใหม่',
  '{who} created {ref}': '{who} สร้างงาน {ref}', '{who} sent for sign-off {ref}': '{who} ส่ง {ref} ขออนุมัติ', '{who} handed off {ref}': '{who} ส่งต่องาน {ref}', '{who} sent a request {ref}': '{who} ส่งคำขอ {ref}',
  '{who} updated {ref}': '{who} อัปเดต {ref}',
  Notifications: 'การแจ้งเตือน', 'Mark all read': 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด',
  'Nothing yet. You will be told here when someone assigns you, @mentions you or asks for your sign-off.': 'ยังไม่มีการแจ้งเตือน เมื่อมีคนมอบหมายงาน @กล่าวถึงคุณ หรือขอให้คุณอนุมัติ จะแจ้งที่นี่',

  // top bar and menu
  'Caltex 2027 wastewater · 8 sites · Tasks': 'ปรับปรุงระบบน้ำเสีย Caltex 2027 · 8 สถานี · งาน', Job: 'โครงการ', 'Project home': 'หน้าหลักโครงการ', Home: 'หน้าหลัก', 'New task': 'งานใหม่',
  'Account menu': 'เมนูบัญชี', Language: 'ภาษา · Language', Layout: 'รูปแบบหน้าจอ', 'Side menu': 'เมนูด้านข้าง', 'Top tabs': 'แท็บด้านบน', 'My account': 'บัญชีของฉัน', 'Sign out': 'ออกจากระบบ',

  // nav
  Views: 'มุมมอง', Workspace: 'พื้นที่ทำงาน', 'My work': 'งานของฉัน', Board: 'บอร์ด', List: 'รายการ', Requests: 'คำขอ', Calendar: 'ปฏิทิน', Timeline: 'ไทม์ไลน์', History: 'ประวัติ', 'Team & access': 'ทีมและสิทธิ์',
  'Signed in as <b>{name}</b>': 'เข้าสู่ระบบในชื่อ <b>{name}</b>',

  // filters
  'Search tasks, IDs, people': 'ค้นหางาน รหัส หรือชื่อคน', Search: 'ค้นหา', Area: 'ส่วนงาน', 'All areas': 'ทุกส่วนงาน', Bucket: 'หมวด', 'All buckets': 'ทุกหมวด', Person: 'คน', Everyone: 'ทุกคน',
  'Only mine': 'เฉพาะของฉัน', 'Clear filters': 'ล้างตัวกรอง',

  // board / list / calendar / timeline heads
  'Planner-style columns. Drag a card to another column to re-file it, or tick the circle to finish it.': 'แบ่งเป็นคอลัมน์ ลากการ์ดไปคอลัมน์อื่นเพื่อย้ายกลุ่ม หรือติ๊กวงกลมเพื่อปิดงาน',
  'Group by': 'จัดกลุ่มตาม', Status: 'สถานะ', Priority: 'ความสำคัญ',
  'Type a task. <b>@name</b> assigns it, <b>#area</b> or <b>#bucket</b> files it, <b>!high</b> sets priority, <b>due 5/11</b> sets the date.': 'พิมพ์งานได้เลย <b>@ชื่อ</b> มอบหมายงาน <b>#ส่วนงาน</b> หรือ <b>#หมวด</b> จัดกลุ่ม <b>!ด่วน</b> หรือ <b>!สูง</b> ตั้งความสำคัญ <b>กำหนด 5/11</b> ตั้งวันกำหนดเสร็จ',
  Sort: 'เรียงลำดับ', 'By due date': 'ตามวันกำหนด', 'Newest first': 'ล่าสุดก่อน', 'By area': 'ตามส่วนงาน',
  'Add a task… e.g. Fix hoarding gate @Por #misc !high': 'เพิ่มงาน… เช่น ซ่อมประตูรั้วชั่วคราว @Por #misc !สูง', 'Add a task': 'เพิ่มงาน', Add: 'เพิ่ม',
  'Every open task you can see, on its due date. Pick a day to list its tasks.': 'งานที่ยังเปิดอยู่ทั้งหมดที่คุณเห็น แสดงตามวันกำหนดเสร็จ เลือกวันเพื่อดูรายการงาน',
  'Start to due date for each task, grouped by area. The yellow line is today; a red outline means late.': 'ช่วงวันเริ่มถึงวันกำหนดเสร็จของแต่ละงาน จัดกลุ่มตามส่วนงาน เส้นสีเหลืองคือวันนี้ กรอบสีแดงคือเลยกำหนด',
  '<b>View only.</b> You can look at everything but cannot change anything.': '<b>ดูอย่างเดียว</b> คุณดูได้ทุกอย่าง แต่แก้ไขไม่ได้',

  // staging bar
  'Test copy.': 'ระบบทดสอบ', 'Viewing as <b>{name}</b>. Everything you do now is done as {name}.': 'กำลังดูในนามของ <b>{name}</b> ทุกอย่างที่ทำตอนนี้จะทำในนามของ {name}',
  'View the app as anyone to check what they see.': 'ดูแอปในนามของคนอื่น เพื่อตรวจว่าเขาเห็นอะไรบ้าง', 'View as': 'ดูในนามของ', 'Myself ({name})': 'ตัวฉันเอง ({name})',

  // cards and rows
  'Mark complete': 'ปิดงาน', 'Send for sign-off': 'ส่งขออนุมัติ', 'Repeats weekly': 'ทำซ้ำทุกสัปดาห์', 'Every day': 'ทุกวัน', 'Every day except Sunday': 'ทุกวันยกเว้นวันอาทิตย์', 'Weekdays (Mon–Fri)': 'วันจันทร์–ศุกร์',
  'Every {day}': 'ทุกวัน{day}', 'Repeats {days}': 'ทำซ้ำ {days}', 'Repeat on': 'ทำซ้ำในวัน',
  'Pick days to repeat (optional). Each chosen morning at 6:00 a new copy appears with a reminder on the bell.': 'เลือกวันที่จะทำซ้ำ (ไม่บังคับ) ทุกเช้าของวันที่เลือกเวลา 6:00 จะมีงานชุดใหม่และแจ้งเตือนที่กระดิ่ง',
  'reminder at 6:00 on each chosen day': 'แจ้งเตือนเวลา 6:00 ของวันที่เลือก', 'Due today: {ref}': 'ครบกำหนดวันนี้: {ref}',
  'repeating task: new copy after {id}': 'งานทำซ้ำ: ชุดใหม่ต่อจาก {id}',
  'Chief (assistant)': 'Chief (ผู้ช่วย AI)', 'via Chief': 'ผ่าน Chief', 'Chief’s new key': 'กุญแจใหม่ของ Chief',
  'Copy it now and give it to the assistant. It is shown only this once; the site keeps only a fingerprint of it.': 'คัดลอกตอนนี้แล้วให้ผู้ช่วย แสดงเพียงครั้งเดียว เว็บไซต์เก็บไว้เฉพาะลายนิ้วมือของกุญแจ',
  'Copy key': 'คัดลอกกุญแจ', 'I have copied it': 'คัดลอกแล้ว', 'Revoked': 'ยกเลิกแล้ว', 'Active': 'ใช้งานอยู่', 'Expired': 'หมดอายุ', 'Revoke': 'ยกเลิก',
  'Chief is your AI assistant. It acts as you: everyone else sees your name. It can read your tasks, requests and meetings, create tasks for you or SPP colleagues, comment, update progress, details and dates, add and tick checklist steps, and add people to tasks. It cannot close, approve, delete, hand off or share tasks, send or answer requests (to Caltex, KS or the land owner it makes you a task instead), or open any other page.': 'Chief คือผู้ช่วย AI ของคุณ ทำงานในนามคุณ คนอื่นจะเห็นเป็นชื่อคุณ อ่านงาน คำขอ และการประชุมของคุณได้ สร้างงานให้คุณหรือเพื่อนร่วมงาน SPP แสดงความคิดเห็น อัปเดตความคืบหน้า รายละเอียดและวันที่ เพิ่มและติ๊กขั้นตอน และเพิ่มคนในงานได้ แต่ปิด อนุมัติ ลบ ส่งต่อ หรือแชร์งานไม่ได้ ส่งหรือตอบคำขอไม่ได้ (ถ้าต้องส่งถึง Caltex, KS หรือเจ้าของที่ดิน จะสร้างงานให้คุณแทน) และเปิดหน้าอื่นไม่ได้',
  'Create a key': 'สร้างกุญแจ', 'Keys': 'กุญแจ', 'Created': 'สร้างเมื่อ', 'Expires': 'หมดอายุ', 'Last used': 'ใช้ล่าสุด',
  'No keys yet. Create one and give it to the assistant.': 'ยังไม่มีกุญแจ สร้างแล้วให้ผู้ช่วย', 'Keys last 90 days. Revoke a key at once if you think it was seen by someone else.': 'กุญแจใช้ได้ 90 วัน ยกเลิกทันทีถ้าคิดว่าคนอื่นเห็น',
  'What Chief did': 'สิ่งที่ Chief ทำ', 'Nothing yet.': 'ยังไม่มี', 'Revoke this key? Chief stops working until you give it a new key.': 'ยกเลิกกุญแจนี้? Chief จะหยุดทำงานจนกว่าคุณจะให้กุญแจใหม่', 'Key revoked.': 'ยกเลิกกุญแจแล้ว',
  'changed': 'แก้ไข', 'updated progress': 'อัปเดตความคืบหน้า', 'commented': 'แสดงความคิดเห็น', 'added a step': 'เพิ่มขั้นตอน', 'ticked a step': 'ติ๊กขั้นตอน', 'unticked a step': 'ยกเลิกติ๊กขั้นตอน', 'added a person': 'เพิ่มคน', 'added to the meeting notes': 'เพิ่มในบันทึกการประชุม', 'SPP only': 'เฉพาะ SPP', 'shared': 'ใช้ร่วมกัน',
  'To {name} · {co}': 'ถึง {name} · {co}', 'From {name} · SPP': 'จาก {name} · SPP', 'by {name} · {when}': 'โดย {name} · {when}',

  // home
  'Good morning': 'สวัสดีตอนเช้า', 'Good afternoon': 'สวัสดีตอนบ่าย', 'Good evening': 'สวัสดีตอนเย็น', '{greet}, {name}': '{greet} {name}',
  'Your team': 'ทีมของคุณ', 'People who report to you': 'คนที่รายงานต่อคุณ', '{n} open': 'เปิดอยู่ {n}', '{n} late': 'เลยกำหนด {n}', '{n} awaiting sign-off': 'รออนุมัติ {n}',
  'Today’s summary': 'สรุปวันนี้', 'Whole project': 'ทั้งโครงการ', 'Closed today': 'ปิดวันนี้', Overdue: 'เลยกำหนด', 'Due in the next 3 days': 'ครบกำหนดใน 3 วันข้างหน้า',
  'commented: {text}': 'แสดงความคิดเห็น: {text}',
  'You can see every task on the project.': 'คุณเห็นทุกงานในโครงการ', 'Your tasks, plus the work you are allowed to follow.': 'งานของคุณ และงานที่คุณได้รับสิทธิ์ติดตาม',
  'Assigned to you': 'งานที่มอบหมายให้คุณ', 'Of yours overdue': 'งานของคุณที่เลยกำหนด', 'Waiting for your sign-off': 'รอคุณอนุมัติ', 'Your open requests': 'คำขอที่คุณส่งและยังเปิดอยู่', 'Open requests': 'คำขอที่ยังเปิดอยู่',
  'Needs your sign-off': 'รอคุณอนุมัติ', 'Nothing assigned to you right now.': 'ตอนนี้ยังไม่มีงานที่มอบหมายให้คุณ',
  'You’re waiting on': 'งานที่คุณรออยู่', 'Tasks you gave others': 'งานที่คุณมอบให้คนอื่น', 'Tasks you hand to other people show up here.': 'งานที่คุณมอบให้คนอื่นจะแสดงที่นี่',
  'Progress by area': 'ความคืบหน้าตามส่วนงาน', 'Tasks you can see': 'งานที่คุณเห็น', 'No tasks yet.': 'ยังไม่มีงาน', 'Recent activity': 'ความเคลื่อนไหวล่าสุด', 'No activity yet.': 'ยังไม่มีความเคลื่อนไหว',
  'Sent by {names}': 'ส่งโดย {names}', 'Approve & close': 'อนุมัติและปิดงาน',

  // activity (shown after a name)
  'created this week’s copy of {id}': 'สร้างงานของสัปดาห์นี้ต่อจาก {id}', 'created the follow-up for {id}': 'สร้างงานติดตามของ {id}', 'created the task': 'สร้างงาน',
  'changed {fields}': 'แก้ไข{fields}', title: 'ชื่องาน', details: 'รายละเอียด', area: 'ส่วนงาน', bucket: 'หมวด', priority: 'ความสำคัญ', status: 'สถานะ', progress: 'ความคืบหน้า', repeat: 'การทำซ้ำ',
  start: 'วันเริ่ม', 'due date': 'วันกำหนดเสร็จ', 'follow-up date': 'วันติดตาม', 'progress mode': 'วิธีคิดความคืบหน้า',
  'set progress to {v}%': 'ตั้งความคืบหน้าเป็น {v}%', 'added {text}': 'เพิ่ม {text}', 'ticked {text}': 'ติ๊ก {text} แล้ว', 'unticked {text}': 'เอาติ๊กออกจาก {text}', 'removed {text}': 'ลบ {text}',
  commented: 'แสดงความคิดเห็น', 'assigned {p}': 'มอบหมายให้ {p}', 'removed {p}': 'เอา {p} ออก', 'made {p} the lead': 'ตั้ง {p} เป็นผู้รับผิดชอบหลัก', 'handed the task to {p}': 'ส่งต่องานให้ {p}',
  'shared the task with {p}': 'แชร์งานกับ {p}', 'stopped sharing with {p}': 'เลิกแชร์กับ {p}', 'sent for sign-off': 'ส่งขออนุมัติ', 'closed the task': 'ปิดงาน',
  'sent it back': 'ส่งกลับให้แก้', 'sent it back: {reason}': 'ส่งกลับให้แก้: {reason}', 'reopened it: {reason}': 'เปิดงานใหม่: {reason}', 'deleted the task': 'ลบงาน',
  'sent the request to {to}': 'ส่งคำขอถึง {to}', 'marked it answered': 'ระบุว่าตอบแล้ว', 'closed the request': 'ปิดคำขอ', 'reopened the request': 'เปิดคำขอใหม่',

  // board
  '(you)': '(คุณ)', Others: 'คนอื่น', '+ Add task': '+ เพิ่มงาน', 'New bucket': 'หมวดใหม่', 'e.g. Quality / ITP': 'เช่น คุณภาพ / ITP', 'Bucket name': 'ชื่อหมวด', 'Add bucket': 'เพิ่มหมวด',
  'Buckets are shared by everyone on the project.': 'ทุกคนในโครงการใช้หมวดร่วมกัน', 'No open tasks match these filters.': 'ไม่มีงานที่เปิดอยู่ตรงกับตัวกรองนี้',

  // list
  'Next 7 days': '7 วันข้างหน้า', 'In 2 weeks': 'ภายใน 2 สัปดาห์', Later: 'หลังจากนั้น', 'Created {date}': 'สร้างเมื่อ {date}',

  // requests
  Other: 'อื่นๆ', 'New request': 'คำขอใหม่',
  'What SPP has asked of your team, and the work your team has given SPP.': 'สิ่งที่ SPP ขอจากทีมของคุณ และงานที่ทีมของคุณมอบให้ SPP',
  'What SPP asks of Caltex, KS or the land owner: approvals, reviews and sign-offs, not work orders. Each one stays here until the person who asked closes it.': 'สิ่งที่ SPP ขอจาก Caltex, KS หรือเจ้าของที่ดิน เช่น การอนุมัติ การตรวจทาน และการลงนาม ไม่ใช่ใบสั่งงาน คำขอจะอยู่ที่นี่จนกว่าคนที่ขอจะปิด',
  'Asked of your team': 'ขอจากทีมของคุณ', 'When you have replied, press “Mark as answered”. The person who asked will close it.': 'เมื่อตอบแล้ว ให้กด “ระบุว่าตอบแล้ว” คนที่ขอจะเป็นคนปิดคำขอ',
  'No open requests from SPP.': 'ไม่มีคำขอจาก SPP ที่ยังเปิดอยู่', 'Sent by your team to SPP': 'ทีมของคุณส่งถึง SPP', 'Work your team has given SPP.': 'งานที่ทีมของคุณมอบให้ SPP', 'Nothing open.': 'ไม่มีรายการที่เปิดอยู่',
  'Waiting on others': 'รอคนอื่นอยู่', 'Requests SPP has sent out and not yet closed.': 'คำขอที่ SPP ส่งออกไปและยังไม่ปิด', 'No open requests.': 'ไม่มีคำขอที่ยังเปิดอยู่',
  'Asked of SPP': 'ขอจาก SPP', 'Work Caltex, KS or the land owner have given SPP.': 'งานที่ Caltex, KS หรือเจ้าของที่ดินมอบให้ SPP', 'Closed requests': 'คำขอที่ปิดแล้ว',

  // calendar / timeline
  'Previous month': 'เดือนก่อน', 'Next month': 'เดือนถัดไป', '{n} tasks': '{n} งาน', '+{n} more': 'อีก {n}', 'Due {date}': 'กำหนด {date}', 'Nothing due this day.': 'วันนี้ไม่มีงานครบกำหนด',
  Task: 'งาน', Late: 'เลยกำหนด', 'No open tasks with dates match these filters.': 'ไม่มีงานที่มีวันที่ตรงกับตัวกรองนี้',

  // history
  'The permanent record of closed tasks: who did it, who closed it and when. Open any item for its full checklist, comments and activity.': 'บันทึกถาวรของงานที่ปิดแล้ว ใครทำ ใครปิด และเมื่อไร เปิดรายการใดก็ได้เพื่อดูเช็กลิสต์ ความคิดเห็น และความเคลื่อนไหวทั้งหมด',
  'Closed tasks you can see': 'งานที่ปิดแล้วที่คุณเห็น', 'Closed in the last 7 days': 'ปิดใน 7 วันที่ผ่านมา', 'Still open': 'ยังเปิดอยู่', 'Search closed tasks': 'ค้นหางานที่ปิดแล้ว', 'Search history': 'ค้นหาประวัติ',
  ID: 'รหัส', 'col|Closed': 'วันที่ปิด', 'Done by': 'ผู้ทำ', 'Closed by': 'ผู้ปิด', 'Days open': 'จำนวนวัน', 'No closed tasks match.': 'ไม่มีงานที่ปิดแล้วตรงกับการค้นหา',

  // team & access
  'See every task on the project': 'เห็นทุกงานในโครงการ', 'See your own tasks and the work of people you lead or follow': 'เห็นงานของตัวเอง และงานของคนที่คุณดูแลหรือติดตาม',
  'See tasks that involve {co}': 'เห็นงานที่เกี่ยวข้องกับ {co}', 'your company': 'บริษัทของคุณ', 'Follow the work of: {names}': 'ติดตามงานของ: {names}', 'You report to: {names}': 'คุณรายงานต่อ: {names}',
  'Send requests to: {names}': 'ส่งคำขอถึง: {names}', 'Close (sign off) any task': 'ปิด (อนุมัติ) งานใดก็ได้',
  'Close tasks you created, and those of people you lead. Others go to “Send for sign-off”': 'ปิดงานที่คุณสร้าง และงานของคนที่คุณดูแลได้ งานอื่นให้ใช้ “ส่งขออนุมัติ”',
  'View only. You cannot change anything': 'ดูอย่างเดียว แก้ไขอะไรไม่ได้', 'Manage people and access': 'จัดการรายชื่อและสิทธิ์',
  'You are an admin. Changes here take effect straight away.': 'คุณเป็นผู้ดูแลระบบ การแก้ไขในหน้านี้มีผลทันที', 'View only. You can see how access is set up but cannot change it.': 'ดูอย่างเดียว คุณเห็นการตั้งค่าสิทธิ์ได้ แต่แก้ไขไม่ได้',
  'Who is on the project and what you can do.': 'ใครอยู่ในโครงการ และคุณทำอะไรได้บ้าง', 'What {name} can do': 'สิ่งที่ {name} ทำได้', People: 'รายชื่อ',
  'Everyone on the project, with their access level. Only admins and observers see this page in full.': 'ทุกคนในโครงการ พร้อมระดับสิทธิ์ เฉพาะผู้ดูแลระบบและผู้สังเกตการณ์ที่เห็นหน้านี้ครบทั้งหมด',
  'The people you can see and work with.': 'คนที่คุณเห็นและทำงานด้วยได้',
  'How access works': 'การกำหนดสิทธิ์', 'These rules are set for the project. Ask the system administrator to change them.': 'กฎเหล่านี้ตั้งไว้สำหรับโครงการ หากต้องการเปลี่ยนให้แจ้งผู้ดูแลระบบ',
  '<b>Admin, Manager, Staff, Observer</b> see every task. Observers cannot change anything and are hidden from everyone below Staff.': '<b>ผู้ดูแลระบบ ผู้จัดการ เจ้าหน้าที่ และผู้สังเกตการณ์</b> เห็นทุกงาน ผู้สังเกตการณ์แก้ไขอะไรไม่ได้ และคนที่ต่ำกว่าระดับเจ้าหน้าที่จะไม่เห็นรายชื่อผู้สังเกตการณ์',
  '<b>Site team members</b> see their own tasks and every task that has a site team member on it.': '<b>ทีมงานหน้างาน</b> เห็นงานของตัวเอง และทุกงานที่มีทีมงานหน้างานอยู่ในงานนั้น',
  '<b>Caltex</b> sees SPP people (except A) and only work that involves Caltex.': '<b>Caltex</b> เห็นรายชื่อคนของ SPP (ยกเว้น A) และเห็นเฉพาะงานที่เกี่ยวข้องกับ Caltex',
  '<b>KS Consulting and the land owner</b> see each other plus Brian, Bo and Noom, and only work that involves them.': '<b>KS Consulting และเจ้าของที่ดิน</b> เห็นรายชื่อกันและกัน รวมถึง Brian, Bo และ Noom และเห็นเฉพาะงานที่เกี่ยวข้องกับตัวเอง',
  'SPP sends <b>requests</b>, not tasks, to Caltex, KS and the land owner, and only along the request contacts set on each person.': 'SPP ส่ง <b>คำขอ</b> (ไม่ใช่งาน) ถึง Caltex, KS และเจ้าของที่ดิน และส่งได้เฉพาะผู้ติดต่อที่กำหนดไว้ให้แต่ละคน',
  'No login yet': 'ยังไม่มีบัญชีเข้าใช้', 'Waiting for password': 'รอตั้งรหัสผ่าน', 'Login: {u}': 'บัญชี: {u}', 'Login switched off ({u})': 'ปิดการเข้าใช้แล้ว ({u})', owner: 'เจ้าของระบบ',
  username: 'ชื่อผู้ใช้', 'Create login': 'สร้างบัญชีเข้าใช้', Cancel: 'ยกเลิก', 'Issue setup code': 'ออกรหัสตั้งค่า', 'Issue reset code': 'ออกรหัสรีเซ็ต', 'Switch login on': 'เปิดการเข้าใช้', 'Switch login off': 'ปิดการเข้าใช้',
  'reports to {names}': 'รายงานต่อ {names}', 'follows {names}': 'ติดตาม {names}', 'requests to {names}': 'ส่งคำขอถึง {names}', 'any partner': 'หน่วยงานภายนอกทุกราย',
  'notified of all team safety items': 'รับแจ้งเรื่องความปลอดภัยทั้งหมดของทีม', 'no team activity notices': 'ไม่รับแจ้งความเคลื่อนไหวของทีม', 'hidden from {cos}': 'ซ่อนจาก {cos}', 'English by default': 'ใช้ภาษาอังกฤษเป็นค่าเริ่มต้น', 'switched off': 'ปิดบัญชีแล้ว',
  'Access level': 'ระดับสิทธิ์', Title: 'ตำแหน่ง', 'Default language': 'ภาษาเริ่มต้น', 'Reports to:': 'รายงานต่อ:', 'Also sees the work of:': 'เห็นงานของ:', 'Can send requests to:': 'ส่งคำขอถึงได้:', 'Any partner': 'หน่วยงานภายนอกทุกราย',
  'Notify about every safety item the site team raises or comments on (even if they don’t report to this person)': 'แจ้งทุกเรื่องความปลอดภัยที่ทีมหน้างานเปิดหรือแสดงความคิดเห็น (แม้ไม่ได้รายงานต่อคนนี้)',
  'Don’t notify about team activity (who created, closed or handed off tasks). Still notified when assigned, @mentioned or asked to sign off': 'ไม่ต้องแจ้งความเคลื่อนไหวของทีม (ใครสร้าง ปิด หรือส่งต่องาน) แต่ยังแจ้งเมื่อถูกมอบหมายงาน ถูก @กล่าวถึง หรือถูกขอให้อนุมัติ',
  'Hidden from {co}': 'ซ่อนจาก {co}', 'Account switched on': 'เปิดใช้บัญชี', Edit: 'แก้ไข',
  'Remove from the project': 'นำออกจากโครงการ',
  'Remove {name} from the project? Their account and login are switched off, they are signed out everywhere, and their reporting lines and personal page settings are cleared. Their open tasks ({n}) are given to you. Closed tasks and the history keep their name.': 'นำ {name} ออกจากโครงการใช่ไหม? ระบบจะปิดบัญชีและการเข้าใช้ของเขา ออกจากระบบทุกอุปกรณ์ และล้างสายการรายงานกับการตั้งค่าหน้าเฉพาะบุคคล งานที่ยังไม่ปิดของเขา ({n} งาน) จะโอนมาให้คุณ งานที่ปิดแล้วและประวัติยังคงชื่อเขาไว้',
  '{name} removed from the project. Tasks now yours: {n}.': 'นำ {name} ออกจากโครงการแล้ว งานที่โอนมาให้คุณ: {n} งาน',
  '{who}: removed from the project (tasks handed over: {n})': '{who}: นำออกจากโครงการ (โอนงาน {n} งาน)',
  "You can't remove yourself from the project.": 'คุณนำตัวเองออกจากโครงการไม่ได้',
  'The person was removed and their tasks were moved, but the login could not be switched off. Use Switch login off.': 'นำบุคคลออกและโอนงานแล้ว แต่ปิดการเข้าใช้ไม่สำเร็จ กรุณากด “ปิดการเข้าใช้”',

  // task drawer
  'Closed by {name}': 'ปิดโดย {name}', 'Why reopen? (required)': 'เหตุผลที่เปิดใหม่ (ต้องระบุ)', Reopen: 'เปิดใหม่', 'What still needs doing?': 'ยังต้องทำอะไรอีก?', 'Send back': 'ส่งกลับให้แก้',
  '{names} marked this ready.': '{names} แจ้งว่างานพร้อมแล้ว', 'Waiting for sign-off from {name} or a lead': 'รออนุมัติจาก {name} หรือหัวหน้าของผู้รับงาน',
  '{name} (owner), a lead, a manager or admin closes this task.': '{name} (เจ้าของงาน) หัวหน้าของผู้รับงาน ผู้จัดการ หรือผู้ดูแลระบบเป็นคนปิดงานนี้',
  'Task {id}': 'งาน {id}', 'task|Title': 'ชื่องาน', 'btn|Done': 'เสร็จ', Close: 'ปิด', 'Part of {id}: {title}': 'เป็นส่วนหนึ่งของ {id}: {title}', 'Created by {who}': 'สร้างโดย {who}', 'You can comment but not change this task.': 'คุณแสดงความคิดเห็นได้ แต่แก้ไขงานนี้ไม่ได้',
  Start: 'วันเริ่ม', Due: 'กำหนดเสร็จ', 'Follow up on': 'วันติดตาม', Repeat: 'ทำซ้ำ', 'Does not repeat': 'ไม่ทำซ้ำ', 'Every week': 'ทุกสัปดาห์',
  'Assigned to': 'ผู้รับงาน', 'Lead: {name}': 'ผู้รับผิดชอบหลัก: {name}', lead: 'หลัก', 'Make lead': 'ตั้งเป็นผู้รับผิดชอบหลัก', 'Make {name} the lead': 'ตั้ง {name} เป็นผู้รับผิดชอบหลัก', 'Remove {name}': 'เอา {name} ออก',
  'Nobody yet': 'ยังไม่มีใคร', '@ add person': '@ เพิ่มคน', '@ who should take this over?': '@ ให้ใครรับงานต่อ?',
  'You come off the task but can still follow it. {name} is told who has it now.': 'คุณจะออกจากงานนี้ แต่ยังติดตามได้ ระบบจะแจ้ง {name} ว่าตอนนี้ใครรับงานอยู่',
  'Hand this to someone else': 'ส่งต่องานให้คนอื่น', Progress: 'ความคืบหน้า', 'From checklist': 'คิดจากเช็กลิสต์', 'Your estimate': 'ประเมินเอง', 'Quick progress': 'ตั้งความคืบหน้าเร็ว',
  'A rough estimate is fine. 100% does not close the task.': 'ประเมินคร่าวๆ ก็พอ 100% ไม่ได้ปิดงานให้อัตโนมัติ', 'Work out progress from the checklist': 'คิดความคืบหน้าจากเช็กลิสต์',
  Details: 'รายละเอียด', 'Notes, drawing numbers, locations…': 'บันทึก เลขแบบ ตำแหน่ง…', 'No details': 'ไม่มีรายละเอียด', Checklist: 'เช็กลิสต์', '{a} of {b}': '{a} จาก {b}', 'Delete step': 'ลบขั้นตอน',
  'Add a step… (@name works here too)': 'เพิ่มขั้นตอน… (ใช้ @ชื่อ ได้)', 'Add a step': 'เพิ่มขั้นตอน', 'Sub-tasks': 'งานย่อย', '+ Add a sub-task': '+ เพิ่มงานย่อย', None: 'ไม่มี',
  'Who can see this': 'ใครเห็นงานนี้', 'The people on it, their leads, and SPP staff and above.': 'คนในงาน หัวหน้าของเขา และเจ้าหน้าที่ SPP ขึ้นไป', 'The people on it, your company, and SPP management.': 'คนในงาน บริษัทของคุณ และผู้บริหาร SPP',
  'Also shared with:': 'แชร์เพิ่มกับ:', 'nobody extra': 'ไม่มีใครเพิ่ม', '@ share with': '@ แชร์กับ',
  'Updates & comments': 'อัปเดตและความคิดเห็น', 'Write an update. Type @ to bring someone in.': 'เขียนอัปเดต พิมพ์ @ เพื่อดึงคนเข้ามา', 'Write an update': 'เขียนอัปเดต', 'Ctrl + Enter to post': 'Ctrl + Enter เพื่อโพสต์', Post: 'โพสต์',
  'Activity ({n})': 'ความเคลื่อนไหว ({n})', 'Yes, delete {id}': 'ยืนยัน ลบ {id}', 'Delete task': 'ลบงาน',

  // request drawer
  'Request {id}': 'คำขอ {id}', 'Request from SPP': 'คำขอจาก SPP', 'Request to {co}': 'คำขอถึง {co}', '{from} asked {to} ({co})': '{from} ส่งคำขอถึง {to} ({co})', 'reply needed by <b>{date}</b>': 'ต้องการคำตอบภายใน <b>{date}</b>',
  'Mark as answered': 'ระบุว่าตอบแล้ว', 'Close request': 'ปิดคำขอ', 'Internal follow-up {id}': 'งานติดตามภายใน {id}', Request: 'คำขอ', Replies: 'การตอบกลับ', 'No replies yet.': 'ยังไม่มีการตอบกลับ',
  'Reply to SPP': 'ตอบกลับ SPP', 'Write to {name}': 'เขียนถึง {name}', Reply: 'ตอบกลับ', 'SPP sees your reply.': 'SPP จะเห็นคำตอบของคุณ', 'They will see this. Keep private notes on the internal follow-up.': 'อีกฝ่ายจะเห็นข้อความนี้ บันทึกภายในให้เขียนในงานติดตามภายใน', Send: 'ส่ง',

  // code dialog
  'One-time code': 'รหัสใช้ครั้งเดียว', 'Password reset code for {name}': 'รหัสรีเซ็ตรหัสผ่านของ {name}', 'Setup code for {name}': 'รหัสตั้งค่าของ {name}',
  'Give this code to {name} privately (in person, by phone or a private message). It works once and expires in {n} days. It is shown only now.': 'ให้รหัสนี้กับ {name} เป็นการส่วนตัว (ด้วยตัวเอง ทางโทรศัพท์ หรือข้อความส่วนตัว) ใช้ได้ครั้งเดียวและหมดอายุใน {n} วัน รหัสจะแสดงแค่ครั้งนี้เท่านั้น',
  'Give this code to {name} in person or by phone. It works once and expires in {n} minutes. It is shown only now.': 'ให้รหัสนี้กับ {name} ด้วยตัวเองหรือทางโทรศัพท์ ใช้ได้ครั้งเดียวและหมดอายุใน {n} นาที รหัสจะแสดงแค่ครั้งนี้เท่านั้น',
  'On the sign-in page they open <b>ตั้งหรือตั้งใหม่รหัสผ่าน</b> (Set or reset password), paste this code and choose a password of 15 characters or more. Then they sign in with username <b>{u}</b>.': 'ที่หน้าเข้าสู่ระบบ ให้เปิด <b>ตั้งหรือตั้งใหม่รหัสผ่าน</b> วางรหัสนี้ แล้วตั้งรหัสผ่านอย่างน้อย 15 ตัวอักษร จากนั้นเข้าสู่ระบบด้วยชื่อผู้ใช้ <b>{u}</b>',
  'Their old password and sessions have already stopped working.': 'รหัสผ่านเดิมและการเข้าสู่ระบบเดิมใช้ไม่ได้แล้ว', 'Copy code': 'คัดลอกรหัส',

  // new task / request
  'New sub-task': 'งานย่อยใหม่', 'What needs doing? e.g. Pour pylon footing @A #sign !high': 'ต้องทำอะไร? เช่น เทฐานรากป้าย @A #sign !ด่วน', 'What needs doing?': 'ต้องทำอะไร?',
  'Shortcuts in the title: <code>@name</code> assign · <code>#canopy</code> area or bucket · <code>!urgent</code> priority · <code>due 12/11</code> date': 'ทางลัดในชื่องาน: <code>@ชื่อ</code> มอบหมาย · <code>#canopy</code> หรือ <code>#แคนโนปี้</code> ส่วนงานหรือหมวด · <code>!urgent</code> ความสำคัญ · <code>due 12/11</code> วันกำหนดเสร็จ',
  'Assign to': 'มอบหมายให้', 'The first person is the lead': 'คนแรกเป็นผู้รับผิดชอบหลัก', 'Drawing refs, location, notes': 'เลขแบบอ้างอิง ตำแหน่ง บันทึก', 'one step per line': 'บรรทัดละหนึ่งขั้นตอน',
  'Rebar inspected&#10;Anchor bolts set&#10;Cube samples × 6': 'ตรวจเหล็กเสริมแล้ว&#10;ติดตั้งสลักเกลียวยึดแล้ว&#10;เก็บก้อนตัวอย่างคอนกรีต × 6',
  'Only your company, the SPP people you assign and SPP management will see this.': 'เฉพาะบริษัทของคุณ คนของ SPP ที่คุณมอบหมาย และผู้บริหาร SPP เท่านั้นที่เห็นงานนี้',
  'To ask Caltex, KS or the land owner for something, use <b>New request</b> on the Requests page.': 'หากต้องการขออะไรจาก Caltex, KS หรือเจ้าของที่ดิน ให้ใช้ <b>คำขอใหม่</b> ในหน้าคำขอ',
  'Create task': 'สร้างงาน',
  'Ask for an approval, review or sign-off. It stays on your Requests page as a reminder until you close it.': 'ขอการอนุมัติ การตรวจทาน หรือการลงนาม คำขอจะอยู่ในหน้าคำขอของคุณเพื่อเตือนจนกว่าคุณจะปิด',
  'Send to': 'ส่งถึง', 'What do you need?': 'ต้องการอะไร?', 'e.g. Sign off progress payment claim #3': 'เช่น อนุมัติเบิกงวดงานที่ 3', 'Message (they will see this)': 'ข้อความ (อีกฝ่ายจะเห็น)',
  'Reply needed by': 'ต้องการคำตอบภายใน', 'Remind me on': 'เตือนฉันวันที่', 'Private note (SPP only, never shown to them)': 'บันทึกภายใน (เฉพาะ SPP อีกฝ่ายไม่เห็น)',
  'e.g. Chase at Thursday meeting if not signed': 'เช่น ถ้ายังไม่ลงนาม ให้ตามในที่ประชุมวันพฤหัสฯ', 'Send request': 'ส่งคำขอ',

  // quick add
  '{name} is outside SPP. Send a request instead': '{name} อยู่นอก SPP ให้ส่งคำขอแทน', 'No one called “{name}” you can assign': 'ไม่พบ “{name}” ในคนที่คุณมอบหมายงานได้', '{date} is not a real date': '{date} ไม่ใช่วันที่ที่มีจริง',

  // mention popup
  'Everyone you can add already sees this task.': 'ทุกคนที่คุณเพิ่มได้เห็นงานนี้อยู่แล้ว', 'Nobody you can pick matches “{q}”.': 'ไม่มีคนที่เลือกได้ตรงกับ “{q}”',

  // Admin page
  Admin: 'ผู้ดูแลระบบ', 'Admin · who can see and change what': 'ผู้ดูแลระบบ · ใครเห็นและแก้ไขอะไรได้', 'People & logins': 'รายชื่อและบัญชีเข้าใช้', 'Pages & access': 'หน้าและสิทธิ์การเข้าถึง',
  'Task rules': 'กฎของงาน', 'Change log': 'บันทึกการเปลี่ยนแปลง', Team: 'ทีม', 'Open Admin page': 'เปิดหน้าผู้ดูแลระบบ', 'Only admins can open this page.': 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปิดหน้านี้ได้',
  'Pages you can open: {list}': 'หน้าที่คุณเปิดได้: {list}',
  'Drawings & models': 'แบบก่อสร้างและโมเดล', 'Safety library (TCC / JLA)': 'คลังเอกสารความปลอดภัย (TCC / JLA)', 'Project timeline': 'ไทม์ไลน์โครงการ',
  'S-curve: station portion': 'S-curve: ส่วนสถานีบริการ', 'S-curve: Caltex fuel portion': 'S-curve: ส่วนระบบน้ำมันของ Caltex', Tasks: 'งาน',
  'Project files (safety & engineering)': 'ไฟล์โครงการ (ความปลอดภัยและวิศวกรรม)',
  'Sign-ins': 'การเข้าสู่ระบบ',
  'Meetings (SPP–Caltex)': 'ประชุม (SPP–Caltex)',
  'Signed in': 'เข้าสู่ระบบ',
  'Wrong password': 'รหัสผ่านผิด',
  'phone': 'โทรศัพท์',
  'tablet': 'แท็บเล็ต',
  'computer': 'คอมพิวเตอร์',
  'Changed own password': 'เปลี่ยนรหัสผ่านเอง',
  'Login created': 'สร้างบัญชีเข้าใช้',
  'Login created with a temporary password': 'สร้างบัญชีเข้าใช้พร้อมรหัสผ่านชั่วคราว',
  'Login linked': 'เชื่อมบัญชีเข้าใช้',
  'Setup / reset code issued': 'ออกรหัสตั้งค่า / ตั้งใหม่',
  'Login switched on': 'เปิดบัญชีเข้าใช้',
  'Login switched off': 'ปิดบัญชีเข้าใช้',
  'No sign-ins recorded yet.': 'ยังไม่มีบันทึกการเข้าสู่ระบบ',
  'When each person last signed in and last used the site, and their history. Sign-ins are recorded from 2 Nov 2026 and kept for 90 days; account changes (logins, codes, passwords, on/off) are kept for the whole project. Only the kind of device is kept.': 'แต่ละคนเข้าสู่ระบบและใช้งานเว็บไซต์ครั้งล่าสุดเมื่อไร พร้อมประวัติ บันทึกการเข้าสู่ระบบเริ่มตั้งแต่ 2 พ.ย. 2026 และเก็บไว้ 90 วัน ส่วนการเปลี่ยนแปลงบัญชี (การสร้างบัญชี รหัส รหัสผ่าน การเปิด/ปิด) เก็บไว้ตลอดโครงการ เก็บเฉพาะประเภทอุปกรณ์เท่านั้น',
  'Person': 'บุคคล',
  'Username': 'ชื่อผู้ใช้',
  'Last signed in': 'เข้าสู่ระบบล่าสุด',
  'Last active': 'ใช้งานล่าสุด',
  'Sign-ins (30 days)': 'เข้าสู่ระบบ (30 วัน)',
  'Wrong passwords (7 days)': 'รหัสผ่านผิด (7 วัน)',
  'Login off': 'ปิดบัญชีแล้ว',
  'Not yet': 'ยังไม่เคย',
  'History': 'ประวัติ',
  'Hide history': 'ซ่อนประวัติ',
  'No login yet:': 'ยังไม่มีบัญชีเข้าใช้:',
  'Drawings, models & drawing changes': 'แบบก่อสร้าง โมเดล และการเปลี่ยนแปลงแบบ',
  'For safety, issuing codes and changing logins needs a sign-in from the last 15 minutes. Sign in again now? You will come back to this page.': 'เพื่อความปลอดภัย การออกรหัสและการแก้ไขบัญชีเข้าใช้ ต้องเข้าสู่ระบบภายใน 15 นาทีที่ผ่านมา เข้าสู่ระบบอีกครั้งตอนนี้ไหม? ระบบจะพากลับมาที่หน้านี้',
  'level|None': 'ไม่เห็น', 'level|View': 'ดู', 'level|Edit': 'แก้ไข', Money: 'มีข้อมูลการเงิน', changed: 'เปลี่ยนแล้ว', 'now: {v}': 'ตอนนี้: {v}',
  'SPP staff': 'พนักงาน SPP', 'Site team': 'ทีมหน้างาน', 'KS Consulting': 'KS Consulting', Caltex: 'Caltex',
  admin: 'ผู้ดูแลระบบ', 'As group ({v})': 'ตามกลุ่ม ({v})', 'as group': 'ตามกลุ่ม', 'By group': 'ตามกลุ่ม', 'Exceptions for one person': 'ข้อยกเว้นรายบุคคล',
  'Create logins, issue one-time setup or reset codes, change levels and switch accounts off. Edit a person for their reporting lines and request contacts.': 'สร้างบัญชีเข้าใช้ ออกรหัสตั้งค่าหรือรีเซ็ตแบบใช้ครั้งเดียว เปลี่ยนระดับสิทธิ์ และปิดบัญชี กดแก้ไขที่แต่ละคนเพื่อตั้งสายรายงานและผู้ติดต่อสำหรับคำขอ',
  '<b>None</b>: the page is hidden from their menus and blocked on the server. <b>View</b>: they can look. <b>Edit</b>: they can also change it.': '<b>ไม่เห็น</b>: หน้านั้นจะไม่แสดงในเมนูและเซิร์ฟเวอร์จะไม่ให้เปิด <b>ดู</b>: เปิดดูได้ <b>แก้ไข</b>: เปลี่ยนแปลงข้อมูลได้ด้วย',
  'Pages marked <b>Money</b> show costs or progress value.': 'หน้าที่มีป้าย <b>มีข้อมูลการเงิน</b> แสดงค่าใช้จ่ายหรือมูลค่าความก้าวหน้า',
  'Admins always keep at least view on every page. Nobody gets schedule editing automatically; give it to a person below.': 'ผู้ดูแลระบบดูได้ทุกหน้าเสมอ ไม่มีใครได้สิทธิ์แก้ไขแผนงานโดยอัตโนมัติ ให้สิทธิ์รายบุคคลได้ด้านล่าง',
  'Drawings and Safety are view-only on this site for now. The schedule pages arrive with the S-curve move; their settings already apply then.': 'ขณะนี้แบบก่อสร้างและความปลอดภัยเปิดดูได้อย่างเดียว หน้าแผนงานจะมาพร้อมการย้าย S-curve และใช้การตั้งค่านี้ทันที',
  'Who reports to whom, whose work people follow, who may send requests to partners, and who is hidden from which company.': 'ใครรายงานต่อใคร ใครติดตามงานของใคร ใครส่งคำขอถึงหน่วยงานภายนอกได้ และใครถูกซ่อนจากบริษัทใด',
  'Reports to': 'รายงานต่อ', 'Also sees the work of': 'เห็นงานของ', 'Requests to': 'ส่งคำขอถึง', 'Hidden from': 'ซ่อนจาก', Notices: 'การแจ้งเตือน',
  'all safety items': 'เรื่องความปลอดภัยทั้งหมด', 'no team activity': 'ไม่แจ้งความเคลื่อนไหวของทีม',
  'Every change to page access and to people, newest first. It cannot be edited or deleted.': 'ทุกการเปลี่ยนแปลงสิทธิ์และรายชื่อ เรียงจากล่าสุด แก้ไขหรือลบไม่ได้',
  'No changes yet.': 'ยังไม่มีการเปลี่ยนแปลง', '{who}: {page} → {level}': '{who}: {page} → {level}', '{who}: changed {fields}': '{who}: เปลี่ยน {fields}',
  'Only admins can change page access.': 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนสิทธิ์การเข้าถึงได้', 'Admins always keep at least view on every page.': 'ผู้ดูแลระบบต้องดูได้ทุกหน้าเสมอ',
  'Observers can only view.': 'ผู้สังเกตการณ์ดูได้อย่างเดียว', 'That level is not available for this page.': 'หน้านี้ไม่มีระดับสิทธิ์นี้',
  'View only. You cannot change anything here.': 'ดูอย่างเดียว แก้ไขอะไรในหน้านี้ไม่ได้',
  // Add person
  'Add a person': 'เพิ่มบุคคล', 'Company': 'บริษัท', 'e.g. Site engineer': 'เช่น วิศวกรสนาม', 'Add person': 'เพิ่มบุคคล',
  'Then use Edit for who they can see and send requests to, and Create login for their password.': 'จากนั้นกดแก้ไขเพื่อกำหนดว่าเห็นใครและส่งคำขอถึงใครได้ และกดสร้างบัญชีเข้าใช้เพื่อตั้งรหัสผ่าน',
  'Added {name}. Use Edit to set what they can see, then Create login.': 'เพิ่ม {name} แล้ว กดแก้ไขเพื่อกำหนดสิทธิ์ แล้วจึงสร้างบัญชีเข้าใช้',
  'Someone with that name is already on the project. Use a different name, e.g. add an initial.': 'มีคนชื่อนี้ในโครงการแล้ว ใช้ชื่ออื่น เช่น เติมอักษรย่อ',

  // Check a person
  'Check a person': 'ตรวจสอบสิทธิ์รายบุคคล', 'Choose someone…': 'เลือกบุคคล…', 'Choose a person to see exactly what the site shows them.': 'เลือกบุคคลเพื่อดูว่าเว็บไซต์แสดงอะไรให้เขาเห็นบ้าง',
  'What {name} sees': 'สิ่งที่ {name} เห็น', 'This is exactly what the server sends this person. Nothing is changed and you are not signed in as them.': 'นี่คือข้อมูลเดียวกับที่เซิร์ฟเวอร์ส่งให้บุคคลนี้ ไม่มีการเปลี่ยนแปลงใด และคุณไม่ได้เข้าสู่ระบบในนามของเขา',
  'Pages': 'หน้า', 'Admin page': 'หน้าผู้ดูแลระบบ', 'Yes': 'ได้', 'No': 'ไม่ได้', 'Tasks are view only for this person.': 'บุคคลนี้ดูงานได้อย่างเดียว',
  'People they can see': 'คนที่เขาเห็น', 'People hidden from them': 'คนที่ซ่อนจากเขา', 'name hidden': 'ซ่อนชื่อ', 'Nobody': 'ไม่มี',
  'Can assign tasks to': 'มอบหมายงานให้ได้', 'Can send requests to': 'ส่งคำขอถึงได้', 'Tasks they can see': 'งานที่เขาเห็น', 'Requests they can see': 'คำขอที่เขาเห็น',
  'every task': 'ทุกงาน', '…and {n} more': '…และอีก {n} รายการ', 'Only admins can check what someone sees.': 'เฉพาะผู้ดูแลระบบเท่านั้นที่ตรวจสอบได้',
  'Use this after adding someone or changing their access, to make sure they cannot see things they should not.': 'ใช้หลังเพิ่มบุคคลหรือเปลี่ยนสิทธิ์ เพื่อตรวจว่าเขาไม่เห็นสิ่งที่ไม่ควรเห็น',
  // View the site as
  'View the site as {name}': 'ดูเว็บไซต์ในมุมมองของ {name}', 'Opens the real pages as they see them. View only, for up to one hour. Logged in the Change log.': 'เปิดหน้าจริงตามที่เขาเห็น ดูอย่างเดียว ไม่เกินหนึ่งชั่วโมง และบันทึกไว้ในบันทึกการเปลี่ยนแปลง',
  // 2-step sign-in (audit N04)
  'Admin changes need 2-step sign-in (a code from an app on your phone). Open your Account page to set it up now?': 'การเปลี่ยนแปลงของผู้ดูแลระบบต้องใช้การยืนยันตัวตน 2 ขั้นตอน (รหัสจากแอปในโทรศัพท์) เปิดหน้าบัญชีเพื่อตั้งค่าตอนนี้หรือไม่',
  'Confirm it’s you': 'ยืนยันว่าเป็นคุณ', 'For safety, admin changes need your password again (once every 15 minutes).': 'เพื่อความปลอดภัย การเปลี่ยนแปลงของผู้ดูแลระบบต้องกรอกรหัสผ่านอีกครั้ง (ทุก 15 นาที)',
  Password: 'รหัสผ่าน', Confirm: 'ยืนยัน', '6-digit code from your authenticator app': 'รหัส 6 หลักจากแอปยืนยันตัวตน',
  'Right password, wrong 2-step code': 'รหัสผ่านถูก แต่รหัส 2 ขั้นตอนผิด', '2-step sign-in turned on': 'เปิดการยืนยัน 2 ขั้นตอน', '2-step sign-in turned off': 'ปิดการยืนยัน 2 ขั้นตอน',
  '2-step sign-in removed by an admin': 'ผู้ดูแลระบบลบการยืนยัน 2 ขั้นตอน', 'Recovery code used': 'ใช้รหัสกู้คืน', '2-step on': 'ยืนยัน 2 ขั้นตอน', 'Remove 2-step': 'ลบการยืนยัน 2 ขั้นตอน',
  'Remove 2-step sign-in for {name}? Use this only if they lost their phone and their recovery codes. They can then sign in with the password alone and set it up again.': 'ลบการยืนยัน 2 ขั้นตอนของ {name}? ใช้เฉพาะเมื่อโทรศัพท์และรหัสกู้คืนหาย หลังจากนี้เขาจะเข้าสู่ระบบด้วยรหัสผ่านอย่างเดียวได้ แล้วตั้งค่าใหม่',
  '2-step sign-in removed.': 'ลบการยืนยัน 2 ขั้นตอนแล้ว',
  'No new notifications.': 'ไม่มีการแจ้งเตือนใหม่', 'Show earlier ({n})': 'แสดงก่อนหน้า ({n})', 'Hide earlier': 'ซ่อนก่อนหน้า',
  // Task creator (Brian, 2 Nov 2026)
  Creator: 'ผู้สร้าง', 'By creator': 'ตามผู้สร้าง', 'by {name}': 'โดย {name}',
  // Backups (audit F11)
  Backups: 'การสำรองข้อมูล',
  'Every Sunday at 02:00 the site copies all its data and files to a separate, locked storage area (copies cannot be deleted or changed for 90 days). Once a month, download a backup here and save it in the project SharePoint folder. Sign-ins are kept for 90 days, then removed automatically; account changes are kept for the whole project.': 'ทุกวันอาทิตย์ เวลา 02:00 น. เว็บไซต์จะคัดลอกข้อมูลและไฟล์ทั้งหมดไปเก็บในพื้นที่จัดเก็บแยกต่างหากที่ล็อกไว้ (ลบหรือแก้ไขสำเนาไม่ได้เป็นเวลา 90 วัน) เดือนละครั้งให้ดาวน์โหลดข้อมูลสำรองที่นี่และบันทึกไว้ในโฟลเดอร์ SharePoint ของโครงการ ประวัติการเข้าสู่ระบบเก็บไว้ 90 วันแล้วลบอัตโนมัติ ส่วนการเปลี่ยนแปลงบัญชีเก็บไว้ตลอดโครงการ',
  'For safety, backing up and downloading needs a sign-in from the last 15 minutes. Sign in again now? You will come back to this page.': 'เพื่อความปลอดภัย การสำรองและดาวน์โหลดข้อมูลต้องเข้าสู่ระบบภายใน 15 นาทีที่ผ่านมา ต้องการเข้าสู่ระบบอีกครั้งตอนนี้หรือไม่ แล้วจะกลับมาที่หน้านี้',
  automatic: 'อัตโนมัติ', '{n} rows of data': 'ข้อมูล {n} แถว', '{n} files new': 'ไฟล์ใหม่ {n} ไฟล์', '{n} files left for next time': 'เหลือ {n} ไฟล์สำหรับครั้งถัดไป', '{n} problems': 'มีปัญหา {n} รายการ',
  'The backup storage is not connected yet. Until it is, use Download backup.': 'ยังไม่ได้เชื่อมต่อพื้นที่สำรองข้อมูล ระหว่างนี้ให้ใช้ "ดาวน์โหลดข้อมูลสำรอง"',
  'Last backup:': 'สำรองล่าสุด:', '{n} files in storage': 'ไฟล์ในที่จัดเก็บ {n} ไฟล์', 'all copied': 'คัดลอกครบแล้ว',
  'No backup has run yet. The first one runs on Sunday at 02:00, or press Back up now.': 'ยังไม่มีการสำรองข้อมูล ครั้งแรกจะทำในวันอาทิตย์ เวลา 02:00 น. หรือกด "สำรองตอนนี้"',
  'Automatic weekly backup': 'สำรองข้อมูลอัตโนมัติทุกสัปดาห์', 'Back up now': 'สำรองตอนนี้', 'Download backup': 'ดาวน์โหลดข้อมูลสำรอง',
  'A zip file with all the data (tasks, people, page access, meetings, trackers, sign-in history) and the current version of every file in Files. Passwords are not included. Save it in the project SharePoint folder and keep it private.': 'ไฟล์ zip ที่มีข้อมูลทั้งหมด (งาน บุคคล สิทธิ์การเข้าถึงหน้า การประชุม ตัวติดตาม ประวัติการเข้าสู่ระบบ) และไฟล์ฉบับล่าสุดทุกไฟล์ในแท็บไฟล์ ไม่มีรหัสผ่าน ให้บันทึกไว้ในโฟลเดอร์ SharePoint ของโครงการและเก็บเป็นความลับ',
  'Include the files (larger download)': 'รวมไฟล์ด้วย (ดาวน์โหลดใหญ่ขึ้น)', 'Backing up… this can take a minute.': 'กำลังสำรองข้อมูล… อาจใช้เวลาประมาณหนึ่งนาที', 'Backup done.': 'สำรองข้อมูลเสร็จแล้ว',
  'Preparing the download… keep this page open.': 'กำลังเตรียมไฟล์ดาวน์โหลด… กรุณาเปิดหน้านี้ไว้', 'Downloaded {name}.': 'ดาวน์โหลด {name} แล้ว', 'The download did not finish. Try again.': 'ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้ง',
  'Saving the data…': 'กำลังบันทึกข้อมูล…', 'Copying files… {n} left. Keep this page open.': 'กำลังคัดลอกไฟล์… เหลือ {n} ไฟล์ กรุณาเปิดหน้านี้ไว้',
  'Backup finished with {n} problems. See the list below.': 'สำรองข้อมูลเสร็จ แต่มีปัญหา {n} รายการ ดูรายการด้านล่าง', 'Backup stopped: files could not be copied. See the list below.': 'การสำรองหยุด: คัดลอกไฟล์ไม่ได้ ดูรายการด้านล่าง',
  'The backup was interrupted. Press Back up now again; it continues where it stopped.': 'การสำรองข้อมูลถูกขัดจังหวะ กด "สำรองตอนนี้" อีกครั้ง ระบบจะทำต่อจากจุดที่หยุด',
  'downloaded a backup (with files)': 'ดาวน์โหลดข้อมูลสำรอง (รวมไฟล์)', 'downloaded a backup (data only)': 'ดาวน์โหลดข้อมูลสำรอง (เฉพาะข้อมูล)', 'ran a backup': 'สำรองข้อมูล',
  'viewed the site as {who}': 'ดูเว็บไซต์ในมุมมองของ {who}', 'View only: you are viewing the site as someone else. Stop viewing to make changes.': 'ดูอย่างเดียว: คุณกำลังดูในมุมมองของคนอื่น กดหยุดดูก่อนจึงจะแก้ไขได้',
};
