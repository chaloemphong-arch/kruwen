// ตัวควบคุมหน้าครูเวร: อ่าน ?p=&k= (สแกน) หรือไม่มี p (เวรของฉัน) แล้วเลือกหน้าจอจากผล call()
// import ได้ใน Node (เทสต์ใช้ routeFor): โค้ดที่แตะ document/window/navigator อยู่ในฟังก์ชันเท่านั้น
import { call, setIdentity, setTransport, retryNow } from './api.js';
import { initIdentity, mockScenario, viewParam } from './liff.js';
import * as camera from './camera.js';
import { getGps } from './gps.js';
import * as V from './screens.js';
import { setAddKru } from './names.js';
import { mockTransport, mockStreamSource } from './mock.js';

// ผลจากหลังบ้าน → ชื่อหน้าจอ
// สถานการณ์ทดลองที่เปิดหน้าเวรของฉัน/ต้อนรับเลย ไม่มีจุดสแกน
export const noGateMock = (m) => m === 'my' || m === 'my_council' || m === 'welcome';

export function routeFor(res, opts = {}) {
  if (!res || !res.ok) {
    const code = res && res.code;
    if (code === 'taken') return 'taken';
    if (code === 'network') return 'fail';
    if (code === 'not_bound') return 'welcome';
    return 'error';
  }
  switch (res.kind) {
    case 'checked_in': return res.photoRequired && !opts.cameraFailed ? 'scanCam' : 'success';
    case 'menu': return 'menu';
    case 'proxied': return opts.proxiedSeen ? 'menu' : 'proxied';
    case 'stood_by_other': return 'covered';
    case 'on_leave': return 'onLeave';
    case 'ask_substitute': return 'subask';
    case 'wrong_point': return 'wrongPoint';
    case 'outside': return 'outside';
    case 'need_bind': return 'pick';
    case 'report_done': return 'reportDone';
    case 'photo_done': return 'success';
    case 'renamed': return 'success';
    case 'my': return 'my';
    case 'bound': return 'my';
    case 'team': return 'team';
    default: return 'error';
  }
}

const toMin = (hhmm) => { const p = String(hhmm).split(':'); return Number(p[0]) * 60 + Number(p[1]); };
const minToHHMM = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const CAM_SCREENS = ['scanCam', 'cam'];
const SHEET_SCREENS = ['preview', 'success', 'menu'];

// ---------- สถานะของหน้า ----------
const A = {
  P: '', K: '', mock: null, line: false, school: '',
  screen: '', st: null,
  c: null, home: 'success', viaProxy: null, noPhoto: null, photoSent: false, localPhoto: null, localB64: null,
  teacherName: '', renamed: false, photoGen: 0,
  pick: null, picked: null, camFor: null, group: [], signed: [], skipped: [], cands: null, sheet: null, pickFor: null, pickFrom: null, teamFrom: null, shot: null, rep: null, my: null, menuError: '',
  config: null, configP: null, waitConfig: false, clock: null, timer: null, searchTimer: null, searchSeq: 0
};

// เวลาเซิร์ฟเวอร์ (นาที) = ค่าที่ได้ล่าสุด + เวลาที่ผ่านไปในเครื่อง (ไม่ใช้นาฬิกามือถือโดยตรง)
function setClock(hhmm) { if (hhmm) A.clock = { min: toMin(hhmm), at: Date.now() }; }
function nowMin() { return A.clock ? A.clock.min + Math.floor((Date.now() - A.clock.at) / 60000) : null; }
function actionsOpen(c) { const n = nowMin(); return n === null || n <= toMin(c.actionsUntil); }
function photoOpen(c) { const n = nowMin(); return n === null || n <= toMin(c.photoUntil); }
function canRename(c) { const n = nowMin(); return A.line && !A.viaProxy && n !== null && n <= toMin(c.renameUntil); }

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { /* โหมดส่วนตัว/บล็อก storage */ }
  return null;
}

function root() { return document.getElementById('app'); }

