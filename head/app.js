// ตัวควบคุมหน้าหัวหน้าเวร (?v=head): กติกาเดียว แตะแถว → เลือกสถานะ
// เปิดจาก web/js/app.js start() · โค้ดที่แตะ document/window อยู่ในฟังก์ชันเท่านั้น
import { call, setIdentity, setTransport } from '../js/api.js';
import { mockScenario } from '../js/liff.js';
import { renderPage, renderRow, renderSheet, renderToast, renderMessage, mergeNeedsKeys } from './view.js';
import { headMockTransport } from './mock.js';

const TOAST_MS = 8000;
const REFRESH_MS = 60000;
const AUTH_KEY = 'head.authReload';
const AUTH_RELOAD_GAP_MS = 120000;

// seq = รุ่นของจอ (ผลรีเฟรชที่ออกก่อนรุ่นนี้ทิ้ง) · req/appliedReq = ลำดับคำขอบันทึก/เลิกทำ (ผลที่ตอบช้ากว่าไม่ทับผลใหม่)
const H = {
  view: null, filter: 'all', saving: {}, thumbs: {}, full: {}, fullFail: {}, asked: new Set(),
  needsKeys: null, seq: 0, req: 0, appliedReq: 0, stale: false,
  sheetKey: null, toast: null, toastTimer: null, pending: 0, thumbBusy: false, mock: null
};

// โทเคน LINE หมดอายุ (หน้าเปิดค้างนาน) → โหลดหน้าใหม่ได้ครั้งเดียวต่อช่วง กันวนโหลดไม่รู้จบ
export function authReloadAllowed(last, now, gapMs = AUTH_RELOAD_GAP_MS) {
  const t = Number(last);
  if (last === null || last === undefined || last === '' || !Number.isFinite(t)) return true;
  return now - t >= gapMs || now < t;
}

const $ = (id) => document.getElementById(id);
const root = () => $('app');

function allRows() { return H.view ? (H.view.sessions || []).flatMap((s) => s.rows) : []; }
function rowByKey(key) { return allRows().find((r) => r.key === key) || null; }
function rowEl(key) { return Array.from(document.querySelectorAll('[data-act="row"]')).find((el) => el.dataset.key === key) || null; }
function ui() { return { filter: H.filter, needsKeys: H.needsKeys, saving: H.saving, thumbs: H.thumbs, stale: H.stale }; }

// ลิงก์ "เวรของฉัน" = หน้าเดิมไม่มี ?v (โหมดทดลองไปหน้า mock=my)
function myDutyHref() { return location.pathname + (H.mock !== null ? '?mock=my' : ''); }

function showMessage(title, text, withLink) {
  closeSheet(false);
  root().innerHTML = renderMessage(title, text, withLink ? { href: myDutyHref(), label: 'ไปหน้าเวรของฉัน' } : null);
}

function showError(res) {
  const code = res && res.code;
  if (code === 'not_head') return showMessage('เปิดใบเช็คไม่ได้', res.message, true);
  if (code === 'not_bound') return showMessage('ยังไม่ได้เลือกชื่อ', res.message, true);
  if (code === 'auth') return showMessage('ยืนยันตัวตนไม่สำเร็จ', res.message, false);
  if (code === 'network') return showMessage('ยังโหลดไม่สำเร็จ', 'สัญญาณอินเทอร์เน็ตไม่พอ ให้ปิดหน้านี้แล้วเปิดใหม่เมื่อมีสัญญาณ', false);
  return showMessage('เกิดข้อผิดพลาด', (res && res.message) || 'ระบบขัดข้อง ให้ปิดหน้านี้แล้วเปิดใหม่', false);
}

function reloadForAuth(res) {
  let ok = false;
  try {
    ok = authReloadAllowed(sessionStorage.getItem(AUTH_KEY), Date.now());
    if (ok) sessionStorage.setItem(AUTH_KEY, String(Date.now()));
  } catch (e) {
    ok = false; // จำไม่ได้ว่าเพิ่งโหลดใหม่ → ไม่โหลดเอง (กันวน)
  }
  if (ok) return location.reload();
  showError(res);
}

function showLoading(text) {
  root().innerHTML = '<div class="pad mid center"><div class="spin" aria-hidden="true"></div><p>' + text + '</p></div>';
}

// ---------- วาด ----------
function mountShell() {
  root().innerHTML = '<div id="hpage"></div><div id="hsheet" class="sheetwrap" hidden></div><div id="htoast" class="toastwrap" aria-live="polite"></div>';
}

function drawPage() {
  if (!$('hpage')) mountShell();
  $('hpage').innerHTML = renderPage(H.view, ui());
}

