import pino from "pino";
import { captureLog } from "./debug-buffer";

const isProduction = process.env.NODE_ENV === "production";

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

// 鏡像一份到 debug buffer,給 /api/debug/logs 看
function mirror(level: string, original: (...a: unknown[]) => unknown) {
  return (...args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (typeof a === "string" ? a : a instanceof Error ? `err=${a.message}` : JSON.stringify(a)))
        .join(" ");
      captureLog(`[${level}] ${msg}`);
    } catch {
      // ignore
    }
    return original(...args);
  };
}

export const logger = {
  ...baseLogger,
  info: mirror("info", baseLogger.info.bind(baseLogger)),
  warn: mirror("warn", baseLogger.warn.bind(baseLogger)),
  error: mirror("error", baseLogger.error.bind(baseLogger)),
  debug: mirror("debug", baseLogger.debug.bind(baseLogger)),
  child: (bindings: Record<string, unknown>) => {
    const child = baseLogger.child(bindings);
    return {
      ...child,
      info: mirror("info", child.info.bind(child)),
      warn: mirror("warn", child.warn.bind(child)),
      error: mirror("error", child.error.bind(child)),
      debug: mirror("debug", child.debug.bind(child)),
    };
  },
} as typeof baseLogger;
