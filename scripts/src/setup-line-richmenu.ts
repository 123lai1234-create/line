import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");
const FONT_PATH = join(ASSETS, "jf-openhuninn.ttf");
const FONT_FAMILY = "huninn";

const W = 2500;
const H = 1686;
const TAB_H = 264;
const G = 60;
const COL_W = (W - G * 3) / 2; // 1160
const ROW_H = (H - TAB_H - G * 3) / 2; // 621

const CANVAS_BG = "#F8FAFC";
const CARD_BG = "#FFFFFF";
const HAIRLINE = "#E2E8F0";
const INK = "#0F172A";
const MUTED = "#94A3B8";
const SUB = "#64748B";

const WEBSITE_URL = "https://donttalk.vercel.app/";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA = "https://api-data.line.me/v2/bot";

type IconFn = (ctx: SKRSContext2D, cx: number, cy: number, color: string) => void;

interface Tile {
  title: string;
  subtitle: string;
  accent: string;
  tint: string;
  icon: IconFn;
  action: Record<string, unknown>;
}

interface Tab {
  key: string;
  label: string;
  accent: string;
  alias: string;
  tiles: Tile[];
}

// ── drawing helpers ────────────────────────────────────────────────
function stroke(ctx: SKRSContext2D, width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function fillDot(ctx: SKRSContext2D, x: number, y: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function rrPath(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── icons (drawn around a center, stroked in the tile accent) ──────
const waveIcon: IconFn = (ctx, cx, cy, color) => {
  const w = 150;
  for (const yr of [cy - 38, cy, cy + 38]) {
    let x = cx - w / 2;
    ctx.beginPath();
    ctx.moveTo(x, yr);
    for (let i = 0; i < 4; i++) {
      const dir = i % 2 === 0 ? -24 : 24;
      ctx.quadraticCurveTo(x + 18.75, yr + dir, x + 37.5, yr);
      x += 37.5;
    }
    stroke(ctx, 11, color);
  }
};

// 「回到首頁 / 全部功能」用的房子 icon
const homeIcon: IconFn = (ctx, cx, cy, color) => {
  ctx.beginPath();
  ctx.moveTo(cx - 84, cy - 6);
  ctx.lineTo(cx, cy - 80);
  ctx.lineTo(cx + 84, cy - 6);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(cx - 58, cy - 22);
  ctx.lineTo(cx - 58, cy + 68);
  ctx.lineTo(cx + 58, cy + 68);
  ctx.lineTo(cx + 58, cy - 22);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy + 68);
  ctx.lineTo(cx - 20, cy + 16);
  ctx.lineTo(cx + 20, cy + 16);
  ctx.lineTo(cx + 20, cy + 68);
  stroke(ctx, 11, color);
};

const chartIcon: IconFn = (ctx, cx, cy, color) => {
  const x0 = cx - 78;
  ctx.beginPath();
  ctx.moveTo(x0, cy + 40);
  ctx.lineTo(x0 + 44, cy - 8);
  ctx.lineTo(x0 + 88, cy + 16);
  ctx.lineTo(x0 + 156, cy - 56);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(x0 + 118, cy - 52);
  ctx.lineTo(x0 + 156, cy - 56);
  ctx.lineTo(x0 + 150, cy - 18);
  stroke(ctx, 11, color);
};

const dnaIcon: IconFn = (ctx, cx, cy, color) => {
  const h = 150;
  const top = cy - h / 2;
  const strand = (phase: number): void => {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const y = top + t * h;
      const x = cx + Math.sin(t * Math.PI * 2 + phase) * 46;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    stroke(ctx, 10, color);
  };
  strand(0);
  strand(Math.PI);
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const y = top + t * h;
    const x1 = cx + Math.sin(t * Math.PI * 2) * 46;
    const x2 = cx + Math.sin(t * Math.PI * 2 + Math.PI) * 46;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    stroke(ctx, 8, color);
  }
};

const gridIcon: IconFn = (ctx, cx, cy, color) => {
  const s = 58;
  const o = (s + 20) / 2;
  for (const dx of [-o, o]) {
    for (const dy of [-o, o]) {
      rrPath(ctx, cx + dx - s / 2, cy + dy - s / 2, s, s, 12);
      stroke(ctx, 10, color);
    }
  }
};

const musicIcon: IconFn = (ctx, cx, cy, color) => {
  const bx = cx - 48;
  ctx.beginPath();
  ctx.moveTo(bx, cy + 36);
  ctx.lineTo(bx, cy - 64);
  ctx.lineTo(bx + 104, cy - 92);
  ctx.lineTo(bx + 104, cy + 4);
  stroke(ctx, 11, color);
  fillDot(ctx, bx, cy + 36, 22, color);
  fillDot(ctx, bx + 104, cy + 4, 22, color);
};

const projectIcon: IconFn = (ctx, cx, cy, color) => {
  const pts: [number, number][] = [
    [cx, cy - 60],
    [cx - 60, cy - 8],
    [cx + 60, cy - 8],
    [cx - 34, cy + 52],
    [cx + 34, cy + 52],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 4],
  ];
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(pts[a][0], pts[a][1]);
    ctx.lineTo(pts[b][0], pts[b][1]);
    stroke(ctx, 8, color);
  }
  for (const [x, y] of pts) fillDot(ctx, x, y, 18, color);
};

