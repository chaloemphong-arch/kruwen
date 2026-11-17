// การแสดงชื่อคน (ใช้ทั้งหน้าครูและหน้าหัวหน้าเวร ตรงกับ backend/Names.js)
// เติม "ครู" เฉพาะชื่อที่ไม่มีคำนำหน้าของตัวเอง เช่น นักเรียนที่พิมพ์ "นายสมชาย ใจดี" จะไม่กลายเป็น "ครูนายสมชาย"
export const NAME_TITLES = ['ครู', 'นางสาว', 'นาง', 'นาย', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ดร.'];

export const hasTitle = (name) => { const n = String(name == null ? '' : name).trim(); return NAME_TITLES.some((t) => n.startsWith(t)); };

// "สมชาย ใจดี" -> "ครูสมชาย ใจดี" · "นายสมชาย ใจดี" -> เดิม · '' -> ''
export const withTitle = (name) => { const n = String(name == null ? '' : name).trim(); return !n ? '' : hasTitle(n) ? n : 'ครู' + n; };
