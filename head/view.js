// หน้าหัวหน้าเวร (ใบเช็ค): ฟังก์ชันล้วน คืน HTML string · import ได้ใน Node (เทสต์) ไม่แตะ document/window
// ข้อมูลทุกอย่างมาจากหลังบ้าน (headView) หน้าเว็บแค่วาด · escape ทุกข้อความ
// ui: { filter: 'all'|'needs', needsKeys: [row.key] (แถวที่ตัวกรองเลือกไว้ตอนแตะ),
//       saving: {[row.key]: { next: {cls, text} }} = กำลังบันทึก: แถวขึ้นป้ายที่จะได้ (option.next จากหลังบ้าน) ทันที + "กำลังบันทึก…"
//               (ไม่มี next = ป้ายเทา "กำลังบันทึก…" แบบเดิม),
//       stale: true = รีเฟรชล่าสุดไม่สำเร็จเพราะเน็ต }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]); }

const TONES = ['red', 'orange', 'blue'];
const PILLS = ['p-ok', 'p-head', 'p-leave', 'p-miss', 'p-idle'];

// รูปจาก headPhoto (data:image/...;base64) เท่านั้น
function safeImg(url) { return /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(String(url || '')) ? url : ''; }

// เลขจุดจากรหัสเวร: ตัดวงเล็บกะท้ายออก '1(1)' -> '1'
export function pointNo(dutyCode) { return String(dutyCode || '').split('(')[0].trim(); }

// ป้ายเลขจุด (แทนรหัสเวรเดิม): สี่เหลี่ยมเทา เลขดำ เหมือนกันทุกจุด (23 พ.ย. 2569: ไม่ใช้สีจุดแล้ว)
function pno(row) {
  return '<span class="pno">' + esc(pointNo(row.dutyCode)) + '</span>';
}

function subLine(sub) {
  return (sub || []).map((s) => (TONES.includes(s.tone) ? '<span class="' + s.tone + '">' + esc(s.text) + '</span>' : esc(s.text))).join(' · ');
}

const SAVING = 'กำลังบันทึก…';

function savingOf(row, ui) { return (ui && ui.saving && ui.saving[row.key]) || null; }

// ป้ายของแถว: กำลังบันทึกและรู้ผล (next) = ป้ายที่จะได้ · กำลังบันทึกแต่ไม่รู้ผล = ป้ายเทา · ปกติ = ป้ายจากหลังบ้าน
function pill(row, ui) {
  const sv = savingOf(row, ui);
  const p = sv ? (sv.next || { cls: 'p-idle', text: SAVING }) : (row.pill || {});
  // "(สาย)" ใต้เวลาเห็นเฉพาะแอดมินและผู้บริหาร (ui.showLate) หัวหน้าเวรเห็นแค่เวลา
  return { cls: PILLS.includes(p.cls) ? p.cls : 'p-idle', text: p.text || '', late: !!(p.late && ui && ui.showLate) };
}

export function filterRows(rows, mode) {
  return mode === 'needs' ? (rows || []).filter((r) => r.needs) : (rows || []).slice();
}

// ตัวกรอง "เฉพาะที่ต้องดู" หลังรีเฟรชจากหลังบ้าน: เพิ่มแถวที่เพิ่งต้องดู ไม่เอาแถวไหนออก (แถวไม่หายใต้นิ้ว)
// keys = null (ไม่ได้กรอง) คืน null · ลำดับแถวบนจอยังตามหลังบ้าน (renderPage กรองตามชุด key)
export function mergeNeedsKeys(keys, view) {
  if (!Array.isArray(keys)) return keys === undefined ? null : keys;
  const out = keys.slice();
  ((view && view.sessions) || []).forEach((s) => s.rows.forEach((r) => { if (r.needs && !out.includes(r.key)) out.push(r.key); }));
  return out;
}

