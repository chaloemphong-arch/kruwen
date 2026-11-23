// โหมดทดลองหน้าหัวหน้าเวร ?v=head&mock=<scenario>: ตอบจาก mock-data.json (สร้างด้วย npm run head-mock จากหลังบ้านจริง)
// headSet ใน mock เปลี่ยนป้ายแถวนั้นเป็น option.next (ป้ายที่หลังบ้านบอกไว้) พอให้ลองแตะ · บันทึก/เลิกทำหน่วง ~1.5 วิ ให้เห็นป้ายขึ้นทันที · stale = ตอบ stale ทุกครั้ง · netfail = เน็ตล้มเหลวตอนบันทึก/รีเฟรช/รูปใหญ่

export const HEAD_SCENARIOS = ['morning', 'clearing', 'locked', 'unlocked', 'admin', 'deputy', 'notoday', 'notbound', 'holiday', 'stale', 'netfail', 'exec'];

const BASE = { stale: 'morning', netfail: 'morning', exec: 'morning' }; // exec = ผู้บริหารเปิดดูใบเช็คของวันนี้ (เห็นคำว่าสาย)
const SAVE_DELAY_MS = 1500; // ใกล้เวลาบันทึกจริง (~2.5 วิ) พอให้เห็นป้ายขึ้นทันทีระหว่างรอ
const clone = (x) => JSON.parse(JSON.stringify(x));
const fail = (code, message, extra) => Object.assign({ ok: false, code, message }, extra || {});

// ตัวเลือกของแถวยังว่าง (ตรงกับ headOptions ของหลังบ้าน)
const OPEN_OPTIONS = [
  { action: 'head', label: 'มา', hint: '', next: { cls: 'p-head', text: '✓ หัวหน้าเวรเช็ค' } },
  { action: 'leave', label: 'ลา', hint: '', next: { cls: 'p-leave', text: 'ลา' } },
  { action: 'absent', label: 'ขาด', hint: '', next: { cls: 'p-miss', text: 'ขาด' } }
];
const PILL = {
  head: { cls: 'p-head', text: '✓ หัวหน้าเวรเช็ค' }, leave: { cls: 'p-leave', text: 'ลา' },
  notfound: { cls: 'p-miss', text: 'ไม่พบตัว' }, absent: { cls: 'p-miss', text: 'ขาด' },
  clear: { cls: 'p-idle', text: 'ยังว่าง' }, uncover: { cls: 'p-idle', text: 'ยังว่าง' }
};

// รูปจำลอง (SVG ตัวอักษร ASCII ล้วน)
function photoSvg(size) {
  const w = size === 'thumb' ? 120 : 480, h = size === 'thumb' ? 120 : 360;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><rect width="100%" height="100%" fill="#8fc3ea"/>' +
    '<rect x="35%" y="30%" width="30%" height="45%" rx="8" fill="#1e2b45"/><text x="50%" y="92%" font-size="' + (w / 10) +
    '" text-anchor="middle" fill="#1e2b45" font-family="sans-serif">MOCK PHOTO</text></svg>';
  return { ok: true, kind: 'photo', base64: btoa(svg), mime: 'image/svg+xml' };
}

function rowsOf(view) { return (view.sessions || []).flatMap((s) => s.rows); }

function recount(view) {
  const rows = rowsOf(view);
  const n = (f) => rows.filter(f).length;
  view.counts = Object.assign({}, view.counts, {
    came: n((r) => r.pill.cls === 'p-ok' || r.pill.cls === 'p-head'),
    leave: n((r) => r.pill.cls === 'p-leave'),
    needs: n((r) => r.needs)
  });
}

function applyMock(row, opt, original) {
  const action = opt.action;
  if (action === 'restore') return Object.assign(row, clone(original));
  row.pill = clone(opt.next || PILL[action] || row.pill);
  row.sig = 'mock-' + Math.random().toString(36).slice(2, 8);
  if (action === 'clear' || action === 'uncover') {
    row.options = OPEN_OPTIONS.map((o) => Object.assign({ current: false, disabled: false }, o));
    row.needs = true; row.note = '';
    return row;
  }
  row.needs = action === 'leave' || action === 'notfound' || action === 'absent';
  row.note = '';
  const opts = row.options.filter((o) => o.action).map((o) => Object.assign({}, o, {
    current: o.action === action, disabled: o.action === action || (o.disabled && !o.current)
  }));
  if (!opts.some((o) => o.action === 'clear' || o.action === 'restore' || o.action === 'uncover')) {
    opts.push({ action: 'restore', label: 'ยกเลิก กลับเป็นสถานะเดิม', hint: '', current: false, disabled: false, next: clone(original.pill) });
  }
  row.options = opts;
  return row;
}