function show(screen, st) {
  if (CAM_SCREENS.includes(A.screen) && !CAM_SCREENS.includes(screen)) camera.stop();
  if (!SHEET_SCREENS.includes(screen)) A.sheet = null;
  A.screen = screen;
  A.st = st || {};
  const html = V[screen](A.st);
  root().innerHTML = html;
  document.body.classList.toggle('dark', CAM_SCREENS.includes(screen));
  window.scrollTo(0, 0);
  if (screen === 'pick') bindSearch();
  if (screen === 'report') bindReport();
}

// load = คำขออ่านอย่างเดียว ("ยังโหลดไม่สำเร็จ") ไม่ใช่การบันทึก
function showFail(n, load) { show('fail', { attempt: n, load: !!load }); }
const retrying = { onRetry: (n) => showFail(n, false) };
const loadingRetry = { onRetry: (n) => showFail(n, true) };

function showError(res, back, retry) {
  const screen = routeFor(res);
  if (screen === 'welcome') return show('welcome', { school: A.school });
  if (screen === 'taken') return show('taken', { name: A.picked ? A.picked.name : '' });
  return show('error', { message: res.message, back: back === 'my' ? 'my' : !!back, retry: !!retry });
}

// รหัสรายงานหนึ่งรหัสต่อหนึ่งฟอร์ม: ส่งซ้ำตอนเน็ตหลุดแล้วหลังบ้านไม่สร้างรายงานซ้ำ
function newReportId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function ensureConfig() {
  if (!A.configP) {
    // config โหลดเบื้องหลัง: แสดงหน้า "ยังโหลดไม่สำเร็จ" เฉพาะตอนที่หน้าจอรอ config อยู่จริง (A.waitConfig)
    A.configP = call('config', {}, { onRetry: (n) => { if (A.waitConfig) showFail(n, true); } }).then((cfg) => {
      if (cfg && cfg.ok) {
        A.config = cfg;
        setAddKru(cfg.name_add_kru);
        store('duty.addKru', cfg.name_add_kru === false ? '0' : '1');
        A.school = cfg.school_name || '';
        if (!A.clock && cfg.serverTime) setClock(cfg.serverTime.slice(11, 16));
      } else {
        A.configP = null;
      }
      return cfg;
    });
  }
  return A.configP;
}

// ---------- หน้า "กลับบ้าน" (สำเร็จ หรือ เมนู) ----------
function homeState() {
  const c = A.c;
  if (A.home === 'menu') {
    return { c, actionsOpen: actionsOpen(c), photoOpen: photoOpen(c), canRename: canRename(c), viaProxy: A.viaProxy, photoSent: A.photoSent, error: A.menuError,
      signed: A.signed, skipped: A.skipped, sheet: A.sheet };
  }
  return { c, actionsOpen: actionsOpen(c), photoOpen: photoOpen(c), canRename: canRename(c), noPhoto: A.noPhoto, photoSent: A.photoSent,
    teacherName: A.teacherName, renamed: A.renamed, signed: A.signed, skipped: A.skipped, sheet: A.sheet };
}
function showHome() {
  if (!A.c) return doMy();
  show(A.home, homeState());
}

// ปุ่มบนหน้าสำเร็จ/เมนูหายเองเมื่อเลยเวลาเวร; นับถอยหลังหน้านอกเวลา
function tick() {
  if (A.screen === 'success' || A.screen === 'menu') {
    const next = homeState();
    if (next.actionsOpen !== A.st.actionsOpen || next.photoOpen !== A.st.photoOpen || next.canRename !== A.st.canRename) show(A.screen, next);
  } else if (A.screen === 'outside') {
    show('outside', { r: A.st.r, nowMin: nowMin() });
  }
}

// ขอพิกัดเฉพาะเมื่อ Settings use_gps = TRUE (config ยังไม่มา = ไม่ขอ) · โหมดทดลองไม่ขอ
function scanGps() {
  return A.mock === null && A.config && A.config.use_gps === true ? getGps(3000) : Promise.resolve(null);
}

// ---------- สแกน ----------
async function doScan() {
  show('loading', { title: 'กำลังบันทึก' });
  ensureConfig();
  const gps = await scanGps();
  const res = await call('scan', { pointId: A.P, token: A.K, gps }, retrying);
  handleScan(res);
}

