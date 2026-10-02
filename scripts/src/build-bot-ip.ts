#!/usr/bin/env node
// build-bot-ip.mjs — 把 bot-ip.svg 轉成多個 PNG 供 Rich Menu / Flex Message / Admin 使用。
//
// 來源: artifacts/ai-server/public/bot-ip.svg
// 輸出:
//   scripts/assets/bot-ip-256.png         ← Rich Menu 內用
//   artifacts/ai-server/public/bot-ip.png ← api-server 靜態資產
//   artifacts/line-bot-admin/public/bot-ip.png ← admin 頭像
//
// 跑單命令：npx tsx scripts/src/build-bot-ip.mjs

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");

const SVG = readFileSync(join(REPO, "artifacts", "api-server", "public", "bot-ip.svg"), { encoding: null });

function makePng(px) {
  const resvg = new Resvg(SVG, {
    fitTo: { mode: "width", value: px },
    background: "transparent",
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

const targets = [
  { path: join(REPO, "scripts", "assets", "bot-ip-256.png"), px: 256 },
  { path: join(REPO, "artifacts", "api-server", "public", "bot-ip.png"), px: 256 },
  { path: join(REPO, "artifacts", "api-server", "public", "bot-ip@2x.png"), px: 512 },
  { path: join(REPO, "artifacts", "line-bot-admin", "public", "bot-ip.png"), px: 256 },
  { path: join(REPO, "artifacts", "line-bot-admin", "public", "bot-ip@2x.png"), px: 512 },
];

let ok = true;
for (const t of targets) {
  try {
    mkdirSync(dirname(t.path), { recursive: true });
    const png = makePng(t.px);
    writeFileSync(t.path, png);
    console.log(`✓ ${t.path.replace(REPO + "\\", "")} — ${(png.length / 1024).toFixed(1)} KB`);
  } catch (e) {
    ok = false;
    console.error(`✗ ${t.path}: ${e.message}`);
  }
}

if (!ok) process.exit(1);
console.log("\nDone. bot-ip 圖片已生成。");