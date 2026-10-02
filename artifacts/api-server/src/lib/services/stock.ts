import {
  barChart,
  fetchWithTimeout,
  kvRow,
  quickReply,
  subtleLink,
  type LineMessage,
  type QuickItem,
} from "./flex";

const STOCK_URL = "https://donttalk.vercel.app/stock";

interface StockDef {
  sym: string;
  name: string;
  code: string;
}

interface Sector {
  label: string;
  items: StockDef[];
}

const INDEX: StockDef = { sym: "^TWII", name: "加權指數", code: "TAIEX" };

// 台灣 50 大公司(市值最大的 50 檔)+ 熱門 ETF,依產業分類供瀏覽點選
const SECTORS: Sector[] = [
  {
    label: "半導體",
    items: [
      { sym: "2330.TW", name: "台積電", code: "2330" },
      { sym: "2454.TW", name: "聯發科", code: "2454" },
      { sym: "2303.TW", name: "聯電", code: "2303" },
      { sym: "3711.TW", name: "日月光投控", code: "3711" },
      { sym: "2379.TW", name: "瑞昱", code: "2379" },
      { sym: "3034.TW", name: "聯詠", code: "3034" },
      { sym: "3037.TW", name: "欣興", code: "3037" },
      { sym: "3661.TW", name: "世芯-KY", code: "3661" },
      { sym: "2408.TW", name: "南亞科", code: "2408" },
    ],
  },
  {
    label: "電子・網通",
    items: [
      { sym: "2317.TW", name: "鴻海", code: "2317" },
      { sym: "2382.TW", name: "廣達", code: "2382" },
      { sym: "2357.TW", name: "華碩", code: "2357" },
      { sym: "2308.TW", name: "台達電", code: "2308" },
      { sym: "4938.TW", name: "和碩", code: "4938" },
      { sym: "2327.TW", name: "國巨", code: "2327" },
      { sym: "3008.TW", name: "大立光", code: "3008" },
      { sym: "2395.TW", name: "研華", code: "2395" },
      { sym: "2377.TW", name: "微星", code: "2377" },
      { sym: "3017.TW", name: "奇鋐", code: "3017" },
      { sym: "2345.TW", name: "智邦", code: "2345" },
      { sym: "6669.TW", name: "緯穎", code: "6669" },
      { sym: "3231.TW", name: "緯創", code: "3231" },
      { sym: "2412.TW", name: "中華電", code: "2412" },
      { sym: "3045.TW", name: "台灣大", code: "3045" },
      { sym: "4904.TW", name: "遠傳", code: "4904" },
    ],
  },
  {
    label: "金融",
    items: [
      { sym: "2881.TW", name: "富邦金", code: "2881" },
      { sym: "2882.TW", name: "國泰金", code: "2882" },
      { sym: "2891.TW", name: "中信金", code: "2891" },
      { sym: "2886.TW", name: "兆豐金", code: "2886" },
      { sym: "2884.TW", name: "玉山金", code: "2884" },
      { sym: "2885.TW", name: "元大金", code: "2885" },
      { sym: "2892.TW", name: "第一金", code: "2892" },
      { sym: "2880.TW", name: "華南金", code: "2880" },
      { sym: "2883.TW", name: "開發金", code: "2883" },
      { sym: "2887.TW", name: "台新金", code: "2887" },
      { sym: "2890.TW", name: "永豐金", code: "2890" },
      { sym: "5880.TW", name: "合庫金", code: "5880" },
    ],
  },
  {
    label: "傳產・航運",
    items: [
      { sym: "2603.TW", name: "長榮", code: "2603" },
      { sym: "2609.TW", name: "陽明", code: "2609" },
      { sym: "2615.TW", name: "萬海", code: "2615" },
      { sym: "1301.TW", name: "台塑", code: "1301" },
      { sym: "1303.TW", name: "南亞", code: "1303" },
      { sym: "1326.TW", name: "台化", code: "1326" },
      { sym: "6505.TW", name: "台塑化", code: "6505" },
      { sym: "2002.TW", name: "中鋼", code: "2002" },
      { sym: "1216.TW", name: "統一", code: "1216" },
      { sym: "2207.TW", name: "和泰車", code: "2207" },
      { sym: "1101.TW", name: "台泥", code: "1101" },
      { sym: "2912.TW", name: "統一超", code: "2912" },
      { sym: "9910.TW", name: "豐泰", code: "9910" },
    ],
  },
  {
    label: "熱門 ETF",
    items: [
      { sym: "0050.TW", name: "元大台灣50", code: "0050" },
      { sym: "0056.TW", name: "元大高股息", code: "0056" },
      { sym: "00878.TW", name: "國泰永續高股息", code: "00878" },
      { sym: "006208.TW", name: "富邦台50", code: "006208" },
      { sym: "00919.TW", name: "群益台灣精選高息", code: "00919" },
      { sym: "00929.TW", name: "復華台灣科技優息", code: "00929" },
    ],
  },
];