export function renderRow(row, ui = {}) {
  const p = pill(row, ui);
  const sv = savingOf(row, ui);
  const marked = !!(sv && sv.next); // ป้ายที่จะได้ขึ้นแล้ว: บอกในบรรทัดรองว่ายังบันทึกอยู่
  return '<div class="nrow" role="button" tabindex="0" data-act="row" data-key="' + esc(row.key) + '"' +
    ' aria-label="' + esc(row.name + ' ' + p.text + (p.late ? ' สาย' : '') + (marked ? ' ' + SAVING : '') + ' แตะเพื่อเลือกสถานะ') + '">' +
    pno(row) +
    '<span class="nm"><b>' + esc(row.name) + '</b><small>' +
    [marked ? '<span class="muted saving">' + SAVING + '</span>' : '', subLine(row.sub)].filter(Boolean).join(' · ') + '</small></span>' +
    '<span class="st ' + p.cls + (p.late ? ' two' : '') + '">' + esc(p.text) + (p.late ? '<small class="late">(สาย)</small>' : '') + '</span></div>';
}

// ไอคอน lucide ของแผ่นเลือกสถานะ (คัดจาก HeadOptions.mock.html): ถูก · ใบลา · กากบาท · นาฬิกา · แม่กุญแจ
const SI = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  miss: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  leave: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
function ico(k) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + SI[k] + '</svg>'; }
const SLOT_LABEL = { ok: 'มา', leave: 'ลา', miss: 'ขาด' };

// ตัวเลือกของแถว: หลังบ้านเก่า (ตอน deploy) ไม่ส่ง slot ให้ → เดาจาก action (action ว่าง = ค่าปัจจุบัน ดูจากป้ายของแถว)
const SLOT_OF = { head: 'ok', leave: 'leave', absent: 'miss', notfound: 'miss', clear: 'link', restore: 'link', uncover: 'link' };
const SLOT_OF_PILL = { 'p-ok': 'ok', 'p-head': 'ok', 'p-leave': 'leave', 'p-miss': 'miss' };
function optsOf(row) {
  return (row.options || []).map((o) => o.slot ? o : Object.assign({}, o, {
    slot: SLOT_OF[o.action] || (!o.action ? SLOT_OF_PILL[row.pill && row.pill.cls] : '') || ''
  }));
}

// วงกลมหนึ่งช่อง: usable = data-act opt (หรือ leaveOpen ถ้าลามีประเภท) · ปิดอยู่แต่มีเหตุผล = data-act hint (แตะแล้วขึ้นแจ้ง) · ไม่มีตัวเลือก/เป็นค่าปัจจุบัน = ไม่มี data-act
function circle(slot, row, sheetUi) {
  const all = optsOf(row);
  const opts = all.filter((o) => o.slot === slot);
  const types = slot === 'leave' ? opts.filter((o) => o.leaveType) : [];
  const open = !!sheetUi.leaveOpen && types.length > 0;
  // แถวเป็นลาแต่ประเภทที่บันทึกไว้ไม่มี/ไม่อยู่ในรายการแล้ว: ไม่มีตัวเลือกไหนเป็นค่าปัจจุบัน → ถือว่าช่องลากดอยู่ตามป้ายของแถว
  const cur = opts.find((o) => o.current) || (slot === 'leave' && row.pill && row.pill.cls === 'p-leave' ? { leaveType: '' } : null);
  const hintOpt = opts.length && opts.every((o) => o.disabled && o.hintKind) ? opts[0] : null;
  const usable = opts.find((o) => !o.disabled);
  let attrs = '';
  // แผ่นที่ล็อก: ช่องที่ไม่มีตัวเลือกก็แตะแล้วขึ้นแจ้งล็อกเหมือนช่องอื่น (app.js หาข้อความล็อกจากตัวเลือกอื่นของแถว)
  const locked = all.some((o) => o.hintKind === 'lock');
  if (!opts.length) attrs = locked ? ' data-act="hint" data-s="' + slot + '" aria-disabled="true"' : ' aria-disabled="true"';
  else if (hintOpt) attrs = ' data-act="hint" data-s="' + slot + '" aria-disabled="true"';
  else if (types.length && (usable || cur)) attrs = ' data-act="leaveOpen"';
  else if (usable) attrs = ' data-act="opt" data-a="' + esc(usable.action) + '"';
  // เปิดรายการประเภทลาอยู่ = มีแต่ปุ่มลาที่เต็มสี ปุ่มอื่นไม่เต็ม
  const pressed = !!cur && !(sheetUi.leaveOpen && slot !== 'leave');
  const pressedAttr = pressed && !open ? ' aria-pressed="true"' : '';
  const caption = slot === 'leave' && cur && !open && (row.leaveType || cur.leaveType)
    ? '<small>(' + esc(row.leaveType || cur.leaveType) + ')</small>' : '';
  return '<button class="rnd ' + slot + '"' + attrs + (open ? ' aria-expanded="true"' : '') + pressedAttr + '>' +
    '<span class="cir">' + ico(slot) + '</span>' + SLOT_LABEL[slot] + caption + '</button>';
}

