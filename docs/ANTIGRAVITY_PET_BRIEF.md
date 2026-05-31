# 寵物美術 + 動畫交接指令（給 Antigravity / Gemini 3）

> 這份是給 AI agent 的工作說明。目標：把現有「寵物養成」功能裡的 **emoji 佔位圖**，
> 換成一套**風格一致、可愛文青風、有微動畫**的寵物插畫，並接回現有程式碼。
> 系統（點數、資料庫、成長邏輯）都已做好，**你只負責「美術 + 動畫 + 把圖接進去」**。

---

## 0. 先讀這些檔案了解現況（務必先讀）

- `CLAUDE.md` — 專案目的與技術棧（Next.js 14 App Router + Tailwind v4 + Supabase）
- `src/lib/pets.js` — **寵物定義（最重要）**：物種、各階段、成長門檻、`appearance()` 輔助
- `src/app/pet/PetManager.js` — 寵物頁，目前用 `stages[stage].emoji` 渲染（大圖、收藏縮圖、進化慶祝）
- `src/app/page.js` — 首頁頂部的寵物 widget，也用 emoji 渲染
- `src/app/globals.css` — 已有 `.animate-float` 與 `prefers-reduced-motion` 處理，沿用、勿重複造

---

## 1. 絕對不要動的東西（會弄壞資料）

- ❌ **不要改 Supabase / 資料庫 / RPC / migration**（`supabase/*.sql`）。資料表已上線。
- ❌ **不要改物種 key**：`sprout` `bonsai` `cactus` `birdie` `flutter` `inkdragon`（已存在 DB 的 `pets.species`）。
- ❌ **不要改階段數（6 階）或 `STAGE_THRESHOLDS = [0,20,50,100,170,260]`**（`pets.growth` 已依此計算）。
- ✅ 可以改：`src/lib/pets.js` 裡每個 stage 物件**新增**欄位、新增顯示元件、改三個渲染點、加 `public/pets/` 素材、加動畫套件。
- ✅ **emoji 要保留當 fallback**（素材還沒生好或載入失敗時顯示）。

---

## 2. 要做的事 ①：產生美術

### 物種與階段（6 物種 × 6 階段 = 36 張）

| key | 種類 | 名稱 | 6 個階段（小 → 大） |
|---|---|---|---|
| `sprout` | 植物 | 小綠芽 | 種子 / 發芽 / 幼苗 / 成株 / 含苞 / 盛開 |
| `bonsai` | 植物 | 文人樹 | 種子 / 冒芽 / 抽枝 / 盆栽 / 成樹 / 古木 |
| `cactus` | 植物 | 沙漠客 | 種子 / 小芽 / 幼柱 / 帶刺 / 盆植 / 開花 |
| `birdie` | 生物 | 圓圓雀 | 蛋 / 破殼 / 雛鳥 / 幼鳥 / 成鳥 / 展翅 |
| `flutter` | 生物 | 紙蝶 | 蟲卵 / 幼蟲 / 結蛹 / 初羽 / 成蝶 / 幻彩蝶 |
| `inkdragon` | 生物 | 墨龍 | 龍蛋 / 幼龍 / 成長期 / 少年龍 / 成龍 / 神龍 |

### 風格（文青、有格調、清新、可愛）

- 手繪 / 水彩 / gouache 質感，柔和、低彩度但溫暖；簡潔留白，不要俗艷、不要 3D 塑膠感、不要暗黑。
- 參考方向：吉卜力的柔和 + 北歐繪本極簡 + 日系雜誌的清新感。
- **全部 36 張要像同一個系列**（統一的線條粗細、上色方式、留白比例），讓 app 整體協調。
- 配色建議：植物線走「苔綠 / 米白 / 陶土」；生物線走「霧藍 / 奶油 / 淡金」；但整體色溫一致。

### 角色一致性（這是重點，用 Nano Banana Pro）

