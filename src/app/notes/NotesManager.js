'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/utils';

export default function NotesManager({ userId, initial, readOnly }) {
  const [notes, setNotes] = useState(initial);
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function add(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, subject: subject || null, content: content.trim() })
      .select()
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    setNotes((p) => [data, ...p]);
    setContent('');
    setSubject('');
  }

  async function remove(id) {
    setNotes((p) => p.filter((n) => n.id !== id));
    await supabase.from('notes').delete().eq('id', id);
  }

  return (
    <div>
      {!readOnly && (
        <form onSubmit={add} className="mb-6 rounded-2xl border bg-slate-50 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="記一下：今天遇到不懂的事、想記住的一句話…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">科目（可選）：</span>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(subject === s ? '' : s)}
                className={`rounded-full px-3 py-1 text-xs ${
                  subject === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? '儲存中…' : '＋ 記下來'}
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-3">
        {notes.length === 0 && (
          <li className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-400">
            還沒有筆記
          </li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {n.subject && (
                  <span className="mb-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                    {n.subject}
                  </span>
                )}
                <p className="whitespace-pre-wrap text-sm text-slate-700">{n.content}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(n.created_at).toLocaleString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!readOnly && (
                <button
                  onClick={() => remove(n.id)}
                  className="rounded p-1 text-slate-300 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
