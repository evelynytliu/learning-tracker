'use client';

import { useState } from 'react';
import { Coins, Sparkles, Plus, Check, Leaf, Egg } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  PETS,
  PLANT_LIST,
  CREATURE_LIST,
  stageFromGrowth,
  stageProgress,
  nextThreshold,
  MAX_STAGE,
} from '@/lib/pets';

const FEED_STEPS = [10, 50];

export default function PetManager({ userId, initialBalance, initialPets, earned }) {
  const [balance, setBalance] = useState(initialBalance);
  const [pets, setPets] = useState(initialPets);
  const [busy, setBusy] = useState(false);
  const [adopting, setAdopting] = useState(initialPets.length === 0);
  const [celebrate, setCelebrate] = useState(null);

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
    await supabase.from('pets').update({ is_active: false }).eq('user_id', userId);
    await supabase
      .from('pets')
      .insert({ user_id: userId, kind: PETS[speciesKey].kind, species: speciesKey, is_active: true });
    await reload();
    setAdopting(false);
    setBusy(false);
  }

  async function feed(amount) {
    if (!active || busy) return;
    const amt = Math.min(amount, balance);
    if (amt <= 0) return;
    const beforeStage = stageFromGrowth(active.growth);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('feed_pet', { p_pet_id: active.id, p_amount: amt });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row?.ok) {
      setBalance(row.balance);
      const newGrowth = row.growth;
      setPets((prev) => prev.map((p) => (p.id === active.id ? { ...p, growth: newGrowth } : p)));
      const afterStage = stageFromGrowth(newGrowth);
      if (afterStage > beforeStage) {
        const ap = PETS[active.species].stages[afterStage];
        setCelebrate({ emoji: ap.emoji, name: ap.name, petName: PETS[active.species].name });
      }
    }
    setBusy(false);
  }

  async function switchActive(id) {
    if (busy || id === active?.id) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from('pets').update({ is_active: false }).eq('user_id', userId);
    await supabase.from('pets').update({ is_active: true }).eq('id', id);
    await reload();
    setBusy(false);
  }

  return (
    <div>
      {/* 標題 + 點數 */}
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">🌿 我的寵物</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            用學習賺到的點數，把牠養大吧
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 text-sm font-black text-white shadow-sm">
            <Coins size={16} /> {balance}
          </span>
          {earned > 0 && (
            <span className="mt-1 text-[11px] font-bold text-emerald-600">剛獲得 +{earned} 點</span>
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
                  <span className="text-3xl">{def.stages[st].emoji}</span>
                  <span className="mt-1 truncate text-[11px] font-bold text-slate-600">{def.name}</span>
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

      {celebrate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6 backdrop-blur-sm"
          onClick={() => setCelebrate(null)}
        >
          <div className="flex flex-col items-center rounded-3xl bg-white px-8 py-10 text-center shadow-2xl">
            <span className="text-7xl animate-pop">{celebrate.emoji}</span>
            <p className="mt-4 flex items-center gap-1.5 text-lg font-black text-slate-800">
              <Sparkles size={18} className="text-amber-500" /> 進化了！
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-600">
              {celebrate.petName} 長成「{celebrate.name}」
            </p>
            <button
              onClick={() => setCelebrate(null)}
              className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-black text-white shadow active:scale-95"
            >
              太棒了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivePet({ pet, balance, busy, onFeed }) {
  const def = PETS[pet.species];
  const stage = stageFromGrowth(pet.growth);
  const stageInfo = def.stages[stage];
  const maxed = stage >= MAX_STAGE;
  const next = nextThreshold(pet.growth);
  const progress = Math.round(stageProgress(pet.growth) * 100);
  const isPlant = def.kind === 'plant';

  // 文青配色：植物走苔綠米白，生物走霧藍
  const frame = isPlant
    ? 'from-stone-50 via-emerald-50 to-teal-50'
    : 'from-slate-50 via-sky-50 to-indigo-50';
  const accent = isPlant ? 'text-emerald-700' : 'text-sky-700';
  const bar = isPlant ? 'from-emerald-400 to-teal-500' : 'from-sky-400 to-indigo-500';

  return (
    <div className={cn('relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-7 shadow-sm', frame)}>
      <div className="flex items-center justify-between">
        <span className={cn('flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-black', accent)}>
          {isPlant ? <Leaf size={13} /> : <Egg size={13} />}
          {def.name}
        </span>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-500">
          階段 {stage + 1}/{MAX_STAGE + 1}・{stageInfo.name}
        </span>
      </div>

      {/* 主角 */}
      <div className="my-6 flex flex-col items-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/60 shadow-inner">
          <span className="text-7xl animate-float drop-shadow-sm">{stageInfo.emoji}</span>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">{def.tagline}</p>
      </div>

      {/* 成長進度 */}
      {maxed ? (
        <p className="text-center text-sm font-black text-amber-600">🏆 已經完全長大了，太厲害了！</p>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>成長值 {pet.growth}</span>
            <span>下一階段 {next}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className={cn('sheen h-full rounded-full bg-gradient-to-r transition-all duration-500', bar)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 餵食 */}
      {!maxed && (
        <div className="mt-5 flex items-center gap-2">
          {FEED_STEPS.map((amt) => (
            <button
              key={amt}
              disabled={busy || balance < amt}
              onClick={() => onFeed(amt)}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-black text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
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
      )}
    </div>
  );
}

function AdoptPanel({ onPick, busy, canCancel, onCancel }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <span className="text-4xl">{p.seedEmoji}</span>
            <span className="mt-1.5 text-sm font-black text-slate-700">{p.name}</span>
            <span className="mt-0.5 text-[10px] font-medium leading-tight text-slate-400">{p.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
