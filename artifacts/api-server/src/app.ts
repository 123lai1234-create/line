import express, { type Express, type ErrorRequestHandler, type Request } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// body-parser 解析失敗 → 若是 webhook 路徑,那是 LINE 的驗證 ping(空 body),回 200 而不是 400。
// 放在 router 之後,這樣真正的事件仍照常走簽章驗證。
app.use(((err: unknown, req, res, next) => {
  const type = (err as { type?: string } | null)?.type;
  // body-parser 解析失敗時,verify callback 已經把原始 body 存下來了。
  // 只有「body 真的是空的」才是 LINE 的驗證 ping → 回 200;
  // 非空的畸形 JSON 一律照原樣走 400,不要放行。
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  const emptyBody = !raw || raw.length === 0;
  if (type === "entity.parse.failed" && emptyBody && req.path === "/api/line/webhook") {
    res.status(200).json({ ok: true });
    return;
  }
  next(err);
}) as ErrorRequestHandler);

export default app;
