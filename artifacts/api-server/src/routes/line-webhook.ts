import { Router, type IRouter, type Request } from "express";
import { verifyLineSignature, replyMessages } from "../lib/line";
import { routeMessage, routePostback, mainMenu } from "../lib/services/router";
import { ensureProfile } from "./profile";

const router: IRouter = Router();

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

async function handleWebhookEvents(req: Request): Promise<void> {
  const events = Array.isArray((req.body as { events?: unknown[] })?.events)
    ? (req.body as { events: LineWebhookEvent[] }).events
    : [];
  if (events.length === 0) return;

  const profile = await ensureProfile();
  const ctx = {
    botName: profile.botName,
    introMessage: profile.introMessage,
    websiteUrl: profile.websiteUrl,
  };

  for (const event of events) {
    if (!event.replyToken) continue;

    if (event.type === "follow") {
      await replyMessages(event.replyToken, mainMenu(profile.botName, profile.websiteUrl));
    } else if (event.type === "message" && event.message?.type === "text") {
      const messages = await routeMessage(event.message.text ?? "", ctx);
      await replyMessages(event.replyToken, messages);
    } else if (event.type === "postback" && event.postback?.data) {
      const messages = await routePostback(event.postback.data, ctx);
      await replyMessages(event.replyToken, messages);
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
