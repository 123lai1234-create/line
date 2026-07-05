import { fetchWithTimeout, pill, type LineMessage } from "./flex";

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
function priceColor(change: number | null): string {
  const d = dirOf(change);
  return d === "up" ? "#DC2626" : d === "down" ? "#16A34A" : "#0F172A";
}

function fmtPrice(p: number | null): string {
  if (p === null) return "—";
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 漲跌幅彩色標籤
function changePill(q: Quote): LineMessage {
  if (q.change === null || q.pct === null) return pill("—", "#F1F5F9", "#64748B");
  const d = dirOf(q.change);
  const bg = d === "up" ? "#FEE2E2" : d === "down" ? "#DCFCE7" : "#F1F5F9";
  const col = d === "up" ? "#DC2626" : d === "down" ? "#16A34A" : "#64748B";
  const arrow = d === "up" ? "▲" : d === "down" ? "▼" : "－";
  const sign = q.change > 0 ? "+" : "";
  return pill(`${arrow} ${sign}${q.pct.toFixed(2)}%`, bg, col);
}

// 大盤指數:深色特寫卡
function indexFeature(q: Quote): LineMessage {
  const sign = q.change !== null && q.change > 0 ? "+" : "";
  const chgText = q.change !== null ? `${sign}${q.change.toFixed(2)}` : "—";
  const chgColor =
    q.change === null || q.change === 0 ? "#94A3B8" : q.change > 0 ? "#F87171" : "#4ADE80";
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: "#0F172A",
    cornerRadius: "14px",
    paddingAll: "16px",
    spacing: "sm",
    contents: [
      { type: "text", text: `${q.name} ${q.code}`, size: "xs", color: "#94A3B8", weight: "bold" },
      {
        type: "box",
        layout: "horizontal",
        alignItems: "center",
        contents: [
          { type: "text", text: fmtPrice(q.price), size: "xxl", weight: "bold", color: "#FFFFFF", flex: 0 },
          { type: "filler" },
          changePill(q),
        ],
      },
      { type: "text", text: chgText, size: "sm", color: chgColor, weight: "bold" },
    ],
  };
}

// 個股列:名稱/代號 + 價格 + 漲跌標籤
function quoteRow(q: Quote): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    paddingAll: "12px",
    cornerRadius: "12px",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 3,
        spacing: "xs",
        contents: [
          { type: "text", text: q.name, size: "sm", weight: "bold", color: "#0F172A" },
          { type: "text", text: q.code, size: "xxs", color: "#94A3B8" },
        ],
      },
      {
        type: "text",
        text: fmtPrice(q.price),
        size: "sm",
        weight: "bold",
        color: priceColor(q.change),
        align: "end",
        gravity: "center",
        flex: 3,
      },
      changePill(q),
    ],
  };
}

function stockCard(quotes: Quote[], updated: string): LineMessage {
  const [index, ...rest] = quotes;
  const bodyContents: LineMessage[] = [];
  if (index) bodyContents.push(indexFeature(index));
  bodyContents.push(...rest.map(quoteRow));

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
        spacing: "xs",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              { type: "text", text: "📈 台股快報", color: "#FFFFFF", weight: "bold", size: "xl", flex: 0 },
              { type: "filler" },
              pill("紅漲綠跌", "#334155", "#E2E8F0"),
            ],
          },
          { type: "text", text: `更新 ${updated}`, color: "#94A3B8", size: "xxs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
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
