import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { toYMD, weekStart as weekStartDate, weekStartYMD } from '@/lib/date';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // find the (first) student
  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <AppShell role="parent" email={user.email}>
        <p className="text-slate-500">尚未建立學生帳號。</p>
      </AppShell>
    );
  }

  const weekStart = weekStartYMD(); // 本週週一（本地時區）
  // mistakes.created_at 是 timestamptz，用週一的本地 00:00 當下界
  const weekStartTs = weekStartDate().toISOString();

  const [{ data: checkins }, { data: mistakes }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', student.id)
      .gte('date', weekStart),
    supabase
      .from('mistakes')
      .select('id, subject, reason, created_at')
      .eq('user_id', student.id)
      .gte('created_at', weekStartTs),
  ]);

  const fullDays = (checkins || []).filter(isDayComplete).length;
  const today = new Date();
  const daysSoFar = Math.min(7, Math.floor((today - weekStartDate()) / 86400000) + 1);
  const rate = daysSoFar ? Math.round((fullDays / daysSoFar) * 100) : 0;

  const light =
    rate >= 80
      ? { label: '綠燈', color: 'bg-green-500' }
      : rate >= 70
      ? { label: '黃燈', color: 'bg-yellow-400' }
      : { label: '紅燈', color: 'bg-red-500' };

  // streak
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data: history } = await supabase
    .from('daily_checkins')
    .select('date, tasks_total, tasks_done, is_rest_day')
    .eq('user_id', student.id)
    .gte('date', toYMD(since))
    .order('date', { ascending: false });

  const streak = computeStreakFromSummary(history || [], toYMD(today));

  // mistake breakdown
  const bySubject = {};
  const byReason = {};
  for (const m of mistakes || []) {
    bySubject[m.subject] = (bySubject[m.subject] || 0) + 1;
    byReason[m.reason] = (byReason[m.reason] || 0) + 1;
  }

  return (
    <AppShell role="parent" email={user.email}>
      <h1 className="text-2xl font-bold text-slate-800">本週狀況</h1>
      <p className="text-sm text-slate-500">{student.display_name}</p>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:max-w-md">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">本週打卡率</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-3xl font-bold">{rate}%</p>
            <span className={`inline-block h-3 w-3 rounded-full ${light.color}`} />
          </div>
          <p className="text-xs text-slate-500">{light.label}</p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">連續達標</p>
          <p className="mt-1 text-3xl font-bold">🔥 {streak}</p>
          <p className="text-xs text-slate-500">天</p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-sm font-semibold">本週錯題（科目）</h2>
          {Object.keys(bySubject).length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">本週尚無錯題</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {Object.entries(bySubject).map(([sub, n]) => (
                <li key={sub} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-slate-600">{sub}</span>
                  <div className="flex-1">
                    <div
                      className="h-3 rounded bg-indigo-500"
                      style={{ width: `${Math.min(100, n * 20)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-sm font-semibold">錯誤原因分布</h2>
          {Object.keys(byReason).length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">尚無資料</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {Object.entries(byReason).map(([r, n]) => (
                <li key={r} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-slate-600">{r}</span>
                  <div className="flex-1">
                    <div
                      className="h-3 rounded bg-red-400"
                      style={{ width: `${Math.min(100, n * 20)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
