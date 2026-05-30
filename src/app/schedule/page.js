import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ScheduleEditor from './ScheduleEditor';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
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

  const { data: rows } = await supabase
    .from('class_schedule')
    .select('*')
    .eq('user_id', user.id)
    .order('period', { ascending: true });

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">📅 我的課表</h1>
        <p className="text-sm text-slate-500">點日期切換，新增或編輯每天的課</p>
      </header>

      <ScheduleEditor
        userId={user.id}
        initial={rows ?? []}
        readOnly={profile?.role === 'parent'}
      />
    </AppShell>
  );
}
