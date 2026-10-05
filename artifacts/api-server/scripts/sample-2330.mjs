import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const sample = await c.query(
  "SELECT * FROM market_price_bars WHERE symbol = '2330' ORDER BY trade_date DESC LIMIT 2",
);
console.log("sample 2330 rows:");
for (const r of sample.rows) {
  console.log(JSON.stringify(r, null, 2));
}

const universe = await c.query(
  "SELECT symbol, asset_type, market, COUNT(*)::int AS n FROM market_price_bars WHERE trade_date >= '2026-09-25' GROUP BY symbol, asset_type, market ORDER BY symbol LIMIT 20",
);
console.log("\nuniverse sample (last week):");
for (const r of universe.rows) console.log(`  ${r.symbol} ${r.asset_type}/${r.market}: ${r.n} bars`);

const markets = await c.query(
  "SELECT market, COUNT(DISTINCT symbol)::int AS n FROM market_price_bars WHERE trade_date >= '2026-09-25' GROUP BY market ORDER BY market",
);
console.log("\nmarkets:");
for (const r of markets.rows) console.log(`  ${r.market}: ${r.n} symbols`);

const sources = await c.query(
  "SELECT source_name, COUNT(*)::int AS n FROM market_price_bars WHERE trade_date >= '2026-09-25' GROUP BY source_name ORDER BY source_name",
);
console.log("\nsources:");
for (const r of sources.rows) console.log(`  ${r.source_name}: ${r.n} bars`);

await c.end();
