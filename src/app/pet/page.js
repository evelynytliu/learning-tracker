import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PetManager from './PetManager';
import { toYMD } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function PetPage() {
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

  if (profile?.role === 'parent') redirect('/dashboard');

  // 先對帳補發點數（idempotent），再讀餘額與寵物
  const { data: earned } = await supabase.rpc('award_points', {
    p_user_id: user.id,
    p_today: toYMD(),
  });
  const [{ data: balance }, { data: pets }] = await Promise.all([
    supabase.rpc('point_balance', { p_user_id: user.id }),
    supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <PetManager
        userId={user.id}
        initialBalance={balance ?? 0}
        initialPets={pets ?? []}
        earned={earned ?? 0}
      />
    </AppShell>
  );
}
