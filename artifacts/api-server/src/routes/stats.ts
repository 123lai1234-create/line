import { Router, type IRouter } from "express";
import { count } from "drizzle-orm";
import { db, broadcastsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getFollowerInsight, getMessageQuota, getQuotaConsumption } from "../lib/line";

const router: IRouter = Router();

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

router.get("/stats", requireAuth, async (req, res) => {
  const dateStr = yesterdayDateString();

  const [broadcastCountResult] = await db.select({ value: count() }).from(broadcastsTable);

  let followerCount: number | null = null;
  let followerCountDate: string | null = null;
  try {
    const insight = await getFollowerInsight(dateStr);
    if (insight) {
      followerCount = insight.followers;
      followerCountDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch LINE follower insight");
  }

  let targetLimit: number | null = null;
  try {
    const quota = await getMessageQuota();
    if (quota && quota.type === "limited" && typeof quota.value === "number") {
      targetLimit = quota.value;
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch LINE message quota");
  }

  let totalUsageThisMonth: number | null = null;
  try {
    const consumption = await getQuotaConsumption();
    if (consumption) {
      totalUsageThisMonth = consumption.totalUsage;
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch LINE quota consumption");
  }

  res.json({
    followerCount,
    followerCountDate,
    targetLimit,
    totalUsageThisMonth,
    broadcastCount: broadcastCountResult?.value ?? 0,
  });
});

export default router;
