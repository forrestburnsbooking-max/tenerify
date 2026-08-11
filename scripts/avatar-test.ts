/**
 * One-off: generate a single talking-avatar clip to validate quality + cost
 * before wiring avatars into every episode.
 *
 *   npx tsx scripts/avatar-test.ts
 *   npx tsx scripts/avatar-test.ts <image> <audio.mp3> <falModel>
 *
 * Default: public/reels/face/avatar-source.jpg + ep02 line-1 cloned-voice audio,
 * via Kling AI Avatar v2 standard ($0.056/s). Output: out/avatar/test.mp4
 */
import fs from "fs";
import path from "path";

// load .env.local
try {
  for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const FAL_KEY = process.env.FAL_KEY;
const ROOT = process.cwd();
const MODEL = process.argv[4] || "fal-ai/kling-video/ai-avatar/v2/standard";
const IMG = process.argv[2] || "public/reels/face/avatar-source.jpg";
const AUDIO = process.argv[3] || "public/episodes/audio/ep02-mefal-s125-1.mp3";

function dataUri(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : ext === ".png" ? "image/png"
    : ext === ".mp3" ? "audio/mpeg"
    : ext === ".wav" ? "audio/wav"
    : ext === ".m4a" ? "audio/mp4"
    : "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${await res.text()}`);
  const { status_url, response_url } = (await res.json()) as { status_url: string; response_url: string };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const s = await fetch(status_url, { headers });
      if (!s.ok) continue;
      const t = await s.text();
      if (!t) continue;
      const sj = JSON.parse(t) as { status: string };
      process.stdout.write(`\r  status: ${sj.status}   `);
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error("FAILED");
    } catch (e) {
      if ((e as Error).message === "FAILED") throw e;
    }
  }
  const r = await fetch(response_url, { headers });
  if (!r.ok) throw new Error(`result ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

async function main() {
  if (!FAL_KEY) return console.error("Missing FAL_KEY");
  console.log(`▶ avatar test\n  model: ${MODEL}\n  image: ${IMG}\n  audio: ${AUDIO}`);
  const out = await falRun<{ video?: { url: string } }>(MODEL, {
    image_url: dataUri(path.join(ROOT, IMG)),
    audio_url: dataUri(path.join(ROOT, AUDIO)),
  });
  console.log("\n  result:", JSON.stringify(out).slice(0, 200));
  if (!out.video?.url) return console.error("no video url");
  const dir = path.join(ROOT, "out", "avatar");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "test.mp4");
  const v = await fetch(out.video.url);
  fs.writeFileSync(dest, Buffer.from(await v.arrayBuffer()));
  console.log(`✓ ${dest}`);
}

main().catch((e) => { console.error("\n", (e as Error).message); process.exit(1); });
