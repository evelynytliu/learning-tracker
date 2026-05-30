import { redirect } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { toYMD } from '@/lib/date';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function StreakPage() {
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

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: rows } = await supabase
    .from('daily_checkins')
    .select('date, tasks_total, tasks_done, is_rest_day')
    .eq('user_id', user.id)
    .gte('date', toYMD(since))
    .order('date', { ascending: false });

  const today = toYMD();
  const streak = computeStreakFromSummary(rows || [], today);

  // 最近 42 天日曆
  const byDate = new Map((rows || []).map((r) => [r.date, r]));
  const cells = [];
  const now = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = toYMD(d);
    const row = byDate.get(iso);
    cells.push({ iso, done: isDayComplete(row), rest: !!row?.is_rest_day });
  }

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <h1 className="text-2xl font-bold text-slate-800">連續打卡</h1>

      <div className="mt-6 flex flex-col items-center rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 px-6 py-10 text-white shadow-lg">
        <Flame size={56} strokeWidth={2.2} />
        <p className="mt-3 text-6xl font-black">{streak}</p>
        <p className="mt-1 text-sm opacity-90">天連續達標</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-600">最近 42 天</h2>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <div
            key={c.iso}
            title={c.iso}
            className={
              c.done
                ? 'aspect-square rounded bg-green-500'
                : c.rest
                ? 'aspect-square rounded bg-amber-300'
                : 'aspect-square rounded bg-slate-200'
            }
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">🟩 達標　🟧 免讀日　⬜ 未達標</p>
    </AppShell>
  );
}
