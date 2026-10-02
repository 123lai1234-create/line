import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profileTable, type ProfileRow } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_PROFILE = {
  // 簡潔化:從「不說的助理」→「不說」(小詠機器人風的 ip 化命名)
  // 改為一行 self-id,搭配「指令清單」(info-first 風格)。
  botName: "不說",
  introMessage: [
    "嗨,我是「不說」 🤖 你的作品集 AI 小幫手。",
    "",
    "直接輸入就能開始:",
    "· 潛水海況 · 股票走勢 · 音樂欣賞 · 蛋白質設計 · 專案介紹",
    "",
    "想看完整作品與互動展示 👇",
  ].join("\n"),
  websiteUrl: "https://donttalk.vercel.app/",
};

export async function ensureProfile(): Promise<ProfileRow> {
  const [existing] = await db.select().from(profileTable).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(profileTable).values(DEFAULT_PROFILE).returning();
  return created;
}

function serializeProfile(profile: ProfileRow) {
  return {
    botName: profile.botName,
    introMessage: profile.introMessage,
    websiteUrl: profile.websiteUrl,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

router.get("/profile", requireAuth, async (_req, res) => {
  const profile = await ensureProfile();
  res.json(serializeProfile(profile));
});

router.put("/profile", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const existing = await ensureProfile();
  const [updated] = await db
    .update(profileTable)
    .set(parsed.data)
    .where(eq(profileTable.id, existing.id))
    .returning();

  res.json(serializeProfile(updated));
});

export default router;
