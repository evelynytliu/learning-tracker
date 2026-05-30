'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MiniCalendar from '@/components/MiniCalendar';
import { toYMD } from '@/lib/date';

export default function CalendarManager({ userId, initialEvents, doneDates, todayStr, canEdit }) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState(todayStr);
  const [draft, setDraft] = useState({ title: '', event_date: todayStr, end_date: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const supabase = createClient();
  const selectedEvents = events
    .filter((e) => {
      const start = e.event_date;
      const end = e.end_date || e.event_date;
      return selected >= start && selected <= end;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  function selectDate(ymd) {
    setSelected(ymd);
    setDraft((d) => ({ ...d, event_date: ymd }));
  }

  async function addEvent(e) {
    e.preventDefault();
    setErr(null);
    if (!draft.title.trim()) {
      setErr('請輸入事件名稱');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: userId,
      title: draft.title.trim(),
      event_date: draft.event_date,
      end_date: draft.end_date || null,
      note: draft.note.trim() || null,
    };
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(payload)
      .select()
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setEvents((prev) => [...prev, data]);
    setDraft({ title: '', event_date: selected, end_date: '', note: '' });
  }

  async function deleteEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('calendar_events').delete().eq('id', id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <MiniCalendar
          events={events}
          doneDates={doneDates}
          todayStr={todayStr}
          onSelectDate={selectDate}
        />
        <p className="mt-3 text-xs text-slate-400">· 綠點 = 當天打卡完成　· 黃底 = 有行程</p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-800">{selected} 的行程</h2>
        <ul className="flex flex-col gap-2">
          {selectedEvents.length === 0 && (
            <li className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-400">
              這天還沒有行程
            </li>
          )}
          {selectedEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-slate-800">{e.title}</div>
                <div className="text-xs text-slate-400">
                  {e.event_date}
                  {e.end_date && e.end_date !== e.event_date ? ` ~ ${e.end_date}` : ''}
                </div>
                {e.note && <div className="mt-1 text-sm text-slate-500">{e.note}</div>}
              </div>
              {canEdit && (
                <button
                  onClick={() => deleteEvent(e.id)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <form onSubmit={addEvent} className="mt-4 rounded-xl border bg-slate-50 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-600">新增行程</div>
            <input
              type="text"
              placeholder="事件名稱（例：新生營）"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="w-12 text-xs text-slate-500">日期</label>
              <input
                type="date"
                value={draft.event_date}
                onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
                className="flex-1 rounded-lg border px-2 py-2 text-sm"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="w-12 text-xs text-slate-500">結束</label>
              <input
                type="date"
                value={draft.end_date}
                onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                className="flex-1 rounded-lg border px-2 py-2 text-sm"
              />
              <span className="text-xs text-slate-400">多天才填</span>
            </div>
            <input
              type="text"
              placeholder="備註（可選）"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? '新增中…' : '＋ 新增行程'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
