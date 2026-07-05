import { barChart, fetchWithTimeout, quickReply, subtleLink, type LineMessage, type QuickItem } from "./flex";

const STOCK_URL = "https://donttalk.vercel.app/stock";

type StockCat = "index" | "large" | "etf";

const SYMBOLS: { sym: string; name: string; code: string; cat: StockCat }[] = [
  { sym: "^TWII", name: "加權指數", code: "TAIEX", cat: "index" },
  // 權值股
  { sym: "2330.TW", name: "台積電", code: "2330", cat: "large" },
  { sym: "2317.TW", name: "鴻海", code: "2317", cat: "large" },
  { sym: "2454.TW", name: "聯發科", code: "2454", cat: "large" },
  { sym: "2308.TW", name: "台達電", code: "2308", cat: "large" },
  { sym: "2382.TW", name: "廣達", code: "2382", cat: "large" },
  { sym: "2303.TW", name: "聯電", code: "2303", cat: "large" },
  { sym: "2412.TW", name: "中華電", code: "2412", cat: "large" },
  { sym: "2881.TW", name: "富邦金", code: "2881", cat: "large" },
  { sym: "2882.TW", name: "國泰金", code: "2882", cat: "large" },
  { sym: "2603.TW", name: "長榮", code: "2603", cat: "large" },
  // ETF
  { sym: "0050.TW", name: "元大台灣50", code: "0050", cat: "etf" },
  { sym: "0056.TW", name: "元大高股息", code: "0056", cat: "etf" },
  { sym: "00878.TW", name: "國泰永續高股息", code: "00878", cat: "etf" },
];

interface Quote {
  name: string;
  code: string;
  cat: StockCat;
  price: number | null;
  change: number | null;
  pct: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchQuote(sym: string, name: string, code: string, cat: StockCat): Promise<Quote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { name, code, cat, price: null, change: null, pct: null };
    const data = (await res.json()) as {
      chart?: { result?: { meta?: Record<string, unknown> }[] };
    };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { name, code, cat, price: null, change: null, pct: null };

    const price = num(meta.regularMarketPrice);
    const prev = num(meta.chartPreviousClose) ?? num(meta.previousClose);
    if (price === null || prev === null || prev === 0) {
      return { name, code, cat, price, change: null, pct: null };
    }
    const change = price - prev;
    return { name, code, cat, price, change, pct: (change / prev) * 100 };
  } catch {
    return { name, code, cat, price: null, change: null, pct: null };
  }
}

// 台股習慣:紅漲、綠跌
type Dir = "up" | "down" | "flat";
function dirOf(change: number | null): Dir {
  if (change === null || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}

function changeColor(change: number | null): string {
  const d = dirOf(change);
  return d === "up" ? "#DC2626" : d === "down" ? "#16A34A" : "#94A3B8";
}

function fmtPrice(p: number | null): string {
  if (p === null) return "—";
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 漲跌:上排帶箭頭的絕對值、下排百分比,同色靠右
interface ChangeParts {
  line1: string;
  line2: string;
  color: string;
}
function changeParts(q: Quote): ChangeParts {
  if (q.change === null || q.pct === null) return { line1: "—", line2: "", color: "#94A3B8" };
  const d = dirOf(q.change);
  const arrow = d === "up" ? "▲" : d === "down" ? "▼" : "－";
  const sign = q.change > 0 ? "+" : "";
  return {
    line1: `${arrow} ${sign}${q.change.toFixed(2)}`,
    line2: `${sign}${q.pct.toFixed(2)}%`,
    color: changeColor(q.change),
  };
}

function changeBlock(c: ChangeParts, big = false): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    flex: 0,
    contents: [
      { type: "text", text: c.line1, size: big ? "sm" : "xs", weight: "bold", color: c.color, align: "end" },
      ...(c.line2
        ? [{ type: "text", text: c.line2, size: big ? "xs" : "xxs", color: c.color, align: "end" } as LineMessage]
        : []),
    ],
  };
}

// 大盤指數:白底特寫,深色大數字 + 靠右彩色漲跌
function indexFeature(q: Quote): LineMessage {
  const c = changeParts(q);
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      { type: "text", text: `${q.name}(${q.code})`, size: "xs", color: "#64748B" },
      {
        type: "box",
        layout: "horizontal",
        alignItems: "flex-end",
        contents: [
          { type: "text", text: fmtPrice(q.price), size: "xxl", weight: "bold", color: "#0F172A", flex: 0 },
          { type: "filler" },
          changeBlock(c, true),
        ],
      },
    ],
  };
}

