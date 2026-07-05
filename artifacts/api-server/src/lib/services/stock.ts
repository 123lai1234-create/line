import { fetchWithTimeout, subtleLink, type LineMessage } from "./flex";

const STOCK_URL = "https://donttalk.vercel.app/stock";

const SYMBOLS: { sym: string; name: string; code: string }[] = [
  { sym: "^TWII", name: "加權指數", code: "TAIEX" },
  { sym: "2330.TW", name: "台積電", code: "2330" },
  { sym: "2317.TW", name: "鴻海", code: "2317" },
  { sym: "2454.TW", name: "聯發科", code: "2454" },
  { sym: "0050.TW", name: "元大台灣50", code: "0050" },
];

interface Quote {
  name: string;
  code: string;
  price: number | null;
  change: number | null;
  pct: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchQuote(sym: string, name: string, code: string): Promise<Quote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { name, code, price: null, change: null, pct: null };
    const data = (await res.json()) as {
      chart?: { result?: { meta?: Record<string, unknown> }[] };
    };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { name, code, price: null, change: null, pct: null };

    const price = num(meta.regularMarketPrice);
    const prev = num(meta.chartPreviousClose) ?? num(meta.previousClose);
    if (price === null || prev === null || prev === 0) {
      return { name, code, price, change: null, pct: null };
    }
    const change = price - prev;
    return { name, code, price, change, pct: (change / prev) * 100 };
  } catch {
    return { name, code, price: null, change: null, pct: null };
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

function stockCard(quotes: Quote[], updated: string): LineMessage {
  const [index, ...rest] = quotes;
  const rows: LineMessage[] = [];
  rest.forEach((q, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(quoteRow(q));
  });

  const body: LineMessage[] = [
    {
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      contents: [
        { type: "text", text: "MARKET UPDATE", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
        { type: "filler" },
        { type: "text", text: "Yahoo Finance ・ 即時", size: "xxs", color: "#CBD5E1", align: "end" },
      ],
    },
  ];
  if (index) body.push({ type: "box", layout: "vertical", margin: "lg", contents: [indexFeature(index)] });
  body.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
  body.push({ type: "box", layout: "vertical", margin: "sm", spacing: "none", contents: rows });
  body.push({ type: "text", text: `更新 ${updated}`, size: "xxs", color: "#CBD5E1", margin: "lg" });

  return {
    type: "flex",
    altText: "台股快報",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "none",
        contents: body,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("查看均線買賣訊號", STOCK_URL)],
      },
    },
  };
}

export async function stockMenu(): Promise<LineMessage[]> {
  const quotes = await Promise.all(SYMBOLS.map((s) => fetchQuote(s.sym, s.name, s.code)));
  const updated = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return [stockCard(quotes, updated)];
}
