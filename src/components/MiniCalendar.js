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

// 事件類型 → 顏色（格子色塊、清單左邊條、首頁小點共用）
export function eventStyle(e) {
  if (e.is_exam) return { pill: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', bar: 'border-l-rose-400' };
  if (e.end_date && e.end_date !== e.event_date)
    return { pill: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', bar: 'border-l-violet-400' };
  if (e.start_time) return { pill: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', bar: 'border-l-sky-400' };
  return { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', bar: 'border-l-amber-400' };
}

// 用「百分比 + CSS transform」做月份滑動，不量像素寬度，避免 RWD 量測時機問題。
// track 寬 300%（三個月），每個面板 33.3333%（= 一個視窗寬）。
// 平時顯示中間面板：translateX(-33.3333%)。
export default function MiniCalendar({ events = [], doneDates, todayStr, selectedDate, onSelectDate, compact }) {
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

  const panelProps = { eventsByDate, doneSet, todayStr, selectedDate, onSelectDate, compact };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-wide text-slate-800">
          {cursor.y} 年 {MONTHS[cursor.m]}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => animateTo(-1)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="上個月"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => animateTo(1)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="下個月"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 星期列（固定）；週末微微帶色 */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
        {WD.map((d, i) => (
          <div key={d} className={`py-1 ${i >= 5 ? 'text-rose-300' : 'text-slate-400'}`}>{d}</div>
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

function DayGrid({ y, m, eventsByDate, doneSet, todayStr, selectedDate, onSelectDate, compact }) {
  const first = new Date(y, m, 1);
  const startWd = (first.getDay() + 6) % 7; // 週一為 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`grid grid-cols-7 px-0.5 ${compact ? 'gap-1' : 'gap-0.5 sm:gap-1'}`}>
      {cells.map((d, i) => {
        if (d === null) return <div key={`e${i}`} />;
        const ymd = toYMD(new Date(y, m, d));
        const isToday = ymd === (todayStr || toYMD());
        const isSelected = selectedDate === ymd;
        const dayEvents = eventsByDate[ymd] || [];
        const isDone = doneSet.has(ymd);

        if (compact) {
          // 首頁迷你版：日期 + 事件彩點（最多 3 顆）
          return (
            <button
              key={ymd}
              onClick={() => onSelectDate?.(ymd)}
              className={`relative flex h-9 flex-col items-center justify-start rounded-lg py-1 text-sm transition ${
                isToday ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-0.5 leading-tight">
                {d}
                {isDone && <span className={isToday ? 'text-white' : 'text-green-500'}>·</span>}
              </span>
              {dayEvents.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className={`h-1 w-1 rounded-full ${isToday ? 'bg-white/80' : eventStyle(ev).dot}`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        }

        // 完整版（/calendar）：格子裡直接顯示事件名稱色塊
        return (
          <button
            key={ymd}
            onClick={() => onSelectDate?.(ymd)}
            className={`flex min-h-[4.6rem] flex-col items-stretch rounded-xl border p-1 text-left transition ${
              isSelected
                ? 'border-indigo-300 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-200'
                : 'border-transparent hover:bg-slate-100/80'
            }`}
          >
            <span className="flex w-full items-center justify-between px-0.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {d}
              </span>
              {isDone && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="當天打卡完成" />}
            </span>
            <span className="mt-0.5 flex w-full flex-col gap-0.5">
              {dayEvents.slice(0, 2).map((ev) => (
                <span
                  key={ev.id}
                  className={`block w-full overflow-hidden whitespace-nowrap text-clip rounded-md px-0.5 text-[10px] font-bold leading-4 sm:text-ellipsis sm:px-1 ${eventStyle(ev).pill}`}
                >
                  {ev.is_exam ? '🔥' : ''}
                  {ev.title}
                </span>
              ))}
              {dayEvents.length > 2 && (
                <span className="px-0.5 text-[9px] font-semibold text-slate-400 sm:px-1">
                  +{dayEvents.length - 2}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
