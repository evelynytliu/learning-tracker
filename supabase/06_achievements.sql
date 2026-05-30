-- 徽章/成就系統。
--   user_achievements        誰解鎖了哪個徽章、何時
--   evaluate_achievements()  依目前統計解鎖達標徽章，回傳這次新解鎖的 key
-- 徽章「定義」（名稱、emoji、描述）放在前端 src/lib/achievements.js。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

create table if not exists learning.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references learning.profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);
create index if not exists user_achievements_user_idx
  on learning.user_achievements (user_id, unlocked_at desc);

alter table learning.user_achievements enable row level security;

drop policy if exists achievements_owner_all on learning.user_achievements;
create policy achievements_owner_all on learning.user_achievements for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists achievements_parent_read on learning.user_achievements;
create policy achievements_parent_read on learning.user_achievements for select
  using (learning.current_role() = 'parent');

create or replace function learning.evaluate_achievements(p_user_id uuid, p_today date)
returns setof text
language plpgsql
security definer
set search_path = learning, public
as $$
declare
  v_streak   int := 0;
  v_cursor   date;
  v_total    int;
  v_mistakes int;
  v_pinx     int;
  v_perfect  boolean;
  k          text;
  cand       text[] := '{}';
begin
  v_cursor := p_today;
  if not exists (
    select 1 from daily_checkins d
    where d.user_id = p_user_id and d.date = p_today
      and (d.is_rest_day or (d.tasks_total > 0 and d.tasks_done >= d.tasks_total))
  ) then
    v_cursor := p_today - 1;
  end if;
  loop
    if exists (
      select 1 from daily_checkins d
      where d.user_id = p_user_id and d.date = v_cursor
        and (d.is_rest_day or (d.tasks_total > 0 and d.tasks_done >= d.tasks_total))
    ) then
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    else
      exit;
    end if;
  end loop;

  select count(*) into v_total from daily_checkins d
   where d.user_id = p_user_id
     and (d.is_rest_day or (d.tasks_total > 0 and d.tasks_done >= d.tasks_total));

  select count(*) into v_mistakes from mistakes where user_id = p_user_id;
  select count(*) into v_pinx from daily_checkins where user_id = p_user_id and pinxuetang_done;
  select exists (
    select 1 from weekly_goals where user_id = p_user_id
    group by week_start having count(*) > 0 and bool_and(progress >= target)
  ) into v_perfect;

  if v_streak  >= 3   then cand := cand || 'streak_3'; end if;
  if v_streak  >= 7   then cand := cand || 'streak_7'; end if;
  if v_streak  >= 30  then cand := cand || 'streak_30'; end if;
  if v_streak  >= 100 then cand := cand || 'streak_100'; end if;
  if v_total   >= 10  then cand := cand || 'total_10'; end if;
  if v_total   >= 50  then cand := cand || 'total_50'; end if;
  if v_total   >= 100 then cand := cand || 'total_100'; end if;
  if v_mistakes >= 8  then cand := cand || 'mistakes_8'; end if;
  if v_mistakes >= 30 then cand := cand || 'mistakes_30'; end if;
  if v_pinx    >= 10  then cand := cand || 'pinxuetang_10'; end if;
  if v_pinx    >= 30  then cand := cand || 'pinxuetang_30'; end if;
  if v_perfect        then cand := cand || 'weekly_perfect'; end if;

  foreach k in array cand loop
    insert into user_achievements(user_id, achievement_key)
    values (p_user_id, k)
    on conflict (user_id, achievement_key) do nothing;
    if found then
      return next k;
    end if;
  end loop;
  return;
end;
$$;

grant execute on function learning.evaluate_achievements(uuid, date) to authenticated;
