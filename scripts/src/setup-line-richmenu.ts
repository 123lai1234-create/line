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
const TAB_H = 250;
const G = 60;
const COL_W = (W - G * 3) / 2; // 1160
const ROW_H = (H - TAB_H - G * 3) / 2; // 628

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
    key: "tools",
    label: "即時工具",
    accent: "#0EA5E9",
    alias: "portfolio-tools",
    tiles: [
      { title: "潛水海況", subtitle: "6 大潛點 · 未來 5 天浪高風速", accent: "#0EA5E9", tint: "#E0F2FE", icon: waveIcon, action: { type: "message", text: "潛水海況" } },
      { title: "股票走勢", subtitle: "台股即時報價 · 走勢圖", accent: "#DC2626", tint: "#FEE2E2", icon: chartIcon, action: { type: "message", text: "股票走勢" } },
      { title: "蛋白質設計", subtitle: "AI 流程導覽 + 序列分析", accent: "#059669", tint: "#D1FAE5", icon: dnaIcon, action: { type: "message", text: "蛋白質設計" } },
      { title: "完整選單", subtitle: "展開全部功能與細節", accent: "#0F172A", tint: "#E2E8F0", icon: gridIcon, action: { type: "message", text: "選單" } },
    ],
  },
  {
    key: "creations",
    label: "創作作品",
    accent: "#7C3AED",
    alias: "portfolio-creations",
    tiles: [
      { title: "音樂欣賞", subtitle: "創作 MV 精選輪播", accent: "#7C3AED", tint: "#EDE9FE", icon: musicIcon, action: { type: "message", text: "音樂欣賞" } },
      { title: "專案介紹", subtitle: "生醫 AI・量化研究作品", accent: "#D97706", tint: "#FEF3C7", icon: projectIcon, action: { type: "message", text: "專案介紹" } },
      { title: "關於我", subtitle: "創作者介紹", accent: "#0EA5E9", tint: "#E0F2FE", icon: personIcon, action: { type: "message", text: "關於我" } },
      { title: "個人網站", subtitle: "donttalk.vercel.app", accent: "#0F172A", tint: "#E2E8F0", icon: globeIcon, action: { type: "uri", uri: WEBSITE_URL } },
    ],
  },
];

const CELL_XY: [number, number][] = [
  [G, TAB_H + G],
  [G + COL_W + G, TAB_H + G],
  [G, TAB_H + G + ROW_H + G],
  [G + COL_W + G, TAB_H + G + ROW_H + G],
];

// ── rendering ──────────────────────────────────────────────────────
function renderTabBar(ctx: SKRSContext2D, activeIndex: number): void {
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, W, TAB_H);
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, TAB_H - 1);
  ctx.lineTo(W, TAB_H - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, 44);
  ctx.lineTo(W / 2, TAB_H - 44);
  ctx.stroke();

  TABS.forEach((tab, i) => {
    const cx = i * (W / 2) + W / 4;
    const on = i === activeIndex;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 76px ${FONT_FAMILY}`;
    ctx.fillStyle = on ? INK : MUTED;
    ctx.fillText(tab.label, cx, TAB_H / 2 - 6);
    if (on) {
      const uw = 200;
      rrPath(ctx, cx - uw / 2, TAB_H - 26, uw, 10, 5);
      ctx.fillStyle = tab.accent;
      ctx.fill();
    }
  });
}

function renderCard(ctx: SKRSContext2D, px: number, py: number, t: Tile): void {
  rrPath(ctx, px, py, COL_W, ROW_H, 28);
  ctx.fillStyle = CARD_BG;
  ctx.fill();
  rrPath(ctx, px, py, COL_W, ROW_H, 28);
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const chip = 150;
  const chipX = px + 70;
  const chipY = py + 70;
  rrPath(ctx, chipX, chipY, chip, chip, 32);
  ctx.fillStyle = t.tint;
  ctx.fill();
  t.icon(ctx, chipX + chip / 2, chipY + chip / 2, t.accent);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `bold 82px ${FONT_FAMILY}`;
  ctx.fillText(t.title, px + 70, py + ROW_H - 118);
  ctx.fillStyle = SUB;
  ctx.font = `46px ${FONT_FAMILY}`;
  ctx.fillText(t.subtitle, px + 70, py + ROW_H - 52);
}

function renderTab(activeIndex: number): Buffer {
  GlobalFonts.register(readFileSync(FONT_PATH), FONT_FAMILY);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, W, H);
  renderTabBar(ctx, activeIndex);
  TABS[activeIndex].tiles.forEach((t, i) => {
    const [px, py] = CELL_XY[i];
    renderCard(ctx, px, py, t);
  });
  return canvas.toBuffer("image/png");
}

// ── LINE publishing ────────────────────────────────────────────────
interface Area {
  bounds: { x: number; y: number; width: number; height: number };
  action: Record<string, unknown>;
}

function areasFor(activeIndex: number): Area[] {
  const areas: Area[] = TABS.map((tab, i) => ({
    bounds: { x: i * (W / 2), y: 0, width: W / 2, height: TAB_H },
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
      name: `作品集選單 - ${TABS[i].label}`,
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
