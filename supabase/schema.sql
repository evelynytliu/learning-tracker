-- 學習進度管理 Web App - Supabase Schema
-- 在 Supabase SQL Editor 一次跑完即可建立完整資料庫
-- 順序：schema -> tables -> indexes -> RLS policies -> storage bucket
--
-- 注意：本應用所有 table 都放在 `learning` schema，避免和同一個 Supabase
-- 專案中的其他 app（例如 points-bank 用 public schema）衝突。
-- 跑完後請到 Supabase Dashboard > Settings > API > Exposed schemas，
-- 把 `learning` 加進去，前端 JS client 才連得到。

------------------------------------------------------------
-- 0. schema
------------------------------------------------------------
create schema if not exists learning;
grant usage on schema learning to anon, authenticated, service_role;
alter default privileges in schema learning
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema learning
  grant usage, select on sequences to authenticated;

------------------------------------------------------------
-- 1. profiles
------------------------------------------------------------
create table if not exists learning.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('student', 'parent')),
  display_name  text not null,
  created_at    timestamptz not null default now()
);

------------------------------------------------------------
-- 2. daily_checkins
------------------------------------------------------------
create table if not exists learning.daily_checkins (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references learning.profiles(id) on delete cascade,
  date                date not null,
  homework_done       boolean not null default false,
  platform_task_done  boolean not null default false,
  english_input_done  boolean not null default false,
  math_practice_done  boolean not null default false,
  reading_done        boolean not null default false,
  is_rest_day         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_checkins_user_date_idx
  on learning.daily_checkins (user_id, date desc);

-- 自動更新 updated_at
create or replace function learning.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_checkins_updated_at on learning.daily_checkins;
create trigger daily_checkins_updated_at
  before update on learning.daily_checkins
  for each row execute function learning.set_updated_at();

------------------------------------------------------------
-- 3. mistakes
------------------------------------------------------------
create table if not exists learning.mistakes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references learning.profiles(id) on delete cascade,
  subject      text not null check (subject in ('國文','英文','數學','理化','社會')),
  description  text,
  image_url    text,
  reason       text not null check (reason in ('粗心','不懂概念','題意看不懂','計算錯誤')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists mistakes_user_created_idx
  on learning.mistakes (user_id, created_at desc);

------------------------------------------------------------
-- 4. monthly_reviews
------------------------------------------------------------
create table if not exists learning.monthly_reviews (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references learning.profiles(id) on delete cascade,
  month                     date not null,  -- 月份第一天
  homework_completion_rate  numeric(5,2) not null,
  mistake_log_count         int not null,
  practice_completion_rate  numeric(5,2) not null,
  passed                    boolean not null,
  generated_at              timestamptz not null default now(),
  unique (user_id, month)
);

------------------------------------------------------------
-- 5. RLS
------------------------------------------------------------
alter table learning.profiles        enable row level security;
alter table learning.daily_checkins  enable row level security;
alter table learning.mistakes        enable row level security;
alter table learning.monthly_reviews enable row level security;

-- helper: 取得目前登入者的 role
create or replace function learning.current_role()
returns text
language sql
stable
security definer
set search_path = learning, public
as $$
  select role from learning.profiles where id = auth.uid();
$$;

grant execute on function learning.current_role() to anon, authenticated;

-- profiles：自己可讀寫；家長可讀所有人
drop policy if exists profiles_self_read on learning.profiles;
create policy profiles_self_read on learning.profiles
  for select using (id = auth.uid() or learning.current_role() = 'parent');

drop policy if exists profiles_self_upsert on learning.profiles;
create policy profiles_self_upsert on learning.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_self_update on learning.profiles;
create policy profiles_self_update on learning.profiles
  for update using (id = auth.uid());

-- daily_checkins：學生只能讀寫自己；家長只能讀
drop policy if exists checkins_owner_all on learning.daily_checkins;
create policy checkins_owner_all on learning.daily_checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists checkins_parent_read on learning.daily_checkins;
create policy checkins_parent_read on learning.daily_checkins
  for select using (learning.current_role() = 'parent');

-- mistakes：同上
drop policy if exists mistakes_owner_all on learning.mistakes;
create policy mistakes_owner_all on learning.mistakes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists mistakes_parent_read on learning.mistakes;
create policy mistakes_parent_read on learning.mistakes
  for select using (learning.current_role() = 'parent');

-- monthly_reviews：學生可讀自己；家長可讀所有；寫入由 service role / cron 處理
drop policy if exists reviews_owner_read on learning.monthly_reviews;
create policy reviews_owner_read on learning.monthly_reviews
  for select using (user_id = auth.uid() or learning.current_role() = 'parent');

------------------------------------------------------------
-- 6. Storage bucket for mistake photos
------------------------------------------------------------
-- 在 Supabase Dashboard > Storage 建立 bucket 'mistake-photos' (private)
-- 然後執行下面的 policy：

-- insert into storage.buckets (id, name, public) values ('mistake-photos', 'mistake-photos', false)
--   on conflict (id) do nothing;

-- drop policy if exists mistake_photos_owner_rw on storage.objects;
-- create policy mistake_photos_owner_rw on storage.objects
--   for all
--   using (bucket_id = 'mistake-photos' and (auth.uid()::text = (storage.foldername(name))[1]))
--   with check (bucket_id = 'mistake-photos' and (auth.uid()::text = (storage.foldername(name))[1]));

-- drop policy if exists mistake_photos_parent_read on storage.objects;
-- create policy mistake_photos_parent_read on storage.objects
--   for select using (bucket_id = 'mistake-photos' and learning.current_role() = 'parent');