function proxiedSeen(id) { return store('duty.proxied.' + id) === '1'; }

function handleScan(res) {
  const screen = routeFor(res, { proxiedSeen: res && res.kind === 'proxied' && proxiedSeen(res.checkin_id) });
  switch (screen) {
    case 'pick':
      A.pick = { mode: 'scan', candidates: res.candidates || [], query: '', results: null };
      return show('pick', A.pick);
    case 'scanCam': case 'success':
      return afterCheckin(res);
    case 'menu':
      if (res.kind === 'proxied') return goMenu(res.menu, { name: res.by.name, time: res.time });
      return goMenu(res, null);
    case 'proxied':
      store('duty.proxied.' + res.checkin_id, '1');
      A.c = res.menu; A.home = 'menu'; A.viaProxy = { name: res.by.name, time: res.time };
      return show('proxied', { r: res });
    case 'outside':
      setClock(res.nowHHMM);
      return show('outside', { r: res, nowMin: nowMin() });
    case 'covered': case 'onLeave': case 'subask': case 'wrongPoint':
      return show(screen, { r: res });
    default:
      // สแกนส่งซ้ำได้อย่างปลอดภัย: ข้อผิดพลาดของเซิร์ฟเวอร์ (รวมรอคิวนานเกิน) ให้ลองอีกครั้งได้
      return showError(res, false, !!res && res.code === 'server_error');
  }
}

function goMenu(c, viaProxy) {
  A.c = c; A.home = 'menu'; A.viaProxy = viaProxy; A.photoSent = false; A.menuError = '';
  A.signed = []; A.skipped = []; A.group = []; A.sheet = null; A.cands = null;
  show('menu', homeState());
  // ผล menu ไม่มีเวลาปัจจุบัน: ยังไม่รู้เวลาเซิร์ฟเวอร์ → ขอ config เงียบ ๆ แล้ววาดเมนูใหม่ (ปุ่มเปลี่ยนชื่อต้องเทียบ renameUntil กับเวลาเซิร์ฟเวอร์)
  if (!A.clock) ensureConfig().then(() => { if (A.screen === 'menu') show('menu', homeState()); });
}

function afterCheckin(c) {
  A.c = c; A.home = 'success'; A.viaProxy = null; A.noPhoto = null; A.photoSent = false;
  A.localPhoto = null; A.localB64 = null; A.renamed = false;
  A.signed = []; A.skipped = []; A.group = []; A.sheet = null; A.cands = null;
  setClock(c.time);
  if (routeFor(c) === 'success') return showHome();
  if (c.photoMode === 'สุ่ม') return show('scanCam', { c, mode: 'ask' });
  return openScanCam();
}

// ---------- กล้อง ----------
async function startCamera() {
  const video = document.getElementById('video');
  return video ? camera.openLiveCamera(video, 'environment') : null;
}

async function openScanCam() {
  A.camFor = 'scan';
  if (!A.cands) A.cands = loadCands();
  show('scanCam', { c: A.c, mode: 'live' });
  const s = await startCamera();
  if (s || A.screen !== 'scanCam') return;
  if (A.home === 'menu') { A.menuError = 'กล้องเปิดไม่ได้ ลองสแกนซ้ำอีกครั้ง หรือเปิดสิทธิ์กล้องให้ LINE'; return showHome(); }
  A.noPhoto = { reason: 'camera' };
  show(routeFor(A.c, { cameraFailed: true }), homeState());
}

async function openCam(purpose, tip) {
  A.camFor = purpose;
  show('cam', { tip });
  const s = await startCamera();
  if (s || A.screen !== 'cam') return;
  if (purpose === 'proxy') {
    return show('error', { message: 'เปิดกล้องไม่ได้ ลงชื่อให้เพื่อนต้องมีรูปทุกครั้ง ให้คนที่ลืมโทรศัพท์แจ้งหัวหน้าเวรเช็คให้', back: true });
  }
  A.rep.error = 'เปิดกล้องไม่ได้ ส่งรายงานโดยไม่มีรูปได้';
  show('report', A.rep);
}