// ประเภทลา (แคปซูล): ขึ้นเมื่อแตะวงลา · ประเภทที่บันทึกไว้ = ปุ่มที่กดอยู่ (ไม่มี data-act)
function leavePills(row) {
  return '<div class="pills">' + optsOf(row).filter((o) => o.slot === 'leave' && o.leaveType).map((o) =>
    '<button class="p"' + (o.current ? ' aria-pressed="true"' : o.disabled ? ' aria-disabled="true"' : ' data-act="opt" data-a="' + esc(o.action) + '" data-t="' + esc(o.leaveType) + '"') + '>' +
    esc(o.leaveType) + '</button>').join('') + '</div>';
}

// sheetUi: { full: dataUrl ของรูปใหญ่ (ยังไม่มี = กำลังโหลด), failed: true = โหลดรูปไม่สำเร็จ, leaveOpen: true = เปิดรายการประเภทลา }
export function renderSheet(row, sheetUi = {}) {
  const opts = optsOf(row);
  const full = safeImg(sheetUi.full);
  let photo = '';
  // แถว notfound ที่มีรูปหลักฐาน: แสดงรูปหลักฐานแทนรูปตอนสแกน (app.js ส่ง full เป็นรูปที่ตรงกับแถวนี้)
  if (row.photo || row.evidence) {
    photo = full ? '<img class="bigphoto" src="' + full + '" alt="รูปที่จุดเวรของ ' + esc(row.name) + '">'
      : '<div class="phbox">' + (sheetUi.failed ? 'เปิดรูปไม่ได้' : 'กำลังโหลดรูป…') + '</div>';
  }
  const reports = (row.reports || []).map((r) =>
    '<li>' + esc((r.categories || []).join(', ')) + (r.note ? (r.categories && r.categories.length ? ' · ' : '') + esc(r.note) : '') +
    (r.hasPhoto ? ' <span class="muted">(มีรูป)</span>' : '') + '</li>').join('');
  const hasTypes = opts.some((o) => o.slot === 'leave' && o.leaveType);
  const links = opts.filter((o) => o.slot === 'link' && !o.disabled).map((o) =>
    '<button class="clear" data-act="opt" data-a="' + esc(o.action) + '">' + esc(o.label) + '</button>').join('');
  return '<div class="shade" data-act="close"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(row.name) + '">' +
    '<div class="grab"></div>' +
    '<div class="shhd">' + pno(row) + '<div class="minw"><p class="shname">' + esc(row.name) + '</p></div></div>' +
    (row.detail || []).map((d) => '<p class="small' + (TONES.includes(d.tone) ? ' ' + d.tone : '') + '">' + esc(d.text) + '</p>').join('') +
    (row.note ? '<p class="small">' + esc(row.note) + '</p>' : '') +
    (row.deviceFlag ? '<p class="bar warn rounded">เครื่องเดียวกันลงหลายชื่อวันนี้</p>' : '') +
    photo +
    // ผู้บริหารที่ดูอย่างเดียวไม่มีตัวเลือกเลย: ไม่วาดแถววงกลม
    (opts.length ? '<div class="rounds">' + ['ok', 'leave', 'miss'].map((k) => circle(k, row, sheetUi)).join('') + '</div>' : '') +
    (sheetUi.leaveOpen && hasTypes ? leavePills(row) : '') +
    links +
    (reports ? '<div class="reps"><p class="label">รายงานเหตุการณ์</p><ul>' + reports + '</ul></div>' : '') +
    '<button class="shclose" data-act="close">ปิด</button></div>';
}

