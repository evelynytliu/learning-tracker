'use client';

import { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Assignments({ userId, initial, canEdit }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState({ title: '', category: '暑假作業', due_date: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const supabase = createClient();

  const pending = items.filter((a) => !a.done);
  const done = items.filter((a) => a.done);

  async function toggle(a) {
    const next = !a.done;
    setItems((p) =>
      p.map((x) => (x.id === a.id ? { ...x, done: next, done_at: next ? new Date().toISOString() : null } : x)),
    );
    await supabase
      .from('assignments')
      .update({ done: next, done_at: next ? new Date().toISOString() : null })
      .eq('id', a.id);
  }

  async function add(e) {
    e.preventDefault();
    setErr(null);
    if (!draft.title.trim()) return setErr('請輸入作業名稱');
    setBusy(true);
    const payload = {
      user_id: userId,
      title: draft.title.trim(),
      category: draft.category.trim() || null,
      due_date: draft.due_date || null,
      sort_order: items.length,
    };
    const { data, error } = await supabase.from('assignments').insert(payload).select().single();
    setBusy(false);
    if (error) return setErr(error.message);
    setItems((p) => [...p, data]);
    setDraft({ title: '', category: draft.category, due_date: draft.due_date });
  }

  async function remove(id) {
    setItems((p) => p.filter((a) => a.id !== id));
    await supabase.from('assignments').delete().eq('id', id);
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-5 text-white">
        <div className="text-sm opacity-90">作業完成</div>
        <div className="mt-1 text-3xl font-bold">
          {done.length}
          <span className="text-lg font-normal opacity-80"> / {items.length} 項</span>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-500">待完成</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {pending.length === 0 && (
          <li className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-400">
            全部完成了！🎉
          </li>
        )}
        {pending.map((a) => (
          <Row key={a.id} a={a} canEdit={canEdit} onToggle={() => toggle(a)} onRemove={() => remove(a.id)} />
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">已完成</h2>
          <ul className="mb-6 flex flex-col gap-2">
            {done.map((a) => (
              <Row key={a.id} a={a} canEdit={canEdit} onToggle={() => toggle(a)} onRemove={() => remove(a.id)} />
            ))}
          </ul>
        </>
      )}

      {canEdit && (
        <form onSubmit={add} className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-600">新增作業</div>
          <input
            type="text"
            placeholder="作業名稱（例：自然科觀察日記）"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="分類"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              className="flex-1 rounded-lg border px-2 py-2 text-sm"
            />
          </div>
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-sky-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? '新增中…' : '＋ 新增作業'}
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ a, onToggle, onRemove, canEdit }) {
  // 到期警示
  const today = new Date().toLocaleDateString('en-CA');
  const overdue = a.due_date && !a.done && a.due_date < today;
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        a.done ? 'border-green-200 bg-green-50' : 'bg-white'
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          a.done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300'
        }`}
      >
        <Check size={18} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${a.done ? 'text-green-700 line-through' : 'text-slate-800'}`}>
          {a.title}
        </div>
        <div className="text-xs text-slate-400">
          {a.category || ''}
          {a.due_date ? `　截止 ${a.due_date}` : ''}
          {overdue && <span className="ml-1 font-semibold text-red-500">已逾期</span>}
        </div>
      </div>
      {canEdit && (
        <button onClick={onRemove} className="rounded p-1 text-slate-300 hover:text-red-400">
          <Trash2 size={16} />
        </button>
      )}
    </li>
  );
}