function shoot() {
  const video = document.getElementById('video');
  const b64 = video ? camera.capture(video) : null;
  if (!b64) return;
  camera.stop();
  A.shot = b64;
  show('preview', previewState());
}

function retake() {
  if (A.camFor === 'scan') return openScanCam();
  if (A.camFor === 'proxy') return openCam('proxy', PROXY_TIP);
  return openCam('report', 'ถ่ายรูปเหตุการณ์');
}

function skipPhoto() {
  camera.stop();
  A.group = [];
  if (A.home === 'menu') return showHome();
  A.noPhoto = { reason: 'skipped' };
  showHome();
}

// ---------- หน้าตรวจรูป / เลือกชื่อเพื่อน ----------
const PROXY_TIP = 'ถ่ายรูปทุกคนที่จุดเวร';
const shotUrl = () => 'data:image/jpeg;base64,' + A.shot;
const groupIds = () => A.group.map((t) => t.teacher_id);
const groupNames = () => A.group.map((t) => t.name);
const nameOf = (list) => (list || []).map((t) => t.name);

function previewState(extra) {
  return Object.assign({ img: shotUrl(), purpose: A.camFor, group: A.camFor === 'report' ? [] : A.group, c: A.camFor === 'scan' ? A.c : null,
    sending: false, error: '', sheet: A.sheet }, extra);
}

// วาดหน้าเดิมใหม่ (หน้าตรวจรูป หรือหน้าหลักหลังสแกน) ตาม A.sheet
function rerender() {
  if (A.screen === 'preview') return show('preview', previewState());
  return showHome();
}

// รายชื่อที่ยังไม่เช็ค: โหลดล่วงหน้าตอนเปิดกล้อง ใช้ซ้ำตอนเปิดแผ่นเลือก (ล้มเหลว = ไม่เก็บ ให้ลองโหลดใหม่ครั้งหน้า)
function loadCands() {
  const p = call('proxyCandidates', { pointId: A.P }, { retries: 1 }).then((r) => { if (!r.ok && A.cands === p) A.cands = null; return r; });
  return p;
}

async function openPick(from) {
  A.pickFrom = from;
  const draft = from === 'home' ? [] : groupIds();
  const sheet = { kind: 'pick', friends: [], checked: [], draft, loading: true, requireOne: from === 'home' || A.pickFor === 'proxy' };
  A.sheet = sheet;
  if (!A.cands) A.cands = loadCands();
  rerender();
  const r = await A.cands;
  if (A.sheet !== sheet) return;
  if (!r.ok) {
    A.sheet = null;
    if (from === 'preview') return show('preview', previewState({ error: r.message }));
    A.menuError = r.message; return showHome();
  }
  sheet.friends = r.friends || []; sheet.checked = r.checked || []; sheet.loading = false;
  rerender();
}

// เปลี่ยนวงกลมกับปุ่มเสร็จตรงจุด (วาดใหม่ทั้งแผ่นแล้วรายชื่อเลื่อนกลับไปบนสุด)
function syncPick() {
  const sh = A.sheet;
  if (!sh || sh.kind !== 'pick') return;
  root().querySelectorAll('[data-act="pickToggle"]').forEach((b) => b.setAttribute('aria-pressed', String(sh.draft.includes(b.dataset.id))));
  const done = root().querySelector('[data-act="pickDone"]');
  if (done) done.disabled = !!(sh.requireOne && !sh.draft.length);
}

function pickToggle(d) {
  const sh = A.sheet;
  if (!sh || sh.kind !== 'pick') return;
  sh.draft = sh.draft.includes(d.id) ? sh.draft.filter((x) => x !== d.id) : sh.draft.concat([d.id]);
  syncPick();
}

function pickDone() {
  const sh = A.sheet;
  if (!sh || sh.kind !== 'pick' || sh.loading) return;
  if (sh.requireOne && !sh.draft.length) return;
  const known = new Map(A.group.map((t) => [t.teacher_id, t]));
  sh.friends.forEach((t) => known.set(t.teacher_id, t));
  A.group = sh.draft.map((id) => known.get(id)).filter(Boolean).map((t) => ({ teacher_id: t.teacher_id, name: t.name }));
  A.sheet = null;
  if (A.pickFrom === 'home') return openCam('proxy', PROXY_TIP);
  show('preview', previewState());
}

