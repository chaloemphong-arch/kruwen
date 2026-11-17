// หน้าจอของหน้าครูเวร: ทุกฟังก์ชันเป็นฟังก์ชันล้วน (state → HTML string) ไม่แตะ DOM
// หน้าตาและข้อความตามเดโม เดโมระบบครูเวร.html (V.*) ข้อมูลมาจากผล call() ของหลังบ้าน

// ฟังก์ชันที่ export แต่ไม่ใช่หน้าจอ
export const HELPERS = ['reportButton'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hmd = (hhmm) => esc(String(hhmm || '').replace(':', '.'));
const toMin = (hhmm) => { const p = String(hhmm || '0:0').split(':'); return Number(p[0]) * 60 + Number(p[1]); };
const kru = (name) => { const n = String(name || ''); return !n || n.startsWith('ครู') ? n : 'ครู' + n; };
const TMON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const ymdParts = (ymd) => String(ymd).split('-').map(Number);
const dayMonth = (ymd) => { const [, m, d] = ymdParts(ymd); return d + ' ' + TMON[m - 1]; };
const thaiDay = (ymd) => { const [y, m, d] = ymdParts(ymd); return DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ' ' + d + ' ' + TMON[m - 1]; };
const thaiMonth = (ym) => { const [y, m] = ymdParts(ym); return TMON[m - 1] + ' ' + (y + 543); };

function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1E2B45' : '#FFFFFF';
}
const chip = (code, color) => color
  ? `<i class="code" style="background:${esc(color)};color:${textOn(color)}">${esc(code)}</i>`
  : `<i class="code">${esc(code)}</i>`;
const dutyLine = (d) => d ? `${chip(d.code, d.color)} ${esc(d.point)} · ${hmd(d.start)}–${hmd(d.end)}` : '';

const ICON = {
  check: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  checkS: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/></svg>',
  alert: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.2"/></svg>',
  pencil: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3.5 3.5"/></svg>',
  cam: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  clock: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lock: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  wifi: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 9a14 14 0 0118 0M6.5 12.5a9 9 0 0111 0M10 16a4 4 0 014 0"/><path d="M4 4l16 16"/></svg>',
  swap: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  flip: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9a8 8 0 0114-3l2 2M20 4v4h-4M20 15a8 8 0 01-14 3l-2-2M4 20v-4h4"/></svg>'
};

const PDPA = '<p class="pdpa">ระบบเก็บชื่อ เวลาลงเวร รหัสบัญชี LINE พิกัด (ถ้าอนุญาต) และรูปที่ถ่าย (รูปอาจมีหน้าครูหรือนักเรียน) เพื่อทำรายงานเวรเท่านั้น ระบบอ่านแชท ดูรายชื่อเพื่อน หรือส่งข้อความหาคุณไม่ได้ เก็บ 1 ปีการศึกษา</p>';
const myLink = '<button class="btn ghost" data-act="my">ดูเวรของฉัน</button>';
const dock = (inner) => `<div class="dock">${inner}</div>`;

export function loading(st = {}) {
  return `<div class="pad"><div class="mid"><div class="spin"></div><p style="font-size:24px;font-weight:600;line-height:1.4">${esc(st.title || 'กำลังโหลด')}</p></div></div>`;
}

export function welcome() {
  return `<div class="pad center mid"><p class="title">ยินดีต้อนรับสู่ระบบครูเวร</p>
  <p class="muted">เลือกชื่อของคุณครั้งเดียว แล้วดูวันเวรของตัวเองได้ทันที วันเวรสแกน QR ที่จุดเวรแล้วลงเวรเลย</p></div>
  ${dock('<button class="btn pri" data-act="pickFromMy">เลือกชื่อของฉัน</button><p class="small muted center">หรือสแกน QR ที่จุดเวรครั้งแรกก็ได้</p>')}`;
}

export function searchResults(st = {}) {
  const q = String(st.query || '').trim();
  if (!q) return '';
  if (st.error) return `<p class="small err">${esc(st.error)}</p>`;
  if (!st.results) return '<p class="small muted">กำลังค้นหา…</p>';
  if (!st.results.length) return '<p class="small muted">ไม่พบชื่อนี้ ถ้าชื่อไม่อยู่ในระบบ แจ้งแอดมิน</p>';
  return st.results.map((t) => `<button class="namebtn" data-act="pickName" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}">${esc(kru(t.name))}</button>`).join('');
}

