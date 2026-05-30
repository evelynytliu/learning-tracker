import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
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
    .single();

  const { data: rows } = await supabase
    .from('class_schedule')
    .select('*')
    .eq('user_id', user.id)
    .order('period', { ascending: true });

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">📅 我的課表</h1>
        <p className="text-sm text-gray-500">點日期切換，新增或編輯每天的課</p>
      </header>

      <ScheduleEditor userId={user.id} initial={rows ?? []} readOnly={profile?.role === 'parent'} />

      <Nav role={profile?.role} />
    </main>
  );
}
