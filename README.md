# 學習進度管理 Web App

家用學習打卡系統。完整需求規格見 [`CLAUDE.md`](./CLAUDE.md)。

> 本資料夾位於 `points-bank/learning-tracker/`，是一個獨立的 Next.js 應用。
> 未來可能與 root 的 points-bank 串接（打卡達標 → 自動發點數）。

---

## 快速開始

### 1. 安裝依賴

```bash
cd learning-tracker
npm install
```

### 2. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 建立新專案
2. 在 SQL Editor 執行 `supabase/schema.sql`（建立 tables + RLS）
3. 執行 `supabase/generate_monthly_review.sql`（月度檢核 RPC）
4. 在 Storage 建立 bucket `mistake-photos`（private），再去 SQL Editor
   把 `schema.sql` 末段被註解的 storage policy 解開執行

### 3. 環境變數

```bash
cp .env.example .env.local
```

填入 Supabase Project URL / anon key。

### 4. 建立初始帳號

到 Supabase Dashboard → Authentication → Users，
手動加 2 個 user（學生 email、家長 email），
然後在 SQL Editor 建立對應 profile：

```sql
insert into public.profiles (id, role, display_name) values
  ('<student-user-uuid>', 'student', '兒子的名字'),
  ('<parent-user-uuid>',  'parent',  '媽媽');
```

### 5. 跑起來

```bash
npm run dev
```

打開 <http://localhost:3000>，會跳轉到 `/login`，用 magic link 登入。

---

## 路由

學生（mobile）：

- `/` 今日打卡
- `/mistakes` 錯題列表
- `/mistakes/new` 新增錯題
- `/streak` 連續達標視覺化

家長：

- `/dashboard` 本週儀表板
- `/dashboard/mistakes` 近 30 天錯題
- `/dashboard/monthly` 月度檢核

`middleware.js` 會把未登入的請求全部導到 `/login`。

---

## 技術棧

- Next.js 15 (App Router) + React 19
- Tailwind CSS v4
- Supabase（Auth / DB / Storage）
- `@supabase/ssr` 處理 cookie session

---

## 月度檢核排程（之後再做）

`generate_monthly_review` RPC 已寫好。每月底用 pg_cron 自動呼叫：

```sql
select cron.schedule(
  'monthly-review',
  '0 1 1 * *',  -- 每月 1 號凌晨 1 點，產上個月的報告
  $$ select public.generate_monthly_review(p.id, (now() - interval '1 month')::date)
     from public.profiles p where p.role = 'student' $$
);
```

MVP 階段先手動呼叫即可。

---

## 部署到 Vercel

1. 在 Vercel 匯入這個 repo
2. **Root Directory** 設成 `learning-tracker`
3. 環境變數設好 Supabase URL / anon key
4. Deploy

---

## 與 points-bank 的串接（未來）

短期內兩個 app 完全獨立。未來想串點數時的設計方向：

- 共用同一個 Supabase 專案（兩個 app 連同一個 DB）
- 在本系統的 `daily_checkins` upsert / `monthly_reviews` 通過時，
  呼叫 points-bank 提供的點數 RPC（或直接寫對應 table）
- 或反過來：points-bank 的家長身分能直接 iframe 嵌入本儀表板

MVP 階段不要做任何耦合。
