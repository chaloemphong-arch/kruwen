// เรียก API หลังบ้าน (Apps Script doPost) แบบ POST text/plain (เลี่ยง CORS preflight)
// เน็ตล้มเหลว → ลองใหม่ตาม retryDelays แล้ว 15 วินาทีไปเรื่อย ๆ
import { API_URL } from '../config.js';

export const retryDelays = [2000, 4000, 8000, 15000];

export function retryDelay(attempt) {
  return attempt < retryDelays.length ? retryDelays[attempt] : retryDelays[retryDelays.length - 1];
}

let identity = {};
let transport = null;
const waiters = new Set();

// {idToken, deviceId} หรือ {deviceId, teacherId} (โหมดสำรอง)
export function setIdentity(id) { identity = id || {}; }

// โหมด mock: async (body) => Result (throw = เน็ตล้มเหลว)
export function setTransport(fn) { transport = fn; }

async function httpTransport(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error('http ' + res.status);
  return res.json();
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
  const body = Object.assign({ action }, identity, payload);
  const retries = opts.retries === undefined ? Infinity : opts.retries;
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await (transport || httpTransport)(body);
      if (r && typeof r === 'object') return r;
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
