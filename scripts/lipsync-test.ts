/**
 * Lip-sync a REAL video of the founder to a narration line (his cloned voice),
 * so his real face "says" the script. Better than photo-avatar.
 *
 *   npx tsx scripts/lipsync-test.ts [video] [audio.mp3] [falModel]
 *
 * Default: reels/face/IMG_6700.MOV + ep02 line-1 audio via fal-ai/sync-lipsync.
 * Output: out/avatar/lipsync.mp4
 */
import fs from "fs";
import path from "path";

try {
  for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const FAL_KEY = process.env.FAL_KEY;
const ROOT = process.cwd();
const VIDEO = process.argv[2] || "public/reels/face/IMG_6700.MOV";
const AUDIO = process.argv[3] || "public/episodes/audio/ep02-mefal-s125-1.mp3";
const MODEL = process.argv[4] || "fal-ai/sync-lipsync";

function dataUri(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === ".mp4" ? "video/mp4"
    : ext === ".mov" ? "video/quicktime"
    : ext === ".mp3" ? "audio/mpeg"
    : ext === ".wav" ? "audio/wav"
    : "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

// Upload a local file to fal storage → returns a public URL (data URIs over a
// few MB get rejected as "request too large").
async function falUpload(filePath: string, contentType: string): Promise<string> {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(filePath) }),
  });
  if (!init.ok) throw new Error(`upload initiate ${init.status}: ${(await init.text()).slice(0, 200)}`);
  const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string };
  const put = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fs.readFileSync(filePath),
  });
  if (!put.ok) throw new Error(`upload put ${put.status}`);
  return file_url;
}

async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { status_url, response_url } = (await res.json()) as { status_url: string; response_url: string };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 240; i++) {
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
  if (!r.ok) throw new Error(`result ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

async function main() {
  if (!FAL_KEY) return console.error("Missing FAL_KEY");
  console.log(`▶ lipsync test\n  model: ${MODEL}\n  video: ${VIDEO}\n  audio: ${AUDIO}`);
  const vExt = path.extname(VIDEO).toLowerCase();
  const vMime = vExt === ".mov" ? "video/quicktime" : "video/mp4";
  process.stdout.write("  uploading video… ");
  const video_url = await falUpload(path.join(ROOT, VIDEO), vMime);
  process.stdout.write("ok\n  uploading audio… ");
  const audio_url = await falUpload(path.join(ROOT, AUDIO), "audio/mpeg");
  console.log("ok");
  const out = await falRun<{ video?: { url: string } }>(MODEL, {
    video_url,
    audio_url,
    sync_mode: "cut_off",
  });
  console.log("\n  result:", JSON.stringify(out).slice(0, 200));
  if (!out.video?.url) return console.error("no video url");
  const dir = path.join(ROOT, "out", "avatar");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "lipsync.mp4");
  const v = await fetch(out.video.url);
  fs.writeFileSync(dest, Buffer.from(await v.arrayBuffer()));
  console.log(`✓ ${dest}`);
}

main().catch((e) => { console.error("\n", (e as Error).message); process.exit(1); });
