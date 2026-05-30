import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import TaskSettings from './TaskSettings';

export const dynamic = 'force-dynamic';

export default async function TaskSettingsPage() {
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

  // 家長編輯學生的清單；學生編輯自己的
  let targetId = user.id;
  if (profile?.role === 'parent') {
    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .limit(1)
      .maybeSingle();
    if (student) targetId = student.id;
  }

  const [{ data: sets }, { data: tasks }, { data: periods }] = await Promise.all([
    supabase
      .from('task_sets')
      .select('id, name, weekdays, sort_order')
      .eq('user_id', targetId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, set_id, label, hint, sort_order')
      .eq('user_id', targetId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('special_periods')
      .select('id, name, task_set_id, start_date, end_date, weekdays')
      .eq('user_id', targetId)
      .order('start_date', { ascending: true }),
  ]);

  const tasksBySet = {};
  for (const t of tasks ?? []) (tasksBySet[t.set_id] ||= []).push(t);
  const setsWithTasks = (sets ?? []).map((s) => ({ ...s, tasks: tasksBySet[s.id] ?? [] }));

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">⚙️ 打卡清單設定</h1>
        <p className="text-sm text-slate-500">
          設定平日、假日、暑假等不同清單，系統會依星期或特殊期間自動套用
        </p>
      </header>

      <TaskSettings
        userId={targetId}
        initialSets={setsWithTasks}
        initialPeriods={periods ?? []}
      />
    </AppShell>
  );
}