function sheetClose() {
  A.sheet = null;
  rerender();
}

function sendPhoto() {
  if (A.camFor === 'report') {
    A.rep.photo = { kind: 'new', img: shotUrl(), b64: A.shot };
    A.rep.error = '';
    return show('report', A.rep);
  }
  if (A.group.length) {
    A.sheet = { kind: 'confirm', img: shotUrl(), names: groupNames() };
    return show('preview', previewState());
  }
  if (A.camFor === 'scan') return sendScanPhoto(A.shot);
  // ลงชื่อให้เพื่อนต้องมีอย่างน้อยหนึ่งคน
  A.pickFor = 'proxy';
  return openPick('preview');
}

function groupConfirm() {
  A.sheet = null;
  return A.camFor === 'proxy' ? sendProxy(A.shot) : sendScanPhoto(A.shot);
}

function noteSigned(r) {
  const added = nameOf(r.friends);
  A.signed = A.signed.concat(added.filter((n) => !A.signed.includes(n)));
  A.skipped = nameOf(r.skipped);
  A.group = [];
  A.cands = null; // รายชื่อที่เช็คแล้วเปลี่ยน โหลดใหม่ครั้งหน้า
}

// รูปหลังสแกน: การลงเวรบันทึกแล้ว เน็ตล้มเหลว → ไปหน้าสำเร็จทันที แล้วลองส่งใหม่เบื้องหลัง
// มีรายชื่อเพื่อนด้วย: รอผลจริงก่อน (ไม่ข้ามไปหน้าหลัก) ล้มเหลวแล้วอยู่หน้าตรวจรูปพร้อมรายชื่อเดิม
async function sendScanPhoto(b64) {
  const gen = ++A.photoGen;
  const url = 'data:image/jpeg;base64,' + b64;
  A.localPhoto = url; A.localB64 = b64;
  const withFriends = A.group.length > 0;
  show('preview', previewState({ sending: true }));
  const payload = { pointId: A.P, token: A.K, photo: { base64: b64 } };
  if (withFriends) { payload.friendIds = groupIds(); payload.gps = await scanGps(); }
  let movedOn = false;
  const res = await call('photo', payload, {
    onRetry: () => {
      if (withFriends || movedOn || gen !== A.photoGen) return;
      movedOn = true;
      A.noPhoto = { reason: 'send', retrying: true };
      if (A.home === 'menu') A.menuError = 'ส่งรูปไม่สำเร็จ ระบบกำลังลองส่งใหม่เอง';
      showHome();
    },
    shouldContinue: () => gen === A.photoGen
  });
  if (gen !== A.photoGen) return;
  if (withFriends && !res.ok) return show('preview', previewState({ error: res.message }));
  const onHome = !movedOn || A.screen === A.home;
  if (res.ok) {
    A.c = Object.assign({}, A.c, { hasPhoto: true });
    A.noPhoto = null; A.photoSent = true; A.menuError = '';
    if (withFriends) noteSigned(res);
  } else {
    A.noPhoto = { reason: 'send', message: res.code === 'network' ? '' : res.message };
    if (A.home === 'menu') A.menuError = res.message;
  }
  if (onHome) showHome();
}

// ---------- ลงชื่อให้เพื่อน ----------
function startProxy() {
  A.pickFor = 'proxy'; A.group = [];
  return openPick('home');
}

async function sendProxy(b64) {
  show('preview', previewState({ sending: true }));
  const gps = await scanGps();
  const r = await call('proxy', { pointId: A.P, token: A.K, friendIds: groupIds(), photo: { base64: b64 }, gps }, retrying);
  // ทุกคนมีบันทึกแล้ว/ไม่ใช่เวรเดียวกัน → ข้อความของหลังบ้านขึ้นที่หน้าตรวจรูป
  if (!r.ok) return show('preview', previewState({ error: r.message }));
  noteSigned(r);
  showHome();
}

