// หน้าจอของหน้าครูเวร: ทุกฟังก์ชันเป็นฟังก์ชันล้วน (state → HTML string) ไม่แตะ DOM
import { withTitle, firstWithTitle } from './names.js';
// หน้าตาและข้อความตามเดโม เดโมระบบครูเวร.html (V.*) ข้อมูลมาจากผล call() ของหลังบ้าน

// ฟังก์ชันที่ export แต่ไม่ใช่หน้าจอ
// kept for one release so an old cached app.js (which still calls V.header) keeps working
export const header = () => '';
export const HELPERS = ['header', 'reportButton', 'firstName', 'placeFull', 'placeShort', 'relDay'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hmd = (hhmm) => esc(String(hhmm || '').replace(':', '.'));
const toMin = (hhmm) => { const p = String(hhmm || '0:0').split(':'); return Number(p[0]) * 60 + Number(p[1]); };
const kru = withTitle;
// ชื่อแรกของครู (ตัด "ครู" นำหน้า) และชื่อสถานที่ (เต็ม/สั้น) — ผู้เรียกต้อง esc เอง
export const firstName = firstWithTitle;
export const placeFull = (d) => (d && (d.title || d.point || d.code)) || '';
export const placeShort = (d) => (d && (d.short || d.point || d.code)) || '';
const kruFirst = (name) => withTitle(firstName(name));
const rng = (d) => `${hmd(d.start)}–${hmd(d.end)}`;
const TMON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
// ชื่อช่วงเวรที่ครูเห็น (23 พ.ย. 2569: ตรงกับแท็บใบเช็ค) · ค่า session ในข้อมูลยังเป็น เช้า/เย็น
const SESSION_NAME = { 'เช้า': 'ช่วงเช้า', 'เย็น': 'หลังเลิกเรียน' };
const ymdParts = (ymd) => String(ymd).split('-').map(Number);
const dayMonth = (ymd) => { const [, m, d] = ymdParts(ymd); return d + ' ' + TMON[m - 1]; };
const thaiDay = (ymd) => { const [y, m, d] = ymdParts(ymd); return DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ' ' + d + ' ' + TMON[m - 1]; };
const thaiMonth = (ym) => { const [y, m] = ymdParts(ym); return TMON[m - 1] + ' ' + (y + 543); };

const ICON = {
  checkS: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  checkBig: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A96AA" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  chevL: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chevR: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/></svg>',
  alert: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.2"/></svg>',
  cam: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  clock: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lock: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  wifi: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 9a14 14 0 0118 0M6.5 12.5a9 9 0 0111 0M10 16a4 4 0 014 0"/><path d="M4 4l16 16"/></svg>',
  swap: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  flip: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9a8 8 0 0114-3l2 2M20 4v4h-4M20 15a8 8 0 01-14 3l-2-2M4 20v-4h4"/></svg>'
};

const myLink = '<button class="link" data-act="my">ดูเวรของฉัน</button>';
const dock = (inner) => `<div class="dock">${inner}</div>`;
const who = (name) => (kruFirst(name) ? kruFirst(name) + ' ' : 'มีคน');
const NOT_RECORDED = '<p class="small muted">ยังไม่ได้บันทึกการลงเวร</p>';
// หน้าข้อความกลางจอ: วงกลมไอคอน + หัวเรื่อง + บรรทัดข้อความ; foot เป็นลิงก์ (อยู่ใน .pad) หรือ dock (อยู่นอก .pad)
// title ถูก esc ในนี้; lines/foot เป็น HTML ที่ผู้เรียกประกอบและ esc ข้อมูลเองแล้ว
function notice({ ring, icon, title, lines, foot }) {
  const f = foot || '';
  const inDock = f.startsWith('<div class="dock"');
  return `<div class="pad"><div class="mid"><div class="ring ${ring}">${icon}</div><p class="big bal">${esc(title)}</p>${lines || ''}</div>${inDock ? '' : f}</div>${inDock ? f : ''}`;
}

export function loading(st = {}) {
  return `<div class="pad"><div class="mid"><div class="spin"></div><p class="loadtxt">${esc(st.title || 'กำลังโหลด')}</p></div></div>`;
}

export function welcome(st = {}) {
  return `<div class="pad"><div class="mid"><div class="ring info">${ICON.users}</div>
  <p class="h1 wel">ยินดีต้อนรับ</p>${st.school ? `<p class="lead muted">${esc(st.school)}</p>` : ''}</div></div>
  ${dock('<button class="btn pri" data-act="pickFromMy">เลือกชื่อของฉัน</button>')}`;
}

export function searchResults(st = {}) {
  const q = String(st.query || '').trim();
  if (!q) return '';
  if (st.error) return `<p class="small err">${esc(st.error)}</p>`;
  if (!st.results) return '<p class="small muted">กำลังค้นหา…</p>';
  if (!st.results.length) return '<p class="small muted">ไม่พบชื่อนี้ แจ้งแอดมิน</p>';
  return st.results.map((t) => `<button class="namebtn" data-act="pickName" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}">${esc(kru(t.name))}</button>`).join('');
}

// mode: 'scan' (สแกนครั้งแรก) | 'my' (จากเวรของฉัน) | 'rename' (หลังลงเวร) | 'change' (เปลี่ยนชื่อก่อนลงเวรครั้งแรก)
export function pick(st) {
  const mode = st.mode, changing = mode === 'rename' || mode === 'change';
  const cands = mode === 'scan' ? (st.candidates || []) : [];
  const sug = cands.length ? `<p class="small strong brand">ครูที่มีเวรจุดนี้ตอนนี้</p>
    ${cands.map((t) => `<button class="btn sug" data-act="pickName" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}">${esc(kru(t.name))}</button>`).join('')}` : '';
  return `<div class="pad top"><p class="h1">${changing ? 'เปลี่ยนชื่อ' : 'เลือกชื่อของคุณ'}</p>${sug}
  <label class="small muted" for="q">${cands.length ? 'ไม่ใช่? ค้นหาชื่อหรือนามสกุล' : 'ค้นหาชื่อหรือนามสกุล'}</label>
  <input class="search" id="q" placeholder="เช่น สมชาย หรือ ใจดี" value="${esc(st.query)}" autocomplete="off">
  <div id="qres">${searchResults(st)}</div><div class="fill"></div>
  ${changing ? '' : '<button class="sublink" data-act="pdpa">ข้อมูลที่ระบบเก็บ</button>'}</div>
  ${changing ? dock('<button class="btn" data-act="cancelPick">ยกเลิก</button>') : ''}`;
}

