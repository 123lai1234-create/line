import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profileTable, type ProfileRow } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_PROFILE = {
  botName: "作品集小幫手",
  introMessage:
    "嗨,很高興認識你!我是這裡的作品集小幫手,幫你介紹我的創作與作品。點選下方連結就可以看到完整的作品集囉:",
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
