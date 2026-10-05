// In-memory log buffer by overriding process.stdout.write.
// 不管 pino 內部怎麼建 logger / child / hook,所有寫到 stdout 的內容都會被 mirror。
// 給 Render free plan 沒 logs API 環境 debug 用。

const MAX_LINES = 300;
const buffer: string[] = [];

let installed = false;

export function installDebugLogCapture(): void {
  if (installed) return;
  installed = true;

  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    try {
      const text =
        typeof chunk === "string"
          ? chunk
          : Buffer.isBuffer(chunk)
            ? chunk.toString("utf8")
            : new TextDecoder().decode(chunk);
      for (const line of text.split("\n")) {
        if (!line) continue;
        buffer.push(`${new Date().toISOString()} ${line}`);
        if (buffer.length > MAX_LINES) buffer.shift();
      }
    } catch {
      // ignore
    }
    return (origWrite as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
}

export function getRecentLogs(): string[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}
