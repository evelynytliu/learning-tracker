import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MiniCalendar from '@/components/MiniCalendar';
import { toYMD, weekStart, weekStartYMD, isoDayOfWeek, DAY_LABELS } from '@/lib/date';
import { EXTERNAL_LINKS } from '@/lib/links';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';
import { PETS, stageFromGrowth, stageProgress, nextThreshold, MAX_STAGE } from '@/lib/pets';
import PetSprite from '@/components/PetSprite';

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
    { count: courseUnitsWeek },
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
      .select('id, title, event_date, end_date, start_time, end_time')
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
    supabase
      .from('course_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('done_at', weekStart().toISOString()),
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
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) ||
        (a.start_time || '').localeCompare(b.start_time || ''),
    )
    .slice(0, 4);

  // 寵物 + 點數：先對帳補發，再讀餘額與目前正在養的寵物
  await supabase.rpc('award_points', { p_user_id: user.id, p_today: today });
  const [{ data: balanceVal }, { data: activePet }] = await Promise.all([
    supabase.rpc('point_balance', { p_user_id: user.id }),
    supabase
      .from('pets')
      .select('species, growth')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const balance = balanceVal ?? 0;
  const petDef = activePet ? PETS[activePet.species] : null;
  const petStage = activePet ? stageFromGrowth(activePet.growth) : 0;
  const petPct = activePet ? Math.round(stageProgress(activePet.growth) * 100) : 0;
  const petNext = activePet ? nextThreshold(activePet.growth) : null;

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>⚡ 挑戰者 {profile?.display_name}</span>
            <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 font-black border border-blue-200">LV.{streak}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            準備好今天的挑戰了嗎？擊破任務，累積你的連勝紀錄！
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="inline-block rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
            📅 {today}（{DAY_LABELS[dow - 1]}）
          </span>
        </div>
      </header>

      {/* 寵物養成（明顯置頂，顯示目前樣子）*/}
      <Link
        href="/pet"
        className="group mb-4 flex items-center gap-4 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md sm:gap-5 sm:p-5"
      >
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white/70 shadow-inner overflow-hidden sm:h-24 sm:w-24">
          {activePet ? (
            <PetSprite species={activePet.species} stage={petStage} size="md" />
          ) : (
            <span className="text-5xl animate-float drop-shadow-sm sm:text-6xl">🥚</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600">我的寵物</span>
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[11px] font-black text-white">
              🪙 {balance}
            </span>
          </div>
          {petDef ? (
            <>
              <p className="mt-0.5 truncate text-lg font-black text-slate-800">
                {petDef.name}
                <span className="ml-1.5 text-xs font-bold text-slate-400">
                  {petDef.stages[petStage].name}・階段 {petStage + 1}/{MAX_STAGE + 1}
                </span>
              </p>
              {petStage >= MAX_STAGE ? (
                <p className="mt-1.5 text-xs font-black text-amber-600">🏆 已經完全長大了！</p>
              ) : (
                <div className="mt-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                      style={{ width: `${petPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    成長 {activePet.growth} / 下一階段 {petNext}　·　用點數餵牠 →
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-0.5 text-sm font-bold text-slate-600">
              還沒有夥伴！點我去
              <span className="text-emerald-600">領養一隻</span>
              ，用學習點數養大牠 🌱
            </p>
          )}
        </div>
        <span className="hidden flex-shrink-0 text-sm font-black text-emerald-600 transition group-hover:translate-x-1 sm:block">
          去照顧 →
        </span>
      </Link>

      {/* 第一排：今日任務 (XP) + 連勝火焰 + 每週挑戰 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/checkin"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-5 text-white shadow-md shadow-blue-100 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 transition-all duration-150 sm:col-span-2 group"
        >
          {/* 微妙的斜條紋運動背景 */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-15 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded text-blue-100">今日任務 XP</span>
            <span className="text-sm font-black bg-blue-800/50 px-2.5 py-0.5 rounded-full">{doneCount}/{total || '—'}</span>
          </div>
          <div className="mt-3 text-2xl font-black relative z-10 flex items-center gap-1.5">
            {total > 0 && doneCount >= total ? (
              <span>任務全數擊破！🏆</span>
            ) : (
              <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1">
                開始今日挑戰 <span className="text-yellow-300">⚡</span>
              </span>
            )}
          </div>
          <div className="mt-4 relative z-10">
            <div className="h-3 w-full overflow-hidden rounded-full bg-blue-900/40 p-0.5 border border-blue-400/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-inner transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </Link>

        <Link
          href="/streak"
          className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-5 text-white shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded self-start">
            連勝紀錄
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight">🔥 {streak}</span>
            <span className="text-sm font-bold opacity-90">天連勝</span>
          </div>
          <span className="text-[10px] opacity-80 mt-1 block font-medium">保持連勝以解鎖榮譽勳章！</span>
        </Link>

        <Link
          href="/weekly"
          className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
        >
          <div className="text-xs font-bold text-slate-400 tracking-wider">每週挑戰進度</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-800 tracking-tight">{goalsDone}</span>
            <span className="text-sm font-bold text-slate-400">/{goalsTotal || 0} 項</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
            本週已完成：{goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : 0}%
          </span>
        </Link>
      </div>

      {/* 日程地圖 + 即將到來 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-black text-slate-800 flex items-center gap-1.5">📆 日程地圖</span>
            <Link href="/calendar" className="text-xs font-bold text-blue-600 hover:underline">管理日程 →</Link>
          </div>
          <MiniCalendar events={events ?? []} doneDates={doneDates} todayStr={today} compact />
          <p className="mt-3 text-xs text-slate-400 font-medium">· 🟩 綠點 = 挑戰成功　· 🟧 黃點 = 有特殊行程</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 transition-colors flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-black text-slate-800 flex items-center gap-1.5">🗓️ 戰前預告</span>
              <Link href="/calendar" className="text-xs font-bold text-blue-600 hover:underline">新增日程 →</Link>
            </div>
            {upcoming.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                      {e.event_date.slice(5)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-slate-700">{e.title}</span>
                      {e.start_time && (
                        <span className="ml-2 whitespace-nowrap text-xs font-semibold text-blue-500">
                          🕒 {e.start_time.slice(0, 5)}{e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center font-medium">目前沒有登記行程，點擊右上角新增挑戰預告</p>
            )}
          </div>
        </div>
      </div>

      {/* 待擊破作業 */}
      {assignmentsLeft.length > 0 && (
        <Link href="/assignments" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all duration-150">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-black text-slate-800 flex items-center gap-1.5">📋 待擊破任務 ({assignmentsLeft.length})</span>
            <span className="text-xs text-blue-600 font-bold">進入清單 →</span>
          </div>
          <ul className="flex flex-col gap-2">
            {assignmentsLeft.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-bold text-slate-700">{a.title}</span>
                </div>
                {a.due_date && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md">截止 {a.due_date}</span>}
              </li>
            ))}
          </ul>
        </Link>
      )}

      {/* 榮譽勳章 */}
      <Link href="/achievements" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all duration-150">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-black text-slate-800 flex items-center gap-1.5">🏆 榮譽勳章</span>
          <span className="text-xs text-blue-600 font-bold">進入成就殿堂 →</span>
        </div>
        {badges.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {badges.map((b) => (
              <div key={b.key} className="flex flex-col items-center min-w-[70px] bg-slate-50 border border-slate-100 p-2.5 rounded-2xl relative group" title={b.desc}>
                <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{b.emoji}</span>
                <span className="mt-1.5 text-[11px] font-black text-slate-700 truncate max-w-[65px]">{b.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">尚未獲得勳章，完成每日挑戰解鎖吧！</p>
        )}
      </Link>

      {/* 今日訓練日程 */}
      <Link href="/schedule" className="mt-4 block rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all duration-150">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-black text-slate-800 flex items-center gap-1.5">📅 今日訓練日程</span>
          <span className="text-xs text-blue-600 font-bold">查看完整訓練表 →</span>
        </div>
        {todayClasses && todayClasses.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {todayClasses.slice(0, 8).map((c) => (
              <li key={c.period} className="flex items-center gap-3 text-sm bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs">{c.period}</span>
                <span className="font-extrabold text-slate-800 flex-1">{c.subject}</span>
                {c.start_time && <span className="text-xs text-slate-400 font-semibold">{c.start_time.slice(0, 5)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 font-medium py-2">今天沒有排定課表訓練，點此去設定</p>
        )}
      </Link>

      {/* 所有冒險模組 */}
      <h2 className="mb-3 mt-8 text-xs font-black text-slate-400 tracking-widest uppercase">冒險功能模組</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FeatureCard href="/courses" icon="🎓" title="線上課程" subtitle={`本週看了 ${courseUnitsWeek ?? 0} 集`} />
        <FeatureCard href="/assignments" icon="📋" title="任務挑戰" subtitle={`待擊破 ${assignmentsLeft.length}`} />
        <FeatureCard href="/reading" icon="📖" title="傳奇書庫" subtitle={`已讀完 ${booksRead ?? 0} 本`} />
        <FeatureCard href="/calendar" icon="📆" title="日程地圖" subtitle="日程與行程" />
        <FeatureCard href="/mistakes" icon="📝" title="弱點特訓" subtitle={`已收集 ${mistakeCount ?? 0} 筆`} />
        <FeatureCard href="/streak" icon="🔥" title="連勝火焰" subtitle="看連勝紀錄" />
        <FeatureCard href="/pet" icon="🌱" title="寵物養成" subtitle="養大你的夥伴" />
        <FeatureCard href="/schedule" icon="📅" title="訓練日程" subtitle="日常課表配置" />
        <FeatureCard href="/weekly" icon="🎯" title="每週挑戰" subtitle="本週標靶進度" />
        <FeatureCard
          href={EXTERNAL_LINKS.pinxuetang}
          external
          icon="📕"
          title="品學堂"
          subtitle="線上閱讀素養"
        />
        <FeatureCard href="/achievements" icon="🏆" title="榮譽勳章" subtitle="看成就徽章" />
        <FeatureCard href="/notes" icon="✏️" title="冒險隨筆" subtitle="挑戰隨手筆記" />
        <FeatureCard href="/messages" icon="💬" title="通訊終端" subtitle="親子留言聯絡" />
        <FeatureCard href="/settings/tasks" icon="⚙️" title="任務設定" subtitle="自訂挑戰清單" />
        <FeatureCard icon="📚" title="教材重點" soon />
      </div>
    </AppShell>
  );
}

function FeatureCard({ href, icon, title, subtitle, soon, external }) {
  const inner = (
    <div
      className={`flex h-full flex-col rounded-2xl border p-4 transition-all duration-150 relative overflow-hidden group ${
        soon
          ? 'border-dashed border-slate-200 bg-slate-100/40 text-slate-400'
          : 'border-slate-200 bg-white hover:border-blue-500 hover:shadow-md hover:shadow-blue-50/30 hover:-translate-y-0.5'
      }`}
    >
      {!soon && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <span className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 group-hover:scale-105 transition-transform ${soon ? 'opacity-50' : 'bg-blue-50/50'}`}>
        {icon}
      </span>
      <span className={`mt-3 font-extrabold text-sm sm:text-base ${soon ? 'text-slate-400' : 'text-slate-800'}`}>
        {title}
      </span>
      <span className="text-[10px] text-slate-400 mt-1 font-bold">{soon ? '即將推出' : subtitle}</span>
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
