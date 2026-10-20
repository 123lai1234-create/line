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
  // 資料實際的交易日(YYYY-MM-DD)。DB 來源的報價會帶,讓卡片顯示
  // 真實的資料日期而不是「現在」—— 否則盤中查詢會顯示今天的時間戳
  // 但價格其實是昨天收盤。null = 不確定(走 Yahoo 即時)。
  asOf?: string | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// 資料來源策略(使用者選的混合模式):
// - 個股 → 抓擁有者自己的網站 /api/stock/<code>
// - 大盤指數(^TWII)與 ETF → 仍用 Yahoo 補
//
// SITE_API 預設 Render catchall (2026-10-05 起,Astro backend 從 Vercel Edge
// 搬到獨立 Render service)。可用 SITE_API env 覆寫 — 例如本地開發指到
// http://localhost:3000,Vercel 還活著的期間指 https://donttalk.vercel.app。
const SITE_API = process.env.SITE_API || "https://donttalk-catchall.onrender.com";
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

// 統一報價:依來源策略路由。個股一律走網站(查無/失敗 → Yahoo 後備)。
// 大盤指數與 ETF 直接走 Yahoo。
//
// 站內 backend (`/api/stock/<code>`) 仍在用 — 它給完整的日 K + 交易計畫 / 訊號 / 績效
// (給 stockTrend 卡片用)。但 backend 在 2026-07 後離線,目前回 404,所以個股的價格查詢
// 改 fallback 到 Yahoo,避免 STOCK LIST 整面空白 `—`。原本「不 fallback Yahoo」的設計是
// 為防 backend 對未收錄代號 silent 退回台積電 — 那個守衛靠回傳 code 比對,現 backend 整條
// 404 已無 silent fallback 風險,所以這個 fallback 是安全的。Yahoo 報價不含 tradePlan/
// markers / performance,但 STOCK LIST bubble 只取 price + change + pct,夠用。
//
// ⚠️ 永不 throw —— 包了 Promise.race + 超時,個別 symbol 卡死不會拖垮整個 bubble。
//   回傳 {price:null,...} 表示抓不到價,bubble 顯示「—」。
// ════════════════════════════════════════════════════════════════════════
// Neon `market_price_bars` 快取層(最快路徑)
// ────────────────────────────────────────────────────────────────────────
// 為什麼要這層:
//   `.github/workflows/ingest-yahoo-daily.yml` 每天 14:30(台北,收盤後一小時)
//   已經把 Yahoo 日 K 寫進 Neon 的 market_price_bars。所以聊天時的報價根本
//   不用再打 Yahoo —— 直接讀本機/Neon,大約 20~60ms,比打 Yahoo 的 2.3 秒快了
//   兩個數量級。這對 LINE webhook 的 5 秒 timeout 有決定性差異,尤其在
//   Render free 的冷啟動後第一個請求。
//
// 資料新鮮度:日 K,一天一筆。盤中查詢拿到的是「昨天收盤 + 昨天漲跌」。
//   這對聊天機器人可接受(而且誠實 —— 我們把 trade_date 帶出來顯示)。
//   想看盤中即時 → 走 Yahoo fallback。
//
// stale 判斷:DB 最新一筆比今天舊超過 STALE_DAYS 天就當作沒資料,fallback。
//   週末/連假會自然 stale,所以給 5 天寬限(涵蓋最長的連假)。
// ════════════════════════════════════════════════════════════════════════

const DB_STALE_DAYS = 5;
const DB_TIMEOUT_MS = 2500;

interface DbBar {
  trade_date: string;
  close_price: number;
}

