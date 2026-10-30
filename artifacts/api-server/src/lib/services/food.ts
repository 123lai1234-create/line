import { dot, pill, type LineMessage } from "./flex";

// ════════════════════════════════════════════════════════════════════════
// 惜食特價 — 超商即期品(惜食)折扣時段
// ────────────────────────────────────────────────────────────────────────
// 四大超商的惜食方案(折扣時段 + 折扣率):
//   7-11   i珍食     10:00-17:00 65折 / 19:00-19:59 8折 / 20:00-隔日03:00 65折
//   全家   友善食光   17:00-24:00 7折
//   萊爾富 惜福食堂   到期前 6 小時內 7 折(依門市標籤,無固定時段)
//   OK超商 午後6折    16:30-23:00 6折
//
// 時段是各超商常態公告的時段 → 寫成常數(不爬站)。要改就只改這張表。
//
// 時間一律用 Asia/Taipei 算(容器 TZ 不一定對)。
// 跨日時段(20:00 → 03:00)用 start > end 表示。

const TPE = "Asia/Taipei";

// Intl.DateTimeFormat 建一次要載 ICU 時區資料(~80ms),不要每次呼叫都重建。
const TPE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: TPE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface DiscountWindow {
  /** 從 00:00 起算的分鐘數 */
  start: number;
  /** 從 00:00 起算的分鐘數;小於 start 代表跨日 */
  end: number;
  /** 折扣文字,例:"65折" */
  label: string;
}

export interface FoodStore {
  id: string;
  emoji: string;
  /** 例:"7-11・珍食" */
  name: string;
  /** 下方小字:時段 + 折扣 */
  detail: string;
  /** 固定時段;空 = 依標籤(沒有固定時段) */
  windows: DiscountWindow[];
  /** 依標籤型(無固定時段),狀態恆為「依標籤」 */
  tagBased?: boolean;
  /** 品牌色(狀態點) */
  accent: string;
}

const hhmm = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const FOOD_STORES: FoodStore[] = [
  {
    id: "7-11",
    emoji: "🏪",
    name: "7-11・珍食",
    detail: "10:00–17:00 65折 · 19:00–19:59 8折 · 20:00–隔日03:00 65折",
    windows: [
      { start: 10 * 60, end: 17 * 60, label: "65折" },
      { start: 19 * 60, end: 20 * 60, label: "8折" },
      { start: 20 * 60, end: 3 * 60, label: "65折" },
    ],
    accent: "#10B981",
  },
  {
    id: "family",
    emoji: "🏪",
    name: "全家・友善食光",
    detail: "17:00–24:00 7折",
    windows: [{ start: 17 * 60, end: 24 * 60, label: "7折" }],
    accent: "#10B981",
  },
  {
    id: "hi-life",
    emoji: "🏪",
    name: "萊爾富・惜福食堂",
    detail: "到期前 6 小時內 7 折(依門市標籤,無固定時段)",
    windows: [],
    tagBased: true,
    accent: "#F59E0B",
  },
  {
    id: "ok-mart",
    emoji: "🏪",
    name: "OK超商・午後6折",
    detail: "16:30–23:00 6折",
    windows: [{ start: 16 * 60 + 30, end: 23 * 60, label: "6折" }],
    accent: "#10B981",
  },
];

export type FoodState = "active" | "upcoming" | "tag" | "ended";

export interface FoodStatus {
  state: FoodState;
  /** 狀態徽章文字,例:"65折 折扣中" */
  pill: string;
  /** 狀態點顏色 */
  dotColor: string;
  /** 徽章底色 / 字色 */
  pillBg: string;
  pillInk: string;
}

const STATE_STYLE: Record<FoodState, { dotColor: string; pillBg: string; pillInk: string }> = {
  active: { dotColor: "#10B981", pillBg: "#DCFCE7", pillInk: "#15803D" },
  upcoming: { dotColor: "#CBD5E1", pillBg: "#F1F5F9", pillInk: "#64748B" },
  tag: { dotColor: "#F59E0B", pillBg: "#FEF3C7", pillInk: "#B45309" },
  ended: { dotColor: "#CBD5E1", pillBg: "#F1F5F9", pillInk: "#94A3B8" },
};

function inWindow(minutes: number, w: DiscountWindow): boolean {
  if (w.start <= w.end) return minutes >= w.start && minutes < w.end;
  // 跨日:例如 20:00 → 03:00
  return minutes >= w.start || minutes < w.end;
}

/** 這個時段還沒結束(含跨日)。用來算「下一個時段」。 */
function stillOpen(minutes: number, w: DiscountWindow): boolean {
  if (w.start <= w.end) return minutes < w.end;
  return minutes < w.end || minutes >= w.start;
}

