-- 品學堂閱讀素養：每日打卡的「加分項」欄位
-- 不列入核心 5 項打卡完成度（不影響 5/5 與連續天數計算）。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

alter table learning.daily_checkins
  add column if not exists pinxuetang_done boolean not null default false;
