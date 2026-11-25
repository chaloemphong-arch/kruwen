// โหมดทดลอง ?mock=<scenario>: คืน Result รูปร่างเดียวกับหลังบ้านจริง (backend/Scan.js, Proxy.js, Reports.js,
// Rename.js, MyDuty.js, Binding.js, Api.js) ไม่ต่อเน็ต ไม่โหลด LIFF

export const SCENARIOS = ['first', 'checked_in', 'late', 'nocamera', 'photofail', 'photoserver', 'candfail', 'random_hit', 'random_miss', 'menu',
  'menu_nophoto', 'proxied', 'stood_by_other', 'ask_sub', 'wrong_point', 'outside_before', 'outside_after',
  'outside_holiday', 'on_leave', 'taken', 'netfail', 'my', 'my_council', 'welcome', 'long'];

const ME = { teacher_id: 't02', name: 'สมหญิง สุขสันต์' };
const FRIEND = { teacher_id: 't01', name: 'สมชาย ใจดี' };
const FRIEND2 = { teacher_id: 't03', name: 'วิชัย รักเรียน' };
const HEAD = 'สมชาย ใจดี';
const TEACHERS = [FRIEND, ME, { teacher_id: 't03', name: 'วิชัย รักเรียน' }, { teacher_id: 't04', name: 'วิภา มั่นคง' },
  { teacher_id: 't05', name: 'ประเสริฐ แก้วมณี' }, { teacher_id: 't06', name: 'ประภา ทองดี' },
  { teacher_id: 't13', name: 'ธนากร ศรีสว่าง' }, { teacher_id: 't21', name: 'สมพร ใจดี' }];
