import { linkButton, type LineMessage } from "./services/flex";

export interface BroadcastContent {
  kind: "text" | "image" | "flex";
  message?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
}

function flexCard(c: BroadcastContent): LineMessage {
  const bodyContents: LineMessage[] = [];
  if (c.title) {
    bodyContents.push({
      type: "text",
      text: c.title,
      weight: "bold",
      size: "lg",
      color: "#0F172A",
      wrap: true,
    });
  }
  if (c.message) {
    bodyContents.push({
      type: "text",
      text: c.message,
      size: "sm",
      color: "#334155",
      wrap: true,
      margin: c.title ? "md" : "none",
    });
  }

  const bubble: Record<string, unknown> = { type: "bubble" };
  if (c.imageUrl) {
    bubble.hero = {
      type: "image",
      url: c.imageUrl,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    };
  }
  bubble.body = {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: bodyContents.length > 0 ? bodyContents : [{ type: "text", text: " ", size: "sm" }],
  };
  if (c.linkUrl) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [linkButton(c.linkLabel || "查看更多", c.linkUrl, "#2563EB")],
    };
  }

  return {
    type: "flex",
    altText: c.title || c.message || "新訊息",
    contents: bubble,
  };
}

export function buildBroadcastMessages(c: BroadcastContent): LineMessage[] {
  if (c.kind === "image") {
    const messages: LineMessage[] = [];
    if (c.imageUrl) {
      messages.push({
        type: "image",
        originalContentUrl: c.imageUrl,
        previewImageUrl: c.imageUrl,
      });
    }
    if (c.message) {
      messages.push({ type: "text", text: c.message });
    }
    return messages;
  }

  if (c.kind === "flex") {
    return [flexCard(c)];
  }

  return [{ type: "text", text: c.message ?? "" }];
}
