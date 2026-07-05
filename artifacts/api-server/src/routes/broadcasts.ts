import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, broadcastsTable, type BroadcastRow } from "@workspace/db";
import { CreateBroadcastBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { broadcastMessage } from "../lib/line";

const router: IRouter = Router();

function serializeBroadcast(row: BroadcastRow) {
  return {
    id: row.id,
    message: row.message,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
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

  try {
    await broadcastMessage(parsed.data.message);
    const [row] = await db
      .insert(broadcastsTable)
      .values({ message: parsed.data.message, status: "sent", errorMessage: null })
      .returning();
    res.status(201).json(serializeBroadcast(row));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Failed to send LINE broadcast");
    await db
      .insert(broadcastsTable)
      .values({ message: parsed.data.message, status: "failed", errorMessage })
      .returning();
    res.status(502).json({ error: "Failed to send broadcast" });
  }
});

export default router;
