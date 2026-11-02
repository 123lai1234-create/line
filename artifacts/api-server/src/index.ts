import app from "./app";
import { logger } from "./lib/logger";
import { startBroadcastScheduler } from "./lib/scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // 預設開啟 in-process 排程。改走外部 cron(見 .github/workflows/broadcast-tick.yml)
  // 時把 SCHEDULER_ENABLED 設為 "false",避免兩邊同時跑(雖然 claim 機制已防重複發送)。
  if (process.env.SCHEDULER_ENABLED !== "false") {
    startBroadcastScheduler();
  } else {
    logger.info("In-process broadcast scheduler disabled (SCHEDULER_ENABLED=false)");
  }
});
