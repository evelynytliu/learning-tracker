import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { isCheckinComplete, CHECKIN_TASKS } from '@/lib/utils';
import { toYMD, weekStartYMD, isoDayOfWeek, DAY_LABELS } from '@/lib/date';

export const dynamic = 'force-dynamic';

const CHECKIN_KEYS = CHECKIN_TASKS.map((t) => t.key);

function computeStreak(checkins, todayStr) {
  // checkins: 由新到舊。沿用 isCheckinComplete（免讀日也算達標）。
  const doneDates = new Set(
    checkins.filter(isCheckinComplete).map((c) => c.date),
  );
  let streak = 0;
  const cursor = new Date(todayStr + 'T00:00:00');
  if (!doneDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (doneDates.has(toYMD(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'parent') redirect('/dashboard');

  const today = toYMD();
  const wkStart = weekStartYMD();
  const dow = isoDayOfWeek();

  const [
    { data: todayCheckin },
    { data: checkins },
    { data: goals },
    { data: todayClasses },
    { count: mistakeCount },
  ] = await Promise.all([
    supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase
      .from('daily_checkins')
      .select('date, homework_done, platform_task_done, english_input_done, math_practice_done, reading_done, is_rest_day')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(120),
    supabase.from('weekly_goals').select('*').eq('user_id', user.id).eq('week_start', wkStart),
    supabase
      .from('class_schedule')
      .select('period, subject, start_time, location')
      .eq('user_id', user.id)
      .eq('day_of_week', dow)
      .order('period', { ascending: true }),
    supabase.from('mistakes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const doneCount = todayCheckin ? CHECKIN_KEYS.filter((k) => todayCheckin[k]).length : 0;
  const streak = computeStreak(checkins ?? [], today);
  const goalsTotal = goals?.length ?? 0;
  const goalsDone = (goals ?? []).filter((g) => g.progress >= g.target).length;

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          嗨，{profile?.display_name} 👋
        </h1>
        <p className="text-sm text-slate-500">
          {today}（{DAY_LABELS[dow - 1]}）
        </p>
      </header>

      {/* 第一排：打卡（桌面佔兩格）+ 連續 + 週目標 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/checkin"
          className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white shadow-sm sm:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-90">今日打卡</span>
            <span className="text-sm opacity-90">{doneCount}/5</span>
          </div>
          <div className="mt-2 text-2xl font-bold">
            {doneCount === 5 ? '今天完成了！🎉' : '去打卡 →'}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${(doneCount / 5) * 100}%` }}
            />
          </div>
        </Link>

        <Link href="/streak" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">連續達標</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">
            🔥 {streak}
            <span className="ml-1 text-base font-normal text-slate-400">天</span>
          </div>
        </Link>

        <Link href="/weekly" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">本週目標</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">
            {goalsDone}
            <span className="text-base font-normal text-slate-400">/{goalsTotal || 0}</span>
          </div>
        </Link>
      </div>

      {/* 今日課表 */}
      <Link href="/schedule" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-800">📅 今日課表</span>
          <span className="text-xs text-slate-400">查看完整 →</span>
        </div>
        {todayClasses && todayClasses.length > 0 ? (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {todayClasses.slice(0, 8).map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-slate-400">{c.period}</span>
                <span className="font-medium text-slate-700">{c.subject}</span>
                {c.start_time && (
                  <span className="text-slate-400">{c.start_time.slice(0, 5)}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">今天還沒有排課，點我去設定</p>
        )}
      </Link>

      {/* 功能格 */}
      <h2 className="mb-3 mt-7 text-sm font-semibold text-slate-500">所有功能</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <FeatureCard href="/mistakes" icon="📝" title="錯題本" subtitle={`${mistakeCount ?? 0} 筆`} />
        <FeatureCard href="/streak" icon="🔥" title="連續紀錄" subtitle="看火焰" />
        <FeatureCard href="/schedule" icon="📅" title="課表" subtitle="編輯每週課" />
        <FeatureCard href="/weekly" icon="🎯" title="週進度" subtitle="本週目標" />
        <FeatureCard icon="📚" title="教材重點" soon />
        <FeatureCard icon="📖" title="課外閱讀" soon />
        <FeatureCard icon="✏️" title="筆記" soon />
        <FeatureCard icon="🏃" title="運動時間" soon />
        <FeatureCard icon="🏆" title="成就榜" soon />
        <FeatureCard icon="💬" title="留言板" soon />
      </div>
    </AppShell>
  );
}

function FeatureCard({ href, icon, title, subtitle, soon }) {
  const inner = (
    <div
      className={`flex h-full flex-col rounded-2xl border p-4 transition ${
        soon
          ? 'border-dashed border-slate-200 bg-slate-100/60'
          : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className={`mt-2 font-semibold ${soon ? 'text-slate-400' : 'text-slate-800'}`}>
        {title}
      </span>
      <span className="text-xs text-slate-400">{soon ? '即將推出' : subtitle}</span>
    </div>
  );
  if (soon || !href) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
