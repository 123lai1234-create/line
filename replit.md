# 作品集 LINE 機器人

一個 LINE 聊天機器人,會自動向任何傳訊息給它的人介紹擁有者的創作與作品集網站(https://donttalk.vercel.app/),並附帶一個私人管理後台,可編輯機器人的介紹內容,以及一鍵推播訊息給所有 LINE 好友。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (backend, port from workflow)
- `pnpm --filter @workspace/line-bot-admin run dev` — run the admin panel frontend (normally started via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres), `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite (artifact `line-bot-admin`)

## Where things live

- `artifacts/api-server/src/lib/line.ts` — LINE Messaging API client (signature verification, reply, `replyMessages` multi-message reply, broadcast, insight/quota reads, rich menu create/upload/set-default helpers)
- `artifacts/api-server/src/lib/services/` — real-time chatbot services (all interactive via LINE postback):
  - `weather.ts` — 6 dive spots (龍洞/北海岸/墾丁/綠島/蘭嶼/小琉球), Open-Meteo daily marine+wind. `weatherEntry()` = location picker card; `weatherFor(locId, dayIndex)` = that spot's GO/CAUTION/NO-GO card + day-chip quick replies (today..+4). Offshore-west forced NO-GO applies ONLY to 龍洞 (`loc.offshoreWest`). `locByKeyword(text)` maps a typed place name straight to its card.
  - `stock.ts` — ~50 台灣50-style large caps + ~6 熱門 ETF, grouped into `SECTORS` (半導體/電子・網通/金融/傳產・航運/熱門 ETF), 紅漲綠跌. **HYBRID data source (user choice):** 個股 price/trend come from the owner's OWN site `GET donttalk.vercel.app/api/stock/<bareCode>` (daily OHLC candles; `fetchSiteCandles` GUARDS against the backend's silent 台積電 fallback by requiring returned `code` === requested, and cache-busts Vercel's edge cache; NO Yahoo fallback for 個股); 大盤指數 (^TWII) + ETF still use Yahoo (`usesYahoo(sym,code)` routes). `stockMenu()` = LIVE 快報 (INDEX+HEADLINES) + tappable directory bubbles (no live fetch); `stockTrend(sym)` renders a flex bar chart + month high/low/period change. `resolveStock(text)` accepts names or 4–6 digit codes.
  - `protein.ts` — `proteinGuide(step)` 5-step walkthrough of the ESM-2 / Bayesian-Opt / ProteinMPNN / REINFORCE pipeline; `proteinAnalyze(seq)` does REAL physicochemical calc (length, MW, GRAVY Kyte-Doolittle, pI via pKa charge bisection, composition bars); `looksLikeProteinSeq` gates raw-sequence detection.
  - `music.ts` (live MV carousel from the site), `projects.ts` (portfolio project link cards).
  - `flex.ts` — LINE message/flex builders + helpers: `pill`, `gaugeBar`, `dot`, `subtleLink`, `pickRow` (tappable postback list row), `barChart` (mini trend chart), and `quickReply` (emits a postback action when a `QuickItem` has `data`, else a message action).
  - `router.ts` — keyword routing + `routePostback(data, ctx)` (parses URLSearchParams `s=wx|stk|pro`); rich "mega" main menu with colored per-service icon chips + descriptions. Keyword ORDER matters — see Gotchas.
- `scripts/src/setup-line-richmenu.ts` — renders the 2x2 rich menu PNG (`@napi-rs/canvas`, jf-openhuninn font) and publishes it to LINE; run `pnpm --filter @workspace/scripts run setup-line-richmenu` (preview) or prefix `APPLY=1` to publish
- `artifacts/api-server/src/lib/auth.ts` — stateless signed-cookie session auth for the admin panel
- `artifacts/api-server/src/routes/line-webhook.ts` — LINE webhook handler (`POST /api/line/webhook`); routes text `message` events through `routeMessage`, `postback` events (card buttons / data-carrying quick reply chips) through `routePostback`, and sends the main menu on `follow`
- `artifacts/api-server/src/routes/{auth,profile,broadcasts,stats}.ts` — admin panel API routes (broadcasts supports text/image/flex-card kinds + scheduled sends)
- `artifacts/api-server/src/lib/broadcast-build.ts` — turns a stored broadcast (kind + fields) into LINE message payload(s)
- `artifacts/api-server/src/lib/scheduler.ts` — polls for due `scheduled` broadcasts every 30s and sends them (atomically claims each row to avoid double-sends); started from `index.ts`
- `lib/db/src/schema/profile.ts` — singleton bot profile row (name, intro message, website URL)
- `lib/db/src/schema/broadcasts.ts` — broadcast history log
- `lib/api-spec/openapi.yaml` — source of truth for the admin panel API contract
- `artifacts/line-bot-admin/` — admin panel frontend (login, dashboard, profile editor, broadcasts)

## Architecture decisions

- Admin panel auth uses a stateless HMAC-signed httpOnly cookie (via `SESSION_SECRET`) instead of DB-backed sessions — there's only one admin, so no user table/session store is needed.
- LINE webhook signature verification requires the raw request body; `express.json({ verify })` in `app.ts` captures it onto `req.rawBody` before parsing.
- Follower count / quota usage stats can legitimately be `null` (LINE's Insight API lags a day and isn't available on all account tiers) — the stats endpoint and UI treat `null` as "not available yet", not an error.
- The LINE webhook route is server-only and intentionally excluded from the OpenAPI spec (it's not consumed by the frontend).

## Product

- Anyone who messages the LINE bot (or adds it as a friend) automatically receives an intro message plus the portfolio website link.
- The owner manages everything from a private admin panel: edit the bot's name/intro message/website URL, view stats (followers, message quota, broadcast count), and send push broadcasts (text, image, or card/flex — sent now or scheduled for later) to all LINE friends with history tracking.

## User preferences

- Admin panel password is user-chosen and stored as the `ADMIN_PASSWORD` secret.
- Auto-publish: after every change, proactively trigger deployment (call `suggest_deploy`) without waiting to be asked — the user still confirms the final publish dialog.

## Gotchas

- After adding/rotating `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `ADMIN_PASSWORD` / `SESSION_SECRET`, restart the `api-server` workflow — it only reads them at process start.
- The LINE Developers Console webhook URL must be set to `https://<your-domain>/api/line/webhook` and "Use webhook" must be enabled for the bot to respond to messages.
- `routeMessage` keyword ORDER is load-bearing: the `^(專案|作品)` project-detail branch must stay ahead of the `蛋白/protein` branch, otherwise the protein card's "看完整報告" CTA (`專案 蛋白質`) gets swallowed by the protein keyword and never reaches the report project. Raw amino-acid sequences are detected with `^[ACDEFGHIKLMNPQRSTVWY]{12,}$`.
- Testing the login flow end-to-end with a Playwright test subagent isn't possible without exposing `ADMIN_PASSWORD` to it — verify auth-gated flows via direct `curl` calls (referencing `$ADMIN_PASSWORD` as a shell variable, never printed) instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
