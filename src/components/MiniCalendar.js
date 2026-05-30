'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toYMD } from '@/lib/date';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WD = ['一', '二', '三', '四', '五', '六', '日'];

// props:
//   events:    [{id, title, event_date, end_date, color}]
//   doneDates: Set<string> 已完成打卡(全勾)的 YYYY-MM-DD
//   todayStr
//   onSelectDate?(ymd)
//   compact?  小尺寸（首頁用）
export default function MiniCalendar({ events = [], doneDates, todayStr, onSelectDate, compact }) {
  const today = todayStr ? new Date(todayStr + 'T00:00:00') : new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const first = new Date(cursor.y, cursor.m, 1);
  const startWd = (first.getDay() + 6) % 7; // 週一為 0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  // 把事件依日期歸納
  const eventsByDate = {};
  for (const e of events) {
    const start = e.event_date;
    const end = e.end_date || e.event_date;
    let d = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (d <= endD) {
      const k = toYMD(d);
      (eventsByDate[k] ||= []).push(e);
      d.setDate(d.getDate() + 1);
    }
  }

  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const doneSet = doneDates instanceof Set ? doneDates : new Set(doneDates || []);

  function shift(delta) {
    setCursor((c) => {
      const m = c.m + delta;
      const y = c.y + Math.floor(m / 12);
      return { y, m: ((m % 12) + 12) % 12 };
    });
  }

  // 觸控左右滑動換月（水平位移明顯大於垂直時才觸發，避免擋到上下捲動）
  const touch = useRef(null);
  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shift(dx < 0 ? 1 : -1); // 往左滑 = 下個月
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-800">
          {cursor.y} 年 {MONTHS[cursor.m]}
        </span>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => shift(1)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WD.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const ymd = toYMD(new Date(cursor.y, cursor.m, d));
          const isToday = ymd === (todayStr || toYMD());
          const dayEvents = eventsByDate[ymd] || [];
          const isDone = doneSet.has(ymd);
          return (
            <button
              key={ymd}
              onClick={() => onSelectDate?.(ymd)}
              className={`relative flex flex-col items-center rounded-lg ${
                compact ? 'h-9' : 'h-14'
              } justify-start py-1 text-sm transition ${
                isToday ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-0.5">
                {d}
                {isDone && <span className={isToday ? 'text-white' : 'text-green-500'}>·</span>}
              </span>
              {!compact && dayEvents.length > 0 && (
                <span className="mt-0.5 w-full truncate px-1 text-xs leading-tight">
                  <span
                    className={`rounded px-1 ${
                      isToday ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {dayEvents[0].title}
                  </span>
                </span>
              )}
              {compact && dayEvents.length > 0 && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