// toast: { text, undo: boolean, kind: 'time' | 'lock' | undefined }
export function renderToast(toast) {
  if (!toast) return '';
  if (toast.kind === 'time') return '<div class="toast fit" role="status">' + ico('clock') + '<span>' + esc(toast.text) + '</span></div>';
  if (toast.kind === 'lock') {
    return '<div class="toast fit two" role="status"><span class="l1">' + ico('lock') + esc(toast.text) +
      '</span><span class="l2">กรุณาติดต่อแอดมินเพื่อทำการแก้ไข</span></div>';
  }
  return '<div class="toast" role="status"><span>' + esc(toast.text) + '</span>' +
    (toast.undo ? '<button data-act="undo">เลิกทำ</button>' : '') + '</div>';
}

// หน้าเต็มจอ (not_head / not_bound / auth / ผิดพลาด) · link: { href, label } ไปหน้าเวรของฉัน
export function renderMessage(title, text, link) {
  return '<div class="pad mid center"><p class="title">' + esc(title) + '</p><p>' + esc(text) + '</p>' +
    (link ? '<a class="btn pri" href="' + esc(link.href) + '">' + esc(link.label) + '</a>' : '') + '</div>';
}

// ชื่อหน้า: วันนี้ / ย้อนหลัง / วันที่กำลังจะมาถึง (หลังบ้านใส่ preview ให้วันอนาคต)
export function pageTitle(view) {
  if (view && view.isToday === false) return view.preview ? 'เวรที่กำลังจะมาถึง' : 'สถานะเวรย้อนหลัง';
  return 'สถานะเวรวันนี้';
}

// แท็บเริ่มต้น: วันอื่น = ช่วงแรก · วันนี้ = ช่วงแรกที่ยังไม่จบ (เวลาจบ > nowHHMM) · จบหมดแล้ว = ช่วงสุดท้าย
export function defaultTab(view) {
  const ss = (view && view.sessions) || [];
  if (!ss.length || view.isToday === false) return 0;
  const now = String(view.nowHHMM || '').replace(':', '.');
  const i = ss.findIndex((s) => { const end = String(s.timeText || '').split('–')[1]; return end && end > now; });
  return i < 0 ? ss.length - 1 : i;
}

export function clampTab(tab, view) {
  const n = ((view && view.sessions) || []).length;
  return Number.isInteger(tab) && tab >= 0 && tab < n ? tab : 0;
}

// ไอคอน lucide: เช้า = sun · เย็น = house
const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
};
export function sessionIcon(session) {
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    ICON[session.session === 'เย็น' ? 'house' : 'sun'] + '</svg>';
}

// แท็บช่วงเวร (ขึ้นเมื่อมีตั้งแต่ 2 ช่วง) · จุดแดง = มีแถวในช่วงนั้นที่หัวหน้าเวรต้องดู
function tabBar(view, tab) {
  const ss = view.sessions || [];
  if (ss.length < 2) return '';
  return '<div class="stabs" role="tablist">' + ss.map((s, i) =>
    '<button class="stab" role="tab" tabindex="' + (i === tab ? '0' : '-1') + '" data-act="tab" data-i="' + i + '" aria-selected="' + (i === tab) + '">' +
    // ไอคอนกับจุดแดงลอยข้างชื่อ ชื่อช่วงกับเวลาจึงอยู่กึ่งกลางตรงกัน
    '<span class="tl">' + sessionIcon(s) + '<span class="sl">' + esc(s.label) + '</span>' +
    (s.rows.some((r) => r.needs) ? '<span class="need" aria-label="มีรายการที่ต้องดู"></span>' : '') + '</span>' +
    // เวลาที่โชว์บนแท็บ (shownTime จากค่าตั้ง) อาจต่างจากเวลาสแกนจริง (timeText)
    '<small>' + esc(s.shownTime || s.timeText) + '</small><span class="sbar"></span></button>').join('') + '</div>';
}

