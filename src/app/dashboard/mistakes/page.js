import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUBJECT_COLORS } from '@/lib/utils';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function ParentMistakesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <AppShell role="parent" email={user.email}>
        <p className="text-slate-500">尚未建立學生帳號。</p>
      </AppShell>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('id, subject, description, reason, created_at, image_url')
    .eq('user_id', student.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  return (
    <AppShell role="parent" email={user.email}>
      <h1 className="text-2xl font-bold text-slate-800">錯題列表</h1>
      <p className="text-sm text-slate-500">{student.display_name}・近 30 天</p>

      {!mistakes?.length ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          近 30 天沒有錯題記錄
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mistakes.map((m) => (
            <li key={m.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="rounded-full px-2.5 py-0.5 font-semibold text-white"
                  style={{ background: SUBJECT_COLORS[m.subject] || '#888' }}
                >
                  {m.subject}
                </span>
                <span className="text-slate-500">
                  {new Date(m.created_at).toLocaleString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {m.description && <p className="mt-2 text-sm text-slate-700">{m.description}</p>}
              <p className="mt-2 text-xs">
                <span className="text-slate-500">原因：</span>
                <span className="font-medium text-red-600">{m.reason}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
