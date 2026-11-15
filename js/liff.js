// ตัวตนจาก LINE (LIFF): คืน {idToken} | {mock:true} | {fallback:true}
// ?mock=<scenario> ไม่โหลด LIFF SDK เลย
import { LIFF_ID } from '../config.js';

const SDK = 'https://static.line-scdn.net/liff/edge/versions/2.24.0/sdk.js';

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