// ---------- รายงานเหตุการณ์ ----------
async function startReport() {
  show('loading', { title: 'กำลังโหลด' });
  A.waitConfig = true;
  const cfg = await ensureConfig();
  A.waitConfig = false;
  const cats = cfg && cfg.ok ? cfg.report_categories || [] : [];
  let photo = null;
  if (A.c && A.c.hasPhoto && !A.viaProxy) photo = { kind: 'scan', img: A.localPhoto };
  else if (A.localB64) photo = { kind: 'new', img: A.localPhoto, b64: A.localB64 };
  A.rep = { categories: cats, selected: [], note: '', photo, error: '', sending: false, reportId: newReportId() };
  show('report', A.rep);
}

function bindReport() {
  const note = document.getElementById('note');
  if (!note) return;
  note.addEventListener('input', () => {
    A.rep.note = note.value;
    const btn = document.getElementById('sendReport');
    const b = V.reportButton(A.rep);
    btn.textContent = b.label;
    btn.disabled = b.disabled;
  });
}

function readNote() { const n = document.getElementById('note'); if (n && A.rep) A.rep.note = n.value; }

async function sendReport() {
  readNote();
  if (V.reportButton(A.rep).disabled) return;
  const p = A.rep.photo;
  const payload = { reportId: A.rep.reportId, pointId: A.P, token: A.K, categories: A.rep.selected.slice(), note: A.rep.note, useScanPhoto: !!p && p.kind === 'scan' };
  if (p && p.kind === 'new') payload.photo = { base64: p.b64 };
  A.rep.sending = true;
  show('report', A.rep);
  const r = await call('report', payload, retrying);
  A.rep.sending = false;
  if (!r.ok) {
    A.rep.error = r.message;
    if (r.code === 'no_scan_photo') A.rep.photo = null;
    return show('report', A.rep);
  }
  const n = nowMin();
  show('reportDone', { cats: payload.categories, note: payload.note.trim(), time: n === null ? '' : minToHHMM(n) });
}

// ---------- เลือกชื่อ / ผูก / เปลี่ยนชื่อ ----------
function bindSearch() {
  const q = document.getElementById('q');
  if (!q) return;
  q.addEventListener('input', () => {
    A.pick.query = q.value;
    A.pick.results = null;
    A.pick.error = '';
    clearTimeout(A.searchTimer);
    const seq = ++A.searchSeq;
    document.getElementById('qres').innerHTML = V.searchResults(A.pick);
    if (!q.value.trim()) return;
    A.searchTimer = setTimeout(async () => {
      const r = await call('search', { query: q.value }, { retries: 1 });
      if (seq !== A.searchSeq || A.screen !== 'pick') return;
      if (r.ok) A.pick.results = r.teachers || [];
      else A.pick.error = r.message;
      document.getElementById('qres').innerHTML = V.searchResults(A.pick);
    }, 350);
  });
}

function startPick(mode) {
  A.pick = { mode, candidates: [], query: '', results: null };
  show('pick', A.pick);
}

function rememberTeacher(t) {
  if (!t) return;
  A.teacherName = t.name;
  store('duty.teacherId', t.teacher_id);
}

async function confirmYes() {
  const mode = A.pick.mode, t = A.picked;
  show('loading', { title: 'กำลังบันทึก' });
  if (mode === 'rename') {
    const r = await call('rename', { newTeacherId: t.teacher_id }, retrying);
    if (!r.ok) return showError(r, true);
    rememberTeacher(r.teacher);
    A.renamed = true;
    return showHome();
  }
  const r = await call(mode === 'change' ? 'selfChange' : 'bind', { teacherId: t.teacher_id }, retrying);
  if (!r.ok) return showError(r, mode !== 'scan');
  rememberTeacher(r.teacher);
  if (mode === 'scan') return doScan();
  return doMy();
}

