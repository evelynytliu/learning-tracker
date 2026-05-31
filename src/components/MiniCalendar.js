'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toYMD } from '@/lib/date';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WD = ['一', '二', '三', '四', '五', '六', '日'];

function addMonth(y, m, delta) {
  const t = m + delta;
  return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
}

// props:
//   events, doneDates, todayStr, onSelectDate, compact
export default function MiniCalendar({ events = [], doneDates, todayStr, onSelectDate, compact }) {
  const today = todayStr ? new Date(todayStr + 'T00:00:00') : new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [w, setW] = useState(0);
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const viewport = useRef(null);
  const drag = useRef(null);
  const pending = useRef(0);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const doneSet = doneDates instanceof Set ? doneDates : new Set(doneDates || []);

  // 把事件依日期歸納（一次算好，三個月共用）
  const eventsByDate = {};
  for (const e of events) {
    const start = e.event_date;
    const end = e.end_date || e.event_date;
    let d = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (d <= endD) {
      (eventsByDate[toYMD(d)] ||= []).push(e);
      d.setDate(d.getDate() + 1);
    }
  }

  function go(dir) {
    if (!w || anim) return;
    pending.current = dir;
    setAnim(true);
    setDx(dir === 1 ? -w : w); // 滑到下一個 / 上一個面板
  }

  function onTransitionEnd() {
    if (pending.current !== 0) {
      setCursor((c) => addMonth(c.y, c.m, pending.current));
      pending.current = 0;
    }
    setAnim(false);
    setDx(0);
  }

  function onTouchStart(e) {
    if (anim) return;
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, moved: false };
  }
  function onTouchMove(e) {
    if (!drag.current) return;
    const t = e.touches[0];
    const ddx = t.clientX - drag.current.x;
    const ddy = t.clientY - drag.current.y;
    if (!drag.current.moved && Math.abs(ddx) < Math.abs(ddy)) {
      // 垂直為主 → 交給頁面捲動
      drag.current = null;
      return;
    }
    drag.current.moved = true;
    setDx(ddx);
  }
  function onTouchEnd() {
    if (!drag.current) return;
    const moved = dx;
    drag.current = null;
    const threshold = Math.max(48, w * 0.22);
    if (moved <= -threshold) go(1);
    else if (moved >= threshold) go(-1);
    else {
      setAnim(true);
      setDx(0); // 彈回
    }
  }

  const prev = addMonth(cursor.y, cursor.m, -1);
  const next = addMonth(cursor.y, cursor.m, 1);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-800">
          {cursor.y} 年 {MONTHS[cursor.m]}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => go(-1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="上個月"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="下個月"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 星期列（固定，不跟著滑） */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WD.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* 可滑動的月份區 */}
      <div
        ref={viewport}
        className="overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {w > 0 ? (
          <div
            className="flex"
            style={{
              width: w * 3,
              transform: `translateX(${-w + dx}px)`,
              transition: anim ? 'transform 260ms ease-out' : 'none',
            }}
            onTransitionEnd={onTransitionEnd}
          >
            <div style={{ width: w }}>
              <DayGrid {...prev} {...{ eventsByDate, doneSet, todayStr, onSelectDate, compact }} />
            </div>
            <div style={{ width: w }}>
              <DayGrid {...cursor} {...{ eventsByDate, doneSet, todayStr, onSelectDate, compact }} />
            </div>
            <div style={{ width: w }}>
              <DayGrid {...next} {...{ eventsByDate, doneSet, todayStr, onSelectDate, compact }} />
            </div>
          </div>
        ) : (
          <DayGrid {...cursor} {...{ eventsByDate, doneSet, todayStr, onSelectDate, compact }} />
        )}
      </div>

      <p className="mt-2 text-center text-xs text-slate-300">← 左右滑動換月 →</p>
    </div>
  );
}

function DayGrid({ y, m, eventsByDate, doneSet, todayStr, onSelectDate, compact }) {
  const first = new Date(y, m, 1);
  const startWd = (first.getDay() + 6) % 7; // 週一為 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="grid grid-cols-7 gap-1 pt-1">
      {cells.map((d, i) => {
        if (d === null) return <div key={`e${i}`} />;
        const ymd = toYMD(new Date(y, m, d));
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
  );
}
