---
name: Portfolio bot live-data sourcing
description: Why the LINE bot fetches upstream public APIs directly instead of scraping the owner's portfolio site
---

# Live data for 股票 / 風浪 replies

**Decision:** The bot fetches live stock and wave data from **upstream public APIs directly** (Open-Meteo marine+forecast for waves, Yahoo Finance chart API for TW stocks), NOT by scraping the owner's site `donttalk.vercel.app`.

**Why:**
- `donttalk.vercel.app` is a static shell (Astro, no `__NEXT_DATA__`) whose dynamic data comes from its own `/api/*` backend, which has been observed **down** ("後端服務維護中 — /api/* 請求會失敗"). Scraping it would break whenever their backend is down.
- The site itself just aggregates the same public sources: the /diving page uses 中央氣象署 marine (station MID `46694A`, 龍洞) + Windguru; /stock is a 台股均線買賣訊號 tool. So going to the upstream sources is both more robust and equivalent.

**How to apply:** If asked to add/adjust the bot's live data, prefer the upstream public API over the owner's site. Yahoo chart endpoint `query1.finance.yahoo.com/v8/finance/chart/<sym>` works for TW tickers (`2330.TW`, index `^TWII`) with a `User-Agent` header and needs no key. Open-Meteo needs no key.

**Domain conventions baked into the code:**
- Taiwan stock color convention: **紅=漲, 綠=跌** (opposite of US). Keep it.
- 龍洞 faces east, so **offshore wind ≈ 西風** and is a drowning risk → forced NO-GO in the diving verdict. Don't downgrade it to a mere warning.

## 音樂 / MV replies — the ONE exception (scrape the owner's page)

Unlike stock/wave, the MV list has no upstream API — it lives only on the owner's own page. `music.ts` fetches `https://donttalk.vercel.app/music` (canonical **two-t** `donttalk`; one-t `dontalk` 404s) and parses the JSON embedded in `<script type="application/json" id="music-tracks">` (array of ~33 tracks: `name`, `style`/`style_label`, `duration`, `album`, `mv.{local,cdn}`, `cover.{local,cdn}`). Cached 10 min in-memory.

**Gotcha — cover images are all broken:** both `cover.cdn` (hailuoai CDN) and `cover.local` (`/music/covers/*.png` on the site) return **404**. Only `mv.cdn` mp4s work (video/mp4, range-enabled, ~40-50MB each). So MV cards deliberately have **NO hero image** — clean Refined text cards with a `▶ 觀看 MV` subtleLink whose uri is `mv.cdn` (opens the video). If they ever fix covers, re-check both URLs return image/* before adding a hero. Don't inline `type:"video"` heros — no valid previewUrl exists and the files are large.
