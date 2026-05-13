import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CHECKIN_TASKS = [
  { key: 'homework_done',       label: '作業寫完',    hint: '學校作業' },
  { key: 'platform_task_done',  label: '平台任務',    hint: '均一 / 翰林雲端' },
  { key: 'english_input_done',  label: '英文輸入',    hint: 'ePop 或 Duolingo（擇一）' },
  { key: 'math_practice_done',  label: '數學題庫',    hint: '紙本評量 or 線上題庫' },
  { key: 'reading_done',        label: '閱讀 20 分鐘', hint: '課外書（漫畫、課本不算）' },
];

export const SUBJECTS = ['國文', '英文', '數學', '理化', '社會'];
export const MISTAKE_REASONS = ['粗心', '不懂概念', '題意看不懂', '計算錯誤'];

export function isCheckinComplete(row) {
  if (!row) return false;
  if (row.is_rest_day) {
    return row.homework_done && row.platform_task_done && row.english_input_done && row.math_practice_done;
  }
  return CHECKIN_TASKS.every((t) => row[t.key]);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
