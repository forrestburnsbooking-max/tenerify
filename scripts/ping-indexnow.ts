import { getAllTours } from "../lib/tours";

// Pushes all public URLs to IndexNow (Bing + Yandex) so new/updated pages
// get crawled fast instead of waiting in Bing's "discovered but not crawled"
// queue. Run after a deploy or after `sync-prices`.

const HOST = "tenerify.ai";
const KEY = process.env.INDEXNOW_KEY ?? "3ae07b502e705f1d7d9cacb95d14e9ef";
const BASE = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function buildUrls(): string[] {
  const tourUrls = getAllTours().map((t) => `${BASE}/tours/${t.slug}`);
  return [`${BASE}/`, `${BASE}/tours`, ...tourUrls, `${BASE}/legal`];
}

async function main() {
  const urlList = buildUrls();
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `${BASE}/${KEY}.txt`,
    urlList,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (res.ok) {
    console.log(`IndexNow: submitted ${urlList.length} URLs (HTTP ${res.status})`);
  } else {
    console.error(`IndexNow failed (HTTP ${res.status}): ${text}`);
    process.exit(1);
  }
}

main();
