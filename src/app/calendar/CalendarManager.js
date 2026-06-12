'use client';

import { useState } from 'react';
import { Trash2, Clock, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MiniCalendar, { eventStyle } from '@/components/MiniCalendar';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

const EMPTY = { title: '', event_date: '', end_date: '', start_time: '', end_time: '', note: '', is_exam: false, exam_subjects: [] };

const EXAM_SUBJECTS = ['國文', '英文', '數學', '理化', '社會'];

function fmtDay(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日（${wd}）`;
}

export default function CalendarManager({ userId, initialEvents, doneDates, todayStr, canEdit }) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState(todayStr);
  const [draft, setDraft] = useState({ ...EMPTY, event_date: todayStr });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const { status, errMsg, run } = useSaveRunner();

  const selectedEvents = events
    .filter((e) => {
      const start = e.event_date;
      const end = e.end_date || e.event_date;
      return selected >= start && selected <= end;
    })
    // 全天（無時間）排前面，其餘照開始時間
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

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
    if (draft.start_time && draft.end_time && draft.end_time < draft.start_time) {
      setErr('結束時間不能早於開始時間');
      return;
    }
    if (draft.end_date && draft.end_date < draft.event_date) {
      setErr('結束日不能早於開始日');
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      user_id: userId,
      title: draft.title.trim(),
      event_date: draft.event_date,
      end_date: draft.end_date || null,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      note: draft.note.trim() || null,
      is_exam: !!draft.is_exam,
      exam_subjects: draft.is_exam ? draft.exam_subjects : [],
    };
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select()
        .single();
      created = data;
      return error;
    });
    setBusy(false);
    if (!ok) return;
    setEvents((prev) => [...prev, created]);
    setDraft({ ...EMPTY, event_date: selected });
  }

  async function deleteEvent(id) {
    const prev = events;
    setEvents((p) => p.filter((e) => e.id !== id));
    const supabase = createClient();
    await run(
      async () => (await supabase.from('calendar_events').delete().eq('id', id)).error,
      { rollback: () => setEvents(prev) },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-4">
        <MiniCalendar
          events={events}
          doneDates={doneDates}
          todayStr={todayStr}
          selectedDate={selected}
          onSelectDate={selectDate}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />打卡完成</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" />段考</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet-400" />跨天活動</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-400" />定時行程</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />全天行程</span>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-800">
          <CalendarDays size={18} className="text-blue-600" />
          {fmtDay(selected)} 的行程
          {selected === todayStr && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-600">今天</span>
          )}
        </h2>
        <ul className="flex flex-col gap-2">
          {selectedEvents.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
              這天還沒有行程
            </li>
          )}
          {selectedEvents.map((e) => {
            const multiDay = e.end_date && e.end_date !== e.event_date;
            const timed = !!e.start_time;
            return (
              <li
                key={e.id}
                className={`flex items-stretch gap-3 overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white p-3 shadow-sm ${eventStyle(e).bar}`}
              >
                {/* 時間欄 */}
                <div
                  className={`flex w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center ${
                    timed ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {timed ? (
                    <>
                      <span className="text-sm font-black leading-tight">{e.start_time.slice(0, 5)}</span>
                      {e.end_time && (
                        <span className="text-[10px] font-medium text-blue-400">
                          ~{e.end_time.slice(0, 5)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-bold">全天</span>
                  )}
                </div>
                {/* 內容 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    {e.title}
                    {e.is_exam && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                        🔥 段考{e.exam_subjects?.length ? `・${e.exam_subjects.join('')}` : ''}
                      </span>
                    )}
                  </div>
                  {multiDay && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <CalendarDays size={12} />
                      {e.event_date.slice(5)} ~ {e.end_date.slice(5)}
                    </div>
                  )}
                  {e.note && <div className="mt-1 text-sm text-slate-500">{e.note}</div>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="flex-shrink-0 self-start rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-400"
                    aria-label="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {canEdit && (
          <form onSubmit={addEvent} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 text-sm font-bold text-slate-700">新增行程</div>
            <input
              type="text"
              placeholder="事件名稱（例：段考、社團、看牙醫）"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 flex items-center gap-2">
              <label className="flex w-14 items-center gap-1 text-xs font-medium text-slate-500">
                <CalendarDays size={13} /> 日期
              </label>
              <input
                type="date"
                value={draft.event_date}
                onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <label className="flex w-14 items-center gap-1 text-xs font-medium text-slate-500">
                <Clock size={13} /> 時間
              </label>
              <input
                type="time"
                value={draft.start_time}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
              />
              <span className="text-xs text-slate-400">至</span>
              <input
                type="time"
                value={draft.end_time}
                onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <p className="mt-1 pl-16 text-[11px] text-slate-400">時間留空 = 全天事件</p>

            <div className="mt-2 flex items-center gap-2">
              <label className="w-14 text-xs font-medium text-slate-500">結束日</label>
              <input
                type="date"
                value={draft.end_date}
                onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
              />
              <span className="text-xs text-slate-400">跨多天才填</span>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={draft.is_exam}
                onChange={(e) => setDraft({ ...draft, is_exam: e.target.checked })}
                className="h-4 w-4 accent-rose-500"
              />
              🔥 這是段考／大考（考前 7 天自動啟動錯題衝刺）
            </label>
            {draft.is_exam && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                {EXAM_SUBJECTS.map((sub) => {
                  const on = draft.exam_subjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          exam_subjects: on
                            ? draft.exam_subjects.filter((x) => x !== sub)
                            : [...draft.exam_subjects, sub],
                        })
                      }
                      className={`chip px-3 py-1.5 text-xs ${on ? 'chip-on' : ''}`}
                    >
                      {sub}
                    </button>
                  );
                })}
                <span className="self-center text-[10px] text-slate-400">不選 = 全科</span>
              </div>
            )}

            <input
              type="text"
              placeholder="備註（可選）"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {err && <p className="mt-2 text-sm font-medium text-red-500">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? '新增中…' : '＋ 新增行程'}
            </button>
          </form>
        )}
      </div>

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}
