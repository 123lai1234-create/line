---
name: 惜食特價功能
description: 超商惜食(即期品)折扣時段卡片 —— 資料來源、時段表、觸發關鍵字,以及這功能為什麼曾經「消失」。
---

# 惜食特價（FOOD RESCUE）

2026-10-30 找回來的功能。LINE 對話輸入「惜食特價」→ 回一張超商惜食折扣卡
（7-11 i珍食 / 全家友善食光 / 萊爾富惜福食堂 / OK超商午後6折），
標題列顯示台灣時間 + 目前幾家在折扣中。

## 程式在哪

- `artifacts/api-server/src/lib/services/food.ts` — 資料表 + 狀態計算 + Flex bubble
- `artifacts/api-server/src/lib/services/router.ts` — 關鍵字 `/惜食|特價|折扣|food|rescue/i`
  → `foodRescue()`；同時在 `MAIN_MENU_ITEMS` 加了「🛒 惜食特價」quick reply chip

時段表寫成常數（`FOOD_STORES`），**不爬站**。要改折扣時段只改這張表。

## 時段表（2026-10 現況）

| 超商 | 方案 | 時段 |
|---|---|---|
| 7-11 | i珍食 | 10:00–17:00 65折 / 19:00–19:59 8折 / 20:00–隔日03:00 65折 |
| 全家 | 友善食光 | 17:00–24:00 7折 |
| 萊爾富 | 惜福食堂 | 到期前 6 小時內 7 折（依門市標籤，無固定時段 → 狀態恆為「依標籤」）|
| OK超商 | 午後6折 | 16:30–23:00 6折 |

狀態四種：`active`（折扣中）/ `upcoming`（未開始）/ `tag`（依標籤）/ `ended`（已結束）。
標題列的「N 家折扣進行中」**只算 `active`**（依標籤型不計）。

時間一律用 `Intl.DateTimeFormat` + `Asia/Taipei` 算，不要信容器的 TZ。
跨日時段（20:00→03:00）用 `start > end` 表示。

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

## 驗證方式（不需 LINE token）

webhook 的簽章密鑰（32 hex）可以在 `D:\project\.env.full` 找到，兩邊是同一個 channel：

```powershell
# 簽章後 POST 線上 webhook → 200 就是密鑰對
# 然後看 https://line-bot-api-sxhz.onrender.com/api/debug/logs 確認有 "routing text"
```

LINE 平台真正顯示的樣子要用 LINE App 打字驗（reply token 只有真實訊息才有）。
