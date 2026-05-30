'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, BookOpen, ExternalLink, Settings2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { EXTERNAL_LINKS } from '@/lib/links';
import { ACHIEVEMENT_MAP } from '@/lib/achievements';
import AchievementToast from '@/components/AchievementToast';
import { toYMD } from '@/lib/date';

// props:
//   userId, date
//   setName      今天套用的清單名稱（平日/假日/暑假…）
//   tasks        今天清單的項目 [{id, label, hint}]
//   initialDone  { [task_id]: true } 今天已完成的項目
//   initialRest  是否免讀日
//   pinxuetangDone
export default function CheckinForm({
  userId,
  date,
  setName,
  tasks = [],
  initialDone = {},
  initialRest = false,
  pinxuetangDone = false,
}) {
  const [done, setDone] = useState(initialDone);
  const [rest, setRest] = useState(initialRest);
  const [pinx, setPinx] = useState(pinxuetangDone);
  const [saving, startSaving] = useTransition();
  const [unlocked, setUnlocked] = useState([]);

  // 打卡後評估徽章；新解鎖的跳 toast
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

  const total = tasks.length;
  const completed = tasks.filter((t) => done[t.id]).length;

  // 把每日摘要寫回 daily_checkins（streak / 儀表板用）
  function syncSummary(nextDone, nextRest, nextPinx) {
    const doneCount = tasks.filter((t) => nextDone[t.id]).length;
    const supabase = createClient();
    return supabase.from('daily_checkins').upsert(
      {
        user_id: userId,
        date,
        is_rest_day: nextRest,
        pinxuetang_done: nextPinx,
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
      await syncSummary(next, rest, pinx);
      await checkAchievements(supabase);
    });
  }

  function toggleRest() {
    const next = !rest;
    setRest(next);
    startSaving(async () => {
      const supabase = createClient();
      await syncSummary(done, next, pinx);
      await checkAchievements(supabase);
    });
  }

  function togglePinx() {
    const next = !pinx;
    setPinx(next);
    startSaving(async () => {
      const supabase = createClient();
      await syncSummary(done, rest, next);
      await checkAchievements(supabase);
    });
  }

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

      {total === 0 ? (
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
          {tasks.map((task) => {
            const isDone = !!done[task.id];
            return (
              <li key={task.id}>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.98]',
                    isDone ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300',
                    )}
                  >
                    <Check size={20} strokeWidth={3} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{task.label}</span>
                    {task.hint && (
                      <span className="block text-xs text-slate-500">{task.hint}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* 品學堂閱讀素養 — 加分項，不計入核心完成度 */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold text-slate-400">加分挑戰</p>
        <div
          className={cn(
            'rounded-2xl border-2 p-4 transition',
            pinx ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white',
          )}
        >
          <button
            onClick={togglePinx}
            className="flex w-full items-center gap-4 text-left active:scale-[0.98]"
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                pinx ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-300',
              )}
            >
              <BookOpen size={18} strokeWidth={2.5} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">品學堂閱讀素養</span>
              <span className="block text-xs text-slate-500">
                每天一篇，練閱讀理解（純加分）
              </span>
            </span>
          </button>
          <a
            href={EXTERNAL_LINKS.pinxuetang}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white"
          >
            前往品學堂讀一篇
            <ExternalLink size={15} />
          </a>
        </div>
      </div>

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
