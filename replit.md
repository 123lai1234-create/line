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
- `artifacts/api-server/src/lib/services/` — real-time chatbot services: `weather.ts` (Open-Meteo marine+wind for 龍洞/東北角 → GO/CAUTION/NO-GO verdict from the diving page's own thresholds; offshore-west wind forces NO-GO), `stock.ts` (Yahoo Finance chart API live quotes for 5 representative TW tickers: ^TWII/2330/2317/2454/0050, Taiwan 紅漲綠跌 colors), `music.ts` (iTunes Search carousel), `projects.ts` (portfolio project cards, still a link card), `flex.ts` (LINE message/flex builders), `router.ts` (keyword routing + simple main menu; weather/stock replies show live data inline, no more "前往網站" cards)
- `scripts/src/setup-line-richmenu.ts` — renders the 2x2 rich menu PNG (`@napi-rs/canvas`, jf-openhuninn font) and publishes it to LINE; run `pnpm --filter @workspace/scripts run setup-line-richmenu` (preview) or prefix `APPLY=1` to publish
- `artifacts/api-server/src/lib/auth.ts` — stateless signed-cookie session auth for the admin panel
- `artifacts/api-server/src/routes/line-webhook.ts` — LINE webhook handler (`POST /api/line/webhook`); routes text `message` events through `routeMessage` (keyword/rich-menu services) and sends the main menu on `follow`
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

## Gotchas

- After adding/rotating `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `ADMIN_PASSWORD` / `SESSION_SECRET`, restart the `api-server` workflow — it only reads them at process start.
- The LINE Developers Console webhook URL must be set to `https://<your-domain>/api/line/webhook` and "Use webhook" must be enabled for the bot to respond to messages.
- Testing the login flow end-to-end with a Playwright test subagent isn't possible without exposing `ADMIN_PASSWORD` to it — verify auth-gated flows via direct `curl` calls (referencing `$ADMIN_PASSWORD` as a shell variable, never printed) instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
