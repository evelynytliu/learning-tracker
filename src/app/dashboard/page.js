import { redirect } from 'next/navigation';
import Link from 'next/link';
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

  const weekStart = weekStartYMD(); // 本週週一（本地時區）
  // mistakes.created_at 是 timestamptz，用週一的本地 00:00 當下界
  const weekStartTs = weekStartDate().toISOString();

  const [{ data: checkins }, { data: mistakes }, { data: courses }, { data: courseProgress }] =
    await Promise.all([
      supabase.from('daily_checkins').select('*').eq('user_id', student.id).gte('date', weekStart),
      supabase
        .from('mistakes')
        .select('id, subject, reason, created_at')
        .eq('user_id', student.id)
        .gte('created_at', weekStartTs),
      supabase
        .from('courses')
        .select('id, title, emoji, total_units, unit_label, archived')
        .eq('user_id', student.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('course_progress')
        .select('course_id, done_at')
        .eq('user_id', student.id),
    ]);

  const fullDays = (checkins || []).filter(isDayComplete).length;
  const today = new Date();
  const daysSoFar = Math.min(7, Math.floor((today - weekStartDate()) / 86400000) + 1);
  const rate = daysSoFar ? Math.round((fullDays / daysSoFar) * 100) : 0;

  const light =
    rate >= 80
      ? { label: '綠燈・狀況良好', chip: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-teal-500' }
      : rate >= 70
      ? { label: '黃燈・留意一下', chip: 'bg-amber-100 text-amber-700', bar: 'from-amber-400 to-orange-500' }
      : { label: '紅燈・建議介入', chip: 'bg-rose-100 text-rose-700', bar: 'from-rose-400 to-red-500' };

  // streak
  const since = new Date();
  since.setDate(since.getDate() - 200);
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
  const maxSubject = Math.max(1, ...Object.values(bySubject));
  const maxReason = Math.max(1, ...Object.values(byReason));

  // course progress
  const doneByCourse = {};
  let courseUnitsWeek = 0;
  for (const p of courseProgress || []) {
    doneByCourse[p.course_id] = (doneByCourse[p.course_id] || 0) + 1;
    if (toYMD(new Date(p.done_at)) >= weekStart) courseUnitsWeek += 1;
  }
  const activeCourses = (courses || []).filter((c) => !c.archived);

  return (
    <AppShell role="parent" email={user.email}>
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">本週狀況</h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.display_name}・{weekStart} 起
        </p>
      </header>

      {/* 重點數字 */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="section-label">本週打卡率</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{rate}%</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black ${light.chip}`}>
            {light.label}
          </span>
          <div className="progress-track mt-3">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${light.bar} transition-all duration-500`}
              style={{ width: `${Math.min(100, rate)}%` }}
            />
          </div>
        </div>

        <div className="card p-4">
          <p className="section-label">連續達標</p>
          <p className="mt-2 text-3xl font-black text-slate-900">🔥 {streak}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">天連勝中</p>
        </div>

        <div className="card p-4">
          <p className="section-label">本週錯題</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{(mistakes || []).length}</p>
          <Link href="/dashboard/mistakes" className="mt-2 inline-block text-xs font-bold text-indigo-500 hover:underline">
            看分析 →
          </Link>
        </div>

        <div className="card p-4">
          <p className="section-label">本週線上課</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{courseUnitsWeek}</p>
          <Link href="/courses" className="mt-2 inline-block text-xs font-bold text-indigo-500 hover:underline">
            集／堂・看進度 →
          </Link>
        </div>
      </section>

      {/* 線上課程進度 */}
      <section className="card mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-slate-800">🎓 線上課程進度</h2>
          <Link href="/courses" className="text-xs font-bold text-indigo-500 hover:underline">
            管理課程 →
          </Link>
        </div>
        {activeCourses.length === 0 ? (
          <p className="text-xs text-slate-400">還沒有進行中的課程。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeCourses.map((c) => {
              const done = doneByCourse[c.id] || 0;
              const pct =
                c.total_units > 0 ? Math.min(100, Math.round((done / c.total_units) * 100)) : null;
              return (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                    {c.emoji || '🎓'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-700">{c.title}</p>
                      <p className="flex-shrink-0 text-xs font-bold text-slate-400">
                        {done}
                        {c.total_units > 0 ? ` / ${c.total_units}` : ''} {c.unit_label}
                        {pct !== null && <span className="ml-1.5 text-indigo-500">{pct}%</span>}
                      </p>
                    </div>
                    {pct !== null && (
                      <div className="progress-track mt-1.5 h-2">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 錯題分析 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-black text-slate-800">本週錯題（科目）</h2>
          {Object.keys(bySubject).length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">本週尚無錯題</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {Object.entries(bySubject).map(([sub, n]) => (
                <li key={sub} className="flex items-center gap-2 text-sm">
                  <span className="w-12 font-semibold text-slate-600">{sub}</span>
                  <div className="flex-1">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
                      style={{ width: `${Math.max(8, (n / maxSubject) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-black text-slate-800">錯誤原因分布</h2>
          {Object.keys(byReason).length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">尚無資料</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {Object.entries(byReason).map(([r, n]) => (
                <li key={r} className="flex items-center gap-2 text-sm">
                  <span className="w-20 font-semibold text-slate-600">{r}</span>
                  <div className="flex-1">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                      style={{ width: `${Math.max(8, (n / maxReason) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
