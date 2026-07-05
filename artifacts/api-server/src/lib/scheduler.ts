import { and, eq, lte } from "drizzle-orm";
import { db, broadcastsTable } from "@workspace/db";
import { logger } from "./logger";
import { broadcastMessages } from "./line";
import { buildBroadcastMessages } from "./broadcast-build";

const CHECK_INTERVAL_MS = 30_000;

async function runDueBroadcasts(): Promise<void> {
  const due = await db
    .select()
    .from(broadcastsTable)
    .where(and(eq(broadcastsTable.status, "scheduled"), lte(broadcastsTable.scheduledAt, new Date())));

  for (const row of due) {
    // Atomically claim the row so overlapping ticks / multiple instances can't double-send.
    const claimed = await db
      .update(broadcastsTable)
      .set({ status: "sent", errorMessage: null, sentAt: new Date() })
      .where(and(eq(broadcastsTable.id, row.id), eq(broadcastsTable.status, "scheduled")))
      .returning({ id: broadcastsTable.id });
    if (claimed.length === 0) continue;

    try {
      const messages = buildBroadcastMessages({
        kind: row.kind,
        message: row.message,
        title: row.title,
        imageUrl: row.imageUrl,
        linkUrl: row.linkUrl,
        linkLabel: row.linkLabel,
      });
      await broadcastMessages(messages);
      logger.info({ broadcastId: row.id }, "Scheduled broadcast sent");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await db
        .update(broadcastsTable)
        .set({ status: "failed", errorMessage })
        .where(eq(broadcastsTable.id, row.id));
      logger.error({ err, broadcastId: row.id }, "Scheduled broadcast failed");
    }
  }
}

export function startBroadcastScheduler(): void {
  const tick = (): void => {
    runDueBroadcasts().catch((err: unknown) => {
      logger.error({ err }, "Broadcast scheduler tick failed");
    });
  };
  setInterval(tick, CHECK_INTERVAL_MS).unref();
  tick();
}
