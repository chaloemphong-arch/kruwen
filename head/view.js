// หน้าหัวหน้าเวร (ใบเช็ค): ฟังก์ชันล้วน คืน HTML string · import ได้ใน Node (เทสต์) ไม่แตะ document/window
// ข้อมูลทุกอย่างมาจากหลังบ้าน (headView) หน้าเว็บแค่วาด · escape ทุกข้อความ
// ui: { filter: 'all'|'needs', needsKeys: [row.key] (แถวที่ตัวกรองเลือกไว้ตอนแตะ),
//       saving: {[row.key]: { next: {cls, text} }} = กำลังบันทึก: แถวขึ้นป้ายที่จะได้ (option.next จากหลังบ้าน) ทันที + "กำลังบันทึก…"
//               (ไม่มี next = ป้ายเทา "กำลังบันทึก…" แบบเดิม),
//       stale: true = รีเฟรชล่าสุดไม่สำเร็จเพราะเน็ต }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]); }

const TONES = ['red', 'orange', 'blue'];
const BAR_TONES = ['info', 'warn', 'lock', 'err'];
const PILLS = ['p-ok', 'p-head', 'p-leave', 'p-miss', 'p-idle'];

// รูปจาก headPhoto (data:image/...;base64) เท่านั้น
function safeImg(url) { return /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(String(url || '')) ? url : ''; }

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function rgbOf(c) {
  let h = c.slice(1).toLowerCase();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum(rgb) {
  const ch = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
const hex6 = (a) => '#' + a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// เลขจุดจากรหัสเวร: ตัดวงเล็บกะท้ายออก '1(1)' -> '1'
export function pointNo(dutyCode) { return String(dutyCode || '').split('(')[0].trim(); }

// สีป้ายเลขจุดจาก Duties.color: พื้นพาสเทล (ผสมขาว 72%) + ตัวเลขเข้มจนความต่างบนพื้นนั้นอย่างน้อย 4.5 · ไม่ใช่ hex คืน null
export function badgeColors(color) {
  const c = String(color === undefined || color === null ? '' : color).trim();
  if (!HEX.test(c)) return null;
  const rgb = rgbOf(c);
  const tint = rgb.map((v) => v + (255 - v) * 0.72);
  let ink = rgb.slice();
  for (let i = 0; i < 60 && ratio(ink, tint) < 4.5; i++) ink = ink.map((v) => v * 0.88);
  return { bg: hex6(tint), ink: hex6(ink) };
}

// ป้ายเลขจุด (แทนรหัสเวรเดิม): สีเดียวกับจุดนั้นทั้งเช้าและเย็น
function pno(row) {
  const bc = badgeColors(row.color);
  return '<span class="pno"' + (bc ? ' style="--tint:' + bc.bg + ';--ink:' + bc.ink + '"' : '') + '>' + esc(pointNo(row.dutyCode)) + '</span>';
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

// วงสีหน้าตัวเลือก: สีเดียวกับป้ายที่จะได้
const BX = {
  head: ['ok', '✓'], leave: ['leave', 'ลา'], notfound: ['miss', '✗'], standin: ['head', 'แทน'],
  restore: ['ok', '↺'], uncover: ['pending', '↺'], clear: ['pending', '↺']
};
const BX_OF_PILL = { 'p-ok': ['ok', '✓'], 'p-head': ['head', '✓'], 'p-leave': ['leave', 'ลา'], 'p-miss': ['miss', '✗'], 'p-idle': ['pending', '–'] };

// ตัวเลือกที่ยังกดไม่ได้แต่มีเหตุผล (เช่น ยังไม่ถึงเวลา): ไม่เขียนเหตุผลใต้ปุ่ม แตะแล้วขึ้นแถบแจ้งแทน (app.js choose)
function option(o, row) {
  const bx = (o.action ? BX[o.action] : BX_OF_PILL[(row.pill || {}).cls]) || ['pending', '›'];
  const tapHint = o.hint && o.disabled && !o.current;
  return '<button class="opt" data-act="opt" data-a="' + esc(o.action) + '"' + (o.leaveType ? ' data-t="' + esc(o.leaveType) + '"' : '') +
    (o.current ? ' aria-pressed="true"' : '') + (tapHint ? ' aria-disabled="true"' : o.disabled ? ' disabled' : '') + '>' +
    '<span class="bx ' + bx[0] + '" aria-hidden="true">' + bx[1] + '</span>' +
    '<span class="ol"><b>' + esc(o.label) + '</b></span>' +
    '</button>';
}

// sheetUi: { full: dataUrl ของรูปใหญ่ (ยังไม่มี = กำลังโหลด), failed: true = โหลดรูปไม่สำเร็จ }
export function renderSheet(row, sheetUi = {}) {
  const opts = row.options || [];
  const full = safeImg(sheetUi.full);
  let photo = '';
  if (row.photo) {
    photo = full ? '<img class="bigphoto" src="' + full + '" alt="รูปที่จุดเวรของ ' + esc(row.name) + '">'
      : '<p class="small muted">' + (sheetUi.failed ? 'เปิดรูปไม่ได้' : 'กำลังโหลดรูป…') + '</p>';
  }
  const reports = (row.reports || []).map((r) =>
    '<li>' + esc((r.categories || []).join(', ')) + (r.note ? (r.categories && r.categories.length ? ' · ' : '') + esc(r.note) : '') +
    (r.hasPhoto ? ' <span class="muted">(มีรูป)</span>' : '') + '</li>').join('');
  return '<div class="shade" data-act="close"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(row.name) + '">' +
    '<div class="grab"></div>' +
    '<div class="shhd">' + pno(row) + '<div class="minw"><p class="shname">' + esc(row.name) + '</p></div></div>' +
    (row.detail || []).map((d) => '<p class="small' + (TONES.includes(d.tone) ? ' ' + d.tone : '') + '">' + esc(d.text) + '</p>').join('') +
    (row.note ? '<p class="small">' + esc(row.note) + '</p>' : '') +
    (row.deviceFlag ? '<p class="bar warn rounded">เครื่องเดียวกันลงหลายชื่อวันนี้</p>' : '') +
    photo +
    opts.map((o) => option(o, row)).join('') +
    (reports ? '<div class="reps"><p class="label">รายงานเหตุการณ์</p><ul>' + reports + '</ul></div>' : '') +
    '<button class="shclose" data-act="close">ปิด</button></div>';
}

// toast: { text, undo: boolean }
export function renderToast(toast) {
  if (!toast) return '';
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
function icon(session) {
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    ICON[session.session === 'เย็น' ? 'house' : 'sun'] + '</svg>';
}

// แท็บช่วงเวร (ขึ้นเมื่อมีตั้งแต่ 2 ช่วง) · จุดแดง = มีแถวในช่วงนั้นที่หัวหน้าเวรต้องดู
function tabBar(view, tab) {
  const ss = view.sessions || [];
  if (ss.length < 2) return '';
  return '<div class="stabs" role="tablist">' + ss.map((s, i) =>
    '<button class="stab" role="tab" data-act="tab" data-i="' + i + '" aria-selected="' + (i === tab) + '">' + icon(s) +
    '<span class="sl">' + esc(s.label) + '</span>' +
    (s.rows.some((r) => r.needs) ? '<span class="need" aria-label="มีรายการที่ต้องดู"></span>' : '') +
    '<small>' + esc(s.timeText) + '</small><span class="sbar"></span></button>').join('') + '</div>';
}

function header(view) {
  const title = pageTitle(view);
  return '<header class="hdr">' +
    (view.nav
      ? '<div class="r1"><b>' + title + '</b>' +
        (view.isToday === false ? '<button class="dtoday" data-act="today">กลับวันนี้</button>' : '') + '</div>' + dayNav(view)
      : '<div class="r1"><b>' + title + '</b><span class="muted">' + esc(view.dateThai) + ' · ' + esc(view.nowHHMM) + '</span></div>') +
    (view.canClearAll ? '<button class="clr" data-act="clearall">ล้างสถานะทั้งหมด</button>' : '') +
    '</header>';
}

// ลูกศร ‹ › เลื่อนวัน (หลังบ้านคำนวณวันก่อน/ถัดไปตามสิทธิ์: แอดมินทีละวัน หัวหน้าเวรทีละสัปดาห์) · วันอื่นมีปุ่มกลับวันนี้
function dayNav(view) {
  const nav = view.nav;
  if (!nav) return '';
  const btn = (d, label, ch) => '<button class="dn" data-act="day" data-d="' + esc(d || '') + '" aria-label="' + label + '"' + (d ? '' : ' disabled') + '>' + ch + '</button>';
  const label = view.isToday === false ? (view.weekdayThai ? view.weekdayThai + ' ' : '') + view.dateThai : view.dateThai + ' · ' + view.nowHHMM;
  return '<div class="dnav">' + btn(nav.prev, 'วันก่อน', '‹') + '<span class="dl">' + esc(label) + '</span>' + btn(nav.next, 'วันถัดไป', '›') + '</div>';
}

// ไม่แสดง: แถบ "ล็อกแล้ว" (20 พ.ย. 2569: ซ่อนไว้ก่อน) และ สาย/ตรงเวลา
// ui.tab = ช่วงที่เลือก (ตัวเลข) · หนึ่งช่วง = หนึ่ง panel · หนึ่งจุด = การ์ดหนึ่งใบ (จัดกลุ่มตาม dutyCode ตามลำดับหลังบ้าน)
// ไม่มีตัวเลขสรุปและบรรทัดชื่อหัวหน้าเวร (20 พ.ย.): สรุปข้อมูลทำแยกทีหลัง
export function renderPage(view, ui = {}) {
  const banners = (ui.stale ? '<p class="bar warn">ข้อมูลอาจไม่ล่าสุด · เช็คสัญญาณอินเทอร์เน็ต</p>' : '') + (view.banners || []).filter((b) => b.tone !== 'lock').map((b) =>
    '<p class="bar ' + (BAR_TONES.includes(b.tone) ? b.tone : 'info') + '">' + esc(b.text) + '</p>').join('');
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
