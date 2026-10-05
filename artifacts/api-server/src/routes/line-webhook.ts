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
  const log = req.log.child({ route: "line-webhook" });
  const events = Array.isArray((req.body as { events?: unknown[] })?.events)
    ? (req.body as { events: LineWebhookEvent[] }).events
    : [];
  if (events.length === 0) {
    log.warn("no events in payload");
    return;
  }
  log.info({ count: events.length }, "processing webhook events");

  let profile;
  try {
    profile = await ensureProfile();
  } catch (err) {
    log.error({ err }, "ensureProfile failed");
    return;
  }
  const ctx = {
    botName: profile.botName,
    introMessage: profile.introMessage,
    websiteUrl: profile.websiteUrl,
  };

  for (const event of events) {
    if (!event.replyToken) continue;

    try {
      if (event.type === "follow") {
        await replyMessages(event.replyToken, mainMenu(profile.botName, profile.websiteUrl));
      } else if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text ?? "";
        const t0 = Date.now();
        log.info({ text, len: text.length }, "routing text");
        const messages = await routeMessage(text, ctx);
        log.info({ ms: Date.now() - t0, msgs: messages.length }, "routed, sending reply");
        await replyMessages(event.replyToken, messages);
        log.info("reply sent");
      } else if (event.type === "postback" && event.postback?.data) {
        const messages = await routePostback(event.postback.data, ctx);
        await replyMessages(event.replyToken, messages);
      }
    } catch (err) {
      // 一個 event 失敗不能影響其他 events
      log.error({ err, type: event.type }, "event handler failed");
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
