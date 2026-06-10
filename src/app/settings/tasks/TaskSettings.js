'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, Pencil, Check, X, Link2, Sparkles, CalendarRange } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DAY_LABELS } from '@/lib/date';
import Sortable from '@/components/Sortable';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

export default function TaskSettings({ userId, initialSets, initialPeriods }) {
  const [sets, setSets] = useState(initialSets);
  const [periods, setPeriods] = useState(initialPeriods);
  const [openSet, setOpenSet] = useState(initialSets[0]?.id ?? null);
  const [newSetName, setNewSetName] = useState('');
  const supabase = createClient();
  const { status, errMsg, run } = useSaveRunner();

  // 切回分頁時 RefreshOnFocus 會重抓伺服器資料；把最新狀態同步進來，
  // 確保畫面永遠和資料庫一致（修掉「過期畫面看似沒存檔」的問題）。
  useEffect(() => setSets(initialSets), [initialSets]);
  useEffect(() => setPeriods(initialPeriods), [initialPeriods]);

  // ---- task sets ----
  async function addSet(e) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('task_sets')
        .insert({ user_id: userId, name: newSetName.trim(), weekdays: [], sort_order: sets.length })
        .select()
        .single();
      created = data;
      return error;
    });
    if (!ok) return;
    setSets((prev) => [...prev, { ...created, tasks: [] }]);
    setNewSetName('');
    setOpenSet(created.id);
  }

  async function deleteSet(id) {
    if (!confirm('刪除這份清單?裡面的項目也會一起刪除。')) return;
    const prev = sets;
    setSets((p) => p.filter((s) => s.id !== id));
    await run(
      async () => (await supabase.from('task_sets').delete().eq('id', id)).error,
      { rollback: () => setSets(prev) },
    );
  }

  async function renameSet(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const prev = sets;
    setSets((p) => p.map((s) => (s.id === id ? { ...s, name: trimmed } : s)));
    await run(
      async () => (await supabase.from('task_sets').update({ name: trimmed }).eq('id', id)).error,
      { rollback: () => setSets(prev) },
    );
  }

  async function toggleWeekday(set, dow) {
    const has = set.weekdays.includes(dow);
    const weekdays = has ? set.weekdays.filter((d) => d !== dow) : [...set.weekdays, dow].sort();
    const prev = sets;
    setSets((p) => p.map((s) => (s.id === set.id ? { ...s, weekdays } : s)));
    await run(
      async () => (await supabase.from('task_sets').update({ weekdays }).eq('id', set.id)).error,
      { rollback: () => setSets(prev) },
    );
  }

  // ---- tasks ----
  async function addTask(set, draft) {
    if (!draft.label.trim()) return;
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          set_id: set.id,
          label: draft.label.trim(),
          hint: draft.hint.trim() || null,
          link: draft.link.trim() || null,
          is_bonus: !!draft.is_bonus,
          sort_order: set.tasks.length,
        })
        .select()
        .single();
      created = data;
      return error;
    });
    if (!ok) return;
    setSets((prev) =>
      prev.map((s) => (s.id === set.id ? { ...s, tasks: [...s.tasks, created] } : s)),
    );
  }

  async function updateTask(setId, taskId, patch) {
    const prev = sets;
    setSets((p) =>
      p.map((s) =>
        s.id === setId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : s,
      ),
    );
    await run(
      async () => (await supabase.from('tasks').update(patch).eq('id', taskId)).error,
      { rollback: () => setSets(prev) },
    );
  }

  async function deleteTask(setId, taskId) {
    const prev = sets;
    setSets((p) =>
      p.map((s) =>
        s.id === setId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      ),
    );
    await run(
      async () => (await supabase.from('tasks').delete().eq('id', taskId)).error,
      { rollback: () => setSets(prev) },
    );
  }

  async function reorderTasks(setId, newTasks) {
    const prev = sets;
    setSets((p) => p.map((s) => (s.id === setId ? { ...s, tasks: newTasks } : s)));
    await run(
      async () => {
        const results = await Promise.all(
          newTasks.map((t, i) =>
            supabase.from('tasks').update({ sort_order: i }).eq('id', t.id),
          ),
        );
        return results.find((r) => r.error)?.error ?? null;
      },
      { rollback: () => setSets(prev) },
    );
  }

  // ---- special periods ----
  const [pDraft, setPDraft] = useState({ name: '', task_set_id: '', start_date: '', end_date: '', weekdays: [] });
  function togglePDraftWeekday(dow) {
    setPDraft((d) => ({
      ...d,
      weekdays: d.weekdays.includes(dow)
        ? d.weekdays.filter((x) => x !== dow)
        : [...d.weekdays, dow].sort(),
    }));
  }
  async function addPeriod(e) {
    e.preventDefault();
    if (!pDraft.name.trim() || !pDraft.task_set_id || !pDraft.start_date || !pDraft.end_date) {
      return alert('請填完整：名稱、清單、起訖日');
    }
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('special_periods')
        .insert({ user_id: userId, ...pDraft })
        .select()
        .single();
      created = data;
      return error;
    });
    if (!ok) return;
    setPeriods((prev) => [...prev, created]);
    setPDraft({ name: '', task_set_id: '', start_date: '', end_date: '', weekdays: [] });
  }
  async function deletePeriod(id) {
    const prev = periods;
    setPeriods((p) => p.filter((x) => x.id !== id));
    await run(
      async () => (await supabase.from('special_periods').delete().eq('id', id)).error,
      { rollback: () => setPeriods(prev) },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 清單們 */}
      <section>
        <p className="section-label mb-3">打卡清單</p>
        <div className="flex flex-col gap-3">
          {sets.map((set) => (
            <TaskSetCard
              key={set.id}
              set={set}
              open={openSet === set.id}
              onToggleOpen={() => setOpenSet(openSet === set.id ? null : set.id)}
              onToggleWeekday={(dow) => toggleWeekday(set, dow)}
              onRename={(name) => renameSet(set.id, name)}
              onDeleteSet={() => deleteSet(set.id)}
              onAddTask={(draft) => addTask(set, draft)}
              onUpdateTask={(taskId, patch) => updateTask(set.id, taskId, patch)}
              onDeleteTask={(taskId) => deleteTask(set.id, taskId)}
              onReorder={(newTasks) => reorderTasks(set.id, newTasks)}
            />
          ))}
        </div>

        <form onSubmit={addSet} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="新清單名稱（例：暑假、考試週）"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" className="btn btn-primary flex-shrink-0">
            <Plus size={15} /> 新增清單
          </button>
        </form>
      </section>

      {/* 特殊期間 */}
      <section>
        <p className="section-label mb-1 flex items-center gap-1.5">
          <CalendarRange size={13} /> 特殊期間
        </p>
        <p className="mb-3 text-xs text-slate-400">
          在某段日期改用指定清單（會覆蓋星期設定）。例：暑假整段用「暑假」清單。
        </p>
        <ul className="flex flex-col gap-2">
          {periods.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-300 p-3 text-center text-sm text-slate-400">
              沒有特殊期間
            </li>
          )}
          {periods.map((p) => {
            const set = sets.find((s) => s.id === p.task_set_id);
            return (
              <li
                key={p.id}
                className="card flex items-center justify-between p-3 text-sm"
              >
                <span>
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <span className="text-slate-400">
                    {' '}
                    · {p.start_date} ~ {p.end_date}
                    {p.weekdays && p.weekdays.length > 0
                      ? `（${p.weekdays.map((d) => DAY_LABELS[d - 1].replace('週', '')).join('')}）`
                      : ''}
                    {' '}· 用「{set?.name ?? '?'}」
                  </span>
                </span>
                <button
                  onClick={() => deletePeriod(p.id)}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>

        <form onSubmit={addPeriod} className="card mt-3 p-4">
          <input
            type="text"
            placeholder="期間名稱（例：暑假）"
            value={pDraft.name}
            onChange={(e) => setPDraft({ ...pDraft, name: e.target.value })}
            className="input w-full"
          />
          <select
            value={pDraft.task_set_id}
            onChange={(e) => setPDraft({ ...pDraft, task_set_id: e.target.value })}
            className="input mt-2 w-full"
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
              className="input flex-1"
            />
            <input
              type="date"
              value={pDraft.end_date}
              onChange={(e) => setPDraft({ ...pDraft, end_date: e.target.value })}
              className="input flex-1"
            />
          </div>

          <p className="mb-1.5 mt-3 text-xs font-semibold text-slate-500">
            限定星期（不選 = 整段每天套用）：
          </p>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((lbl, i) => {
              const dow = i + 1;
              const on = pDraft.weekdays.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => togglePDraftWeekday(dow)}
                  className={`chip h-10 w-10 ${on ? 'chip-on' : ''}`}
                >
                  {lbl.replace('週', '')}
                </button>
              );
            })}
          </div>

          <button type="submit" className="btn btn-primary mt-4 w-full">
            ＋ 新增特殊期間
          </button>
        </form>
      </section>

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}