// mode: 'scan' (สแกนครั้งแรก) | 'my' (จากเวรของฉัน) | 'rename' (หลังลงเวร) | 'change' (เปลี่ยนชื่อก่อนลงเวรครั้งแรก)
export function pick(st) {
  const mode = st.mode, changing = mode === 'rename' || mode === 'change';
  const cands = mode === 'scan' ? (st.candidates || []) : [];
  const head = changing ? '<p class="title">เปลี่ยนชื่อ เลือกชื่อที่ถูกต้อง</p>'
    : mode === 'my' ? '<p class="title">เลือกชื่อของคุณ</p><p class="small muted">ทำครั้งเดียว ระบบจะจำชื่อกับบัญชี LINE วันเวรสแกน QR ที่จุดเวรแล้วลงเวรทันที</p>'
      : '<p class="title">ใช้ครั้งแรก เลือกชื่อของคุณ</p>';
  const sug = cands.length ? `<div class="suggest"><span class="small strong brand">ครูที่มีเวรจุดนี้ตอนนี้</span>
    ${cands.map((t) => `<button class="btn sug" data-act="pickName" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}">ฉันคือ ${esc(kru(t.name))}</button>`).join('')}</div>` : '';
  return `<div class="pad">${head}${sug}
  <label class="small muted" for="q">${cands.length ? 'ไม่ใช่ชื่อด้านบน? ค้นหาชื่อหรือนามสกุล' : 'ค้นหาชื่อหรือนามสกุล'}</label>
  <input class="search" id="q" placeholder="เช่น สมชาย หรือ ใจดี" value="${esc(st.query)}" autocomplete="off">
  <div id="qres">${searchResults(st)}</div><div class="fill"></div>
  ${changing ? '' : PDPA}</div>
  ${changing ? dock('<button class="btn" data-act="cancelPick">ยกเลิก</button>') : ''}`;
}

export function confirm(st) {
  const text = st.mode === 'rename' ? 'ระบบจะย้ายรายการลงเวรวันนี้ไปที่ชื่อนี้ และผูกกับบัญชี LINE ของคุณ ชื่อเดิมจะถูกยกเลิก'
    : st.mode === 'my' || st.mode === 'change' ? 'ระบบจะจำชื่อนี้กับบัญชี LINE ของคุณ วันเวรสแกน QR แล้วลงเวรทันที ถ้าเลือกผิด แก้ได้เองจนกว่าจะสแกนลงเวรครั้งแรก'
      : 'ระบบจะจำชื่อนี้กับบัญชี LINE ของคุณ ครั้งต่อไปสแกนแล้วลงเวรทันที ไม่ต้องเลือกอีก แม้เปลี่ยนมือถือ';
  return `<div class="pad center">
  <p class="muted" style="margin-top:18px">ยืนยันชื่อ</p><p class="bigname">${esc(kru(st.teacher.name))}</p><p class="title" style="font-weight:500">ใช่คุณไหม</p>
  <div class="box left">${text}</div></div>
  ${dock('<button class="btn pri" data-act="confirmYes">ใช่ นี่คือฉัน</button><button class="btn" data-act="backPick">ไม่ใช่ เลือกใหม่</button>')}`;
}

export function taken(st) {
  return `<div class="pad center">
  <div class="bigicon warnicon">${ICON.lock}</div>
  <p class="title">ชื่อนี้ผูกกับบัญชี LINE อื่นแล้ว</p><p class="muted">${esc(kru(st.name))} ใช้งานระบบอยู่แล้วจากบัญชี LINE อื่น</p>
  <div class="box left">ถ้านี่คือชื่อของคุณ เช่น เพิ่งเปลี่ยนบัญชี LINE ให้แจ้งแอดมินกด "ปลดการผูก" แล้วสแกนใหม่<br><span class="small muted">แอดมินเห็นในระบบว่ามีคนพยายามเลือกชื่อนี้</span></div></div>
  ${dock('<button class="btn pri" data-act="backPick">เลือกชื่ออื่น</button>')}`;
}

