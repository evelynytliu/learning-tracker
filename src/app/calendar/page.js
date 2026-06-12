import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import CalendarManager from './CalendarManager';
import { toYMD } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
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

  // 家長看學生的行事曆；學生看自己的
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

  const since = new Date();
  since.setMonth(since.getMonth() - 2);

  const [{ data: events }, { data: checkins }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('id, title, event_date, end_date, start_time, end_time, note, color, is_exam, exam_subjects')
      .eq('user_id', targetId)
      .order('event_date', { ascending: true }),
    supabase
      .from('daily_checkins')
      .select('date, tasks_total, tasks_done')
      .eq('user_id', targetId)
      .gte('date', toYMD(since)),
  ]);

  // 全勾的日期（完成打卡）
  const doneDates = (checkins ?? [])
    .filter((c) => c.tasks_total > 0 && c.tasks_done >= c.tasks_total)
    .map((c) => c.date);

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">📆 行事曆</h1>
        <p className="text-sm text-slate-500">登記行程、看每天打卡是否完成</p>
      </header>

      <CalendarManager
        userId={targetId}
        initialEvents={events ?? []}
        doneDates={doneDates}
        todayStr={toYMD()}
        canEdit={true}
      />
    </AppShell>
  );
}
