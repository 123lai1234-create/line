---
name: portfolio-bot LINE interactivity & routing
description: How the LINE bot does interactive multi-step flows (postback protocol), and the keyword-routing order that must be preserved.
---

# LINE postback interactivity

The bot is interactive via LINE **postback** actions, not just message keywords.
- `quickReply()` in `flex.ts` emits a `postback` action when a `QuickItem` has `data` (else a `message` action). `pickRow()` is a tappable list row with a postback action.
- Postback data protocol is a URLSearchParams string with an `s` service key:
  - `s=wx&loc=<id>&d=<dayIndex>` — weather (bare `s=wx` = location picker)
  - `s=stk&sym=<symbol>` — stock trend
  - `s=pro&step=<n>` or `s=pro&act=howto` — protein guide
- `routePostback(data, ctx)` in `router.ts` parses it; `line-webhook.ts` dispatches `event.type === "postback"` → `routePostback`.

**Why:** LINE reply flows need server round-trips to fetch live data per selection; message-text chips can't carry hidden state cleanly. Keep the `s=` protocol stable — chips embedded in already-sent cards reference it.

# Keyword routing order (routeMessage) — do NOT reorder blindly

Order matters and caused a regression once:
1. menu trigger / 關於我
2. **`^(專案|作品)` prefix → project detail/menu** — MUST come before the protein-keyword block, otherwise `專案 蛋白質` (the protein card's "看完整報告" CTA) gets swallowed by `/蛋白/` and never reaches the report project.
3. `looksLikeProteinSeq` (raw AA sequence) → `proteinAnalyze`
4. `/蛋白|protein|mpnn/` → `proteinGuide(1)`
5. weather (locByKeyword direct, else entry picker)
6. stock (resolveStock specific → trend, else overview)
7. music, then generic project block, then fallback

**How to apply:** when adding keywords, put the most specific/explicit intents first. Protein sequence detection uses `^[ACDEFGHIKLMNPQRSTVWY]{12,}$` (len ≥ 12) so normal chat won't false-trigger.

# Verifying flex payloads without tsx

`tsx` is not installed. Bundle a service file with esbuild's API (import from its .pnpm path
`node_modules/.pnpm/esbuild@<ver>/node_modules/esbuild/lib/main.js` via a `file://` URL, run the
script FROM the workspace root), import the bundle as a `data:` module, and walk the output asserting
no `type:"text"` node has an empty/missing `text` (LINE rejects empty text). This exercises live-data
fetches too.
