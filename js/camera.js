// กล้องสด getUserMedia เท่านั้น (ไม่มีทางเลือกไฟล์จากเครื่อง) ย่อด้านยาว 1280 px JPEG 0.8 ไม่วาดอะไรเพิ่มบนรูป

export function fitSize(w, h, max = 1280) {
  const long = Math.max(w, h);
  if (long <= max) return { w, h };
  const s = max / long;
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

let current = null;
let facing = 'environment';
let videoEl = null;
let source = null; // โหมด mock: ฟังก์ชันคืน stream จำลอง (หรือ null = กล้องเปิดไม่ได้)

export function setStreamSource(fn) { source = fn; }

export function currentFacing() { return facing; }

// ขอกล้องตามด้านที่ต้องการแบบบังคับก่อน (มือถือบางรุ่นเปิดกล้องหน้าถ้าขอแบบ ideal)
// ไม่มีกล้องด้านนั้น → ขอแบบ ideal (ได้กล้องที่มี)
async function requestStream(f) {
  const base = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  try {
    return await navigator.mediaDevices.getUserMedia({ video: Object.assign({ facingMode: { exact: f } }, base), audio: false });
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw e; // ถูกปฏิเสธสิทธิ์: ไม่ถามซ้ำ
    return navigator.mediaDevices.getUserMedia({ video: Object.assign({ facingMode: { ideal: f } }, base), audio: false });
  }
}

// กล้องที่ได้จริง (มือถือบอกได้) ไม่บอก = ถือตามที่ขอ
function actualFacing(stream, asked) {
  try {
    const t = stream.getVideoTracks && stream.getVideoTracks()[0];
    const fm = t && t.getSettings && t.getSettings().facingMode;
    if (fm === 'user' || fm === 'environment') return fm;
  } catch (e) { /* ไม่รู้ */ }
  return asked;
}

// คืน stream หรือ null เมื่อไม่มี getUserMedia / ถูกปฏิเสธ / เปิดไม่ได้
// กล้องหน้า: ภาพตอนเล็งกลับข้างเหมือนกระจก (เหมือนแอปกล้องปกติ) รูปที่บันทึกยังเป็นภาพจริง
export async function openLiveCamera(video, f = 'environment') {
  stop();
  facing = f;
  videoEl = video;
  try {
    let stream;
    if (source) {
      stream = await source(f);
    } else {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
      stream = await requestStream(f);
    }
    if (!stream) return null;
    current = stream;
    facing = source ? f : actualFacing(stream, f);
    if (video.classList) video.classList.toggle('mirror', facing === 'user');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* autoplay อาจถูกบล็อก ภาพยังขึ้นเมื่อแตะ */ }
    return stream;
  } catch (e) {
    current = null;
    return null;
  }
}

// สลับกล้องหน้า/หลัง; สลับไม่ได้ → กลับไปกล้องเดิม
export async function switchFacing() {
  if (!videoEl) return null;
  const before = facing;
  const s = await openLiveCamera(videoEl, before === 'environment' ? 'user' : 'environment');
  if (s) return s;
  return openLiveCamera(videoEl, before);
}

// base64 JPEG (ไม่มี prefix data:) หรือ null ถ้ายังไม่มีภาพ
export function capture(video) {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return null;
  const s = fitSize(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = s.w;
  canvas.height = s.h;
  canvas.getContext('2d').drawImage(video, 0, 0, s.w, s.h);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

export function stop() {
  if (current) {
    current.getTracks().forEach((t) => t.stop());
    current = null;
  }
  if (videoEl) videoEl.srcObject = null;
}
