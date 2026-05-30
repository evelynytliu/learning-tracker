import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CheckinForm from '../CheckinForm';
import Nav from '@/components/Nav';
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
    <main className="mx-auto max-w-md px-5 pb-24 pt-8">
      <header className="mb-6">
        <p className="text-sm text-gray-500">{today}</p>
        <h1 className="mt-1 text-2xl font-bold">今日打卡</h1>
      </header>

      <CheckinForm initialRow={row} userId={user.id} date={today} />

      <Nav role={profile?.role} />
    </main>
  );
}
