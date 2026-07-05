import { textMessage, quickReply, subtleLink, type LineMessage, type QuickItem } from "./flex";
import { weatherMenu } from "./weather";
import { stockMenu } from "./stock";
import { musicMenu } from "./music";
import { projectsMenu, projectResult } from "./projects";

const MAIN_MENU_ITEMS: QuickItem[] = [
  { label: "🤿 潛水天氣", text: "潛水天氣" },
  { label: "📈 股票快報", text: "股票快報" },
  { label: "🎧 音樂欣賞", text: "音樂欣賞" },
  { label: "🧬 專案介紹", text: "專案介紹" },
  { label: "ℹ️ 關於我", text: "關於我" },
];

interface Service {
  title: string;
  action: string;
}

const SERVICES: Service[] = [
  { title: "潛水天氣", action: "潛水天氣" },
  { title: "股票快報", action: "股票快報" },
  { title: "音樂欣賞", action: "音樂欣賞" },
  { title: "專案介紹", action: "專案介紹" },
];

function serviceRow(s: Service): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "14px",
    paddingBottom: "14px",
    action: { type: "message", label: s.title, text: s.action },
    contents: [
      { type: "text", text: s.title, size: "md", weight: "bold", color: "#334155", flex: 1, gravity: "center" },
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
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "none",
      contents: [
        { type: "text", text: "MAIN MENU", size: "xs", weight: "bold", color: "#94A3B8" },
        { type: "text", text: "您好，需要什麼協助？", size: "lg", weight: "bold", color: "#0F172A", margin: "md", wrap: true },
        { type: "text", text: "請選擇下方服務，或直接輸入指令。", size: "sm", color: "#64748B", margin: "sm", wrap: true },
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
    quickReply: textMessage("", MAIN_MENU_ITEMS).quickReply as Record<string, unknown>,
  };
  return [bubble];
}

export function aboutMessage(introMessage: string, websiteUrl: string): LineMessage[] {
  return [
    {
      ...textMessage(`${introMessage}\n\n${websiteUrl}`),
      quickReply: textMessage("", MAIN_MENU_ITEMS).quickReply as Record<string, unknown>,
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

  if (/潛水|海況|天氣|浪|風浪|潛點|綠島|蘭嶼|墾丁|後壁湖|小琉球|龍洞|東北角|澎湖/.test(text)) {
    return withMenu(await weatherMenu());
  }

  if (/股票|股價|報價|快報|台積|大盤|加權|^[A-Za-z]{1,5}$|^\d{4,6}(\.\w+)?$/i.test(text)) {
    return withMenu(await stockMenu());
  }

  if (/音樂|歌|聽|music|song|mv|影片/i.test(text)) {
    return withMenu(await musicMenu());
  }

  if (/專案|作品|project|介紹/i.test(text)) {
    const hasName = /蛋白|基因|ngs|互動|mpnn|量化|遺傳|etf/i.test(text);
    return hasName ? projectResult(text, ctx.websiteUrl) : projectsMenu();
  }

  // Fallback: gentle nudge to the menu
  return [
    textMessage(
      "我還不太懂這個問題 🤔 你可以點下面的按鈕,或試著打「潛水天氣」「股票快報」「音樂欣賞」「專案介紹」。",
      MAIN_MENU_ITEMS,
    ),
  ];
}
