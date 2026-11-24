// ใบเช็คเวรวันนี้ของลูกเวร (ดูอย่างเดียว): หัวหน้า + แท็บช่วงเวร + การ์ดต่อจุด
import { esc, pointNo, sessionIcon } from '../head/view.js';

const mark = (m) => {
  const k = m && m.kind;
  if (k === 'tick') return `<span class="tk"><span class="ok">✓</span>${m.by ? `<span class="by">(${esc(m.by)})</span>` : ''}</span>`;
  if (k === 'leave') return '<span class="tk"><span class="pend">ลา</span></span>';
  if (k === 'pending') return '<span class="tk"><span class="pend">ยังไม่ได้เช็ค</span></span>';
  return '<span class="tk"></span>';
};

const row = (x) => `<div class="nrow${x.me ? ' me' : ''}"><span class="pno">${esc(pointNo(x.dutyCode))}</span><span class="nm"><b>${esc(x.name)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${mark(x.mark)}</div>`;

export function renderTeam(st) {
  const r = st.r, ss = r.sessions || [];
  const tab = Math.min(Math.max(0, Number(st.tab) || 0), Math.max(0, ss.length - 1));
  const head = `<header class="thd"><button class="back" data-act="my">‹ กลับ</button><b>สถานะเวรวันนี้</b><span class="dl">${esc(r.weekdayThai)} ${esc(r.dateThai)}</span></header>`;
  const tabs = ss.length < 2 ? '' : '<div class="stabs" role="tablist">' + ss.map((s, i) =>
    `<button class="stab" role="tab" tabindex="${i === tab ? 0 : -1}" data-act="teamTab" data-i="${i}" aria-selected="${i === tab}"><span class="tl">${sessionIcon(s)}<span class="sl">${esc(s.label)}</span></span><small>${esc(s.time)}</small></button>`).join('') + '</div>';
  const s = ss[tab], groups = [];
  for (const x of (s ? s.rows : [])) {
    let g = groups.find((q) => q.code === x.dutyCode);
    if (!g) groups.push(g = { code: x.dutyCode, place: x.place, rows: [] });
    g.rows.push(x);
  }
  const panel = `<div class="panel">${groups.map((g) => `<div class="grp"><div class="sub">${esc(g.place)}</div>${g.rows.map(row).join('')}</div>`).join('')}</div>`;
  return `<div class="team">${head}${tabs}${panel}</div>`;
}
