import { textMessage, type LineMessage, type QuickItem } from "./flex";
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
  emoji: string;
  title: string;
  subtitle: string;
  action: string;
}

const SERVICES: Service[] = [
  { emoji: "🤿", title: "潛水天氣", subtitle: "各潛點即時海況與更多數據", action: "潛水天氣" },
  { emoji: "📈", title: "股票快報", subtitle: "即時股價、漲跌與市場數據", action: "股票快報" },
  { emoji: "🎧", title: "音樂欣賞", subtitle: "我發表音樂與創作的平台", action: "音樂欣賞" },
  { emoji: "🧬", title: "專案介紹", subtitle: "我的作品集與專案", action: "專案介紹" },
];

function serviceRow(s: Service): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    paddingAll: "12px",
    cornerRadius: "12px",
    backgroundColor: "#F8FAFC",
    action: { type: "message", label: s.title, text: s.action },
    contents: [
      { type: "text", text: s.emoji, size: "xl", flex: 0, gravity: "center" },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        spacing: "xs",
        contents: [
          { type: "text", text: s.title, weight: "bold", size: "sm", color: "#0F172A" },
          { type: "text", text: s.subtitle, size: "xxs", color: "#64748B", wrap: true },
        ],
      },
      { type: "text", text: "›", size: "xl", color: "#CBD5E1", flex: 0, gravity: "center" },
    ],
  };
}

export function mainMenu(botName: string): LineMessage[] {
  const bubble: LineMessage = {
    type: "flex",
    altText: `嗨,我是${botName},這是服務選單`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "20px",
        contents: [
          { type: "text", text: `嗨,我是${botName} 👋`, color: "#FFFFFF", weight: "bold", size: "lg", wrap: true },
          { type: "text", text: "點下面選單,或直接打關鍵字都可以", color: "#E0E7FF", size: "xs", margin: "sm", wrap: true },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: SERVICES.map(serviceRow),
      },
    },
  };
  return [{ ...bubble, quickReply: textMessage("", MAIN_MENU_ITEMS).quickReply as Record<string, unknown> }];
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

export async function routeMessage(raw: string, ctx: RouteContext): Promise<LineMessage[]> {
  const text = raw.trim();

  if (isMenuTrigger(text)) return mainMenu(ctx.botName);
  if (/關於我|about|作者|你是誰|自我介紹/i.test(text)) {
    return aboutMessage(ctx.introMessage, ctx.websiteUrl);
  }

  if (/潛水|海況|天氣|浪|潛點|綠島|蘭嶼|墾丁|後壁湖|小琉球|龍洞|東北角|澎湖/.test(text)) {
    return weatherMenu();
  }

  if (/股票|股價|報價|快報|台積|^[A-Za-z]{1,5}$|^\d{4,6}(\.\w+)?$/i.test(text)) {
    return stockMenu();
  }

  if (/音樂|歌|聽|music|song/i.test(text)) {
    return musicMenu();
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