export function confirm(st) {
  const note = st.mode === 'rename' ? 'รายการลงเวรวันนี้จะย้ายไปชื่อนี้'
    : st.mode === 'change' ? ''
      : 'ระบบเก็บชื่อ เวลาลงเวร บัญชี LINE และรูปที่ถ่าย เพื่อทำรายงานเวรเท่านั้น เก็บ 1 ปีการศึกษา <button class="inlink" data-act="pdpa">อ่านทั้งหมด</button>';
  return `<div class="pad"><div class="mid"><p class="lead muted">ยืนยันชื่อ</p><p class="confname bal">${esc(kru(st.teacher.name))}</p></div></div>
  ${dock(`${note ? `<p class="small muted center">${note}</p>` : ''}<button class="btn pri" data-act="confirmYes">ใช่ นี่คือฉัน</button><button class="btn" data-act="backPick">ไม่ใช่ เลือกใหม่</button>`)}`;
}

export function pdpa() {
  return `<div class="pad top"><p class="h1">ข้อมูลที่ระบบเก็บ</p>
  <p class="lead pdpatext">ระบบเก็บชื่อ เวลาลงเวร รหัสผู้ใช้ LINE พิกัด (ถ้าอนุญาต) และรูปที่ถ่าย (รูปอาจมีหน้าครูหรือนักเรียน) เพื่อทำรายงานเวรเท่านั้น</p>
  <p class="lead pdpatext">ระบบอ่านแชท ดูรายชื่อเพื่อน หรือส่งข้อความหาคุณไม่ได้</p>
  <p class="lead pdpatext strong">เก็บ 1 ปีการศึกษา</p><div class="fill"></div></div>
  ${dock('<button class="btn" data-act="pdpaBack">กลับ</button>')}`;
}