// 個股列:名稱/代號 + 深色價格 + 靠右彩色漲跌欄
function quoteRow(q: Quote): LineMessage {
  const c = changeParts(q);
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "10px",
    paddingBottom: "10px",
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 4,
        contents: [
          { type: "text", text: q.name, size: "sm", weight: "bold", color: "#1E293B" },
          { type: "text", text: q.code, size: "xxs", color: "#94A3B8" },
        ],
      },
      {
        type: "text",
        text: fmtPrice(q.price),
        size: "sm",
        weight: "bold",
        color: "#1E293B",
        align: "end",
        gravity: "center",
        flex: 3,
      },
      { type: "box", layout: "vertical", flex: 3, justifyContent: "center", contents: [changeBlock(c)] },
    ],
  };
}

// 小節標題(灰色英中對照)
function sectionLabel(text: string): LineMessage {
  return { type: "text", text, size: "xs", weight: "bold", color: "#94A3B8", margin: "lg" };
}

// 一組股票列(彼此以細線分隔)
function quoteRows(items: Quote[]): LineMessage {
  const rows: LineMessage[] = [];
  items.forEach((q, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(quoteRow(q));
  });
  return { type: "box", layout: "vertical", margin: "sm", spacing: "none", contents: rows };
}

// 卡片頂端的 MARKET UPDATE 標頭列
function marketHeader(caption: string): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    contents: [
      { type: "text", text: "MARKET UPDATE", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
      { type: "filler" },
      { type: "text", text: caption, size: "xxs", color: "#CBD5E1", align: "end" },
    ],
  };
}

// 單一 bubble(白底 + 更新時間 + 網站連結 footer)
function stockBubble(contents: LineMessage[], updated: string): LineMessage {
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "none",
      contents: [...contents, { type: "text", text: `更新 ${updated}`, size: "xxs", color: "#CBD5E1", margin: "lg" }],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [subtleLink("查看均線買賣訊號", STOCK_URL)],
    },
  };
}

// 台股快報:因股票數量多,拆成 carousel 多頁(每頁 ≤6 檔,避免超過 LINE flex 10KB 上限)
function stockCard(quotes: Quote[], updated: string): LineMessage {
  const index = quotes.find((q) => q.cat === "index");
  const large = quotes.filter((q) => q.cat === "large");
  const etf = quotes.filter((q) => q.cat === "etf");

  const bubbles: LineMessage[] = [];

  // 第一頁:大盤指數 + 前段權值股
  const firstLarge = large.slice(0, 6);
  const restLarge = large.slice(6);
  const page1: LineMessage[] = [marketHeader("Yahoo Finance ・ 即時")];
  if (index) page1.push({ type: "box", layout: "vertical", margin: "lg", contents: [indexFeature(index)] });
  if (firstLarge.length) {
    page1.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
    page1.push(sectionLabel("權值股"));
    page1.push(quoteRows(firstLarge));
  }
  bubbles.push(stockBubble(page1, updated));

  // 第二頁:其餘權值股 + ETF
  const page2: LineMessage[] = [marketHeader("熱門個股 ・ ETF")];
  if (restLarge.length) {
    page2.push(sectionLabel("權值股"));
    page2.push(quoteRows(restLarge));
  }
  if (etf.length) {
    if (restLarge.length) page2.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
    page2.push(sectionLabel("ETF"));
    page2.push(quoteRows(etf));
  }
  if (page2.length > 1) bubbles.push(stockBubble(page2, updated));

  return {
    type: "flex",
    altText: "台股快報",
    contents: { type: "carousel", contents: bubbles },
  };
}

function updatedNow(): string {
  return new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// 挑股票看走勢的 chips(postback)+ 提示可自行輸入代號
function pickChips(): QuickItem[] {
  // LINE quick reply 上限 13 顆;排除大盤指數,留給個股/ETF
  return SYMBOLS.filter((s) => s.cat !== "index")
    .slice(0, 13)
    .map((s) => ({
      label: s.name,
      data: `s=stk&sym=${s.sym}`,
      displayText: `${s.name} 走勢`,
    }));
}

// 把使用者輸入解析成代號:認名稱、4~6 位代號(自動補 .TW)
export function resolveStock(text: string): { sym: string; name: string; code: string } | undefined {
  const t = text.trim();
  const byName = SYMBOLS.find((s) => t.includes(s.name) || t.includes(s.code));
  if (byName) return byName;
  const m = t.match(/(?:^|\D)(\d{4,6})(?:\.(?:TW|TWO))?(?:\D|$)/i);
  if (m) {
    const code = m[1];
    return { sym: `${code}.TW`, name: code, code };
  }
  return undefined;
}

async function fetchSeries(sym: string): Promise<{ closes: number[]; meta: Record<string, unknown> } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: {
          meta?: Record<string, unknown>;
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[];
      };
    };
    const r = data.chart?.result?.[0];
    if (!r?.meta) return null;
    const raw = r.indicators?.quote?.[0]?.close ?? [];
    const closes = raw.filter((c): c is number => typeof c === "number" && Number.isFinite(c));
    return { closes, meta: r.meta };
  } catch {
    return null;
  }
}

