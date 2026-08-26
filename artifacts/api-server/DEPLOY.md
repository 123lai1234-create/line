# LINE bot → Railway 部署指南

Replit Reserved VM 退訂後的搬遷步驟。目標是把 `artifacts/api-server` 部署成 Railway 一個 always-on service，LINE webhook 指過去就復活。

## 0. 前置

需要的帳號 / 工具：
- [x] Railway 帳號（已有 `donttalk-production` 專案，OK 沿用或另開）
- [x] Neon 帳號（free tier 夠用）或其他 Postgres
- [x] LINE Developers Console 登入權限
- [x] 本機 `git`、`railway` CLI（`npm i -g @railway/cli`）、`pnpm`（驗證用）

需要的 5 個 env（先備好）：
| 變數 | 來源 |
|---|---|
| `DATABASE_URL` | Neon / Railway Postgres connection string |
| `LINE_CHANNEL_SECRET` | LINE Developers Console → channel → Basic settings |
| `LINE_CHANNEL_ACCESS_TOKEN` | 同上 → Messaging API |
| `ADMIN_PASSWORD` | 自己設（admin 後台登入用） |
| `SESSION_SECRET` | 自己產（`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`） |

---

## 1. 推上 GitHub

本專案是 monorepo，**整包推**就好（Railway 會用 rootDirectory 設到 `artifacts/api-server`，只跑那一支）：

```powershell
cd D:\line
git init
git add .
git commit -m "feat: add Railway deploy config for LINE bot"
# 接 GitHub remote，例：
git remote add origin https://github.com/<你的帳號>/<repo>.git
git branch -M main
git push -u origin main
```

> 如果這 repo 還沒乾淨（之前 Replit 連線過），先檢查 `.gitignore` 有把 `.replit*` / `.agents/` / `node_modules/` / `dist/` 排除。

---

## 2. 在 Railway 起專案

### 2a. 起 Postgres
1. 進 Railway dashboard → New Project → 命名（例：`line-bot`）
2. Add Service → Database → PostgreSQL
3. 等 provision 完，點進去 → Variables → 複製 `DATABASE_URL`（含 `?sslmode=require`）

### 2b. 部署 api-server
1. 同專案 → Add Service → GitHub Repo → 選剛推上去的 repo
2. Settings：
   - **Root Directory**: `artifacts/api-server`（重要！沒設會把整個 monorepo 編譯）
   - **Builder**: 留 `DOCKERFILE` 自動偵測
3. Variables → 注入上面 5 個 env
4. Deploy → 等首次 build（5-10 分鐘，包含 `pnpm install` + esbuild）

### 2c. 推 DB schema
第一次跑起來前要建表。兩種做法：

**做法 A（推薦，乾淨）：用 Railway one-shot CLI**
```powershell
railway link   # 選 line-bot 專案
railway run --service line-bot-api pnpm --filter @workspace/db run push
```
> 需要在 Railway shell 跑 `pnpm` — 沒裝的話改用做法 B

**做法 B：本地暫時指向 prod DB 推一次**
```powershell
$env:DATABASE_URL = "postgresql://...railway..."
pnpm --filter @workspace/db run push
```
> 用完把 local 的 env 清掉

### 2d. 拿到 Railway 網域
Service → Settings → Networking → Generate Domain
例：`https://line-bot-api-production-xxxx.up.railway.app`

### 2e. 驗證 health
```powershell
curl https://line-bot-api-production-xxxx.up.railway.app/api/healthz
# 預期回 {"status":"ok"}
```

---

## 3. 改 LINE Webhook

LINE Developers Console → Channel → Messaging API → Webhook settings：
- **Webhook URL**: `https://line-bot-api-production-xxxx.up.railway.app/api/line/webhook`
- **Use webhook**: ON
- 下方「Verify」按鈕按一下，應該回 `Success`

---

## 4. 端到端驗證

1. 從手機 LINE 傳訊息給 bot（`鴻海 走勢` / `股票走勢` / 隨便一句）
2. 應該立刻收到回應（個股走勢 flex 卡片 / 主選單）
3. 看 Railway logs：
   ```powershell
   railway logs --service line-bot-api
   ```
   應該看到 `Server listening on 8080` + 每次 webhook hit 的 `req.method=POST url=/api/line/webhook`

---

## 5. 還沒處理的東西

- [ ] Admin panel `line-bot-admin`（Vite SPA）目前是給 Replit 預覽用的，**Railway 沒跑這個**。需要時可另開一個 Railway static-site service 把 `artifacts/line-bot-admin` build 後丟上去
- [ ] Rich menu 圖片：之前 Replit 上若有綁定 alias，LINE 那邊不用動
- [ ] 時區：`startBroadcastScheduler` 用 `process.env.TZ` 拿時區，沒設就是 UTC。建議設 `Asia/Taipei`

---

## 6. 維運備忘

- 看 log：`railway logs --service line-bot-api -f`
- 重啟：`railway restart --service line-bot-api`
- 改 env 後要重啟才生效
- 排程推播（`scheduler.ts` 每 30s 掃）需要 service 一直醒著 — Railway default 不會 idle scale to zero，放心

---

## 7. 出事排查

| 症狀 | 可能原因 |
|---|---|
| Webhook 200 但 bot 沒回 | LINE reply token 過期（>1s）→ 看 log 有沒有 4xx from `api.line.me` |
| 收到訊息但 log 沒出現 | Webhook URL 還指 Replit 沒改 |
| 一直 crash | `PORT` env 沒設 / DB 連不上 / pnpm install 失敗 |
| /api/healthz 200 但 webhook 401 | `LINE_CHANNEL_SECRET` 跟 LINE 後台對不上 |
