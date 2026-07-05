import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");
const FONT_PATH = join(ASSETS, "jf-openhuninn.ttf");
const PNG_PATH = join(ASSETS, "richmenu.png");
const FONT_FAMILY = "huninn";

const W = 2500;
const H = 1686;
const HALF_W = W / 2;
const HALF_H = H / 2;
const white = "#FFFFFF";

type IconFn = (ctx: SKRSContext2D, cx: number, cy: number) => void;

interface Panel {
  x: number;
  y: number;
  bg: string;
  title: string;
  subtitle: string;
  action: string;
  icon: IconFn;
}

function stroke(ctx: SKRSContext2D, width: number): void {
  ctx.strokeStyle = white;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function dot(ctx: SKRSContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = white;
  ctx.fill();
}

const waveIcon: IconFn = (ctx, cx, cy) => {
  const w = 192;
  for (const yr of [cy - 40, cy, cy + 40]) {
    let x = cx - w / 2;
    ctx.beginPath();
    ctx.moveTo(x, yr);
    for (let i = 0; i < 4; i++) {
      const dir = i % 2 === 0 ? -30 : 30;
      ctx.quadraticCurveTo(x + 24, yr + dir, x + 48, yr);
      x += 48;
    }
    stroke(ctx, 12);
  }
};

const chartIcon: IconFn = (ctx, cx, cy) => {
  const x0 = cx - 100;
  ctx.beginPath();
  ctx.moveTo(x0, cy + 50);
  ctx.lineTo(x0 + 55, cy - 10);
  ctx.lineTo(x0 + 110, cy + 20);
  ctx.lineTo(x0 + 200, cy - 70);
  stroke(ctx, 12);
  ctx.beginPath();
  ctx.moveTo(x0 + 152, cy - 64);
  ctx.lineTo(x0 + 200, cy - 70);
  ctx.lineTo(x0 + 194, cy - 22);
  stroke(ctx, 12);
};

const musicIcon: IconFn = (ctx, cx, cy) => {
  const bx = cx - 60;
  ctx.beginPath();
  ctx.moveTo(bx, cy + 40);
  ctx.lineTo(bx, cy - 80);
  ctx.lineTo(bx + 130, cy - 114);
  ctx.lineTo(bx + 130, cy + 6);
  stroke(ctx, 12);
  dot(ctx, bx, cy + 40, 26);
  dot(ctx, bx + 130, cy + 6, 26);
};

const projectIcon: IconFn = (ctx, cx, cy) => {
  const pts: [number, number][] = [
    [cx, cy - 70],
    [cx - 70, cy - 10],
    [cx + 70, cy - 10],
    [cx - 40, cy + 60],
    [cx + 40, cy + 60],
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
    stroke(ctx, 9);
  }
  for (const [x, y] of pts) dot(ctx, x, y, 22);
};

const PANELS: Panel[] = [
  { x: 0, y: 0, bg: "#0EA5E9", title: "潛水天氣", subtitle: "各潛點即時海況", action: "潛水天氣", icon: waveIcon },
  { x: HALF_W, y: 0, bg: "#334155", title: "股票快報", subtitle: "即時股價與漲跌", action: "股票快報", icon: chartIcon },
  { x: 0, y: HALF_H, bg: "#DB2777", title: "音樂欣賞", subtitle: "找歌與推薦", action: "音樂欣賞", icon: musicIcon },
  { x: HALF_W, y: HALF_H, bg: "#059669", title: "專案介紹", subtitle: "我的作品集", action: "專案介紹", icon: projectIcon },
];

function renderPng(): Buffer {
  GlobalFonts.register(readFileSync(FONT_PATH), FONT_FAMILY);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  for (const p of PANELS) {
    ctx.fillStyle = p.bg;
    ctx.fillRect(p.x, p.y, HALF_W, HALF_H);

    const cx = p.x + HALF_W / 2;
    const cy = p.y + HALF_H / 2;
    p.icon(ctx, cx, cy - 40);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = white;
    ctx.font = `bold 132px ${FONT_FAMILY}`;
    ctx.fillText(p.title, cx, cy + 170);
    ctx.fillStyle = "#E2E8F0";
    ctx.font = `56px ${FONT_FAMILY}`;
    ctx.fillText(p.subtitle, cx, cy + 250);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(HALF_W, 40);
  ctx.lineTo(HALF_W, H - 40);
  ctx.moveTo(40, HALF_H);
  ctx.lineTo(W - 40, HALF_H);
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA = "https://api-data.line.me/v2/bot";

function token(): string {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return t;
}

async function applyRichMenu(png: Buffer): Promise<void> {
  const auth = { Authorization: `Bearer ${token()}` };

  const listRes = await fetch(`${LINE_API}/richmenu/list`, { headers: auth });
  if (listRes.ok) {
    const { richmenus = [] } = (await listRes.json()) as { richmenus?: { richMenuId: string }[] };
    for (const rm of richmenus) {
      await fetch(`${LINE_API}/richmenu/${rm.richMenuId}`, { method: "DELETE", headers: auth });
    }
    console.log(`Deleted ${richmenus.length} existing rich menu(s)`);
  }

  const richMenu = {
    size: { width: W, height: H },
    selected: true,
    name: "作品集小幫手選單",
    chatBarText: "開啟服務選單",
    areas: PANELS.map((p) => ({
      bounds: { x: p.x, y: p.y, width: HALF_W, height: HALF_H },
      action: { type: "message", text: p.action },
    })),
  };

  const createRes = await fetch(`${LINE_API}/richmenu`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(richMenu),
  });
  if (!createRes.ok) throw new Error(`create failed ${createRes.status}: ${await createRes.text()}`);
  const { richMenuId } = (await createRes.json()) as { richMenuId: string };
  console.log("Created rich menu:", richMenuId);

  const upRes = await fetch(`${LINE_DATA}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "image/png" },
    body: new Uint8Array(png),
  });
  if (!upRes.ok) throw new Error(`upload failed ${upRes.status}: ${await upRes.text()}`);
  console.log("Uploaded image");

  const defRes = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, { method: "POST", headers: auth });
  if (!defRes.ok) throw new Error(`set default failed ${defRes.status}: ${await defRes.text()}`);
  console.log("Set as default rich menu ✅");
}

async function main(): Promise<void> {
  const png = renderPng();
  writeFileSync(PNG_PATH, png);
  console.log(`Rendered ${PNG_PATH} (${(png.length / 1024).toFixed(0)} KB)`);

  if (process.env.APPLY === "1") {
    await applyRichMenu(png);
  } else {
    console.log("Preview only. Set APPLY=1 to publish the rich menu to LINE.");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
