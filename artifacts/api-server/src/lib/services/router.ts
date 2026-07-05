import { textMessage, quickReply, type LineMessage, type QuickItem } from "./flex";
import { weatherEntry, weatherFor, locByKeyword } from "./weather";
import { stockMenu, stockTrend, resolveStock } from "./stock";
import { musicMenu } from "./music";
import { projectsMenu, projectResult } from "./projects";
import { proteinGuide, proteinHowto, proteinAnalyze, looksLikeProteinSeq } from "./protein";

const MAIN_MENU_ITEMS: QuickItem[] = [
  { label: "🤿 潛水海況", text: "潛水海況" },
  { label: "📈 股票走勢", text: "股票走勢" },
  { label: "🎧 音樂欣賞", text: "音樂欣賞" },
  { label: "🧬 蛋白質設計", text: "蛋白質設計" },
  { label: "🗂 專案介紹", text: "專案介紹" },
  { label: "ℹ️ 關於我", text: "關於我" },
];

interface Service {
  emoji: string;
  title: string;
  desc: string;
  action: string;
  accent: string;
  bg: string;
}

// 主選單以「Bento 色塊磚牆」呈現:每個服務是一塊代表色磚,依分類分組
const SERVICES: Service[] = [
  { emoji: "🤿", title: "潛水海況", desc: "6 大潛點 · 未來 5 天浪高風速", action: "潛水海況", accent: "#0EA5E9", bg: "#E0F2FE" },
  { emoji: "📈", title: "股票走勢", desc: "台股即時報價 · 一個月走勢圖", action: "股票走勢", accent: "#DC2626", bg: "#FEE2E2" },
  { emoji: "🎧", title: "音樂欣賞", desc: "創作 MV 精選輪播", action: "音樂欣賞", accent: "#7C3AED", bg: "#EDE9FE" },
  { emoji: "🧬", title: "蛋白質設計", desc: "AI 流程導覽 + 序列分析", action: "蛋白質設計", accent: "#059669", bg: "#D1FAE5" },
  { emoji: "🗂", title: "專案介紹", desc: "生醫 AI、量化研究作品", action: "專案介紹", accent: "#D97706", bg: "#FEF3C7" },
];

const S = Object.fromEntries(SERVICES.map((s) => [s.title, s])) as Record<string, Service>;

// 單塊 Bento 磚:代表色底、白色半透明圖示格、彩色標題 + 說明。feature=橫向大磚。
function tile(s: Service, feature = false): LineMessage {
  const iconChip: LineMessage = {
    type: "box",
    layout: "vertical",
    width: feature ? "48px" : "40px",
    height: feature ? "48px" : "40px",
    cornerRadius: "12px",
    backgroundColor: "#FFFFFF80",
    justifyContent: "center",
    alignItems: "center",
    flex: 0,
    contents: [{ type: "text", text: s.emoji, size: feature ? "xl" : "lg", align: "center" }],
  };
  const textBox: LineMessage = {
    type: "box",
    layout: "vertical",
    flex: 1,
    contents: [
      { type: "text", text: s.title, size: "sm", weight: "bold", color: s.accent },
      { type: "text", text: s.desc, size: "xxs", color: "#64748B", margin: "xs", wrap: true },
    ],
  };
  return {
    type: "box",
    layout: feature ? "horizontal" : "vertical",
    backgroundColor: s.bg,
    cornerRadius: "16px",
    paddingAll: "12px",
    spacing: feature ? "md" : "none",
    alignItems: feature ? "center" : undefined,
    flex: 1,
    action: { type: "message", label: s.title, text: s.action },
    contents: feature ? [iconChip, textBox] : [iconChip, { ...textBox, margin: "md" }],
  } as LineMessage;
}

function tileRow(a: Service, b: Service, margin = "sm"): LineMessage {
  return { type: "box", layout: "horizontal", spacing: "md", margin, contents: [tile(a), tile(b)] };
}

function sectionLabel(text: string): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    spacing: "sm",
    margin: "lg",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "6px",
        height: "6px",
        cornerRadius: "3px",
        backgroundColor: "#CBD5E1",
        flex: 0,
        contents: [{ type: "filler" }],
      },
      { type: "text", text, size: "xs", weight: "bold", color: "#94A3B8" },
    ],
  };
}

function footerCell(label: string, action: Record<string, unknown>): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    paddingTop: "13px",
    paddingBottom: "13px",
    action,
    contents: [{ type: "text", text: label, size: "xs", weight: "bold", color: "#475569", align: "center" }],
  };
}

export function mainMenu(botName: string, websiteUrl?: string): LineMessage[] {
  const bubbleContents: Record<string, unknown> = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "none",
      contents: [
        { type: "text", text: "MAIN MENU", size: "xs", weight: "bold", color: "#94A3B8" },
        {
          type: "text",
          text: `你好,我是 ${botName}`,
          size: "xl",
          weight: "bold",
          color: "#0F172A",
          margin: "md",
          wrap: true,
        },
        {
          type: "text",
          text: "選一個分類,或直接輸入指令。",
          size: "sm",
          color: "#64748B",
          margin: "sm",
          wrap: true,
        },
        sectionLabel("即時工具"),
        tileRow(S["潛水海況"], S["股票走勢"]),
        sectionLabel("創作作品"),
        tile(S["音樂欣賞"], true),
        tileRow(S["蛋白質設計"], S["專案介紹"]),
      ],
    },
  };

  const footerCells: LineMessage[] = [];
  if (websiteUrl) {
    footerCells.push(footerCell("前往網站", { type: "uri", label: "前往網站", uri: websiteUrl }));
    footerCells.push({ type: "separator", color: "#E2E8F0" });
  }
  footerCells.push(footerCell("關於我", { type: "message", label: "關於我", text: "關於我" }));
  bubbleContents.footer = {
    type: "box",
    layout: "horizontal",
    backgroundColor: "#F8FAFC",
    contents: footerCells,
  };

  const bubble: LineMessage = {
    type: "flex",
    altText: `${botName}・服務選單`,
    contents: bubbleContents,
    quickReply: quickReply(MAIN_MENU_ITEMS),
  };
  return [bubble];
}

