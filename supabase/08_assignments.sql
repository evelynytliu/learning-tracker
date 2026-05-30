-- 長期作業（暑假作業、專題報告…）。跨多天的「交付項目」，有別於每日打卡。
-- 本人與家長都可讀寫（家長可幫忙登記學校交代的作業）。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  title       text not null,
  category    text,                 -- 自由分類：暑假作業 / 報告 / 其他
  note        text,
  due_date    date,
  done        boolean not null default false,
  done_at     timestamptz,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists assignments_user_idx
  on learning.assignments (user_id, done, due_date);

drop trigger if exists assignments_updated_at on learning.assignments;
create trigger assignments_updated_at before update on learning.assignments
  for each row execute function learning.set_updated_at();

alter table learning.assignments enable row level security;

drop policy if exists assignments_rw on learning.assignments;
create policy assignments_rw on learning.assignments for all
  using (user_id = auth.uid() or learning.current_role() = 'parent')
  with check (user_id = auth.uid() or learning.current_role() = 'parent');
