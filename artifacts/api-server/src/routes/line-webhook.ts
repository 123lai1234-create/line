import { Router, type IRouter, type Request } from "express";
import { verifyLineSignature, replyMessage } from "../lib/line";
import { ensureProfile } from "./profile";

const router: IRouter = Router();

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  message?: { type: string };
}

async function handleWebhookEvents(req: Request): Promise<void> {
  const events = Array.isArray((req.body as { events?: unknown[] })?.events)
    ? ((req.body as { events: LineWebhookEvent[] }).events)
    : [];
  if (events.length === 0) return;

  const profile = await ensureProfile();
  const introText = `${profile.introMessage}\n\n${profile.websiteUrl}`;

  for (const event of events) {
    if (!event.replyToken) continue;
    if (event.type === "follow") {
      await replyMessage(event.replyToken, introText);
    } else if (event.type === "message" && event.message?.type === "text") {
      await replyMessage(event.replyToken, introText);
    }
  }
}

router.post("/line/webhook", (req, res) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.header("x-line-signature");

  if (!rawBody || !verifyLineSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({});

  void handleWebhookEvents(req).catch((err: unknown) => {
    req.log.error({ err }, "Failed to process LINE webhook events");
  });
});

export default router;
