'use client';

import { useState } from 'react';
import { Trash2, Star, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toYMD } from '@/lib/date';

export default function ReadingLog({ userId, initial, readOnly }) {
  const [books, setBooks] = useState(initial);
  const [draft, setDraft] = useState({ title: '', author: '', pages: '', note: '', rating: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const supabase = createClient();

  const finished = books.filter((b) => b.finished_date);
  const reading = books.filter((b) => !b.finished_date);

  async function addBook(e) {
    e.preventDefault();
    setErr(null);
    if (!draft.title.trim()) return setErr('請輸入書名');
    setBusy(true);
    const payload = {
      user_id: userId,
      title: draft.title.trim(),
      author: draft.author.trim() || null,
      pages: draft.pages ? parseInt(draft.pages, 10) : null,
      note: draft.note.trim() || null,
      rating: draft.rating || null,
      finished_date: null, // 先放「閱讀中」
    };
    const { data, error } = await supabase.from('reading_log').insert(payload).select().single();
    setBusy(false);
    if (error) return setErr(error.message);
    setBooks((p) => [data, ...p]);
    setDraft({ title: '', author: '', pages: '', note: '', rating: 0 });
  }

  async function markFinished(book) {
    const finished_date = toYMD();
    setBooks((p) => p.map((b) => (b.id === book.id ? { ...b, finished_date } : b)));
    await supabase.from('reading_log').update({ finished_date }).eq('id', book.id);
  }

  async function setRating(book, rating) {
    setBooks((p) => p.map((b) => (b.id === book.id ? { ...b, rating } : b)));
    await supabase.from('reading_log').update({ rating }).eq('id', book.id);
  }

  async function remove(id) {
    setBooks((p) => p.filter((b) => b.id !== id));
    await supabase.from('reading_log').delete().eq('id', id);
  }

  return (
    <div>
      {/* 書櫃：已讀完 */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
        <div className="text-sm opacity-90">我的書櫃</div>
        <div className="mt-1 text-3xl font-bold">
          {finished.length}
          <span className="text-lg font-normal opacity-80"> 本讀完</span>
        </div>
        {finished.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {finished.map((b) => (
              <span key={b.id} title={b.title} className="text-2xl">📖</span>
            ))}
          </div>
        )}
      </div>

      {/* 閱讀中 */}
      {reading.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">閱讀中</h2>
          <ul className="mb-6 flex flex-col gap-3">
            {reading.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                readOnly={readOnly}
                onFinish={() => markFinished(b)}
                onRate={(r) => setRating(b, r)}
                onRemove={() => remove(b.id)}
              />
            ))}
          </ul>
        </>
      )}

      {/* 已讀完 */}
      {finished.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">已讀完</h2>
          <ul className="mb-6 flex flex-col gap-3">
            {finished.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                readOnly={readOnly}
                onRate={(r) => setRating(b, r)}
                onRemove={() => remove(b.id)}
              />
            ))}
          </ul>
        </>
      )}

      {books.length === 0 && (
        <p className="mb-6 text-center text-sm text-slate-400">
          還沒有紀錄。讀完一本書就記下來，累積你的書櫃！
        </p>
      )}

      {/* 新增 */}
      {!readOnly && (
        <form onSubmit={addBook} className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <BookOpen size={16} /> 新增一本書
          </div>
          <input
            type="text"
            placeholder="書名"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="作者（可選）"
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="頁數"
              value={draft.pages}
              onChange={(e) => setDraft({ ...draft, pages: e.target.value })}
              className="w-20 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="心得（可選）"
            rows={2}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          />
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-amber-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? '新增中…' : '＋ 加進書櫃'}
          </button>
        </form>
      )}
    </div>
  );
}

function BookCard({ book, onFinish, onRate, onRemove, readOnly }) {
  return (
    <li className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800">{book.title}</div>
          <div className="text-xs text-slate-400">
            {book.author || '—'}
            {book.pages ? `・${book.pages} 頁` : ''}
            {book.finished_date ? `・讀完於 ${book.finished_date}` : '・閱讀中'}
          </div>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="rounded p-1 text-slate-300 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {book.note && <p className="mt-2 text-sm text-slate-600">{book.note}</p>}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              disabled={readOnly}
              onClick={() => onRate(n)}
              className={`flex h-9 w-9 items-center justify-center ${
                n <= (book.rating || 0) ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              <Star size={22} fill="currentColor" />
            </button>
          ))}
        </div>
        {!readOnly && !book.finished_date && (
          <button
            onClick={onFinish}
            className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white"
          >
            標記讀完 ✓
          </button>
        )}
      </div>
    </li>
  );
}
