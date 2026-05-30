import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MiniCalendar from '@/components/MiniCalendar';
import { toYMD, weekStartYMD, isoDayOfWeek, DAY_LABELS } from '@/lib/date';
import { EXTERNAL_LINKS } from '@/lib/links';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';

export const dynamic = 'force-dynamic';

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
  const since = new Date();
  since.setMonth(since.getMonth() - 2);

  const [
    { data: todayCheckin },
    { data: checkins },
    { data: goals },
    { data: todayClasses },
    { count: mistakeCount },
    { data: events },
    { data: recentAchievements },
    { data: pendingAssignments },
    { count: booksRead },
  ] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('tasks_total, tasks_done, is_rest_day')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('daily_checkins')
      .select('date, tasks_total, tasks_done, is_rest_day')
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
    supabase
      .from('calendar_events')
      .select('id, title, event_date, end_date')
      .eq('user_id', user.id)
      .gte('event_date', toYMD(since)),
    supabase
      .from('user_achievements')
      .select('achievement_key, unlocked_at')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })
      .limit(4),
    supabase
      .from('assignments')
      .select('id, title, due_date, done')
      .eq('user_id', user.id)
      .eq('done', false)
      .order('due_date', { ascending: true }),
    supabase
      .from('reading_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('finished_date', 'is', null),
  ]);

  const total = todayCheckin?.tasks_total ?? 0;
  const doneCount = todayCheckin?.tasks_done ?? 0;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const streak = computeStreakFromSummary(checkins ?? [], today);
  const goalsTotal = goals?.length ?? 0;
  const goalsDone = (goals ?? []).filter((g) => g.progress >= g.target).length;

  const doneDates = (checkins ?? []).filter(isDayComplete).map((c) => c.date);
  const badges = (recentAchievements ?? [])
    .map((a) => ACHIEVEMENT_MAP[a.achievement_key])
    .filter(Boolean);
  const assignmentsLeft = pendingAssignments ?? [];

  // 接下來的行程（今天起，最多 4 筆）
  const upcoming = (events ?? [])
    .filter((e) => (e.end_date || e.event_date) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">嗨，{profile?.display_name} 👋</h1>
        <p className="text-sm text-slate-500">
          {today}（{DAY_LABELS[dow - 1]}）
        </p>
      </header>

      {/* 第一排：打卡 + 連續 + 週目標 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/checkin"
          className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white shadow-sm sm:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-90">今日打卡</span>
            <span className="text-sm opacity-90">{doneCount}/{total || '—'}</span>
          </div>
          <div className="mt-2 text-2xl font-bold">
            {total > 0 && doneCount >= total ? '今天完成了！🎉' : '去打卡 →'}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
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

      {/* 行事曆 + 接下來行程 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-800">📆 行事曆</span>
            <Link href="/calendar" className="text-xs text-slate-400">管理 →</Link>
          </div>
          <MiniCalendar events={events ?? []} doneDates={doneDates} todayStr={today} compact />
          <p className="mt-2 text-xs text-slate-400">· 綠點=打卡完成　· 黃點=有行程</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-800">🗓️ 接下來</span>
            <Link href="/calendar" className="text-xs text-slate-400">新增 →</Link>
          </div>
          {upcoming.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    {e.event_date.slice(5)}
                  </span>
                  <span className="font-medium text-slate-700">{e.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">還沒有登記行程，點「新增」加上去</p>
          )}
        </div>
      </div>

      {/* 暑假作業 */}
      {assignmentsLeft.length > 0 && (
        <Link href="/assignments" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-800">📋 待完成作業</span>
            <span className="text-xs text-slate-400">還有 {assignmentsLeft.length} 項 →</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {assignmentsLeft.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span className="font-medium text-slate-700">{a.title}</span>
                {a.due_date && <span className="text-xs text-slate-400">截止 {a.due_date}</span>}
              </li>
            ))}
          </ul>
        </Link>
      )}

      {/* 最近徽章 */}
      <Link href="/achievements" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-800">🏆 我的徽章</span>
          <span className="text-xs text-slate-400">成就牆 →</span>
        </div>
        {badges.length > 0 ? (
          <div className="flex gap-3">
            {badges.map((b) => (
              <div key={b.key} className="flex flex-col items-center" title={b.desc}>
                <span className="text-3xl">{b.emoji}</span>
                <span className="mt-1 text-xs text-slate-500">{b.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">開始打卡，解鎖你的第一個徽章！</p>
        )}
      </Link>

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
                {c.start_time && <span className="text-slate-400">{c.start_time.slice(0, 5)}</span>}
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
        <FeatureCard href="/assignments" icon="📋" title="暑假作業" subtitle={`待完成 ${assignmentsLeft.length}`} />
        <FeatureCard href="/reading" icon="📖" title="課外閱讀" subtitle={`讀完 ${booksRead ?? 0} 本`} />
        <FeatureCard href="/calendar" icon="📆" title="行事曆" subtitle="登記行程" />
        <FeatureCard href="/mistakes" icon="📝" title="錯題本" subtitle={`${mistakeCount ?? 0} 筆`} />
        <FeatureCard href="/streak" icon="🔥" title="連續紀錄" subtitle="看火焰" />
        <FeatureCard href="/schedule" icon="📅" title="課表" subtitle="編輯每週課" />
        <FeatureCard href="/weekly" icon="🎯" title="週進度" subtitle="本週目標" />
        <FeatureCard
          href={EXTERNAL_LINKS.pinxuetang}
          external
          icon="📕"
          title="品學堂"
          subtitle="閱讀素養"
        />
        <FeatureCard href="/achievements" icon="🏆" title="成就牆" subtitle="看徽章" />
        <FeatureCard href="/settings/tasks" icon="⚙️" title="打卡設定" subtitle="自訂清單" />
        <FeatureCard icon="📚" title="教材重點" soon />
        <FeatureCard icon="✏️" title="筆記" soon />
        <FeatureCard icon="💬" title="留言板" soon />
      </div>
    </AppShell>
  );
}

function FeatureCard({ href, icon, title, subtitle, soon, external }) {
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
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
