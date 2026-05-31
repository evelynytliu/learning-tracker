import { resolveTaskSet } from './tasks';

// 載入某使用者某天的打卡資料：套用的清單、正規項目、加分項目、已完成狀態、免讀日。
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
      .select('id, name, task_set_id, start_date, end_date, weekdays')
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

  let allTasks = [];
  let doneMap = {};
  if (set) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, label, hint, link, is_bonus, sort_order')
      .eq('set_id', set.id)
      .order('sort_order', { ascending: true });
    allTasks = taskRows ?? [];

    if (allTasks.length > 0) {
      const { data: checks } = await supabase
        .from('task_checkins')
        .select('task_id, done')
        .eq('user_id', userId)
        .eq('date', ymd)
        .in(
          'task_id',
          allTasks.map((t) => t.id),
        );
      for (const c of checks ?? []) doneMap[c.task_id] = c.done;
    }
  }

  const tasks = allTasks.filter((t) => !t.is_bonus); // 正規項目（計入完成度）
  const bonusTasks = allTasks.filter((t) => t.is_bonus); // 加分項目（不計入）

  // 對帳：以「目前生效的正規項目」重算完成數，若和已存摘要不一致就寫回，
  // 避免清單改過後 daily_checkins 的 tasks_total/done 停在舊值。
  const total = tasks.length;
  const done = tasks.filter((t) => doneMap[t.id]).length;
  const summaryStale =
    summary && (summary.tasks_total !== total || summary.tasks_done !== done);
  if (summaryStale) {
    await supabase.from('daily_checkins').upsert(
      {
        user_id: userId,
        date: ymd,
        is_rest_day: !!summary.is_rest_day,
        pinxuetang_done: !!summary.pinxuetang_done,
        tasks_total: total,
        tasks_done: done,
      },
      { onConflict: 'user_id,date' },
    );
  }

  return {
    setName: reason,
    tasks,
    bonusTasks,
    doneMap,
    isRest: !!summary?.is_rest_day,
    hasSets: (taskSets?.length ?? 0) > 0,
  };
}
