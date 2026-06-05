// 日期工具：以「週一」為一週起點（符合台灣作息與課表）。

// 回傳本地時區的 YYYY-MM-DD
export function toYMD(d = new Date()) {
  return d.toLocaleDateString('en-CA');
}

// 取得某日所在週的「週一」日期物件
export function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=週日 .. 6=週六
  const diff = (day === 0 ? -6 : 1 - day); // 調整到週一
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// 本週週一的 YYYY-MM-DD（給 weekly_goals.week_start 用）
export function weekStartYMD(d = new Date()) {
  return toYMD(weekStart(d));
}

// 今天是週幾（1=週一 .. 7=週日），對應 class_schedule.day_of_week
export function isoDayOfWeek(d = new Date()) {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

// 把資料庫 time（"HH:MM:SS"）格式化成 "HH:MM"；空值回傳 ''
export function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

// 事件時間標籤：全天 / 14:30 / 14:30–16:00
export function eventTimeLabel(start, end) {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (!s && !e) return '全天';
  if (s && e) return `${s}–${e}`;
  return s || e;
}