export function foodStatus(store: FoodStore, minutes: number): FoodStatus {
  const style = STATE_STYLE[store.tagBased ? "tag" : "ended"];

  if (store.tagBased) {
    return { state: "tag", pill: "依標籤", ...style };
  }

  const hit = store.windows.find((w) => inWindow(minutes, w));
  if (hit) {
    return { state: "active", pill: `${hit.label} 折扣中`, ...STATE_STYLE.active };
  }

  const next = store.windows.find((w) => stillOpen(minutes, w));
  if (next) {
    return { state: "upcoming", pill: "未開始", ...STATE_STYLE.upcoming };
  }

  return { state: "ended", pill: "已結束", ...STATE_STYLE.ended };
}

/** 把時段組成 "10:00–17:00 65折 · 19:00–19:59 8折 · 20:00–隔日03:00 65折" */
export function formatWindows(windows: DiscountWindow[]): string {
  const fmt = (m: number): string => {
    if (m >= 24 * 60) return "24:00";
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return windows
    .map((w) => {
      const end = w.end < w.start ? `隔日${fmt(w.end)}` : fmt(w.end);
      return `${fmt(w.start)}–${end} ${w.label}`;
    })
    .join(" · ");
}

/**
 * 惜食折扣時段一覽(純文字,可直接複製)。
 * 與 foodRescue 卡的差別:卡 = 現況(哪幾家正在折);這張 = 時間表 + 每家一行現況。
 */
export function foodScheduleText(stores: FoodStore[] = FOOD_STORES, date: Date = new Date()): string {
  const { minutes, time } = taipeiClock(date);
  const lines: string[] = ["🕐 惜食折扣時段", `台灣時間 ${time}`, ""];
  stores.forEach((s) => {
    const st = foodStatus(s, minutes);
    lines.push(`${s.emoji} ${s.name}`);
    lines.push(`   ${s.detail}`);
    lines.push(`   現在：${st.pill}`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

/** 現在是台灣時間的幾點(分) + "HH:MM"。 */
export function taipeiClock(date: Date = new Date()): { minutes: number; time: string } {
  const parts = TPE_FORMATTER.formatToParts(date);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "00";
  const h = Number.parseInt(get("hour"), 10) % 24;
  const m = Number.parseInt(get("minute"), 10);
  return { minutes: h * 60 + m, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

function storeRow(store: FoodStore, minutes: number): LineMessage {
  const status = foodStatus(store, minutes);
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    spacing: "md",
    paddingTop: "12px",
    paddingBottom: "12px",
    contents: [
      dot(status.dotColor, "10px"),
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        spacing: "2px",
        contents: [
          { type: "text", text: `${store.emoji} ${store.name}`, size: "sm", weight: "bold", color: "#0F172A" },
          { type: "text", text: store.detail, size: "xxs", color: "#64748B", wrap: true, margin: "2px" },
        ],
      },
      pill(status.pill, status.pillBg, status.pillInk),
    ],
  };
}

export interface FoodRescueMeta {
  /** 幾家是從官方公告即時解析出來的 */
  liveCount?: number;
  /** 資料更新時間 "HH:MM" */
  updatedAt?: string;
}

/**
 * 惜食特價卡 — FOOD RESCUE。
 * 標題下方顯示台灣時間 + 目前有幾家在折扣中,每列一家超商的時段與狀態。
 *
 * stores: 由 food-source.ts 取得(含公告即時值,抓不到時是常態時段)
 */
export function foodRescue(
  stores: FoodStore[] = FOOD_STORES,
  date: Date = new Date(),
  meta: FoodRescueMeta = {},
): LineMessage[] {
  const { minutes, time } = taipeiClock(date);
  const activeCount = stores.filter((s) => foodStatus(s, minutes).state === "active").length;

  const rows: LineMessage[] = [];
  stores.forEach((store, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#E2E8F0" });
    rows.push(storeRow(store, minutes));
  });

  const body: LineMessage[] = [
    { type: "text", text: "FOOD RESCUE", size: "xxs", weight: "bold", color: "#94A3B8" },
    { type: "text", text: "🛒 惜食特價", size: "lg", weight: "bold", color: "#0F172A", margin: "2px" },
    {
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `台灣時間 ${time}・${activeCount} 家折扣進行中`,
          size: "sm",
          color: "#64748B",
          wrap: true,
        },
        dot(activeCount > 0 ? "#10B981" : "#CBD5E1", "8px"),
      ],
    },
    { type: "separator", margin: "sm", color: "#E2E8F0" },
    ...rows,
  ];

  // 資料來源說明(有公告來源時才顯示)
  if (meta.liveCount && meta.liveCount > 0) {
    body.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#F8FAFC",
      cornerRadius: "10px",
      paddingAll: "10px",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: `時段依官方公告更新（更新於 ${meta.updatedAt ?? time}）`,
          size: "xxs",
          color: "#94A3B8",
          align: "center",
          wrap: true,
        },
      ],
    });
  }

  return [
    {
      type: "flex",
      altText: `惜食特價 · 台灣時間 ${time} · ${activeCount} 家折扣進行中`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "16px",
          contents: body,
        },
      },
    },
  ];
}