function TaskSetCard({
  set,
  open,
  onToggleOpen,
  onToggleWeekday,
  onRename,
  onDeleteSet,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorder,
}) {
  const [draft, setDraft] = useState({ label: '', hint: '', link: '', is_bonus: false });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(set.name);

  function submit(e) {
    e.preventDefault();
    onAddTask(draft);
    setDraft({ label: '', hint: '', link: '', is_bonus: false });
  }

  function saveName() {
    if (nameDraft.trim()) onRename(nameDraft);
    setEditingName(false);
  }

  const regularCount = set.tasks.filter((t) => !t.is_bonus).length;
  const weekdayBadge =
    set.weekdays.length > 0
      ? set.weekdays.map((d) => DAY_LABELS[d - 1].replace('週', '')).join('')
      : null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4">
        {editingName ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setNameDraft(set.name);
                  setEditingName(false);
                }
              }}
              className="input min-w-0 flex-1 font-semibold"
            />
            <button onClick={saveName} className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50">
              <Check size={16} />
            </button>
            <button
              onClick={() => {
                setNameDraft(set.name);
                setEditingName(false);
              }}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggleOpen} className="flex flex-1 items-center gap-2 text-left">
              {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              <span className="font-extrabold text-slate-800">{set.name}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                {regularCount} 項
              </span>
              {weekdayBadge && (
                <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-500 sm:inline">
                  {weekdayBadge}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setNameDraft(set.name);
                setEditingName(true);
              }}
              className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
              title="重新命名"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDeleteSet}
              className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* 星期套用 */}
          <p className="mb-1.5 text-xs font-semibold text-slate-500">在這些星期自動套用：</p>
          <div className="mb-4 flex gap-1.5">
            {DAY_LABELS.map((lbl, i) => {
              const dow = i + 1;
              const on = set.weekdays.includes(dow);
              return (
                <button
                  key={dow}
                  onClick={() => onToggleWeekday(dow)}
                  className={`chip h-10 w-10 ${on ? 'chip-on' : ''}`}
                >
                  {lbl.replace('週', '')}
                </button>
              );
            })}
          </div>

          {/* 項目（可拖曳排序、可編輯） */}
          {set.tasks.length > 0 ? (
            <>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">
                項目（按住左側 <span className="inline-block align-middle">☰</span> 拖曳排序）：
              </p>
              <Sortable
                items={set.tasks}
                onReorder={onReorder}
                renderItem={(t) => (
                  <TaskRow
                    task={t}
                    onUpdate={(patch) => onUpdateTask(t.id, patch)}
                    onDelete={() => onDeleteTask(t.id)}
                  />
                )}
              />
            </>
          ) : (
            <p className="text-xs text-slate-400">還沒有項目，在下面新增。</p>
          )}

          {/* 新增項目 */}
          <form onSubmit={submit} className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
            <input
              type="text"
              placeholder="項目名稱（例：作業寫完）"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="input w-full"
            />
            <input
              type="text"
              placeholder="說明（可選）"
              value={draft.hint}
              onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
              className="input mt-2 w-full"
            />
            <input
              type="url"
              placeholder="連結（可選，例：品學堂網址）"
              value={draft.link}
              onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              className="input mt-2 w-full"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={draft.is_bonus}
                onChange={(e) => setDraft({ ...draft, is_bonus: e.target.checked })}
                className="h-4 w-4 accent-indigo-600"
              />
              設為加分項（不計入每日完成度）
            </label>
            <button type="submit" className="btn btn-ghost mt-3 w-full">
              <Plus size={14} /> 加項目
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({
    label: task.label,
    hint: task.hint || '',
    link: task.link || '',
    is_bonus: !!task.is_bonus,
  });

  function save() {
    if (!d.label.trim()) return;
    onUpdate({
      label: d.label.trim(),
      hint: d.hint.trim() || null,
      link: d.link.trim() || null,
      is_bonus: !!d.is_bonus,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
        <input
          autoFocus
          value={d.label}
          onChange={(e) => setD({ ...d, label: e.target.value })}
          className="input w-full"
          placeholder="項目名稱"
        />
        <input
          value={d.hint}
          onChange={(e) => setD({ ...d, hint: e.target.value })}
          className="input mt-2 w-full"
          placeholder="說明（可選）"
        />
        <input
          value={d.link}
          onChange={(e) => setD({ ...d, link: e.target.value })}
          className="input mt-2 w-full"
          placeholder="連結（可選）"
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={d.is_bonus}
            onChange={(e) => setD({ ...d, is_bonus: e.target.checked })}
            className="h-4 w-4 accent-indigo-600"
          />
          加分項
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={save} className="btn btn-primary flex-1 py-1.5">
            <Check size={14} /> 儲存
          </button>
          <button
            onClick={() => {
              setD({ label: task.label, hint: task.hint || '', link: task.link || '', is_bonus: !!task.is_bonus });
              setEditing(false);
            }}
            className="btn btn-ghost px-3 py-1.5"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 pr-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800">{task.label}</span>
          {task.is_bonus && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
              <Sparkles size={10} /> 加分
            </span>
          )}
          {task.link && <Link2 size={12} className="text-slate-300" />}
        </div>
        {task.hint && <div className="text-xs text-slate-400">{task.hint}</div>}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="rounded p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="編輯"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1.5 text-slate-300 transition hover:text-red-400"
        aria-label="刪除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
