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

async function applyRichMenus(images: Buffer[]): Promise<void> {
  if (images.length !== TABS.length) throw new Error(`expected ${TABS.length} images, got ${images.length}`);
  const auth = { Authorization: `Bearer ${token()}` };

  const aliasRes = await fetch(`${LINE_API}/richmenu/alias/list`, { headers: auth });
  if (!aliasRes.ok) throw new Error(`alias list failed ${aliasRes.status}: ${await aliasRes.text()}`);
  const { aliases = [] } = (await aliasRes.json()) as { aliases?: { richMenuAliasId: string }[] };
  for (const a of aliases) {
    const del = await fetch(`${LINE_API}/richmenu/alias/${a.richMenuAliasId}`, { method: "DELETE", headers: auth });
    if (!del.ok) throw new Error(`delete alias ${a.richMenuAliasId} failed ${del.status}: ${await del.text()}`);
  }
  console.log(`Deleted ${aliases.length} existing alias(es)`);

  const listRes = await fetch(`${LINE_API}/richmenu/list`, { headers: auth });
  if (!listRes.ok) throw new Error(`richmenu list failed ${listRes.status}: ${await listRes.text()}`);
  const { richmenus = [] } = (await listRes.json()) as { richmenus?: { richMenuId: string }[] };
  for (const rm of richmenus) {
    const del = await fetch(`${LINE_API}/richmenu/${rm.richMenuId}`, { method: "DELETE", headers: auth });
    if (!del.ok) throw new Error(`delete richmenu ${rm.richMenuId} failed ${del.status}: ${await del.text()}`);
  }
  console.log(`Deleted ${richmenus.length} existing rich menu(s)`);

  const ids: string[] = [];
  for (let i = 0; i < TABS.length; i++) {
    const body = {
      size: { width: W, height: H },
      // ⚠️ LINE 現在強制要求 `selected` 欄位,不給會回 400
      // {"message":"must be specified","property":"selected"}
      selected: false,
      name: `不說助手 ${i + 1}/${TABS.length} - ${TABS[i].label}`,
      chatBarText: "開啟服務選單",
      areas: areasFor(i),
    };
    const createRes = await fetch(`${LINE_API}/richmenu`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!createRes.ok) throw new Error(`create ${TABS[i].label} failed ${createRes.status}: ${await createRes.text()}`);
    const { richMenuId } = (await createRes.json()) as { richMenuId: string };
    ids.push(richMenuId);
    console.log(`Created ${TABS[i].label}:`, richMenuId);

    const upRes = await fetch(`${LINE_DATA}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "image/png" },
      body: new Uint8Array(images[i]),
    });
    if (!upRes.ok) throw new Error(`upload ${TABS[i].label} failed ${upRes.status}: ${await upRes.text()}`);
    console.log(`Uploaded ${TABS[i].label} image`);
  }

  for (let i = 0; i < TABS.length; i++) {
    const res = await fetch(`${LINE_API}/richmenu/alias`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ richMenuAliasId: TABS[i].alias, richMenuId: ids[i] }),
    });
    if (!res.ok) throw new Error(`alias ${TABS[i].alias} failed ${res.status}: ${await res.text()}`);
    console.log(`Alias ${TABS[i].alias} → ${ids[i]}`);
  }

  const defRes = await fetch(`${LINE_API}/user/all/richmenu/${ids[0]}`, { method: "POST", headers: auth });
  if (!defRes.ok) throw new Error(`set default failed ${defRes.status}: ${await defRes.text()}`);
  console.log(`Set default rich menu ✅ (${TABS[0].label})`);
}

async function main(): Promise<void> {
  const images = TABS.map((_, i) => renderTab(i));
  TABS.forEach((tab, i) => {
    const p = join(ASSETS, `richmenu-${tab.key}.png`);
    writeFileSync(p, images[i]);
    console.log(`Rendered ${p} (${(images[i].length / 1024).toFixed(0)} KB)`);
  });

  if (process.env.APPLY === "1") {
    await applyRichMenus(images);
  } else {
    console.log("Preview only. Set APPLY=1 to publish the rich menu to LINE.");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
