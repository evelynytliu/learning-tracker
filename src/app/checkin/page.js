import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CheckinForm from '../CheckinForm';
import AppShell from '@/components/AppShell';
import { toYMD } from '@/lib/date';

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

  const { data: row } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-6">
        <p className="text-sm text-slate-500">{today}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">今日打卡</h1>
      </header>

      <CheckinForm initialRow={row} userId={user.id} date={today} />
    </AppShell>
  );
}
