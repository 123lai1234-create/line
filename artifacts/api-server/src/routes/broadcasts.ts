import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, broadcastsTable, type BroadcastRow } from "@workspace/db";
import { CreateBroadcastBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { broadcastMessages } from "../lib/line";
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

export default router;
