'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CHECKIN_TASKS, cn } from '@/lib/utils';

const EMPTY = {
  homework_done: false,
  platform_task_done: false,
  english_input_done: false,
  math_practice_done: false,
  reading_done: false,
  is_rest_day: false,
};

export default function CheckinForm({ initialRow, userId, date }) {
  const [row, setRow] = useState(initialRow || { ...EMPTY, user_id: userId, date });
  const [saving, startSaving] = useTransition();

  function toggle(key) {
    const next = { ...row, [key]: !row[key] };
    setRow(next);
    startSaving(async () => {
      const supabase = createClient();
      await supabase
        .from('daily_checkins')
        .upsert(
          { ...next, user_id: userId, date },
          { onConflict: 'user_id,date' },
        );
    });
  }

  const completed = CHECKIN_TASKS.filter((t) => row[t.key]).length;
  const total = CHECKIN_TASKS.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-blue-50 px-5 py-4">
        <div>
          <p className="text-xs text-blue-900/70">今日進度</p>
          <p className="text-2xl font-bold text-blue-900">{completed} / {total}</p>
        </div>
        <button
          onClick={() => toggle('is_rest_day')}
          className={cn(
            'rounded-full px-3 py-1 text-xs',
            row.is_rest_day ? 'bg-amber-500 text-white' : 'bg-white text-gray-600',
          )}
        >
          {row.is_rest_day ? '免讀日 ✓' : '使用免讀日'}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {CHECKIN_TASKS.map((task) => {
          const done = row[task.key];
          const isReadingOnRest = task.key === 'reading_done' && row.is_rest_day;
          return (
            <li key={task.key}>
              <button
                onClick={() => toggle(task.key)}
                disabled={isReadingOnRest}
                className={cn(
                  'flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.98]',
                  done
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white',
                  isReadingOnRest && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300',
                  )}
                >
                  <Check size={20} strokeWidth={3} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{task.label}</span>
                  <span className="block text-xs text-gray-500">{task.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-xs text-gray-400">
        {saving ? '儲存中…' : '已自動儲存'}
      </p>
    </div>
  );
}
