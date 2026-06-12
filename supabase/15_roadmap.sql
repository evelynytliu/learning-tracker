-- 路線圖功能：段考標記 + 週目標自動化 + 專注時段（番茄鐘）+ 點數規則 v4。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

-- 段考標記（行事曆事件可標為段考＋考科，考前 7 天觸發錯題衝刺）
alter table learning.calendar_events
  add column if not exists is_exam boolean not null default false,
  add column if not exists exam_subjects text[] not null default '{}';

-- 週目標自動化：auto_key 標記系統自動生成的目標（進度由系統同步）
--   'reviews' = 複習錯題、'course_units' = 看課程、'focus_sessions' = 專注時段
alter table learning.weekly_goals
  add column if not exists auto_key text;

-- 專注時段（番茄鐘）
create table if not exists learning.focus_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  subject     text,
  minutes     int  not null check (minutes > 0),
  started_at  timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx
  on learning.focus_sessions (user_id, started_at desc);
alter table learning.focus_sessions enable row level security;
drop policy if exists focus_owner_all on learning.focus_sessions;
create policy focus_owner_all on learning.focus_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists focus_parent_read on learning.focus_sessions;
create policy focus_parent_read on learning.focus_sessions for select
  using (learning.current_role() = 'parent');

-- award_points v4 完整函式：在 13_courses.sql 版本之上新增
--   完成專注時段（≥15 分鐘）+5、該週所有週目標達成 +20
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

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 10, '完成每日打卡', 'checkin:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id
    and d.tasks_total > 0 and d.tasks_done >= d.tasks_total
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 3, '品學堂閱讀', 'pinx:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id and d.pinxuetang_done
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select ua.user_id, 30, '解鎖成就', 'ach:' || ua.achievement_key
  from learning.user_achievements ua
  where ua.user_id = p_user_id
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select r.user_id, 15, '讀完一本書', 'book:' || r.id
  from learning.reading_log r
  where r.user_id = p_user_id and r.finished_date is not null
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select cp.user_id, 5, '看完一集課程', 'course:' || cp.course_id || ':' || cp.unit_no
  from learning.course_progress cp
  where cp.user_id = p_user_id
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select fs.user_id, 5, '完成專注時段', 'focus:' || fs.id
  from learning.focus_sessions fs
  where fs.user_id = p_user_id and fs.minutes >= 15
  on conflict (user_id, source_key) where source_key is not null do nothing;

  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select w.user_id, 20, '週目標全部達成', 'weekgoal:' || w.week_start
  from (
    select user_id, week_start
    from learning.weekly_goals
    where user_id = p_user_id
    group by user_id, week_start
    having count(*) > 0 and bool_and(progress >= target)
  ) w
  on conflict (user_id, source_key) where source_key is not null do nothing;

  v_after := learning.point_balance(p_user_id);
  return v_after - v_before;
end;
$$;
grant execute on function learning.award_points(uuid, date) to authenticated;
