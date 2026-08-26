import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profileTable, type ProfileRow } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_PROFILE = {
  botName: "不說的助理",
  introMessage: [
    "嗨,很高興認識你 👋 我是這個作品集的 AI 小幫手!",
    "",
    "我的主人是「電資工程 × 生物醫學」雙碩士,身兼工程師、生醫研究者與 AI 平台設計者,專長是把蛋白質語言模型、基因分析工具與互動介面,整合成真正能操作的跨域研究平台。",
    "",
    "幾個代表作品:",
    "🧬 蛋白質 AI 設計系統 — ESM-2、ProteinMPNN、Bayesian Optimization、REINFORCE 端到端 Pipeline",
    "🔬 基因 AI 分析平台 — RAG 文件搜尋、啟動子設計、CRISPR 導引排序、變異效應評估",
    "📊 NGS 次世代定序工作站 — 從實驗設計到 QC 與功能分析",
    "🧪 ProteinMPNN 互動工作台 — 序列設計、3D 結構預覽與突變著色",
    "",
    "2026 開放洽談研究合作、產品開發與平台整合的機會!",
    "想看完整作品與互動展示,歡迎點下方連結 👇",
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
