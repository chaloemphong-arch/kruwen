// การแสดงชื่อคน (ใช้ทั้งหน้าครูและหน้าหัวหน้าเวร ตรงกับ backend/Names.js)
// เติม "ครู" เฉพาะชื่อที่ไม่มีคำนำหน้าของตัวเอง เช่น นักเรียนที่พิมพ์ "นายสมชาย ใจดี" จะไม่กลายเป็น "ครูนายสมชาย"
let addKru = true;
// ค่า name_add_kru จากหลังบ้าน (config / headHome) · false = แสดงชื่อตามที่พิมพ์ ไม่เติม "ครู"
export const setAddKru = (on) => { addKru = on !== false; };

export const NAME_TITLES = ['ครู', 'นางสาว', 'นาง', 'นาย', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ดร.'];

export const hasTitle = (name) => { const n = String(name == null ? '' : name).trim(); return NAME_TITLES.some((t) => n.startsWith(t)); };

// ชื่อแรกพร้อมคำนำหน้าที่พิมพ์ไว้: "นาย ก้อง มั่นคง" -> "นายก้อง" · "ครูสมชาย ใจดี" -> "สมชาย" (ตัด ครู ออก ผู้เรียกเติมเองด้วย withTitle)
export const firstWithTitle = (name) => {
  const w = String(name == null ? '' : name).trim().replace(/^ครู\s*/, '').split(/\s+/).filter(Boolean);
  if (w.length > 1 && NAME_TITLES.includes(w[0])) return w[0] + w[1];
  return w[0] || '';
};

// "สมชาย ใจดี" -> "ครูสมชาย ใจดี" · "นายสมชาย ใจดี" -> เดิม · '' -> ''
export const withTitle = (name) => { const n = String(name == null ? '' : name).trim(); return !n ? '' : hasTitle(n) || !addKru ? n : 'ครู' + n; };
