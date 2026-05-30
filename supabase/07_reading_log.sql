-- 課外閱讀紀錄。本人可讀寫，家長可讀。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.reading_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references learning.profiles(id) on delete cascade,
  title         text not null,
  author        text,
  pages         int,
  rating        int check (rating between 1 and 5),
  note          text,
  finished_date date,                 -- null = 閱讀中
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists reading_log_user_idx
  on learning.reading_log (user_id, created_at desc);

drop trigger if exists reading_log_updated_at on learning.reading_log;
create trigger reading_log_updated_at before update on learning.reading_log
  for each row execute function learning.set_updated_at();

alter table learning.reading_log enable row level security;

drop policy if exists reading_log_owner_all on learning.reading_log;
create policy reading_log_owner_all on learning.reading_log for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reading_log_parent_read on learning.reading_log;
create policy reading_log_parent_read on learning.reading_log for select
  using (learning.current_role() = 'parent');
