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
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">🏆 榮譽里程碑殿堂</h1>
        <p className="text-xs text-slate-500 mt-1">
          已擊破 <span className="font-bold text-blue-600">{unlockedCount}</span> / {ACHIEVEMENTS.length} 項里程碑挑戰
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = !!unlockedMap[a.key];

          // 根據徽章類型套用主題色
          let theme = {
            border: 'border-blue-200 hover:border-blue-400 bg-blue-50/20 shadow-blue-50/20',
            badge: 'bg-blue-600 text-white shadow-sm shadow-blue-200',
            text: 'text-blue-800'
          };
          if (a.key.startsWith('streak')) {
            theme = {
              border: 'border-orange-200 hover:border-orange-400 bg-orange-50/20 shadow-orange-50/20',
              badge: 'bg-orange-500 text-white shadow-sm shadow-orange-200',
              text: 'text-orange-800'
            };
          } else if (a.key.startsWith('mistakes') || a.key.startsWith('pin')) {
            theme = {
              border: 'border-sky-200 hover:border-sky-400 bg-sky-50/20 shadow-sky-50/20',
              badge: 'bg-sky-600 text-white shadow-sm shadow-sky-250',
              text: 'text-sky-800'
            };
          }

          return (
            <div
              key={a.key}
              className={`flex flex-col items-center rounded-2xl border-2 p-5 text-center transition-all duration-150 relative overflow-hidden ${
                got ? theme.border + ' shadow-md hover:-translate-y-0.5' : 'border-slate-200 bg-slate-50 border-dashed opacity-75'
              }`}
            >
              {/* 未解鎖的鎖頭裝飾 */}
              {!got && (
                <div className="absolute top-2 right-2 text-slate-300 text-xs font-bold flex items-center gap-0.5">
                  <span>🔒</span>
                </div>
              )}
              <span className={`text-4xl filter drop-shadow-sm transition-transform ${got ? 'scale-105' : 'opacity-25 grayscale'}`}>{a.emoji}</span>
              <span className={`mt-3 font-black text-sm sm:text-base ${got ? 'text-slate-800' : 'text-slate-400'}`}>
                {a.name}
              </span>
              <span className="mt-1 text-xs text-slate-400 font-medium leading-tight">{a.desc}</span>
              {got ? (
                <span className={`mt-3 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${theme.badge}`}>
                  已擊破
                </span>
              ) : (
                <span className="mt-3 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-400 tracking-wider">
                  未解鎖
                </span>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
