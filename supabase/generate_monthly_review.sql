-- 月度檢核自動產生 RPC
-- 規格（CLAUDE.md）：
--   作業準時交：作業勾選率 >= 90%
--   錯題本有在記：當月至少 8 筆錯題
--   題庫練習有做：數學題庫勾選率 >= 80%
-- 三項都達標 → passed = true
--
-- 用法：select public.generate_monthly_review('uuid-of-student', date '2026-05-01');
-- 之後可加 pg_cron 在每月底自動執行。

create or replace function public.generate_monthly_review(
  p_user_id uuid,
  p_month date
)
returns public.monthly_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (v_start + interval '1 month')::date;
  v_days  int  := (v_end - v_start);
  v_homework_rate numeric(5,2);
  v_practice_rate numeric(5,2);
  v_mistakes int;
  v_passed boolean;
  v_row public.monthly_reviews;
begin
  select
    coalesce(round(100.0 * sum(case when homework_done then 1 else 0 end) / nullif(v_days, 0), 2), 0),
    coalesce(round(100.0 * sum(case when math_practice_done then 1 else 0 end) / nullif(v_days, 0), 2), 0)
  into v_homework_rate, v_practice_rate
  from public.daily_checkins
  where user_id = p_user_id
    and date >= v_start
    and date < v_end;

  select count(*) into v_mistakes
  from public.mistakes
  where user_id = p_user_id
    and created_at >= v_start
    and created_at < v_end;

  v_passed := v_homework_rate >= 90 and v_mistakes >= 8 and v_practice_rate >= 80;

  insert into public.monthly_reviews
    (user_id, month, homework_completion_rate, mistake_log_count, practice_completion_rate, passed)
  values
    (p_user_id, v_start, v_homework_rate, v_mistakes, v_practice_rate, v_passed)
  on conflict (user_id, month) do update set
    homework_completion_rate = excluded.homework_completion_rate,
    mistake_log_count        = excluded.mistake_log_count,
    practice_completion_rate = excluded.practice_completion_rate,
    passed                   = excluded.passed,
    generated_at             = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.generate_monthly_review(uuid, date) to authenticated;
