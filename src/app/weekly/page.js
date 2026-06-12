import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import WeeklyGoals from './WeeklyGoals';
import { toYMD, weekStart, weekStartYMD } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function WeeklyPage() {
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

  const wkStart = weekStartYMD();

  // 家長看的是學生的目標，不是自己的
  let targetId = user.id;
  if (profile?.role === 'parent') {
    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (student) targetId = student.id;
  }

  // ===== 週目標自動化（只在學生本人載入時執行；冪等）=====
  if (targetId === user.id && profile?.role !== 'parent') {
    const { count: existing } = await supabase
      .from('weekly_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetId)
      .eq('week_start', wkStart);

    if ((existing ?? 0) === 0) {
      // 本週第一次打開：依實際狀況生成目標
      const weekEnd = toYMD(new Date(new Date(`${wkStart}T00:00:00+08:00`).getTime() + 6 * 86400000));
      const [{ count: dueCount }, { count: courseCount }] = await Promise.all([
        supabase
          .from('mistakes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetId)
          .is('mastered_at', null)
          .lte('next_review_date', weekEnd),
        supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetId)
          .eq('archived', false),
      ]);
      const autoGoals = [];
      if ((dueCount ?? 0) > 0) {
        const t = Math.min(15, Math.max(3, dueCount));
        autoGoals.push({ title: `複習錯題 ${t} 題`, target: t, auto_key: 'reviews', sort_order: 0 });
      }
      if ((courseCount ?? 0) > 0) {
        autoGoals.push({ title: '看線上課程 3 集', target: 3, auto_key: 'course_units', sort_order: 1 });
      }
      autoGoals.push({ title: '完成 3 次專注時段', target: 3, auto_key: 'focus_sessions', sort_order: 2 });
      await supabase
        .from('weekly_goals')
        .insert(autoGoals.map((g) => ({ ...g, user_id: targetId, week_start: wkStart })));
    }

    // 自動目標的進度由系統同步（複習數 / 課程集數 / 專注次數）
    const weekTs = weekStart().toISOString();
    const [{ count: reviews }, { count: units }, { count: focusN }, { data: autoRows }] =
      await Promise.all([
        supabase
          .from('point_ledger')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetId)
          .eq('reason', '複習錯題')
          .gte('created_at', weekTs),
        supabase
          .from('course_progress')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetId)
          .gte('done_at', weekTs),
        supabase
          .from('focus_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetId)
          .gte('minutes', 15)
          .gte('started_at', weekTs),
        supabase
          .from('weekly_goals')
          .select('id, auto_key, progress')
          .eq('user_id', targetId)
          .eq('week_start', wkStart)
          .not('auto_key', 'is', null),
      ]);
    const actual = { reviews: reviews ?? 0, course_units: units ?? 0, focus_sessions: focusN ?? 0 };
    await Promise.all(
      (autoRows ?? [])
        .filter((g) => actual[g.auto_key] !== undefined && g.progress !== actual[g.auto_key])
        .map((g) =>
          supabase.from('weekly_goals').update({ progress: actual[g.auto_key] }).eq('id', g.id),
        ),
    );
  }

  const { data: goals } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', targetId)
    .eq('week_start', wkStart)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">🎯 本週目標</h1>
        <p className="text-sm text-slate-500">這週想完成什麼?設定後每天更新進度</p>
      </header>

      <WeeklyGoals
        userId={targetId}
        weekStart={wkStart}
        initial={goals ?? []}
        readOnly={profile?.role === 'parent'}
      />
    </AppShell>
  );
}
