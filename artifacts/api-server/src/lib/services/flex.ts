export type LineMessage = Record<string, unknown>;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 4000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface QuickItem {
  label: string;
  text: string;
}

export function quickReply(items: QuickItem[]): Record<string, unknown> {
  return {
    items: items.slice(0, 13).map((i) => ({
      type: "action",
      action: { type: "message", label: i.label.slice(0, 20), text: i.text },
    })),
  };
}

export function textMessage(text: string, items?: QuickItem[]): LineMessage {
  const msg: LineMessage = { type: "text", text };
  if (items && items.length > 0) msg.quickReply = quickReply(items);
  return msg;
}

export function kvRow(label: string, value: string): LineMessage {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, color: "#94A3B8", size: "sm", flex: 2 },
      {
        type: "text",
        text: value,
        color: "#0F172A",
        size: "sm",
        weight: "bold",
        flex: 5,
        wrap: true,
      },
    ],
  };
}

export function linkButton(label: string, uri: string, color = "#10B981"): LineMessage {
  return {
    type: "button",
    style: "primary",
    height: "sm",
    color,
    action: { type: "uri", label: label.slice(0, 20), uri },
  };
}
