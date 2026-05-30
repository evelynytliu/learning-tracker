import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SUBJECT_COLORS } from '@/lib/utils';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function MistakesPage() {
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

  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">錯題本</h1>
        <Link
          href="/mistakes/new"
          className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> 新增
        </Link>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        共 {mistakes?.length || 0} 筆・點任一筆看原因
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(mistakes || []).map((m) => (
          <li key={m.id}>
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ background: SUBJECT_COLORS[m.subject] || '#888' }}
                >
                  {m.subject}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              {m.description && (
                <p className="mt-2 text-sm text-slate-700">{m.description}</p>
              )}
              {m.image_url && (
                <img
                  src={m.image_url}
                  alt=""
                  className="mt-2 max-h-48 w-full rounded-lg object-cover"
                />
              )}
              <p className="mt-2 text-xs font-medium text-red-500">原因：{m.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      {(!mistakes || mistakes.length === 0) && (
        <p className="mt-10 text-center text-sm text-slate-400">
          還沒有錯題，點右上角「新增」開始記錄
        </p>
      )}
    </AppShell>
  );
}