export function taken(st) {
  return `<div class="pad"><div class="mid"><div class="ring warn">${ICON.lock}</div>
  <p class="big bal">ชื่อนี้ผูกกับ LINE อื่นแล้ว</p><p class="confsub">${esc(kru(st.name))}</p><p class="lead">ถ้านี่คือชื่อของคุณ ให้แจ้งแอดมิน</p></div></div>
  ${dock('<button class="btn pri" data-act="backPick">เลือกชื่ออื่น</button>')}`;
}

// แสดงคำว่า "สาย" ให้ครูเห็นหรือไม่ (ผู้ใช้ 17 พ.ย. 2569: ตอนนี้แสดงแค่เวลา ระบบยังบันทึกสายเหมือนเดิม เปิดใหม่ได้ที่นี่ที่เดียว)
export const SHOW_LATE = false;
const lateMark = (late, html) => (SHOW_LATE && late ? html : '');

// st: {c (ผล checked_in/menu), actionsOpen, photoOpen, canRename, noPhoto:{reason,retrying?,message?}|null, photoSent, teacherName, renamed}
export function success(st) {
  const c = st.c, d = c.duty, np = st.noPhoto;
  const line = (cls, text) => `<p class="${cls}" style="font-size:16px">${text}</p>`;
  let photo = '';
  if (st.photoSent) photo = '<p class="ok" style="font-size:17px;font-weight:600;margin-top:12px">ส่งรูปแล้ว</p>';
  else if (np && st.photoOpen) {
    photo = `<p class="late" style="font-size:17px;font-weight:600;margin-top:12px">ยังไม่มีรูป · ถ่ายได้ถึง ${esc(c.photoUntil)}</p>${np.retrying ? line('muted', 'กำลังลองส่งรูปใหม่') : ''}`;
  } else if (np) photo = '<p class="muted" style="font-size:17px;font-weight:600;margin-top:12px">ไม่มีรูป</p>';
  const extra = np && np.message ? line('muted', esc(np.message)) : '';
  const photoFirst = st.noPhoto && st.photoOpen && c.photoRequired && !c.hasPhoto;
  const row = st.actionsOpen
    ? `<div class="row2">${photoFirst ? '<button class="btn" data-act="photo">ถ่ายรูปเวร</button>' : '<button class="btn" data-act="proxy">ลงชื่อเพิ่ม</button>'}<button class="btn" data-act="report">รายงานเหตุการณ์</button></div>`
    : '<p class="muted center" style="font-size:16px">หมดเวลาเวรแล้ว</p>';
  return `<div class="pad"><div class="mid">
   <div class="ring ok">${ICON.checkBig}</div>
   <div class="num" style="font-size:72px;font-weight:700;line-height:1;letter-spacing:-1px">${esc(c.time)}</div>
   ${lateMark(c.late, '<div class="late" style="font-size:20px;font-weight:600">(สาย)</div>')}
   <div class="bal" style="font-size:24px;font-weight:600;margin-top:8px">${esc(placeFull(d))}</div>
   <div class="muted num" style="font-size:16px">${rng(d)}</div>
   ${c.asSubstituteFor ? line('muted', `มาแทน ${esc(kru(c.asSubstituteFor.name))}`) : ''}
   ${st.renamed && st.teacherName ? line('muted', `เปลี่ยนเป็น ${esc(kru(st.teacherName))} แล้ว`) : ''}
   ${photo}${extra}
  </div>
  ${row}<button class="link" data-act="my">ดูเวรของฉัน</button>${st.canRename ? '<button class="sublink" data-act="rename">เลือกชื่อผิด? เปลี่ยนชื่อ</button>' : ''}
  </div>`;
}

