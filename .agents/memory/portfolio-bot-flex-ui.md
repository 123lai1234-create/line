---
name: LINE bot flex UI conventions
description: Refined bank-style design system for the portfolio LINE bot's flex messages, plus the hero-image URL gotcha and how to verify flex locally.
---

# LINE bot flex UI (Refined bank-style)

The user reviewed two canvas mockups ("Refined" light/white bank style vs "Premium Dark") and chose **Refined**. An earlier emoji-heavy / dark-header enrichment was rejected as "不夠專業". The graduated design language lives in `artifacts/api-server/src/lib/services/`.

**Why:** owner wants a CTBC-bank level of restraint — calm, information-first, color used only as signal.

## Design rules (apply to any new card)
- **White card bodies.** No dark or verdict-colored header backgrounds. Everything sits on white.
- **Small gray English eyebrows** at the top of each card: `MAIN MENU`, `MARKET UPDATE`, `DIVE CONDITIONS` (size `xs`, weight bold, color `#94A3B8`). The user explicitly approved English eyebrows over Chinese content.
- **Hairline separators** between rows: `{ type: "separator", color: "#F1F5F9" }`.
- **Minimal emoji** — drop them from titles and metric labels (they read as unprofessional here). Emoji is still fine in quick-reply chips and (harmlessly) in altText.
- **Color ONLY as signal.** Prices/values are dark (`#1E293B` / `#0F172A`); only the change figure or status marker is colored. TW convention 紅漲綠跌: up `#DC2626`, down `#16A34A`, flat `#94A3B8`.
- **Right-aligned numeric columns.** Change shown as a 2-line vertical block (abs value w/ ▲/▼ on top, % below), `align: "end"`.
- **Subtle footer links, not big buttons** — `subtleLink()` (slate-50 rounded box, centered gray text + `›`, uri action) replaced the old colored `linkButton` CTAs.

## Helpers in `flex.ts`
- `pill(text, bg, color)` — rounded colored tag (stock/weather badges).
- `dot(color, size="10px")` — small filled status circle; used per weather metric with `SEV_DOT = {0:#22C55E,1:#F59E0B,2:#EF4444}`.
- `subtleLink(label, uri)` — low-key footer link (see above).
- `gaugeBar(level)` — still exported but NO LONGER used (Refined replaced the 3-segment bar with a single `dot`). Kept for reference; safe to remove if truly unused later.

## Per-card notes
- `router.ts` mainMenu: **switchable across 3 styles** — `bento` (色塊 grid, default), `hero` (linearGradient 135° `#7C3AED`→`#EC4899` banner), `seg` (分段清單 with 即時工具/創作作品 tab bar). Signature `mainMenu(botName, websiteUrl?, style="bento", tab="tools")`. Every style shares a `menuFooter` whose top row is a `styleSwitcher` (色塊/導覽/清單 chips). Switching happens two ways: text commands via `menuStyleByText()` (色塊·bento / 導覽·hero / 清單·分段·segment → seg, anchored exact-match), and postbacks `s=menu&style=X` (+ `&tab=tools|creations` for seg). `routePostback` allowlists both params (bad style→bento, bad tab→tools). All 3 sub-bodies were first explored as mockups in `artifacts/mockup-sandbox/.../line-cards/{Bento,Hero,Segmented}.tsx`; bento was graduated first, then user asked for all 3 as a runtime switcher.
- Bento specifics: eyebrow `MAIN MENU` + greeting + tagline, category labels (即時工具/創作作品) each with 2-col tinted tiles; 音樂欣賞 is a full-width `feature` tile. Tiles use each service's own `accent`/`bg`; icon chip bg is translucent white `#FFFFFF80`.
- **Verify all menu variants at once:** bundle `router.ts` with esbuild (from inside `artifacts/api-server`), import the bundle, call `mainMenu()` for each style/tab combo, and walk the flex tree asserting no empty `text` nodes / malformed boxes and JSON byte size < LINE's 10KB limit.
- **LINE Flex `backgroundColor` accepts 8-digit `#RRGGBBAA` alpha hex** (e.g. `#FFFFFF80` for 50% white) — used for the tile icon chips. Not just 6-digit.
- `stock.ts`: eyebrow + source caption; index hero = label + big dark number + right-aligned colored change block; per-stock rows with dark price + colored change block, hairline-separated; `更新 …` caption; subtleLink footer. **Universe = ~50 台灣50-style large caps + ~6 popular ETFs, grouped into `SECTORS` (半導體/電子・網通/金融/傳產・航運/熱門 ETF). Carousel is layout-hybrid: page 1 = LIVE 快報 (only `INDEX` + ~6 `HEADLINES` fetched), pages 2..N = tappable `directoryBubble`s (`pickRow`, NO live fetch).** **Data source is a separate user-chosen hybrid (see portfolio-bot-live-data.md): 個股 from owner's site, 大盤+ETF from Yahoo.** **Why layout-hybrid:** live-fetching all 50 on every menu open is slow / rate-limited, so the browse list defers pricing to on-tap `stockTrend`. `resolveStock`/`stockTrend` resolve names/codes from flattened `ALL` (plus `INDEX`); `resolveStock` accepts ANY 4–6 digit code (auto `.TW`), BUT 個股 reachability is now limited to codes the owner's site tracks — uncovered codes render a 資料不可用 card (NO Yahoo fallback for 個股). Card hint 打代號可查任何股票 is mostly true across the site's TW universe.
- **LINE flex hard limits that bit us:** a single `bubble` must stay under ~10KB of JSON — 13 quote rows in one bubble hit ~13.4KB and would 400. Fix = carousel (each bubble self-contained, own footer; total carousel ≤50KB / ≤12 bubbles). Quick-reply is capped at 13 items (`quickReply()` in flex.ts also slices to 13) — `pickChips()` drops the index to stay within it. Always re-measure per-bubble byte size after adding rows.
- `weather.ts`: eyebrow + `今日海況` row with a `verdictBadge` pill (適合下水/建議斟酌/不建議下水); metric rows = label + dark value + colored `dot`; slate-50 reason box (verdict-based) when normal, red banner when offshore-west; subtleLink footer.

## Hero image URL gotcha (still relevant if a hero is ever re-added)
**Why:** the site is hosted at TWO similar domains and only one serves the OG image.
- `https://donttalk.vercel.app/og-default.png` (two-t) → 200 image/png. USE THIS.
- `https://dontalk.vercel.app/og-default.png` (one-t) → 404.

## Verifying flex without publishing
Bot changes only go live after the user PUBLISHES. To verify flex JSON locally, bundle the service files with esbuild's JS API and import the data-URI under node — `tsx` is NOT installed, and `esbuild` must be resolved from `artifacts/api-server/node_modules` (run the script from inside that dir, not `/tmp`). Walk the tree asserting no empty `text` nodes. Typecheck with `pnpm --filter @workspace/api-server run typecheck`.