function noPhotoStrip(c, noPhoto, photoOpen) {
  const retrying = noPhoto.retrying ? '<br><span class="small">ระบบกำลังลองส่งรูปใหม่เอง</span>' : '';
  return `<div class="warn"><b>${photoOpen ? `ยังไม่มีรูป · ถ่ายได้ถึง ${esc(c.photoUntil)}` : 'ไม่มีรูป'}</b>${retrying}${noPhoto.message ? `<br><span class="small">${esc(noPhoto.message)}</span>` : ''}</div>`;
}
const sentTag = '<p class="center"><span class="tag t-ok">ส่งรูปแล้ว ขอบคุณครับ</span></p>';
const expiredBox = '<div class="box small center">หมดเวลาเวรแล้ว ถ้าจะลงชื่อให้เพื่อนหรือรายงานเหตุการณ์ ให้สแกน QR อีกครั้ง</div>';

// st: {c (ผล checked_in/menu), actionsOpen, photoOpen, canRename, noPhoto:{reason,retrying?,message?}|null, photoSent, teacherName, renamed}
export function success(st) {
  const c = st.c, d = c.duty;
  const sub = c.asSubstituteFor ? `<span>มาแทน ${esc(kru(c.asSubstituteFor.name))}</span>` : '';
  const who = st.teacherName ? `<p class="center small muted">${esc(kru(st.teacherName))}${st.renamed ? ' · ย้ายรายการจากชื่อเดิมแล้ว' : ''}</p>` : '';
  const photo = st.noPhoto ? noPhotoStrip(c, st.noPhoto, st.photoOpen) : (st.photoSent ? sentTag : '');
  const actions = st.actionsOpen
    ? `<div class="chips2"><button class="btn" data-act="proxy">${ICON.users} ลงชื่อให้เพื่อน</button><button class="btn" data-act="report">${ICON.alert} มีเหตุการณ์</button></div>`
    : expiredBox;
  const rename = st.canRename ? `<button class="btn ghost" data-act="rename">${st.teacherName ? `ไม่ใช่ ${esc(kru(st.teacherName))}?` : 'เลือกชื่อผิด?'} เปลี่ยนชื่อ</button>` : '';
  return `<div class="okhero"><div class="ring pop">${ICON.check}</div><div class="time">${esc(c.time)}</div><div class="where">${esc(d.point)}</div>
   <div class="sub"><span>${esc(d.code)} · ${hmd(d.start)}–${hmd(d.end)}</span>${c.late ? '<span class="late">สาย</span>' : ''}${sub}</div></div>
  <div class="pad">
   <p class="center title">เสร็จแล้ว ปิดหน้านี้ได้เลย</p>${who}${photo}
   <div class="fill"></div>${actions}${myLink}${rename}
  </div>`;
}

// st: {c, actionsOpen, photoOpen, canRename, viaProxy:{name,time}|null, photoSent, error}
export function menu(st) {
  const c = st.c, d = c.duty;
  const strip = st.viaProxy ? `นับว่ามาแล้ว · เพื่อนลงชื่อให้ ${esc(st.viaProxy.time)}` : `ลงเวรแล้ว ${esc(c.time)}`;
  const mb = (act, icon, title, small) => `<button class="mbtn" data-act="${act}"><span class="ic">${icon}</span><span><b>${title}</b><small>${small}</small></span><span class="chev">›</span></button>`;
  let body;
  if (st.viaProxy) {
    body = `<div class="box">${esc(kru(st.viaProxy.name))} ลงชื่อให้คุณแล้ว ไม่ต้องทำอะไรเพิ่ม ถ้ามีเหตุการณ์ให้แจ้งหัวหน้าเวรวันนี้${c.headName ? ` (${esc(kru(c.headName))})` : ''}</div>`;
  } else if (!st.actionsOpen) {
    body = expiredBox;
  } else {
    const items = [
      mb('proxy', ICON.users, 'ลงชื่อให้เพื่อน', 'เพื่อนลืมโทรศัพท์ ถ่ายรูปเพื่อนที่จุดเวรเป็นหลักฐาน'),
      mb('report', ICON.alert, 'รายงานเหตุการณ์', 'นักเรียนมาสาย ทะเลาะวิวาท สถานที่ชำรุด ฯลฯ')
    ];
    if (c.photoRequired && !c.hasPhoto && !st.photoSent && st.photoOpen) items.push(mb('photo', ICON.cam, 'ถ่ายรูปเวร', `ถ่ายได้ถึง ${esc(c.photoUntil)}`));
    let renameLink = '';
    if (st.canRename) {
      if (items.length < 3) items.push(mb('rename', ICON.pencil, 'เปลี่ยนชื่อ', `กดชื่อผิด แก้เองได้ถึง ${esc(c.renameUntil)}`));
      else renameLink = `<button class="btn ghost" data-act="rename">กดชื่อผิด? เปลี่ยนชื่อ (ถึง ${esc(c.renameUntil)})</button>`;
    }
    body = items.join('') + renameLink;
  }
  return `<div class="okstrip">${ICON.checkS} ${strip} · ${esc(d.code)} ${esc(d.point)}</div>
  <div class="pad"><p class="title">สแกนซ้ำ ต้องการทำอะไร</p>
   ${st.photoSent ? sentTag : ''}${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}
   ${body}
   <div class="fill"></div>${myLink}</div>`;
}

