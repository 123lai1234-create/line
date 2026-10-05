import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const summary = await c.query(`
  SELECT source_name,
         COUNT(*)::int AS rows,
         COUNT(DISTINCT symbol)::int AS symbols,
         MIN(trade_date)::text AS first_date,
         MAX(trade_date)::text AS last_date
  FROM market_price_bars
  WHERE trade_date >= '2024-01-01'
  GROUP BY source_name
  ORDER BY source_name
`);
console.log("data summary (>= 2024-01-01):");
for (const r of summary.rows) console.log(`  ${r.source_name}: ${r.rows} rows, ${r.symbols} symbols, ${r.first_date} → ${r.last_date}`);

const latest = await c.query(`
  SELECT symbol, market, trade_date::text, close_price, fetched_at::text
  FROM market_price_bars
  WHERE symbol IN ('2330', '0050', '2317') AND source_name = 'yahoo'
  ORDER BY symbol, trade_date DESC
  LIMIT 9
`);
console.log("\nyahoo latest:");
for (const r of latest.rows) console.log(`  ${r.symbol} (${r.market}) ${r.trade_date}: close=${r.close_price}`);

const oct5 = await c.query(`
  SELECT COUNT(DISTINCT symbol)::int AS n
  FROM market_price_bars
  WHERE trade_date >= '2026-10-05' AND source_name = 'yahoo'
`);
console.log(`\nyahoo rows for 2026-10-05+: ${oct5.rows[0].n} symbols`);

const recent = await c.query(`
  SELECT trade_date::text, COUNT(DISTINCT symbol)::int AS n
  FROM market_price_bars
  WHERE source_name = 'yahoo'
  GROUP BY trade_date
  ORDER BY trade_date DESC
  LIMIT 5
`);
console.log("\nyahoo latest dates:");
for (const r of recent.rows) console.log(`  ${r.trade_date}: ${r.n} symbols`);

await c.end();