// st: {c, actionsOpen, photoOpen, canRename, viaProxy:{name,time}|null, photoSent, error}
export function menu(st) {
  const c = st.c, d = c.duty;
  const mrow = (act, icon, label) => `<button class="mrow" data-act="${act}">${icon}<span>${label}</span>${ICON.chev}</button>`;
  let body = '';
  if (st.viaProxy) {
    body = `<p style="font-size:18px">${esc(who(st.viaProxy.name))}ลงชื่อให้คุณแล้ว</p><p class="muted" style="font-size:16px">ไม่ต้องทำอะไรเพิ่ม</p>`;
  } else if (!st.actionsOpen) {
    body = '<p class="muted" style="font-size:16px">หมดเวลาเวรแล้ว</p>';
  } else {
    const rows = [mrow('proxy', ICON.users, 'ลงชื่อเพิ่ม'), mrow('report', ICON.alert, 'รายงานเหตุการณ์')];
    if (c.photoRequired && !c.hasPhoto && !st.photoSent && st.photoOpen) rows.push(mrow('photo', ICON.cam, 'ถ่ายรูปเวร'));
    body = `<div class="mlist">${rows.join('')}</div>`;
  }
  const head = st.viaProxy ? `นับว่ามาแล้ว ${esc(st.viaProxy.time)}` : `ลงเวรแล้ว ${esc(c.time)}`;
  return `<div class="strip num">${ICON.checkS}<span><span class="ok" style="font-size:24px;font-weight:600">${head}</span>
   <span class="bal" style="font-size:17px;font-weight:500">${esc(placeFull(d))}</span></span></div>
  <div class="pad">${body}
   ${st.photoSent ? '<p class="ok" style="font-size:16px">ส่งรูปแล้ว</p>' : ''}${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}
   <div class="fill"></div>${st.canRename ? '<button class="sublink" data-act="rename">เลือกชื่อผิด? เปลี่ยนชื่อ</button>' : ''}<button class="link" data-act="my">ดูเวรของฉัน</button></div>`;
}

const camBar = (left) => `<div class="cambar">${left}<button class="shutter" data-act="shoot" aria-label="ถ่ายรูป"></button>
  <button class="flipbtn" data-act="flip" aria-label="สลับกล้องหน้า/หลัง">${ICON.flip}<span>สลับกล้อง</span></button></div>`;
const viewfinder = (tip) => `<div class="vf"><video id="video" playsinline muted autoplay></video><div class="tip">${esc(tip)}</div></div>`;

// กล้องหลังสแกน st: {c, mode:'live'|'ask'} (ask = โหมดสุ่ม แสดงหน้าขอรูปก่อนเปิดกล้อง)
export function scanCam(st) {
  const c = st.c;
  const done = `ลงเวรแล้ว ${esc(c.time)}${lateMark(c.late, ' (สาย)')}`;
  if (st.mode === 'ask') {
    return `<div class="pad"><div class="mid"><div class="ring info">${ICON.cam}</div>
    <p class="big bal">วันนี้ขอรูปจุดเวร 1 รูป</p><p class="ok lead">${done}</p></div></div>
    ${dock(`<button class="btn pri" data-act="camScan">ถ่ายรูปจุดเวร</button><button class="sublink" data-act="skipPhoto">ไม่สะดวกตอนนี้</button>`)}`;
  }
  return `<div class="camv"><div class="camstrip"><p class="camok">${done}</p><p class="camplace bal">${esc(placeFull(c.duty))}</p></div>${viewfinder('ถ่ายจุดเวร')}
  ${camBar('<button class="l" data-act="skipPhoto">ข้ามไปก่อน</button>')}</div>`;
}

// กล้องทั่วไป (ลงชื่อเพิ่ม / รูปประกอบรายงาน) st: {tip}
export function cam(st) {
  return `<div class="camv">${viewfinder(st.tip)}${camBar('<button class="l" data-act="camCancel">ยกเลิก</button>')}</div>`;
}

// st: {img (data URL), purpose:'scan'|'proxy'|'report', sending}
export function preview(st) {
  const send = st.purpose === 'report' ? 'ใช้รูปนี้' : 'ส่งรูป';
  return `<div class="pad top"><p class="h1">ตรวจรูปก่อนส่ง</p>
  <img class="pvimg" src="${esc(st.img)}" alt="รูปที่ถ่าย">
  ${st.sending ? '<div class="pbar"><i></i></div><p class="small muted center">กำลังส่งรูป</p>' : `<button class="btn pri" data-act="sendPhoto">${send}</button><button class="btn" data-act="retake">ถ่ายใหม่</button>`}</div>`;
}

