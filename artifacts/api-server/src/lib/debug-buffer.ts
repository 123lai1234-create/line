// In-memory log buffer via pino hooks.logMethod.
// 繞過 esbuild-plugin-pino worker thread(用 process.stdout.write override 抓不到)。
// pino hooks 在 logger 方法被呼叫時觸發,在 worker 啟動之前,一定 capture 到。

const MAX_LINES = 300;
const buffer: string[] = [];

export function captureLine(level: string, args: unknown[]): void {
  try {
    const text = args
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
    buffer.push(`${new Date().toISOString()} [${level}] ${text}`);
    if (buffer.length > MAX_LINES) buffer.shift();
  } catch {
    // ignore
  }
}

export function getRecentLogs(): string[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}

// pino.hooks — 在 logger.info/warn/error/debug 呼叫時觸發。
// 不論 child logger 怎麼建、transports 怎麼走,hooks 都會被 invoke。
// pino 多層 hooks 會 chain 起來,所以這層只 mirror + 呼叫 method 繼續往下。
export function buildPinoHooks() {
  return {
    logMethod(this: unknown, inputArgs: unknown[], method: (...a: unknown[]) => void) {
      // 從 this.bindings 拿 level (pino 把 level 放在 child logger 的 bindings)
      const lvl =
        (this as { level?: string }).level ??
        (typeof inputArgs[0] === "object" && inputArgs[0] !== null
          ? (inputArgs[0] as { level?: string }).level
          : undefined) ??
        "info";
      captureLine(String(lvl), inputArgs);
      // ⚠️ 不要 return — 舊版 pino 期待 method 同步呼叫才往下傳輸
      method.apply(this, inputArgs as Parameters<typeof method>);
    },
  };
}