// 一次查多檔:用 = ANY($2) 而不是每檔一個 round-trip。
// 7 檔 (TAIEX 除外,那個 DB 沒有) → 1 次 query 就全部回來。
async function fetchDbQuotes(codes: string[]): Promise<Map<string, DbBar[]> | null> {
  if (codes.length === 0) return new Map();

  // 用 db pool 直接下 raw SQL(market_price_bars 不在 drizzle schema 裡 ——
  // 那是 stock-app 時代留下的表,drizzle 只認 broadcasts / profile)。
  // dynamic import + try/catch:DATABASE_URL 沒設時整個模組 import 會 throw,
  // 不能讓「沒有 DB」變成「整個 bot 掛掉」,所以延後載入且失敗就 fallback。
  let query: (text: string, params: unknown[]) => Promise<{ rows: unknown[] }>;
  try {
    const mod = (await import("@workspace/db")) as unknown as {
      pool: { query: (text: string, params: unknown[]) => Promise<{ rows: unknown[] }> };
    };
    query = mod.pool.query.bind(mod.pool);
  } catch {
    return null; // 沒有 workspace/db、沒有 DATABASE_URL、或載入失敗 → 走 Yahoo
  }

  const cutoff = new Date(Date.now() - DB_STALE_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);

  // 取每檔最近 2 根日 K(今天 + 昨天收盤),算 change / pct。
  // DISTINCT ON 需要 ORDER BY 開頭是 symbol,所以外面包一層 subquery 再反轉。
  const { rows } = await query(
    `
    SELECT symbol, trade_date, close_price FROM (
      SELECT DISTINCT ON (symbol) symbol, trade_date, close_price
      FROM market_price_bars
      WHERE symbol = ANY($1)
        AND contract_month = ''
        AND trade_date >= $2
        AND close_price IS NOT NULL
      ORDER BY symbol, trade_date DESC
    ) t
    ORDER BY t.symbol, t.trade_date DESC
    LIMIT $3
    `,
    [codes, cutoff, codes.length * 2],
  );

  const map = new Map<string, DbBar[]>();
  for (const r of rows as { symbol: string; trade_date: string | Date; close_price: number }[]) {
    const code = String(r.symbol);
    const list = map.get(code) ?? [];
    const d = r.trade_date;
    list.push({
      // Neon 的 date 欄位 pg 會回 Date 物件,不是字串
      trade_date: typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10),
      close_price: Number(r.close_price),
    });
    map.set(code, list);
  }
  return map;
}

// 把 DB 的 bars 轉成 Quote(需要 ≥2 根才算得出漲跌)。
function quoteFromBars(name: string, code: string, bars: DbBar[] | undefined): Quote | null {
  if (!bars || bars.length < 2) return null;
  const latest = bars[0];       // trade_date DESC → [0] 是最新的
  const prev = bars[1];
  const price = latest.close_price;
  const prevClose = prev.close_price;
  if (!Number.isFinite(price) || !Number.isFinite(prevClose) || prevClose === 0) return null;
  const change = price - prevClose;
  return { name, code, price, change, pct: (change / prevClose) * 100, asOf: latest.trade_date };
}

