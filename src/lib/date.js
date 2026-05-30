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
