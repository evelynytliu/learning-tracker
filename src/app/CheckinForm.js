'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Settings2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';
import AchievementToast from '@/components/AchievementToast';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';
import { syncDailySummary } from '@/lib/checkin-actions';
import { toYMD } from '@/lib/date';

// props:
//   userId, date
//   setName           今天套用的清單名稱（平日/假日/暑假…）
//   tasks             正規項目 [{id, label, hint, link}]（計入完成度）
//   bonusTasks        加分項目 [{id, label, hint, link}]（不計入）
//   initialDone       { [task_id]: true } 今天已完成的項目
//   initialRest       是否免讀日
//   restUsedThisWeek  本週（不含今天）已用過幾次免讀日
export default function CheckinForm({
  userId,
  date,
  setName,
  tasks = [],
  bonusTasks = [],
  initialDone = {},
  initialRest = false,
  restUsedThisWeek = 0,
}) {
  const [done, setDone] = useState(initialDone);
  const [rest, setRest] = useState(initialRest);
  const [unlocked, setUnlocked] = useState([]);
  const { status, errMsg, run } = useSaveRunner();
  // 寫入排隊：快速連點時依序送出，避免兩筆「每日摘要」互相蓋寫
  const queue = useRef(Promise.resolve());
  function enqueue(work) {
    const next = queue.current.then(work, work);
    queue.current = next.catch(() => {});
    return next;
  }

  async function checkAchievements(supabase) {
    const { data, error } = await supabase.rpc('evaluate_achievements', {
      p_user_id: userId,
      p_today: toYMD(),
    });
    if (!error && data && data.length > 0) {
      const items = data.map((k) => ACHIEVEMENT_MAP[k]).filter(Boolean);
      if (items.length > 0) setUnlocked((prev) => [...prev, ...items]);
    }
  }

  // 只用正規項目重算每日摘要（加分項不計入完成度）。
  // 同時回寫 pinxuetang_done：有勾任何名稱含「品學堂」的項目就算，
  // 讓品學堂的點數（+3/天）與徽章能正常累積。
  function syncSummary(supabase, nextDone, nextRest) {
    return syncDailySummary(supabase, {
      userId,
      date,
      tasks,
      bonusTasks,
      done: nextDone,
      rest: nextRest,
    });
  }

  function toggleTask(taskId) {
    const prevDone = done;
    const next = { ...done, [taskId]: !done[taskId] };
    setDone(next);
    run(
      () =>
        enqueue(async () => {
          const supabase = createClient();
          const r1 = await supabase.from('task_checkins').upsert(
            { user_id: userId, task_id: taskId, date, done: next[taskId] },
            { onConflict: 'user_id,task_id,date' },
          );
          if (r1.error) return r1.error;
          const r2 = await syncSummary(supabase, next, rest);
          if (r2.error) return r2.error;
          await checkAchievements(supabase);
          return null;
        }),
      { rollback: () => setDone(prevDone) },
    );
  }

  function toggleRest() {
    // 一週只有一張免讀補給牌（今天已開的可以收回）
    if (!rest && restUsedThisWeek >= 1) return;
    const prevRest = rest;
    const next = !rest;
    setRest(next);
    run(
      () =>
        enqueue(async () => {
          const supabase = createClient();
          const { error } = await syncSummary(supabase, done, next);
          if (error) return error;
          await checkAchievements(supabase);
          return null;
        }),
      { rollback: () => setRest(prevRest) },
    );
  }

  const completed = tasks.filter((t) => done[t.id]).length;
  const total = tasks.length;
  const restExhausted = !rest && restUsedThisWeek >= 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-md relative overflow-hidden">
        {/* 運動風斜線底紋 */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.015)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.015)_50%,rgba(255,255,255,0.015)_75%,transparent_75%,transparent)] bg-[length:15px_15px] opacity-40 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            挑戰擊破率 • {setName || '未配置'}
          </p>
          <p className="text-3xl font-black mt-1 text-white flex items-baseline gap-1">
            {completed} <span className="text-xs font-bold text-slate-400">/ {total} 項</span>
          </p>
        </div>
        <div className="relative z-10 flex flex-col items-end gap-1">
          <button
            onClick={toggleRest}
            disabled={restExhausted}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-black transition-all active:scale-[0.95]',
              rest
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                : restExhausted
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700',
            )}
          >
            {rest ? '⚡ 免戰補給中' : '使用免讀補給牌'}
          </button>
          {restExhausted && (
            <span className="text-[10px] font-bold text-slate-500">本週補給牌已用過</span>
          )}
        </div>
      </div>

      {total === 0 && bonusTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-slate-500">今天還沒有挑戰項目。</p>
          <Link
            href="/settings/tasks"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Settings2 size={15} /> 去設定挑戰清單
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              done={!!done[task.id]}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </ul>
      )}

      {/* 加分挑戰：來自被標記為「加分」的項目，不計入完成度 */}
      {bonusTasks.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-black text-slate-400 tracking-wider uppercase">支線挑戰</p>
          <ul className="flex flex-col gap-3">
            {bonusTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                done={!!done[task.id]}
                onToggle={() => toggleTask(task.id)}
                bonus
              />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/settings/tasks"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-bold"
        >
          <Settings2 size={13} /> 編輯任務設定
        </Link>
        <p className="text-xs text-slate-400 font-semibold">
          {status === 'saving' ? '儲存中…' : '勾選即自動儲存'}
        </p>
      </div>

      <SaveStatusPill status={status} errMsg={errMsg} />
      <AchievementToast items={unlocked} onClear={() => setUnlocked([])} />
    </div>
  );
}

function TaskItem({ task, done, onToggle, bonus }) {
  const activeBorder = bonus ? 'border-orange-500 bg-orange-50/30' : 'border-blue-600 bg-blue-50/30';
  const activeDot = bonus ? 'bg-orange-500 text-white ring-4 ring-orange-100' : 'bg-blue-600 text-white ring-4 ring-blue-100';
  const inactiveDot = 'bg-slate-100 text-slate-300 border border-slate-200';

  return (
    <li
      className={cn(
        'rounded-2xl border-2 transition-all duration-150',
        done ? activeBorder : 'border-slate-200 bg-white hover:border-slate-350',
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left active:scale-[0.98]"
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-150',
            done ? activeDot : inactiveDot,
          )}
        >
          <Check size={16} strokeWidth={4} />
        </span>
        <span className="flex-1">
          <span className={cn('block font-black text-slate-800 text-sm sm:text-base transition-colors', done && 'text-slate-900')}>{task.label}</span>
          {task.hint && <span className="block text-xs text-slate-400 mt-0.5 font-medium">{task.hint}</span>}
        </span>
      </button>
      {task.link && (
        <div className="px-5 pb-4">
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-extrabold text-white transition-all active:scale-[0.97] shadow-sm',
              bonus ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
            )}
          >
            進入挑戰 {task.label}
            <ExternalLink size={14} strokeWidth={2.5} />
          </a>
        </div>
      )}
    </li>
  );
}
