// Yahoo → market_price_bars ingestion.
// 補 stock-app 2026-07 被關後沒人餵 Neon 的洞。
//
//   Usage:
//     DATABASE_URL=... node scripts/ingest-yahoo.mjs [--range=2y] [--dry-run]
//
//   --range=2y      Yahoo lookback (default 2y)
//   --range=5d      增量(只抓最近 5 天)
//   --dry-run       只 print 不寫 DB
//   --limit=N       只處理 N 個 symbol(debug)
//
// symbol 對映:
//   DB symbol="2330" + market="TWSE" → Yahoo "2330.TW"
//   DB symbol="6223" + market="TPEX" → Yahoo "6223.TWO"
//
// 寫入以 UPSERT 為主,key = (source_name, symbol, contract_month, trade_date)。
// 用 unnest() 一次 batch 一個 symbol(避免 per-row transaction)。

import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const args = new Map(process.argv.slice(2).map((a) => [a.split("=")[0], a.split("=")[1] ?? true]));
const RANGE = String(args.get("--range") ?? "2y");
const DRY_RUN = args.has("--dry-run");
const LIMIT = args.get("--limit") ? Number(args.get("--limit")) : Infinity;
const BATCH_SIZE = 500; // max rows per UPSERT (PG parameter limit)

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log(`▶ ingest-yahoo | range=${RANGE} | dry=${DRY_RUN} | limit=${LIMIT === Infinity ? "∞" : LIMIT}`);

// 1. 撈現有 universe(DB 裡有出現過的 stock/etf 對)
const universe = await client.query(`
  SELECT symbol, asset_type, market
  FROM market_price_bars
  WHERE asset_type IN ('stock', 'etf')
    AND market IN ('TWSE', 'TPEX')
    AND contract_month = ''
  GROUP BY symbol, asset_type, market
  ORDER BY symbol
`);

console.log(`▶ universe rows: ${universe.rows.length}`);

function yahooSymbol(symbol, market) {
  if (market === "TWSE") return `${symbol}.TW`;
  if (market === "TPEX") return `${symbol}.TWO`;
  return null;
}

const target = universe.rows
  .map((r) => ({
    symbol: r.symbol,
    market: r.market,
    asset_type: r.asset_type,
    yahoo: yahooSymbol(r.symbol, r.market),
  }))
  .filter((r) => r.yahoo !== null)
  .slice(0, LIMIT);

console.log(`▶ target symbols: ${target.length}`);

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; yahoo-finance)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let totalRows = 0;
let totalSuccess = 0;
let totalFailed = 0;
const failures = [];
const startedAt = Date.now();

for (let i = 0; i < target.length; i++) {
  const t = target[i];
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t.yahoo)}?interval=1d&range=${RANGE}`;

  let res;
  try {
    res = await fetch(yahooUrl, { headers: HEADERS });
  } catch (err) {
    totalFailed++;
    failures.push({ symbol: t.symbol, error: err.message });
    continue;
  }
  if (!res.ok) {
    totalFailed++;
    failures.push({ symbol: t.symbol, error: `HTTP ${res.status}` });
    continue;
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    totalFailed++;
    failures.push({ symbol: t.symbol, error: "no result" });
    continue;
  }
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q || ts.length === 0) {
    totalFailed++;
    failures.push({ symbol: t.symbol, error: "no quote" });
    continue;
  }

  // 準備所有 rows for this symbol
  const rows = [];
  for (let j = 0; j < ts.length; j++) {
    const o = q.open?.[j];
    const h = q.high?.[j];
    const l = q.low?.[j];
    const c = q.close?.[j];
    const v = q.volume?.[j];
    if (o == null || h == null || l == null || c == null) continue;
    const tradeDate = new Date(ts[j] * 1000);
    const yyyy = tradeDate.getUTCFullYear();
    const mm = String(tradeDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(tradeDate.getUTCDate()).padStart(2, "0");
    rows.push({
      trade_date: `${yyyy}-${mm}-${dd}`,
      open_price: o,
      high_price: h,
      low_price: l,
      close_price: c,
      volume: v != null ? Math.round(v) : null,
    });
  }

  if (rows.length === 0) {
    totalFailed++;
    failures.push({ symbol: t.symbol, error: "no rows" });
    continue;
  }

  if (!DRY_RUN) {
    try {
      // Batch UPSERT in chunks of BATCH_SIZE
      for (let off = 0; off < rows.length; off += BATCH_SIZE) {
        const chunk = rows.slice(off, off + BATCH_SIZE);
        await client.query(
          `INSERT INTO market_price_bars
             (source_name, symbol, asset_type, market, contract_month,
              trade_date, open_price, high_price, low_price, close_price,
              volume, raw_payload, fetched_at)
           SELECT 'yahoo'::varchar, $1::varchar, $2::varchar, $3::varchar, ''::varchar,
                  d.trade_date::date, d.open_price, d.high_price, d.low_price, d.close_price,
                  d.volume, '{}'::text, NOW()
           FROM unnest($4::date[], $5::float8[], $6::float8[], $7::float8[], $8::float8[], $9::bigint[])
             AS d(trade_date, open_price, high_price, low_price, close_price, volume)
           ON CONFLICT (source_name, symbol, contract_month, trade_date) DO UPDATE SET
             asset_type = EXCLUDED.asset_type,
             market = EXCLUDED.market,
             open_price = EXCLUDED.open_price,
             high_price = EXCLUDED.high_price,
             low_price = EXCLUDED.low_price,
             close_price = EXCLUDED.close_price,
             volume = EXCLUDED.volume,
             fetched_at = NOW()`,
          [
            t.symbol,
            t.asset_type,
            t.market,
            chunk.map((r) => r.trade_date),
            chunk.map((r) => r.open_price),
            chunk.map((r) => r.high_price),
            chunk.map((r) => r.low_price),
            chunk.map((r) => r.close_price),
            chunk.map((r) => r.volume),
          ],
        );
      }
    } catch (err) {
      totalFailed++;
      failures.push({ symbol: t.symbol, error: err.message });
      continue;
    }
  }

  totalRows += rows.length;
  totalSuccess++;

  // Progress log every 20 symbols
  if ((i + 1) % 20 === 0 || i === target.length - 1) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const eta = totalSuccess > 0
      ? ((elapsed / (i + 1)) * (target.length - i - 1)).toFixed(0)
      : "?";
    console.log(
      `  [${i + 1}/${target.length}] ${t.symbol} ✓ ${rows.length} bars | elapsed=${elapsed}s eta=${eta}s`,
    );
  }

  await sleep(100);
}

const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n✅ done. success=${totalSuccess} failed=${totalFailed} rows=${totalRows} elapsed=${totalElapsed}s`);
if (failures.length > 0) {
  console.log("\nfailures:");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.symbol}: ${f.error}`);
  if (failures.length > 10) console.log(`  ... and ${failures.length - 10} more`);
}

await client.end();