const camBar = (left) => `<div class="cambar">${left}<button class="shutter" data-act="shoot" aria-label="ถ่ายรูป"></button>
  <button class="flipbtn" data-act="flip" aria-label="สลับกล้องหน้า/หลัง">${ICON.flip}<span>สลับกล้อง</span></button></div>`;
const viewfinder = (tip) => `<div class="vf"><video id="video" playsinline muted autoplay></video><div class="tip">${esc(tip)}</div></div>`;

// กล้องหลังสแกน st: {c, mode:'live'|'ask'} (ask = โหมดสุ่ม แสดงการ์ดขอรูปก่อนเปิดกล้อง)
export function scanCam(st) {
  const c = st.c;
  const strip = `<div class="okstrip">${ICON.checkS} ลงเวรแล้ว ${esc(c.time)} · ${esc(c.duty.code)} ${esc(c.duty.point)}${c.late ? ' · สาย' : ''}</div>`;
  if (st.mode === 'ask') {
    return `${strip}<div class="pad">
    <div class="warn askcard"><b>วันนี้ขอรูปจุดเวร 1 รูป</b><span>ลงเวรนับแล้ว ไม่ต้องกังวล ถ่ายจุดเวรที่ยืนอยู่ ไม่ต้องเซลฟี</span></div>
    <div class="fill"></div></div>
    ${dock(`<button class="btn pri" data-act="camScan">${ICON.cam} ถ่ายรูปจุดเวร</button><button class="btn ghost" data-act="skipPhoto">ไม่สะดวกตอนนี้</button>`)}`;
  }
  return `<div class="camv">${strip}${viewfinder('ถ่ายจุดเวรตอนนี้ จะมีตัวเองในรูปหรือไม่ก็ได้')}
  ${camBar('<button class="l" data-act="skipPhoto">ข้ามไปก่อน</button>')}</div>`;
}

// กล้องทั่วไป (ลงชื่อให้เพื่อน / รูปประกอบรายงาน) st: {tip}
export function cam(st) {
  return `<div class="camv">${viewfinder(st.tip)}${camBar('<button class="l" data-act="camCancel">ยกเลิก</button>')}</div>`;
}

// st: {img (data URL), purpose:'scan'|'proxy'|'report', sending}
export function preview(st) {
  const send = st.purpose === 'report' ? 'ใช้รูปนี้' : 'ส่งรูป';
  return `<div class="pad"><p class="title">ตรวจรูปก่อนส่ง</p>
  <img class="thumb" src="${esc(st.img)}" alt="รูปที่ถ่าย">
  <p class="small muted">เวลาที่ใช้เป็นหลักฐานคือเวลาที่เซิร์ฟเวอร์ได้รับรูป ระบบไม่เขียนอะไรลงบนรูป</p>
  ${st.sending ? '<div class="pbar"><i></i></div><p class="small muted center">กำลังส่งรูป</p>' : ''}<div class="fill"></div></div>
  ${st.sending ? '' : dock(`<button class="btn pri" data-act="sendPhoto">${send}</button><button class="btn" data-act="retake">ถ่ายใหม่</button>`)}`;
}