const DUTY = { code: '1(1)', label: '1(1)', point: 'ประตู 1', title: 'ประตู 1', short: 'ประตู 1', start: '07:00', end: '08:30', color: '#9ca3af' };
const DUTY_PM = { code: '1(2)', label: '1(2)', point: 'ประตู 1', title: 'ประตู 1', short: 'ประตู 1', start: '15:30', end: '16:30', color: '#1e3a8a' };
const summary = (d) => ({ code: d.code, label: d.label, point: d.point, title: d.title, short: d.short, start: d.start, end: d.end }); // dutySummary (ไม่มี color)
const SERVER_TIME = '2026-11-20T07:05:00+07:00';
const CATEGORIES = ['นักเรียนมาสาย', 'แต่งกายผิดระเบียบ', 'ทะเลาะวิวาท', 'อุบัติเหตุ/บาดเจ็บ', 'สถานที่ชำรุด', 'อื่น ๆ'];
const PHOTO_URL = 'https://drive.google.com/file/d/mock/view';
const fail = (code, message) => ({ ok: false, code, message });
const addMin = (hhmm, n) => { const p = hhmm.split(':').map(Number); const t = p[0] * 60 + p[1] + n; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

// _checkinData ของหลังบ้าน
function checkinData(o = {}) {
  const time = o.time || '07:05';
  return {
    checkin_id: o.checkin_id || 'mock-c1', time, late: !!o.late, duty: Object.assign({}, DUTY, o.duty || {}),
    photoRequired: o.photoRequired !== undefined ? o.photoRequired : true, hasPhoto: !!o.hasPhoto,
    photoMode: o.photoMode || 'ทุกครั้ง', actionsUntil: DUTY.end, photoUntil: addMin(time, 10), renameUntil: addMin(time, 15), headName: HEAD
  };
}
const friendsOf = (ids, fallback) => (Array.isArray(ids) && ids.length ? ids.map((id) => { const t = TEACHERS.find((x) => x.teacher_id === id); return { teacher_id: String(id), name: t ? t.name : 'ครูทดลอง ' + id }; }) : fallback);
const withKind = (kind, data) => Object.assign({ ok: true, kind }, data);

function scanResult(scenario) {
  switch (scenario) {
    case 'first': case 'taken':
      return withKind('need_bind', { candidates: [FRIEND, ME] });
    case 'late': return withKind('checked_in', checkinData({ time: '07:18', late: true }));
    case 'long':
      return withKind('checked_in', checkinData({ time: '07:18', late: true, photoRequired: false, duty: {
        code: '4', label: '4', title: 'จุดที่ 4 โรงอาหาร ห้องน้ำนักเรียนหญิง/ชาย', short: 'จุดที่ 4 โรงอาหาร ห้องน้ำ',
        point: 'โรงอาหาร ห้องน้ำนักเรียนหญิง/ชาย', start: '07:30', end: '08:30' } }));
    case 'random_hit': return withKind('checked_in', checkinData({ photoMode: 'สุ่ม' }));
    case 'random_miss': return withKind('checked_in', checkinData({ photoMode: 'สุ่ม', photoRequired: false }));
    case 'menu': return withKind('menu', checkinData({ time: '06:55', hasPhoto: true }));
    case 'menu_nophoto': return withKind('menu', checkinData({ time: '07:00', hasPhoto: false }));
    case 'proxied':
      return withKind('proxied', { by: FRIEND, time: '07:03', photo_url: PHOTO_URL, checkin_id: 'mock-c9',
        menu: checkinData({ time: '07:03', hasPhoto: true, checkin_id: 'mock-c9' }) });
    case 'stood_by_other': return withKind('stood_by_other', { byName: 'วิชัย รักเรียน', time: '07:02' });
    case 'on_leave': return withKind('on_leave', { headName: HEAD, message: 'วันนี้คุณถูกบันทึกลา ถ้ามาปฏิบัติหน้าที่จริงให้แจ้งหัวหน้าเวร (ครู' + HEAD + ')' });
    case 'ask_sub':
      return withKind('ask_substitute', { options: [{ teacher_id: 't01', name: FRIEND.name, onLeave: false },
        { teacher_id: 't02', name: ME.name, onLeave: true }], myDuty: summary(DUTY_PM) });
    case 'wrong_point':
      return withKind('wrong_point', { myDuty: summary(DUTY_PM),
        message: 'คุณไม่มีชื่อในเวรนี้ เวรของคุณวันนี้คือ 1(2) ประตู 1 เวลา 15:30–16:30 ให้ไปสแกนที่ป้ายนั้น' });
    case 'outside_before':
      return withKind('outside', { reason: 'before', nowHHMM: '06:20', myDuty: summary(DUTY), myStatus: 'upcoming', myTime: '',
        startHHMM: '07:00', endHHMM: '08:30', dutiesAtPoint: [summary(DUTY), summary(DUTY_PM)],
        message: 'ยังไม่ถึงเวลาเวร สแกนได้ตั้งแต่ 06:45 ให้กลับมาสแกนอีกครั้ง' });
    case 'outside_after':
      return withKind('outside', { reason: 'after', nowHHMM: '08:45', myDuty: summary(DUTY), myStatus: 'self', myTime: '07:05',
        startHHMM: '07:00', endHHMM: '08:30', dutiesAtPoint: [summary(DUTY), summary(DUTY_PM)],
        message: 'หมดเวลาเวรแล้ว (เวรจบ 08:30) ถ้ามีปัญหาให้แจ้งหัวหน้าเวรวันนี้' });
    case 'outside_holiday':
      return withKind('outside', { reason: 'holiday', nowHHMM: '07:05', myDuty: null, myStatus: null, myTime: '',
        startHHMM: '', endHHMM: '', dutiesAtPoint: [], message: 'วันนี้ไม่มีเวร (วันหยุด) ไม่ต้องลงเวร' });
    default: return withKind('checked_in', checkinData());
  }
}

function myResult() {
  const day = (date, status, note, code = '1(1)', place = '') => ({ date, duty_code: code, label: code, place: place || (code === '2(1)' ? 'ประตู 2' : 'ประตู 1'), session: 'เช้า', time: '07.30–08.15', status, note });
  return withKind('my', {
    teacher: ME, canSelfChange: false, canHead: false, showWeekday: false,
    today: [{ date: '2026-11-20', duty_code: '1(1)', place: 'ประตู 1', session: 'เช้า', time: '07.30–08.15', status: 'มา', note: 'เพื่อนลงชื่อให้' }],
    next: { date: '2026-11-27', duty: summary(DUTY), session: 'เช้า', place: 'ประตู 1', time: '07.30–08.15' },
    days: [day('2026-11-06', 'มา', 'หัวหน้าเวรเช็คให้'), day('2026-11-11', 'ไปแทน', 'แทนครูวิชัย รักเรียน', '2(1)'),
      day('2026-11-13', 'สาย', ''), day('2026-11-18', 'มา', '', '3', 'ตู้สแกน อุตสาหกรรม'), day('2026-11-20', 'มา', 'เพื่อนลงชื่อให้'), day('2026-11-27', 'ยังไม่ถึง', '')],
    summary: { present: 4, late: 1, leave: 0, absent: 0, subbed: 1 },
    headChecks: 1, proxied: 1
  });
}

// สภานักเรียน: แสดงวันในสัปดาห์ · วันละช่วงเดียว หลายวัน คนละที่
function myCouncilResult() {
  const AM = '07.30–08.15', PM = '15.50–16.30';
  const day = (date, place, time, status, note = '') => ({ date, duty_code: place === 'ประตู 2' ? '2(1)' : '1(1)', label: '1(1)', place, session: time === PM ? 'เย็น' : 'เช้า', time, status, note });
  return Object.assign(myResult(), {
    showWeekday: true,
    today: [{ date: '2026-11-20', duty_code: '2(1)', place: 'ประตู 2', session: 'เย็น', time: PM, status: 'รอลงเวร', note: '' }],
    next: null,
    days: [day('2026-11-09', 'ประตู 1', AM, 'มา'), day('2026-11-17', 'ประตู 2', PM, 'มา'), day('2026-11-18', 'ประตู 1', AM, 'ลา'),
      day('2026-11-19', 'ประตู 2', AM, 'ขาด'), day('2026-11-20', 'ประตู 2', PM, 'รอลงเวร')]
  });
}

// teamView ของหลังบ้าน (Team.js): ใบเช็คเวรวันนี้ของลูกเวร
function teamResult() {
  const row = (key, dutyCode, place, name, kind, by = '', extra = {}) => Object.assign({ key, dutyCode, place, name, me: false, sub: '', mark: { kind, by } }, extra);
  const P1 = 'จุดที่ 1 ประตู 1', P3 = 'จุดที่ 3 ตรวจอาคาร';
  return withKind('team', { date: '2026-11-20', dateThai: '20 พ.ย. 2569', weekdayThai: 'ศุกร์', sessions: [
    { session: 'เช้า', label: 'ช่วงเช้า', time: '07.30–08.15', mine: true, rows: [
      row('1|a', '1(1)', P1, 'ศิริพร (ฝน)', 'tick'),
      row('1|b', '1(1)', P1, 'สมหญิง (หญิง)', 'tick', 'หัวหน้าเวรเช็ค', { me: true, sub: 'ครูเกศินี แทน' }),
      row('3|c', '3', P3, 'ชลธิชา (น้ำหวาน)', 'pending'),
      row('3|d', '3', P3, 'วรรณวิสา (ข้าวฟ่าง)', 'leave'),
      row('3|e', '3', P3, 'สุภาวดี (ส้ม)', 'blank')] },
    { session: 'เย็น', label: 'หลังเลิกเรียน', time: '15.50–16.30', mine: false, rows: [
      row('2|f', '2(2)', 'จุดที่ 2 ประตู 2', 'กมลชนก (มิ้นท์)', 'blank')] }] });
}

const bound = {};

export function mockCall(scenario, action, payload = {}) {
  switch (action) {
    case 'config':
      return withKind('config', { school_name: 'โรงเรียนอุบลรัตน์พิทยาคม', report_categories: CATEGORIES.slice(),
        liff_id: '', fallback_local_mode: false, name_add_kru: true, use_gps: false, serverTime: SERVER_TIME });
    case 'scan':
      if ((scenario === 'first') && bound[scenario]) return withKind('checked_in', checkinData());
      return scanResult(scenario);
    case 'substitute':
      return withKind('checked_in', Object.assign(checkinData(), {
        asSubstituteFor: { teacher_id: String(payload.forTeacherId || 't01'), name: payload.forTeacherId === 't02' ? ME.name : FRIEND.name }
      }));
    case 'search': {
      const words = String(payload.query || '').split(/\s+/).map((w) => w.replace(/^ครู/, '')).filter(Boolean);
      return withKind('search', { teachers: words.length ? TEACHERS.filter((t) => words.every((w) => t.name.includes(w))) : [] });
    }
    case 'bind': case 'selfChange': {
      if (scenario === 'taken') return fail('taken', 'ชื่อนี้ผูกกับ LINE บัญชีอื่นแล้ว ถ้าเป็นชื่อคุณ ให้แจ้งแอดมิน');
      bound[scenario] = true;
      const t = TEACHERS.find((x) => x.teacher_id === payload.teacherId) || ME;
      return withKind('bound', { teacher: { teacher_id: t.teacher_id, name: t.name } });
    }
    case 'proxyCandidates':
      if (scenario === 'candfail') return fail('server_error', 'โหลดรายชื่อไม่สำเร็จ ลองอีกครั้ง');
      return withKind('proxy_candidates', { friends: [FRIEND, FRIEND2, TEACHERS[3]], checked: [{ name: ME.name }] });
    case 'proxy': {
      const fr = friendsOf(payload.friendIds, [FRIEND]);
      return withKind('proxy_done', { friendName: fr[0].name, time: '07:06', late: false, photo_url: PHOTO_URL, headName: HEAD, friends: fr, skipped: [] });
    }
    case 'report': return withKind('report_done', { report_id: 'mock-r1', count: (payload.categories || []).length || 1 });
    case 'photo':
      // photofail + มีรายชื่อเพื่อน: ล้มเหลวที่ฝั่งเซิร์ฟเวอร์ (ข้อความ) ไม่ใช่เน็ตหลุด
      if (scenario === 'photoserver' && (payload.friendIds || []).length) return fail('server_error', 'ส่งรูปไม่สำเร็จ ลองอีกครั้ง');
      return withKind('photo_done', { photo_url: PHOTO_URL, time: '07:06', friends: friendsOf(payload.friendIds, []), skipped: [] });
    case 'rename': {
      const t = TEACHERS.find((x) => x.teacher_id === payload.newTeacherId) || FRIEND;
      return withKind('renamed', { teacher: { teacher_id: t.teacher_id, name: t.name }, checkin_id: 'mock-c1' });
    }
    case 'my':
      if (scenario === 'welcome' && !bound[scenario]) return fail('not_bound', 'LINE นี้ยังไม่ได้ผูกชื่อ ให้สแกนป้ายแล้วเลือกชื่อของคุณ');
      return scenario === 'my_council' ? myCouncilResult() : myResult();
    case 'teamView': return teamResult();
    default: return fail('bad_action', 'ไม่รู้จักคำสั่งนี้ ให้รีเฟรชหน้าแล้วลองอีกครั้ง');
  }
}

// transport ของ api.js ในโหมดทดลอง: หน่วงเล็กน้อย, netfail = สแกน 3 ครั้งแรกล้มเหลว, photofail = ส่งรูปล้มเหลวตลอด
export function mockTransport(scenario) {
  let scanFails = 0;
  return async (body) => {
    await new Promise((r) => setTimeout(r, 350));
    if (scenario === 'netfail' && body.action === 'scan' && scanFails < 3) { scanFails++; throw new Error('mock network'); }
    if (scenario === 'photofail' && (body.action === 'photo' || body.action === 'proxy')) throw new Error('mock network');
    return mockCall(scenario, body.action, body);
  };
}

// กล้องจำลองสำหรับโหมดทดลอง (เดสก์ท็อปไม่มีกล้อง) — nocamera = เปิดกล้องไม่ได้
export function mockStreamSource(scenario) {
  return async (facing) => {
    if (scenario === 'nocamera') return null;
    const c = document.createElement('canvas');
    c.width = 960; c.height = 1280;
    const cx = c.getContext('2d');
    let n = 0;
    const draw = () => {
      const g = cx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, facing === 'user' ? '#6B5B95' : '#8FC3EA'); g.addColorStop(1, '#DCEFFB');
      cx.fillStyle = g; cx.fillRect(0, 0, c.width, c.height);
      cx.fillStyle = '#1E2B45'; cx.font = '600 56px sans-serif'; cx.textAlign = 'center';
      cx.fillText('กล้องจำลอง (' + (facing === 'user' ? 'หน้า' : 'หลัง') + ')', c.width / 2, c.height / 2);
      cx.fillRect(c.width / 2 - 40 + Math.sin(n++ / 10) * 200, c.height / 2 + 60, 80, 80);
    };
    draw();
    const timer = setInterval(draw, 100);
    const stream = c.captureStream(10);
    stream.getTracks().forEach((t) => { const s = t.stop.bind(t); t.stop = () => { clearInterval(timer); s(); }; });
    return stream;
  };
}

