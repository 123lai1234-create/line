import { fetchWithTimeout } from "./flex";
import { FOOD_STORES, formatWindows, taipeiClock, type DiscountWindow, type FoodStore } from "./food";

// ════════════════════════════════════════════════════════════════════════
// 惜食特價 — 折扣時段來源(爬各超商官方公告)
// ────────────────────────────────────────────────────────────────────────
// 每家超商可以掛一個「公告來源」;抓得到就用公告的時段,抓不到就用常態時段
// (FOOD_STORES 裡的常數)。**任何一家失敗都不會讓整張卡壞掉。**
//
// 目前各家的可爬程度(2026-10 實測):
//   全家   友善食光  ✅ https://nevent.family.com.tw/cherishfood/ 純文字
//   7-11   i珍食     ❌ 官方頁的時段是圖片(kv-min.png / c1.png / c2.png),沒有文字
//   萊爾富 惜福食堂   ❌ 官網是 SPA,內容走 /webapi/api + anti-forgery token
//   OK超商 午後6折   ❌ 促銷快報頁沒有惜食時段文字(圖片/APP)
//
// → 抓到就更新,抓不到就顯示常態時段;卡片底部會標示有幾家是依官方公告。
// ════════════════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 30 * 60 * 1000;
/** 一家都沒抓到時的短快取(官網可能只是暫時掛掉) */
const FAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

export interface StoreSource {
  id: string;
  url: string;
  /** 從公告頁純文字解析出時段;回 null 代表這次抓不到 → 用常態時段 */
  parse: (text: string) => { windows: DiscountWindow[] } | null;
}

const toMinutes = (hh: number, mm: number): number => hh * 60 + mm;

/** 抓「17:00」「17：00」「24:00」這種時間 → 從 00:00 起的分鐘數 */
function parseClock(s: string): number | null {
  const m = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (!m) return null;
  const hh = Number.parseInt(m[1], 10);
  const mm = Number.parseInt(m[2], 10);
  if (hh > 24 || mm > 59) return null;
  return toMinutes(hh, mm);
}

/** HTML → 純文字(留中文,方便 regex) */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{2,}/g, "\n");
}

// ── 全家「友善食光」公告 ───────────────────────────────────────────────
// 公告原文:
//   「有效期限於當日24時到期之鮮食商品，自17：00起，享7折優惠」
//   「(部分鮮食商品有效期限為當日17:00，該商品則於10:00起適用友善食光優惠)」
// → 主時段 17:00–24:00,另有 10:00 起的一批(17:00 到期)商品也適用
const FAMILY_SOURCE: StoreSource = {
  id: "family",
  url: "https://nevent.family.com.tw/cherishfood/",
  parse: (text) => {
    const discount = text.match(/享\s*(\d{1,2})\s*折\s*優惠/)?.[1];
    const main = text.match(/自\s*(\d{1,2}\s*[:：]\s*\d{2})\s*起/);
    if (!discount || !main) return null;

    const label = `${discount}折`;
    const start = parseClock(main[1]);
    if (start === null) return null;

    const windows: DiscountWindow[] = [{ start, end: 24 * 60, label }];

    // 補充時段:「…則於10:00起適用友善食光優惠」
    const extra = text.match(/(\d{1,2}\s*[:：]\s*\d{2})\s*起適用/);
    if (extra) {
      const extraStart = parseClock(extra[1]);
      if (extraStart !== null && extraStart < start) {
        windows.unshift({ start: extraStart, end: start, label });
      }
    }
    return { windows };
  },
};

const SOURCES: StoreSource[] = [FAMILY_SOURCE];

export interface FoodSchedule {
  stores: FoodStore[];
  /** 有幾家是從官方公告即時解析出來的 */
  liveCount: number;
  /** 本次資料的更新時間(分鐘數 + HH:MM) */
  updatedAt: { minutes: number; time: string };
}

let cache: { at: number; data: FoodSchedule } | null = null;
let inflight: Promise<FoodSchedule> | null = null;

/** 抓一家的公告頁並解析;失敗回 null → 呼叫端改用常態時段 */
async function fetchSource(src: StoreSource): Promise<{ windows: DiscountWindow[] } | null> {
  try {
    const res = await fetchWithTimeout(
      src.url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "zh-TW,zh;q=0.9",
        },
      },
      FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const text = htmlToText(await res.text());
    return src.parse(text);
  } catch {
    return null;
  }
}

/**
 * 取得四家超商目前的折扣時段。
 * - 30 分鐘快取(避免每次都打超商官網)
 * - 抓不到的店自動退回常態時段
 */
export async function getFoodSchedule(now: Date = new Date()): Promise<FoodSchedule> {
  const ttl = cache && cache.data.liveCount > 0 ? CACHE_TTL_MS : FAIL_CACHE_TTL_MS;
  if (cache && Date.now() - cache.at < ttl) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const results = await Promise.all(SOURCES.map((s) => fetchSource(s)));
    const byId = new Map<string, { windows: DiscountWindow[] }>();
    SOURCES.forEach((s, i) => {
      const r = results[i];
      if (r && r.windows.length) byId.set(s.id, r);
    });

    const stores = FOOD_STORES.map((store) => {
      const live = byId.get(store.id);
      if (!live) return store;
      const windows = live.windows;
      return {
        ...store,
        windows,
        detail: store.tagBased ? store.detail : formatWindows(windows),
      };
    });

    const { minutes, time } = taipeiClock(now);
    const data: FoodSchedule = {
      stores,
      liveCount: byId.size,
      updatedAt: { minutes, time },
    };
    // 全部都沒抓到時不要把失敗結果Cache住 30 分鐘 —— 短一點,下次快點重試。
    cache = { at: Date.now(), data };
    inflight = null;
    return data;
  })();

  return inflight;
}
