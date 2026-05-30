-- 行事曆事件。本人與家長都可讀寫（家長可幫忙登記新生營等家庭行程）。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  end_date    date,            -- 多天事件的結束日（可空）
  note        text,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists calendar_events_user_date_idx
  on learning.calendar_events (user_id, event_date);

drop trigger if exists calendar_events_updated_at on learning.calendar_events;
create trigger calendar_events_updated_at
  before update on learning.calendar_events
  for each row execute function learning.set_updated_at();

alter table learning.calendar_events enable row level security;

drop policy if exists calendar_owner_all on learning.calendar_events;
create policy calendar_owner_all on learning.calendar_events
  for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');
