// 日期工具：一律以台灣時間（Asia/Taipei）為準，並以「週一」為一週起點。
// 重要：Vercel 伺服器跑在 UTC，若用伺服器本地時間，台灣 00:00–08:00 之間
// 所有「今天」都會差一天（打卡寫到昨天、週報切錯週）。

const TZ = 'Asia/Taipei';

// 回傳台灣時區的 YYYY-MM-DD
export function toYMD(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

// 今天是週幾（1=週一 .. 7=週日），對應 class_schedule.day_of_week（台灣時區）
export function isoDayOfWeek(d = new Date()) {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(d);
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[name];
}

// 取得某日所在週的「週一」：回傳的 Date 是台灣時間週一 00:00 的精確時刻，
// 可以直接 toISOString() 當 timestamptz 下界，或丟回 toYMD()。
export function weekStart(d = new Date()) {
  const ymd = toYMD(d);
  const dow = isoDayOfWeek(d);
  const midnight = new Date(`${ymd}T00:00:00+08:00`);
  // 台灣無日光節約，直接扣整數天的毫秒最穩
  return new Date(midnight.getTime() - (dow - 1) * 86400000);
}

// 本週週一的 YYYY-MM-DD（給 weekly_goals.week_start 用）
export function weekStartYMD(d = new Date()) {
  return toYMD(weekStart(d));
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
