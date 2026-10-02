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

// ════════════════════════════════════════════════════════════════════════
// Xiaoyong (小詠機器人) Colorway
// ────────────────────────────────────────────────────────────────────────
// 借鑑台股 LINE bot「小詠機器人」的視覺風格:
//   • 深色背景 #0d1117 / 深綠色面板 #163524
//   • 綠色 CTA #2E7D5B (取代 Refined 的 #475569 subtle link)
//   • 機器人 IP 圓形頭像 (透過 IMAGE_BASE_URL/bot-ip.svg 或 bot-ip.png 載入)
//   • 白底主要功能 + 綠底重要 CTA 的雙層結構
//
// 啟用方式:在 mainMenu / services 內呼叫 xiaoyongHeader() / xiaoyongCTAButton()
// 等使用方式。
// ────────────────────────────────────────────────────────────────────────

export const XIAOYONG = {
  // 配色
  bgDark: "#0d1117",
  panelDark: "#163524",
  panelDarkAlt: "#1a2424",
  hairline: "#2a3d40",
  ink: "#ffffff",
  muted: "#94a3b8",
  sub: "#cbd5e1",
  accent: "#2E7D5B",
  accentSoft: "#1f4d3a",
  warn: "#f59e0b",
  danger: "#dc2626",
  // 主要按鈕（白底黑字）— 像小詠機器人的「月營收評級」「ETF 持股排行」
  primaryBg: "#ffffff",
  primaryInk: "#0d1117",
  // 次要按鈕（灰底白字）— 像小詠機器人的「網頁」「回主選單」
  secondaryBg: "#475569",
  secondaryInk: "#ffffff",
} as const;

// 把 bot IP 圖拼成完整的 HTTPS URL。呼叫端必須先設定 IMAGE_BASE_URL(例:https://donttalk.vercel.app)。
// 沒設定就回傳空字串,Flex image 會 fallback 到無圖。
export function botIpUrl(path = "bot-ip.png"): string {
  const base = process.env.IMAGE_BASE_URL ?? process.env.WEBSITE_URL ?? "";
  if (!base) return path; // 空 base 直接回傳相對路徑(會壞,但避免靜默)
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// Xiaoyong header — 深色背景 + 機器人 IP 圓形頭像 + botName
// 適合放在 Flex bubble header,讓對話一眼看到小詠風格。
// imageUrl:機器人 IP 完整 URL(可呼叫 botIpUrl() 拼接)
export function xiaoyongHeader(botName: string, imageUrl?: string): LineMessage {
  const ipUrl = imageUrl ?? botIpUrl();
  return {
    type: "box",
    layout: "horizontal",
    backgroundColor: XIAOYONG.bgDark,
    paddingAll: "16px",
    spacing: "md",
    alignItems: "center",
    contents: [
      // 機器人 IP 圓形頭像
      ...(ipUrl
        ? [
            {
              type: "image",
              url: ipUrl,
              size: "40px",
              aspectRatio: "1:1",
              aspectMode: "fit",
              flex: 0,
              backgroundColor: XIAOYONG.panelDark,
              cornerRadius: "20px",
            },
          ]
        : [
            // Fallback:用 emoji 當 IP(無圖環境)
            {
              type: "box",
              layout: "vertical",
              width: "40px",
              height: "40px",
              cornerRadius: "20px",
              backgroundColor: XIAOYONG.panelDark,
              justifyContent: "center",
              alignItems: "center",
              contents: [{ type: "text", text: "🤖", size: "xl", align: "center" }],
            },
          ]),
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        contents: [
          { type: "text", text: botName, size: "lg", weight: "bold", color: XIAOYONG.ink },
          { type: "text", text: "點下面任一卡片開始 · 或直接輸入指令", size: "xxs", color: XIAOYONG.muted, margin: "xs", wrap: true },
        ],
      },
    ],
  };
}

// Xiaoyong 4-列按鈕 tile — 小詠機器人風格的「主要功能按鈕」(白底黑字)。
// 用於 mainMenu 的 services 列表,每個服務一個 tile。
export function xiaoyongTile(label: string, sub: string, action: Record<string, unknown>): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    backgroundColor: XIAOYONG.primaryBg,
    cornerRadius: "12px",
    paddingTop: "14px",
    paddingBottom: "14px",
    paddingStart: "16px",
    paddingEnd: "16px",
    margin: "xs",
    action,
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        contents: [
          { type: "text", text: label, size: "md", weight: "bold", color: XIAOYONG.primaryInk },
          { type: "text", text: sub, size: "xxs", color: "#475569", margin: "xs", wrap: true },
        ],
      },
      { type: "text", text: "›", size: "xl", color: "#cbd5e1", flex: 0, gravity: "center" },
    ],
  };
}

// Xiaoyong CTA 按鈕 — 小詠機器人風格的「綠色 CTA」(綠底白字)。
// 用於 footer 重要行動(網站地圖、推廣、限時活動)。
export function xiaoyongCTAButton(label: string, action: Record<string, unknown>, fullWidth = true): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: XIAOYONG.accent,
    cornerRadius: "10px",
    paddingTop: "14px",
    paddingBottom: "14px",
    flex: fullWidth ? 1 : 0,
    action,
    contents: [{ type: "text", text: label, size: "sm", weight: "bold", color: "#ffffff", align: "center" }],
  };
}

// Xiaoyong secondary 按鈕 — 灰色(對應小詠機器人的「網頁」「回主選單」)
export function xiaoyongSecondaryButton(label: string, action: Record<string, unknown>, fullWidth = true): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: XIAOYONG.secondaryBg,
    cornerRadius: "10px",
    paddingTop: "14px",
    paddingBottom: "14px",
    flex: fullWidth ? 1 : 0,
    action,
    contents: [{ type: "text", text: label, size: "sm", weight: "bold", color: XIAOYONG.secondaryInk, align: "center" }],
  };
}

// Xiaoyong body 容器 — 深色背景內容區。Flex bubble body 包這個就有小詠風背景。
export function xiaoyongBody(contents: LineMessage[], paddingAll = "16px"): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: XIAOYONG.panelDarkAlt,
    paddingAll,
    spacing: "xs",
    contents,
  };
}

// Xiaoyong footer — 雙按鈕列(CTA + secondary)。小詠機器人「網站地圖」「回主選單」風格。
export function xiaoyongFooter(
  ctaLabel: string,
  ctaAction: Record<string, unknown>,
  secondaryLabel?: string,
  secondaryAction?: Record<string, unknown>,
): LineMessage {
  const cells: LineMessage[] = [xiaoyongCTAButton(ctaLabel, ctaAction, true)];
  if (secondaryLabel && secondaryAction) cells.push(xiaoyongSecondaryButton(secondaryLabel, secondaryAction, true));
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: XIAOYONG.bgDark,
    paddingAll: "12px",
    contents: [{ type: "box", layout: "horizontal", spacing: "sm", contents: cells }],
  };
}

// Xiaoyong 4-列按鈕組(給 carousel 一個 column 用)— 模擬小詠機器人截圖的 4 列按鈕 layout
export function xiaoyongFourTiles(
  tiles: { label: string; sub: string; action: Record<string, unknown> }[],
): LineMessage[] {
  return tiles.map((t) => xiaoyongTile(t.label, t.sub, t.action));
}
