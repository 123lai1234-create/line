import { textMessage, quickReply, linkButton, type LineMessage, type QuickItem } from "./flex";
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
  accent: string;
}

const SERVICES: Service[] = [
  { emoji: "🤿", title: "潛水天氣", subtitle: "龍洞即時浪況與 GO/CAUTION 判斷", action: "潛水天氣", accent: "#0EA5E9" },
  { emoji: "📈", title: "股票快報", subtitle: "台股大盤與代表個股即時報價", action: "股票快報", accent: "#1E293B" },
  { emoji: "🎧", title: "音樂欣賞", subtitle: "我發表音樂與創作的平台", action: "音樂欣賞", accent: "#DB2777" },
  { emoji: "🧬", title: "專案介紹", subtitle: "我的作品集與專案", action: "專案介紹", accent: "#0F172A" },
];

function serviceRow(s: Service): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    paddingAll: "10px",
    cornerRadius: "14px",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    action: { type: "message", label: s.title, text: s.action },
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "46px",
        height: "46px",
        cornerRadius: "12px",
        backgroundColor: s.accent,
        justifyContent: "center",
        alignItems: "center",
        flex: 0,
        contents: [{ type: "text", text: s.emoji, size: "xl", align: "center", gravity: "center" }],
      },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        spacing: "xs",
        justifyContent: "center",
        contents: [
          { type: "text", text: s.title, weight: "bold", size: "sm", color: "#0F172A" },
          { type: "text", text: s.subtitle, size: "xxs", color: "#64748B", wrap: true },
        ],
      },
      { type: "text", text: "›", size: "xl", color: "#CBD5E1", flex: 0, gravity: "center" },
    ],
  };
}

const MENU_HERO = "https://donttalk.vercel.app/og-default.png";

export function mainMenu(botName: string, websiteUrl?: string): LineMessage[] {
  const bubbleContents: Record<string, unknown> = {
    type: "bubble",
    hero: {
      type: "image",
      url: MENU_HERO,
      size: "full",
      aspectRatio: "40:21",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      contents: [
        { type: "text", text: `嗨,我是 ${botName} 👋`, weight: "bold", size: "lg", color: "#0F172A", wrap: true },
        {
          type: "text",
          text: "點下面服務,或直接打關鍵字(例如「股票」「風浪」)",
          size: "xs",
          color: "#64748B",
          wrap: true,
        },
        { type: "separator", margin: "md", color: "#E2E8F0" },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          margin: "md",
          contents: SERVICES.map(serviceRow),
        },
      ],
    },
  };
  if (websiteUrl) {
    bubbleContents.footer = {
      type: "box",
      layout: "vertical",
      contents: [linkButton("看我的作品集網站", websiteUrl, "#4F46E5")],
    };
  }
  const bubble: LineMessage = {
    type: "flex",
    altText: `嗨,我是${botName},這是服務選單`,
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