- 每個物種的 6 個階段是**同一隻角色從小長到大**——長相/特徵要連貫，只變大小、細節、姿態、成熟度。
- 作法：先為每個物種定一張「定稿角色」，再用它當 identity 參考生其餘階段（鎖住長相、只改階段特徵）。
- Nano Banana 提示詞範本（每階段套用）：
  ```
  Children's storybook illustration, soft watercolor/gouache, muted warm palette, clean
  white background, centered, minimal. The SAME character as the reference image — keep its
  identity, colors and features consistent. This is growth stage {N} of 6: "{stage_name}".
  {species_description}. Cute, calm, tasteful (literary/indie aesthetic), not gaudy, no 3D,
  no text. Square, generous padding around the subject.
  ```

### 檔案規格

- 透明背景 PNG，正方形 **512×512**（可另出 @2x = 1024）。主體置中、四周留白一致、基線統一（縮小成 36px 縮圖時也好看）。
- 放在 `public/pets/<species>/<stage>.png`，`<stage>` = `0`..`5`。
  例：`public/pets/sprout/0.png` ... `public/pets/sprout/5.png`。
- 每張 PNG 控制在 ~60KB 以內（可壓縮）。

---

## 3. 要做的事 ②：微動畫（subtle，不浮誇）

- 只要**待機微動作**：呼吸般的輕微縮放 / 緩慢上下浮動 / 偶爾眨眼 / 植物隨風輕擺。**不要**誇張彈跳。
- 60fps、輕量。**必須尊重 `prefers-reduced-motion`**（開啟時停用動畫，顯示靜態）。
- **建議用 Rive**（state machine、檔案小、可互動）：
  - 套件 `@rive-app/react-canvas`。
  - 每個物種一個 `.riv`，含一個 number input `stage`（0–5）切換外觀，以及一個 `idle` 待機動畫。
  - 放 `public/pets/<species>.riv`，每個 < 100KB。
- 若不用 Rive，退而求其次：靜態 PNG + CSS 待機動畫（可沿用 `globals.css` 的 `.animate-float`，或加一個 `breathe` keyframe）。Lottie 亦可，但檔案較大。

---

## 4. 要做的事 ③：接進程式碼

1. 新增 `src/components/PetSprite.js`（**'use client'**，要 SSR-safe / 動畫只在 client 跑）：
   - props：`{ species, stage, size }`（size: `'lg'` 大圖 / `'sm'` 縮圖）。
   - 渲染優先序：**Rive（有 `.riv` 就用，吃 `stage` input）→ `stages[stage].img` 的 `<img>` → emoji（fallback）**。
   - reduced-motion 時 Rive 用靜態幀或改用 PNG。
2. 在 `src/lib/pets.js` 為有素材的 stage 補欄位：`img: '/pets/<species>/<n>.png'`；物種層級可加 `rive: '/pets/<species>.riv'`。**emoji 欄位保留**。
3. 把這三個渲染點改用 `<PetSprite>`（目前都是直接放 emoji）：
   - `src/app/pet/PetManager.js` 的 `ActivePet`（大圖，約 144px）、收藏縮圖（約 36px）、進化慶祝（約 96px）。
   - `src/app/page.js` 首頁寵物 widget（約 96–120px）。
4. 安裝需要的套件（如 `@rive-app/react-canvas`），確認 `next build` 與 mobile 正常。

---

## 5. 驗收標準

- [ ] 6 物種 × 6 階段共 36 張素材，風格一致、同物種角色連貫；放在 `public/pets/...`。
- [ ] `<PetSprite>` 能依 species + growth 顯示正確階段，並有微動畫；reduced-motion 下停用動畫。
- [ ] 首頁 widget、寵物頁大圖、收藏縮圖、進化慶祝都換成插畫且不破版（含手機）。
- [ ] 沒有素材時 fallback 回 emoji，不會壞。
- [ ] 沒有改到任何 DB / RPC / 物種 key / 階段門檻。
- [ ] `npm run lint` 與 `npm run build` 通過。

---

## 6. 完成後

跑 `npm run dev`，登入 → 開「🌱 寵物養成」→ 領養各物種、餵到進化，確認每個階段的插畫與動畫都正確、好看、協調。
