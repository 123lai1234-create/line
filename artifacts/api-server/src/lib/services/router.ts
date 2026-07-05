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
const TOOLS = [S["潛水海況"], S["股票走勢"]];
const CREATIONS = [S["音樂欣賞"], S["蛋白質設計"], S["專案介紹"]];

export type MenuStyle = "bento" | "hero" | "seg";
type SegTab = "tools" | "creations";

// 圖示格:圓角色塊內放 emoji
function iconChip(s: Service, size: string, chipBg: string): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    width: size,
    height: size,
    cornerRadius: "12px",
    backgroundColor: chipBg,
    justifyContent: "center",
    alignItems: "center",
    flex: 0,
    contents: [{ type: "text", text: s.emoji, size: "lg", align: "center" }],
  };
}

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

// 全寬清單列(圖示格 + 標題 + 說明 + ›),用於 Hero / 分段清單 樣式
function listRow(s: Service): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    spacing: "md",
    paddingTop: "13px",
    paddingBottom: "13px",
    action: { type: "message", label: s.title, text: s.action },
    contents: [
      iconChip(s, "42px", s.bg),
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

function separatedRows(items: Service[]): LineMessage[] {
  const out: LineMessage[] = [];
  items.forEach((s, i) => {
    if (i > 0) out.push({ type: "separator", color: "#F1F5F9" });
    out.push(listRow(s));
  });
  return out;
}

// 樣式切換 chip 列(色塊 / 導覽 / 清單),目前樣式反白;其餘可點,送 postback 重繪
function styleSwitcher(active: MenuStyle): LineMessage {
  const chips: { key: MenuStyle; label: string }[] = [
    { key: "bento", label: "色塊" },
    { key: "hero", label: "導覽" },
    { key: "seg", label: "清單" },
  ];
  return {
    type: "box",
    layout: "vertical",
    paddingAll: "12px",
    paddingBottom: "0px",
    spacing: "sm",
    contents: [
      { type: "text", text: "切換選單樣式", size: "xxs", weight: "bold", color: "#94A3B8" },
      {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: chips.map((c) => {
          const on = c.key === active;
          const chip: LineMessage = {
            type: "box",
            layout: "vertical",
            flex: 1,
            cornerRadius: "8px",
            paddingTop: "8px",
            paddingBottom: "8px",
            backgroundColor: on ? "#0F172A" : "#FFFFFF",
            contents: [
              {
                type: "text",
                text: c.label,
                size: "xs",
                weight: "bold",
                align: "center",
                color: on ? "#FFFFFF" : "#475569",
              },
            ],
          };
          if (!on) {
            chip.borderWidth = "1px";
            chip.borderColor = "#E2E8F0";
            chip.action = {
              type: "postback",
              data: `s=menu&style=${c.key}`,
              displayText: `切換為${c.label}樣式`,
            };
          }
          return chip;
        }),
      },
    ],
  };
}

// 分段清單樣式的頁籤列:兩個標籤 + 選中底線;未選的點擊送 postback 切換分頁
function segTabBar(active: SegTab): LineMessage {
  const tabs: { key: SegTab; label: string; accent: string }[] = [
    { key: "tools", label: "即時工具", accent: "#0EA5E9" },
    { key: "creations", label: "創作作品", accent: "#7C3AED" },
  ];
  return {
    type: "box",
    layout: "horizontal",
    margin: "lg",
    contents: tabs.map((t) => {
      const on = t.key === active;
      const cell: LineMessage = {
        type: "box",
        layout: "vertical",
        flex: 1,
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: t.label,
            size: "sm",
            weight: "bold",
            align: "center",
            color: on ? "#0F172A" : "#94A3B8",
          },
          {
            type: "box",
            layout: "vertical",
            height: "3px",
            cornerRadius: "2px",
            backgroundColor: on ? t.accent : "#00000000",
            contents: [{ type: "filler" }],
          },
        ],
      };
      if (!on) {
        cell.action = {
          type: "postback",
          data: `s=menu&style=seg&tab=${t.key}`,
          displayText: `切換到${t.label}`,
        };
      }
      return cell;
    }),
  };
}

function greetingBlock(botName: string, eyebrowColor = "#94A3B8", titleColor = "#0F172A", subColor = "#64748B"): LineMessage[] {
  return [
    { type: "text", text: "MAIN MENU", size: "xs", weight: "bold", color: eyebrowColor },
    { type: "text", text: `你好,我是 ${botName}`, size: "xl", weight: "bold", color: titleColor, margin: "md", wrap: true },
    { type: "text", text: "選一個分類,或直接輸入指令。", size: "sm", color: subColor, margin: "sm", wrap: true },
  ];
}