export function aboutMessage(introMessage: string, websiteUrl: string): LineMessage[] {
  return [
    {
      ...textMessage(`${introMessage}\n\n${websiteUrl}`),
      quickReply: quickReply(MAIN_MENU_ITEMS),
    },
  ];
}

interface RouteContext {
  botName: string;
  introMessage: string;
  websiteUrl: string;
}

function isMenuTrigger(t: string): boolean {
  return /^(選單|主選單|menu|hi|hello|哈囉|你好|嗨|\?|？|幫助|help|開始|start)$/i.test(t);
}

function withMenu(messages: LineMessage[]): LineMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (!last.quickReply) last.quickReply = quickReply(MAIN_MENU_ITEMS);
  return messages;
}

export async function routeMessage(raw: string, ctx: RouteContext): Promise<LineMessage[]> {
  const text = raw.trim();

  if (isMenuTrigger(text)) return mainMenu(ctx.botName, ctx.websiteUrl);
  if (/關於我|about|作者|你是誰|自我介紹/i.test(text)) {
    return aboutMessage(ctx.introMessage, ctx.websiteUrl);
  }

  // 明確的「專案 <名稱>」請求 → 專案詳情(需早於蛋白質關鍵字,才能讓「專案 蛋白質」進到報告)
  if (/^(專案|作品)/.test(text)) {
    const detail = /蛋白|基因|ngs|互動|mpnn|量化|遺傳|etf/i.test(text);
    return detail ? withMenu(projectResult(text, ctx.websiteUrl)) : withMenu(projectsMenu());
  }

  // 貼上胺基酸序列 → 直接分析(需在其他關鍵字之前判斷)
  if (looksLikeProteinSeq(text)) return withMenu(proteinAnalyze(text));

  // 蛋白質設計:導覽 + 序列分析
  if (/蛋白|protein|mpnn|序列設計|序列分析/i.test(text)) {
    return withMenu(proteinGuide(1));
  }

  // 潛水海況:輸入地名直接到該點,否則顯示潛點挑選卡
  const loc = locByKeyword(text);
  if (loc) return withMenu(await weatherFor(loc.id, 0));
  if (/潛水|海況|天氣|浪|風浪|潛點|下水|澎湖/.test(text)) {
    return withMenu(weatherEntry());
  }

  // 股票:認出具體標的 → 走勢圖;否則大盤快報 + 挑選
  const stock = resolveStock(text);
  if (stock && /股|台積|聯發|鴻海|台灣50|加權|大盤|\d{4}|走勢|股價|報價/i.test(text)) {
    return withMenu(await stockTrend(stock.sym, stock.name, stock.code));
  }
  if (/股票|股價|報價|快報|大盤|加權|走勢/i.test(text)) {
    return withMenu(await stockMenu());
  }

  if (/音樂|歌|聽|music|song|mv|影片/i.test(text)) {
    return withMenu(await musicMenu());
  }

  if (/專案|作品|project|介紹/i.test(text)) {
    const hasName = /基因|ngs|互動|量化|遺傳|etf/i.test(text);
    return hasName ? withMenu(projectResult(text, ctx.websiteUrl)) : withMenu(projectsMenu());
  }

  // Fallback: gentle nudge to the menu
  return [
    textMessage(
      "我還不太懂這個問題 🤔 你可以點下面的按鈕,或試著打「潛水海況」「股票走勢」「音樂欣賞」「蛋白質設計」。",
      MAIN_MENU_ITEMS,
    ),
  ];
}

// 處理 postback(卡片按鈕、quick reply chip 帶 data)
export async function routePostback(data: string, ctx: RouteContext): Promise<LineMessage[]> {
  const params = new URLSearchParams(data);
  const svc = params.get("s");

  if (svc === "wx") {
    const locId = params.get("loc");
    if (!locId) return withMenu(weatherEntry());
    const d = Number.parseInt(params.get("d") ?? "0", 10);
    return withMenu(await weatherFor(locId, Number.isFinite(d) ? d : 0));
  }

  if (svc === "stk") {
    const sym = params.get("sym");
    if (!sym) return withMenu(await stockMenu());
    return withMenu(await stockTrend(sym));
  }

  if (svc === "pro") {
    if (params.get("act") === "howto") return withMenu(proteinHowto());
    const step = Number.parseInt(params.get("step") ?? "1", 10);
    return withMenu(proteinGuide(Number.isFinite(step) ? step : 1));
  }

  // 未知 postback → 回主選單
  return mainMenu(ctx.botName, ctx.websiteUrl);
}