function statCol(label: string, value: string, color = "#1E293B"): LineMessage {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    contents: [
      { type: "text", text: label, size: "xxs", color: "#94A3B8" },
      { type: "text", text: value, size: "sm", weight: "bold", color, margin: "xs" },
    ],
  };
}

function trendUnavailable(label: string): LineMessage {
  return {
    type: "flex",
    altText: `${label} 走勢 — 資料抓不到`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "sm",
        contents: [
          { type: "text", text: "PRICE TREND", size: "xs", weight: "bold", color: "#94A3B8" },
          { type: "text", text: "找不到這檔的走勢資料", size: "lg", weight: "bold", color: "#0F172A", margin: "md" },
          {
            type: "text",
            text: "請確認代號(例如 2330),或改輸入台積電、聯發科等名稱。",
            size: "sm",
            color: "#64748B",
            wrap: true,
            margin: "sm",
          },
        ],
      },
    },
  };
}

export async function stockTrend(sym: string, name?: string, code?: string): Promise<LineMessage[]> {
  const known = SYMBOLS.find((s) => s.sym === sym);
  const dispName = name ?? known?.name ?? sym;
  const dispCode = code ?? known?.code ?? sym.replace(/\.(TW|TWO)$/i, "");

  const series = await fetchSeries(sym);
  if (!series || series.closes.length < 2) return [trendUnavailable(dispName)];

  const closes = series.closes.slice(-22); // 近一個月的交易日
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const last = closes[closes.length - 1];
  const first = closes[0];
  const periodChange = last - first;
  const periodPct = (periodChange / first) * 100;

  const bars = closes.map((c, i) => {
    const prev = i === 0 ? c : closes[i - 1];
    const d = dirOf(c - prev);
    const color = d === "up" ? "#DC2626" : d === "down" ? "#16A34A" : "#CBD5E1";
    return { h: 12 + ((c - min) / span) * 88, color };
  });

  const periodColor = changeColor(periodChange);
  const arrow = periodChange > 0 ? "▲" : periodChange < 0 ? "▼" : "－";
  const sign = periodChange > 0 ? "+" : "";

  const card: LineMessage = {
    type: "flex",
    altText: `${dispName} 走勢`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "none",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              { type: "text", text: "PRICE TREND", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
              { type: "filler" },
              { type: "text", text: "近一個月", size: "xxs", color: "#CBD5E1", align: "end" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            alignItems: "flex-end",
            margin: "lg",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 0,
                contents: [
                  { type: "text", text: `${dispName}`, size: "xs", color: "#64748B" },
                  { type: "text", text: fmtPrice(last), size: "xxl", weight: "bold", color: "#0F172A" },
                ],
              },
              { type: "filler" },
              {
                type: "box",
                layout: "vertical",
                flex: 0,
                contents: [
                  { type: "text", text: `${arrow} ${sign}${periodChange.toFixed(2)}`, size: "sm", weight: "bold", color: periodColor, align: "end" },
                  { type: "text", text: `${sign}${periodPct.toFixed(2)}%`, size: "xs", color: periodColor, align: "end" },
                ],
              },
            ],
          },
          { type: "box", layout: "vertical", margin: "lg", contents: [barChart(bars)] },
          { type: "separator", margin: "lg", color: "#F1F5F9" },
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            contents: [
              statCol("代號", dispCode),
              statCol("月高", fmtPrice(max), "#DC2626"),
              statCol("月低", fmtPrice(min), "#16A34A"),
            ],
          },
          { type: "text", text: `更新 ${updatedNow()}`, size: "xxs", color: "#CBD5E1", margin: "lg" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("查看均線買賣訊號", STOCK_URL)],
      },
    },
    quickReply: quickReply(pickChips()),
  };
  return [card];
}

export async function stockMenu(): Promise<LineMessage[]> {
  const quotes = await Promise.all(SYMBOLS.map((s) => fetchQuote(s.sym, s.name, s.code, s.cat)));
  const card = stockCard(quotes, updatedNow());
  card.quickReply = quickReply(pickChips());
  return [card];
}
