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
  await replyMessages(replyToken, [{ type: "text", text }]);
}

export async function replyMessages(replyToken: string, messages: unknown[]): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
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

const LINE_DATA_BASE = "https://api-data.line.me/v2/bot";

export async function listRichMenus(): Promise<{ richMenuId: string }[]> {
  const res = await fetch(`${LINE_API_BASE}/richmenu/list`, {
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { richmenus?: { richMenuId: string }[] };
  return data.richmenus ?? [];
}

export async function deleteRichMenu(richMenuId: string): Promise<void> {
  await fetch(`${LINE_API_BASE}/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });
}

export async function createRichMenu(richMenu: unknown): Promise<string> {
  const res = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify(richMenu),
  });
  if (!res.ok) {
    throw new Error(`createRichMenu failed ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { richMenuId: string };
  return data.richMenuId;
}

export async function uploadRichMenuImage(
  richMenuId: string,
  image: Buffer,
  contentType: "image/png" | "image/jpeg",
): Promise<void> {
  const res = await fetch(`${LINE_DATA_BASE}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: new Uint8Array(image),
  });
  if (!res.ok) {
    throw new Error(`uploadRichMenuImage failed ${res.status}: ${await res.text()}`);
  }
}

export async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getChannelAccessToken()}` },
  });
  if (!res.ok) {
    throw new Error(`setDefaultRichMenu failed ${res.status}: ${await res.text()}`);
  }
}
