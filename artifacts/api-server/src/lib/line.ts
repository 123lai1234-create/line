import crypto from "node:crypto";
import { logger } from "./logger";

const LINE_API_BASE = "https://api.line.me/v2/bot";

function getChannelAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }
  return token;
}

function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error("LINE_CHANNEL_SECRET is not set");
  }
  return secret;
}

export function verifyLineSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", getChannelSecret()).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function replyMessage(replyToken: string, text: string): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "LINE reply message failed");
  }
}

export async function broadcastMessage(text: string): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify({ messages: [{ type: "text", text }] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE broadcast failed with status ${res.status}: ${body}`);
  }
}

export async function getFollowerInsight(dateStr: string): Promise<{ followers: number } | null> {
  const res = await fetch(`${LINE_API_BASE}/insight/followers?date=${dateStr}`, {
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { status?: string; followers?: number };
  if (data.status !== "ready" || typeof data.followers !== "number") return null;

  return { followers: data.followers };
}

export async function getMessageQuota(): Promise<{ type: string; value?: number } | null> {
  const res = await fetch(`${LINE_API_BASE}/message/quota`, {
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });

  if (!res.ok) return null;
  return (await res.json()) as { type: string; value?: number };
}

export async function getQuotaConsumption(): Promise<{ totalUsage: number } | null> {
  const res = await fetch(`${LINE_API_BASE}/message/quota/consumption`, {
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });

  if (!res.ok) return null;
  return (await res.json()) as { totalUsage: number };
}
