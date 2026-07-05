---
name: LINE bot flex UI conventions
description: Rich-card design system for the portfolio LINE bot's flex messages, plus the hero-image URL gotcha.
---

# LINE bot flex UI (CTBC-inspired rich cards)

Design language for the bot's flex messages lives in `artifacts/api-server/src/lib/services/flex.ts` as reusable helpers:
- `pill(text, bg, color)` — rounded colored tag (used for stock change %, header badges).
- `gaugeBar(level 0|1|2)` — 3-segment horizontal bar lighting the segment matching severity (green/amber/red = GO/CAUTION/NO-GO).

Cards that use them: `router.ts` mainMenu (hero + icon chips), `stock.ts` (dark indexFeature card + change pills), `weather.ts` (verdict header + gaugeBar per metric + tinted offshore banner).

## Hero image URL gotcha
**Why:** the site is hosted at TWO similar domains and only one serves the OG image.
- `https://donttalk.vercel.app/og-default.png` (two-t) → 200, image/png (the branded dark "工程 × 生醫 × AI 平台" hero). USE THIS.
- `https://dontalk.vercel.app/og-default.png` (one-t) → 404.
**How to apply:** when adding any flex `hero`/image referencing this portfolio site, use the two-t `donttalk` domain, and verify the URL returns `image/*` before shipping (a broken hero silently degrades the card).

## Verifying flex without publishing
Bot changes only go live in production after the user PUBLISHES (free Autoscale, no Reserved VM). To verify flex structure locally, bundle the service files with the workspace esbuild binary and run under node — `tsx` is NOT installed:
`./artifacts/api-server/node_modules/.bin/esbuild <test>.ts --bundle --platform=node --format=esm --outfile=out.mjs && node out.mjs`
(`npx esbuild` fails — esbuild isn't on PATH.)