const personIcon: IconFn = (ctx, cx, cy, color) => {
  ctx.beginPath();
  ctx.arc(cx, cy - 34, 34, 0, Math.PI * 2);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.arc(cx, cy + 96, 72, Math.PI * 1.18, Math.PI * 1.82, false);
  stroke(ctx, 11, color);
};

const globeIcon: IconFn = (ctx, cx, cy, color) => {
  const r = 66;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  stroke(ctx, 8, color);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.42, r, 0, 0, Math.PI * 2);
  stroke(ctx, 8, color);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2);
  stroke(ctx, 8, color);
};

// 惜食特價:購物袋(折扣/即期品)
const bagIcon: IconFn = (ctx, cx, cy, color) => {
  // 提把(上半圓)
  ctx.beginPath();
  ctx.arc(cx, cy - 28, 40, Math.PI, Math.PI * 2);
  stroke(ctx, 11, color);
  // 袋身(上寬下窄的梯形)
  ctx.beginPath();
  ctx.moveTo(cx - 78, cy - 14);
  ctx.lineTo(cx - 62, cy + 80);
  ctx.lineTo(cx + 62, cy + 80);
  ctx.lineTo(cx + 78, cy - 14);
  ctx.closePath();
  stroke(ctx, 11, color);
};

// 折扣時段:時鐘
const clockIcon: IconFn = (ctx, cx, cy, color) => {
  ctx.beginPath();
  ctx.arc(cx, cy, 74, 0, Math.PI * 2);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - 46);
  stroke(ctx, 11, color);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 36, cy + 20);
  stroke(ctx, 11, color);
};

// ── tabs & tiles ───────────────────────────────────────────────────
const TABS: Tab[] = [
  {
    key: "news",
    label: "即時資訊",
    accent: "#0EA5E9",
    alias: "bot-news",
    tiles: [
      { title: "潛水海況", subtitle: "6 大潛點 · 未來 5 天浪高風速", accent: "#0EA5E9", tint: "#E0F2FE", icon: waveIcon, action: { type: "message", text: "潛水海況" } },
      { title: "台股快訊", subtitle: "大盤 + 熱門股即時報價", accent: "#DC2626", tint: "#FEE2E2", icon: chartIcon, action: { type: "postback", data: "s=stk", displayText: "看台股快訊" } },
      { title: "個股查詢", subtitle: "輸入名稱或代號看走勢圖", accent: "#7C3AED", tint: "#EDE9FE", icon: gridIcon, action: { type: "message", text: "個股查詢" } },
      { title: "音樂欣賞", subtitle: "創作 MV 精選輪播", accent: "#DB2777", tint: "#FCE7F3", icon: musicIcon, action: { type: "message", text: "音樂欣賞" } },
    ],
  },
  {
    key: "food",
    label: "惜食特價",
    accent: "#16A34A",
    alias: "bot-food",
    tiles: [
      { title: "惜食特價", subtitle: "即時折扣 · 4 大超商", accent: "#16A34A", tint: "#DCFCE7", icon: bagIcon, action: { type: "message", text: "惜食特價" } },
      { title: "折扣時段", subtitle: "今日各時段一覽", accent: "#0EA5E9", tint: "#E0F2FE", icon: clockIcon, action: { type: "message", text: "惜食時段" } },
      { title: "服務選單", subtitle: "展開全部功能與細節", accent: "#0F172A", tint: "#E2E8F0", icon: gridIcon, action: { type: "message", text: "選單" } },
      { title: "回到首頁", subtitle: "切回第 1 頁即時資訊", accent: "#D97706", tint: "#FEF3C7", icon: homeIcon, action: { type: "richmenuswitch", richMenuAliasId: "bot-news", data: "switch=news" } },
    ],
  },
  {
    key: "projects",
    label: "AI 專案",
    accent: "#7C3AED",
    alias: "bot-projects",
    tiles: [
      { title: "蛋白質設計", subtitle: "AI 流程導覽 + 序列分析", accent: "#059669", tint: "#D1FAE5", icon: dnaIcon, action: { type: "message", text: "蛋白質設計" } },
      { title: "專案介紹", subtitle: "生醫 AI · 量化研究作品", accent: "#D97706", tint: "#FEF3C7", icon: projectIcon, action: { type: "message", text: "專案介紹" } },
      { title: "完整選單", subtitle: "展開全部功能與細節", accent: "#0F172A", tint: "#E2E8F0", icon: gridIcon, action: { type: "message", text: "選單" } },
      { title: "個人網站", subtitle: "donttalk.vercel.app", accent: "#2563EB", tint: "#DBEAFE", icon: globeIcon, action: { type: "uri", uri: WEBSITE_URL } },
    ],
  },
  {
    key: "about",
    label: "關於不說",
    accent: "#D97706",
    alias: "bot-about",
    tiles: [
      { title: "關於我", subtitle: "創作者介紹與理念", accent: "#D97706", tint: "#FEF3C7", icon: personIcon, action: { type: "message", text: "關於我" } },
      { title: "服務總覽", subtitle: "一次看完所有功能", accent: "#0EA5E9", tint: "#E0F2FE", icon: gridIcon, action: { type: "postback", data: "s=menu&style=bento", displayText: "打開服務選單" } },
      { title: "回到首頁", subtitle: "切回第 1 頁即時資訊", accent: "#0F172A", tint: "#E2E8F0", icon: homeIcon, action: { type: "richmenuswitch", richMenuAliasId: "bot-news", data: "switch=news" } },
      { title: "官方網站", subtitle: "完整作品集都在這", accent: "#2563EB", tint: "#DBEAFE", icon: globeIcon, action: { type: "uri", uri: WEBSITE_URL } },
    ],
  },
];

