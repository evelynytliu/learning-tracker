import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CheckinForm from '../CheckinForm';
import AppShell from '@/components/AppShell';
import { toYMD, weekStartYMD } from '@/lib/date';
import { loadDayCheckin } from '@/lib/checkin-data';

export const dynamic = 'force-dynamic';

export default async function CheckinPage() {
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

  const today = toYMD();
  const day = await loadDayCheckin(supabase, user.id, today);

  // 本週（不含今天）已用掉的免讀日次數——一週只能用一次
  const { count: restUsed } = await supabase
    .from('daily_checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_rest_day', true)
    .gte('date', weekStartYMD())
    .neq('date', today);

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-6">
        <p className="text-xs text-slate-400 font-bold">{today}</p>
        <h1 className="mt-1 text-2xl font-black text-slate-800">每日挑戰</h1>
      </header>

      <CheckinForm
        userId={user.id}
        date={today}
        setName={day.setName}
        tasks={day.tasks}
        bonusTasks={day.bonusTasks}
        initialDone={day.doneMap}
        initialRest={day.isRest}
        restUsedThisWeek={restUsed ?? 0}
      />
    </AppShell>
  );
}
