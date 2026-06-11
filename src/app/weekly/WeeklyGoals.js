'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

export default function WeeklyGoals({ userId, weekStart, initial, readOnly }) {
  const [goals, setGoals] = useState(initial);
  const [draft, setDraft] = useState({ title: '', target: 1 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const supabase = createClient();
  const { status, errMsg, run } = useSaveRunner();
  const doneCount = goals.filter((g) => g.progress >= g.target).length;

  async function addGoal(e) {
    e.preventDefault();
    setErr(null);
    if (!draft.title.trim()) {
      setErr('請輸入目標');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: userId,
      week_start: weekStart,
      title: draft.title.trim(),
      target: Math.max(1, parseInt(draft.target, 10) || 1),
      progress: 0,
      sort_order: goals.length,
    };
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase.from('weekly_goals').insert(payload).select().single();
      created = data;
      return error;
    });
    setBusy(false);
    if (!ok) return;
    setGoals((prev) => [...prev, created]);
    setDraft({ title: '', target: 1 });
  }

  async function setProgress(goal, next) {
    const clamped = Math.max(0, Math.min(goal.target, next));
    const prev = goals;
    setGoals((p) => p.map((g) => (g.id === goal.id ? { ...g, progress: clamped } : g)));
    await run(
      async () => (await supabase.from('weekly_goals').update({ progress: clamped }).eq('id', goal.id)).error,
      { rollback: () => setGoals(prev) },
    );
  }

  async function deleteGoal(id) {
    const prev = goals;
    setGoals((p) => p.filter((g) => g.id !== id));
    await run(
      async () => (await supabase.from('weekly_goals').delete().eq('id', id)).error,
      { rollback: () => setGoals(prev) },
    );
  }

  return (
    <div>
      {goals.length > 0 && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
          <div className="text-sm opacity-90">本週達成</div>
          <div className="mt-1 text-3xl font-bold">
            {doneCount}
            <span className="text-lg font-normal opacity-80"> / {goals.length} 個目標</span>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {goals.length === 0 && (
          <li className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-400">
            還沒有目標,在下面新增一個吧!
          </li>
        )}
        {goals.map((g) => {
          const done = g.progress >= g.target;
          const pct = Math.round((g.progress / g.target) * 100);
          return (
            <li
              key={g.id}
              className={`rounded-xl border p-4 ${done ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`font-medium ${done ? 'text-emerald-700' : ''}`}>
                  {done ? '✅ ' : ''}
                  {g.title}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="flex-shrink-0 text-sm text-gray-300 hover:text-red-400"
                  >
                    刪除
                  </button>
                )}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {g.progress} / {g.target}
                </span>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProgress(g, g.progress - 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600"
                    >
                      −
                    </button>
                    <button
                      onClick={() => setProgress(g, g.progress + 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white"
                    >
                      ＋
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!readOnly && (
        <form onSubmit={addGoal} className="mt-4 rounded-xl border bg-gray-50 p-4">
          <div className="mb-2 text-sm font-semibold text-gray-600">新增目標</div>
          <input
            type="text"
            placeholder="例：完成數學第 3 章 / 運動 3 次"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-500">目標次數</label>
            <input
              type="number"
              min="1"
              value={draft.target}
              onChange={(e) => setDraft({ ...draft, target: e.target.value })}
              className="w-20 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? '新增中…' : '＋ 新增目標'}
          </button>
        </form>
      )}

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}
