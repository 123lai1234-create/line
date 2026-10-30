---
name: 惜食特價功能
description: 超商惜食(即期品)折扣時段卡片 —— 資料來源、時段表、觸發關鍵字,以及這功能為什麼曾經「消失」。
---

# 惜食特價（FOOD RESCUE）

2026-10-30 找回來的功能。LINE 對話輸入「惜食特價」→ 回一張超商惜食折扣卡
（7-11 i珍食 / 全家友善食光 / 萊爾富惜福食堂 / OK超商午後6折），
標題列顯示台灣時間 + 目前幾家在折扣中。

## 程式在哪

- `artifacts/api-server/src/lib/services/food.ts` — 常態時段表 + 狀態計算 + Flex bubble
  (`foodRescue()` 卡片) + **純文字時段表**(`foodScheduleText()`)
- `artifacts/api-server/src/lib/services/food-source.ts` — 爬各超商官方公告(30 分鐘快取,抓不到自動退回常態時段)
- `artifacts/api-server/src/lib/services/router.ts` — 關鍵字 `/惜食|特價|折扣|food|rescue/i`
  → `foodRescue()`；`MAIN_MENU_ITEMS` 有「🛒 惜食特價」quick reply chip；
  `SERVICES` / `TOOLS` 也有惜食 → **bento 主選單的「即時工具」多一格**(`tile(TOOLS[2], true)`)

時段表寫成常數(`FOOD_STORES`)當 fallback,能爬到的以公告為準。

## 兩種回覆(2026-10-30 加)

| 輸入 | 回覆 |
|---|---|
| 「惜食特價」/「折扣」 | `foodRescue()` → FOOD RESCUE flex 卡(現況:誰正在折) |
| 「惜食時段」/「時間表」 | `foodScheduleText()` → **純文字**時間表(每家一行時段 + 現在狀態,可直接複製) |

router 裡「時段 / 時間表 / schedule」要先於卡片判斷(兩者都含「惜食」關鍵字)。

## LINE rich menu 也有惜食頁(2026-10-30 發布)

`bot-food` alias → `richmenu-ae4d8c072244adb9af4985e6f859ef9d`,是 **2/4 惜食特價** 頁
(即時資訊 / **惜食特價** / AI 專案 / 關於不說),4 個 tile:
惜食特價、折扣時段、服務選單、回到首頁。
⚠️ 這頁的 tab bar 是 4 格 → 既有 3 頁必須重建(LINE 沒有更新 rich menu 的端點),
細節見 `line-rich-menu-tabs.md`。

## 時段來源:哪些能爬、哪些不能(2026-10 實測)

| 超商 | 方案 | 來源 | 狀況 |
|---|---|---|---|
| 7-11 | i珍食 | `7-11.com.tw/event/lovefood/index.aspx` | ❌ 時段是**圖片**(kv-min.png / c1.png / c2.png),頁面文字只有「注意事項」→ 用常態時段 |
| 全家 | 友善食光 | `nevent.family.com.tw/cherishfood/` | ✅ 純文字,parse 得到 |
| 萊爾富 | 惜福食堂 | `hilife.com.tw` | ❌ SPA,內容走 `/webapi/api` + anti-forgery token → 用常態時段 |
| OK超商 | 午後6折 | `okmart.com.tw/promotion_reference` | ❌ 促銷頁沒有惜食時段文字(圖片/APP)→ 用常態時段 |

### 全家公告怎麼 parse

原文:
```
有效期限於當日24時到期之鮮食商品，自17：00起，享7折優惠
(部分鮮食商品有效期限為當日17:00，該商品則於10:00起適用友善食光優惠)
```
→ 主時段 **17:00–24:00 7折**,另外 **10:00–17:00 7折**(17:00 到期的那批)。

⚠️ 注意:公告裡有全角 `：` 也有半角 `:` → regex 要兩種都收。

### 常態時段(抓不到時用)

| 超商 | 方案 | 時段 |
|---|---|---|
| 7-11 | i珍食 | 10:00–17:00 65折 / 19:00–19:59 8折 / 20:00–隔日03:00 65折 |
| 全家 | 友善食光 | 17:00–24:00 7折 |
| 萊爾富 | 惜福食堂 | 到期前 6 小時內 7 折(依門市標籤,無固定時段 → 狀態恆為「依標籤」)|
| OK超商 | 午後6折 | 16:30–23:00 6折 |

狀態四種:`active`（折扣中）/ `upcoming`（未開始）/ `tag`（依標籤）/ `ended`（已結束）。
標題列的「N 家折扣進行中」**只算 `active`**（依標籤型不計）。

時間一律用 `Intl.DateTimeFormat` + `Asia/Taipei` 算,不要信容器的 TZ。
跨日時段(20:00→03:00)用 `start > end` 表示。
`Intl.DateTimeFormat` 建一次要 80ms → **要快取成 module 級常數**,不要每次呼叫重建。

## ⚠️ 這功能為什麼會「不見」（重要）

原始碼在 2026-10-30 之前**不存在於任何 repo**（`line` / `ddd` / `donttalk-chat-bot` /
已刪的 `donttalk` 全套 git 歷史都搜過 `惜食` / `特價` / `FOOD RESCUE`，0 命中）。
使用者端看到的卡片是真的（10/04 還在運作），但它的產生程式不在手上。

最可能的原因：`scripts/src/setup-line-richmenu.ts` 的 `applyRichMenus()` 會
**先刪掉 channel 上全部 rich menu + alias 再建立**（見 `line-rich-menu-tabs.md`）。
2026-10-23 發布 3 頁籤時，任何由外部工具發布上去的頁面（含惜食頁）會被清掉。

→ **教訓**：這支 channel 的 rich menu 目前沒有「增量新增」路徑，
要加頁籤一定要改 `setup-line-richmenu.ts` 本身，並且 **先 `node scripts/rich-menu.mjs preview`
看圖再 `APPLY=1`**。rich menu 發布是不可逆的對外變更。

### ✅ 2026-10-30 已修復

- `setup-line-richmenu.ts` 的 `applyRichMenus()`(全刪重建)已改成 `publishRichMenus()`:
  別人發布的頁不碰不刪;我們自己的頁 areas 相同就留著、只換圖;不同才新建 + alias 改指向 + 刪舊頁。
  另有 `PLAN_ONLY=1` 可先預演發布計畫(只查不改)。
- 惜食頁已重新發布(2/4),alias `bot-food`。
- 聊天側的「惜食特價」「惜食時段」都已上線並驗證過。

## 驗證方式（不需 LINE token）

webhook 的簽章密鑰（32 hex）可以在 `D:\project\.env.full` 找到，兩邊是同一個 channel：

```powershell
# 簽章後 POST 線上 webhook → 200 就是密鑰對
# 然後看 https://line-bot-api-sxhz.onrender.com/api/debug/logs 確認有 "routing text"
```

LINE 平台真正顯示的樣子要用 LINE App 打字驗（reply token 只有真實訊息才有）。
