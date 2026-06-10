-- 線上課程進度追蹤（大抓周學院、均一等外部平台的課）。
--   courses           一門課（名稱、平台、連結、總集數）
--   course_progress   看完的單元（每集一筆，unique 防重複）
-- 看完一集 +5 點，整合進 award_points()（source_key 用 course_id:unit_no，
-- 取消再勾不會重複發點）。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  title       text not null,
  provider    text,                          -- 平台名稱（例：大抓周學院）
  link        text,                          -- 課程網址
  emoji       text,                          -- 卡片圖示
  total_units int  not null default 0,       -- 總集數；0 = 還沒設定
  unit_label  text not null default '集',    -- 單位：集 / 堂 / 章
  sort_order  int  not null default 0,
  archived    boolean not null default false,-- 上完課收進封存，不刪紀錄
  created_at  timestamptz not null default now()
);
create index if not exists courses_user_idx
  on learning.courses (user_id, sort_order);

create table if not exists learning.course_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references learning.profiles(id) on delete cascade,
  course_id  uuid not null references learning.courses(id) on delete cascade,
  unit_no    int  not null,                  -- 第幾集（1 起算）
  done_at    timestamptz not null default now(),
  unique (course_id, unit_no)
);
create index if not exists course_progress_user_idx
  on learning.course_progress (user_id, done_at desc);

alter table learning.courses enable row level security;
alter table learning.course_progress enable row level security;

-- 跟 task_sets 一樣：學生管自己的，家長也可以幫忙建課 / 修總集數
drop policy if exists courses_rw on learning.courses;
create policy courses_rw on learning.courses for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');

drop policy if exists course_progress_rw on learning.course_progress;
create policy course_progress_rw on learning.course_progress for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');

-- ============ 自動發點（覆蓋 11_pets_points.sql 的版本，加入課程）============
create or replace function learning.award_points(p_user_id uuid, p_today date)
returns int
language plpgsql
security definer
set search_path = learning, public
as $$
declare
  v_before int;
  v_after  int;
begin
  v_before := learning.point_balance(p_user_id);

  -- 完成每日打卡：每個達標日 +10（免讀日不計，點數綁實際努力）
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 10, '完成每日打卡', 'checkin:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id
    and d.tasks_total > 0 and d.tasks_done >= d.tasks_total
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 品學堂閱讀：每天 +3
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 3, '品學堂閱讀', 'pinx:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id and d.pinxuetang_done
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 解鎖成就：每個 +30
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select ua.user_id, 30, '解鎖成就', 'ach:' || ua.achievement_key
  from learning.user_achievements ua
  where ua.user_id = p_user_id
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 讀完一本課外書：每本 +15
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select r.user_id, 15, '讀完一本書', 'book:' || r.id
  from learning.reading_log r
  where r.user_id = p_user_id and r.finished_date is not null
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 看完一集線上課程：每集 +5（用 course_id:unit_no 去重，取消再勾不重發）
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select cp.user_id, 5, '看完一集課程', 'course:' || cp.course_id || ':' || cp.unit_no
  from learning.course_progress cp
  where cp.user_id = p_user_id
  on conflict (user_id, source_key) where source_key is not null do nothing;

  v_after := learning.point_balance(p_user_id);
  return v_after - v_before;
end;
$$;
grant execute on function learning.award_points(uuid, date) to authenticated;
