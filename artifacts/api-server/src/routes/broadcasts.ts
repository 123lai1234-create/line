import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { desc } from "drizzle-orm";
import { db, broadcastsTable, type BroadcastRow } from "@workspace/db";
import { CreateBroadcastBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { broadcastMessages, checkBroadcastQuota } from "../lib/line";
import { runDueBroadcasts } from "../lib/scheduler";
import { buildBroadcastMessages } from "../lib/broadcast-build";

const router: IRouter = Router();

function serializeBroadcast(row: BroadcastRow) {
  return {
    id: row.id,
    kind: row.kind,
    message: row.message ?? null,
    title: row.title ?? null,
    imageUrl: row.imageUrl ?? null,
    linkUrl: row.linkUrl ?? null,
    linkLabel: row.linkLabel ?? null,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    sentAt: row.sentAt.toISOString(),
  };
}

router.get("/broadcasts", requireAuth, async (_req, res) => {
  const rows = await db.select().from(broadcastsTable).orderBy(desc(broadcastsTable.sentAt));
  res.json(rows.map(serializeBroadcast));
});

router.post("/broadcasts", requireAuth, async (req, res) => {
  const parsed = CreateBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { kind, message, title, imageUrl, linkUrl, linkLabel, scheduledAt } = parsed.data;

  // Per-kind validation
  if (kind === "text" && !message?.trim()) {
    res.status(400).json({ error: "文字訊息不能空白" });
    return;
  }
  if (kind === "image" && !imageUrl?.trim()) {
    res.status(400).json({ error: "圖片訊息需要圖片網址" });
    return;
  }
  if (kind === "flex" && (!title?.trim() || !message?.trim())) {
    res.status(400).json({ error: "卡片訊息需要標題與內文" });
    return;
  }
  if ((kind === "image" || kind === "flex") && imageUrl && !/^https:\/\//i.test(imageUrl)) {
    res.status(400).json({ error: "圖片網址必須是 https 開頭" });
    return;
  }
  if (kind === "flex" && linkUrl && !/^https:\/\//i.test(linkUrl)) {
    res.status(400).json({ error: "按鈕連結必須是 https 開頭" });
    return;
  }

  const content = {
    kind,
    message: message ?? null,
    title: title ?? null,
    imageUrl: imageUrl ?? null,
    linkUrl: linkUrl ?? null,
    linkLabel: linkLabel ?? null,
  };

  // Scheduled send: validate the time, then store and let the scheduler send it later
  if (scheduledAt) {
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now() + 5_000) {
      res.status(400).json({ error: "排程時間必須是未來的時間" });
      return;
    }
    const [row] = await db
      .insert(broadcastsTable)
      .values({ ...content, status: "scheduled", scheduledAt: when, errorMessage: null })
      .returning();
    res.status(201).json(serializeBroadcast(row));
    return;
  }

  // 立即廣播先查配額:管理員當下就在等結果,配額用完直接拒絕,
  // 不要等 LINE API 拒絕才變成一筆 failed 紀錄。
  const { exhausted, remaining } = await checkBroadcastQuota();
  if (exhausted) {
    res.status(429).json({ error: "LINE 廣播配額已用完,請等下個月配額恢復再發" });
    return;
  }
  req.log.info({ remaining }, "Broadcast quota check passed");

  try {
    await broadcastMessages(buildBroadcastMessages(content));
    const [row] = await db
      .insert(broadcastsTable)
      .values({ ...content, status: "sent", errorMessage: null })
      .returning();
    res.status(201).json(serializeBroadcast(row));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to send LINE broadcast");
    await db
      .insert(broadcastsTable)
      .values({ ...content, status: "failed", errorMessage })
      .returning();
    res.status(502).json({ error: "Failed to send broadcast" });
  }
});

// 外部 cron 觸發排程廣播的入口(給 GitHub Actions 用)。
// in-process 的 setInterval 在 instance 睡著/重啟時不會跑,外部 cron 是備援。
// 認證不用管理員 cookie(外部 cron 拿不到 cookie),改用專用 secret header:
//   POST /api/broadcasts/tick,header X-Cron-Secret: <BROADCAST_TICK_SECRET>
// BROADCAST_TICK_SECRET 沒設定時此入口直接 503,絕不無驗證開放。
// claim 機制保證外部 tick 和 in-process tick 同時跑也不會重複發送。
router.post("/broadcasts/tick", async (req, res) => {
  const secret = process.env.BROADCAST_TICK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Broadcast tick is not configured" });
    return;
  }
  const provided = req.header("x-cron-secret");
  if (!provided || provided.length !== secret.length) {
    res.status(401).json({ error: "Not authorized" });
    return;
  }
  // timingSafeEqual 需要等長,上面已先擋掉不等長的情況。
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    res.status(401).json({ error: "Not authorized" });
    return;
  }
  try {
    await runDueBroadcasts();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Broadcast tick failed");
    res.status(502).json({ error: "Broadcast tick failed" });
  }
});

export default router;
