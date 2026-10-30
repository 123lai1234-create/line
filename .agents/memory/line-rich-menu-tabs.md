---
name: LINE multi-tab rich menu
description: How LINE's native "多頁籤" (tabbed) rich menu switching works, why rich menus can't be updated, and the safe incremental publish flow.
---

# LINE multi-tab (多頁籤) rich menu — 現行生效方案(2026-10-30)

## 現況(2026-10-30 發布後)

| alias | richMenuId | 頁 |
|---|---|---|
| `bot-news` | `richmenu-f030a32e5e9741b40b4ea8bf21a4ecef` | 1/4 即時資訊(**預設頁**) |
| `bot-food` | `richmenu-ae4d8c072244adb9af4985e6f859ef9d` | 2/4 惜食特價 |
| `bot-projects` | `richmenu-eef770c232b6f58f68530088e73c6054` | 3/4 AI 專案 |
| `bot-about` | `richmenu-64485f8ea870aad1dec84d153391753e` | 4/4 關於不說 |

每頁 2500×1686、**8 個 areas**(4 個 tab bar + 4 個 tile)。
tab bar 在**底部**(`y = H - TAB_H` = 1422),每段寬 `W / TABS.length` = 625。

## ⚠️ LINE 沒有「更新 rich menu」的端點(踩過)

`POST /v2/bot/richmenu/{richMenuId}` → **405 Method Not Allowed**(官方文件也沒有這支)。
能改的只有:
- **圖**:`POST /v2/bot/richmenu/{richMenuId}/content`(可重傳覆蓋)
- **alias 指向**:`POST /v2/bot/richmenu/alias/{richMenuAliasId}`,body `{richMenuId}`

→ **areas 一旦要變(tab bar 由 3 格變 4 格、tile 換掉)就只能「新建一頁 + alias 改指向」**,
   舊的 richMenuId 一定會換。

## 刪掉舊 rich menu 安不安全?——安全(但有前提)

LINE 官方文件的顯示優先序:
1. **per-user** rich menu(用 `POST /v2/bot/user/{userId}/richmenu/{id}` 設定的)
2. 用 Messaging API 設定的**預設頁**
3. LINE Official Account Manager 設定的預設頁

這個 bot **從來沒用過 per-user 端點** → 使用者看的都是預設頁 →
刪掉舊頁、把預設頁指到新頁,使用者不會開天窗。
⚠️ 若哪天開始用 per-user API,刪頁前必須先設好新的預設頁,或先清 per-user link。

## 發布流程(增量式)

`scripts/src/setup-line-richmenu.ts`,預設只出圖不動線上:

```powershell
cd D:\line\scripts
npx tsx src/setup-line-richmenu.ts                                        # 只 render,看圖
$env:APPLY='1'; $env:PLAN_ONLY='1'; npx tsx src/setup-line-richmenu.ts # 預演:查現況、印計畫、**不改線上**
$env:APPLY='1'; $env:LINE_CHANNEL_ACCESS_TOKEN='...'; npx tsx src/setup-line-richmenu.ts  # 真的上線
```

`publishRichMenus()` 的規則:
- alias 已存在且 **areas 跟這次要發的完全相同** → 留著(richMenuId 不變),只重傳圖
- areas 不同 → 新建一頁 → `POST /richmenu/alias/{alias}` 改指向 → 最後刪掉舊頁
- **別人(外部發布)的 rich menu 一律不碰、不刪**
  (舊版 `applyRichMenus()` 會先全刪再重建 → 惜食頁就是這樣消失的)
- 最後把預設頁設成第 1 頁

比較 areas 用「key 排序的穩定序列化」——LINE 回傳的 action key 順序跟送出時不一定相同
(`{type,data,richMenuAliasId}` vs 送出的 `{type,richMenuAliasId,data}`)。

## 已埋的雷（都踩過）

1. **LINE 強制要求 `selected` 欄位。**沒給 → `400 {"message":"must be specified","property":"selected"}`。
   建立 rich menu 時要帶 `selected: false`。
