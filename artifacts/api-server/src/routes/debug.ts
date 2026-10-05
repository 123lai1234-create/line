import { Router, type IRouter } from "express";
import { getRecentLogs, clearLogs } from "../lib/debug-buffer";

const router: IRouter = Router();

// 暫時開放 debug 入口 — 抓 LINE bot silent fail 用。
// 之後找到問題後會移到 admin auth 後面或拿掉。
router.get("/debug/logs", (_req, res) => {
  res.type("text/plain").send(getRecentLogs().join("\n"));
});

router.post("/debug/logs/clear", (_req, res) => {
  clearLogs();
  res.json({ ok: true });
});

export default router;