// 批次版 fetchQuote 的 DB 路徑。
// 回傳「查得到 DB 資料的 code → Quote」對應表;查不到的 code 不在 map 裡。
//
// TAIEX 也走這裡了 —— ingest-yahoo.mjs 的 EXTRA_TARGETS 現在會每天把
// ^TWII 寫成 symbol="TAIEX"(2026-10-20 加的)。之前這裡把它 filter 掉是因為
// DB 裡沒有,現在有了就不用特別排除:DB 沒資料時自然 miss → fallback Yahoo。
async function dbQuotesFor(targets: StockDef[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const codes = targets.map((t) => t.code);
  if (codes.length === 0) return out;

  let barsByCode: Map<string, DbBar[]> | null = null;
  try {
    barsByCode = await withTimeout<Map<string, DbBar[]> | null>(fetchDbQuotes(codes), DB_TIMEOUT_MS);
  } catch {
    barsByCode = null;
  }
  if (!barsByCode) return out;

  for (const t of targets) {
    const q = quoteFromBars(t.name, t.code, barsByCode.get(t.code));
    if (q) out.set(t.code, q);
  }
  return out;
}

// Promise.race timeout(不回應取消底層 fetch,但避免整個 bubble 被拖住)
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race<T | null>([
    p,
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

// ════════════════════════════════════════════════════════════════════════
// 報價來源策略
// ────────────────────────────────────────────────────────────────────────
//
// ⚠️ 永不 throw —— 任何一層失敗都往下掉,最後回傳 {price:null,...} 讓卡片顯示「—」。
//   個別 symbol 卡死不會拖垮整個 bubble。
//
// 舊順序(每次打網路,2.3~6 秒):
//   站內 backend → Yahoo
//
// 新順序(命中 Neon 時 20~60ms):
//   Neon market_price_bars(DB) → 站內 backend → Yahoo
//
// DB 層是 batch 的(一次 query 拿全部),不是 per-symbol,避免 7 次 round-trip。
async function fetchQuote(sym: string, name: string, code: string): Promise<Quote> {
  try {
    if (usesYahoo(sym, code)) return await fetchYahooQuote(sym, name, code);
    const candles = await fetchSiteCandles(code);
    if (candles && candles.length >= 2) {
      const price = num(candles[candles.length - 1].close);
      const prev = num(candles[candles.length - 2].close);
      if (price !== null && prev !== null && prev !== 0) {
        const change = price - prev;
        return { name, code, price, change, pct: (change / prev) * 100, asOf: null };
      }
    }
    return await fetchYahooQuote(sym, name, code);
  } catch {
    return { name, code, price: null, change: null, pct: null, asOf: null };
  }
}

// 批次報價:DB 一次撈全部,沒命中的才個別走 fetchQuote。
// 這是 stockMenu / stockUpdate 共用的入口。
async function fetchQuotesBatch(targets: StockDef[]): Promise<Quote[]> {
  const fromDb = await dbQuotesFor(targets);
  return Promise.all(
    targets.map((t) => {
      const hit = fromDb.get(t.code);
      if (hit) return hit;
      return fetchQuote(t.sym, t.name, t.code);
    }),
  );
}

// Yahoo 日K → 統一成內部 Candle 形狀,方便與站內資料同型處理。
async function fetchYahooCandles(sym: string): Promise<Candle[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: {
          timestamp?: number[];
          indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] };
        }[];
      };
    };
    const result = data.chart?.result?.[0];
    const ts = result?.timestamp ?? [];
    const q = result?.indicators?.quote?.[0] ?? {};
    const opens = q?.open ?? [];
    const highs = q?.high ?? [];
    const lows = q?.low ?? [];
    const closes = q?.close ?? [];
    const candles: Candle[] = [];
    for (let i = 0; i < closes.length; i++) {
      const c = closes[i];
      if (typeof c !== "number" || !Number.isFinite(c)) continue;
      const o = opens[i], h = highs[i], l = lows[i];
      candles.push({
        time: new Date((ts[i] ?? 0) * 1000).toISOString().slice(0, 10),
        open: typeof o === "number" && Number.isFinite(o) ? o : c,
        high: typeof h === "number" && Number.isFinite(h) ? h : c,
        low: typeof l === "number" && Number.isFinite(l) ? l : c,
        close: c,
      });
    }
    return candles.length >= 2 ? candles : null;
  } catch {
    return null;
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
// updatedStamp:偏好用報價帶回來的真實交易日(DB 來源);拿不到就用「現在」。
//   DB 是日 K,所以盤中查詢時資料其實是上一個交易日的收盤 —— 顯示真實日期
//   比顯示「今天 15:30」誠實。
function updatedStamp(quotes: Quote[]): string {
  const dates = quotes
    .map((q) => q.asOf)
    .filter((d): d is string => typeof d === "string" && d.length > 0);
  if (dates.length === 0) return updatedNow();
  // 取最新的那個日期(多數情況全部同一天)
  const latest = dates.sort().at(-1) ?? dates[0];
  return `${latest.slice(5)} 收盤`;
}

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
  const candles = await fetchSiteCandles(code) ?? (await fetchYahooCandles(sym));
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
  // 站內離線 / 該檔未收錄 → fallback Yahoo 拿 OHLC,只缺擴充區塊,走勢圖照樣能顯示。
  // 大盤 / ETF → 直接走 Yahoo(站內本來就沒這些)。
  let siteData: SiteStockData | null = null;
  let candles: Candle[] | null = null;
  if (!usesYahoo(sym, dispCode)) {
    siteData = await fetchSiteStockData(dispCode);
    candles = siteData?.candles ?? null;
    if (!candles) candles = await fetchYahooCandles(sym);
  } else {
    candles = await fetchYahooCandles(sym);
  }
  const closes = candles?.map((c) => c.close) ?? null;
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

// 一次抓「大盤 + 6 條頭條熱門股」報價 + 統一時間戳。
// 先試 Neon 快取層(一次 query,~20-60ms),沒命中才各自打網路。
// 命中 DB 時通常 <200ms;全落空(瞬間)才會碰到 Yahoo 的 2.3 秒。
// 同時被 stockUpdate()(only page 1)和 stockMenu()(page 1 + sectors 共用)。
async function fetchLiveQuotes(): Promise<{ idx: Quote; headlines: Quote[]; updated: string }> {
  const liveTargets = [INDEX, ...HEADLINES];
  const quotes = await fetchQuotesBatch(liveTargets);
  return {
    idx: quotes[0],
    headlines: quotes.slice(1),
    updated: updatedStamp(quotes),
  };
}

// 「即時快報」單張 flex message — 只取 page 1(market + 6 條熱門股)
// 用於 follow 事件、hook append,避免跟 mainMenu 合塞超過 LINE 5-message 上限。
export async function stockUpdate(): Promise<LineMessage> {
  const { idx, headlines, updated } = await fetchLiveQuotes();
  const page1Contents: unknown[] = [marketHeader("即時報價・大盤")];
  page1Contents.push({ type: "box", layout: "vertical", margin: "lg", contents: [indexFeature(idx)] });
  page1Contents.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
  page1Contents.push(sectionLabel("熱門股"));
  page1Contents.push(quoteRows(headlines));
  return {
    type: "flex",
    altText: "台股快報 · 大盤+熱門股",
    contents: stockBubble(page1Contents as LineMessage[], updated),
    quickReply: quickReply(pickChips()),
  };
}

export async function stockMenu(): Promise<LineMessage[]> {
  const { idx, headlines, updated } = await fetchLiveQuotes();

  // Sector 報價:先把全部 46 檔(含 ETF)一次餵給 DB 層做單一 query,
  // 沒命中的才各自 fallback。命中 Neon 時這裡 ~60ms 解決(先前是 46 次打 Yahoo)。
  const allItems = SECTORS.flatMap((s) => s.items);
  const allQuotes = await fetchQuotesBatch(allItems);
  const byCode = new Map(allQuotes.map((q) => [q.code, q]));

  const sectorBubbles: { label: string; items: StockDef[]; quotes: Quote[] }[] = [];
  for (const sec of SECTORS) {
    const parts = chunk(sec.items, 13);
    parts.forEach((items, i) => {
      const label = parts.length > 1 ? `${sec.label} (${i + 1}/${parts.length})` : sec.label;
      sectorBubbles.push({
        label,
        items,
        quotes: items.map((it) => byCode.get(it.code) ?? { name: it.name, code: it.code, price: null, change: null, pct: null, asOf: null }),
      });
    });
  }

  return assembleStockMenu(updated, idx, headlines, sectorBubbles);
}

// 用 stockMenu() 取的 fetch 結果組裝完整 5-message carousel(首張 page 1 + 後 4 張 sector bubbles)。
// 抽出來讓 stockUpdate() 與 stockMenu() 共用邏輯,並集中 page 1 的版面計算。
function assembleStockMenu(updated: string, idx: Quote, headlineQuotes: Quote[], sectorBubbles: { label: string; items: StockDef[]; quotes: Quote[] }[]): LineMessage[] {
  const page1Contents: unknown[] = [marketHeader("即時報價・大盤")];
  page1Contents.push({ type: "box", layout: "vertical", margin: "lg", contents: [indexFeature(idx)] });
  page1Contents.push({ type: "separator", margin: "lg", color: "#F1F5F9" });
  page1Contents.push(sectionLabel("熱門股"));
  page1Contents.push(quoteRows(headlineQuotes));
  const page1Bubble = stockBubble(page1Contents as LineMessage[], updated);

  // ⚠️ LINE flex message 上限 50KB,把整包塞一個 carousel 會炸。
  // 改成「5 個獨立 flex message」,每個 message 是一個 bubble,LINE reply API 一次最多收 5 message。
  // 這樣每個 message 各自 ≤ 50KB,總量也分散。
  const messages: LineMessage[] = [
    // Message 1:即時快報(market + headlines)
    {
      type: "flex",
      altText: `台股快報 · 大盤+熱門股`,
      contents: page1Bubble,
      quickReply: quickReply(pickChips()),
    },
    // Message 2-5:每個 sector 一張(最多 4 sectors)
    ...sectorBubbles.slice(0, 4).map((sb, i) => ({
      type: "flex" as const,
      altText: `${sb.label}${i === 0 ? " · 點擊看走勢" : ""}`,
      contents: directoryBubble(sb.label, sb.items, sb.quotes),
    })),
  ];
  return messages;
}
