import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MessageBoard from './MessageBoard';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
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

  // 留言板綁定某個學生；家長看第一個學生的板，學生看自己的
  let studentId = user.id;
  if (profile?.role === 'parent') {
    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .limit(1)
      .maybeSingle();
    if (student) studentId = student.id;
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">💬 留言板</h1>
        <p className="text-sm text-slate-500">爸媽和你的悄悄話、鼓勵與提醒</p>
      </header>

      <MessageBoard
        studentId={studentId}
        me={{ id: user.id, name: profile?.display_name || '我', role: profile?.role || 'student' }}
        initial={messages ?? []}
      />
    </AppShell>
  );
}
