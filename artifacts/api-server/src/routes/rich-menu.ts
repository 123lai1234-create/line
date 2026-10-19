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
// 富選單圖片由 admin route 啟動時從 data/rich-menu.png 上傳(圖片先由 mcode-tools 生好放進去)。
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
const RICH_MENU_IMAGE_PATH = path.resolve(__dirname, "../../data/rich-menu.jpg");

const router: IRouter = Router();

async function loadRichMenuImage(): Promise<Buffer> {
  const buf = await readFile(RICH_MENU_IMAGE_PATH);
  // LINE rich menu image limit 1MB,1×3 2500×1686 控制在 ~700KB 內(PNG)。
  if (buf.length > 1024 * 1024) {
    throw new Error(`rich-menu.png 太大 (${buf.length} bytes),需 ≤ 1MB`);
  }
  return buf;
}

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

    const image = await loadRichMenuImage();
    await uploadRichMenuImage(richMenuId, image, "image/png");
    log.info?.({ richMenuId }, "rich menu image uploaded");

    await setDefaultRichMenu(richMenuId);
    log.info?.({ richMenuId }, "rich menu set as default");

    res.json({ ok: true, richMenuId, refresh });
  } catch (err) {
    log.error?.({ err }, "rich menu setup failed");
    res.status(500).json({ error: "rich menu setup failed", detail: String(err) });
  }
});

export default router;