// 卡片從畫面最上方開始排；tab bar 固定在**底部**(thumb reach,也跟截圖一致)
const CELL_XY: [number, number][] = [
  [G, G],
  [G + COL_W + G, G],
  [G, G + ROW_H + G],
  [G + COL_W + G, G + ROW_H + G],
];

// ── rendering ──────────────────────────────────────────────────────
// hex → rgba(r,g,b,a),漸層背景要帶透明度
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 底部 tab bar:3 格,選中格是 accent 膠囊 + 頁碼指示(1/3)。 */
function renderTabBar(ctx: SKRSContext2D, activeIndex: number): void {
  const top = H - TAB_H;

  // bar 本體 + 上緣陰影,讓它有「浮在內容上」的感覺
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.10)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = -10;
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, top, W, TAB_H);
  ctx.restore();

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, top + 1);
  ctx.lineTo(W, top + 1);
  ctx.stroke();

  const segW = W / TABS.length;

  // 分隔線只在非選中區之間畫,選中區被膠囊蓋住
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  for (let i = 1; i < TABS.length; i++) {
    ctx.beginPath();
    ctx.moveTo(i * segW, top + 52);
    ctx.lineTo(i * segW, top + TAB_H - 52);
    ctx.stroke();
  }

  TABS.forEach((tab, i) => {
    const cx = i * segW + segW / 2;
    const on = i === activeIndex;

    if (on) {
      const pw = segW - 120;
      rrPath(ctx, cx - pw / 2, top + 30, pw, TAB_H - 100, 44);
      ctx.fillStyle = withAlpha(tab.accent, 0.12);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 74px ${FONT_FAMILY}`;
    ctx.fillStyle = on ? INK : MUTED;
    ctx.fillText(tab.label, cx, top + TAB_H / 2 - 34);

    // 頁碼指示:選中頁才顯示,讓人知道還有幾頁
    if (on) {
      ctx.font = `bold 34px ${FONT_FAMILY}`;
      ctx.fillStyle = tab.accent;
      ctx.fillText(`${i + 1}/${TABS.length}`, cx, top + TAB_H / 2 + 44);
    }
  });
}

function renderCard(ctx: SKRSContext2D, px: number, py: number, t: Tile): void {
  // 陰影
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 12;
  rrPath(ctx, px, py, COL_W, ROW_H, 36);
  ctx.fillStyle = CARD_BG;
  ctx.fill();
  ctx.restore();

  rrPath(ctx, px, py, COL_W, ROW_H, 36);
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 頂端一條 accent 細線,當成卡片的主色識別
  rrPath(ctx, px + 36, py, COL_W - 72, 10, 5);
  ctx.fillStyle = t.accent;
  ctx.fill();

  const chip = 168;
  const chipX = px + 74;
  const chipY = py + 76;
  rrPath(ctx, chipX, chipY, chip, chip, 40);
  ctx.fillStyle = t.tint;
  ctx.fill();
  t.icon(ctx, chipX + chip / 2, chipY + chip / 2, t.accent);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `bold 88px ${FONT_FAMILY}`;
  ctx.fillText(t.title, px + 74, py + ROW_H - 128);
  ctx.fillStyle = SUB;
  ctx.font = `46px ${FONT_FAMILY}`;
  ctx.fillText(t.subtitle, px + 74, py + ROW_H - 60);
}

function renderTab(activeIndex: number): Buffer {
  GlobalFonts.register(readFileSync(FONT_PATH), FONT_FAMILY);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const accent = TABS[activeIndex].accent;

  // 由 accent 淡出的垂直漸層,比純色背景有層次
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, withAlpha(accent, 0.16));
  grad.addColorStop(0.42, withAlpha(accent, 0.04));
  grad.addColorStop(1, CANVAS_BG);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  TABS[activeIndex].tiles.forEach((t, i) => {
    const [px, py] = CELL_XY[i];
    renderCard(ctx, px, py, t);
  });
  renderTabBar(ctx, activeIndex);
  return canvas.toBuffer("image/png");
}

// ── LINE publishing ────────────────────────────────────────────────
interface Area {
  bounds: { x: number; y: number; width: number; height: number };
  action: Record<string, unknown>;
}

function areasFor(activeIndex: number): Area[] {
  const segW = W / TABS.length;
  const barTop = H - TAB_H;
  const areas: Area[] = TABS.map((tab, i) => ({
    bounds: { x: i * segW, y: barTop, width: segW, height: TAB_H },
    action: { type: "richmenuswitch", richMenuAliasId: tab.alias, data: `switch=${tab.key}` },
  }));
  TABS[activeIndex].tiles.forEach((t, i) => {
    const [x, y] = CELL_XY[i];
    areas.push({ bounds: { x, y, width: COL_W, height: ROW_H }, action: t.action });
  });
  return areas;
}

function token(): string {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return t;
}

// ⚠️ 2026-10-30 改為「增量發布」
// 舊版 applyRichMenus() 會先把 channel 上**所有** rich menu + alias 刪光再重建,
//   等於把別處(手動發布、外部工具)建立的頁一起洗掉 —— 惜食頁就是這樣消失的。
//
// LINE Messaging API **沒有「更新 rich menu」的端點**(POST /v2/bot/richmenu/{id} → 405),
//   所以 areas 一旦要改(例如 tab bar 由 3 格變 4 格)就只能「新建一頁 + 把 alias 改指向」。
//   圖可以重傳(POST /richmenu/{id}/content),alias 也可以改指向(POST /richmenu/alias/{aliasId})。
//
// 刪舊頁安不安全?顯示優先序是 per-user(API 設定) → API 預設頁 → OA Manager 預設頁。
//   這個 bot 從沒用過 per-user 端點,所以使用者看的都是預設頁 → 刪掉舊頁不會開天窗。
//
// 現在的規則:
//   • 別人的頁(沒有我們的 alias)一律不碰、不刪
//   • 我們自己的頁:areas 相同 → 留著、只換圖;areas 不同 → 新建 + alias 改指向,再刪舊頁
interface AliasInfo {
  richMenuAliasId: string;
  richMenuId: string;
}
interface RichMenuInfo {
  richMenuId: string;
  name: string;
  areas?: Area[];
}

function menuName(i: number, tab: Tab): string {
  return `不說助手 ${i + 1}/${TABS.length} - ${tab.label}`;
}

/** 穩定序列化(key 排序):LINE 回傳的 action key 順序跟送出時不一定相同。 */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${k}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** 既有頁的 areas 是否跟這次要發布的一樣(不一樣就必須重建)。 */
function sameAreas(current: Area[] | undefined, desired: Area[]): boolean {
  if (!current || current.length !== desired.length) return false;
  return stable(current) === stable(desired);
}

async function apiGet<T>(path: string, auth: Record<string, string>): Promise<T> {
  const res = await fetch(`${LINE_API}${path}`, { headers: auth });
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function apiSend(path: string, auth: Record<string, string>, init: RequestInit): Promise<Response> {
  const res = await fetch(`${LINE_API}${path}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} failed ${res.status}: ${await res.text()}`);
  return res;
}

async function uploadContent(auth: Record<string, string>, richMenuId: string, png: Buffer): Promise<void> {
  const res = await fetch(`${LINE_DATA}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "image/png" },
    body: new Uint8Array(png),
  });
  if (!res.ok) throw new Error(`upload content ${richMenuId} failed ${res.status}: ${await res.text()}`);
}

