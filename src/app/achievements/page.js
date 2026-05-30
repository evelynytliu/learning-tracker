import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ACHIEVEMENTS } from '@/lib/achievements';

export const dynamic = 'force-dynamic';

export default async function AchievementsPage() {
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

  // 家長看學生的成就；學生看自己的
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

  const { data: unlocked } = await supabase
    .from('user_achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', targetId);

  const unlockedMap = Object.fromEntries(
    (unlocked ?? []).map((u) => [u.achievement_key, u.unlocked_at]),
  );
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedMap[a.key]).length;

  return (
    <AppShell role={profile?.role ?? 'student'} email={user.email} displayName={profile?.display_name}>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">🏆 成就牆</h1>
        <p className="text-sm text-slate-500">
          已解鎖 {unlockedCount} / {ACHIEVEMENTS.length} 個徽章
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = !!unlockedMap[a.key];
          return (
            <div
              key={a.key}
              className={`flex flex-col items-center rounded-2xl border p-5 text-center transition ${
                got ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className={`text-4xl ${got ? '' : 'opacity-25 grayscale'}`}>{a.emoji}</span>
              <span className={`mt-2 font-bold ${got ? 'text-slate-800' : 'text-slate-400'}`}>
                {a.name}
              </span>
              <span className="mt-0.5 text-xs text-slate-400">{a.desc}</span>
              {got && (
                <span className="mt-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  已解鎖
                </span>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