// ตัวอย่าง state ของทุกหน้าจอ (ใช้ในเทสต์: ทุกหน้า render ได้ไม่มี undefined/NaN)
export function screenSamples() {
  const c = checkinData();
  const menuC = checkinData({ time: '07:00' });
  const img = 'data:image/jpeg;base64,AAAA';
  const s = (screen, state, label) => ({ screen, state, label: label || screen });
  return [
    s('loading', { title: 'กำลังบันทึก' }),
    s('openInLine', { href: 'https://liff.line.me/ID?p=gate1' }),
    s('welcome', { school: 'โรงเรียนอุบลรัตน์พิทยาคม' }),
    s('pick', { mode: 'scan', candidates: [FRIEND, ME], query: '', results: null }, 'pick scan'),
    s('pick', { mode: 'my', candidates: [], query: 'สม', results: [FRIEND] }, 'pick my'),
    s('pick', { mode: 'rename', candidates: [], query: '', results: null }, 'pick rename'),
    s('searchResults', { query: 'สม', results: [FRIEND, ME] }),
    s('searchResults', { query: 'ไม่มี', results: [] }, 'search empty'),
    s('confirm', { mode: 'scan', teacher: ME }),
    s('confirm', { mode: 'rename', teacher: FRIEND }, 'confirm rename'),
    s('pdpa', {}),
    s('taken', { name: FRIEND.name }),
    s('success', { c, actionsOpen: true, photoOpen: false, canRename: true, noPhoto: null, photoSent: true }),
    s('success', { c: checkinData({ late: true, time: '07:18' }), actionsOpen: false, photoOpen: false, canRename: false, noPhoto: { reason: 'camera' } }, 'success nocam'),
    s('success', { c: mockCall('ask_sub', 'substitute', { forTeacherId: 't01' }), actionsOpen: true, photoOpen: true, canRename: false,
      noPhoto: { reason: 'send', retrying: true }, renamed: true, teacherName: ME.name }, 'success sub'),
    s('menu', { c: menuC, actionsOpen: true, photoOpen: true, canRename: true }),
    s('menu', { c: Object.assign({}, menuC, { hasPhoto: true }), actionsOpen: true, photoOpen: false, canRename: false, viaProxy: { name: FRIEND.name, time: '07:03' } }, 'menu proxied'),
    s('menu', { c: menuC, actionsOpen: false, photoOpen: false, canRename: false, error: 'กล้องเปิดไม่ได้' }, 'menu closed'),
    s('scanCam', { c, mode: 'live' }),
    s('scanCam', { c, mode: 'ask' }, 'scanCam ask'),
    s('cam', { tip: 'ถ่ายรูปเพื่อนที่จุดเวร' }),
    s('preview', { img, purpose: 'scan', sending: false }),
    s('preview', { img, purpose: 'report', sending: true }, 'preview sending'),
    s('preview', { img, purpose: 'scan', group: [FRIEND, FRIEND2], c, sending: false }, 'preview group'),
    s('preview', { img, purpose: 'scan', group: [], c, sending: false, sheet: { kind: 'pick', friends: [FRIEND, FRIEND2], checked: [{ name: ME.name }], draft: [FRIEND.teacher_id], loading: false, requireOne: false } }, 'preview pick'),
    s('preview', { img, purpose: 'scan', group: [FRIEND], c, sending: false, error: 'ส่งรูปไม่สำเร็จ', sheet: { kind: 'confirm', img, names: [FRIEND.name] } }, 'preview confirm'),
    s('preview', { img, purpose: 'proxy', group: [FRIEND, FRIEND2], sending: true }, 'preview proxy'),
    s('success', { c, actionsOpen: true, photoOpen: false, canRename: false, noPhoto: null, photoSent: true, signed: [FRIEND.name, FRIEND2.name], skipped: [ME.name] }, 'success signed'),
    s('menu', { c: menuC, actionsOpen: true, photoOpen: true, canRename: false, signed: [FRIEND.name], sheet: { kind: 'pick', friends: [FRIEND, FRIEND2], checked: [], draft: [], loading: false, requireOne: true } }, 'menu pick'),
    s('fail', { attempt: 1, load: true }, 'fail load'),
    s('proxied', { r: scanResult('proxied') }),
    s('covered', { r: scanResult('stood_by_other') }),
    s('onLeave', { r: scanResult('on_leave') }),
    s('subask', { r: scanResult('ask_sub') }),
    s('subask', { r: Object.assign(scanResult('ask_sub'), { options: [{ teacher_id: 't01', name: FRIEND.name, onLeave: true }], myDuty: null }) }, 'subask one'),
    s('wrongPoint', { r: scanResult('wrong_point') }),
    s('wrongPoint', { r: { myDuty: null } }, 'wrongPoint none'),
    s('outside', { r: scanResult('outside_before'), nowMin: 380 }),
    s('outside', { r: scanResult('outside_after'), nowMin: 525 }, 'outside after'),
    s('outside', { r: scanResult('outside_holiday'), nowMin: 425 }, 'outside holiday'),
    s('outside', { r: Object.assign(scanResult('outside_before'), { reason: 'none', myDuty: summary(DUTY_PM), dutiesAtPoint: [summary(DUTY)] }), nowMin: 600 }, 'outside none'),
    s('fail', { attempt: 2 }),
    s('error', { message: 'ป้าย QR นี้หมดอายุแล้ว', back: true }),
    s('report', { categories: CATEGORIES, selected: ['ทะเลาะวิวาท'], note: 'ม.2', photo: { kind: 'scan', img }, error: '' }),
    s('report', { categories: CATEGORIES, selected: [], note: '', photo: null, error: 'ยังไม่มีรูปตอนสแกน' }, 'report empty'),
    s('reportDone', { cats: ['ทะเลาะวิวาท'], note: 'แยกแล้ว', time: '07:10' }),
    s('my', { r: myResult(), month: '2026-11', currentMonth: '2026-11', today: '2026-11-19' }),
    s('team', { r: teamResult(), tab: 0 }),
    s('team', { r: teamResult(), tab: 1 }, 'team evening'),
    s('my', { r: Object.assign(myResult(), { next: null, days: [], canSelfChange: true }), month: '2026-10', currentMonth: '2026-11' }, 'my empty')
  ];
}
