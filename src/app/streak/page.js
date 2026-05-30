import { redirect } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isCheckinComplete } from '@/lib/utils';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

function computeStreak(rows) {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toLocaleDateString('en-CA');
    const row = byDate.get(iso);
    if (isCheckinComplete(row)) streak++;
    else break;
  }
  return streak;
}

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
    .select('*')
    .eq('user_id', user.id)
    .gte('date', since.toLocaleDateString('en-CA'))
    .order('date', { ascending: false });

  const streak = computeStreak(rows || []);

  // 最近 42 天日曆
  const cells = [];
  const today = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toLocaleDateString('en-CA');
    const row = (rows || []).find((r) => r.date === iso);
    cells.push({ iso, done: isCheckinComplete(row), rest: !!row?.is_rest_day });
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
