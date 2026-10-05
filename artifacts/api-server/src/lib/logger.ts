import pino, { type Logger as PinoLogger } from "pino";
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

type LogFn = (msg: string, ...rest: unknown[]) => void;
type LogFnObj = (obj: object, msg?: string, ...rest: unknown[]) => void;

function fmtArgs(args: unknown[]): string {
  return args
    .map((a) =>
      typeof a === "string"
        ? a
        : a instanceof Error
          ? `err=${a.message}`
          : typeof a === "object" && a !== null
            ? JSON.stringify(a)
            : String(a),
    )
    .join(" ");
}

function wrap(level: string, original: (...a: unknown[]) => unknown) {
  return (...args: unknown[]) => {
    try {
      captureLog(`[${level}] ${fmtArgs(args)}`);
    } catch {
      // 別讓 buffer 寫入失敗炸掉 request
    }
    return original(...args);
  };
}

// 用 Proxy 保留所有原型方法(levels / bindings / symbol props / child 等),
// 只攔截 log methods。把所有 .info/.warn/.error/.debug/.trace/.fatal 都鏡像一份。
export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    if (prop === "info") return wrap("info", target.info.bind(target));
    if (prop === "warn") return wrap("warn", target.warn.bind(target));
    if (prop === "error") return wrap("error", target.error.bind(target));
    if (prop === "debug") return wrap("debug", target.debug.bind(target));
    if (prop === "trace") return wrap("trace", target.trace.bind(target));
    if (prop === "fatal") return wrap("fatal", target.fatal.bind(target));
    if (prop === "child") {
      return (bindings: Record<string, unknown>) =>
        new Proxy(target.child(bindings), {
          get(t, p, r) {
            if (p === "info") return wrap("info", t.info.bind(t));
            if (p === "warn") return wrap("warn", t.warn.bind(t));
            if (p === "error") return wrap("error", t.error.bind(t));
            if (p === "debug") return wrap("debug", t.debug.bind(t));
            if (p === "trace") return wrap("trace", t.trace.bind(t));
            if (p === "fatal") return wrap("fatal", t.fatal.bind(t));
            return Reflect.get(t, p, r);
          },
        });
    }
    return Reflect.get(target, prop, receiver);
  },
}) as PinoLogger;