// ---------- เวรของฉัน ----------
async function doMy(month) {
  show('loading', { title: 'กำลังโหลด' });
  A.waitConfig = true;
  const [cfg, r] = await Promise.all([ensureConfig(), call('my', month ? { month } : {}, loadingRetry)]);
  A.waitConfig = false;
  if (!r.ok) return showError(r);
  rememberTeacher(r.teacher);
  const current = cfg && cfg.ok && cfg.serverTime ? cfg.serverTime.slice(0, 7) : '';
  const m = month || current || (r.today && r.today[0] ? r.today[0].date.slice(0, 7) : '') || (r.next ? r.next.date.slice(0, 7) : '');
  // คนที่เปิดใบเช็คได้และไม่มีเวรของตัวเองเลย (ไม่มีทั้งวันนี้ ครั้งถัดไป และในเดือนนี้) ไปหน้าตรวจเวรทันที
  if (!month && r.canHead && !r.next && !(r.today || []).length && !(r.days || []).length) return toHead();
  const today = cfg && cfg.ok && cfg.serverTime ? cfg.serverTime.slice(0, 10) : '';
  show('my', { r, month: m, currentMonth: current || m, today });
}

// ใบเช็คเวรวันนี้ (ดูอย่างเดียว) จากปุ่มในหน้าเวรปฏิบัติหน้าที่ประจำวัน
async function doTeam() {
  show('loading', { title: 'กำลังโหลด' });
  const r = await call('teamView', {}, loadingRetry);
  if (!r.ok) return showError(r, 'my');
  show('team', { r, tab: Math.max(0, r.sessions.findIndex((x) => x.mine)) });
}

// push = แตะปุ่มเปิดเอง: เก็บหน้าเดิมไว้ในประวัติ กดย้อนกลับแล้วกลับมาหน้าเวรของฉัน (ไม่ปิดหน้าทั้งหมด)
// ไปเองอัตโนมัติ (ไม่มีเวรของตัวเอง) = แทนที่หน้าเดิม
function toHead(push) {
  show('loading', { title: 'กำลังเปิด' });
  const url = location.pathname + '?v=head' + (A.mock !== null ? '&mock=morning' : '');
  if (push) location.assign(url); else location.replace(url);
}

// ---------- ปุ่มทั้งหมด ----------
const ACTIONS = {
  my: () => doMy(),
  toHead: () => toHead(true),
  myMonth: (d) => doMy(d.m),
  team: () => { A.teamFrom = A.screen; return doTeam(); },
  teamBack: () => (A.teamFrom === 'success' || A.teamFrom === 'menu' ? showHome() : doMy()),
  teamTab: (d) => show('team', Object.assign({}, A.st, { tab: Number(d.i) })),
  pickFromMy: () => startPick('my'),
  pickChange: () => startPick('change'),
  rename: () => startPick('rename'),
  pickName: (d) => { A.picked = { teacher_id: d.id, name: d.name }; show('confirm', { mode: A.pick.mode, teacher: A.picked }); },
  backPick: () => show('pick', A.pick),
  pdpa: () => { A.pdpaFrom = { screen: A.screen, st: A.st }; show('pdpa', {}); },
  pdpaBack: () => show(A.pdpaFrom.screen, A.pdpaFrom.st),
  cancelPick: () => (A.pick.mode === 'rename' ? showHome() : doMy()),
  confirmYes,
  retryNow: () => retryNow(),
  toHome: () => showHome(),
  toMenu: () => { A.home = 'menu'; showHome(); },
  proxy: startProxy,
  addName: () => { A.pickFor = A.camFor; return openPick('preview'); },
  pickToggle,
  pickDone,
  sheetClose,
  groupConfirm,
  report: startReport,
  photo: () => openScanCam(),
  camScan: () => openScanCam(),
  skipPhoto,
  shoot,
  flip: () => camera.switchFacing(),
  camCancel: () => { camera.stop(); if (A.camFor === 'report') show('report', A.rep); else { A.group = []; showHome(); } },
  retake,
  sendPhoto,
  cat: (d) => {
    readNote();
    const x = A.rep.categories[Number(d.i)];
    const sel = A.rep.selected;
    A.rep.selected = sel.includes(x) ? sel.filter((y) => y !== x) : sel.concat([x]);
    show('report', A.rep);
  },
  repPhotoRemove: () => { readNote(); A.rep.photo = null; show('report', A.rep); },
  repPhotoNew: () => { readNote(); openCam('report', 'ถ่ายรูปเหตุการณ์'); },
  sendReport,
  rescan: doScan,
  subFor: async (d) => {
    show('loading', { title: 'กำลังบันทึก' });
    const gps = await scanGps();
    const r = await call('substitute', { pointId: A.P, token: A.K, forTeacherId: d.id, gps }, retrying);
    if (!r.ok) return r.code === 'already_substitute' ? doScan() : showError(r);
    handleScan(r);
  },
  notSub: () => show('wrongPoint', { r: { myDuty: A.st.r ? A.st.r.myDuty : null } })
};