// st: {r (proxy_candidates), c}
export function proxyPick(st) {
  const list = st.r.friends || [];
  const body = list.length
    ? list.map((t) => `<button class="prow" data-act="proxyTo" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}"><span>${esc(kru(t.name))}</span>${ICON.chev}</button>`).join('')
    : `<p class="lead">${esc(st.r.message || 'ลงเวรครบแล้ว')}</p>`;
  return `<div class="pad top"><p class="h1">เลือกชื่อ</p><div class="plist2">${body}</div><div class="fill"></div></div>
   ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

// st: {r (proxy_done), img, c}
export function proxyDone(st) {
  const r = st.r, d = st.c ? st.c.duty : null;
  if (r.already) {
    // คำขอที่ลองใหม่แต่ถึงเซิร์ฟเวอร์ไปแล้ว (code 'already'): เพื่อนมีบันทึกแล้ว
    return `<div class="pad"><div class="mid"><div class="ring ok">${ICON.checkBig}</div>
    <p class="big bal">${esc(who(r.friendName))}มีบันทึกเวรแล้ว</p><p class="small muted">ไม่ต้องลงชื่อให้ซ้ำ</p></div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
  }
  return `<div class="pad"><div class="mid"><div class="ring ok">${ICON.checkBig}</div>
   <p class="hd28">ลงชื่อให้แล้ว</p><p class="num t56">${esc(r.time)}</p>${lateMark(r.late, '<p class="late nm20">(สาย)</p>')}
   <p class="nm20 bal">${esc(kru(r.friendName))}</p>${d ? `<p class="small muted bal">${esc(placeShort(d))}</p>` : ''}
   ${st.img ? `<img class="thumbs" src="${esc(st.img)}" alt="รูปยืนยัน">` : ''}</div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

// st: {r (proxied)}
export function proxied(st) {
  const r = st.r;
  return notice({ ring: 'ok', icon: ICON.checkBig, title: `${who(r.by && r.by.name)}ลงชื่อให้คุณแล้ว`,
    lines: `<p class="lead num">${esc(r.time)}</p><p class="lead strong ok">นับว่ามาแล้ว</p><p class="small muted">ไม่ต้องทำอะไรเพิ่ม</p>`,
    foot: dock('<button class="btn pri" data-act="toMenu">ไปที่เมนู</button>') });
}

// st: {r (stood_by_other)}
export function covered(st) {
  const r = st.r;
  return notice({ ring: 'info', icon: ICON.swap, title: `${who(r.byName)}ลงเวรแทนคุณแล้ว`,
    lines: `<p class="lead num">${esc(r.time)}</p><p class="lead">วันนี้คุณไม่ต้องลงเวรที่จุดนี้</p><p class="small muted">ถ้าไม่ได้ตกลงกันไว้ แจ้งหัวหน้าเวร</p>`,
    foot: myLink });
}

// st: {r (on_leave)}
export function onLeave() {
  return notice({ ring: 'leave', icon: ICON.clock, title: 'วันนี้คุณถูกบันทึกลา', lines: '<p class="lead">กรุณาติดต่อหัวหน้าเวร</p>', foot: myLink });
}

const myDutyElse = (d) => d ? `<p class="small muted">เวรของคุณวันนี้: ${esc(placeShort(d))} · ${rng(d)}</p>` : '';

// st: {r (ask_substitute)}
export function subask(st) {
  const opts = st.r.options || [];
  const label = (o) => esc(kru(o.name)) + (o.onLeave ? ' (ลา)' : '');
  const one = opts.length === 1;
  return `<div class="pad top"><p class="hd28 bal">ชื่อคุณไม่อยู่ในเวรจุดนี้วันนี้</p>
   <p class="ln20">${one ? `คุณมาแทน ${esc(kru(opts[0].name))} ใช่ไหม` : 'คุณมาแทนใคร'}</p>
   ${one ? '' : opts.map((o) => `<button class="btn sug" data-act="subFor" data-id="${esc(o.teacher_id)}">มาแทน ${label(o)}</button>`).join('')}
   <div class="fill"></div>${myDutyElse(st.r.myDuty)}</div>
  ${dock((one ? `<button class="btn pri" data-act="subFor" data-id="${esc(opts[0].teacher_id)}">ใช่ มาแทน ${esc(kru(opts[0].name))}</button>` : '') + '<button class="btn" data-act="notSub">ไม่ใช่ สแกนผิดจุด</button>')}`;
}

// st: {r: {myDuty}} (จาก wrong_point หรือกด "ไม่ใช่ สแกนผิดจุด")
export function wrongPoint(st) {
  const d = st.r.myDuty;
  return notice({ ring: 'info', icon: ICON.swap, title: d ? 'สแกนผิดจุด' : 'วันนี้คุณไม่มีเวร',
    lines: (d ? `<p class="small muted">เวรของคุณวันนี้</p><p class="nm24 bal">${esc(placeFull(d))}</p><p class="lead num">${rng(d)}</p>` : '') + NOT_RECORDED,
    foot: myLink });
}

const MY_STATUS = { self: 'ลงเวรแล้ว', proxy: 'เพื่อนลงชื่อให้', head: 'หัวหน้าเวรเช็คให้', leave: 'ลา', notfound: 'ไม่พบตัวที่จุดเวร', absent: 'ขาด', missing: 'ไม่ได้ลงเวร' };

// st: {r (outside), nowMin (เวลาเซิร์ฟเวอร์เป็นนาที)}
export function outside(st) {
  const r = st.r, d = r.myDuty;
  const list = r.dutiesAtPoint || [];
  const mine = !!d && list.some((x) => x.code === d.code);
  const place = d ? `<p class="nm22 bal">${esc(placeFull(d))}</p>` : '';
  let title, lines;
  if (r.reason === 'holiday') {
    title = 'วันนี้ไม่มีเวร';
    lines = '<p class="lead">วันหยุด ไม่ต้องลงเวร</p>';
  } else if (r.reason === 'before' && mine) {
    const left = toMin(d.start) - Number(st.nowMin);
    title = 'ยังไม่ถึงเวลาเวรของคุณ';
    lines = `${place}<p class="lead">เริ่ม ${hmd(d.start)} น.${left > 0 ? ` · <b>อีก ${left} นาที</b>` : ''}</p>${NOT_RECORDED}`;
  } else if (r.reason === 'after' && mine) {
    const status = r.myTime ? ['ok', `✓ ลงเวรแล้ว ${esc(r.myTime)}`]
      : MY_STATUS[r.myStatus] ? [r.myStatus === 'head' || r.myStatus === 'proxy' ? 'ok' : r.myStatus === 'leave' ? 'leavec' : 'miss', MY_STATUS[r.myStatus]] : null;
    title = 'เวรของคุณวันนี้จบแล้ว';
    lines = `${place}<p class="lead">จบ ${hmd(d.end)} น.</p>${status ? `<p class="lead strong ${status[0]}">${status[1]}</p>` : ''}`;
  } else {
    title = 'ตอนนี้ไม่ใช่เวลาเวรของจุดนี้';
    lines = list.map((x) => `<p class="lead num">${rng(x)}</p>`).join('') + (d && !mine ? myDutyElse(d) : '') + NOT_RECORDED;
  }
  return notice({ ring: 'info', icon: ICON.clock, title, lines, foot: myLink });
}

// st: {attempt}
export function fail(st) {
  return notice({ ring: 'err', icon: ICON.wifi, title: st.load ? 'ยังโหลดไม่สำเร็จ' : 'ยังบันทึกไม่สำเร็จ',
    lines: `<p class="lead">ลองไปแล้ว ${Number(st.attempt) || 0} ครั้ง</p>${st.load ? '' : '<p class="small muted">ถ้ายังไม่ได้ ให้แจ้งหัวหน้าเวร ไม่นับเป็นขาด</p>'}`,
    foot: dock('<button class="btn pri" data-act="retryNow">ลองอีกครั้งตอนนี้</button>') });
}

// เปิดลิงก์นอกแอป LINE · st: {href}
export function openInLine(st = {}) {
  return notice({ ring: 'info', icon: ICON.users, title: 'เปิดใน LINE เพื่อใช้งาน',
    foot: dock(`<a class="btn pri" href="${esc(st.href || '')}">เปิดใน LINE</a><button class="btn" data-act="lineLogin">เข้าสู่ระบบ LINE ในหน้านี้</button>`) });
}

// st: {message, back, retry}
export function error(st) {
  return notice({ ring: 'err', icon: ICON.alert, title: 'ทำรายการไม่สำเร็จ', lines: `<p class="lead">${esc(st.message || 'ระบบขัดข้อง ลองอีกครั้ง')}</p>`,
    foot: st.retry ? dock('<button class="btn pri" data-act="rescan">ลองอีกครั้ง</button>') : st.back ? dock('<button class="btn" data-act="toHome">กลับ</button>') : '' });
}

export function reportButton(st) {
  const n = (st.selected || []).length;
  return { label: n ? `ส่งรายงาน ${n} เรื่อง` : 'ส่งรายงาน', disabled: !n && !String(st.note || '').trim() };
}

// st: {categories, selected, note, photo:{kind:'scan'|'new', img}|null, error, sending}
export function report(st) {
  const b = reportButton(st);
  const p = st.photo;
  const photo = p
    ? `<div class="repphoto">${p.img ? `<img class="thumbs" src="${esc(p.img)}" alt="รูปประกอบ">` : ''}
       <div><p class="small">${p.kind === 'scan' ? 'ใช้รูปตอนสแกน' : 'ใช้รูปที่ถ่ายใหม่'}</p>
       <div class="row2"><button class="btn sm" data-act="repPhotoRemove">เอาออก</button><button class="btn sm" data-act="repPhotoNew">ถ่ายใหม่</button></div></div></div>`
    : `<button class="btn dashed" data-act="repPhotoNew">${ICON.cam}<span>ถ่ายรูปประกอบ</span></button>`;
  const sel = st.selected || [];
  return `<div class="pad top"><p class="h1">รายงานเหตุการณ์</p>
  <div class="chips2">${(st.categories || []).map((x, i) => `<button class="chip" data-act="cat" data-i="${i}" aria-pressed="${sel.includes(x)}">${sel.includes(x) ? '✓ ' : ''}${esc(x)}</button>`).join('')}</div>
  <label class="small strong" for="note">รายละเอียด</label>
  <textarea class="repnote" id="note" placeholder="เช่น นักเรียน ม.2 มาสาย 5 คน">${esc(st.note)}</textarea>
  ${photo}${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}<div class="fill"></div></div>
  ${dock(`<button class="btn pri" id="sendReport" data-act="sendReport"${b.disabled || st.sending ? ' disabled' : ''}>${st.sending ? 'กำลังส่ง' : b.label}</button><button class="btn" data-act="toHome">ยกเลิก</button>`)}`;
}

// st: {cats, note, time}
export function reportDone(st) {
  const cats = (st.cats || []).join(' · ');
  return `<div class="pad"><div class="mid"><div class="ring ok">${ICON.checkBig}</div>
  <p class="hd28">ส่งรายงานแล้ว</p>${st.time ? `<p class="lead muted num">${esc(st.time)}</p>` : ''}
  ${cats ? `<p class="nm22 bal">${esc(cats)}</p>` : ''}${st.note ? `<p class="note17">${esc(st.note)}</p>` : ''}</div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

