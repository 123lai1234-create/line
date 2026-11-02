// 用 Node 內建 test runner 跑,不要另外裝測試框架:
//   node --test test/optimizations.test.mjs
// 只測新增的快取層:它是純模組、沒有外部 import,Node 24 可以直接 strip .ts 型別。
// line.ts 的簽章驗證與配額檢查沿用原本的 import 風格(extensionless,
// 給 esbuild 用),Node 原生跑不起來,所以不在這裡測,改由 typecheck + build 驗證。
import test from "node:test";
import assert from "node:assert/strict";
import { cached } from "../src/lib/cache.ts";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("cache: TTL 內重複請求只跑一次 loader,平行請求共用同一個結果", async () => {
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await sleep(10);
    return { n: calls };
  };
  const [a, b] = await Promise.all([
    cached("test-dedup", 1000, loader),
    cached("test-dedup", 1000, loader),
  ]);
  assert.equal(a.n, 1);
  assert.equal(b.n, 1);
  assert.equal(calls, 1);
  assert.equal((await cached("test-dedup", 1000, loader)).n, 1);
});

test("cache: TTL 過期後重新載入,失敗不寫快取", async () => {
  let calls = 0;
  const v = await cached("test-expiry", 20, async () => ++calls);
  assert.equal(v, 1);
  await sleep(30);
  assert.equal(await cached("test-expiry", 20, async () => ++calls), 2);

  let failCalls = 0;
  await assert.rejects(
    cached("test-fail", 1000, async () => {
      failCalls += 1;
      throw new Error("boom");
    }),
  );
  assert.equal(await cached("test-fail", 1000, async () => "ok"), "ok");
  assert.equal(failCalls, 1);
});