async function publishRichMenus(images: Buffer[]): Promise<void> {
  if (images.length !== TABS.length) throw new Error(`expected ${TABS.length} images, got ${images.length}`);
  const auth = { Authorization: `Bearer ${token()}` };
  /** PLAN_ONLY=1 → 只查不改,印出發布計畫 */
  const planOnly = process.env.PLAN_ONLY === "1";

  const aliasList = await apiGet<{ aliases?: AliasInfo[] }>("/richmenu/alias/list", auth);
  const aliasToId = new Map((aliasList.aliases ?? []).map((a) => [a.richMenuAliasId, a.richMenuId]));

  const ids: string[] = [];
  const replaced: string[] = [];

  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    const desired = areasFor(i);
    const existing = aliasToId.get(tab.alias);

    // 既有頁的 areas 已經一樣 → 留著(richMenuId 不變),只把圖換成最新版本
    if (existing) {
      const info = await apiGet<RichMenuInfo>(`/richmenu/${existing}`, auth);
      if (sameAreas(info.areas, desired)) {
        ids.push(existing);
        console.log(`[keep]    ${tab.label} → ${existing} (areas 相同,只換圖)`);
        if (!planOnly) await uploadContent(auth, existing, images[i]);
        continue;
      }
    }

    if (planOnly) {
      console.log(`[replace] ${tab.label} → 新建一頁(alias ${tab.alias},舊頁 ${existing ?? "無"} 的 areas 與新版不同)`);
      replaced.push(existing ?? "");
      ids.push("<new>");
      continue;
    }

    // areas 不同(或頁不存在)→ 只能新建:LINE 沒有更新 rich menu 的端點
    const res = await apiSend("/richmenu", auth, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        size: { width: W, height: H },
        // ⚠️ LINE 強制要求 `selected` 欄位,不給會回 400
        // {"message":"must be specified","property":"selected"}
        selected: false,
        name: menuName(i, tab),
        chatBarText: "開啟服務選單",
        areas: desired,
      }),
    });
    const { richMenuId } = (await res.json()) as { richMenuId: string };
    await uploadContent(auth, richMenuId, images[i]);

    if (existing) {
      // alias 保留同一個 id,改指向新頁(使用者端 richmenuswitch 不用改)
      await apiSend(`/richmenu/alias/${tab.alias}`, auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ richMenuId }),
      });
      replaced.push(existing);
      console.log(`[replace] ${tab.label} → ${richMenuId} (alias ${tab.alias} 已改指向,舊頁 ${existing})`);
    } else {
      await apiSend("/richmenu/alias", auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ richMenuAliasId: tab.alias, richMenuId }),
      });
      console.log(`[new]     ${tab.label} → ${richMenuId} (alias ${tab.alias} 已建立)`);
    }
    ids.push(richMenuId);
  }

  if (planOnly) {
    console.log(`[plan]    預設頁會設為第 1 頁(${TABS[0].label})`);
    if (replaced.length) console.log(`[plan]    發布後會刪掉被取代的舊頁:${replaced.filter(Boolean).join(", ")}`);
    return;
  }

  // 預設頁 = 第 1 頁(使用者端看到的入口)
  await apiSend(`/user/all/richmenu/${ids[0]}`, auth, { method: "POST" });
  console.log(`Default rich menu → ${TABS[0].label} (${ids[0]}) ✅`);

  // 清理:只刪「我們自己換下來」的舊頁;別人(外部發布)的頁一律不碰
  for (const old of replaced) {
    await apiSend(`/richmenu/${old}`, auth, { method: "DELETE" });
    console.log(`[cleanup] 舊頁 ${old} 已刪除`);
  }
}

async function main(): Promise<void> {
  const images = TABS.map((_, i) => renderTab(i));
  TABS.forEach((tab, i) => {
    const p = join(ASSETS, `richmenu-${tab.key}.png`);
    writeFileSync(p, images[i]);
    console.log(`Rendered ${p} (${(images[i].length / 1024).toFixed(0)} KB)`);
  });

  if (process.env.APPLY === "1") {
    await publishRichMenus(images);
  } else {
    console.log("Preview only. Set APPLY=1 to publish the rich menu to LINE.");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