// 全部個股(含 ETF)攤平,用於名稱/代號解析與顯示名稱回填
const ALL: StockDef[] = SECTORS.flatMap((s) => s.items);

// 第一頁「即時快報」顯示的頭條股(市值前段;只有這些會即時抓價)
const HEADLINE_CODES = ["2330", "2317", "2454", "2308", "2891", "2382"];
const HEADLINES: StockDef[] = HEADLINE_CODES.map((c) => ALL.find((s) => s.code === c)).filter(
  (s): s is StockDef => Boolean(s),
);

// quick reply chip 用的熱門標的(LINE 上限 13 顆)
const CHIP_CODES = [
  "2330", "2317", "2454", "2308", "2891", "2882", "2603", "3711", "2412", "0050", "0056", "00878", "2379",
];

// 把陣列平均切成每份 ≤ max 的小塊(避免單一 bubble 超過 LINE flex ~10KB 上限)
function chunk<T>(arr: T[], max: number): T[][] {
  const parts = Math.max(1, Math.ceil(arr.length / max));
  const size = Math.ceil(arr.length / parts);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

// 資料來源策略(使用者選的混合模式):
// - 個股 → 抓擁有者自己的網站 /api/stock/<code>
// - 大盤指數(^TWII)與 ETF → 仍用 Yahoo 補
const SITE_API = "https://donttalk.vercel.app";
const ETF_CODES = new Set((SECTORS.find((s) => s.label === "熱門 ETF")?.items ?? []).map((s) => s.code));

function usesYahoo(sym: string, code: string): boolean {
  return sym.startsWith("^") || code === "TAIEX" || ETF_CODES.has(code);
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// 從擁有者網站抓日K。守衛:回傳的 code 必須與請求相符 —— 該後端對未收錄的代號會
// 直接回傳台積電(2330)的資料,若不比對就會顯示錯誤個股。code 需為純數字(去掉 .TW)。
async function fetchSiteCandles(code: string): Promise<Candle[] | null> {
  try {
    // 帶 cache-bust:Vercel 邊緣快取在無 query 時會回傳共用/過期的錯誤資料
    const url = `${SITE_API}/api/stock/${encodeURIComponent(code)}?cb=${Date.now()}`;
    const res = await fetchWithTimeout(url, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string; candles?: Candle[] };
    if (String(data.code) !== code) return null; // 守衛:代號不符 = 站內未收錄
    const candles = (data.candles ?? []).filter((c) => num(c?.close) !== null);
    return candles.length >= 2 ? candles : null;
  } catch {
    return null;
  }
}

// 站內 /api/stock/<code> 的擴充資料(交易計畫、最新訊號、績效摘要)。
// 一次 fetch 帶回全部欄位,個股卡片底部「交易策略」區塊用這份。
interface TradePlan {
  buy_price: number;
  sl: number;
  sl_source: string;
  sl_candidates?: { name: string; price: number }[];
  tp: number;
  tp_source: string;
  tp_candidates?: { name: string; price: number }[];
  rr: number;
}
interface Marker {
  time: string;
  text: string;
  color?: string;
  position?: string;
  shape?: string;
}
interface PerformanceSummary {
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  profitLossRatio: number;
  cumulativeReturn: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldDays: number;
}
interface SiteStockData {
  name: string;
  candles: Candle[];
  tradePlan?: TradePlan;
  markers?: Marker[];
  performance?: { summary?: PerformanceSummary };
}

async function fetchSiteStockData(code: string): Promise<SiteStockData | null> {
  try {
    const url = `${SITE_API}/api/stock/${encodeURIComponent(code)}?cb=${Date.now()}`;
    const res = await fetchWithTimeout(url, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      name?: string;
      candles?: Candle[];
      tradePlan?: TradePlan;
      markers?: Marker[];
      performance?: { summary?: PerformanceSummary };
    };
    if (String(data.code) !== code) return null;
    const candles = (data.candles ?? []).filter((c) => num(c?.close) !== null);
    if (candles.length < 2) return null;
    return {
      name: data.name ?? code,
      candles,
      tradePlan: data.tradePlan,
      markers: data.markers,
      performance: data.performance,
    };
  } catch {
    return null;
  }
}

// Yahoo 報價(大盤 / ETF,或站內查無時的後備)
async function fetchYahooQuote(sym: string, name: string, code: string): Promise<Quote> {
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

// 統一報價:依來源策略路由。個股一律走網站(查無/失敗 → 顯示資料不可用,不改用 Yahoo);
// 只有大盤指數與 ETF 走 Yahoo。
async function fetchQuote(sym: string, name: string, code: string): Promise<Quote> {
  if (usesYahoo(sym, code)) return fetchYahooQuote(sym, name, code);
  const candles = await fetchSiteCandles(code);
  if (!candles) return { name, code, price: null, change: null, pct: null };
  const price = num(candles[candles.length - 1].close);
  const prev = num(candles[candles.length - 2].close);
  if (price === null || prev === null || prev === 0) return { name, code, price, change: null, pct: null };
  const change = price - prev;
  return { name, code, price, change, pct: (change / prev) * 100 };
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

// STOCK LIST 用的可點報價列:quoteRow 視覺 + pickRow postback 動作(整列點擊可看走勢)
function directoryQuoteRow(q: Quote, sym: string, name: string): LineMessage {
  const c = changeParts(q);
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "10px",
    paddingBottom: "10px",
    action: { type: "postback", data: `s=stk&sym=${sym}`, displayText: `${name} 走勢`.slice(0, 300) },
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

// 一組 STOCK LIST 列(用 directoryQuoteRow 渲染,可點 + 含報價)
function directoryQuoteRows(items: Quote[], syms: string[], names: string[]): LineMessage {
  const rows: LineMessage[] = [];
  items.forEach((q, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(directoryQuoteRow(q, syms[i], names[i]));
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

// 個股總覽頁:整區可點清單(點任一檔 → 送出 postback 看走勢),含即時報價
// 報價由呼叫端預先 fetchQuote 後傳入(避免每個 row 獨立 fetch 造成 bubble 渲染 race condition)
function directoryBubble(label: string, items: StockDef[], quotes: Quote[]): LineMessage {
  const syms = items.map((s) => s.sym);
  const names = items.map((s) => s.name);
  return {
    type: "bubble",
    size: "mega",
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
            { type: "text", text: "STOCK LIST", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
            { type: "filler" },
            { type: "text", text: label, size: "xs", weight: "bold", color: "#334155", align: "end", flex: 0 },
          ],
        },
        { type: "separator", margin: "lg", color: "#F1F5F9" },
        directoryQuoteRows(quotes, syms, names),
        { type: "text", text: "點任一檔看即時走勢 · 或直接打代號查任何股票", size: "xxs", color: "#CBD5E1", margin: "lg", wrap: true },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [subtleLink("前往股票分析網站", STOCK_URL)],
    },
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

// 挑熱門股看走勢的 chips(postback);LINE quick reply 上限 13 顆
function pickChips(): QuickItem[] {
  return CHIP_CODES.map((c) => ALL.find((s) => s.code === c))
    .filter((s): s is StockDef => Boolean(s))
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
  const byName = [INDEX, ...ALL].find((s) => t.includes(s.name) || t.includes(s.code));
  if (byName) return byName;
  const m = t.match(/(?:^|\D)(\d{4,6})(?:\.(?:TW|TWO))?(?:\D|$)/i);
  if (m) {
    const code = m[1];
    return { sym: `${code}.TW`, name: code, code };
  }
  return undefined;
}

// Yahoo 近一個月收盤序列(大盤 / ETF,或站內查無時的後備)
async function fetchYahooCloses(sym: string): Promise<number[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const raw = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const closes = raw.filter((c): c is number => typeof c === "number" && Number.isFinite(c));
    return closes.length >= 2 ? closes : null;
  } catch {
    return null;
  }
}

// 統一收盤序列:個股一律走網站日K(查無 → null,不改用 Yahoo);大盤/ETF 走 Yahoo。
async function getCloses(sym: string, code: string): Promise<number[] | null> {
  if (usesYahoo(sym, code)) return fetchYahooCloses(sym);
  const candles = await fetchSiteCandles(code);
  return candles ? candles.map((c) => c.close) : null;
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
  const known = ALL.find((s) => s.sym === sym);
  const dispName = name ?? known?.name ?? sym;
  const dispCode = code ?? known?.code ?? sym.replace(/\.(TW|TWO)$/i, "");

  // 個股 → 抓站內完整資料(順便拿到 tradePlan / markers / performance)
  // 大盤 / ETF → 走 Yahoo,沒有交易計畫
  let closes: number[] | null = null;
  let siteData: SiteStockData | null = null;
  if (!usesYahoo(sym, dispCode)) {
    siteData = await fetchSiteStockData(dispCode);
    closes = siteData?.candles.map((c) => c.close) ?? null;
  } else {
    closes = await fetchYahooCloses(sym);
  }
  if (!closes || closes.length < 2) return [trendUnavailable(dispName)];

  return [buildTrendCard(dispName, dispCode, closes.slice(-14), siteData)];
}

function buildTrendCard(
  dispName: string,
  dispCode: string,
  closes: number[],
  siteData: SiteStockData | null,
): LineMessage {
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

  // 交易策略區塊(個股才有 — 大盤/ETF 走 Yahoo,沒 tradePlan)
  // 內容:4 個核心數字 + 候選 1 個 + 最近 3 個 markers。
  // 績效 / 策略型態放 web 頁(footer 有連結)看,LINE 卡片不堆太多東西,10KB 會炸。
  const tradePlanSection: LineMessage[] = [];
  const tp = siteData?.tradePlan;
  const allMarkers = siteData?.markers ?? [];
  if (tp) {
    tradePlanSection.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
    tradePlanSection.push({
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      margin: "md",
      contents: [
        { type: "text", text: "TRADE PLAN", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
        { type: "filler" },
        { type: "text", text: "交易計畫", size: "xxs", color: "#CBD5E1", align: "end" },
      ],
    });
    tradePlanSection.push(kvRow("進場", String(tp.buy_price)));

    // 停損 + 候選
    const slCand = (tp.sl_candidates ?? [])[0];
    tradePlanSection.push({
      type: "box",
      layout: "vertical",
      margin: "sm",
      spacing: "xs",
      contents: [
        kvRow(`停損 (${tp.sl_source})`, String(tp.sl)),
        ...(slCand
          ? [{ type: "text", text: `候選 · ${slCand.name} ${slCand.price}`, size: "xxs", color: "#94A3B8", margin: "xs" } as LineMessage]
          : []),
      ],
    });

    // 停利 + 候選
    const tpCand = (tp.tp_candidates ?? [])[0];
    tradePlanSection.push({
      type: "box",
      layout: "vertical",
      margin: "sm",
      spacing: "xs",
      contents: [
        kvRow(`停利 (${tp.tp_source})`, String(tp.tp)),
        ...(tpCand
          ? [{ type: "text", text: `候選 · ${tpCand.name} ${tpCand.price}`, size: "xxs", color: "#94A3B8", margin: "xs" } as LineMessage]
          : []),
      ],
    });

    tradePlanSection.push(kvRow("風險報酬比", String(tp.rr)));

    // 最近 3 個 markers(最新在上)
    if (allMarkers.length > 0) {
      tradePlanSection.push({ type: "separator", margin: "md", color: "#F1F5F9" });
      const recent = allMarkers.slice(-3).reverse();
      tradePlanSection.push({
        type: "text",
        text: "最近訊號",
        size: "xs",
        color: "#94A3B8",
        margin: "md",
      });
      for (const m of recent) {
        const sigColor = m.color === "#ff1744" ? "#DC2626" : m.color === "#00e676" ? "#16A34A" : "#475569";
        const isLatest = m === recent[0];
        tradePlanSection.push({
          type: "box",
          layout: "horizontal",
          margin: "xs",
          alignItems: "center",
          contents: [
            { type: "text", text: m.text, size: "sm", weight: isLatest ? "bold" : "regular", color: sigColor, flex: 3 },
            { type: "text", text: m.time, size: "xxs", color: "#94A3B8", align: "end", flex: 2 },
          ],
        });
      }
    }
  }

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
              { type: "text", text: "近兩週", size: "xxs", color: "#CBD5E1", align: "end" },
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
          ...tradePlanSection,
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
  return card;
}

export async function stockMenu(): Promise<LineMessage[]> {
  const updated = updatedNow();

  // 第一頁只即時抓「大盤 + 頭條熱門股」,避免一次打 50+ 檔 Yahoo 造成緩慢或被限流
  const liveTargets = [INDEX, ...HEADLINES];
  const quotes = await Promise.all(liveTargets.map((s) => fetchQuote(s.sym, s.name, s.code)));
  const idx = quotes[0];
  const headlineQuotes = quotes.slice(1);

  // 後續頁:台灣 50 + ETF — 先依 sector 分塊抓齊每塊的報價,再組 bubble
  // 每塊 ≤13 items,等於 ≤13 個 parallel API call / sector chunk,不會爆 Vercel edge。
  // 保留 (1/2)/(2/2) 的 chunk index 標籤供 directoryBubble 使用。
  const sectorBubbles: { label: string; items: StockDef[]; quotes: Quote[] }[] = [];
  for (const sec of SECTORS) {
    const parts = chunk(sec.items, 13);
    for (let i = 0; i < parts.length; i++) {
      const items = parts[i];
      const q = await Promise.all(items.map((s) => fetchQuote(s.sym, s.name, s.code)));
      const label = parts.length > 1 ? `${sec.label} (${i + 1}/${parts.length})` : sec.label;
      sectorBubbles.push({ label, items, quotes: q });
    }
  }

  const bubbles: LineMessage[] = [];

  // 第一頁:即時快報(大盤特寫 + 熱門股)
  const page1: LineMessage[] = [marketHeader("即時報價 · 大盤 Yahoo,個股取自本人網站")];
  page1.push({ type: "box", layout: "vertical", margin: "lg", contents: [indexFeature(idx)] });
  page1.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
  page1.push(sectionLabel("熱門股"));
  page1.push(quoteRows(headlineQuotes));
  bubbles.push(stockBubble(page1, updated));

  // 後續頁:依產業分類的個股總覽(含即時報價 + 點擊看走勢)
  for (const sb of sectorBubbles) {
    bubbles.push(directoryBubble(sb.label, sb.items, sb.quotes));
  }

  const card: LineMessage = {
    type: "flex",
    altText: "台股快報 · 台灣50",
    contents: { type: "carousel", contents: bubbles },
    quickReply: quickReply(pickChips()),
  };
  return [card];
}
