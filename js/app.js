// ตัวควบคุมหน้าครูเวร: อ่าน ?p=&k= (สแกน) หรือไม่มี p (เวรของฉัน) แล้วเลือกหน้าจอจากผล call()
// import ได้ใน Node (เทสต์ใช้ routeFor): โค้ดที่แตะ document/window/navigator อยู่ในฟังก์ชันเท่านั้น
import { call, setIdentity, setTransport, retryNow } from './api.js';
import { initIdentity, mockScenario } from './liff.js';
import * as camera from './camera.js';
import { getGps } from './gps.js';
import * as V from './screens.js';
import { mockTransport, mockStreamSource } from './mock.js';

// ผลจากหลังบ้าน → ชื่อหน้าจอ
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
    case 'proxy_candidates': return 'proxyPick';
    case 'proxy_done': return 'proxyDone';
    case 'report_done': return 'reportDone';
    case 'photo_done': return 'success';
    case 'renamed': return 'success';
    case 'my': return 'my';
    case 'bound': return 'my';
    default: return 'error';
  }
}

const toMin = (hhmm) => { const p = String(hhmm).split(':'); return Number(p[0]) * 60 + Number(p[1]); };
const minToHHMM = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const CAM_SCREENS = ['scanCam', 'cam'];

// ---------- สถานะของหน้า ----------
const A = {
  P: '', K: '', mock: null, line: false, school: '',
  screen: '', st: null,
  c: null, home: 'success', viaProxy: null, noPhoto: null, photoSent: false, localPhoto: null, localB64: null,
  teacherName: '', renamed: false, photoGen: 0,
  pick: null, picked: null, friend: null, camFor: null, shot: null, rep: null, my: null, menuError: '',
  config: null, configP: null, clock: null, timer: null, searchTimer: null, searchSeq: 0
};

// เวลาเซิร์ฟเวอร์ (นาที) = ค่าที่ได้ล่าสุด + เวลาที่ผ่านไปในเครื่อง (ไม่ใช้นาฬิกามือถือโดยตรง)
function setClock(hhmm) { if (hhmm) A.clock = { min: toMin(hhmm), at: Date.now() }; }
function nowMin() { return A.clock ? A.clock.min + Math.floor((Date.now() - A.clock.at) / 60000) : null; }
function actionsOpen(c) { const n = nowMin(); return n === null || n <= toMin(c.actionsUntil); }
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
  A.screen = screen;
  A.st = st || {};
  const html = V[screen](A.st);
  root().innerHTML = (CAM_SCREENS.includes(screen) ? '' : V.header({ school: A.school })) + html;
  document.body.classList.toggle('dark', CAM_SCREENS.includes(screen));
  window.scrollTo(0, 0);
  if (screen === 'pick') bindSearch();
  if (screen === 'report') bindReport();
}

function showFail(n) { show('fail', { attempt: n, headName: A.c ? A.c.headName : '' }); }
const retrying = { onRetry: showFail };

function showError(res, back) {
  const screen = routeFor(res);
  if (screen === 'welcome') return show('welcome', {});
  if (screen === 'taken') return show('taken', { name: A.picked ? A.picked.name : '' });
  return show('error', { message: res.message, back: !!back });
}

