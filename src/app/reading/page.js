import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ReadingLog from './ReadingLog';

export const dynamic = 'force-dynamic';

export default async function ReadingPage() {
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
      .limit(1)
      .maybeSingle();
    if (student) targetId = student.id;
  }

  const { data: books } = await supabase
    .from('reading_log')
    .select('*')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false });

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">📖 課外閱讀</h1>
        <p className="text-sm text-slate-500">讀過的書記下來，看著書櫃長大</p>
      </header>

      <ReadingLog
        userId={targetId}
        initial={books ?? []}
        readOnly={profile?.role === 'parent'}
      />
    </AppShell>
  );
}