function header(view) {
  const title = pageTitle(view);
  const solo = (view.sessions || []).length < 2;
  return '<header class="hdr' + (solo ? ' solo' : '') + '">' +
    (view.nav
      ? '<div class="r1"><b>' + title + '</b></div>' + dayNav(view)
      : '<div class="r1"><b>' + title + '</b><span class="muted">' + esc(view.dateThai) + ' · ' + esc(view.nowHHMM) + '</span></div>') +
    (view.canClearAll ? '<button class="clr" data-act="clearall">ล้างสถานะทั้งหมด</button>' : '') +
    '</header>';
}

// ไอคอนปฏิทิน (คัดจาก HeadHeader.mock.html)
const CAL = '<svg class="cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

// แคปซูลวันที่สีเทา: ‹ วันเวรก่อน · แตะวันที่ = เปิดปฏิทิน · วันเวรถัดไป › (วันก่อน/ถัดไปหลังบ้านคำนวณจากรายการวันเวรของผู้ใช้)
function dayNav(view) {
  const nav = view.nav;
  if (!nav) return '';
  const btn = (d, label, ch) => '<button class="dn" data-act="day" data-d="' + esc(d || '') + '" aria-label="' + label + '"' + (d ? '' : ' disabled') + '>' + ch + '</button>';
  const label = view.isToday === false ? (view.weekdayThai ? view.weekdayThai + ' ' : '') + view.dateThai : view.dateThai + ' · ' + view.nowHHMM;
  return '<div class="dnav">' + btn(nav.prev, 'วันก่อน', '‹') +
    '<button class="dl" data-act="cal" aria-haspopup="dialog">' + CAL + esc(label) + '</button>' + btn(nav.next, 'วันถัดไป', '›') + '</div>';
}

const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_WEEK = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

// 'YYYY-MM' เลื่อนทีละเดือน
export function shiftMonth(ym, n) {
  const [y, m] = String(ym).split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
}

// ปฏิทินเลือกวัน (แผ่นจากล่าง): กดได้เฉพาะวันในรายการวันเวร (dates) · จุดอำพัน = วันนี้ · วงดำ = วันที่เปิดอยู่ · มีแต่ปุ่มปิด
export function renderCalendar(month, dates, today, selected) {
  const [y, mo] = String(month).split('-').map(Number);
  const list = dates || [];
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const head = String(month) + '-01';
  const has = (pred) => list.some(pred);
  const monthBtn = (m, label, ch, off) => '<button data-act="calMonth" data-m="' + m + '" aria-label="' + label + '"' + (off ? ' disabled' : '') + '>' + ch + '</button>';
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++) {
    const k = month + '-' + String(d).padStart(2, '0');
    const duty = list.includes(k);
    cells += '<button class="d ' + (duty ? 'duty' : 'off') + (k === today ? ' today' : '') + (k === selected ? ' sel' : '') + '"' +
      (duty ? ' data-act="calDay" data-d="' + k + '"' : ' disabled') + '>' + d + '</button>';
  }
  return '<div class="shade" data-act="calClose"></div>' +
    '<div class="csheet" role="dialog" aria-modal="true" aria-label="เลือกวันที่">' +
    '<div class="grab"></div>' +
    '<div class="mrow">' + monthBtn(shiftMonth(month, -1), 'เดือนก่อน', '‹', !has((d) => d < head)) +
    '<b>' + TH_MONTH[mo - 1] + ' ' + (y + 543) + '</b>' +
    monthBtn(shiftMonth(month, 1), 'เดือนถัดไป', '›', !has((d) => d >= shiftMonth(month, 1) + '-01')) + '</div>' +
    '<div class="wk">' + TH_WEEK.map((w) => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="days">' + cells + '</div>' +
    '<button class="shclose" data-act="calClose">ปิด</button></div>';
}