function ensureConfig() {
  if (!A.configP) {
    A.configP = call('config', {}, retrying).then((cfg) => {
      if (cfg && cfg.ok) {
        A.config = cfg;
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
    return { c, actionsOpen: actionsOpen(c), canRename: canRename(c), viaProxy: A.viaProxy, photoSent: A.photoSent, error: A.menuError };
  }
  return { c, actionsOpen: actionsOpen(c), canRename: canRename(c), noPhoto: A.noPhoto, photoSent: A.photoSent,
    teacherName: A.teacherName, renamed: A.renamed };
}
function showHome() {
  if (!A.c) return doMy();
  show(A.home, homeState());
}

// ปุ่มบนหน้าสำเร็จ/เมนูหายเองเมื่อเลยเวลาเวร; นับถอยหลังหน้านอกเวลา
function tick() {
  if (A.screen === 'success' || A.screen === 'menu') {
    const next = homeState();
    if (next.actionsOpen !== A.st.actionsOpen || next.canRename !== A.st.canRename) show(A.screen, next);
  } else if (A.screen === 'outside') {
    show('outside', { r: A.st.r, nowMin: nowMin() });
  }
}

// ---------- สแกน ----------
async function doScan() {
  show('loading', { title: 'กำลังบันทึก' });
  ensureConfig();
  const gps = A.mock !== null ? null : await getGps(3000);
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
      return showError(res);
  }
}

function goMenu(c, viaProxy) {
  A.c = c; A.home = 'menu'; A.viaProxy = viaProxy; A.photoSent = false; A.menuError = '';
  show('menu', homeState());
}

function afterCheckin(c) {
  A.c = c; A.home = 'success'; A.viaProxy = null; A.noPhoto = null; A.photoSent = false;
  A.localPhoto = null; A.localB64 = null; A.renamed = false;
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
    return show('error', { message: 'เปิดกล้องไม่ได้ ลงชื่อให้เพื่อนต้องมีรูปทุกครั้ง ให้ครูที่ลืมโทรศัพท์แจ้งหัวหน้าเวรเช็คให้', back: true });
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
  show('preview', { img: 'data:image/jpeg;base64,' + b64, purpose: A.camFor, sending: false });
}

function retake() {
  if (A.camFor === 'scan') return openScanCam();
  if (A.camFor === 'proxy') return openCam('proxy', proxyTip());
  return openCam('report', 'ถ่ายรูปเหตุการณ์');
}

function skipPhoto() {
  camera.stop();
  if (A.home === 'menu') return showHome();
  A.noPhoto = { reason: 'skipped' };
  showHome();
}

function sendPhoto() {
  if (A.camFor === 'scan') return sendScanPhoto(A.shot);
  if (A.camFor === 'proxy') return sendProxy(A.shot);
  A.rep.photo = { kind: 'new', img: 'data:image/jpeg;base64,' + A.shot, b64: A.shot };
  A.rep.error = '';
  show('report', A.rep);
}

// รูปหลังสแกน: การลงเวรบันทึกแล้ว เน็ตล้มเหลว → ไปหน้าสำเร็จทันที แล้วลองส่งใหม่เบื้องหลัง
async function sendScanPhoto(b64) {
  const gen = ++A.photoGen;
  const url = 'data:image/jpeg;base64,' + b64;
  A.localPhoto = url; A.localB64 = b64;
  show('preview', { img: url, purpose: 'scan', sending: true });
  let movedOn = false;
  const res = await call('photo', { pointId: A.P, token: A.K, photo: { base64: b64 } }, {
    onRetry: () => {
      if (movedOn || gen !== A.photoGen) return;
      movedOn = true;
      A.noPhoto = { reason: 'send', retrying: true };
      if (A.home === 'menu') A.menuError = 'ส่งรูปไม่สำเร็จ ระบบกำลังลองส่งใหม่เอง';
      showHome();
    },
    shouldContinue: () => gen === A.photoGen
  });
  if (gen !== A.photoGen) return;
  const onHome = !movedOn || A.screen === A.home;
  if (res.ok) {
    A.c = Object.assign({}, A.c, { hasPhoto: true });
    A.noPhoto = null; A.photoSent = true; A.menuError = '';
  } else {
    A.noPhoto = { reason: 'send', message: res.code === 'network' ? '' : res.message };
    if (A.home === 'menu') A.menuError = res.message;
  }
  if (onHome) showHome();
}

// ---------- ลงชื่อให้เพื่อน ----------
const proxyTip = () => `ถ่ายรูปครู${A.friend ? A.friend.name : 'เพื่อน'}ที่จุดเวร ให้เห็นหน้าและจุดเวร`;

async function startProxy() {
  show('loading', { title: 'กำลังโหลดรายชื่อ' });
  const r = await call('proxyCandidates', { pointId: A.P }, retrying);
  if (!r.ok) return showError(r, true);
  show('proxyPick', { r, c: A.c });
}

async function sendProxy(b64) {
  const img = 'data:image/jpeg;base64,' + b64;
  show('preview', { img, purpose: 'proxy', sending: true });
  const gps = A.mock !== null ? null : await getGps(3000);
  const r = await call('proxy', { pointId: A.P, token: A.K, friendId: A.friend.teacher_id, photo: { base64: b64 }, gps }, retrying);
  if (!r.ok) return showError(r, true);
  show('proxyDone', { r, img, c: A.c });
}

// ---------- รายงานเหตุการณ์ ----------
async function startReport() {
  show('loading', { title: 'กำลังโหลด' });
  const cfg = await ensureConfig();
  const cats = cfg && cfg.ok ? cfg.report_categories || [] : [];
  let photo = null;
  if (A.c && A.c.hasPhoto && !A.viaProxy) photo = { kind: 'scan', img: A.localPhoto };
  else if (A.localB64) photo = { kind: 'new', img: A.localPhoto, b64: A.localB64 };
  A.rep = { categories: cats, selected: [], note: '', photo, error: '', sending: false };
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
  const payload = { pointId: A.P, token: A.K, categories: A.rep.selected.slice(), note: A.rep.note, useScanPhoto: !!p && p.kind === 'scan' };
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
  const [cfg, r] = await Promise.all([ensureConfig(), call('my', month ? { month } : {}, retrying)]);
  if (!r.ok) return showError(r);
  rememberTeacher(r.teacher);
  const current = cfg && cfg.ok && cfg.serverTime ? cfg.serverTime.slice(0, 7) : '';
  const m = month || current || (r.next ? r.next.date.slice(0, 7) : '');
  show('my', { r, month: m, currentMonth: current || m });
}

// ---------- ปุ่มทั้งหมด ----------
const ACTIONS = {
  my: () => doMy(),
  myMonth: (d) => doMy(d.m),
  pickFromMy: () => startPick('my'),
  pickChange: () => startPick('change'),
  rename: () => startPick('rename'),
  pickName: (d) => { A.picked = { teacher_id: d.id, name: d.name }; show('confirm', { mode: A.pick.mode, teacher: A.picked }); },
  backPick: () => show('pick', A.pick),
  cancelPick: () => (A.pick.mode === 'rename' ? showHome() : doMy()),
  confirmYes,
  retryNow: () => retryNow(),
  toHome: () => showHome(),
  toMenu: () => { A.home = 'menu'; showHome(); },
  proxy: startProxy,
  proxyTo: (d) => { A.friend = { teacher_id: d.id, name: d.name }; openCam('proxy', proxyTip()); },
  report: startReport,
  photo: () => openScanCam(),
  camScan: () => openScanCam(),
  skipPhoto,
  shoot,
  flip: () => camera.switchFacing(),
  camCancel: () => { camera.stop(); if (A.camFor === 'report') show('report', A.rep); else startProxy(); },
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
  subFor: async (d) => {
    show('loading', { title: 'กำลังบันทึก' });
    const gps = A.mock !== null ? null : await getGps(3000);
    const r = await call('substitute', { pointId: A.P, token: A.K, forTeacherId: d.id, gps }, retrying);
    if (!r.ok) return showError(r);
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

export async function start() {
  root().addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el.dataset);
  });
  A.mock = mockScenario(location.search);
  if (A.mock !== null) {
    A.mock = A.mock || 'checked_in';
    setTransport(mockTransport(A.mock));
    camera.setStreamSource(mockStreamSource(A.mock));
  }
  show('loading', { title: 'กำลังเปิด' });
  const id = await initIdentity();
  const dev = deviceId();
  if (id.idToken) {
    A.line = true;
    setIdentity({ idToken: id.idToken, deviceId: dev });
  } else if (id.mock) {
    A.line = true;
    setIdentity({ deviceId: dev });
  } else {
    // โหมดสำรอง: ใช้ได้เมื่อแอดมินเปิด fallback_local_mode และเครื่องนี้เคยรู้ชื่อครู (จำไว้ตอนเปิดผ่าน LINE)
    const cfg = await ensureConfig();
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
  if (A.mock !== null && !A.P && A.mock !== 'my' && A.mock !== 'welcome') { A.P = 'gate1'; A.K = 'tok-gate1'; }
  if (A.mock === 'my' || A.mock === 'welcome') A.P = '';
  A.timer = setInterval(tick, 30000);
  if (A.P) doScan(); else doMy();
}
