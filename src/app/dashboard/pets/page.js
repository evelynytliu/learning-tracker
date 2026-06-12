import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import PetSprite from '@/components/PetSprite';
import { PETS, STAGE_THRESHOLDS, stageFromGrowth } from '@/lib/pets';

export const dynamic = 'force-dynamic';

// 寵物進化圖鑑——家長限定。
// 故意不讓孩子看到完整進化圖，保留「養大才知道會變什麼」的驚喜感。
export default async function PetGalleryPage() {
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

  // 學生不能看圖鑑（避免一次看完失去好奇心），導回自己的寵物頁
  if (profile?.role !== 'parent') redirect('/pet');

  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: pets } = student
    ? await supabase
        .from('pets')
        .select('species, growth, is_active, created_at')
        .eq('user_id', student.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  return (
    <AppShell role="parent" email={user.email} displayName={profile?.display_name}>
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">✨ 寵物進化圖鑑</h1>
        <p className="mt-1 text-sm text-slate-500">
          家長限定預覽——孩子那邊看不到完整進化圖，保留養成的驚喜感
        </p>
      </header>

      {/* 孩子目前的養成狀態 */}
      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-black text-slate-800">
          {student?.display_name ?? '孩子'} 目前養到
        </h2>
        {!pets || pets.length === 0 ? (
          <p className="text-xs text-slate-400">還沒領養寵物。</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {pets.map((p, i) => {
              const def = PETS[p.species];
              if (!def) return null;
              const st = stageFromGrowth(p.growth);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                    p.is_active ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <PetSprite species={p.species} stage={st} size="sm" />
                  <div>
                    <p className="text-sm font-black text-slate-700">
                      {def.name}
                      {p.is_active && <span className="ml-1.5 text-[10px] font-bold text-emerald-600">養育中</span>}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      第 {st + 1}/6 階「{def.stages[st].name}」・成長值 {p.growth}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 完整 36 階段圖鑑 */}
      <div className="space-y-6">
        {Object.entries(PETS).map(([speciesKey, def]) => (
          <section key={speciesKey} className="card p-5">
            <div className="mb-3">
              <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                <span>{def.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {def.kind === 'plant' ? '植物' : '生物'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">{def.tagline}</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {def.stages.map((stageInfo, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 text-center"
                >
                  <span className="text-[10px] font-bold text-slate-500">
                    {idx + 1}・{stageInfo.name}
                  </span>
                  <div className="my-2 flex h-16 w-16 items-center justify-center overflow-hidden">
                    <PetSprite species={speciesKey} stage={idx} size="md" className="!h-16 !w-16" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">
                    {idx === 0 ? '領養' : `成長值 ${STAGE_THRESHOLDS[idx]}+`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
