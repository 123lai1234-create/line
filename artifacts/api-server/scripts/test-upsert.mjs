import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const t0 = Date.now();
await c.connect();
console.log(`connect: ${Date.now() - t0}ms`);

const sql = `INSERT INTO market_price_bars
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
   fetched_at = NOW()`;

const N = 500;
const tradeDates = [];
const opens = [];
const highs = [];
const lows = [];
const closes = [];
const volumes = [];
const baseDate = new Date("2024-01-01");
for (let i = 0; i < N; i++) {
  const d = new Date(baseDate.getTime() + i * 86400000);
  tradeDates.push(d.toISOString().slice(0, 10));
  opens.push(100 + i * 0.01);
  highs.push(105 + i * 0.01);
  lows.push(95 + i * 0.01);
  closes.push(101 + i * 0.01);
  volumes.push(1000000 + i);
}

const t1 = Date.now();
const result = await c.query(sql, [
  "TEST", "stock", "TWSE",
  tradeDates, opens, highs, lows, closes, volumes,
]);
console.log(`upsert ${N} rows: ${Date.now() - t1}ms, affected=${result.rowCount}`);

const t2 = Date.now();
await c.query(`DELETE FROM market_price_bars WHERE symbol = 'TEST'`);
console.log(`delete: ${Date.now() - t2}ms`);

await c.end();
