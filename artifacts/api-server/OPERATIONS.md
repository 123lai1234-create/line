# api-server 運維筆記

## 健康檢查與監控

- `GET /api/healthz` 永遠回 `{ status: "ok" }`,是 keepalive 和外部 uptime 檢查的目標。
- webhook 耗時已寫 log:`routing text` → `routed, sending reply` 的 `ms` 欄位、
  以及 `reply sent`。回覆延遲突然變長時先看這段,再看上游(股價/天氣/超商官網)。
- 建議的外部監控:uptime 檢查打 `/api/healthz`,另設一個告警條件是
  log 裡 `event handler failed` 短時間內大量出現(代表某支服務掛了,
  使用者現在只會收到「請再試一次」的備援訊息)。

## 廣播與配額

- 立即廣播(`POST /api/broadcasts`)發送前會查 LINE 廣播配額,配額用完直接回 429,
  不會留下一筆 failed 紀錄。
- 排程廣播在 tick 時也會查配額,配額用完時該筆保持 `scheduled` 不動,
  等配額恢復或管理員手動處理再發,不會被標成 failed 丟掉。
- 排程預設由 in-process 每 30 秒輪詢(`SCHEDULER_ENABLED` 預設開啟)。
  改走外部 cron 時:部署環境設 `SCHEDULER_ENABLED=false`,並啟用
  外部 tick workflow(檔案尚未進 repo,因 push 需要 GitHub 授權的 workflow
  權限,補授權後再補推 `.github/workflows/broadcast-tick.yml`;
  該 workflow 平時只打 `POST /api/broadcasts/tick`,排程預設註解)。

## 安全相關環境變數

- `ADMIN_ORIGINS`:管理面板來源,逗號分隔。沒設定時 CORS 保持全開並在啟動時寫警告,
  上線前務必設定。
- `BROADCAST_TICK_SECRET`:外部 cron 觸發廣播的 secret。沒設定時
  `POST /api/broadcasts/tick` 直接回 503。
- `/api/debug/logs` 已收回管理員驗證後面,未登入回 401。

## 部署注意事項

- Render 免費版 15 分鐘沒流量會睡著,冷啟動約 50 秒;目前靠
  `.github/workflows/render-keepalive.yml` 每 14 分鐘 ping 一次撐著。
  遷移到不會睡的部署(Railway 等)後,該 workflow 就可以退役,
  但遷移本身是部署設定變更,不包含在程式碼優化裡,需另外確認。
- LINE Developers Console 的 webhook endpoint 必須是正式網址且 active,
  發布後若還指著開發用網域,機器人會靜悄悄沒反應(程式碼本身看不出來,
  要到 Console 對一次)。
