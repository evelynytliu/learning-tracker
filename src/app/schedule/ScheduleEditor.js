'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DAY_LABELS, isoDayOfWeek } from '@/lib/date';

export default function ScheduleEditor({ userId, initial, readOnly }) {
  const [rows, setRows] = useState(initial);
  const [day, setDay] = useState(isoDayOfWeek());
  const [draft, setDraft] = useState({ period: '', subject: '', start_time: '', end_time: '', location: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const supabase = createClient();
  const dayRows = rows.filter((r) => r.day_of_week === day).sort((a, b) => a.period - b.period);

  async function addRow(e) {
    e.preventDefault();
    setErr(null);
    const period = parseInt(draft.period, 10);
    if (!period || !draft.subject.trim()) {
      setErr('請填第幾節和科目');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: userId,
      day_of_week: day,
      period,
      subject: draft.subject.trim(),
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      location: draft.location.trim() || null,
    };
    const { data, error } = await supabase
      .from('class_schedule')
      .upsert(payload, { onConflict: 'user_id,day_of_week,period' })
      .select()
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRows((prev) => [...prev.filter((r) => r.id !== data.id && !(r.day_of_week === day && r.period === period)), data]);
    setDraft({ period: '', subject: '', start_time: '', end_time: '', location: '' });
  }

  async function deleteRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from('class_schedule').delete().eq('id', id);
  }

  return (
    <div>
      {/* 星期切換 */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAY_LABELS.map((label, i) => {
          const d = i + 1;
          const active = d === day;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm ${
                active ? 'bg-blue-600 font-semibold text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 當日課程 */}
      <ul className="mt-4 flex flex-col gap-2">
        {dayRows.length === 0 && (
          <li className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-400">
            {DAY_LABELS[day - 1]}還沒有課
          </li>
        )}
        {dayRows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
              {r.period}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.subject}</div>
              <div className="text-xs text-gray-400">
                {r.start_time ? r.start_time.slice(0, 5) : ''}
                {r.end_time ? `–${r.end_time.slice(0, 5)}` : ''}
                {r.location ? `　${r.location}` : ''}
              </div>
            </div>
            {!readOnly && (
              <button
                onClick={() => deleteRow(r.id)}
                className="flex-shrink-0 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-50"
              >
                刪除
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* 新增課程 */}
      {!readOnly && (
        <form onSubmit={addRow} className="mt-4 rounded-xl border bg-gray-50 p-4">
          <div className="mb-2 text-sm font-semibold text-gray-600">
            新增 {DAY_LABELS[day - 1]} 的課
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="12"
              placeholder="節"
              value={draft.period}
              onChange={(e) => setDraft({ ...draft, period: e.target.value })}
              className="w-16 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="科目（例：數學）"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="time"
              value={draft.start_time}
              onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
              className="flex-1 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              type="time"
              value={draft.end_time}
              onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              className="flex-1 rounded-lg border px-2 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="教室"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              className="w-20 rounded-lg border px-2 py-2 text-sm"
            />
          </div>
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? '新增中…' : '＋ 新增課程'}
          </button>
        </form>
      )}
    </div>
  );
}
