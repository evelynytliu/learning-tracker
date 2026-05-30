import { isoDayOfWeek, toYMD } from './date';

// 決定某一天該套用哪一份打卡清單。
// 優先序：特殊期間(日期區間) > 星期對應的清單 > 第一份清單 > null。
export function resolveTaskSet({ date = new Date(), taskSets = [], specialPeriods = [] }) {
  const ymd = toYMD(date);
  const dow = isoDayOfWeek(date);

  // 1. 特殊期間（取最後一個符合的，後建立的覆蓋先建立的）
  //    weekdays 空 = 整段每天套用；有值 = 只在這段日期的這些星期套用。
  const matchedPeriod = specialPeriods
    .filter((p) => {
      if (ymd < p.start_date || ymd > p.end_date) return false;
      const wd = p.weekdays || [];
      return wd.length === 0 || wd.includes(dow);
    })
    .at(-1);
  if (matchedPeriod) {
    const set = taskSets.find((s) => s.id === matchedPeriod.task_set_id);
    if (set) return { set, reason: matchedPeriod.name };
  }

  // 2. 星期對應
  const byWeekday = taskSets.find((s) => (s.weekdays || []).includes(dow));
  if (byWeekday) return { set: byWeekday, reason: byWeekday.name };

  // 3. 退而求其次：第一份
  if (taskSets.length > 0) return { set: taskSets[0], reason: taskSets[0].name };

  return { set: null, reason: null };
}
