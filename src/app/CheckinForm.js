'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Settings2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';
import AchievementToast from '@/components/AchievementToast';
import { toYMD } from '@/lib/date';

// props:
//   userId, date
//   setName      今天套用的清單名稱（平日/假日/暑假…）
//   tasks        正規項目 [{id, label, hint, link}]（計入完成度）
//   bonusTasks   加分項目 [{id, label, hint, link}]（不計入）
//   initialDone  { [task_id]: true } 今天已完成的項目
//   initialRest  是否免讀日
export default function CheckinForm({
  userId,
  date,
  setName,
  tasks = [],
  bonusTasks = [],
  initialDone = {},
  initialRest = false,
}) {
  const [done, setDone] = useState(initialDone);
  const [rest, setRest] = useState(initialRest);
  const [saving, startSaving] = useTransition();
  const [unlocked, setUnlocked] = useState([]);

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

  // 只用正規項目重算每日摘要（加分項不計入）
  function syncSummary(nextDone, nextRest) {
    const doneCount = tasks.filter((t) => nextDone[t.id]).length;
    const supabase = createClient();
    return supabase.from('daily_checkins').upsert(
      {
        user_id: userId,
        date,
        is_rest_day: nextRest,
        tasks_total: tasks.length,
        tasks_done: doneCount,
      },
      { onConflict: 'user_id,date' },
    );
  }

  function toggleTask(taskId) {
    const next = { ...done, [taskId]: !done[taskId] };
    setDone(next);
    startSaving(async () => {
      const supabase = createClient();
      await supabase.from('task_checkins').upsert(
        { user_id: userId, task_id: taskId, date, done: next[taskId] },
        { onConflict: 'user_id,task_id,date' },
      );
      await syncSummary(next, rest);
      await checkAchievements(supabase);
    });
  }

  function toggleRest() {
    const next = !rest;
    setRest(next);
    startSaving(async () => {
      const supabase = createClient();
      await syncSummary(done, next);
      await checkAchievements(supabase);
    });
  }

  const completed = tasks.filter((t) => done[t.id]).length;
  const total = tasks.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-indigo-50 px-5 py-4">
        <div>
          <p className="text-xs text-indigo-900/70">
            今日進度・<span className="font-medium">{setName || '未設定清單'}</span>
          </p>
          <p className="text-2xl font-bold text-indigo-900">
            {completed} / {total}
          </p>
        </div>
        <button
          onClick={toggleRest}
          className={cn(
            'rounded-full px-3 py-1 text-xs',
            rest ? 'bg-amber-500 text-white' : 'bg-white text-slate-600',
          )}
        >
          {rest ? '免讀日 ✓' : '使用免讀日'}
        </button>
      </div>

      {total === 0 && bonusTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-slate-500">今天還沒有打卡項目。</p>
          <Link
            href="/settings/tasks"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Settings2 size={15} /> 去設定打卡清單
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
          <p className="mb-2 text-xs font-semibold text-slate-400">加分挑戰</p>
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
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <Settings2 size={13} /> 編輯打卡清單
        </Link>
        <p className="text-xs text-slate-400">{saving ? '儲存中…' : '已自動儲存'}</p>
      </div>

      <AchievementToast items={unlocked} onClear={() => setUnlocked([])} />
    </div>
  );
}

function TaskItem({ task, done, onToggle, bonus }) {
  const activeBorder = bonus ? 'border-violet-400 bg-violet-50' : 'border-green-500 bg-green-50';
  const activeDot = bonus ? 'bg-violet-500' : 'bg-green-500';
  return (
    <li
      className={cn(
        'rounded-2xl border-2 transition',
        done ? activeBorder : 'border-slate-200 bg-white',
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left active:scale-[0.98]"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            done ? `${activeDot} text-white` : 'bg-slate-100 text-slate-300',
          )}
        >
          <Check size={20} strokeWidth={3} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{task.label}</span>
          {task.hint && <span className="block text-xs text-slate-500">{task.hint}</span>}
        </span>
      </button>
      {task.link && (
        <a
          href={task.link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'mx-4 mb-4 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white',
            bonus ? 'bg-violet-600' : 'bg-indigo-600',
          )}
        >
          前往 {task.label}
          <ExternalLink size={15} />
        </a>
      )}
    </li>
  );
}