2. **`POST /api/admin/rich-menu?refresh=1` 絕對不能跑。**
   它 `listRichMenus()` 全刪再重建一個 1×3 → 頁籤全滅。
   兩道防呆(2026-10-23,commit `1cebaa2`):
   - `fly-deploy.yml` 的「Refresh LINE rich menu」step 已移除(它每次 deploy 都自動打這支 = 定時炸彈)
   - `rich-menu.ts` 在 `refresh=1` 時若發現既有 rich menu > 1 個,直接回 `409` 且**不刪任何東西**
3. **rich menu 發布是不可逆的對外變更** → 一定先 render 出圖給使用者過目,再 `APPLY=1`。
4. 驗證圖有沒有上傳成功要打 **`api-data.line.me`**(不是 `api.line.me`):
   `GET https://api-data.line.me/v2/bot/richmenu/{id}/content` → 200,`content-type: image/png`。
   比對用 SHA256(本地 render 對線上下載)。
5. Rich menu 建立/刪除的 rate limit 是 **100 次/小時**(其他端點 2000/秒)。

## 圖怎麼畫的

`@napi-rs/canvas`(⚠️ 絕對不要用 `@resvg/resvg-js`,CJK 會變豆腐,見 `svg-cjk-rasterization.md`)。
字型 `scripts/assets/jf-openhuninn.ttf`。

版面常數:`TAB_H = 264`、`COL_W = 1160`、`ROW_H = 621`、間距 `G = 60`。
tab 分段寬度 = `W / TABS.length`,不是寫死 `W / 2`。
卡片從畫面最上方開始排(2×2),tab bar 固定底部(拇指可達,也跟截圖一致)。

## 「滑動」的真相:rich menu 不能滑,但 Flex carousel 可以

LINE **rich menu 是靜態圖,永遠不能滑動**。分頁只能靠點 tab bar 切。
真的能左右滑的是 **Flex Message carousel**(`contents: { type: "carousel", contents: [...] }`)。

目前狀態:
- ✅ `musicMenu()` 早就是 carousel(10 張 MV + 1 張全部清單)—— 音樂本來就能滑
- ❌ `stockMenu()` **不能** carousel,實測會炸(見下)

### ⚠️ 實測:股票 carousel 會炸(2026-10-23 量過,已還原改動)

```
stub 掉 fetch 之後量 assembleStockMenu 的實際輸出:
  page1 bubble        ≈  8,000 bytes
  每個 sector bubble  ≈  9,150 bytes  (13 列報價)
  5 bubbles 合計      = 44,897 bytes
  LINE 單一 message 上限 = 51,200 bytes
```

**只差 1,183 bytes。** 而且 carousel 裡的所有 bubble **共用同一個 50KB 額度**
(拆成多則 message 才會各自有額度)。後果:超過 50KB → LINE 回 400 → **整則 reply 被拒,使用者一個字都收不到**。

→ 想讓股票也能滑,只有兩條路:
1. 每個 sector 從 13 列砍到 ~8 列(整包會掉到 ~30KB,安全)—— 但那是砍內容,屬於產品決策,不要自己決定。
2. Compact `quoteRows()` 的 JSON —— 現在一列報價約 700 bytes,偏肥。壓到 ~350 bytes 就有餘裕,但要小心視覺 regression。

量測方法(下次要複驗用):暫時把 `globalThis.fetch` stub 成回傳假的 Yahoo chart JSON,
`tsx` 跑 `stockMenu()`,量 `JSON.stringify(msgs)` 的 byte 數。
注意 `tsx` 只裝在 `scripts/` workspace(`D:\line\scripts\node_modules\tsx`),
api-server 裡沒有,要直接 `node D:\line\scripts\node_modules\tsx\dist\cli.mjs <file>`。

## 中間短暫用過 1×3 單頁

2026-10-23 之前短暫用過 1×3 單頁
(`artifacts/api-server/src/routes/rich-menu.ts` + `data/rich-menu.jpg`),
那條路現在是**陷阱**,見上方「已埋的雷」第 2 點。
