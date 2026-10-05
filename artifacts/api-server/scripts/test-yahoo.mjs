const symbols = ["0050.TW", "2330.TW", "0051.TW", "6223.TWO", "2317.TW"];
for (const sym of symbols) {
  const t = Date.now();
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2y`,
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; yahoo-finance)" } },
  );
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const bars = result?.timestamp?.length ?? 0;
  console.log(`${sym}: ${Date.now() - t}ms | status=${res.status} | bars=${bars}`);
}
