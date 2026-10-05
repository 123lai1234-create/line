// In-memory log buffer for debug endpoint.
// Render free plan 的 logs API 對我這個 token 拿不到,加個 ring buffer
// 讓 LINE webhook 處理過程能被 `/api/debug/logs` 讀出來 debug。

const MAX_LINES = 200;
const buffer: string[] = [];

export function captureLog(line: string): void {
  const ts = new Date().toISOString();
  buffer.push(`${ts} ${line}`);
  if (buffer.length > MAX_LINES) buffer.shift();
}

export function getRecentLogs(): string[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}
