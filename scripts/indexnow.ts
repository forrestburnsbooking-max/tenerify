// Submit all live URLs to IndexNow (Bing, Yandex, etc.) in one batch.
// Run: npx tsx scripts/indexnow.ts
// The key file public/<KEY>.txt must be deployed first (IndexNow verifies ownership by fetching it).

const KEY = "3ae07b502e705f1d7d9cacb95d14e9ef";
const HOST = "tenerify.ai";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function main() {
  // Pull the canonical URL list from the live sitemap so it never drifts
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (!urlList.length) {
    console.error("No URLs found in sitemap — aborting.");
    process.exit(1);
  }
  console.log(`Submitting ${urlList.length} URLs to IndexNow…`);

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });

  console.log(`IndexNow responded: ${res.status} ${res.statusText}`);
  // 200/202 = accepted. 403 = key file not found/valid. 422 = URLs don't match host/key.
  const body = await res.text();
  if (body) console.log(body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
