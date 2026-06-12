'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ExternalLink,
  ArchiveRestore,
  Undo2,
  PartyPopper,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toYMD, weekStartYMD } from '@/lib/date';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

const EMPTY_DRAFT = {
  title: '',
  provider: '',
  link: '',
  emoji: '🎓',
  total_units: '',
  unit_label: '集',
};

// 線上課程進度管理。
//   courses:  [{id, title, provider, link, emoji, total_units, unit_label, archived, ...}]
//   progress: [{course_id, unit_no, done_at}]
export default function CourseManager({ userId, initialCourses, initialProgress }) {
  const [courses, setCourses] = useState(initialCourses);
  const [progress, setProgress] = useState(initialProgress);
  const [showAdd, setShowAdd] = useState(false);
  const supabase = createClient();
  const { status, errMsg, run } = useSaveRunner();

  // 切回分頁時同步伺服器最新資料（RefreshOnFocus 會觸發重抓）
  useEffect(() => setCourses(initialCourses), [initialCourses]);
  useEffect(() => setProgress(initialProgress), [initialProgress]);

  const doneByCourse = useMemo(() => {
    const m = {};
    for (const p of progress) (m[p.course_id] ||= new Map()).set(p.unit_no, p.done_at);
    return m;
  }, [progress]);

  const wkStart = weekStartYMD();
  const weekCount = progress.filter((p) => toYMD(new Date(p.done_at)) >= wkStart).length;
  const totalDone = progress.length;

  // 看完一集會得點數；補呼叫對帳（idempotent，多叫無害）
  function settlePoints() {
    supabase.rpc('award_points', { p_user_id: userId, p_today: toYMD() }).then(() => {});
  }

  async function toggleUnit(course, unitNo) {
    const has = doneByCourse[course.id]?.has(unitNo);
    const prev = progress;
    if (has) {
      setProgress((p) => p.filter((x) => !(x.course_id === course.id && x.unit_no === unitNo)));
      await run(
        async () =>
          (
            await supabase
              .from('course_progress')
              .delete()
              .eq('course_id', course.id)
              .eq('unit_no', unitNo)
          ).error,
        { rollback: () => setProgress(prev) },
      );
    } else {
      setProgress((p) => [
        ...p,
        { course_id: course.id, unit_no: unitNo, done_at: new Date().toISOString() },
      ]);
      const ok = await run(
        async () =>
          (
            await supabase.from('course_progress').upsert(
              { user_id: userId, course_id: course.id, unit_no: unitNo },
              { onConflict: 'course_id,unit_no', ignoreDuplicates: true },
            )
          ).error,
        { rollback: () => setProgress(prev) },
      );
      if (ok) settlePoints();
    }
  }

  // 「+1 集」：勾下一個還沒看的集數
  function markNext(course) {
    const done = doneByCourse[course.id] ?? new Map();
    let next = 1;
    while (done.has(next)) next += 1;
    if (course.total_units > 0 && next > course.total_units) return;
    toggleUnit(course, next);
  }

  // 「退回一集」：取消最大的已看集數（手滑多按時用）
  function undoLast(course) {
    const done = doneByCourse[course.id] ?? new Map();
    if (done.size === 0) return;
    toggleUnit(course, Math.max(...done.keys()));
  }

  async function addCourse(draft) {
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          user_id: userId,
          title: draft.title.trim(),
          provider: draft.provider.trim() || null,
          link: draft.link.trim() || null,
          emoji: draft.emoji.trim() || '🎓',
          total_units: parseInt(draft.total_units, 10) || 0,
          unit_label: draft.unit_label.trim() || '集',
          sort_order: courses.length,
        })
        .select()
        .single();
      created = data;
      return error;
    });
    if (!ok) return false;
    setCourses((prev) => [...prev, created]);
    setShowAdd(false);
    return true;
  }

  async function updateCourse(id, patch) {
    const prev = courses;
    setCourses((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await run(
      async () => (await supabase.from('courses').update(patch).eq('id', id)).error,
      { rollback: () => setCourses(prev) },
    );
  }

  async function deleteCourse(id) {
    if (!confirm('刪除這門課？已記錄的進度也會一起刪除。')) return;
    const prevC = courses;
    const prevP = progress;
    setCourses((p) => p.filter((c) => c.id !== id));
    setProgress((p) => p.filter((x) => x.course_id !== id));
    await run(
      async () => (await supabase.from('courses').delete().eq('id', id)).error,
      {
        rollback: () => {
          setCourses(prevC);
          setProgress(prevP);
        },
      },
    );
  }

  const active = courses.filter((c) => !c.archived);
  const archived = courses.filter((c) => c.archived);

  return (
    <div className="flex flex-col gap-4">
      {/* 總覽列 */}
      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="section-label">本週進度</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {weekCount}
            <span className="ml-1 text-xs font-bold text-slate-400">集 / 堂</span>
          </p>
        </div>
        <div className="text-right">
          <p className="section-label">累計完成</p>
          <p className="mt-1 text-2xl font-black text-gradient">{totalDone}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="section-label">獎勵</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-sm font-bold text-amber-600"><Coins size={14} /> 每集 +5 點</p>
        </div>
      </div>

      {/* 課程卡片 */}
      {active.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          還沒有課程，按下面的「＋ 新增課程」開始。
        </div>
      )}
      <div className="stagger flex flex-col gap-4">
        {active.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            done={doneByCourse[course.id] ?? new Map()}
            onToggleUnit={(n) => toggleUnit(course, n)}
            onMarkNext={() => markNext(course)}
            onUndoLast={() => undoLast(course)}
            onUpdate={(patch) => updateCourse(course.id, patch)}
            onDelete={() => deleteCourse(course.id)}
          />
        ))}
      </div>

      {/* 新增課程 */}
      {showAdd ? (
        <CourseForm
          initial={EMPTY_DRAFT}
          title="新增課程"
          onSubmit={addCourse}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button onClick={() => setShowAdd(true)} className="btn btn-primary w-full py-3">
          <Plus size={16} /> 新增課程
        </button>
      )}

      {/* 已完課（封存） */}
      {archived.length > 0 && (
        <section className="mt-2">
          <p className="section-label mb-2">已完課</p>
          <ul className="flex flex-col gap-2">
            {archived.map((c) => (
              <li key={c.id} className="card flex items-center gap-3 p-3 opacity-75">
                <span className="text-xl">{c.emoji || '🎓'}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-600">
                  {c.title}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {(doneByCourse[c.id] ?? new Map()).size} {c.unit_label}
                </span>
                <button
                  onClick={() => updateCourse(c.id, { archived: false })}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="移回進行中"
                >
                  <ArchiveRestore size={15} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}

function CourseCard({ course, done, onToggleUnit, onMarkNext, onUndoLast, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const doneCount = done.size;
  const total = course.total_units;
  const pct = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : null;
  const finished = total > 0 && doneCount >= total;

  if (editing) {
    return (
      <CourseForm
        title="編輯課程"
        initial={{
          title: course.title,
          provider: course.provider || '',
          link: course.link || '',
          emoji: course.emoji || '🎓',
          total_units: course.total_units || '',
          unit_label: course.unit_label || '集',
        }}
        onSubmit={async (draft) => {
          await onUpdate({
            title: draft.title.trim(),
            provider: draft.provider.trim() || null,
            link: draft.link.trim() || null,
            emoji: draft.emoji.trim() || '🎓',
            total_units: parseInt(draft.total_units, 10) || 0,
            unit_label: draft.unit_label.trim() || '集',
          });
          setEditing(false);
          return true;
        }}
        onCancel={() => setEditing(false)}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="card card-hover overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* 標題列 */}
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
            {course.emoji || '🎓'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-slate-900">{course.title}</p>
            {course.provider && (
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                {course.provider}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="編輯課程"
          >
            <Pencil size={15} />
          </button>
        </div>

        {/* 進度 */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-sm font-extrabold text-slate-700">
              已看 {doneCount}
              {total > 0 && <span className="text-slate-400"> / {total}</span>}
              <span className="ml-0.5 text-xs font-bold text-slate-400">{course.unit_label}</span>
            </p>
            {pct !== null ? (
              <span className={`text-xs font-black ${finished ? 'text-emerald-600' : 'text-indigo-500'}`}>
                {pct}%
              </span>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-600"
              >
                設定總{course.unit_label}數 →
              </button>
            )}
          </div>
          {pct !== null && (
            <div className="progress-track">
              <div className={`progress-fill ${finished ? 'sheen' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* 集數格子（知道總數才畫得出來） */}
        {total > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
              const isDone = done.has(n);
              return (
                <button
                  key={n}
                  onClick={() => onToggleUnit(n)}
                  className={`chip h-9 w-9 text-xs ${isDone ? 'chip-on' : ''}`}
                  aria-label={`第 ${n} ${course.unit_label}`}
                  aria-pressed={isDone}
                >
                  {isDone ? <Check size={14} strokeWidth={3.5} /> : n}
                </button>
              );
            })}
          </div>
        )}

        {/* 動作列 */}
        <div className="mt-4 flex items-center gap-2">
          {course.link && (
            <a
              href={course.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary flex-1 py-2.5"
            >
              前往上課 <ExternalLink size={14} strokeWidth={2.5} />
            </a>
          )}
          {finished ? (
            <button
              onClick={() => onUpdate({ archived: true })}
              className="btn flex-1 bg-emerald-50 py-2.5 text-emerald-700 hover:bg-emerald-100"
            >
              <PartyPopper size={15} /> 完課！收進書櫃
            </button>
          ) : (
            <button onClick={onMarkNext} className="btn btn-ghost flex-1 py-2.5">
              <Plus size={15} /> 看完一{course.unit_label}
            </button>
          )}
          {doneCount > 0 && !finished && total === 0 && (
            <button
              onClick={onUndoLast}
              className="btn btn-ghost px-3 py-2.5"
              title="退回一集"
              aria-label="退回一集"
            >
              <Undo2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseForm({ title, initial, onSubmit, onCancel, onDelete }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!d.title.trim()) return;
    setBusy(true);
    await onSubmit(d);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card p-4">
      <p className="section-label mb-3">{title}</p>
      <div className="flex gap-2">
        <input
          value={d.emoji}
          onChange={(e) => setD({ ...d, emoji: e.target.value })}
          className="input w-16 text-center"
          aria-label="圖示"
        />
        <input
          autoFocus
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          placeholder="課程名稱（例：動畫臺灣史）"
          className="input flex-1"
        />
      </div>
      <input
        value={d.provider}
        onChange={(e) => setD({ ...d, provider: e.target.value })}
        placeholder="平台（例：大抓周學院）"
        className="input mt-2 w-full"
      />
      <input
        type="url"
        value={d.link}
        onChange={(e) => setD({ ...d, link: e.target.value })}
        placeholder="課程網址（可選）"
        className="input mt-2 w-full"
      />
      <div className="mt-2 flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            總共幾{d.unit_label || '集'}？（不確定先留空）
          </span>
          <input
            type="number"
            min="0"
            max="200"
            value={d.total_units}
            onChange={(e) => setD({ ...d, total_units: e.target.value })}
            placeholder="例：16"
            className="input w-full"
          />
        </label>
        <label className="w-24">
          <span className="mb-1 block text-xs font-semibold text-slate-500">單位</span>
          <select
            value={d.unit_label}
            onChange={(e) => setD({ ...d, unit_label: e.target.value })}
            className="input w-full"
          >
            <option value="集">集</option>
            <option value="堂">堂</option>
            <option value="章">章</option>
            <option value="關">關</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary flex-1">
          <Check size={15} /> 儲存
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost px-4">
          <X size={15} /> 取消
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="btn bg-red-50 px-3 text-red-500 hover:bg-red-100"
            aria-label="刪除課程"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </form>
  );
}