// st: {r (proxy_candidates), c}
export function proxyPick(st) {
  const r = st.r, d = st.c ? st.c.duty : null;
  const list = r.friends || [];
  let body;
  if (list.length) {
    body = list.map((t) => `<button class="plist" data-act="proxyTo" data-id="${esc(t.teacher_id)}" data-name="${esc(t.name)}">${d ? chip(d.code, d.color) : ''}<span><b>${esc(kru(t.name))}</b>${d ? `<small>${esc(d.point)} · ${hmd(d.start)}–${hmd(d.end)}</small>` : ''}</span><span class="muted">›</span></button>`).join('');
  } else {
    body = `<div class="box">${esc(r.message || 'ครูเวรจุดนี้ลงเวรครบแล้ว')}${r.message ? '' : '<br><span class="small muted">ครูที่ลืมโทรศัพท์ให้หัวหน้าเวรเช็คให้</span>'}</div>`;
  }
  return `<div class="pad"><p class="title">ลงชื่อให้ใคร</p>
   <p class="small muted">แสดงเฉพาะครูที่มีเวรจุดเดียวกันและเวลาเดียวกับคุณ${d ? ` (${esc(d.code)} ${esc(d.point)})` : ''} ที่ยังไม่ได้ลงเวร</p>
   ${body}<div class="fill"></div></div>
   ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

// st: {r (proxy_done), img, c}
export function proxyDone(st) {
  const r = st.r, d = st.c ? st.c.duty : null;
  if (r.already) {
    // คำขอที่ลองใหม่แต่ถึงเซิร์ฟเวอร์ไปแล้ว (code 'already'): เพื่อนมีบันทึกแล้ว
    return `<div class="okstrip">${ICON.checkS} ลงชื่อให้แล้ว · ${esc(kru(r.friendName))}</div>
  <div class="pad"><p class="title">${esc(kru(r.friendName))} มีบันทึกเวรวันนี้แล้ว</p>
   <p class="muted">ไม่ต้องลงชื่อให้ซ้ำ หัวหน้าเวรเห็นในแถวของ ${esc(kru(r.friendName))}</p><div class="fill"></div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
  }
  return `<div class="okhero"><div class="ring pop">${ICON.check}</div><div class="where">ลงชื่อให้แล้ว</div><div class="time small-time">${esc(r.time)}</div>
   <div class="sub"><span>${esc(kru(r.friendName))}${d ? ` · ${esc(d.code)} ${esc(d.point)}` : ''}</span>${r.late ? '<span class="late">สาย</span>' : ''}</div></div>
  <div class="pad">${st.img ? `<img class="thumbs" src="${esc(st.img)}" alt="รูปยืนยัน">` : ''}
   <div class="fill"></div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

// st: {r (proxied)}
export function proxied(st) {
  const r = st.r, d = r.menu.duty;
  return `<div class="okstrip">${ICON.checkS} นับว่ามาแล้ว · ${esc(d.code)} ${esc(d.point)}</div>
  <div class="pad"><p class="title">${esc(kru(r.by.name))} ลงชื่อให้คุณแล้ว เมื่อ ${esc(r.time)}</p>
   <p class="muted">${r.photo_url ? 'เพื่อนถ่ายรูปยืนยันไว้แล้ว ' : ''}ระบบไม่บันทึกซ้ำ ไม่ต้องทำอะไรเพิ่ม</p>
   <div class="fill"></div>${myLink}</div>
  ${dock('<button class="btn pri" data-act="toMenu">ไปที่เมนู</button>')}`;
}

// st: {r (stood_by_other)}
export function covered(st) {
  const r = st.r;
  return `<div class="pad center">
  <div class="bigicon warnicon">${ICON.swap}</div>
  <p class="title">${esc(kru(r.byName))} ลงเวรแทนคุณแล้ว<br>เมื่อ ${esc(r.time)}</p>
  <p class="muted">วันนี้คุณไม่ต้องลงเวรที่จุดนี้</p>
  <div class="box left">ถ้าไม่ได้ตกลงแลกเวรกันไว้ แจ้งหัวหน้าเวรวันนี้</div></div>
  ${dock('<button class="btn" data-act="my">ดูเวรของฉัน</button>')}`;
}

// st: {r (on_leave)}
export function onLeave(st) {
  return `<div class="pad center">
  <div class="bigicon leaveicon">${ICON.clock}</div>
  <p class="title">${esc(st.r.message)}</p>
  <p class="small muted">ไม่ได้บันทึกอะไร</p></div>
  ${dock('<button class="btn" data-act="my">ดูเวรของฉัน</button>')}`;
}

const myDutyNote = (d) => d ? `<p class="small muted center">เวรของคุณวันนี้: ${dutyLine(d)}</p>` : '';

// st: {r (ask_substitute)}
export function subask(st) {
  const opts = st.r.options || [];
  const label = (o) => esc(kru(o.name)) + (o.onLeave ? ' (ลา)' : '');
  const one = opts.length === 1;
  return `<div class="pad"><p class="title">ชื่อของคุณไม่อยู่ในตารางเวรจุดนี้วันนี้</p>
   <p>${one ? `คุณมาแทน ${label(opts[0])} ใช่ไหม` : 'คุณมาแทนใคร'}</p>
   ${one ? '' : opts.map((o) => `<button class="btn sug" data-act="subFor" data-id="${esc(o.teacher_id)}">มาแทน ${label(o)}</button>`).join('')}
   <div class="fill"></div>${myDutyNote(st.r.myDuty)}</div>
  ${dock((one ? `<button class="btn pri" data-act="subFor" data-id="${esc(opts[0].teacher_id)}">ใช่ มาแทน ${label(opts[0])}</button>` : '') + '<button class="btn" data-act="notSub">ไม่ใช่ สแกนผิดจุด</button>')}`;
}

// st: {r: {myDuty}} (จาก wrong_point หรือกด "ไม่ใช่ สแกนผิดจุด")
export function wrongPoint(st) {
  const d = st.r.myDuty;
  return `<div class="pad center mid">
  <p class="title">ไม่ได้บันทึกอะไร</p>
  ${d ? `<p class="muted">เวรของคุณวันนี้</p><p class="bigname rowc">${chip(d.code, d.color)} ${esc(d.point)}</p><p>${hmd(d.start)}–${hmd(d.end)}</p><p class="small muted">ไปสแกนที่ป้ายของจุดนั้น</p>`
    : '<p class="muted">วันนี้คุณไม่มีเวร ไม่ต้องลงเวร</p>'}</div>
  ${dock('<button class="btn" data-act="my">ดูเวรของฉัน</button>')}`;
}

const MY_STATUS = { self: 'ลงเวรแล้ว', proxy: 'เพื่อนลงชื่อให้', head: 'หัวหน้าเวรเช็คให้', leave: 'ลา', notfound: 'ไม่พบตัวที่จุดเวร', absent: 'ขาด', missing: 'ไม่ได้ลงเวร' };

// st: {r (outside), nowMin (เวลาเซิร์ฟเวอร์เป็นนาที)}
export function outside(st) {
  const r = st.r, d = r.myDuty;
  const list = r.dutiesAtPoint || [];
  const mine = !!d && list.some((x) => x.code === d.code);
  const listBox = list.length ? `<div class="box left">${list.map((x) => `<div class="rowc">${chip(x.code, x.color)} ${hmd(x.start)}–${hmd(x.end)}</div>`).join('')}</div>` : '';
  let body;
  if (r.reason === 'holiday') {
    body = '<p class="title">วันนี้ไม่มีเวร (วันหยุด)</p><p class="muted">ไม่ต้องลงเวร</p>';
  } else if (r.reason === 'before' && mine) {
    const left = toMin(d.start) - Number(st.nowMin);
    body = `<p class="title">ยังไม่ถึงเวลาเวรของคุณ</p><p class="bigname rowc">${chip(d.code, d.color)} ${esc(d.point)}</p>
    <p>เริ่ม ${hmd(d.start)} น.${left > 0 ? ` · <b>อีก ${left} นาที</b>` : ''}</p><p class="small muted">${esc(r.message)}</p>`;
  } else if (r.reason === 'after' && mine) {
    const status = r.myTime ? `ลงเวรแล้ว ${esc(r.myTime)}` : (MY_STATUS[r.myStatus] || '');
    body = `<p class="title">เวรของคุณวันนี้จบแล้ว ${hmd(d.end)} น.</p><p class="bigname rowc">${chip(d.code, d.color)} ${esc(d.point)}</p>
    ${status ? `<p><span class="tag ${r.myTime || r.myStatus === 'head' || r.myStatus === 'proxy' ? 't-ok' : r.myStatus === 'leave' ? 't-leave' : 't-miss'}">${status}</span></p>` : ''}`;
  } else {
    body = `<p class="title">ตอนนี้ไม่ใช่เวลาเวรของจุดนี้</p>${listBox}<p class="small muted">${esc(r.message)}</p>`;
  }
  return `<div class="pad center"><div class="bigicon idleicon">${ICON.clock}</div>${body}
  ${d && !mine ? myDutyNote(d) : ''}<p class="small muted">ไม่ได้บันทึกอะไร</p><div class="fill"></div>${myLink}</div>`;
}

// st: {attempt, headName}
export function fail(st) {
  return `<div class="pad center"><div class="bigicon missicon">${ICON.wifi}</div>
  <p class="title">${st.load ? 'ยังโหลดไม่สำเร็จ' : 'ยังบันทึกไม่สำเร็จ'}</p><p class="muted">สัญญาณอินเทอร์เน็ตไม่พอ ระบบกำลังลองส่งใหม่เอง</p>
  <p>ลองไปแล้ว ${Number(st.attempt) || 0} ครั้ง</p>
  <p class="small muted">ถ้ายังไม่ได้ แจ้ง${st.headName ? esc(kru(st.headName)) : 'หัวหน้าเวรวันนี้'}ให้เช็คให้ ไม่นับเป็นขาด</p><div class="fill"></div></div>
  ${dock('<button class="btn pri" data-act="retryNow">ลองอีกครั้งตอนนี้</button>')}`;
}

// st: {message, back}
export function error(st) {
  return `<div class="pad center mid"><div class="bigicon missicon">${ICON.alert}</div>
  <p class="title">ทำรายการไม่สำเร็จ</p><p class="muted">${esc(st.message || 'ระบบขัดข้อง ลองอีกครั้ง')}</p></div>
  ${st.retry ? dock('<button class="btn pri" data-act="rescan">ลองอีกครั้ง</button>') : st.back ? dock('<button class="btn" data-act="toHome">กลับ</button>') : ''}`;
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
       <div><p class="strong">${ICON.checkS} ใช้${p.kind === 'scan' ? 'รูปตอนสแกน' : 'รูปที่ถ่ายใหม่'}เป็นรูปประกอบ</p>
       <div class="row2"><button class="btn sm" data-act="repPhotoRemove">เอาออก</button><button class="btn sm" data-act="repPhotoNew">${ICON.cam} ถ่ายใหม่</button></div></div></div>`
    : `<button class="btn" data-act="repPhotoNew">${ICON.cam} ถ่ายรูปประกอบ (ไม่บังคับ)</button>`;
  return `<div class="pad"><p class="title">รายงานเหตุการณ์</p><p class="small muted">เลือกได้หลายข้อ</p>
  <div class="chips2">${(st.categories || []).map((x, i) => `<button class="chip" data-act="cat" data-i="${i}" aria-pressed="${(st.selected || []).includes(x)}">${esc(x)}</button>`).join('')}</div>
  <label class="small muted" for="note">รายละเอียด (ไม่บังคับ)</label>
  <textarea id="note" placeholder="เช่น นักเรียน ม.2 มาสาย 5 คน">${esc(st.note)}</textarea>
  ${photo}${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}<div class="fill"></div></div>
  ${dock(`<button class="btn pri" id="sendReport" data-act="sendReport"${b.disabled || st.sending ? ' disabled' : ''}>${st.sending ? 'กำลังส่ง' : b.label}</button><button class="btn" data-act="toHome">ยกเลิก</button>`)}`;
}

