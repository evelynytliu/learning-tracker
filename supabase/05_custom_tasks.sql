-- 可自訂的每日打卡系統。
--   task_sets      打卡清單（平日 / 假日 / 暑假 / 考試週…），weekdays 決定自動套用的星期
--   tasks          清單裡的項目
--   special_periods 特殊期間，在某段日期區間覆蓋星期預設
--   task_checkins  每項每日完成紀錄
-- daily_checkins 加 tasks_total / tasks_done 兩個摘要欄位，streak 與儀表板沿用。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.task_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  name        text not null,
  weekdays    int[] not null default '{}',   -- 1=週一..7=週日
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists task_sets_user_idx on learning.task_sets (user_id, sort_order);

create table if not exists learning.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  set_id      uuid not null references learning.task_sets(id) on delete cascade,
  label       text not null,
  hint        text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_set_idx on learning.tasks (set_id, sort_order);

create table if not exists learning.special_periods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references learning.profiles(id) on delete cascade,
  name         text not null,
  task_set_id  uuid not null references learning.task_sets(id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  weekdays     int[] not null default '{}',  -- 空=整段每天；有值=只在這段日期的這些星期(1=週一..7=週日)
  created_at   timestamptz not null default now()
);
create index if not exists special_periods_user_idx on learning.special_periods (user_id, start_date);

create table if not exists learning.task_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  task_id     uuid not null references learning.tasks(id) on delete cascade,
  date        date not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, task_id, date)
);
create index if not exists task_checkins_user_date_idx on learning.task_checkins (user_id, date);

alter table learning.daily_checkins add column if not exists tasks_total int not null default 0;
alter table learning.daily_checkins add column if not exists tasks_done  int not null default 0;

drop trigger if exists task_sets_updated_at on learning.task_sets;
create trigger task_sets_updated_at before update on learning.task_sets
  for each row execute function learning.set_updated_at();
drop trigger if exists tasks_updated_at on learning.tasks;
create trigger tasks_updated_at before update on learning.tasks
  for each row execute function learning.set_updated_at();
drop trigger if exists task_checkins_updated_at on learning.task_checkins;
create trigger task_checkins_updated_at before update on learning.task_checkins
  for each row execute function learning.set_updated_at();

alter table learning.task_sets        enable row level security;
alter table learning.tasks            enable row level security;
alter table learning.special_periods  enable row level security;
alter table learning.task_checkins    enable row level security;

drop policy if exists task_sets_rw on learning.task_sets;
create policy task_sets_rw on learning.task_sets for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');

drop policy if exists tasks_rw on learning.tasks;
create policy tasks_rw on learning.tasks for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');

drop policy if exists special_periods_rw on learning.special_periods;
create policy special_periods_rw on learning.special_periods for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');

-- 完成紀錄：學生本人可讀寫，家長只能讀（避免代填打卡）
drop policy if exists task_checkins_owner_all on learning.task_checkins;
create policy task_checkins_owner_all on learning.task_checkins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists task_checkins_parent_read on learning.task_checkins;
create policy task_checkins_parent_read on learning.task_checkins for select
  using (learning.current_role() = 'parent');