// (body) => Result แบบ synchronous · data = เนื้อหา mock-data.json
export function headMockCall(scenario, data) {
  const base = data[BASE[scenario] || scenario] || data.morning;
  let view = clone(base);
  const original = {};
  rowsOf(base).forEach((r) => { original[r.key] = r; });
  const undo = new Map();
  let seq = 0;
  return (body) => {
    switch (body.action) {
      case 'headHome':
        if (!base.ok) return clone(base);
        return { ok: true, kind: 'head_home', name: base.headName || '', today: base.date, isHeadToday: scenario !== 'exec' && !base.actingFor && base.canEdit,
          isAdmin: !!base.actingFor, canView: true, headNameToday: base.headName, nameAddKru: true };
      case 'headView': {
        // โหมดตัวอย่าง: เลื่อนวันได้ (รายชื่อชุดเดิม) ให้เห็นลูกศรกับหัวข้อทำงาน · ของจริงหลังบ้านคำนวณเอง
        const v = clone(view);
        if (!body.date || body.date === base.date || !v.nav) return v;
        const add = (ymd, n) => new Date(Date.parse(ymd + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
        const step = v.nav.next ? (Date.parse(v.nav.next) - Date.parse(base.date)) / 86400000 : 7;
        const [y, m, d] = body.date.split('-').map(Number);
        const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        return Object.assign(v, { date: body.date, isToday: false, preview: body.date > base.date || undefined,
          dateThai: d + ' ' + MON[m - 1] + ' ' + (y + 543), weekdayThai: DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
          nav: { prev: add(body.date, -step), next: add(body.date, step) } });
      }
      case 'headSet': {
        const key = body.dutyCode + '|' + body.teacherId;
        const row = rowsOf(view).find((r) => r.key === key);
        if (!row) return fail('bad_action', 'ไม่พบเวรนี้ ให้รีเฟรชหน้าแล้วลองอีกครั้ง');
        if (scenario === 'stale') return fail('stale', 'ข้อมูลของครู' + row.name + ' เพิ่งเปลี่ยน ดูอีกครั้งแล้วเลือกใหม่', { view: clone(view) });
        const opt = row.options.find((o) => o.action && o.action === body.setAction);
        if (!opt || opt.current || opt.disabled) return fail('bad_action', 'ตอนนี้เลือกสถานะนี้ไม่ได้ ดูอีกครั้งแล้วเลือกใหม่', { view: clone(view) });
        const token = 'mock-u' + ++seq;
        undo.set(token, clone(view));
        applyMock(row, opt, original[key]);
        recount(view);
        return { ok: true, kind: 'head_done', view: clone(view), undoToken: token, toast: 'ครู' + row.name + ': ' + (opt.action === 'head' ? 'หัวหน้าเวรเช็ค' : opt.label) };
      }
      case 'headUndo': {
        const prev = undo.get(body.undoToken);
        if (!prev) return fail('undo_expired', 'หมดเวลาเลิกทำแล้ว ให้แตะแถวแล้วเลือกสถานะใหม่');
        undo.delete(body.undoToken);
        view = prev;
        return { ok: true, kind: 'head_done', view: clone(view), toast: 'เลิกทำแล้ว' };
      }
      case 'headPhoto': return photoSvg(body.size);
      default: return fail('bad_action', 'ไม่รู้จักคำสั่งนี้ ให้รีเฟรชหน้าแล้วลองอีกครั้ง');
    }
  };
}

// transport ของ api.js: โหลด mock-data.json ครั้งเดียว หน่วงเล็กน้อย (บันทึก/เลิกทำ SAVE_DELAY_MS) · netfail = บันทึก (headSet/headUndo) ล้มเหลวตลอด,
// รีเฟรช (headView หลังครั้งแรก) ล้มเหลว และรูปใหญ่โหลดไม่ได้
export function headMockTransport(scenario) {
  let callP = null, views = 0;
  const load = () => {
    if (!callP) {
      // ใช้ ?v= เดียวกับไฟล์นี้ (ไฟล์ใหม่หลัง deploy ไม่ติดแคช)
      callP = fetch(new URL('./mock-data.json' + new URL(import.meta.url).search, import.meta.url)).then((r) => r.json()).then((data) => headMockCall(scenario, data));
    }
    return callP;
  };
  return async (body) => {
    const call = await load();
    const save = body.action === 'headSet' || body.action === 'headUndo';
    await new Promise((r) => setTimeout(r, save ? SAVE_DELAY_MS : body.action === 'headPhoto' ? 500 : 350));
    if (scenario === 'netfail') {
      if (body.action === 'headSet' || body.action === 'headUndo') throw new Error('mock network');
      if (body.action === 'headView' && views++ > 0) throw new Error('mock network');
      if (body.action === 'headPhoto' && body.size === 'full') throw new Error('mock network');
    }
    return call(body);
  };
}
