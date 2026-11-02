// 簡單的 in-memory TTL 快取,給「每則訊息都重打上游」的服務用。
// - 同 key 在 TTL 內直接回舊值,避免重複打上游 API。
// - 同 key 同時有多個請求在等時共用同一個 in-flight promise,不會打 N 次。
// - loader 失敗不寫快取(下一次請求會重試),也不會把錯誤結果當成資料。
// 注意:這是 process 內的快取,多 instance 部署時各 instance 各自快取,
// TTL 都很短(分鐘級),所以不會有跨 instance 不一致的問題。

interface Entry<T> {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;
  if (entry) {
    if (entry.value !== undefined && entry.expiresAt > now) return entry.value;
    if (entry.promise) return entry.promise;
  }
  const promise = loader().then(
    (value) => {
      store.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    },
    (err) => {
      // 失敗不留快取,讓下一次請求重試;同時清掉 in-flight 標記。
      if (store.get(key)?.promise === promise) store.delete(key);
      throw err;
    },
  );
  store.set(key, { expiresAt: 0, promise });
  return promise;
}