// แทนเฉพาะแถวนั้น ไม่วาดทั้งหน้า (คงตำแหน่งเลื่อนและโฟกัส)
function drawRow(key) {
  const row = rowByKey(key), el = rowEl(key);
  if (!row || !el) return;
  const focused = document.activeElement === el;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderRow(row, ui());
  const fresh = tmp.firstElementChild;
  el.replaceWith(fresh);
  if (focused) fresh.focus({ preventScroll: true });
}

// ---------- รูป ----------
function dataUrl(r) { return r && r.ok && /^image\//.test(String(r.mime)) && r.base64 ? 'data:' + r.mime + ';base64,' + r.base64 : ''; }

// รูปเล็กทีละรูปหลังวาด เก็บตาม checkinId
async function loadThumbs() {
  if (H.thumbBusy) return;
  H.thumbBusy = true;
  try {
    for (;;) {
      const row = allRows().find((r) => r.photo && !H.thumbs[r.photo.checkinId] && !H.asked.has(r.photo.checkinId));
      if (!row) break;
      const id = row.photo.checkinId;
      H.asked.add(id);
      const url = dataUrl(await call('headPhoto', { checkinId: id, size: 'thumb' }, { retries: 1 }));
      if (!url) continue;
      H.thumbs[id] = url;
      allRows().filter((r) => r.photo && r.photo.checkinId === id).forEach((r) => drawRow(r.key));
    }
  } finally {
    H.thumbBusy = false;
  }
}

async function loadFull(row) {
  const id = row.photo.checkinId;
  if (H.full[id]) return;
  const url = dataUrl(await call('headPhoto', { checkinId: id, size: 'full' }, { retries: 1 }));
  if (!url) {
    H.fullFail[id] = true;
    if (H.sheetKey === row.key) drawSheet(false);
    return;
  }
  H.full[id] = url;
  if (H.sheetKey === row.key) drawSheet(false);
}

// ---------- แผ่นเลือกสถานะ ----------
function drawSheet(focus) {
  const row = rowByKey(H.sheetKey);
  if (!row) return closeSheet(false);
  const box = $('hsheet');
  const id = row.photo ? row.photo.checkinId : null;
  box.innerHTML = renderSheet(row, { full: id ? H.full[id] : '', failed: id ? !!H.fullFail[id] : false });
  box.hidden = false;
  if (focus) {
    const first = box.querySelector('.opt:not(:disabled)') || box.querySelector('[data-act="close"].btn');
    if (first) first.focus();
  }
}

function openSheet(key) {
  const row = rowByKey(key);
  if (!row || H.saving[key]) return;
  H.sheetKey = key;
  if (row.photo) delete H.fullFail[row.photo.checkinId]; // เปิดใหม่ = ลองโหลดรูปอีกครั้ง
  document.body.style.overflow = 'hidden';
  drawSheet(true);
  if (row.photo) loadFull(row);
}

function closeSheet(refocus = true) {
  const key = H.sheetKey;
  H.sheetKey = null;
  document.body.style.overflow = '';
  const box = $('hsheet');
  if (box) { box.hidden = true; box.innerHTML = ''; }
  if (refocus && key) { const el = rowEl(key); if (el) el.focus({ preventScroll: true }); }
}

// ---------- แถบแจ้งผล + เลิกทำ ----------
function showToast(text, undoToken) {
  clearTimeout(H.toastTimer);
  H.toast = text ? { text, undo: !!undoToken, undoToken: undoToken || null } : null;
  const box = $('htoast');
  if (box) box.innerHTML = renderToast(H.toast);
  if (H.toast) H.toastTimer = setTimeout(() => showToast(null), TOAST_MS);
}

// fromServer = รีเฟรชจากหลังบ้าน (ไม่ใช่ผลการบันทึกของหัวหน้าเวรเอง): ตัวกรองต้องดูเพิ่มแถวที่เพิ่งต้องดู
function applyView(view, fromServer) {
  H.seq++;
  H.view = view;
  if (fromServer && H.filter === 'needs') H.needsKeys = mergeNeedsKeys(H.needsKeys, view);
  if (H.sheetKey && !rowByKey(H.sheetKey)) closeSheet(false);
  drawPage();
  loadThumbs();
}

// เลือกสถานะ: ปิดแผ่นทันที แถวขึ้น "กำลังบันทึก…" · ไม่ลองซ้ำเอง (กันเขียนซ้อน)
async function choose(action) {
  const row = rowByKey(H.sheetKey);
  if (!row || !action) return;
  const opt = (row.options || []).find((o) => o.action === action);
  if (!opt || opt.disabled) return;
  closeSheet();
  H.seq++;
  const req = ++H.req;
  H.saving[row.key] = true;
  H.pending++;
  drawRow(row.key);
  const res = await call('headSet', {
    date: H.view.date, dutyCode: row.dutyCode, teacherId: row.teacherId, setAction: action, expectSig: row.sig
  }, { retries: 0 });
  H.pending--;
  delete H.saving[row.key];
  if (res.code === 'auth') return reloadForAuth(res);
  if (res.code === 'not_head' || res.code === 'not_bound') return showError(res);
  if (!takeView(req, res.view)) drawRow(row.key);
  showToast(res.ok ? res.toast : res.message, res.ok ? res.undoToken : null);
  if (res.code === 'locked') refresh(true);
}

// ผลบันทึก/เลิกทำ: ใช้ view เฉพาะเมื่อคำขอนี้ใหม่กว่าผลที่ใช้ไปแล้ว · ผลเก่าที่มาช้าไม่ทับ (ขอข้อมูลล่าสุดแทนเมื่อว่าง)
function takeView(req, view) {
  if (!view) return false;
  if (req > H.appliedReq) {
    H.appliedReq = req;
    applyView(view);
    return true;
  }
  if (H.pending === 0) refresh(true);
  return false;
}

async function undo() {
  const t = H.toast && H.toast.undoToken;
  if (!t) return;
  showToast(null);
  H.seq++;
  const req = ++H.req;
  H.pending++;
  const res = await call('headUndo', { undoToken: t }, { retries: 0 });
  H.pending--;
  if (res.code === 'auth') return reloadForAuth(res);
  if (res.code === 'not_head' || res.code === 'not_bound') return showError(res);
  takeView(req, res.view);
  showToast(res.ok ? res.toast : res.message);
}

function setStale(on) {
  if (H.stale === on) return;
  H.stale = on;
  if (H.view) drawPage();
}

// รีเฟรชเงียบ ๆ เมื่อเปิดหน้าอยู่ ไม่มีแผ่นเปิด และไม่มีงานบันทึกค้าง
async function refresh(force) {
  const idle = () => !H.sheetKey && H.pending === 0;
  if (!force && (document.visibilityState !== 'visible' || !idle())) return;
  // ผลรีเฟรชที่ออกไปก่อนการบันทึก/เลิกทำ/วาดใหม่ ทิ้งไป (กันข้อมูลเก่าทับผลที่ใหม่กว่า)
  const seq = H.seq;
  const res = await call('headView', {}, { retries: 0 });
  if (res.code === 'auth') return reloadForAuth(res);
  if (res.code === 'network') return setStale(true);
  if (!res.ok) return;
  if (idle() && seq === H.seq) { H.stale = false; applyView(res, true); } else setStale(false);
}

// ---------- ปุ่มทั้งหมด ----------
const ACTIONS = {
  row: (d) => openSheet(d.key),
  close: () => closeSheet(),
  opt: (d) => choose(d.a),
  // แตะ "เฉพาะที่ต้องดู" = ตรึงชุดแถวที่ต้องดูตอนนี้ไว้ (แตะซ้ำเพื่อคำนวณใหม่) · "ทั้งหมด" = เลิกตรึง
  filter: (d) => {
    H.filter = d.f === 'needs' ? 'needs' : 'all';
    H.needsKeys = H.filter === 'needs' ? allRows().filter((r) => r.needs).map((r) => r.key) : null;
    drawPage();
  },
  undo: () => undo()
};

function bindEvents() {
  root().addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el.dataset);
  });
  root().addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && H.sheetKey) return closeSheet();
    const el = e.target.closest && e.target.closest('[data-act="row"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSheet(el.dataset.key); }
  });
}

export async function startHead(identity) {
  bindEvents();
  H.mock = mockScenario(location.search);
  if (H.mock !== null) {
    setTransport(headMockTransport(H.mock || 'morning'));
    setIdentity({});
  } else if (identity && identity.idToken) {
    setIdentity({ idToken: identity.idToken });
  } else {
    return showMessage('ต้องเปิดจากแอป LINE', 'หน้าหัวหน้าเวรต้องเปิดจากแอป LINE ให้ปิดหน้านี้แล้วเปิดลิงก์จาก LINE อีกครั้ง', false);
  }
  showLoading('กำลังเปิดใบเช็ค');
  const onRetry = (n) => showLoading('ยังโหลดไม่สำเร็จ กำลังลองใหม่ (ครั้งที่ ' + n + ')');
  const home = await call('headHome', {}, { onRetry, retries: 5 });
  if (!home.ok) return showError(home);
  const view = await call('headView', {}, { onRetry, retries: 5 });
  if (!view.ok) return showError(view);
  mountShell();
  applyView(view);
  setInterval(() => refresh(false), REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(false); });
}
