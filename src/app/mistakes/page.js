import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SUBJECT_COLORS } from '@/lib/utils';
import { toYMD } from '@/lib/date';
import AppShell from '@/components/AppShell';
import ReviewQueue from './ReviewQueue';

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

  // image_url 存的是 Storage 路徑（私有 bucket），要換成有時效的簽名網址才看得到
  const paths = (mistakes || []).filter((m) => m.image_url).map((m) => m.image_url);
  const signedMap = {};
  let imagesFailed = false;
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from('mistake-photos')
      .createSignedUrls(paths, 60 * 60);
    if (signError) {
      // 簽名失敗時列表照常顯示，只是看不到圖
      console.error('createSignedUrls failed:', signError);
      imagesFailed = true;
    }
    for (const s of signed ?? []) {
      if (s.signedUrl) signedMap[s.path] = s.signedUrl;
    }
  }

  // 今日待複習（間隔複習：登記後 3 天 → 7 天 → 14 天，連對 3 次精熟畢業）
  const today = toYMD();
  const due = (mistakes || []).filter(
    (m) => !m.mastered_at && m.next_review_date && m.next_review_date <= today,
  );
  const masteredCount = (mistakes || []).filter((m) => m.mastered_at).length;

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">📝 弱點特訓</h1>
        <Link
          href="/mistakes/new"
          className="btn btn-primary rounded-full px-4 py-2"
        >
          <Plus size={16} /> 新增
        </Link>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        共 {mistakes?.length || 0} 筆
        {masteredCount > 0 && <span className="text-amber-600">・⭐ 已精熟 {masteredCount} 題</span>}
        {due.length > 0 && <span className="font-bold text-indigo-600">・今天有 {due.length} 題待複習</span>}
      </p>

      <div className="mt-5">
        <ReviewQueue due={due} signedMap={signedMap} />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(mistakes || []).map((m) => {
          const isDue = !m.mastered_at && m.next_review_date && m.next_review_date <= today;
          return (
            <li key={m.id}>
              <div className="card h-full p-4">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ background: SUBJECT_COLORS[m.subject] || '#888' }}
                  >
                    {m.subject}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}
                  </span>
                </div>
                {m.description && (
                  <p className="mt-2 text-sm text-slate-700">{m.description}</p>
                )}
                {m.image_url && signedMap[m.image_url] && (
                  <img
                    src={signedMap[m.image_url]}
                    alt=""
                    className="mt-2 max-h-48 w-full rounded-lg object-cover"
                  />
                )}
                {m.image_url && !signedMap[m.image_url] && imagesFailed && (
                  <p className="mt-2 text-xs text-slate-400">圖片暫時載入失敗</p>
                )}
                <p className="mt-2 text-xs font-medium text-red-500">原因：{m.reason}</p>
                <p className="mt-1.5 text-[11px] font-bold">
                  {m.mastered_at ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <Star size={11} fill="currentColor" /> 已精熟
                    </span>
                  ) : isDue ? (
                    <span className="text-indigo-600">🔔 今天複習</span>
                  ) : m.next_review_date ? (
                    <span className="text-slate-400">下次複習 {m.next_review_date}・已連對 {m.review_count}/3</span>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {(!mistakes || mistakes.length === 0) && (
        <p className="mt-10 text-center text-sm text-slate-400">
          還沒有錯題，點右上角「新增」開始記錄
        </p>
      )}
    </AppShell>
  );
}
