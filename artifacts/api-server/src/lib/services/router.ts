import { textMessage, type LineMessage, type QuickItem } from "./flex";
import { weatherMenu, weatherResult } from "./weather";
import { stockMenu, stockResult } from "./stock";
import { musicMenu } from "./music";
import { projectsMenu, projectResult } from "./projects";

const MAIN_MENU_ITEMS: QuickItem[] = [
  { label: "🤿 潛水天氣", text: "潛水天氣" },
  { label: "📈 股票快報", text: "股票快報" },
  { label: "🎧 音樂欣賞", text: "音樂欣賞" },
  { label: "🧬 專案介紹", text: "專案介紹" },
  { label: "ℹ️ 關於我", text: "關於我" },
];

export function mainMenu(botName: string): LineMessage[] {
  return [
    textMessage(
      `嗨,我是${botName} 👋\n我可以幫你這些服務,點下面按鈕或直接打關鍵字都可以 👇\n\n🤿 潛水天氣 — 各潛點即時海況\n📈 股票快報 — 即時股價與漲跌\n🎧 音樂欣賞 — 我的音樂平台\n🧬 專案介紹 — 我的作品集`,
      MAIN_MENU_ITEMS,
    ),
  ];
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

  if (/潛水|海況|天氣|浪|潛點/.test(text)) {
    const hasSpot = /綠島|蘭嶼|墾丁|後壁湖|小琉球|龍洞|東北角|澎湖/.test(text);
    return hasSpot ? weatherResult(text) : weatherMenu();
  }

  if (/股票|股價|報價|快報|台積|^[A-Za-z]{1,5}$|^\d{4,6}(\.\w+)?$/i.test(text)) {
    const rest = text.replace(/股票快報|股票|股價|報價|快報/g, "").trim();
    return rest ? stockResult(text) : stockMenu();
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
