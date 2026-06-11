'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Check, X, Sparkles, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SUBJECT_COLORS } from '@/lib/utils';
import { toYMD } from '@/lib/date';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

// 今日錯題複習：一題一題出現，自評「我會了 / 還不會」。
// 會了 → 7 天、14 天後再各考一次，連續 3 次 = 精熟畢業；
// 還不會 → 明天再來。每題複習 +2 點。
export default function ReviewQueue({ due, signedMap }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ got: 0, missed: 0, points: 0, mastered: 0 });
  const [finished, setFinished] = useState(false);
  const { status, errMsg, run } = useSaveRunner();

  if (!due || due.length === 0) return null;

  const current = due[idx];

  async function answer(gotIt) {
    const supabase = createClient();
    const ok = await run(async () => {
      const { data, error } = await supabase.rpc('review_mistake', {
        p_mistake_id: current.id,
        p_got_it: gotIt,
        p_today: toYMD(),
      });
      if (error) return error;
      const row = Array.isArray(data) ? data[0] : data;
      setStats((s) => ({
        got: s.got + (gotIt ? 1 : 0),
        missed: s.missed + (gotIt ? 0 : 1),
        points: s.points + (row?.o_awarded ?? 0),
        mastered: s.mastered + (row?.o_mastered ? 1 : 0),
      }));
      return null;
    });
    if (!ok) return;
    if (idx + 1 >= due.length) {
      setFinished(true);
      router.refresh(); // 更新下方列表的精熟/排程標記
    } else {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  if (finished) {
    return (
      <div className="card mb-6 flex flex-col items-center p-6 text-center animate-pop">
        <span className="text-4xl">🎉</span>
        <p className="mt-2 text-lg font-black text-slate-800">今日複習完成！</p>
        <p className="mt-1 text-sm font-bold text-slate-500">
          會了 {stats.got} 題・再加強 {stats.missed} 題
          {stats.mastered > 0 && (
            <span className="text-amber-600">・⭐ {stats.mastered} 題精熟畢業</span>
          )}
        </p>
        {stats.points > 0 && (
          <p className="mt-2 flex items-center gap-1 text-sm font-black text-amber-600">
            <Sparkles size={15} /> 獲得 +{stats.points} 點
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-white">
        <span className="flex items-center gap-1.5 text-sm font-black">
          <Brain size={16} /> 今日複習挑戰
        </span>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">
          {idx + 1} / {due.length}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ background: SUBJECT_COLORS[current.subject] || '#888' }}
          >
            {current.subject}
          </span>
          <span className="text-xs font-bold text-slate-400">
            已連對 {current.review_count} 次（3 次畢業）
          </span>
        </div>

        {current.description && (
          <p className="mt-3 text-base font-bold text-slate-800">{current.description}</p>
        )}
        {current.image_url && signedMap[current.image_url] && (
          <img
            src={signedMap[current.image_url]}
            alt=""
            className="mt-3 max-h-64 w-full rounded-xl object-contain bg-slate-50"
          />
        )}

        {/* 先想答案，再翻開當時的錯誤原因 */}
        {revealed ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 animate-rise">
            當時錯的原因：{current.reason}
          </p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"
          >
            先在心裡解一次，再點我看「當時錯的原因」
          </button>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => answer(true)}
            disabled={status === 'saving'}
            className="btn flex-1 bg-emerald-500 py-3 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600 disabled:opacity-50"
          >
            <Check size={16} strokeWidth={3} /> 我會了
          </button>
          <button
            onClick={() => answer(false)}
            disabled={status === 'saving'}
            className="btn flex-1 bg-rose-500 py-3 text-white shadow-md shadow-rose-200 hover:bg-rose-600 disabled:opacity-50"
          >
            <X size={16} strokeWidth={3} /> 還不會
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
          誠實自評才會進步：還不會 → 明天再考你一次；會了 → 7 / 14 天後抽考
        </p>
      </div>

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}
