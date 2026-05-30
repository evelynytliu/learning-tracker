-- 筆記 + 親子留言板。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

-- 筆記：快速短筆記，可掛科目
create table if not exists learning.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  subject     text,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_user_idx on learning.notes (user_id, created_at desc);

drop trigger if exists notes_updated_at on learning.notes;
create trigger notes_updated_at before update on learning.notes
  for each row execute function learning.set_updated_at();

alter table learning.notes enable row level security;
drop policy if exists notes_owner_all on learning.notes;
create policy notes_owner_all on learning.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notes_parent_read on learning.notes;
create policy notes_parent_read on learning.notes for select
  using (learning.current_role() = 'parent');

-- 留言板：親子互相留言（student_id = 這是哪個孩子的板）
create table if not exists learning.messages (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references learning.profiles(id) on delete cascade,
  author_id   uuid not null references learning.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_student_idx on learning.messages (student_id, created_at);

alter table learning.messages enable row level security;
drop policy if exists messages_read on learning.messages;
create policy messages_read on learning.messages for select
  using (student_id = auth.uid() or learning.current_role() = 'parent');
drop policy if exists messages_insert on learning.messages;
create policy messages_insert on learning.messages for insert
  with check (author_id = auth.uid());
drop policy if exists messages_delete on learning.messages;
create policy messages_delete on learning.messages for delete
  using (author_id = auth.uid());
