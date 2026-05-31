-- 點數 + 寵物養成系統。
--   point_ledger      點數帳本（正=獲得 / 負=花費）
--   pets              寵物（生物線 / 植物線），growth = 已投入的成長值
--   award_points()    依目前學習狀態「補發」點數（idempotent），回傳這次新增點數
--   point_balance()   目前餘額
--   feed_pet()        花點數餵食 / 澆水，推進寵物成長（原子操作、檢查餘額）
-- 寵物的「定義」（物種、各階段外觀）放在前端 src/lib/pets.js。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

-- ============ 點數帳本 ============
create table if not exists learning.point_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  amount      int  not null,                 -- 正=獲得，負=花費
  reason      text not null,
  source_key  text,                          -- 自動發點的去重鍵；手動花費為 null
  created_at  timestamptz not null default now()
);
-- 同一個來源事件（某天打卡、某個成就…）只發一次
create unique index if not exists point_ledger_source_uidx
  on learning.point_ledger (user_id, source_key) where source_key is not null;
create index if not exists point_ledger_user_idx
  on learning.point_ledger (user_id, created_at desc);

alter table learning.point_ledger enable row level security;
drop policy if exists ledger_owner_all on learning.point_ledger;
create policy ledger_owner_all on learning.point_ledger for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists ledger_parent_read on learning.point_ledger;
create policy ledger_parent_read on learning.point_ledger for select
  using (learning.current_role() = 'parent');

-- ============ 寵物 ============
create table if not exists learning.pets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references learning.profiles(id) on delete cascade,
  kind        text not null,                 -- 'creature' | 'plant'
  species     text not null,                 -- 對應 src/lib/pets.js 的 key
  nickname    text,
  growth      int  not null default 0,       -- 已投入這隻的成長值
  is_active   boolean not null default true, -- 目前正在養的那隻
  created_at  timestamptz not null default now()
);
create index if not exists pets_user_idx on learning.pets (user_id, created_at desc);

alter table learning.pets enable row level security;
drop policy if exists pets_owner_all on learning.pets;
create policy pets_owner_all on learning.pets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists pets_parent_read on learning.pets;
create policy pets_parent_read on learning.pets for select
  using (learning.current_role() = 'parent');

-- ============ 餘額 ============
create or replace function learning.point_balance(p_user_id uuid)
returns int
language sql
security definer
set search_path = learning, public
as $$
  select coalesce(sum(amount), 0)::int
  from learning.point_ledger
  where user_id = p_user_id;
$$;
grant execute on function learning.point_balance(uuid) to authenticated;

-- ============ 自動發點（idempotent）============
-- 每次呼叫都把「該得而還沒得」的點補上，靠 source_key 去重，所以重複呼叫安全。
-- 回傳這次實際新增的點數總和。
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

  -- 完成每日打卡：每個達標日 +10（免讀日不計，點數綁實際努力）
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 10, '完成每日打卡', 'checkin:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id
    and d.tasks_total > 0 and d.tasks_done >= d.tasks_total
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 品學堂閱讀：每天 +3
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select d.user_id, 3, '品學堂閱讀', 'pinx:' || d.date
  from learning.daily_checkins d
  where d.user_id = p_user_id and d.pinxuetang_done
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 解鎖成就：每個 +30
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select ua.user_id, 30, '解鎖成就', 'ach:' || ua.achievement_key
  from learning.user_achievements ua
  where ua.user_id = p_user_id
  on conflict (user_id, source_key) where source_key is not null do nothing;

  -- 讀完一本課外書：每本 +15
  insert into learning.point_ledger(user_id, amount, reason, source_key)
  select r.user_id, 15, '讀完一本書', 'book:' || r.id
  from learning.reading_log r
  where r.user_id = p_user_id and r.finished_date is not null
  on conflict (user_id, source_key) where source_key is not null do nothing;

  v_after := learning.point_balance(p_user_id);
  return v_after - v_before;
end;
$$;
grant execute on function learning.award_points(uuid, date) to authenticated;

-- ============ 餵食寵物 ============
-- 花 p_amount 點推進 p_pet_id 的成長。檢查擁有者與餘額，原子完成扣點 + 加成長。
-- 回傳 ok / 新餘額 / 新成長值。
create or replace function learning.feed_pet(p_pet_id uuid, p_amount int)
returns table(ok boolean, balance int, growth int)
language plpgsql
security definer
set search_path = learning, public
as $$
declare
  v_owner  uuid;
  v_growth int;
  v_bal    int;
begin
  select p.user_id, p.growth into v_owner, v_growth
  from learning.pets p where p.id = p_pet_id;

  -- 不是本人的寵物，或不存在
  if v_owner is null or v_owner <> auth.uid() then
    return query select false, learning.point_balance(auth.uid()), coalesce(v_growth, 0);
    return;
  end if;

  v_bal := learning.point_balance(v_owner);
  if p_amount <= 0 or v_bal < p_amount then
    return query select false, v_bal, v_growth;          -- 點數不夠
    return;
  end if;

  insert into learning.point_ledger(user_id, amount, reason)
  values (v_owner, -p_amount, '餵食寵物');
  update learning.pets set growth = growth + p_amount
   where id = p_pet_id returning growth into v_growth;

  return query select true, learning.point_balance(v_owner), v_growth;
end;
$$;
grant execute on function learning.feed_pet(uuid, int) to authenticated;
