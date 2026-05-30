import { resolveTaskSet } from './tasks';

// 載入某使用者某天的打卡資料：套用的清單、項目、已完成狀態、免讀日、品學堂。
// 在 server component 用（傳入 server supabase client）。
export async function loadDayCheckin(supabase, userId, ymd) {
  const [{ data: taskSets }, { data: specialPeriods }, { data: summary }] = await Promise.all([
    supabase
      .from('task_sets')
      .select('id, name, weekdays, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('special_periods')
      .select('id, name, task_set_id, start_date, end_date')
      .eq('user_id', userId),
    supabase
      .from('daily_checkins')
      .select('is_rest_day, pinxuetang_done, tasks_total, tasks_done')
      .eq('user_id', userId)
      .eq('date', ymd)
      .maybeSingle(),
  ]);

  const date = new Date(ymd + 'T00:00:00');
  const { set, reason } = resolveTaskSet({
    date,
    taskSets: taskSets ?? [],
    specialPeriods: specialPeriods ?? [],
  });

  let tasks = [];
  let doneMap = {};
  if (set) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, label, hint, sort_order')
      .eq('set_id', set.id)
      .order('sort_order', { ascending: true });
    tasks = taskRows ?? [];

    if (tasks.length > 0) {
      const { data: checks } = await supabase
        .from('task_checkins')
        .select('task_id, done')
        .eq('user_id', userId)
        .eq('date', ymd)
        .in(
          'task_id',
          tasks.map((t) => t.id),
        );
      for (const c of checks ?? []) doneMap[c.task_id] = c.done;
    }
  }

  return {
    setName: reason,
    tasks,
    doneMap,
    isRest: !!summary?.is_rest_day,
    pinxuetangDone: !!summary?.pinxuetang_done,
    hasSets: (taskSets?.length ?? 0) > 0,
  };
}