function deviceId() {
  let id = store('duty.deviceId');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : 'd' + Date.now() + Math.random().toString(16).slice(2));
    store('duty.deviceId', id);
  }
  return id;
}

// เปิดนอกแอป LINE: ปุ่มเปิดใน LINE (ลิงก์) หรือเข้าสู่ระบบ LINE ในหน้านี้ (แบบเดิม)
function showOpenInLine(id) {
  root().innerHTML = V.openInLine({ href: id.href });
  const btn = root().querySelector('[data-act="lineLogin"]');
  if (btn) btn.addEventListener('click', () => { show('loading', { title: 'กำลังเปิด' }); id.login(); });
}

export async function start() {
  // ?v=head = หน้าหัวหน้าเวร (ใบเช็ค) แยกตัวควบคุม โหลดเฉพาะเมื่อเปิดหน้านี้ (อ่านจาก liff.state ด้วย)
  if (viewParam(location.search) === 'head') {
    show('loading', { title: 'กำลังเปิด' });
    const [{ startHead }, id] = await Promise.all([import('../head/app.js'), initIdentity()]);
    if (id.outside) return showOpenInLine(id);
    return startHead(id);
  }
  root().addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el.dataset);
  });
  if (store('duty.addKru') === '0') setAddKru(false); // ค่าล่าสุดที่จำไว้ ใช้ก่อน config มาถึง
  A.mock = mockScenario(location.search);
  if (A.mock !== null) {
    A.mock = A.mock || 'checked_in';
    setTransport(mockTransport(A.mock));
    camera.setStreamSource(mockStreamSource(A.mock));
  }
  show('loading', { title: 'กำลังเปิด' });
  const id = await initIdentity();
  if (id.outside) return showOpenInLine(id);
  const dev = deviceId();
  if (id.idToken) {
    A.line = true;
    setIdentity({ idToken: id.idToken, deviceId: dev });
  } else if (id.mock) {
    A.line = true;
    setIdentity({ deviceId: dev });
  } else {
    // โหมดสำรอง: ใช้ได้เมื่อแอดมินเปิด fallback_local_mode และเครื่องนี้เคยรู้ชื่อครู (จำไว้ตอนเปิดผ่าน LINE)
    A.waitConfig = true;
    const cfg = await ensureConfig();
    A.waitConfig = false;
    const teacherId = store('duty.teacherId');
    if (!cfg.ok || !cfg.fallback_local_mode || !teacherId) {
      return show('error', { message: 'เปิดผ่าน LINE ไม่สำเร็จ ให้ปิดหน้านี้แล้วเปิดลิงก์หรือสแกน QR จากแอป LINE อีกครั้ง' });
    }
    setIdentity({ deviceId: dev, teacherId });
  }
  // อ่านพารามิเตอร์หลัง liff.init (LIFF พา ?p=&k= กลับมาใน URL หลัง redirect)
  const q = new URLSearchParams(location.search);
  A.P = q.get('p') || '';
  A.K = q.get('k') || '';
  if (A.mock !== null && !A.P && !noGateMock(A.mock)) { A.P = 'gate1'; A.K = 'tok-gate1'; }
  if (noGateMock(A.mock)) A.P = '';
  A.timer = setInterval(tick, 30000);
  if (A.P) doScan(); else doMy();
}

// เฉพาะเทสต์: เข้าถึงสถานะและปุ่มโดยไม่ต้องมี DOM จริง
export const __test = { A, act: (name, data) => ACTIONS[name](data || {}), start };
