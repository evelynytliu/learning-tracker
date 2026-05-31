import { redirect } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isDayComplete, computeStreakFromSummary } from '@/lib/streak';
import { toYMD } from '@/lib/date';
import AppShell from '@/components/AppShell';

import { cn } from '@/lib/utils';

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

  let title = "挑戰新手 ⚡";
  if (streak >= 100) title = "🔥 百日傳奇王";
  else if (streak >= 30) title = "⭐ 堅毅大宗師";
  else if (streak >= 7) title = "🏆 狂熱鐵粉者";
  else if (streak >= 3) title = "🏃 起步先鋒者";

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">連勝火焰紀錄</h1>
        <p className="text-xs text-slate-500 mt-1">挑戰自我，保持連勝火種不熄滅！</p>
      </header>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 px-6 py-10 text-white shadow-lg flex flex-col items-center">
        {/* 斜條紋背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-30 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <Flame size={64} className="text-white filter drop-shadow-md animate-bounce" strokeWidth={2.5} />
          <p className="mt-4 text-7xl font-black tracking-tight">{streak}</p>
          <p className="mt-2 text-sm font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-orange-50">
            {title}
          </p>
          <p className="mt-1.5 text-xs opacity-80">天連續任務擊破</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 tracking-wider">最近 42 天里程碑地圖</h2>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {cells.map((c) => (
            <div
              key={c.iso}
              title={c.iso}
              className={cn(
                'aspect-square rounded-xl transition-all duration-150 relative flex items-center justify-center text-[10px] font-bold shadow-sm',
                c.done
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                  : c.rest
                  ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              )}
            >
              {c.iso.slice(8)}
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-4 justify-center text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-lg bg-emerald-500 ring-2 ring-emerald-100" />
            <span>任務擊破</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-lg bg-orange-500 ring-2 ring-orange-100" />
            <span>免戰補給</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-lg bg-slate-100 border border-slate-200" />
            <span>未啟動 / 失敗</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
