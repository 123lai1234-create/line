import { Router, type IRouter } from "express";
import { getRecentLogs, clearLogs } from "../lib/debug-buffer";

const router: IRouter = Router();

// ⚠️ debug only — 暫時開放,抓到 LINE bot silent fail 後會移除。
//   之後會移到 admin auth 後面或環境變數控制。
router.get("/debug/logs", (_req, res) => {
  res.json({ logs: getRecentLogs() });
});

router.post("/debug/logs/clear", (_req, res) => {
  clearLogs();
  res.json({ ok: true });
});

export default router;
