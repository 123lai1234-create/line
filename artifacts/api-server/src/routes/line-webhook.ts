import { Router, type IRouter, type Request } from "express";
import type { Logger } from "pino";
import { verifyLineSignature, replyMessages } from "../lib/line";
import { routeMessage, routePostback, mainMenu } from "../lib/services/router";
import { stockUpdate } from "../lib/services/stock";
import { ensureProfile, DEFAULT_PROFILE } from "./profile";

const router: IRouter = Router();

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

// reply token 只有約 1 分鐘壽命,單一事件的處理預算壓在 50 秒,
// 超時就回一句話,不要讓使用者空等、也不要讓後面的事件跟著過期。
const EVENT_TIMEOUT_MS = 50_000;
const FALLBACK_TEXT = "查詢逾時或服務暫時異常,請再試一次 🙏";

// 上次成功抓到的 profile:DB 短暫故障時用舊值繼續跑,
// 連一次都沒成功過才退回程式內建預設值,不要因為 profile 抓不到就整批丟掉。
type ProfileCtx = typeof DEFAULT_PROFILE;
let lastKnownProfile: ProfileCtx = DEFAULT_PROFILE;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

async function handleEvent(event: LineWebhookEvent, ctx: ProfileCtx, log: Logger): Promise<void> {
  if (!event.replyToken) return;
  const replyToken = event.replyToken;
  try {
    let messages: unknown[] | null | undefined;
    if (event.type === "follow") {
      // 加好友 → 先 bento 主選單,再 append 一張「即時快報」market update。
      // 共 2 則 message,符合 LINE Messaging API 5 則上限。
      // 用 stockUpdate()(只發 page 1)而非 stockMenu()(會給 5 則 sector bubbles),
      // 避免 reply token 1 分鐘上限被拖到極限。
      messages = await withTimeout(
        (async () => [...mainMenu(ctx.botName, ctx.websiteUrl), await stockUpdate()])(),
        EVENT_TIMEOUT_MS,
      );
    } else if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text ?? "";
      const t0 = Date.now();
      log.info({ text, len: text.length }, "routing text");
      messages = await withTimeout(routeMessage(text, ctx), EVENT_TIMEOUT_MS);
      log.info({ ms: Date.now() - t0, msgs: messages?.length ?? 0 }, "routed, sending reply");
    } else if (event.type === "postback" && event.postback?.data) {
      messages = await withTimeout(routePostback(event.postback.data, ctx), EVENT_TIMEOUT_MS);
    } else {
      return;
    }

    if (!messages) {
      // 逾時:至少回一句話,不要靜悄悄沒反應。
      await replyMessages(replyToken, [{ type: "text", text: FALLBACK_TEXT }]);
      return;
    }
    await replyMessages(replyToken, messages);
    log.info("reply sent");
  } catch (err) {
    // 一個 event 失敗不能影響其他 events;失敗時也盡量回一句話,
    // 除非 reply token 已經過期(那時 reply 本身也會失敗,只能記 log)。
    log.error({ err, type: event.type }, "event handler failed");
    try {
      await replyMessages(replyToken, [{ type: "text", text: FALLBACK_TEXT }]);
    } catch {
      // 備援回覆也失敗就真的沒辦法了,log 已經記了。
    }
  }
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

  let profile = lastKnownProfile;
  try {
    const fresh = await ensureProfile();
    profile = {
      botName: fresh.botName,
      introMessage: fresh.introMessage,
      websiteUrl: fresh.websiteUrl,
    };
    lastKnownProfile = profile;
  } catch (err) {
    log.warn({ err }, "ensureProfile failed, using last known profile");
  }
  const ctx = {
    botName: profile.botName,
    introMessage: profile.introMessage,
    websiteUrl: profile.websiteUrl,
  };

  // 平行處理:循序 await 會讓後面的事件等前面的慢查詢,
  // 拖到 reply token 過期。allSettled 保證單一事件失敗不影響其他。
  await Promise.allSettled(events.map((event) => handleEvent(event, ctx, log)));
}

// LINE Developers Console 的「Verify」按鈕會送 **GET**(空 body、空簽章)來測試 webhook。
// 沒有這個 handler,按下去只會顯示 Failed(其實 webhook 本身是好的)。
router.get("/line/webhook", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.post("/line/webhook", (req, res) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.header("x-line-signature");

  // 空的 POST 也是 LINE 的驗證 ping → 回 200,但不放行任何事件
  if (!rawBody || rawBody.length === 0) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!verifyLineSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({});

  void handleWebhookEvents(req).catch((err: unknown) => {
    req.log.error({ err }, "Failed to process LINE webhook events");
  });
});

export default router;
