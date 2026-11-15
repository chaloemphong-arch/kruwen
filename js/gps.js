// พิกัดแบบไม่บังคับ: รอไม่เกิน timeoutMs แล้วไปต่อ (null = ไม่ได้พิกัด) ไม่แสดงพิกัดบนหน้าเว็บ
export function getGps(timeoutMs = 3000) {
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const finish = (v) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(v);
    };
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return finish(null);
      timer = setTimeout(() => finish(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (p) => finish({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        () => finish(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
      );
    } catch (e) {
      finish(null);
    }
  });
}
