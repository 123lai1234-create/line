import { fetchWithTimeout, type LineMessage } from "./flex";

const STOCK_URL = "https://donttalk.vercel.app/stock";

const SYMBOLS: { sym: string; name: string }[] = [
  { sym: "^TWII", name: "加權指數" },
  { sym: "2330.TW", name: "台積電" },
  { sym: "2317.TW", name: "鴻海" },
  { sym: "2454.TW", name: "聯發科" },
  { sym: "0050.TW", name: "元大台灣50" },
];

interface Quote {
  name: string;
  price: number | null;
  change: number | null;
  pct: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchQuote(sym: string, name: string): Promise<Quote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { name, price: null, change: null, pct: null };
    const data = (await res.json()) as {
      chart?: { result?: { meta?: Record<string, unknown> }[] };
    };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { name, price: null, change: null, pct: null };

    const price = num(meta.regularMarketPrice);
    const prev = num(meta.chartPreviousClose) ?? num(meta.previousClose);
    if (price === null || prev === null || prev === 0) {
      return { name, price, change: null, pct: null };
    }
    const change = price - prev;
    return { name, price, change, pct: (change / prev) * 100 };
  } catch {
    return { name, price: null, change: null, pct: null };
  }
}

// 台股習慣:紅漲、綠跌
function colorFor(change: number | null): string {
  if (change === null || change === 0) return "#64748B";
  return change > 0 ? "#EF4444" : "#16A34A";
}

function fmtPrice(p: number | null): string {
  if (p === null) return "—";
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtChange(q: Quote): string {
  if (q.change === null || q.pct === null) return "—";
  const arrow = q.change > 0 ? "▲" : q.change < 0 ? "▼" : "－";
  const sign = q.change > 0 ? "+" : "";
  return `${arrow} ${sign}${q.change.toFixed(2)} (${sign}${q.pct.toFixed(2)}%)`;
}

function quoteRow(q: Quote): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    paddingAll: "10px",
    cornerRadius: "10px",
    backgroundColor: "#F8FAFC",
    contents: [
      { type: "text", text: q.name, size: "sm", weight: "bold", color: "#0F172A", flex: 4, gravity: "center", wrap: true },
      {
        type: "box",
        layout: "vertical",
        flex: 5,
        contents: [
          { type: "text", text: fmtPrice(q.price), size: "sm", weight: "bold", color: "#0F172A", align: "end" },
          { type: "text", text: fmtChange(q), size: "xxs", color: colorFor(q.change), align: "end" },
        ],
      },
    ],
  };
}

function stockCard(quotes: Quote[], updated: string): LineMessage {
  return {
    type: "flex",
    altText: "📈 台股快報",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E293B",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📈 台股快報", color: "#FFFFFF", weight: "bold", size: "xl" },
          { type: "text", text: "即時股價・紅漲綠跌", color: "#94A3B8", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: quotes.map(quoteRow),
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: `更新 ${updated}`, size: "xxs", color: "#94A3B8", align: "center" },
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#1E293B",
            action: { type: "uri", label: "看均線買賣訊號", uri: STOCK_URL },
          },
        ],
      },
    },
  };
}

export async function stockMenu(): Promise<LineMessage[]> {
  const quotes = await Promise.all(SYMBOLS.map((s) => fetchQuote(s.sym, s.name)));
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
