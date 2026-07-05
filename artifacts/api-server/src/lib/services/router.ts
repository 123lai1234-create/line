import { textMessage, quickReply, subtleLink, type LineMessage, type QuickItem } from "./flex";
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

// 主選單以「分類卡」呈現:每個服務有圖示、標題、一句說明
const SERVICES: Service[] = [
  { emoji: "🤿", title: "潛水海況", desc: "6 大潛點 × 未來 5 天浪高風速與下水建議", action: "潛水海況", accent: "#0EA5E9", bg: "#E0F2FE" },
  { emoji: "📈", title: "股票走勢", desc: "台股即時報價,挑一檔看近一個月走勢圖", action: "股票走勢", accent: "#DC2626", bg: "#FEE2E2" },
  { emoji: "🎧", title: "音樂欣賞", desc: "創作 MV 精選輪播,點開直接看", action: "音樂欣賞", accent: "#7C3AED", bg: "#EDE9FE" },
  { emoji: "🧬", title: "蛋白質設計", desc: "AI 設計流程導覽 + 貼序列即時分析", action: "蛋白質設計", accent: "#059669", bg: "#D1FAE5" },
  { emoji: "🗂", title: "專案介紹", desc: "生醫 AI、量化研究等作品一覽", action: "專案介紹", accent: "#D97706", bg: "#FEF3C7" },
];

function serviceRow(s: Service): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    spacing: "md",
    paddingTop: "14px",
    paddingBottom: "14px",
    action: { type: "message", label: s.title, text: s.action },
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "44px",
        height: "44px",
        cornerRadius: "12px",
        backgroundColor: s.bg,
        justifyContent: "center",
        alignItems: "center",
        flex: 0,
        contents: [{ type: "text", text: s.emoji, size: "lg", align: "center" }],
      },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        contents: [
          { type: "text", text: s.title, size: "md", weight: "bold", color: "#0F172A" },
          { type: "text", text: s.desc, size: "xxs", color: "#94A3B8", margin: "xs", wrap: true },
        ],
      },
      { type: "text", text: "›", size: "xl", color: "#CBD5E1", flex: 0, gravity: "center" },
    ],
  };
}

export function mainMenu(botName: string, websiteUrl?: string): LineMessage[] {
  const rows: LineMessage[] = [];
  SERVICES.forEach((s, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(serviceRow(s));
  });

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
          text: "選一個主題,或直接輸入指令 — 也可以貼股票代號、胺基酸序列給我。",
          size: "sm",
          color: "#64748B",
          margin: "sm",
          wrap: true,
        },
        { type: "separator", margin: "lg", color: "#F1F5F9" },
        { type: "box", layout: "vertical", margin: "sm", spacing: "none", contents: rows },
      ],
    },
  };
  if (websiteUrl) {
    bubbleContents.footer = {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [subtleLink("前往作品集網站", websiteUrl)],
    };
  }
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