function bentoBody(botName: string): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    paddingAll: "20px",
    spacing: "none",
    contents: [
      ...greetingBlock(botName),
      sectionLabel("即時工具"),
      tileRow(TOOLS[0], TOOLS[1]),
      sectionLabel("創作作品"),
      tile(CREATIONS[0], true),
      tileRow(CREATIONS[1], CREATIONS[2]),
    ],
  };
}

function heroBody(botName: string): LineMessage {
  const hero: LineMessage = {
    type: "box",
    layout: "vertical",
    paddingAll: "22px",
    spacing: "none",
    background: { type: "linearGradient", angle: "135deg", startColor: "#7C3AED", endColor: "#EC4899" },
    contents: [
      {
        type: "box",
        layout: "vertical",
        cornerRadius: "20px",
        backgroundColor: "#FFFFFF33",
        paddingAll: "6px",
        paddingStart: "12px",
        paddingEnd: "12px",
        flex: 0,
        contents: [{ type: "text", text: "MAIN MENU", size: "xs", weight: "bold", color: "#FFFFFF" }],
      },
      { type: "text", text: `你好,我是 ${botName}`, size: "xl", weight: "bold", color: "#FFFFFF", margin: "lg", wrap: true },
      { type: "text", text: "選一個分類,或直接輸入指令。", size: "sm", color: "#FFFFFFDD", margin: "sm", wrap: true },
    ],
  };
  const sections: LineMessage = {
    type: "box",
    layout: "vertical",
    paddingAll: "20px",
    spacing: "none",
    contents: [
      { ...sectionLabel("即時工具"), margin: "none" },
      ...separatedRows(TOOLS),
      sectionLabel("創作作品"),
      ...separatedRows(CREATIONS),
    ],
  };
  return { type: "box", layout: "vertical", paddingAll: "0px", spacing: "none", contents: [hero, sections] };
}

function segBody(botName: string, tab: SegTab): LineMessage {
  const rows = tab === "tools" ? TOOLS : CREATIONS;
  return {
    type: "box",
    layout: "vertical",
    paddingAll: "20px",
    spacing: "none",
    contents: [...greetingBlock(botName), segTabBar(tab), { type: "box", layout: "vertical", margin: "md", spacing: "none", contents: separatedRows(rows) }],
  };
}

function menuFooter(active: MenuStyle, websiteUrl?: string): LineMessage {
  const linkCells: LineMessage[] = [];
  if (websiteUrl) {
    linkCells.push(footerCell("前往網站", { type: "uri", label: "前往網站", uri: websiteUrl }));
    linkCells.push({ type: "separator", color: "#E2E8F0" });
  }
  linkCells.push(footerCell("關於我", { type: "message", label: "關於我", text: "關於我" }));
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: "#F8FAFC",
    paddingBottom: "4px",
    contents: [
      styleSwitcher(active),
      { type: "separator", color: "#E2E8F0", margin: "md" },
      { type: "box", layout: "horizontal", contents: linkCells },
    ],
  };
}

export function mainMenu(
  botName: string,
  websiteUrl?: string,
  style: MenuStyle = "bento",
  tab: SegTab = "tools",
): LineMessage[] {
  const body = style === "hero" ? heroBody(botName) : style === "seg" ? segBody(botName, tab) : bentoBody(botName);
  const bubble: LineMessage = {
    type: "flex",
    altText: `${botName}・服務選單`,
    contents: { type: "bubble", size: "mega", body, footer: menuFooter(style, websiteUrl) },
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

// 直接以文字指令叫出特定選單樣式
function menuStyleByText(t: string): MenuStyle | null {
  if (/^(色塊|bento|磚|磚牆)$/i.test(t)) return "bento";
  if (/^(導覽|hero|banner|橫幅)$/i.test(t)) return "hero";
  if (/^(清單|分段|列表|segment|list)$/i.test(t)) return "seg";
  return null;
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
  const styleCmd = menuStyleByText(text);
  if (styleCmd) return mainMenu(ctx.botName, ctx.websiteUrl, styleCmd);
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

  // 切換主選單樣式(色塊 / 導覽 / 分段清單),分段清單另帶 tab
  if (svc === "menu") {
    const style = params.get("style");
    const menuStyle: MenuStyle = style === "hero" || style === "seg" ? style : "bento";
    const tab: SegTab = params.get("tab") === "creations" ? "creations" : "tools";
    return mainMenu(ctx.botName, ctx.websiteUrl, menuStyle, tab);
  }

  // 未知 postback → 回主選單
  return mainMenu(ctx.botName, ctx.websiteUrl);
}
