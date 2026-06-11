'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Coins, Sparkles, Plus, Check, Leaf, Egg, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import PetSprite from '@/components/PetSprite';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';
import {
  PETS,
  PLANT_LIST,
  CREATURE_LIST,
  stageFromGrowth,
  stageProgress,
  nextThreshold,
  MAX_STAGE,
  STAGE_THRESHOLDS,
} from '@/lib/pets';

const FEED_STEPS = [5, 20];

export default function PetManager({ userId, initialBalance, initialPets, earned }) {
  const [balance, setBalance] = useState(initialBalance);
  const [pets, setPets] = useState(initialPets);
  const [busy, setBusy] = useState(false);
  const [adopting, setAdopting] = useState(initialPets.length === 0);
  const [evolution, setEvolution] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const { status, errMsg, run } = useSaveRunner();

  // 切回分頁時同步最新資料
  useEffect(() => setPets(initialPets), [initialPets]);
  useEffect(() => setBalance(initialBalance), [initialBalance]);

  const active = pets.find((p) => p.is_active) || pets[0] || null;

  async function reload() {
    const supabase = createClient();
    const [{ data: ps }, { data: bal }] = await Promise.all([
      supabase.from('pets').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.rpc('point_balance', { p_user_id: userId }),
    ]);
    if (ps) setPets(ps);
    if (typeof bal === 'number') setBalance(bal);
  }

  async function adopt(speciesKey) {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const ok = await run(async () => {
      // 先新增（成功才把其他寵物設為休息），失敗不會弄丟現役寵物
      const { data, error } = await supabase
        .from('pets')
        .insert({ user_id: userId, kind: PETS[speciesKey].kind, species: speciesKey, is_active: true })
        .select()
        .single();
      if (error) return error;
      const { error: e2 } = await supabase
        .from('pets')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', data.id);
      return e2;
    });
    if (ok) {
      await reload();
      setAdopting(false);
    }
    setBusy(false);
  }

  async function feed(amount) {
    if (!active || busy) return;
    const amt = Math.min(amount, balance);
    if (amt <= 0) return;
    const beforeStage = stageFromGrowth(active.growth);
    setBusy(true);
    const supabase = createClient();
    const ok = await run(async () => {
      const { data, error } = await supabase.rpc('feed_pet', { p_pet_id: active.id, p_amount: amt });
      if (error) return error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.ok) {
        // 餘額和畫面對不上（例如另一台裝置剛餵過）→ 重新同步並提示
        await reload();
        return new Error('點數不夠了，已重新同步餘額');
      }
      setBalance(row.balance);
      setPets((prev) => prev.map((p) => (p.id === active.id ? { ...p, growth: row.growth } : p)));
      const afterStage = stageFromGrowth(row.growth);
      if (afterStage > beforeStage) {
        setEvolution({
          species: active.species,
          from: beforeStage,
          to: afterStage,
          name: PETS[active.species].stages[afterStage].name,
          petName: PETS[active.species].name,
        });
      }
      return null;
    });
    if (!ok) await reload();
    setBusy(false);
  }

  async function switchActive(id) {
    if (busy || id === active?.id) return;
    setBusy(true);
    const prev = pets;
    setPets((p) => p.map((x) => ({ ...x, is_active: x.id === id })));
    const supabase = createClient();
    await run(
      async () => {
        const { error } = await supabase
          .from('pets')
          .update({ is_active: false })
          .eq('user_id', userId)
          .neq('id', id);
        if (error) return error;
        return (await supabase.from('pets').update({ is_active: true }).eq('id', id)).error;
      },
      { rollback: () => setPets(prev) },
    );
    setBusy(false);
  }

  return (
    <div>
      {/* 標題 + 點數 */}
      <header className="mb-5 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">🌿 我的寵物</h1>
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <Sparkles size={11} className="text-amber-500" />
              圖鑑
            </button>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            用學習賺到的點數，把牠養大吧
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 text-sm font-black text-white shadow-sm">
            <Coins size={16} /> {balance}
          </span>
          {earned > 0 && (
            <span className="mt-1 text-[11px] font-bold text-emerald-600 animate-pop">剛獲得 +{earned} 點</span>
          )}
        </div>
      </header>

      {adopting ? (
        <AdoptPanel onPick={adopt} busy={busy} canCancel={pets.length > 0} onCancel={() => setAdopting(false)} />
      ) : active ? (
        <>
          <ActivePet pet={active} balance={balance} busy={busy} onFeed={feed} />

          {/* 收藏 / 再養一隻 */}
          <h2 className="mb-3 mt-7 text-xs font-black uppercase tracking-widest text-slate-400">
            我的小窩（{pets.length}）
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {pets.map((p) => {
              const def = PETS[p.species];
              if (!def) return null;
              const st = stageFromGrowth(p.growth);
              const isActive = p.id === active.id;
              return (
                <button
                  key={p.id}
                  onClick={() => switchActive(p.id)}
                  className={cn(
                    'relative flex flex-col items-center rounded-2xl border-2 p-3 transition active:scale-95',
                    isActive
                      ? 'border-emerald-400 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <PetSprite species={p.species} stage={st} size="sm" className="mb-1" />
                  <span className="truncate text-[11px] font-bold text-slate-600">{def.name}</span>
                  {isActive && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setAdopting(true)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-3 text-slate-400 transition hover:border-emerald-400 hover:text-emerald-500 active:scale-95"
            >
              <Plus size={22} />
              <span className="mt-1 text-[11px] font-bold">再養一隻</span>
            </button>
          </div>
        </>
      ) : null}

      {evolution && <EvolutionShow evo={evolution} onClose={() => setEvolution(null)} />}

      {showGallery && (
        <Gallery onClose={() => setShowGallery(false)} />
      )}

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}

/* ===== 主秀：3D 全息傾斜卡 ===== */
function ActivePet({ pet, balance, busy, onFeed }) {
  const def = PETS[pet.species];
  const stage = stageFromGrowth(pet.growth);
  const stageInfo = def.stages[stage];
  const maxed = stage >= MAX_STAGE;
  const next = nextThreshold(pet.growth);
  const progress = Math.round(stageProgress(pet.growth) * 100);
  const isPlant = def.kind === 'plant';
  const [bouncing, setBouncing] = useState(false);

  // 3D 傾斜（滑鼠 / 手指跟著動，像寶可夢卡牌）
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 30, hover: false });
  function onMove(e) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 8, ry: (px - 0.5) * 10, gx: px * 100, gy: py * 100, hover: true });
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 30, hover: false });
  }

  const frame = isPlant
    ? 'from-emerald-100 via-teal-50 to-lime-50'
    : 'from-indigo-100 via-sky-50 to-violet-50';
  const auraColor = isPlant ? 'rgba(52,211,153,0.4)' : 'rgba(129,140,248,0.4)';
  const bar = isPlant ? 'from-emerald-400 to-teal-500' : 'from-indigo-400 to-violet-500';
  const accent = isPlant ? 'text-emerald-700' : 'text-indigo-700';
  const broke = balance < FEED_STEPS[0];

  return (
    <div style={{ perspective: '1000px' }}>
      <div
        ref={cardRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: tilt.hover ? 'transform 80ms linear' : 'transform 500ms ease',
          touchAction: 'pan-y',
        }}
        className={cn(
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-6 shadow-xl shadow-indigo-200/40 border border-white/80',
          frame,
        )}
      >
        {/* 全息光暈（跟著指標跑） */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(34rem 24rem at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.5), transparent 55%)`,
            opacity: tilt.hover ? 1 : 0.4,
            transition: 'opacity 300ms',
          }}
        />
        {/* 飄浮微粒 */}
        <span className="pointer-events-none absolute left-[12%] top-[18%] text-lg opacity-70 animate-float">✦</span>
        <span className="pointer-events-none absolute right-[14%] top-[30%] text-xs opacity-60 animate-float" style={{ animationDelay: '0.8s' }}>✦</span>
        <span className="pointer-events-none absolute left-[20%] bottom-[34%] text-sm opacity-50 animate-float" style={{ animationDelay: '1.6s' }}>✧</span>

        <div className="relative z-20 flex items-center justify-between">
          <span className={cn('flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-black shadow-sm', accent)}>
            {isPlant ? <Leaf size={13} /> : <Egg size={13} />}
            {def.name}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
            {stageInfo.name}
          </span>
        </div>

        {/* 主角舞台 */}
        <div className="relative z-20 my-5 flex flex-col items-center" style={{ transform: 'translateZ(40px)' }}>
          <div className="relative">
            {/* 背後光環 */}
            <div
              className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: `radial-gradient(circle, ${auraColor}, transparent 65%)` }}
            />
            <button
              type="button"
              onClick={() => {
                setBouncing(true);
                setTimeout(() => setBouncing(false), 750);
              }}
              className="relative cursor-pointer"
              aria-label="跟寵物玩"
            >
              <PetSprite
                species={pet.species}
                stage={stage}
                size="xl"
                className={bouncing ? 'animate-pet-bounce' : ''}
              />
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">{def.tagline}</p>

          {/* 六階段點點 */}
          <div className="mt-3 flex items-center gap-1.5">
            {def.stages.map((s, i) => (
              <span
                key={i}
                title={s.name}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i < stage ? 'w-2.5 bg-slate-400/70' : i === stage ? 'w-7 bg-gradient-to-r ' + bar : 'w-2.5 bg-white/80 border border-slate-200',
                )}
              />
            ))}
          </div>
        </div>

        {/* 成長進度 */}
        <div className="relative z-20">
          {maxed ? (
            <p className="text-center text-sm font-black text-amber-600">🏆 已經完全長大了，太厲害了！</p>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>成長值 {pet.growth}</span>
                <span>下一階段 {next}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/80 shadow-inner">
                <div
                  className={cn('sheen h-full rounded-full bg-gradient-to-r transition-all duration-500', bar)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 餵食 */}
          {!maxed && (
            <>
              <div className="mt-4 flex items-center gap-2">
                {FEED_STEPS.map((amt) => (
                  <button
                    key={amt}
                    disabled={busy || balance < amt}
                    onClick={() => onFeed(amt)}
                    className="flex-1 rounded-xl bg-white/90 py-2.5 text-sm font-black text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
                  >
                    {isPlant ? '澆水' : '餵食'} +{amt}
                  </button>
                ))}
                <button
                  disabled={busy || balance <= 0}
                  onClick={() => onFeed(balance)}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-black text-white shadow transition active:scale-95 disabled:opacity-40 bg-gradient-to-r',
                    bar,
                  )}
                >
                  全部給牠
                </button>
              </div>
              {broke && (
                <Link
                  href="/checkin"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-white/70 py-2 text-xs font-black text-amber-700 shadow-sm transition active:scale-[0.98]"
                >
                  <Zap size={13} />
                  點數不夠！完成每日挑戰 +10、看一集課程 +5 → 去賺點數
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== 寶可夢式進化動畫 ===== */
function EvolutionShow({ evo, onClose }) {
  // phase 0: 白色剪影脈動  1: 爆閃  2: 揭曉
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1600);
    const t2 = setTimeout(() => setPhase(2), 2150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-6 backdrop-blur-sm"
      onClick={phase === 2 ? onClose : undefined}
    >
      <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* 旋轉光芒 */}
        <div
          className="pointer-events-none absolute left-1/2 top-[120px] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 animate-spin-slow"
          style={{
            background:
              'repeating-conic-gradient(rgba(255,225,130,0.35) 0deg 14deg, transparent 14deg 38deg)',
            maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          }}
        />
        {/* 爆閃圈 */}
        {phase >= 1 && (
          <div className="pointer-events-none absolute left-1/2 top-[120px] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white animate-burst" />
        )}

        <div className="relative flex h-60 w-60 items-center justify-center">
          {phase < 2 ? (
            <PetSprite
              species={evo.species}
              stage={evo.from}
              size="xl"
              className="silhouette animate-evo-pulse"
            />
          ) : (
            <PetSprite species={evo.species} stage={evo.to} size="xl" className="animate-pop" />
          )}
        </div>

        {phase < 2 ? (
          <p className="mt-6 text-lg font-black tracking-widest text-white/90">
            咦？{evo.petName}的樣子……！
          </p>
        ) : (
          <div className="flex flex-col items-center animate-rise">
            <p className="mt-4 flex items-center gap-1.5 text-2xl font-black text-white">
              <Sparkles size={22} className="text-amber-300" /> 進化了！
            </p>
            <p className="mt-1.5 text-sm font-bold text-emerald-300">
              {evo.petName} 進化成「{evo.name}」
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-2.5 text-sm font-black text-white shadow-lg active:scale-95"
            >
              太棒了！
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Gallery({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl md:p-8 card max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
        >
          <Plus size={20} className="rotate-45" />
        </button>

        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-800">
            <Sparkles className="text-amber-500 animate-pulse" />
            寵物進化圖鑑
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            六個物種、36 個階段。從種子或蛋開始，養到完全體！
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(PETS).map(([speciesKey, def]) => (
            <div key={speciesKey} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
              <div className="mb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
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
                    className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 text-center transition hover:border-emerald-200 hover:bg-emerald-50/20"
                  >
                    <span className="text-[10px] font-bold text-slate-500">
                      {idx + 1}・{stageInfo.name}
                    </span>
                    <div className="my-2 flex h-16 w-16 items-center justify-center overflow-hidden">
                      <PetSprite species={speciesKey} stage={idx} size="md" className="!h-16 !w-16" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">
                      {idx === 0 ? '領養' : `XP ${STAGE_THRESHOLDS[idx]}+`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-black text-slate-600 transition active:scale-95 cursor-pointer"
          >
            關閉圖鑑
          </button>
        </div>
      </div>
    </div>
  );
}

function AdoptPanel({ onPick, busy, canCancel, onCancel }) {
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800">選一個夥伴開始養</h2>
        {canCancel && (
          <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            取消
          </button>
        )}
      </div>
      <p className="mb-4 text-xs font-medium text-slate-500">種子會開花，蛋會孵化。選好就開始囉～</p>

      <Section title="🌱 植物線" list={PLANT_LIST} onPick={onPick} busy={busy} />
      <div className="h-4" />
      <Section title="🥚 生物線" list={CREATURE_LIST} onPick={onPick} busy={busy} />
    </div>
  );
}

function Section({ title, list, onPick, busy }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
      <div className="grid grid-cols-3 gap-3">
        {list.map((p) => (
          <button
            key={p.key}
            disabled={busy}
            onClick={() => onPick(p.key)}
            className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 active:scale-95 disabled:opacity-50"
          >
            <PetSprite species={p.key} stage={0} size="sm" className="!h-12 !w-12" />
            <span className="mt-1.5 text-sm font-black text-slate-700">{p.name}</span>
            <span className="mt-0.5 text-[10px] font-medium leading-tight text-slate-400">{p.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
