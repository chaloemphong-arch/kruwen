// หน้าหัวหน้าเวร (ใบเช็ค): ฟังก์ชันล้วน คืน HTML string · import ได้ใน Node (เทสต์) ไม่แตะ document/window
// ข้อมูลทุกอย่างมาจากหลังบ้าน (headView) หน้าเว็บแค่วาด · escape ทุกข้อความ
// ui: { filter: 'all'|'needs', saving: {[row.key]: true}, thumbs: {[checkinId]: dataUrl} }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]); }

const TONES = ['red', 'orange', 'blue'];
const BAR_TONES = ['info', 'warn', 'lock', 'err'];
const PILLS = ['p-ok', 'p-head', 'p-leave', 'p-miss', 'p-idle'];

// รูปจาก headPhoto (data:image/...;base64) เท่านั้น
function safeImg(url) { return /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(String(url || '')) ? url : ''; }

function lum(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

// สีป้ายรหัสจาก Duties.color: รับเฉพาะ #rgb/#rrggbb แล้วเลือกตัวหนังสือขาวหรือเข้มตามความต่างที่มากกว่า
export function codeStyle(color) {
  const c = String(color || '').trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return '';
  const L = lum(c);
  const white = 1.05 / (L + 0.05), dark = (L + 0.05) / (lum('#1e2b45') + 0.05);
  return 'background:' + c + ';color:var(' + (white >= dark ? '--duty-ink-light' : '--duty-1-1-ink') + ')';
}

function code(row) {
  const st = codeStyle(row.color);
  return '<i class="code"' + (st ? ' style="' + st + '"' : '') + '>' + esc(row.dutyCode) + '</i>';
}

function subLine(sub) {
  return (sub || []).map((s) => (TONES.includes(s.tone) ? '<span class="' + s.tone + '">' + esc(s.text) + '</span>' : esc(s.text))).join(' · ');
}

function pill(row, ui) {
  if (ui && ui.saving && ui.saving[row.key]) return { cls: 'p-idle', text: 'กำลังบันทึก…' };
  const p = row.pill || {};
  return { cls: PILLS.includes(p.cls) ? p.cls : 'p-idle', text: p.text || '' };
}

export function filterRows(rows, mode) {
  return mode === 'needs' ? (rows || []).filter((r) => r.needs) : (rows || []).slice();
}

export function renderRow(row, ui = {}) {
  const p = pill(row, ui);
  const thumb = row.photo ? safeImg(ui.thumbs && ui.thumbs[row.photo.checkinId]) : '';
  return '<div class="nrow" role="button" tabindex="0" data-act="row" data-key="' + esc(row.key) + '"' +
    ' aria-label="' + esc(row.name + ' ' + p.text + ' แตะเพื่อเลือกสถานะ') + '">' +
    code(row) +
    '<span class="nm"><b>' + esc(row.name) + '</b><small>' + subLine(row.sub) + '</small></span>' +
    '<span class="stw">' + (thumb ? '<img class="rthumb" src="' + thumb + '" alt="">' : '') +
    '<span class="pill ' + p.cls + '">' + esc(p.text) + '</span><span class="chev" aria-hidden="true">›</span></span></div>';
}

// วงสีหน้าตัวเลือก: สีเดียวกับป้ายที่จะได้
const BX = {
  head: ['head', '✓'], leave: ['leave', 'ลา'], notfound: ['miss', '✗'], standin: ['head', 'ยืน'],
  restore: ['ok', '↺'], uncover: ['pending', '↺'], clear: ['pending', '↺']
};
const BX_OF_PILL = { 'p-ok': ['ok', '✓'], 'p-head': ['head', '✓'], 'p-leave': ['leave', 'ลา'], 'p-miss': ['miss', '✗'], 'p-idle': ['pending', '–'] };

function option(o, row) {
  const bx = (o.action ? BX[o.action] : BX_OF_PILL[(row.pill || {}).cls]) || ['pending', '›'];
  return '<button class="opt" data-act="opt" data-a="' + esc(o.action) + '"' +
    (o.current ? ' aria-pressed="true"' : '') + (o.disabled ? ' disabled' : '') + '>' +
    '<span class="bx ' + bx[0] + '" aria-hidden="true">' + bx[1] + '</span>' +
    '<span class="ol"><b>' + esc(o.label) + '</b>' + (o.hint ? '<small>' + esc(o.hint) + '</small>' : '') + '</span>' +
    (o.current ? '<span class="cur">✓ ตอนนี้</span>' : '') + '</button>';
}

// sheetUi: { full: dataUrl ของรูปใหญ่ (ยังไม่มี = กำลังโหลด) }
export function renderSheet(row, sheetUi = {}) {
  const opts = row.options || [];
  const first = (row.sub && row.sub[0]) ? row.sub[0].text : '';
  const full = safeImg(sheetUi.full);
  let photo = '';
  if (row.photo) photo = full ? '<img class="bigphoto" src="' + full + '" alt="รูปที่จุดเวรของ ' + esc(row.name) + '">' : '<p class="small muted">กำลังโหลดรูป…</p>';
  const reports = (row.reports || []).map((r) =>
    '<li>' + esc((r.categories || []).join(', ')) + (r.note ? (r.categories && r.categories.length ? ' · ' : '') + esc(r.note) : '') +
    (r.hasPhoto ? ' <span class="muted">(มีรูป)</span>' : '') + '</li>').join('');
  return '<div class="shade" data-act="close"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc('เลือกสถานะ ' + row.name) + '">' +
    '<div class="grab"></div>' +
    '<div class="shhd">' + code(row) + '<div class="minw"><p class="shname">' + esc(row.name) + '</p><p class="small muted">' + esc(first) + '</p></div></div>' +
    (row.note ? '<p class="small">' + esc(row.note) + '</p>' : '') +
    (row.deviceFlag ? '<p class="bar warn rounded">เครื่องเดียวกันลงหลายชื่อวันนี้</p>' : '') +
    photo +
    (opts.length ? '<p class="label">เลือกสถานะ</p>' + opts.map((o) => option(o, row)).join('') : '') +
    (reports ? '<div class="reps"><p class="label">รายงานเหตุการณ์</p><ul>' + reports + '</ul></div>' : '') +
    '<button class="btn ghost shclose" data-act="close">ปิด</button></div>';
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

function header(view, ui) {
  const c = view.counts || {};
  const rows = (view.sessions || []).flatMap((s) => s.rows);
  const n = (cls) => rows.filter((r) => (r.pill || {}).cls === cls).length;
  const pct = (k) => (c.total ? Math.round((k / c.total) * 1000) / 10 : 0);
  const f = ui.filter === 'needs' ? 'needs' : 'all';
  return '<header class="hdr">' +
    '<div class="r1"><b>ตรวจเวรวันนี้</b><span class="small muted">' + esc(view.dateThai) + ' · ' + esc(view.nowHHMM) + '</span></div>' +
    '<p class="small"><b>มาแล้ว ' + Number(c.came || 0) + ' จาก ' + Number(c.total || 0) + ' คน</b> <span class="muted">· ต้องดู ' +
    Number(c.needs || 0) + ' · ลา ' + Number(c.leave || 0) + ' · ยังไม่ถึง ' + Number(c.upcoming || 0) + '</span></p>' +
    '<div class="prog" aria-hidden="true"><i class="i-ok" style="width:' + pct(n('p-ok')) + '%"></i><i class="i-head" style="width:' +
    pct(n('p-head')) + '%"></i><i class="i-leave" style="width:' + pct(n('p-leave')) + '%"></i></div>' +
    '<div class="fchips"><button class="rc" data-act="filter" data-f="all" aria-pressed="' + (f === 'all') + '">ทั้งหมด ' + Number(c.total || 0) +
    '</button><button class="rc" data-act="filter" data-f="needs" aria-pressed="' + (f === 'needs') + '">เฉพาะที่ต้องดู ' + Number(c.needs || 0) +
    '</button></div></header>';
}

export function renderPage(view, ui = {}) {
  const banners = (view.banners || []).map((b) =>
    '<p class="bar ' + (BAR_TONES.includes(b.tone) ? b.tone : 'info') + '">' + esc(b.text) + '</p>').join('');
  let body = '';
  if (view.message && !(view.sessions || []).length) {
    body = '<div class="pad mid center"><p class="title">' + esc(view.message) + '</p></div>';
  } else {
    body = (view.sessions || []).map((s) => {
      const rows = filterRows(s.rows, ui.filter);
      if (!rows.length) return '';
      return '<section><h2 class="grph"><span>' + esc(s.label) + '</span><span>' + esc(s.timeText) + ' น.</span></h2>' +
        rows.map((r) => renderRow(r, ui)).join('') + '</section>';
    }).join('');
    if (!body) body = '<div class="pad mid center"><p>ไม่มีรายการที่ต้องดู</p></div>';
  }
  return header(view, ui) + banners + '<div class="rows">' + body + '</div>' +
    '<p class="hfoot small muted">หัวหน้าเวรวันนี้: ' + (view.headName ? 'ครู' + esc(view.headName) : 'ไม่มี') + '</p>';
}
