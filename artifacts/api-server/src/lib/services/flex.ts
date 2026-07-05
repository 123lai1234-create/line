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

// 彩色圓角標籤(pill),用於漲跌幅、狀態徽章等
export function pill(text: string, bg: string, color: string): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: bg,
    cornerRadius: "6px",
    paddingAll: "5px",
    paddingStart: "9px",
    paddingEnd: "9px",
    flex: 0,
    contents: [{ type: "text", text, size: "xs", weight: "bold", color, align: "center" }],
  };
}

// 小圓點狀態指示燈(good/caution/bad)
export function dot(color: string, size = "10px"): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    width: size,
    height: size,
    cornerRadius: size,
    backgroundColor: color,
    flex: 0,
    contents: [{ type: "filler" }],
  };
}

// 低調文字型頁尾連結(淺灰底、置中),取代大面積彩色按鈕
export function subtleLink(label: string, uri: string): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: "#F8FAFC",
    cornerRadius: "10px",
    paddingAll: "12px",
    action: { type: "uri", label: label.slice(0, 20), uri },
    contents: [
      { type: "text", text: `${label}  ›`, size: "xs", weight: "bold", color: "#475569", align: "center" },
    ],
  };
}

const GAUGE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];
// 三段式指標條:0=GO(綠) 1=CAUTION(黃) 2=NO-GO(紅),點亮目前所在段
export function gaugeBar(level: number): LineMessage {
  const active = Math.max(0, Math.min(2, level | 0));
  return {
    type: "box",
    layout: "horizontal",
    spacing: "xs",
    margin: "sm",
    contents: [0, 1, 2].map((i) => ({
      type: "box",
      layout: "vertical",
      height: "6px",
      flex: 1,
      cornerRadius: "3px",
      backgroundColor: i === active ? GAUGE_COLORS[i] : "#E2E8F0",
      contents: [{ type: "filler" }],
    })),
  };
}