const shiftMonth = (ym, n) => { const [y, m] = ymdParts(ym); const t = y * 12 + (m - 1) + n; const mm = t % 12 + 1; return Math.floor(t / 12) + '-' + (mm < 10 ? '0' : '') + mm; };

// ป้ายสถานะของแถววันเวร: [ข้อความ, คลาสสี] · หน้าครูไม่มีคำว่า สาย/ขาด (หลังบ้านยังเก็บไว้ให้แอดมิน/ผู้บริหาร)
const DAY_STATUS = {
  'มา': ['มา', 'ok'], 'สาย': SHOW_LATE ? ['สาย', 'late'] : ['มา', 'ok'], 'ไปแทน': ['ไปแทน', 'ok'],
  'ลา': ['ลา', 'muted'], 'มีคนมาแทน': ['มีคนแทน', 'muted'], 'ขาด': ['ไม่มีบันทึก', 'muted'],
  'ยังไม่ถึง': ['ยังไม่ถึง', 'up'], 'รอลงเวร': ['รอลงเวร', 'up']
};
const DAY_NOTE = ['ไปแทน', 'ลา', 'มีคนมาแทน']; // หมายเหตุที่แสดงต่อท้ายชื่อจุด (ไม่แสดง เพื่อนลงชื่อให้ / หัวหน้าเวรเช็คให้)

