'use client';

// 打卡寫入的「單一真相來源」：打卡頁（CheckinForm）和首頁（TodayCard）都用這裡，
// 確保「勾一個項目」在哪裡按都走完全一樣的路徑，daily_checkins 摘要、品學堂旗標、
// 點數對帳、成就評估不會因為兩處各寫一套而分歧。
import { createClient } from '@/lib/supabase/client';
import { toYMD } from '@/lib/date';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';

// 只用正規項目重算每日摘要（加分項不計入完成度）。
// pinxuetang_done：有勾任何名稱含「品學堂」的項目就算，讓品學堂點數/徽章能累積。
export function syncDailySummary(
  supabase,
  { userId, date, tasks, bonusTasks = [], done, rest = false },
) {
  const doneCount = tasks.filter((t) => done[t.id]).length;
  const pinxDone = [...tasks, ...bonusTasks].some(
    (t) => done[t.id] && (t.label || '').includes('品學堂'),
  );
  return supabase.from('daily_checkins').upsert(
    {
      user_id: userId,
      date,
      is_rest_day: !!rest,
      tasks_total: tasks.length,
      tasks_done: doneCount,
      pinxuetang_done: pinxDone,
    },
    { onConflict: 'user_id,date' },
  );
}

// 勾／取消勾一個任務：寫 task_checkins → 重算每日摘要 → 評估成就。
// nextDone 是「切換後」的完整 done 狀態（含正規＋加分），這樣摘要算得正確。
// 回傳 { error, unlocked }；error 非 null 代表失敗（呼叫端可 rollback）。
export async function persistTaskToggle({
  userId,
  date,
  taskId,
  nextDone,
  tasks,
  bonusTasks = [],
  rest = false,
}) {
  const supabase = createClient();
  const r1 = await supabase.from('task_checkins').upsert(
    { user_id: userId, task_id: taskId, date, done: !!nextDone[taskId] },
    { onConflict: 'user_id,task_id,date' },
  );
  if (r1.error) return { error: r1.error, unlocked: [] };

  const r2 = await syncDailySummary(supabase, {
    userId,
    date,
    tasks,
    bonusTasks,
    done: nextDone,
    rest,
  });
  if (r2.error) return { error: r2.error, unlocked: [] };

  const { data, error } = await supabase.rpc('evaluate_achievements', {
    p_user_id: userId,
    p_today: toYMD(),
  });
  const unlocked =
    !error && data ? data.map((k) => ACHIEVEMENT_MAP[k]).filter(Boolean) : [];
  return { error: null, unlocked };
}
