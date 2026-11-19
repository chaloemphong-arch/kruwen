// เรียก API หลังบ้าน (Apps Script doPost) แบบ POST text/plain (เลี่ยง CORS preflight)
// เน็ตล้มเหลว → ลองใหม่ตาม retryDelays แล้ว 15 วินาทีไปเรื่อย ๆ
import { API_URL } from '../config.js';

export const retryDelays = [2000, 4000, 8000, 15000];

export function retryDelay(attempt) {
  return attempt < retryDelays.length ? retryDelays[attempt] : retryDelays[retryDelays.length - 1];
}

let identity = {};
let transport = null;

// บัตรผ่านของระบบ: หลังบ้านออกให้หลังตรวจกับ LINE แล้ว ส่งกลับไปพร้อม idToken
// ครั้งต่อไปจะได้ไม่ต้องถาม LINE ใหม่ (เก็บในเครื่อง ถ้าเก็บไม่ได้ก็แค่ช้าลงเท่าเดิม)
const SESSION_KEY = 'duty.session';
let session = '';
try { session = (typeof localStorage !== 'undefined' && localStorage.getItem(SESSION_KEY)) || ''; } catch (e) { session = ''; }
function keepSession(v) {
  session = v || '';
  try {
    if (typeof localStorage === 'undefined') return;
    if (session) localStorage.setItem(SESSION_KEY, session); else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* เก็บไม่ได้ ไม่เป็นไร */ }
}
const waiters = new Set();

// {idToken, deviceId} หรือ {deviceId, teacherId} (โหมดสำรอง)
export function setIdentity(id) { identity = id || {}; }

// โหมด mock: async (body) => Result (throw = เน็ตล้มเหลว)
export function setTransport(fn) { transport = fn; }

// HTTP 200 แต่ไม่ใช่ JSON = ตั้งค่า Web app ผิด ลองใหม่ไม่ช่วย → หยุดลองและแจ้งเป็นข้อผิดพลาด
const BAD_RESPONSE = { ok: false, code: 'bad_response', message: 'ระบบตอบกลับผิดรูปแบบ แจ้งแอดมินให้ตรวจการตั้งค่า Web app' };

async function httpTransport(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error('http ' + res.status);
  try { return await res.json(); } catch (e) { return BAD_RESPONSE; }
}

function wait(ms) {
  return new Promise((resolve) => {
    const w = () => { clearTimeout(t); waiters.delete(w); resolve(); };
    const t = setTimeout(w, ms);
    waiters.add(w);
  });
}

// ปุ่ม "ลองอีกครั้งตอนนี้": ปลุกทุกคำขอที่รอลองใหม่ให้ส่งทันที
export function retryNow() { Array.from(waiters).forEach((w) => w()); }

export const NETWORK_FAIL = { ok: false, code: 'network', message: 'สัญญาณอินเทอร์เน็ตไม่พอ ให้ลองอีกครั้งเมื่อมีสัญญาณ' };

// opts: onRetry(attempt) เมื่อเน็ตล้มเหลวครั้งที่ attempt, retries (จำนวนครั้งที่ลองใหม่ ค่าเริ่มต้นไม่จำกัด),
// shouldContinue() → false = หยุดลอง คืน NETWORK_FAIL
export async function call(action, payload = {}, opts = {}) {
  const withPass = session && identity.idToken && action !== 'config' ? { session } : {};
  const body = Object.assign({ action }, identity, withPass, payload);
  const retries = opts.retries === undefined ? Infinity : opts.retries;
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await (transport || httpTransport)(body);
      if (r && typeof r === 'object') {
        if (typeof r.session === 'string' && r.session) keepSession(r.session);
        else if (r.code === 'auth' && body.session) keepSession('');
        return r;
      }
      throw new Error('bad response');
    } catch (e) {
      if (attempt >= retries) return NETWORK_FAIL;
      if (opts.shouldContinue && !opts.shouldContinue()) return NETWORK_FAIL;
      if (opts.onRetry) opts.onRetry(attempt + 1);
      await wait(retryDelay(attempt));
      if (opts.shouldContinue && !opts.shouldContinue()) return NETWORK_FAIL;
    }
  }
}