// ระยะห่างจากวันนี้ถึงวันเวร นับวันตามปฏิทิน · ไม่รู้วันนี้ = null
export function relDay(today, ymd) {
  if (!today || !ymd) return null;
  const utc = (x) => { const [y, m, d] = ymdParts(x); return Date.UTC(y, m - 1, d); };
  const n = Math.round((utc(ymd) - utc(today)) / 86400000);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return { text: 'วันนี้', strong: true };
  if (n === 1) return { text: 'พรุ่งนี้', strong: true };
  return { text: 'อีก ' + n + ' วัน', strong: false };
}

const DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const dowOf = (ymd) => { const [y, m, d] = ymdParts(ymd); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

// st: {r (my), month 'YYYY-MM', currentMonth 'YYYY-MM', today 'YYYY-MM-DD' (ไม่มีก็ได้)}
export function my(st) {
  const r = st.r, next = r.next;
  const month = st.month, canNext = st.currentMonth && month < st.currentMonth;
  const dayRow = (d) => {
    const [text, cls] = DAY_STATUS[d.status] || [d.status, 'muted'];
    const note = DAY_NOTE.includes(d.status) && d.note ? ' · <span class="dnote">' + esc(d.note) + '</span>' : '';
    const [, m, dd] = ymdParts(d.date);
    const ses = d.session ? ' (' + esc(d.session) + ')' : '';
    return `<div class="drow"><span class="dt num">${DOW_SHORT[dowOf(d.date)]} ${dd} ${TMON[m - 1]}</span><span class="dwhere">${esc(d.place || d.label || d.duty_code)}${ses}${note}</span><span class="dst ${cls}">${esc(text)}</span></div>`;
  };
  const rows = r.days.length ? r.days.map(dayRow).join('') : '<p class="muted drow-none">เดือนนี้ไม่มีวันเวร</p>';
  let nextHtml = '<p class="muted">ยังไม่มีเวรที่กำหนด</p>';
  if (next) {
    const [, m, d] = ymdParts(next.date);
    // isToday จากหลังบ้านเชื่อถือกว่าวันที่ใน config (config โหลดครั้งเดียว ถ้าเปิดหน้าค้างข้ามคืนจะเก่า)
    const rel = r.isToday ? { text: 'วันนี้', strong: true } : relDay(st.today, next.date);
    nextHtml = `<div class="nextd"><div class="cal" aria-label="${esc(thaiDay(next.date))}"><div class="w">${DOW[dowOf(next.date)]}</div><div class="n num">${d}</div><div class="mo">${TMON[m - 1]}</div></div>
     <div><p class="nx">${esc(placeShort(next.duty))}</p>${next.session ? `<p class="nx2 muted">${esc(SESSION_NAME[next.session] || 'เวร' + next.session)}</p>` : ''}${rel ? `<p class="when${rel.strong ? ' strong' : ''}">${rel.text}</p>` : ''}</div></div>`;
  }
  const headLink = r.canHead ? '<button class="link" data-act="toHead">เปิดใบเช็คหัวหน้าเวร</button>' : '';
  const nameChange = r.canSelfChange ? '<button class="sublink" data-act="pickChange">เลือกชื่อผิด? เปลี่ยนชื่อ</button>' : '';
  return `<div class="pad top myd"><h1 class="mhd">เวรของฉัน</h1><p class="muted who">${esc(kru(r.teacher.name))}</p>
   <div class="sec"><h2>เวรครั้งถัดไป</h2></div>${nextHtml}
   <div class="sec"><h2>รายการเวร</h2><div class="mnav"><button class="arrow" data-act="myMonth" data-m="${shiftMonth(month, -1)}" aria-label="เดือนก่อน">${ICON.chevL}</button>
    <b class="mname">${thaiMonth(month)}</b>
    <button class="arrow" data-act="myMonth" data-m="${shiftMonth(month, 1)}" aria-label="เดือนถัดไป"${canNext ? '' : ' disabled'}>${ICON.chevR}</button></div></div>
   <div>${rows}</div>
   ${headLink}${nameChange}
  </div>`;
}
