import { redirect } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import { toYMD } from '@/lib/date';

export const dynamic = 'force-dynamic';

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function MonthlyReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <AppShell role="parent" email={user.email}>
        <p className="text-slate-500">尚未建立學生帳號。</p>
      </AppShell>
    );
  }

  const start = monthStart();
  const startISO = toYMD(start); // 本地時區的月初日期
  const today = new Date();
  const daysSoFar = Math.min(
    today.getDate(),
    new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
  );

  const [{ data: checkins }, { count: mistakeCount }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('tasks_total, tasks_done, is_rest_day, date')
      .eq('user_id', student.id)
      .gte('date', startISO),
    supabase
      .from('mistakes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', student.id)
      .gte('created_at', start.toISOString()),
  ]);

  // 自訂清單後，以「當天打卡完成數 / 總數」衡量整體完成度
  // （免讀日視為完成；無項目的日子不計入分母）
  const rows = checkins || [];
  const activeDays = rows.filter((r) => r.is_rest_day || r.tasks_total > 0);
  const completeDays = rows.filter(
    (r) => r.is_rest_day || (r.tasks_total > 0 && r.tasks_done >= r.tasks_total),
  ).length;
  // 整體任務完成率（所有項目）
  let totalTasks = 0;
  let doneTasks = 0;
  for (const r of rows) {
    totalTasks += r.tasks_total || 0;
    doneTasks += Math.min(r.tasks_done || 0, r.tasks_total || 0);
  }
  const overallRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const completionRate = daysSoFar ? Math.round((completeDays / daysSoFar) * 100) : 0;

  const checks = [
    { label: '每日打卡完成', value: `${completionRate}%`, target: '≥ 80%', pass: completionRate >= 80 },
    { label: '任務整體完成率', value: `${overallRate}%`, target: '≥ 80%', pass: overallRate >= 80 },
    { label: '錯題本有在記', value: `${mistakeCount ?? 0} 筆`, target: '≥ 8 筆', pass: (mistakeCount ?? 0) >= 8 },
  ];

  // 規格：三項全部達標才維持自主學習權（兩項以下達標 → 需介入）
  const passed = checks.every((c) => c.pass);

  return (
    <AppShell role="parent" email={user.email}>
      <h1 className="text-2xl font-bold text-slate-800">月度檢核</h1>
      <p className="text-sm text-slate-500">
        {start.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
      </p>

      <div
        className={`mt-6 rounded-2xl px-5 py-6 text-center lg:max-w-md ${
          passed ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
        }`}
      >
        <p className="text-sm font-medium">{passed ? '三項全數達標' : '未全數達標'}</p>
        <p className="mt-1 text-2xl font-bold">
          {passed ? '維持自主學習權' : '下個月需介入'}
        </p>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center justify-between rounded-2xl border bg-white px-4 py-4"
          >
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="text-xs text-slate-500">目標 {c.target}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{c.value}</p>
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  c.pass ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {c.pass ? <Check size={14} /> : <X size={14} />}
                {c.pass ? '達標' : '未達標'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