// st: {cats, note, time}
export function reportDone(st) {
  const title = (st.cats || []).length ? st.cats.join(' · ') : 'รายงานเหตุการณ์';
  return `<div class="okstrip">${ICON.checkS} ส่งรายงานแล้ว${st.time ? ' ' + esc(st.time) : ''}</div>
  <div class="pad"><p class="title">${esc(title)}</p>${st.note ? `<p>${esc(st.note)}</p>` : ''}
  <p class="muted">หัวหน้าเวรเห็นทันทีในแถวของคุณ และขึ้นในเอกสารประจำวันกับหน้าผู้บริหาร</p><div class="fill"></div></div>
  ${dock('<button class="btn" data-act="toHome">กลับ</button>')}`;
}

const TAG = { 'มา': 't-ok', 'สาย': 't-head', 'ลา': 't-leave', 'ขาด': 't-miss', 'ไปแทน': 't-ok', 'มีคนมาแทน': 't-head', 'ยังไม่ถึง': 't-idle', 'รอลงเวร': 't-idle' };
const shiftMonth = (ym, n) => { const [y, m] = ymdParts(ym); const t = y * 12 + (m - 1) + n; const mm = t % 12 + 1; return Math.floor(t / 12) + '-' + (mm < 10 ? '0' : '') + mm; };

