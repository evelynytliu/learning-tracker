'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Flag, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toYMD } from '@/lib/date';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

const DURATIONS = [15, 25, 45];
const SUBJECTS = ['國文', '英文', '數學', '理化', '社會', '其他'];

// 圓形進度環的幾何參數
const SIZE = 248;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

// timestamptz → 台灣時間 HH:MM
function fmtHM(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 番茄鐘：選時長＋（可選）科目 → 倒數 → 完成寫入 focus_sessions 並結算點數。
// 計時用「絕對結束時間」每次 tick 重算，分頁被丟到背景也不會慢掉。
export default function FocusTimer({
  userId,
  initialTodayMinutes,
  initialWeekMinutes,
  initialSessions,
}) {
  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [endAt, setEndAt] = useState(null); // 絕對結束時間（ms）
  const [remainingMs, setRemainingMs] = useState(0);
  const [todayMin, setTodayMin] = useState(initialTodayMinutes);
  const [weekMin, setWeekMin] = useState(initialWeekMinutes);
  const [sessions, setSessions] = useState(initialSessions);
  const finishedRef = useRef(false); // 防止 tick 與 visibilitychange 重複結算
  const supabase = createClient();
  const { status, errMsg, run } = useSaveRunner();

  useEffect(() => {
    if (phase !== 'running' || !endAt) return;
    const tick = () => {
      const left = endAt - Date.now();
      if (left <= 0) finish();
      else setRemainingMs(left);
    };
    tick();
    const id = setInterval(tick, 500);
    // 切回分頁時立刻重新對時，避免背景分頁 timer 被瀏覽器降頻造成顯示落後
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endAt]);

  function start() {
    finishedRef.current = false;
    setEndAt(Date.now() + minutes * 60e3);
    setRemainingMs(minutes * 60e3);
    setPhase('running');
  }

  function giveUp() {
    if (!confirm('真的要放棄這次專注嗎？這次不會留下紀錄。')) return;
    setEndAt(null);
    setPhase('idle');
  }

  function resetToIdle() {
    setEndAt(null);
    setPhase('idle');
  }

  async function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setRemainingMs(0);
    setPhase('done');

    // 樂觀更新本頁統計與最近紀錄
    const startedAt = new Date((endAt ?? Date.now()) - minutes * 60e3).toISOString();
    setTodayMin((v) => v + minutes);
    setWeekMin((v) => v + minutes);
    setSessions((s) =>
      [{ id: `tmp-${Date.now()}`, subject, minutes, started_at: startedAt }, ...s].slice(0, 10),
    );

    const ok = await run(
      async () =>
        (
          await supabase
            .from('focus_sessions')
            .insert({ user_id: userId, subject, minutes })
        ).error,
    );
    // 點數結算（idempotent，多叫無害）；fire-and-forget
    if (ok) supabase.rpc('award_points', { p_user_id: userId, p_today: toYMD() }).then(() => {});
  }

  // 倒數顯示與圓環比例
  const totalMs = minutes * 60e3;
  const shownMs = phase === 'running' ? remainingMs : phase === 'done' ? 0 : totalMs;
  const totalSec = Math.max(0, Math.ceil(shownMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const frac = phase === 'done' ? 0 : Math.max(0, Math.min(1, shownMs / totalMs));

  return (
    <div className="flex flex-col gap-4">
      {/* 統計列 */}
      <div className="card flex items-center justify-around gap-3 p-4 text-center">
        <div>
          <p className="section-label">今日專注</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {todayMin}
            <span className="ml-1 text-xs font-bold text-slate-400">分鐘</span>
          </p>
        </div>
        <div>
          <p className="section-label">本週專注</p>
          <p className="mt-1 text-2xl font-black text-gradient">
            {weekMin}
            <span className="ml-1 text-xs font-bold text-slate-400">分鐘</span>
          </p>
        </div>
      </div>

      {/* 計時器 */}
      <div className="card p-5">
        {phase === 'idle' && (
          <>
            <p className="section-label mb-2">這次要專注多久？</p>
            <div className="flex gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`chip flex-1 py-2.5 text-sm ${minutes === m ? 'chip-on' : ''}`}
                  aria-pressed={minutes === m}
                >
                  {m} 分鐘
                </button>
              ))}
            </div>

            <p className="section-label mb-2 mt-4">科目（可不選）</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(subject === s ? null : s)}
                  className={`chip px-4 py-2 text-sm ${subject === s ? 'chip-on' : ''}`}
                  aria-pressed={subject === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 圓形倒數環 */}
        <div className="relative mx-auto mt-5" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <defs>
              <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="#eef2ff"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="url(#focusGrad)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - frac)}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'done' ? (
              <div className="animate-pop text-center">
                <p className="text-5xl">🎉</p>
                <p className="mt-2 text-xl font-black text-gradient">+5 點入袋！</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  專注 {minutes} 分鐘完成
                </p>
              </div>
            ) : (
              <>
                <p className="text-5xl font-black tabular-nums tracking-tight text-slate-900">
                  {mm}:{ss}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {subject ? `${subject}・` : ''}
                  {minutes} 分鐘
                </p>
              </>
            )}
          </div>
        </div>

        {/* 動作區 */}
        <div className="mt-5">
          {phase === 'idle' && (
            <button onClick={start} className="btn btn-primary w-full py-3.5 text-base">
              <Play size={18} strokeWidth={2.5} /> 開始專注
            </button>
          )}
          {phase === 'running' && (
            <>
              <button
                onClick={giveUp}
                className="btn btn-ghost w-full py-3 text-rose-500 hover:bg-rose-50"
              >
                <Flag size={15} /> 放棄這次
              </button>
              <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                離開頁面計時會繼續，但完成時要回來這頁領點數
              </p>
            </>
          )}
          {phase === 'done' && (
            <button onClick={resetToIdle} className="btn btn-primary w-full py-3.5 text-base">
              <RotateCcw size={16} /> 再來一輪
            </button>
          )}
        </div>
      </div>

      {/* 最近紀錄 */}
      <section className="card p-4">
        <p className="section-label mb-3">最近的專注</p>
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">還沒有紀錄，按「開始專注」累積第一筆！</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-12 font-semibold tabular-nums text-slate-400">
                  {fmtHM(s.started_at)}
                </span>
                <span className="chip px-2.5 py-0.5 text-xs">{s.subject || '未指定'}</span>
                <span className="ml-auto font-bold text-slate-600">{s.minutes} 分鐘</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}
