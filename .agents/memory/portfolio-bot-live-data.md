---
name: Portfolio bot live-data sourcing
description: Why the LINE bot fetches upstream public APIs directly instead of scraping the owner's portfolio site
---

# Live data for 股票 / 風浪 replies

**風浪 (waves):** fetched from **Open-Meteo** marine+forecast directly (no key). The owner's /diving page just aggregates 中央氣象署 marine (station MID `46694A`, 龍洞) + Windguru, so the upstream source is equivalent and more robust.

**股票 (stocks) — user-chosen HYBRID source:**
- **個股 (individual stocks)** → the owner's OWN backend `GET https://donttalk.vercel.app/api/stock/<bareCode>` → `{code,name,candles:[{time,open,high,low,close}]}` (daily OHLC, ~250 candles). Derive quote (last vs prev close) AND trend (closes series) from the SAME candles. Code must be BARE (`2330`, not `2330.TW` → 404).
- **大盤指數 (^TWII/TAIEX) + ETF** → still **Yahoo** chart API `query1.finance.yahoo.com/v8/finance/chart/<sym>` (needs `User-Agent`, no key).
- Routing helper: `usesYahoo(sym,code)` = `sym.startsWith("^") || code==="TAIEX" || ETF_CODES.has(code)`.

**Why:** the user explicitly said "抓我網站的不要抓yahoo", then (via choice) settled on hybrid — 個股 from their site, 大盤+ETF from Yahoo (their backend has no index/ETF). Earlier belief that the backend was permanently down was wrong; it is UP and its `/api/stock/<code>` serves general TW stocks (all 50 台灣50-style codes verified covered), not just its 109-item `/api/stocks` watchlist. `/api/stock_industry` returns `{groups:[{codes,label}]}` if industry grouping is ever needed.

**TWO NON-OBVIOUS HAZARDS with the owner's stock backend (both bit us):**
1. **Silent wrong-stock fallback:** for a code it doesn't track, `/api/stock/<code>` returns **台積電(2330) data with HTTP 200** (NOT 404). GUARD: after fetch, require `String(json.code) === requestedCode`, else treat as 未收錄. Without this you display 台積電 prices under the wrong name.
2. **Vercel edge cache cross-hits:** without a query param, different codes can return each other's cached payload. Always cache-bust: `?cb=${Date.now()}` + `Cache-Control: no-cache`.

**Reachability rule (post-hybrid):** 個股 have **NO Yahoo fallback** — if the site guard/fetch fails, show a 資料不可用 card (honoring "個股只抓我的網站"). So arbitrary typed codes are only reachable if the owner's site tracks them; index/ETF always reachable via Yahoo.

**Domain convention:** Taiwan stock color = **紅漲綠跌** (up `#DC2626`, down `#16A34A`, flat `#94A3B8`) — opposite of US, keep it. 龍洞 faces east so **offshore wind ≈ 西風** = drowning risk → forced NO-GO in the diving verdict (weather, unrelated to stocks); don't downgrade it to a mere warning.

## 音樂 / MV replies — the ONE exception (scrape the owner's page)

Unlike stock/wave, the MV list has no upstream API — it lives only on the owner's own page. `music.ts` fetches `https://donttalk.vercel.app/music` (canonical **two-t** `donttalk`; one-t `dontalk` 404s) and parses the JSON embedded in `<script type="application/json" id="music-tracks">` (array of ~33 tracks: `name`, `style`/`style_label`, `duration`, `album`, `mv.{local,cdn}`, `cover.{local,cdn}`). Cached 10 min in-memory.

**Gotcha — cover images are all broken:** both `cover.cdn` (hailuoai CDN) and `cover.local` (`/music/covers/*.png` on the site) return **404**. Only `mv.cdn` mp4s work (video/mp4, range-enabled, ~40-50MB each). So MV cards deliberately have **NO hero image** — clean Refined text cards with a `▶ 觀看 MV` subtleLink whose uri is `mv.cdn` (opens the video). If they ever fix covers, re-check both URLs return image/* before adding a hero. Don't inline `type:"video"` heros — no valid previewUrl exists and the files are large.
