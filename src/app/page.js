import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Coins } from 'lucide-react';
import AppShell from '@/components/AppShell';
import MiniCalendar from '@/components/MiniCalendar';
import { toYMD, weekStart, weekStartYMD, isoDayOfWeek, DAY_LABELS } from '@/lib/date';
import { EXTERNAL_LINKS } from '@/lib/links';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { loadDayCheckin } from '@/lib/checkin-data';
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
    { count: dueReviews },
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
      .select('id, title, event_date, end_date, start_time, end_time, is_exam, exam_subjects')
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
    supabase
      .from('mistakes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('mastered_at', null)
      .lte('next_review_date', today),
  ]);

  // 今天實際要做的清單（套用暑假平日/假日等規則），首頁一進來就看到待完成項目
  const todayPlan = await loadDayCheckin(supabase, user.id, today);
  const todayPending = todayPlan.tasks.filter((t) => !todayPlan.doneMap[t.id]);

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

  // 下一場段考（21 天內顯示倒數；7 天內進入衝刺模式）
  const nextExam = (events ?? [])
    .filter((e) => e.is_exam && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const examDays = nextExam
    ? Math.round(
        (new Date(`${nextExam.event_date}T00:00:00+08:00`) - new Date(`${today}T00:00:00+08:00`)) /
          86400000,
      )
    : null;

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

  const allDone = total > 0 && doneCount >= total;

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      {/* 標題 */}
      <header className="mb-5">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
          <span>⚡ 挑戰者 {profile?.display_name}</span>
          <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-700">
            LV.{streak}
          </span>
        </h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          📅 {today}（{DAY_LABELS[dow - 1]}）・先看「今天要做什麼」，做完就去打卡 ⚡
        </p>
      </header>

      {/* ───────── ① 今天任務中心（主角，放大置頂）───────── */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-md">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black">
              📌 今天要做什麼
              {todayPlan.setName && (
                <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                  {todayPlan.setName}
                </span>
              )}
            </h2>
            <span className="rounded-full bg-blue-900/40 px-3 py-0.5 text-sm font-black">
              {doneCount}/{total || '—'}
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-blue-400/20 bg-blue-900/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="p-5">
          {todayPlan.isRest ? (
            <p className="py-4 text-center text-sm font-bold text-slate-500">😌 今天是免讀日，好好休息！</p>
          ) : todayPlan.tasks.length === 0 ? (
            <p className="py-4 text-center text-sm font-medium text-slate-400">
              還沒設定今天的清單，
              <Link href="/settings/tasks" className="font-bold text-blue-600">
                去設定 →
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayPlan.tasks.map((t) => {
                const done = !!todayPlan.doneMap[t.id];
                return (
                  <li
                    key={t.id}
                    className={`flex items-start gap-3 rounded-xl border p-2.5 ${
                      done ? 'border-slate-100 bg-slate-50/40' : 'border-blue-100 bg-blue-50/40'
                    }`}
                  >
                    <span className="mt-0.5 text-lg leading-none">{done ? '✅' : '⬜'}</span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm font-bold ${
                          done ? 'text-slate-400 line-through' : 'text-slate-800'
                        }`}
                      >
                        {t.label}
                      </span>
                      {t.hint && (
                        <span
                          className={`mt-0.5 block text-[11px] font-medium ${
                            done ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {t.hint}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 今日時間表（從課表抓今天的時段，一行帶過）*/}
          {todayClasses && todayClasses.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
              <span className="text-slate-400">⏰ 今日時間</span>
              {todayClasses.map((c) => (
                <span key={c.period}>
                  {c.start_time ? c.start_time.slice(0, 5) + ' ' : ''}
                  {c.subject}
                </span>
              ))}
            </div>
          )}

          {/* 真有急事才跳出來 */}
          {(dueReviews > 0 || assignmentsLeft.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dueReviews > 0 && (
                <Link
                  href="/mistakes"
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
                >
                  🔔 錯題 {dueReviews} 題待複習
                </Link>
              )}
              {assignmentsLeft.length > 0 && (
                <Link
                  href="/assignments"
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600"
                >
                  📋 {assignmentsLeft.length} 項作業待繳
                </Link>
              )}
            </div>
          )}

          <Link
            href="/checkin"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 font-black text-white shadow-sm transition hover:shadow-md hover:brightness-105"
          >
            {allDone ? '今天的挑戰完成了！再看一次 🏆' : `去打卡完成今天（還剩 ${todayPending.length} 項）→`}
          </Link>
        </div>
      </section>

      {/* ───────── ② 我的養成（寵物＋連勝，保持明顯）───────── */}
      <div className="mb-3 grid gap-4 lg:grid-cols-3">
        <Link
          href="/pet"
          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md sm:gap-5 lg:col-span-2"
        >
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/70 shadow-inner sm:h-24 sm:w-24">
            {activePet ? (
              <PetSprite species={activePet.species} stage={petStage} size="md" />
            ) : (
              <span className="animate-float text-5xl drop-shadow-sm sm:text-6xl">🥚</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600">我的寵物</span>
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[11px] font-black text-white">
                <Coins size={12} strokeWidth={2.5} /> {balance}
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
                還沒有夥伴！點我去<span className="text-emerald-600">領養一隻</span>，用學習點數養大牠 🌱
              </p>
            )}
          </div>
        </Link>

        <Link
          href="/streak"
          className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-5 text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="self-start rounded bg-white/20 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest">
            連勝紀錄
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight">🔥 {streak}</span>
            <span className="text-sm font-bold opacity-90">天連勝</span>
          </div>
          <span className="mt-1 block text-[10px] font-medium opacity-80">保持連勝以解鎖榮譽勳章！</span>
        </Link>
      </div>

      {/* ③ 狀態小排：點數 · 本週目標 · 最新勳章 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Link
          href="/pet"
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-center transition hover:shadow-sm"
        >
          <div className="text-xl font-black text-amber-600">🪙 {balance}</div>
          <div className="text-[10px] font-bold text-slate-400">學習點數</div>
        </Link>
        <Link
          href="/weekly"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:shadow-sm"
        >
          <div className="text-xl font-black text-slate-800">
            🎯 {goalsDone}/{goalsTotal || 0}
          </div>
          <div className="text-[10px] font-bold text-slate-400">本週目標</div>
        </Link>
        <Link
          href="/achievements"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-center transition hover:shadow-sm"
        >
          <div className="text-xl font-black text-slate-800">
            {badges.length > 0 ? badges[0].emoji : '🏅'} {badges.length}
          </div>
          <div className="text-[10px] font-bold text-slate-400">已得勳章</div>
        </Link>
      </div>

      {/* ④ 段考倒數（只在 21 天內出現）*/}
      {nextExam && examDays !== null && examDays <= 21 && (
        <Link
          href={examDays <= 7 ? '/mistakes' : '/calendar'}
          className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            examDays <= 7
              ? 'border-rose-200 bg-gradient-to-r from-rose-50 via-orange-50 to-white'
              : 'border-amber-200 bg-gradient-to-r from-amber-50 to-white'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-xs font-black uppercase tracking-widest ${
                examDays <= 7 ? 'text-rose-500' : 'text-amber-600'
              }`}
            >
              {examDays <= 7 ? '🔥 衝刺模式啟動' : '⏳ 段考倒數'}
            </p>
            <p className="mt-0.5 truncate text-lg font-black text-slate-800">
              {nextExam.title}
              {nextExam.exam_subjects?.length > 0 && (
                <span className="ml-1.5 text-xs font-bold text-slate-400">
                  {nextExam.exam_subjects.join('・')}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {examDays <= 7 ? '該科錯題已全部排入今日複習，每天清一輪！→' : '提早準備，每天複習一點點就好'}
            </p>
          </div>
          <div
            className={`flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md ${
              examDays <= 7
                ? 'bg-gradient-to-br from-rose-500 to-orange-500'
                : 'bg-gradient-to-br from-amber-400 to-orange-400'
            }`}
          >
            <span className="text-2xl font-black leading-none">{examDays}</span>
            <span className="text-[10px] font-bold opacity-90">天</span>
          </div>
        </Link>
      )}

      {/* ⑤ 行事曆：日程地圖 + 戰前預告 */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-black text-slate-800">📆 日程地圖</span>
            <Link href="/calendar" className="text-xs font-bold text-blue-600 hover:underline">
              管理日程 →
            </Link>
          </div>
          <MiniCalendar events={events ?? []} doneDates={doneDates} todayStr={today} compact />
          <p className="mt-3 text-xs font-medium text-slate-400">· 🟩 綠點 = 挑戰成功　· 彩色點 = 有行程（紅＝段考）</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-black text-slate-800">🗓️ 戰前預告</span>
            <Link href="/calendar" className="text-xs font-bold text-blue-600 hover:underline">
              新增日程 →
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {upcoming.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm"
                >
                  <span className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                    {e.event_date.slice(5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-slate-700">{e.title}</span>
                    {e.start_time && (
                      <span className="ml-2 whitespace-nowrap text-xs font-semibold text-blue-500">
                        🕒 {e.start_time.slice(0, 5)}
                        {e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs font-medium text-slate-400">
              目前沒有登記行程，點右上角新增挑戰預告
            </p>
          )}
        </div>
      </div>

      {/* ───────── ⑥ 要看資料去哪裡（分組導航）───────── */}
      <NavSection title="📚 學習紀錄" subtitle="進度、複習、讀過什麼">
        <FeatureCard
          href="/courses"
          icon="🎓"
          title="線上課程"
          subtitle={`本週看了 ${courseUnitsWeek ?? 0} 集`}
        />
        <FeatureCard
          href="/mistakes"
          icon="📝"
          title="弱點特訓"
          subtitle={dueReviews > 0 ? `🔔 ${dueReviews} 題待複習！` : `已收集 ${mistakeCount ?? 0} 筆`}
        />
        <FeatureCard href="/reading" icon="📖" title="傳奇書庫" subtitle={`已讀完 ${booksRead ?? 0} 本`} />
        <FeatureCard href="/notes" icon="✏️" title="冒險隨筆" subtitle="挑戰隨手筆記" />
        <FeatureCard href={EXTERNAL_LINKS.pinxuetang} external icon="📕" title="品學堂" subtitle="線上閱讀素養" />
      </NavSection>

      <NavSection title="🗓️ 行程規劃" subtitle="今天 / 這週要做什麼">
        <FeatureCard href="/checkin" icon="✅" title="每日挑戰" subtitle="今天的打卡清單" />
        <FeatureCard href="/schedule" icon="📅" title="訓練日程" subtitle="一週作息課表" />
        <FeatureCard href="/weekly" icon="🎯" title="每週挑戰" subtitle={`本週 ${goalsDone}/${goalsTotal || 0}`} />
        <FeatureCard href="/calendar" icon="📆" title="日程地圖" subtitle="行事曆與行程" />
        <FeatureCard href="/focus" icon="⏱️" title="專注時間" subtitle="番茄鐘計時" />
      </NavSection>

      <NavSection title="🏆 獎勵與聯絡" subtitle="養成、成就、留言">
        <FeatureCard href="/pet" icon="🌱" title="寵物養成" subtitle="養大你的夥伴" />
        <FeatureCard href="/streak" icon="🔥" title="連勝火焰" subtitle={`${streak} 天連勝`} />
        <FeatureCard href="/achievements" icon="🏆" title="榮譽勳章" subtitle={`已得 ${badges.length} 枚`} />
        <FeatureCard href="/messages" icon="💬" title="通訊終端" subtitle="親子留言聯絡" />
        <FeatureCard href="/settings/tasks" icon="⚙️" title="任務設定" subtitle="自訂挑戰清單" />
      </NavSection>
    </AppShell>
  );
}

function NavSection({ title, subtitle, children }) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-baseline gap-2">
        <h2 className="text-sm font-black tracking-wide text-slate-700">{title}</h2>
        {subtitle && <span className="text-[11px] font-medium text-slate-400">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
    </section>
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
      <span
        className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 group-hover:scale-105 transition-transform ${
          soon ? 'opacity-50' : 'bg-blue-50/50'
        }`}
      >
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
