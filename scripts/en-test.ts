/**
 * One-off: test the cloned voice speaking ENGLISH + lip-sync.
 *   npx tsx scripts/en-test.ts ["Custom text"]
 * Output: out/en-test/en-test.mp4
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
const TEXT =
  process.argv[2] ||
  "Welcome! I moved to Tenerife, took a job selling excursions — and then replaced myself with a bot. My own bot. That's how Tenerify was born.";
const VOICE_ID_CACHE = path.join(ROOT, "out", "episodes", "fal-voice-id.txt");
const PRESENTER_URL_CACHE = path.join(ROOT, "out", "episodes", "presenter-video-url.txt");
const PRESENTER_SOURCE = path.join(ROOT, "public", "reels", "face", "IMG_6789.MOV");

async function falUpload(filePath: string, contentType: string): Promise<string> {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(filePath) }),
  });
  if (!init.ok) throw new Error(`upload ${init.status}`);
  const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string };
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: fs.readFileSync(filePath) });
  if (!put.ok) throw new Error(`put ${put.status}`);
  return file_url;
}

async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`${model} submit ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { status_url, response_url } = (await res.json()) as { status_url: string; response_url: string };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const s = await fetch(status_url, { headers });
      if (!s.ok) continue;
      const t = await s.text();
      if (!t) continue;
      const sj = JSON.parse(t) as { status: string };
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error(`${model} FAILED`);
    } catch (e) {
      if ((e as Error).message.endsWith("FAILED")) throw e;
    }
  }
  const r = await fetch(response_url, { headers });
  if (!r.ok) throw new Error(`${model} result ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!FAL_KEY) throw new Error("Missing FAL_KEY");
  const voiceId = fs.readFileSync(VOICE_ID_CACHE, "utf8").trim();
  const outDir = path.join(ROOT, "out", "en-test");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`▶ EN voice test\n  text: "${TEXT.slice(0, 60)}…"\n  voice: ${voiceId.slice(0, 12)}…`);

  process.stdout.write("  tts… ");
  const tts = await falRun<{ audio?: { url: string } }>("fal-ai/minimax/speech-02-hd", {
    text: TEXT,
    voice_setting: { voice_id: voiceId, speed: 1.25, vol: 1, pitch: 0 },
  });
  if (!tts.audio?.url) throw new Error("no audio url");
  const mp3 = path.join(outDir, "en-line.mp3");
  await download(tts.audio.url, mp3);
  console.log("✓");

  // presenter video url (validate cached, else re-upload)
  let videoUrl = "";
  try {
    const cached = fs.readFileSync(PRESENTER_URL_CACHE, "utf8").trim();
    const head = await fetch(cached, { method: "HEAD" });
    if (head.ok) videoUrl = cached;
  } catch {}
  if (!videoUrl) {
    process.stdout.write("  uploading presenter clip… ");
    videoUrl = await falUpload(PRESENTER_SOURCE, "video/quicktime");
    fs.writeFileSync(PRESENTER_URL_CACHE, videoUrl);
    console.log("✓");
  }

  process.stdout.write("  uploading audio… ");
  const audioUrl = await falUpload(mp3, "audio/mpeg");
  console.log("✓");

  process.stdout.write("  lipsync… ");
  const sync = await falRun<{ video?: { url: string } }>("fal-ai/sync-lipsync", {
    video_url: videoUrl,
    audio_url: audioUrl,
    sync_mode: "cut_off",
  });
  if (!sync.video?.url) throw new Error("no video url");
  const dest = path.join(outDir, "en-test.mp4");
  await download(sync.video.url, dest);
  console.log("✓");
  console.log(`\n✓ ${dest}`);
}

main().catch((e) => {
  console.error("\n", (e as Error).message);
  process.exit(1);
});
