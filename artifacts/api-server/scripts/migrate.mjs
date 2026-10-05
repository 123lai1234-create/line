// One-shot Neon schema bootstrap for LINE bot.
// Run from api-server root: `node scripts/migrate.mjs`
// Reads DATABASE_URL from env. Idempotent: every CREATE uses IF NOT EXISTS.

// Resolve `pg` from lib/db's node_modules (api-server doesn't depend on it directly).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pg = require("../../../lib/db/node_modules/pg");

const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const statements = [
  `CREATE TABLE IF NOT EXISTS profile (
     id              SERIAL PRIMARY KEY,
     bot_name        TEXT        NOT NULL,
     intro_message   TEXT        NOT NULL,
     website_url     TEXT        NOT NULL,
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS broadcasts (
     id              SERIAL PRIMARY KEY,
     kind            TEXT        NOT NULL DEFAULT 'text',
     message         TEXT,
     title           TEXT,
     image_url       TEXT,
     link_url        TEXT,
     link_label      TEXT,
     status          TEXT        NOT NULL,
     error_message   TEXT,
     scheduled_at    TIMESTAMPTZ,
     sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  // Seed default profile so ensureProfile() in app code has something to return
  // on first request. ON CONFLICT DO NOTHING keeps reruns safe.
  `INSERT INTO profile (bot_name, intro_message, website_url)
     VALUES (
       '不說',
       E'嗨,我是「不說」 🤖 你的作品集 AI 小幫手。\n\n直接輸入就能開始:\n· 潛水海況 · 股票走勢 · 音樂欣賞 · 蛋白質設計 · 專案介紹\n\n想看完整作品與互動展示 👇',
       'https://donttalk.vercel.app/'
     )
     ON CONFLICT DO NOTHING`,
];

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const sql of statements) {
    const tag = sql.split(/\s+/).slice(0, 3).join(" ");
    process.stdout.write(`▶ ${tag} ... `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("\n✅ schema applied");
} catch (err) {
  console.error("\n❌ migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
