import { redirect } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isCheckinComplete } from '@/lib/utils';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';

function computeStreak(rows) {
  // rows already sorted by date desc
  const byDate = new Map(rows.map((r) => [r.date, r]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const row = byDate.get(iso);
    if (isCheckinComplete(row)) streak++;
    else break;
  }
  return streak;
}

export default async function StreakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: rows } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: false });

  const streak = computeStreak(rows || []);

  // build 7x6 calendar grid for last 42 days
  const cells = [];
  const today = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const row = (rows || []).find((r) => r.date === iso);
    cells.push({ iso, done: isCheckinComplete(row), rest: !!row?.is_rest_day });
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-6">
      <h1 className="text-2xl font-bold">連續打卡</h1>

      <div className="mt-6 flex flex-col items-center rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 px-6 py-10 text-white shadow-lg">
        <Flame size={56} strokeWidth={2.2} />
        <p className="mt-3 text-6xl font-black">{streak}</p>
        <p className="mt-1 text-sm opacity-90">天連續達標</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-gray-600">最近 42 天</h2>
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
                : 'aspect-square rounded bg-gray-200'
            }
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        🟩 達標　🟧 免讀日　⬜ 未達標
      </p>

      <Nav role="student" />
    </main>
  );
}
