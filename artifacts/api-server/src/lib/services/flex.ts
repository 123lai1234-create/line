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
  // 一般訊息型 chip 用 text;需要帶隱藏資料回後端時改用 data(postback)。
  text?: string;
  data?: string;
  displayText?: string;
}

export function quickReply(items: QuickItem[]): Record<string, unknown> {
  return {
    items: items.slice(0, 13).map((i) => ({
      type: "action",
      action: i.data
        ? {
            type: "postback",
            label: i.label.slice(0, 20),
            data: i.data,
            displayText: (i.displayText ?? i.label).slice(0, 300),
          }
        : { type: "message", label: i.label.slice(0, 20), text: i.text ?? i.label },
    })),
  };
}

export function textMessage(text: string, items?: QuickItem[]): LineMessage {
  const msg: LineMessage = { type: "text", text };
  if (items && items.length > 0) msg.quickReply = quickReply(items);
  return msg;
}

// 可點的清單列(標題 + 可選副標 + 右側 ›),點擊送出 postback。用於地點/股票挑選。
export function pickRow(title: string, sub: string, data: string, displayText: string): LineMessage {
  const titleBox: LineMessage[] = [
    { type: "text", text: title, size: "md", weight: "bold", color: "#334155" },
  ];
  if (sub) titleBox.push({ type: "text", text: sub, size: "xxs", color: "#94A3B8", margin: "xs" });
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "14px",
    paddingBottom: "14px",
    action: { type: "postback", data, displayText: displayText.slice(0, 300) },
    contents: [
      { type: "box", layout: "vertical", flex: 1, contents: titleBox },
      { type: "text", text: "›", size: "xl", color: "#CBD5E1", flex: 0, gravity: "center" },
    ],
  };
}

// 迷你長條圖(走勢):在固定高度的橫向容器內,用 flex 比例畫出高低不一的彩色長條。
export function barChart(bars: { h: number; color: string }[], heightPx = 132): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "xs",
    height: `${heightPx}px`,
    alignItems: "flex-end",
    contents: bars.map((b) => {
      const bottom = Math.max(3, Math.min(100, Math.round(b.h)));
      const top = 100 - bottom;
      const col: LineMessage[] = [];
      if (top > 0) col.push({ type: "filler", flex: top });
      col.push({
        type: "box",
        layout: "vertical",
        flex: bottom,
        backgroundColor: b.color,
        cornerRadius: "2px",
        contents: [{ type: "filler" }],
      });
      return { type: "box", layout: "vertical", flex: 1, height: `${heightPx}px`, contents: col };
    }),
  };
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
