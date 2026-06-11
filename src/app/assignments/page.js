import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Assignments from './Assignments';

export const dynamic = 'force-dynamic';

export default async function AssignmentsPage() {
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

  const { data: items } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', targetId)
    .order('done', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true });

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">📋 作業 / 暑假作業</h1>
        <p className="text-sm text-slate-500">學校交代的長期作業，做完打勾</p>
      </header>

      <Assignments userId={targetId} initial={items ?? []} canEdit={true} />
    </AppShell>
  );
}
