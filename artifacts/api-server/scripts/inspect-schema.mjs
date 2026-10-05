import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const cols = await c.query(
  "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'market_price_bars' ORDER BY ordinal_position",
);
console.log("market_price_bars columns:");
for (const r of cols.rows) {
  console.log(`  ${r.column_name} ${r.data_type}${r.is_nullable === "NO" ? " NOT NULL" : ""}`);
}

const idx = await c.query(
  "SELECT indexname FROM pg_indexes WHERE tablename = 'market_price_bars'",
);
console.log("\nindexes:", idx.rows.map((r) => r.indexname).join(", "));

const sample = await c.query(
  "SELECT * FROM market_price_bars WHERE symbol = '2330.TW' ORDER BY trade_date DESC LIMIT 3",
);
console.log("\nlatest 2330.TW rows:");
for (const r of sample.rows) console.log(JSON.stringify(r));

const cnt = await c.query(
  "SELECT symbol, COUNT(*)::int AS n FROM market_price_bars GROUP BY symbol ORDER BY n DESC LIMIT 5",
);
console.log("\ntop stocks by bars:");
for (const r of cnt.rows) console.log(`  ${r.symbol}: ${r.n}`);

const allSym = await c.query(
  "SELECT DISTINCT symbol FROM market_price_bars ORDER BY symbol",
);
console.log("\nall distinct symbols:", allSym.rows.length);

const latestAll = await c.query(
  "SELECT symbol, MAX(trade_date) AS last_date FROM market_price_bars GROUP BY symbol ORDER BY symbol LIMIT 5",
);
console.log("\nlatest trade_date per symbol (sample):");
for (const r of latestAll.rows) console.log(`  ${r.symbol}: ${r.last_date}`);

const byDate = await c.query(
  "SELECT trade_date, COUNT(DISTINCT symbol)::int AS n FROM market_price_bars GROUP BY trade_date ORDER BY trade_date DESC LIMIT 5",
);
console.log("\nlatest trade_dates with stock counts:");
for (const r of byDate.rows) console.log(`  ${r.trade_date}: ${r.n} symbols`);

await c.end();
