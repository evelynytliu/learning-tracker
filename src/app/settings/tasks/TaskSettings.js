'use client';

import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DAY_LABELS } from '@/lib/date';

// props: userId, initialSets [{id, name, weekdays, tasks:[{id,label,hint}]}], initialPeriods
export default function TaskSettings({ userId, initialSets, initialPeriods }) {
  const [sets, setSets] = useState(initialSets);
  const [periods, setPeriods] = useState(initialPeriods);
  const [openSet, setOpenSet] = useState(initialSets[0]?.id ?? null);
  const [newSetName, setNewSetName] = useState('');
  const supabase = createClient();

  // ---- task sets ----
  async function addSet(e) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const { data, error } = await supabase
      .from('task_sets')
      .insert({ user_id: userId, name: newSetName.trim(), weekdays: [], sort_order: sets.length })
      .select()
      .single();
    if (error) return alert(error.message);
    setSets((prev) => [...prev, { ...data, tasks: [] }]);
    setNewSetName('');
    setOpenSet(data.id);
  }

  async function deleteSet(id) {
    if (!confirm('刪除這份清單?裡面的項目也會一起刪除。')) return;
    setSets((prev) => prev.filter((s) => s.id !== id));
    await supabase.from('task_sets').delete().eq('id', id);
  }

  async function toggleWeekday(set, dow) {
    const has = set.weekdays.includes(dow);
    const weekdays = has ? set.weekdays.filter((d) => d !== dow) : [...set.weekdays, dow].sort();
    setSets((prev) => prev.map((s) => (s.id === set.id ? { ...s, weekdays } : s)));
    await supabase.from('task_sets').update({ weekdays }).eq('id', set.id);
  }

  // ---- tasks ----
  async function addTask(set, label, hint) {
    if (!label.trim()) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        set_id: set.id,
        label: label.trim(),
        hint: hint.trim() || null,
        sort_order: set.tasks.length,
      })
      .select()
      .single();
    if (error) return alert(error.message);
    setSets((prev) =>
      prev.map((s) => (s.id === set.id ? { ...s, tasks: [...s.tasks, data] } : s)),
    );
  }

  async function deleteTask(setId, taskId) {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      ),
    );
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  // ---- special periods ----
  const [pDraft, setPDraft] = useState({ name: '', task_set_id: '', start_date: '', end_date: '' });
  async function addPeriod(e) {
    e.preventDefault();
    if (!pDraft.name.trim() || !pDraft.task_set_id || !pDraft.start_date || !pDraft.end_date) {
      return alert('請填完整：名稱、清單、起訖日');
    }
    const { data, error } = await supabase
      .from('special_periods')
      .insert({ user_id: userId, ...pDraft })
      .select()
      .single();
    if (error) return alert(error.message);
    setPeriods((prev) => [...prev, data]);
    setPDraft({ name: '', task_set_id: '', start_date: '', end_date: '' });
  }
  async function deletePeriod(id) {
    setPeriods((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('special_periods').delete().eq('id', id);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 清單們 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-800">打卡清單</h2>
        <div className="flex flex-col gap-3">
          {sets.map((set) => (
            <TaskSetCard
              key={set.id}
              set={set}
              open={openSet === set.id}
              onToggleOpen={() => setOpenSet(openSet === set.id ? null : set.id)}
              onToggleWeekday={(dow) => toggleWeekday(set, dow)}
              onDeleteSet={() => deleteSet(set.id)}
              onAddTask={(label, hint) => addTask(set, label, hint)}
              onDeleteTask={(taskId) => deleteTask(set.id, taskId)}
            />
          ))}
        </div>

        <form onSubmit={addSet} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="新清單名稱（例：暑假、考試週）"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={15} /> 新增清單
          </button>
        </form>
      </section>

      {/* 特殊期間 */}
      <section>
        <h2 className="mb-1 font-semibold text-slate-800">特殊期間</h2>
        <p className="mb-3 text-xs text-slate-400">
          在某段日期改用指定清單（會覆蓋星期設定）。例：暑假整段用「暑假」清單。
        </p>
        <ul className="flex flex-col gap-2">
          {periods.length === 0 && (
            <li className="rounded-xl border border-dashed p-3 text-center text-sm text-slate-400">
              沒有特殊期間
            </li>
          )}
          {periods.map((p) => {
            const set = sets.find((s) => s.id === p.task_set_id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm"
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-slate-400">
                    {' '}
                    · {p.start_date} ~ {p.end_date} · 用「{set?.name ?? '?'}」
                  </span>
                </span>
                <button
                  onClick={() => deletePeriod(p.id)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>

        <form onSubmit={addPeriod} className="mt-3 rounded-xl border bg-slate-50 p-4">
          <input
            type="text"
            placeholder="期間名稱（例：暑假）"
            value={pDraft.name}
            onChange={(e) => setPDraft({ ...pDraft, name: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={pDraft.task_set_id}
            onChange={(e) => setPDraft({ ...pDraft, task_set_id: e.target.value })}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <option value="">選擇要套用的清單…</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={pDraft.start_date}
              onChange={(e) => setPDraft({ ...pDraft, start_date: e.target.value })}
              className="flex-1 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              type="date"
              value={pDraft.end_date}
              onChange={(e) => setPDraft({ ...pDraft, end_date: e.target.value })}
              className="flex-1 rounded-lg border px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white"
          >
            ＋ 新增特殊期間
          </button>
        </form>
      </section>
    </div>
  );
}

function TaskSetCard({ set, open, onToggleOpen, onToggleWeekday, onDeleteSet, onAddTask, onDeleteTask }) {
  const [label, setLabel] = useState('');
  const [hint, setHint] = useState('');

  function submit(e) {
    e.preventDefault();
    onAddTask(label, hint);
    setLabel('');
    setHint('');
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between p-4">
        <button onClick={onToggleOpen} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <span className="font-semibold text-slate-800">{set.name}</span>
          <span className="text-xs text-slate-400">{set.tasks.length} 項</span>
        </button>
        <button
          onClick={onDeleteSet}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          {/* 星期套用 */}
          <p className="mb-1.5 text-xs text-slate-500">在這些星期自動套用：</p>
          <div className="mb-4 flex gap-1">
            {DAY_LABELS.map((lbl, i) => {
              const dow = i + 1;
              const on = set.weekdays.includes(dow);
              return (
                <button
                  key={dow}
                  onClick={() => onToggleWeekday(dow)}
                  className={`h-8 w-8 rounded-full text-xs ${
                    on ? 'bg-indigo-600 font-semibold text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {lbl.replace('週', '')}
                </button>
              );
            })}
          </div>

          {/* 項目 */}
          <ul className="flex flex-col gap-2">
            {set.tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{t.label}</span>
                  {t.hint && <span className="text-slate-400"> · {t.hint}</span>}
                </span>
                <button
                  onClick={() => onDeleteTask(t.id)}
                  className="rounded p-1 text-slate-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              placeholder="項目名稱（例：作業寫完）"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="說明（可選）"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus size={14} /> 加項目
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
