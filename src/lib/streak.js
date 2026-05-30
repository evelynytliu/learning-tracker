import { toYMD } from './date';

// 新版「當天是否完成」：用每日摘要欄位。
// 免讀日視為達標（不中斷連勝）；否則需 tasks_total>0 且 done>=total。
export function isDayComplete(row) {
  if (!row) return false;
  if (row.is_rest_day) return true;
  return row.tasks_total > 0 && row.tasks_done >= row.tasks_total;
}

// checkins：由新到舊的每日摘要。回傳目前連續達標天數。
export function computeStreakFromSummary(checkins, todayStr) {
  const doneDates = new Set(checkins.filter(isDayComplete).map((c) => c.date));
  let streak = 0;
  const cursor = new Date(todayStr + 'T00:00:00');
  if (!doneDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (doneDates.has(toYMD(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
