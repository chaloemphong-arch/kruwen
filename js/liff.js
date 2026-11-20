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

// ลิงก์เปิดหน้าเดิมในแอป LINE (เก็บ ?p=&k=&v= ไว้ ตัดพารามิเตอร์ของ LIFF/การเข้าสู่ระบบทิ้ง)
// Android ใช้ intent (ถ้าเปิดแอปไม่ได้ ไปลิงก์ liff.line.me แทน) · iPhone ใช้ line:// · อื่น ๆ ใช้ liff.line.me
export function lineLinks(liffId, search, ua) {
  const q = new URLSearchParams(search || '');
  [...q.keys()].forEach((k) => { if (/^liff\./.test(k) || k === 'code' || k === 'state') q.delete(k); });
  const qs = q.toString() ? '?' + q.toString() : '';
  const url = 'https://liff.line.me/' + liffId + qs;
  const agent = String(ua || '');
  let open = url;
  if (/Android/i.test(agent)) {
    open = 'intent://app/' + liffId + qs + '#Intent;scheme=line;package=jp.naver.line.android;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
  } else if (/iPhone|iPad|iPod/i.test(agent)) {
    open = 'line://app/' + liffId + qs;
  }
  return { url, open };
}

export async function initIdentity() {
  if (mockScenario(location.search) !== null) return { mock: true };
  try {
    if (!LIFF_ID) throw new Error('no LIFF_ID');
    await loadScript(SDK);
    const liff = window.liff;
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      // เปิดนอกแอป LINE (เช่น กดลิงก์ในแชทเฟส): ให้เลือกเปิดใน LINE ก่อน ไม่พาไปหน้าเข้าสู่ระบบทันที
      if (!liff.isInClient()) {
        const links = lineLinks(LIFF_ID, location.search, navigator.userAgent);
        return { outside: true, href: links.open, login: () => liff.login({ redirectUri: location.href }) };
      }
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
