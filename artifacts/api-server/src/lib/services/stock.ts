import { logger } from "../logger";
import { fetchWithTimeout, kvRow, textMessage, type LineMessage, type QuickItem } from "./flex";

interface WatchItem {
  label: string;
  symbol: string;
}

const WATCHLIST: WatchItem[] = [
  { label: "台積電 2330", symbol: "2330" },
  { label: "元大0050", symbol: "0050" },
  { label: "聯發科 2454", symbol: "2454" },
  { label: "輝達 NVDA", symbol: "NVDA" },
  { label: "蘋果 AAPL", symbol: "AAPL" },
  { label: "特斯拉 TSLA", symbol: "TSLA" },
];

function watchItems(): QuickItem[] {
  return WATCHLIST.map((w) => ({ label: w.label, text: `股票 ${w.symbol}` }));
}

export function stockMenu(): LineMessage[] {
  return [
    textMessage(
      "📈 股票快報\n點下面熱門標的,或直接打代號查即時報價。\n台股打數字(例:股票 2330),美股打英文(例:股票 AAPL)。",
      watchItems(),
    ),
  ];
}

function toYahooSymbol(input: string): string {
  let s = input.replace(/股票快報|股票|股價|報價|快報/g, "").trim().toUpperCase();
  if (!s) return "";
  if (s.endsWith(".US")) s = s.slice(0, -3);
  if (/^\d{4,6}$/.test(s)) return `${s}.TW`;
  return s;
}

interface Quote {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  prevClose: number;
  high: number;
  low: number;
  open: number;
  volume: number;
}

async function fetchQuote(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { meta?: Record<string, number | string> }[] };
    };
    const m = data.chart?.result?.[0]?.meta;
    if (!m || typeof m.regularMarketPrice !== "number") return null;
    return {
      symbol: String(m.symbol ?? symbol),
      name: String(m.shortName ?? m.longName ?? m.symbol ?? symbol),
      currency: String(m.currency ?? ""),
      price: m.regularMarketPrice,
      prevClose: Number(m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice),
      high: Number(m.regularMarketDayHigh ?? NaN),
      low: Number(m.regularMarketDayLow ?? NaN),
      open: Number(m.regularMarketOpen ?? NaN),
      volume: Number(m.regularMarketVolume ?? NaN),
    };
  } catch (err) {
    logger.error({ err, symbol }, "stock fetch failed");
    return null;
  }
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
}

export async function stockResult(input: string): Promise<LineMessage[]> {
  const symbol = toYahooSymbol(input);
  if (!symbol) return stockMenu();

  const quote = await fetchQuote(symbol);
  if (!quote) {
    return [
      textMessage(
        `查不到「${symbol}」的報價 🙁\n台股請打數字(例:2330),美股請打英文代號(例:AAPL)。`,
        watchItems(),
      ),
    ];
  }

  const change = quote.price - quote.prevClose;
  const pct = quote.prevClose ? (change / quote.prevClose) * 100 : 0;
  const up = change >= 0;
  const trend = up ? "▲" : "▼";
  const color = up ? "#EF4444" : "#10B981"; // 台股習慣:紅漲綠跌
  const changeStr = `${trend} ${fmt(Math.abs(change))} (${up ? "+" : "-"}${Math.abs(pct).toFixed(2)}%)`;
  const priceStr = `${fmt(quote.price)}${quote.currency ? " " + quote.currency : ""}`;

  const bubble: LineMessage = {
    type: "flex",
    altText: `${quote.name} ${priceStr} ${changeStr}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E293B",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "📈 股票快報", color: "#94A3B8", size: "sm", weight: "bold" },
          { type: "text", text: quote.name, color: "#FFFFFF", size: "lg", weight: "bold", wrap: true },
          { type: "text", text: quote.symbol.toUpperCase(), color: "#64748B", size: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: priceStr, size: "xxl", weight: "bold", color: "#0F172A" },
          { type: "text", text: `較昨收 ${changeStr}`, size: "md", weight: "bold", color },
          { type: "separator" },
          kvRow("昨收", fmt(quote.prevClose)),
          kvRow("開盤", fmt(quote.open)),
          kvRow("最高", fmt(quote.high)),
          kvRow("最低", fmt(quote.low)),
          kvRow("成交量", fmt(quote.volume)),
          { type: "text", text: "資料來源 Yahoo Finance · 僅供參考,非投資建議", size: "xxs", color: "#94A3B8", margin: "md", wrap: true },
        ],
      },
    },
  };

  return [{ ...bubble, quickReply: textMessage("", watchItems()).quickReply as Record<string, unknown> }];
}
