-- 第二階段 schema：課表 (class_schedule) + 每週進度 (weekly_goals)
-- 在 Supabase SQL Editor 接著 schema.sql 之後執行。
-- 一律放在 learning schema；RLS 沿用「本人可讀寫、家長可讀」的模式（多孩就緒）。

------------------------------------------------------------
-- 1. class_schedule（課表）
--    每一列 = 一週中某天某節課，會每週重複顯示。
------------------------------------------------------------
create table if not exists learning.class_schedule (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references learning.profiles(id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 1 and 7),  -- 1=週一 .. 7=週日
  period       int  not null check (period between 1 and 12),       -- 第幾節
  subject      text not null,
  start_time   time,            -- 可選：上課時間
  end_time     time,            -- 可選：下課時間
  location     text,            -- 可選：教室
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, day_of_week, period)
);

create index if not exists class_schedule_user_idx
  on learning.class_schedule (user_id, day_of_week, period);

drop trigger if exists class_schedule_updated_at on learning.class_schedule;
create trigger class_schedule_updated_at
  before update on learning.class_schedule
  for each row execute function learning.set_updated_at();

------------------------------------------------------------
-- 2. weekly_goals（每週進度 / 目標）
--    每一列 = 某一週的一個目標，可設定目標次數 target 與目前進度 progress。
------------------------------------------------------------
create table if not exists learning.weekly_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references learning.profiles(id) on delete cascade,
  week_start   date not null,                 -- 該週的週一
  title        text not null,
  target       int  not null default 1 check (target >= 1),
  progress     int  not null default 0 check (progress >= 0),
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists weekly_goals_user_week_idx
  on learning.weekly_goals (user_id, week_start);

drop trigger if exists weekly_goals_updated_at on learning.weekly_goals;
create trigger weekly_goals_updated_at
  before update on learning.weekly_goals
  for each row execute function learning.set_updated_at();

------------------------------------------------------------
-- 3. RLS
------------------------------------------------------------
alter table learning.class_schedule enable row level security;
alter table learning.weekly_goals   enable row level security;

-- class_schedule：本人可讀寫，家長可讀
drop policy if exists schedule_owner_all on learning.class_schedule;
create policy schedule_owner_all on learning.class_schedule
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists schedule_parent_read on learning.class_schedule;
create policy schedule_parent_read on learning.class_schedule
  for select using (learning.current_role() = 'parent');

-- weekly_goals：本人可讀寫，家長可讀
drop policy if exists weekly_owner_all on learning.weekly_goals;
create policy weekly_owner_all on learning.weekly_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weekly_parent_read on learning.weekly_goals;
create policy weekly_parent_read on learning.weekly_goals
  for select using (learning.current_role() = 'parent');
