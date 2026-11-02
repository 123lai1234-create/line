import { and, eq, lte } from "drizzle-orm";
import { db, broadcastsTable } from "@workspace/db";
import { logger } from "./logger";
import { broadcastMessages, checkBroadcastQuota } from "./line";
import { buildBroadcastMessages } from "./broadcast-build";

const CHECK_INTERVAL_MS = 30_000;

// 廣播前先查配額:配額用完時不要把 row 標成 failed 就丟掉,
// 而是留在 scheduled,等下個月配額恢復或管理員手動處理再發。
// (立即廣播的路徑在 routes/broadcasts.ts 直接拒絕,因為管理員當下就在等結果。)
export async function runDueBroadcasts(): Promise<void> {
  const due = await db
    .select()
    .from(broadcastsTable)
    .where(and(eq(broadcastsTable.status, "scheduled"), lte(broadcastsTable.scheduledAt, new Date())));

  if (due.length > 0) {
    const { exhausted } = await checkBroadcastQuota();
    if (exhausted) {
      logger.warn({ count: due.length }, "Skipping due broadcasts: LINE quota exhausted");
      return;
    }
  }

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
