import { Router, type IRouter } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRichMenu,
  deleteRichMenu,
  listRichMenus,
  setDefaultRichMenu,
  uploadRichMenuImage,
} from "../lib/line";

// 1×3 rich menu(2500×1686,可拆 3 格),每格獨立 tap area 對應不同指令。
//
// 設計:
//   • 格 1 「即時快訊」→ 觸發 stockUpdate()(等同 follow event 那張 market update 卡),
//     走 postback `s=stk`(目前 router 已存在的 entry,展開 sector bubbles)。
//     只看大盤快訊時用 LINE 文字「股票」也行,但 postback 比較直接。
//   • 格 2 「個股查詢」→ 開 LINE 鍵盤讓使用者輸入(走 text 訊息),
//     router 內 `resolveStock` 認名稱/代號自動補 .TW 後送走勢圖。
//   • 格 3 「主選單」→ postback `s=menu&style=bento`,重繪 bento 服務選單。
//
// 富選單圖片上傳時從 data/rich-menu.jpg 讀(2500×1686 JPEG,約 129KB)。
// 也可以日後把這個 rich menu 拿掉換新版本時,POST /api/admin/rich-menu?refresh=1 會自動
// 刪掉舊 rich menu 再重傳。
const RICH_MENU_SPEC = {
  size: { width: 2500, height: 1686 },
  selected: false,
  name: "不說助手 主選單 (1x3)",
  chatBarText: "點開服務選單",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 1686 },
      action: { type: "postback", data: "s=stk", displayText: "看台股快訊" },
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 1686 },
      action: { type: "message", text: "個股查詢" },
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 1686 },
      action: { type: "postback", data: "s=menu&style=bento", displayText: "回主選單" },
    },
  ],
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 圖檔位置有兩種 layout,所以用候選清單試到中:
//   • 打包後（Docker / Render / Fly）：esbuild 把整個 bundle 成單一 dist/index.mjs,
//     __dirname = /app/dist → 圖檔在 /app/data/rich-menu.jpg
//   • 本機 dev（tsx src/index.ts）：__dirname = artifacts/api-server/src/routes
//     → 圖檔在 artifacts/api-server/data/rich-menu.jpg
// ⚠️ 這裡不能用單一相對路徑 —— 只寫 `../../data` 的話,在 container 裡會解析成
//    `/data/rich-menu.jpg`,檔案根本不存在,rich menu 上傳必定失敗。
// 另外留 `RICH_MENU_IMAGE_PATH` env 給自訂路徑。
const RICH_MENU_IMAGE_CANDIDATES = [
  process.env.RICH_MENU_IMAGE_PATH,
  path.resolve(__dirname, "../data/rich-menu.jpg"),
  path.resolve(__dirname, "../../data/rich-menu.jpg"),
].filter((p): p is string => Boolean(p));

// LINE 的 rich menu content API 是用 request header 的 Content-Type 判斷格式,
// 送錯(JPEG 卻標 png)LINE 會直接回 400,所以從 magic bytes  sniff。
function sniffImageType(buf: Buffer): "image/png" | "image/jpeg" {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  return "image/png";
}

async function loadRichMenuImage(): Promise<{ buffer: Buffer; contentType: "image/png" | "image/jpeg" }> {
  const tried: string[] = [];
  for (const candidate of RICH_MENU_IMAGE_CANDIDATES) {
    tried.push(candidate);
    let buf: Buffer;
    try {
      buf = await readFile(candidate);
    } catch {
      continue; // 換下一個候選
    }
    // LINE rich menu image limit 1MB（2500×1686 控制在 ~129KB）
    if (buf.length > 1024 * 1024) {
      throw new Error(`rich menu image 太大 (${buf.length} bytes),需 ≤ 1MB: ${candidate}`);
    }
    return { buffer: buf, contentType: sniffImageType(buf) };
  }
  throw new Error(`rich menu image 找不到,試過: ${tried.join(" | ")}`);
}

const router: IRouter = Router();

// 極簡保護:要求 `x-admin-token` header 等於 `ADMIN_PASSWORD` env。
// 部署之後只從本機 / CI / Fly console 用,無 cookie 必要。
// ADMIN_PASSWORD 未設 → 全拒,避免意外開放。
function requireAdminToken(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(503).json({ error: "ADMIN_PASSWORD not set; admin endpoints disabled" });
    return;
  }
  const got = req.header("x-admin-token");
  if (got !== expected) {
    res.status(401).json({ error: "invalid admin token" });
    return;
  }
  next();
}

// POST /api/admin/rich-menu → 上傳並設為 default。
// POST /api/admin/rich-menu?refresh=1 → 先刪舊的(default + 同名 menu)再重傳。
//
// 用法(從部署主機或 CI):
//   curl -X POST -H "x-admin-token: $ADMIN_PASSWORD" \
//        https://<host>/api/admin/rich-menu?refresh=1
router.post("/admin/rich-menu", requireAdminToken, async (req, res) => {
  const log = req.log?.child?.({ route: "admin/rich-menu" }) ?? console;
  const refresh = req.query.refresh === "1";

  if (refresh) {
    const existing = await listRichMenus();
    // ⚠️ 防呆：多頁籤模式下 channel 上會同時有 3 個 rich menu(+3 個 alias)。
    //    這個 route 只會建立**一個** 1×3,refresh 下去會把頁籤整個滅掉而且救不回來。
    //    多頁籤請走 scripts/src/setup-line-richmenu.ts(它才會建 alias)。
    if (existing.length > 1) {
      res.status(409).json({
        error: "channel 上有多個 rich menu — 看起來是多頁籤模式,這個單頁 route 不要用",
        count: existing.length,
        hint: "用 scripts/src/setup-line-richmenu.ts 發布(需手動確認)",
      });
      return;
    }
    for (const m of existing) {
      if (m.richMenuId) {
        try {
          await deleteRichMenu(m.richMenuId);
          log.info?.({ richMenuId: m.richMenuId }, "deleted existing rich menu");
        } catch (err) {
          log.warn?.({ err, richMenuId: m.richMenuId }, "failed to delete rich menu");
        }
      }
    }
  }

  try {
    const richMenuId = await createRichMenu(RICH_MENU_SPEC);
    log.info?.({ richMenuId }, "rich menu created");

    const { buffer, contentType } = await loadRichMenuImage();
    await uploadRichMenuImage(richMenuId, buffer, contentType);
    log.info?.({ richMenuId, bytes: buffer.length, contentType }, "rich menu image uploaded");

    await setDefaultRichMenu(richMenuId);
    log.info?.({ richMenuId }, "rich menu set as default");

    res.json({ ok: true, richMenuId, refresh });
  } catch (err) {
    log.error?.({ err }, "rich menu setup failed");
    res.status(500).json({ error: "rich menu setup failed", detail: String(err) });
  }
});

export default router;
