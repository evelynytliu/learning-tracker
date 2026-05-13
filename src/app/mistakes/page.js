import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function MistakesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('id, subject, description, reason, created_at, image_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">錯題本</h1>
        <Link
          href="/mistakes/new"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
          aria-label="新增錯題"
        >
          <Plus size={22} strokeWidth={3} />
        </Link>
      </header>

      {!mistakes?.length ? (
        <p className="mt-12 text-center text-sm text-gray-500">
          還沒有錯題。錯了不丟臉，記下來才會進步。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mistakes.map((m) => (
            <li key={m.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                  {m.subject}
                </span>
                <span>{new Date(m.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
              {m.description && (
                <p className="mt-2 text-sm line-clamp-2">{m.description}</p>
              )}
              <p className="mt-2 text-xs">
                <span className="text-gray-500">原因：</span>
                <span className="font-medium text-red-600">{m.reason}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <Nav role="student" />
    </main>
  );
}