// st: {r (my), month 'YYYY-MM', currentMonth 'YYYY-MM'}
// สรุป: backend นับ present = ตรงเวลา + สาย จึงแสดง "ตรงเวลา" = present − late ไม่ให้วันสายถูกนับสองครั้ง
export function my(st) {
  const r = st.r, s = r.summary, next = r.next;
  const month = st.month, canNext = st.currentMonth && month < st.currentMonth;
  const today = r.isToday && next ? next.date : '';
  const rows = r.days.length ? r.days.map((d) => `<div class="drow${d.date === today ? ' today' : ''}"><span class="dt">${dayMonth(d.date)}</span>
     <span class="rowc minw">${chip(d.label || d.duty_code)}${d.note ? `<span class="small muted">${esc(d.note)}</span>` : ''}</span>
     <span class="tag ${TAG[d.status] || 't-idle'}">${esc(d.status)}</span></div>`).join('')
    : '<p class="small muted">เดือนนี้ไม่มีวันเวร</p>';
  const stat = (n, label) => `<div><b>${Number(n) || 0}</b><small>${label}</small></div>`;
  const nameChange = r.canSelfChange ? `<button class="btn ghost" data-act="pickChange">ไม่ใช่ ${esc(kru(r.teacher.name))}? เปลี่ยนชื่อ</button><p class="small muted center">แก้เองได้จนกว่าจะสแกนลงเวรครั้งแรก</p>` : '';
  return `<div class="pad"><p class="muted">${esc(kru(r.teacher.name))}</p>
   <div class="next"><span class="small strong brand">${r.isToday ? 'เวรวันนี้' : 'เวรถัดไป'}</span>
    <span class="d">${next ? thaiDay(next.date) : 'ยังไม่มีเวรในช่วงนี้'}</span>${next ? `<span class="rowc">${dutyLine(next.duty)}</span>` : ''}</div>
   <div class="monthnav"><button class="arrow" data-act="myMonth" data-m="${shiftMonth(month, -1)}" aria-label="เดือนก่อน">‹</button>
    <b>วันเวรเดือน ${thaiMonth(month)}</b>
    <button class="arrow" data-act="myMonth" data-m="${shiftMonth(month, 1)}" aria-label="เดือนถัดไป"${canNext ? '' : ' disabled'}>›</button></div>
   <div>${rows}</div>
   <div class="stats">${stat(s.present - s.late, 'ตรงเวลา')}${stat(s.late, 'สาย')}${stat(s.leave, 'ลา')}${stat(s.absent, 'ขาด')}${stat(s.subbed, 'ไปแทน')}</div>
   <p class="small muted">ถ้าติดธุระวันเวร ให้ตกลงแลกเวรกับครูคนอื่นได้เลย คนที่มาแทนสแกน QR แล้วเลือก "มาแทน"</p>
   <p class="small muted center">หน้านี้เปิดจากลิงก์ในประกาศกลุ่ม LINE ครูได้ทุกที่ ไม่ต้องสแกน</p>
   ${nameChange}
  </div>`;
}
