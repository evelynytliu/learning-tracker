'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { persistTaskToggle } from '@/lib/checkin-actions';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';
import AchievementToast from '@/components/AchievementToast';

// 首頁「今天要做什麼」主卡：可直接在這裡勾選，不必進打卡頁。
// 寫入走 persistTaskToggle（與打卡頁同一條路徑），存好後 router.refresh()
// 讓伺服器端的點數/連勝/金幣/勳章一起對帳更新。
export default function TodayCard({
  userId,
  date,
  setName,
  tasks = [],
  bonusTasks = [],
  initialDone = {},
  isRest = false,
  todayClasses = [],
  dueReviews = 0,
  assignmentsCount = 0,
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [unlocked, setUnlocked] = useState([]);
  const { status, errMsg, run } = useSaveRunner();

  // 寫入排隊：快速連點時依序送出，避免兩筆每日摘要互相蓋寫
  const queue = useRef(Promise.resolve());
  function enqueue(work) {
    const next = queue.current.then(work, work);
    queue.current = next.catch(() => {});
    return next;
  }

  function toggleTask(taskId) {
    const prevDone = done;
    const next = { ...done, [taskId]: !done[taskId] };
    setDone(next);
    run(
      () =>
        enqueue(async () => {
          const { error, unlocked: got } = await persistTaskToggle({
            userId,
            date,
            taskId,
            nextDone: next,
            tasks,
            bonusTasks,
            rest: isRest,
          });
          if (error) return error;
          if (got.length > 0) setUnlocked((prev) => [...prev, ...got]);
          // 讓伺服器端的點數/連勝/金幣/勳章重新對帳（client 狀態不會被重置）
          router.refresh();
          return null;
        }),
      { rollback: () => setDone(prevDone) },
    );
  }

  const completed = tasks.filter((t) => done[t.id]).length;
  const total = tasks.length;
  const remaining = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && remaining === 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-md">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black">
            📌 今天要做什麼
            {setName && (
              <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold">{setName}</span>
            )}
          </h2>
          <span className="rounded-full bg-blue-900/40 px-3 py-0.5 text-sm font-black">
            {completed}/{total || '—'}
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-blue-400/20 bg-blue-900/40 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="p-5">
        {isRest ? (
          <p className="py-4 text-center text-sm font-bold text-slate-500">😌 今天是免讀日，好好休息！</p>
        ) : total === 0 ? (
          <p className="py-4 text-center text-sm font-medium text-slate-400">
            還沒設定今天的清單，
            <Link href="/settings/tasks" className="font-bold text-blue-600">
              去設定 →
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => {
              const isDone = !!done[t.id];
              return (
                <li key={t.id}>
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all duration-150 active:scale-[0.99]',
                      isDone
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-blue-100 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150',
                        isDone
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                          : 'border-2 border-slate-300 bg-white text-transparent',
                      )}
                    >
                      <Check size={14} strokeWidth={4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm font-bold',
                          isDone ? 'text-slate-400 line-through' : 'text-slate-800',
                        )}
                      >
                        {t.label}
                      </span>
                      {t.hint && (
                        <span
                          className={cn(
                            'mt-0.5 block text-[11px] font-medium',
                            isDone ? 'text-slate-300' : 'text-slate-500',
                          )}
                        >
                          {t.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 今日時間表（從課表抓今天的時段，一行帶過）*/}
        {todayClasses.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
            <span className="text-slate-400">⏰ 今日時間</span>
            {todayClasses.map((c) => (
              <span key={c.period}>
                {c.start_time ? c.start_time.slice(0, 5) + ' ' : ''}
                {c.subject}
              </span>
            ))}
          </div>
        )}

        {/* 真有急事才跳出來 */}
        {(dueReviews > 0 || assignmentsCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dueReviews > 0 && (
              <Link
                href="/mistakes"
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
              >
                🔔 錯題 {dueReviews} 題待複習
              </Link>
            )}
            {assignmentsCount > 0 && (
              <Link
                href="/assignments"
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600"
              >
                📋 {assignmentsCount} 項作業待繳
              </Link>
            )}
          </div>
        )}

        {!isRest && total > 0 && (
          <p className="mt-4 text-center text-xs font-bold text-slate-400">
            {allDone ? '🎉 今天的項目全部完成了！' : '☝️ 直接點項目就能打勾，會自動儲存'}
          </p>
        )}

        <Link
          href="/checkin"
          className={cn(
            'mt-2 flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 font-black text-white shadow-sm transition hover:shadow-md hover:brightness-105',
            allDone
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
              : 'bg-gradient-to-r from-blue-600 to-blue-500',
          )}
        >
          {allDone
            ? '太強了！看看完整打卡頁 🏆'
            : '打開完整打卡頁（免讀牌・加分挑戰）→'}
        </Link>
      </div>

      <SaveStatusPill status={status} errMsg={errMsg} />
      <AchievementToast items={unlocked} onClear={() => setUnlocked([])} />
    </section>
  );
}
