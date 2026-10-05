import pg from "file:///D:/project/line/lib/db/node_modules/pg/lib/index.js";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const t = await c.query("SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename", ["public"]);
console.log("tables:", t.rows.map((r) => r.tablename).join(", "));
const p = await c.query("SELECT id, bot_name, website_url FROM profile");
console.log("profile rows:", p.rows);
const b = await c.query("SELECT COUNT(*)::int AS n FROM broadcasts");
console.log("broadcasts count:", b.rows[0].n);
await c.end();
