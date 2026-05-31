-- 讓每個打卡項目可以是「加分項」(不計入完成度) 或帶外部連結。
-- 在 Supabase SQL Editor 接著前面的 schema 之後執行。

alter table learning.tasks add column if not exists is_bonus boolean not null default false;
alter table learning.tasks add column if not exists link text;

-- 把已種的「品學堂」項目補上連結（維持為正規項目，不是加分項）
update learning.tasks
set link = 'https://learning.wisdomhall.com.tw/'
where label like '%品學堂%' and link is null;
