import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import WeeklyGoals from './WeeklyGoals';
import { weekStartYMD } from '@/lib/date';

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
