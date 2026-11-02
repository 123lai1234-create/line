import { Router, type IRouter } from "express";
import { getRecentLogs, clearLogs } from "../lib/debug-buffer";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// debug 入口曾經無驗證開放(抓 silent fail 用),現已收回管理員驗證後面:
// 未登入直接 401,不要讓任何人都能看 server log、清 log。
router.get("/debug/logs", requireAuth, (_req, res) => {
  res.type("text/plain").send(getRecentLogs().join("\n"));
});

router.post("/debug/logs/clear", requireAuth, (_req, res) => {
  clearLogs();
  res.json({ ok: true });
});

export default router;
