# LINE bot → Fly.io 部署指南

Railway 之外的 always-on webhook 部署方案。`artifacts/api-server/fly.toml` 已內建完整設定
（`sin` region = 新加坡節點，對台灣使用者 latency 最低；`min_machines_running = 1` 確保
LINE webhook 不會被冷啟動拖過 5s timeout）。

> 用哪個？**Webhook 必須 warm**：Render free 15 分鐘後會 spin down，雖然有 cron keepalive
> 防呆，但偶爾冷啟動會吃光 LINE 的 5s timeout。Fly.io 跟 Railway 都常駐，隨意挑。
> 本 repo 三份設定檔都有（railway.json / fly.toml / render.yaml），二者切換只要改 CI。

---

## 0. 前置

| 工具 / 帳號 | 用途 |
|---|---|
| Fly.io 帳號 | 部署平台 |
| `fly` CLI | `pwsh -Command "iwr https://fly.io/install.ps1 -useb \| iex"` |
| Postgres DB | Neon free / Supabase / Railway Postgres |
| LINE Developers Console | webhook URL + Channel secrets |

需要的 secrets（先備齊）：

| 變數 | 來源 |
|---|---|
| `DATABASE_URL` | Neon connection string（含 `?sslmode=require`） |
| `LINE_CHANNEL_SECRET` | LINE Console → channel → Basic settings |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Console → Messaging API |
| `ADMIN_PASSWORD` | 自己設（與 admin route `POST /api/admin/rich-menu` 共用） |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

**GitHub Actions 自動 deploy（push 觸發）**
- secrets: `FLY_API_TOKEN`（Fly.io deploy token）+ 可選 `ADMIN_PASSWORD`（自動重發 rich menu 用）
- workflow 在 `.github/workflows/fly-deploy.yml`,trigger 是 push 到 main 且 paths 含 `artifacts/api-server/**`
- push 觸發後自動:`deploy → healthz probe → refresh rich menu`(rich menu 步驟是 `if: ${{ secrets.ADMIN_PASSWORD != '' }}`,沒設就跳過,不會壞掉)
- 加 `ADMIN_PASSWORD` 在 repo settings → Secrets → Actions 即可讓 push 自動重發 rich menu,不用再手動 curl

---

## 1. Fly.io 帳號 + App

```powershell
fly auth signup                    # 第一次註冊
# 或
fly auth login                     # 已開帳號

fly apps create portfolio-line-bot
fly status --app portfolio-line-bot
```

---

## 2. 注入 secrets

```powershell
fly secrets set --app portfolio-line-bot `
  DATABASE_URL="postgresql://...?sslmode=require" `
  LINE_CHANNEL_ACCESS_TOKEN="..." `
  LINE_CHANNEL_SECRET="..." `
  ADMIN_PASSWORD="$(New-Guid)" `
  SESSION_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(48).toString(\"hex\"))')"
```

---

## 3. 推 DB schema

Fly 容器內沒裝 pnpm。做法 B（本地暫時指向 prod DB 推一次）最快：

```powershell
$env:DATABASE_URL = "postgresql://...?sslmode=require"
pnpm --filter @workspace/db run push
Remove-Item env:DATABASE_URL
```

---

## 4. 首次部署

```powershell
cd D:\line
fly deploy --config artifacts/api-server/fly.toml --remote-only
```

- 第一次 build 約 5-10 分鐘（pnpm install + esbuild）
- 完成後 `fly status --app portfolio-line-bot` 會給 hostname
- 例：`portfolio-line-bot.fly.dev`

---

## 5. 拿到 public URL + 驗證 health

```powershell
fly status --app portfolio-line-bot
curl https://portfolio-line-bot.fly.dev/api/healthz
# 預期 {"status":"ok"}
```

---

## 6. 改 LINE Webhook

LINE Developers Console → Channel → Messaging API → Webhook settings：
- **Webhook URL**: `https://portfolio-line-bot.fly.dev/api/line/webhook`
- **Use webhook**: ON
- 按下方「Verify」應該回 `Success`

---

## 7. 設定 Rich Menu（圖已內建在 `data/rich-menu.jpg`）

1×3 版型，分三格：
- 左：大盤快訊（postback → `s=stk` → 走 stockMenu 第一張 bubble）
- 中：個股查詢（message → 使用者輸入名稱/代號 → stockTrend）
- 右：主選單（postback → `s=menu&style=bento`）

設定步驟（ADMIN_PASSWORD header 認證）：

```powershell
curl -X POST `
  -H "x-admin-token: $env:ADMIN_PASSWORD" `
  "https://portfolio-line-bot.fly.dev/api/admin/rich-menu?refresh=1"
```

成功回 `{ "ok": true, "richMenuId": "...", "refresh": true }`。

> `refresh=1` 會先 `listRichMenus()` + `DELETE` 舊的，再 `POST /richmenu` 建新的、上傳圖片、
> `setDefaultRichMenu()` 設為全頻道 default。**之後改圖只要再跑這條就會自動覆蓋。**

---

## 8. 端到端驗證

1. 手機加好友 / 解封鎖 bot → 應立刻收到 bento 主選單 + 「即時快訊」市場卡
2. 傳 `股票走勢` → 應收到 5 張 carousel（第 1 張 = 即時快訊，後 4 張 sector bubbles）
3. 傳 `鴻海` / `2317` → 應收到鴻海走勢圖
4. 點 LINE chat-bar 下方的 ≡ 打開 rich menu → 1×3 三格按鈕可用

看 log：
```powershell
fly logs --app portfolio-line-bot
```

---

## 9. 維運備忘

- 看 log：`fly logs --app portfolio-line-bot -f`
- 重啟：`fly apps restart portfolio-line-bot`
- 改 secret 後重啟生效
- `fly scale show --app portfolio-line-bot` 看機器數量（預設 1，min 1）
- 升級：`fly deploy --config artifacts/api-server/fly.toml --remote-only`

---

## 10. 出事排查

| 症狀 | 可能原因 |
|---|---|
| Webhook 200 但 bot 沒回 | LINE reply token 過期（>1 min）→ 看 log 有沒有 4xx from `api.line.me` |
| 收到訊息但 log 沒出現 | Webhook URL 還指舊 host（Replit / Render） |
| 一直 crash | `PORT` 沒設（Fly.toml 已寫死 8080）/ `DATABASE_URL` 連不上 |
| /api/healthz 200 但 webhook 401 | `LINE_CHANNEL_SECRET` 跟 LINE 後台對不上 |
| Rich menu 圖壞掉 | 重新跑 step 7 (`?refresh=1`) |

---

## 11. 從 Railway 切換到 Fly（已跑過 Railway 才看）

Railway 上的 service 不要直接刪，先：
1. 把 LINE Console webhook URL 改指 Fly
2. 等 24h 觀察 Fly log 沒問題再刪 Railway
3. Railway 那邊的 Postgres 可以保留（Neon / Supabase 都可直接搬走，不被平台綁）
