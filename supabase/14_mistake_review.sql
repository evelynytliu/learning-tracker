-- 錯題間隔複習（spaced repetition）。
--   mistakes 加三個欄位：
--     next_review_date  下次複習日（登記後 +3 天；答對後 +7、+14；答錯 +1）
--     review_count      連續答對次數（答錯歸零）
--     mastered_at       連續答對 3 次 → 精熟，不再出現
--   review_mistake()    複習一題：更新排程＋發 +2 點（每題每天最多一次）
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

alter table learning.mistakes
  add column if not exists next_review_date date default (current_date + 3),
  add column if not exists review_count int not null default 0,
  add column if not exists mastered_at timestamptz;

create index if not exists mistakes_review_idx
  on learning.mistakes (user_id, next_review_date) where mastered_at is null;

create or replace function learning.review_mistake(p_mistake_id uuid, p_got_it boolean, p_today date)
returns table(o_next date, o_count int, o_mastered boolean, o_awarded int)
language plpgsql
security definer
set search_path = learning, public
as $$
declare
  v_owner    uuid;
  v_count    int;
  v_next     date;
  v_mastered timestamptz;
  v_rows     int := 0;
begin
  select m.user_id, m.review_count into v_owner, v_count
  from learning.mistakes m where m.id = p_mistake_id;

  if v_owner is null or v_owner <> auth.uid() then
    return query select null::date, 0, false, 0;
    return;
  end if;

  if p_got_it then
    v_count := v_count + 1;
    if v_count >= 3 then
      v_mastered := now();
      v_next := null;
    else
      v_next := p_today + (case v_count when 1 then 7 else 14 end);
    end if;
  else
    v_count := 0;
    v_next := p_today + 1;
    v_mastered := null;
  end if;

  update learning.mistakes m
     set review_count = v_count,
         next_review_date = v_next,
         mastered_at = v_mastered,
         reviewed_at = now()
   where m.id = p_mistake_id;

  -- 複習獎勵 +2（同一題同一天只發一次）
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  values (v_owner, 2, '複習錯題', 'mrev:' || p_mistake_id || ':' || p_today)
  on conflict (user_id, source_key) where source_key is not null do nothing;
  get diagnostics v_rows = row_count;

  return query select v_next, v_count, v_mastered is not null, v_rows * 2;
end;
$$;
grant execute on function learning.review_mistake(uuid, boolean, date) to authenticated;
