'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toYMD } from '@/lib/date';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WD = ['一', '二', '三', '四', '五', '六', '日'];

function addMonth(y, m, delta) {
  const t = m + delta;
  return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
}

// 用「百分比 + CSS transform」做月份滑動，不量像素寬度，避免 RWD 量測時機問題。
// track 寬 300%（三個月），每個面板 33.3333%（= 一個視窗寬）。
// 平時顯示中間面板：translateX(-33.3333%)。
export default function MiniCalendar({ events = [], doneDates, todayStr, onSelectDate, compact }) {
  const today = todayStr ? new Date(todayStr + 'T00:00:00') : new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [dragPx, setDragPx] = useState(0); // 拖曳中的像素位移
  const [anim, setAnim] = useState(false);
  const [target, setTarget] = useState(null); // 'next' | 'prev' | 'back' | null
  const drag = useRef(null);
  const vp = useRef(null);

  const doneSet = doneDates instanceof Set ? doneDates : new Set(doneDates || []);

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
  // 每天的事件照開始時間排序（全天無時間者排前）
  for (const k in eventsByDate) {
    eventsByDate[k].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }

  const prev = addMonth(cursor.y, cursor.m, -1);
  const next = addMonth(cursor.y, cursor.m, 1);

  // 計算 transform：基準 -33.3333%，加上拖曳像素或動畫目標
  let transform = 'translateX(-33.3333%)';
  if (target === 'next') transform = 'translateX(-66.6666%)';
  else if (target === 'prev') transform = 'translateX(0%)';
  else if (dragPx !== 0) transform = `translateX(calc(-33.3333% + ${dragPx}px))`;

  function animateTo(dir) {
    if (anim) return;
    setAnim(true);
    setTarget(dir === 1 ? 'next' : 'prev');
  }

  function onTransitionEnd() {
    if (target === 'next') setCursor((c) => addMonth(c.y, c.m, 1));
    else if (target === 'prev') setCursor((c) => addMonth(c.y, c.m, -1));
    // 換好 cursor 後，無動畫地回到中間面板
    setAnim(false);
    setTarget(null);
    setDragPx(0);
  }

  function onTouchStart(e) {
    if (anim) return;
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, decided: false, horizontal: false };
  }
  function onTouchMove(e) {
    if (!drag.current || anim) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.current.x;
    const dy = t.clientY - drag.current.y;
    if (!drag.current.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.current.decided = true;
      drag.current.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (drag.current.horizontal) {
      e.preventDefault?.();
      setDragPx(dx);
    }
  }
  function onTouchEnd() {
    if (!drag.current) return;
    const horizontal = drag.current.horizontal;
    const dx = dragPx;
    drag.current = null;
    if (!horizontal) {
      setDragPx(0);
      return;
    }
    const w = vp.current?.clientWidth || 300;
    const threshold = Math.max(48, w * 0.22);
    if (dx <= -threshold) animateTo(1);
    else if (dx >= threshold) animateTo(-1);
    else {
      // 沒過門檻 → 彈回中間
      setAnim(true);
      setTarget('back');
      setDragPx(0);
    }
  }

  const panelProps = { eventsByDate, doneSet, todayStr, onSelectDate, compact };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-800">
          {cursor.y} 年 {MONTHS[cursor.m]}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => animateTo(-1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="上個月"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => animateTo(1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="下個月"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 星期列（固定） */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WD.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* 可滑動的月份區：viewport 全寬且裁切，track 三倍寬 */}
      <div
        ref={vp}
        className="w-full overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex pt-1"
          style={{
            width: '300%',
            transform,
            transition: anim ? 'transform 260ms ease-out' : 'none',
          }}
          onTransitionEnd={target === 'back' ? () => { setAnim(false); setTarget(null); } : onTransitionEnd}
        >
          <div style={{ width: '33.3333%' }} className="shrink-0">
            <DayGrid {...prev} {...panelProps} />
          </div>
          <div style={{ width: '33.3333%' }} className="shrink-0">
            <DayGrid {...cursor} {...panelProps} />
          </div>
          <div style={{ width: '33.3333%' }} className="shrink-0">
            <DayGrid {...next} {...panelProps} />
          </div>
        </div>
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
    <div className="grid grid-cols-7 gap-1 px-0.5">
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
                  {dayEvents[0].start_time ? `${dayEvents[0].start_time.slice(0, 5)} ` : ''}
                  {dayEvents[0].title}
                </span>
                {dayEvents.length > 1 && (
                  <span className={isToday ? 'text-white/70' : 'text-amber-500'}> +{dayEvents.length - 1}</span>
                )}
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