// ไม่แสดง: แถบ "ล็อกแล้ว" (20 พ.ย. 2569: ซ่อนไว้ก่อน) และ สาย/ตรงเวลา
// ui.tab = ช่วงที่เลือก (ตัวเลข) · หนึ่งช่วง = หนึ่ง panel · หนึ่งจุด = การ์ดหนึ่งใบ (จัดกลุ่มตาม dutyCode ตามลำดับหลังบ้าน)
// ไม่มีตัวเลขสรุปและบรรทัดชื่อหัวหน้าเวร (20 พ.ย.): สรุปข้อมูลทำแยกทีหลัง
export function renderPage(view, ui = {}) {
  // หลังบ้านไม่ส่งแถบแจ้งแล้ว: เหลือแถบ "ข้อมูลอาจไม่ล่าสุด" ของหน้าเว็บเอง
  const banners = ui.stale ? '<p class="bar warn">ข้อมูลอาจไม่ล่าสุด · เช็คสัญญาณอินเทอร์เน็ต</p>' : '';
  let body = '';
  if (view.message && !(view.sessions || []).length) {
    body = '<div class="pad mid center"><p class="title">' + esc(view.message) + '</p></div>';
  } else {
    // ตัวกรอง "เฉพาะที่ต้องดู" ตรึงชุดแถวที่เห็นตอนแตะ: แถวที่เพิ่งเปลี่ยนไม่หายใต้นิ้ว (แถวไม่สลับที่)
    const pinned = ui.filter === 'needs' && Array.isArray(ui.needsKeys) ? ui.needsKeys : null;
    const panels = (view.sessions || []).map((s, i) => {
      const rows = pinned ? s.rows.filter((r) => pinned.includes(r.key)) : filterRows(s.rows, ui.filter);
      const codes = [];
      rows.forEach((r) => { if (!codes.includes(r.dutyCode)) codes.push(r.dutyCode); });
      const cards = codes.map((cd) => {
        const g = rows.filter((r) => r.dutyCode === cd);
        // เวลาที่หัวการ์ดขึ้นเฉพาะเมื่อต่างจากเวลาของช่วง
        const tm = g[0].timeText && g[0].timeText !== s.timeText ? '<span class="tm">' + esc(g[0].timeText) + '</span>' : '';
        return '<div class="grp"><div class="sub"><span class="pn">' + esc(g[0].place || 'เวร ' + cd) + '</span>' + tm + '</div><div class="card">' +
          g.map((r) => renderRow(r, ui)).join('') + '</div></div>';
      }).join('');
      return '<section class="panel" data-i="' + i + '" role="tabpanel">' + (cards || '<div class="pad mid center"><p>ไม่มีรายการที่ต้องดู</p></div>') + '</section>';
    }).join('');
    body = tabBar(view, clampTab(ui.tab, view)) + '<div class="pager" id="hpager">' + panels + '</div>';
  }
  return header(view) + banners + body;
}

// ---------- ✗ ที่แถวที่สแกนแล้ว: กล้องสด + ตรวจรูปก่อนบันทึก (หน้าตาเดียวกับ cam()/preview() ของหน้าครู ใช้ CSS .camv/.vf/.cambar/.shutter/.pvimg/.btn จาก app.css) ----------
// true เฉพาะ action notfound ที่ตัวเลือกกดได้ (แถวล็อก/กดไม่ได้ = ไม่เปิดกล้อง)
export function needsEvidence(row, action) {
  if (action !== 'notfound' || !row) return false;
  const o = (row.options || []).find((x) => x.action === 'notfound');
  return !!o && !o.disabled;
}

export function renderHeadCam() {
  return '<div class="camv"><div class="vf"><video id="hvideo" playsinline muted autoplay></video><div class="tip">ถ่ายรูปที่จุดเวร</div></div>' +
    '<div class="cambar"><button class="l" data-act="hcCancel">ยกเลิก</button>' +
    '<button class="shutter" data-act="hcShot" aria-label="ถ่ายรูป"></button><span></span></div></div>';
}

export function renderHeadPreview(img, sending) {
  const src = safeImg(img);
  return '<div class="hprev"><div class="pad top"><p class="h1">ตรวจรูปก่อนบันทึก</p>' +
    (src ? '<img class="pvimg" src="' + src + '" alt="รูปที่ถ่าย">' : '') +
    (sending ? '<div class="pbar"><i></i></div><p class="small muted center">กำลังบันทึก</p>'
      : '<button class="btn pri" data-act="hcUse">ใช้รูปนี้</button><button class="btn" data-act="hcRetake">ถ่ายใหม่</button>') +
    '</div></div>';
}
