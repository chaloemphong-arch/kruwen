// ตัวตนจาก LINE (LIFF): คืน {idToken} | {mock:true} | {fallback:true}
// ?mock=<scenario> ไม่โหลด LIFF SDK เลย
import { LIFF_ID } from '../config.js';

const SDK = 'https://static.line-scdn.net/liff/edge/versions/2.24.0/sdk.js';

// ?v=<หน้า> จาก query ตรง ๆ หรือจาก liff.state (เปิดผ่าน liff.line.me/<id>?v=head ครั้งแรกจะได้ ?liff.state=%3Fv%3Dhead ก่อน liff.init)
export function viewParam(search) {
  const q = new URLSearchParams(search || '');
  if (q.get('v')) return q.get('v');
  const st = q.get('liff.state');
  if (!st) return null;
  const i = st.indexOf('?');
  return new URLSearchParams(i >= 0 ? st.slice(i + 1) : st).get('v');
}

export function mockScenario(search) {
  return new URLSearchParams(search || '').get('mock');
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function initIdentity() {
  if (mockScenario(location.search) !== null) return { mock: true };
  try {
    if (!LIFF_ID) throw new Error('no LIFF_ID');
    await loadScript(SDK);
    const liff = window.liff;
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      return new Promise(() => {}); // กำลังพาไปเข้าสู่ระบบ LINE
    }
    const idToken = liff.getIDToken();
    if (!idToken) throw new Error('no id token');
    return { idToken };
  } catch (e) {
    return { fallback: true };
  }
}
