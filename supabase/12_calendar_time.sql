-- 行事曆事件加上「時間」欄位（可空 = 全天事件）。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

alter table learning.calendar_events
  add column if not exists start_time time,
  add column if not exists end_time time;
