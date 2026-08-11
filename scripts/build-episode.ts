/**
 * Build one episode of the "How I built Tenerify" reel series, end to end.
 *
 *   FAL_KEY=xxx npx tsx scripts/build-episode.ts 1            # build episode 1
 *   FAL_KEY=xxx npx tsx scripts/build-episode.ts 1 --force    # re-do TTS + re-render
 *
 * Fully automated pipeline:
 *   1. Read the episode script (remotion/episodes/script.ts)
 *   2. Pull the REAL git log for the episode's day → the sprint visual
 *   3. TTS each narration line via ElevenLabs on fal.ai → public/episodes/audio
 *   4. Measure each clip's real duration → build a synced frame timeline
 *   5. Render out/episodes/ep<NN>.mp4 with Remotion (1080x1920, h264)
 *
 * Output: out/episodes/ep01.mp4  — nothing else to do but watch it.
 */
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import { EPISODES, EPISODES_EN, SERIES_TITLES, SERIES_TITLES_EN } from "../remotion/episodes/script";
import type { Commit, EpisodeReelProps, TimedLine } from "../remotion/episodes/types";
import { computeDurationInFrames } from "../remotion/episodes/types";

const FPS = 30;
const ROOT = process.cwd();
const FAL_KEY = process.env.FAL_KEY;
const TTS_MODEL = "fal-ai/elevenlabs/tts/multilingual-v2";
// A mature male voice reads best for a founder's build-story. Override with EP_VOICE.
const VOICE = process.env.EP_VOICE || "Brian";

// Edition language: EP_LANG=en builds the English edition (EPISODES_EN scripts,
// EN UI strings, its own cache/output namespace).
const LANG = (process.env.EP_LANG || "ru") as "ru" | "en";

// Series rule: narrate at 1.25× tempo (RU) / 1.35× (EN — user wants it a notch
// faster). Pitch-preserving via the TTS engine's speed param; the timeline is
// derived from the resulting audio length. Override with EP_SPEED.
const NARRATION_SPEED = Number(process.env.EP_SPEED || (LANG === "en" ? 1.35 : 1.25));
const SPEED_TAG = String(Math.round(NARRATION_SPEED * 100)); // e.g. "125"
// Language suffix keeps EN caches/outputs separate; RU keeps legacy names.
const LANG_TAG = LANG === "en" ? "-en" : "";

// Voice-clone (preferred): if an ELEVENLABS_API_KEY and a voice sample are present,
// narrate in the creator's own cloned voice instead of a fal preset. Drop a sample
// at public/episodes/voice-sample.<ext> (or set EP_VOICE_SAMPLE to a path).
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_MODEL = "eleven_multilingual_v2";
const VOICE_ID_CACHE = path.join(ROOT, "out", "episodes", "voice-id.txt");

function findVoiceSample(): string | null {
  if (process.env.EP_VOICE_SAMPLE && fs.existsSync(process.env.EP_VOICE_SAMPLE)) {
    return process.env.EP_VOICE_SAMPLE;
  }
  const dir = path.join(ROOT, "public", "episodes");
  if (!fs.existsSync(dir)) return null;
  const hit = fs
    .readdirSync(dir)
    .find((f) => /^voice-sample\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i.test(f));
  return hit ? path.join(dir, hit) : null;
}

// Create (once) an ElevenLabs Instant Voice Clone from the sample; cache its id.
async function elevenEnsureVoice(samplePath: string): Promise<string> {
  if (fs.existsSync(VOICE_ID_CACHE)) {
    return fs.readFileSync(VOICE_ID_CACHE, "utf8").trim();
  }
  const buf = fs.readFileSync(samplePath);
  const form = new FormData();
  form.append("name", `Tenerify Creator ${Date.now()}`);
  form.append("files", new Blob([buf]), path.basename(samplePath));
  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY! },
    body: form,
  });
  if (!res.ok) throw new Error(`voice clone failed ${res.status}: ${await res.text()}`);
  const { voice_id } = (await res.json()) as { voice_id: string };
  fs.mkdirSync(path.dirname(VOICE_ID_CACHE), { recursive: true });
  fs.writeFileSync(VOICE_ID_CACHE, voice_id);
  return voice_id;
}

// Synthesize one line in the cloned voice, straight from the ElevenLabs API.
async function elevenTTS(text: string, dest: string, voiceId: string): Promise<void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.15,
          speed: Math.min(NARRATION_SPEED, 1.2), // eleven caps speed at 1.2
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`eleven tts ${res.status}: ${await res.text()}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ─── git ─────────────────────────────────────────────────────────────────
function realCommits(since: string, until: string, highlightKeywords: string[]): Commit[] {
  const out = execFileSync(
    "git",
    [
      "log",
      `--since=${since}`,
      `--until=${until}`,
      "--reverse",
      "--date=format:%H:%M",
      "--pretty=format:%h|%ad|%s",
    ],
    { cwd: ROOT, encoding: "utf8" }
  ).trim();
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, time, ...rest] = line.split("|");
      const subject = rest.join("|");
      const highlight = highlightKeywords.some((k) =>
        subject.toLowerCase().includes(k.toLowerCase())
      );
      return { hash, time, subject, highlight };
    });
}

// Pick real footage from the archive. B-roll rotates per episode so each reel
// gets a different backdrop; screens/ backs the sprint act (him actually coding).
function listClips(folder: string): string[] {
  const dir = path.join(ROOT, "public", "reels", folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f))
    .sort();
}

function pickBroll(epNo: number): string | undefined {
  const clips = listClips("broll");
  if (!clips.length) return undefined;
  return `reels/broll/${clips[epNo % clips.length]}`;
}

function pickScreens(epNo: number): string | undefined {
  const clips = listClips("screens");
  if (!clips.length) return undefined;
  return `reels/screens/${clips[epNo % clips.length]}`;
}

// Backdrop for chat-glitch hooks: rotate through real face footage (skip
// generated avatar/lipsync artifacts) so every clip he shoots gets used.
function pickFace(epNo: number): string | undefined {
  const clips = listClips("face").filter((f) => !/^(avatar|lipsync)/i.test(f));
  if (!clips.length) return undefined;
  return `reels/face/${clips[epNo % clips.length]}`;
}

const RU_MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function ruDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${RU_MONTHS[Number(m) - 1]}`;
}

// Curated sprint: hand-picked commits (by subject substring) from the full
// history, each labelled with its DATE (across days), all highlighted.
function curatedCommits(subjects: string[]): Commit[] {
  const raw = execFileSync(
    "git",
    ["log", "--reverse", "--date=format:%Y-%m-%d", "--pretty=format:%h|%ad|%s"],
    { cwd: ROOT, encoding: "utf8" }
  ).trim().split("\n");
  const all = raw.map((line) => {
    const [hash, iso, ...rest] = line.split("|");
    return { hash, iso, subject: rest.join("|") };
  });
  const picked: Commit[] = [];
  for (const needle of subjects) {
    const hit = all.find((c) => c.subject.toLowerCase().includes(needle.toLowerCase()));
    if (hit) picked.push({ hash: hit.hash, time: ruDate(hit.iso), subject: hit.subject, highlight: true });
    else console.warn(`  ⚠ curated commit not found: "${needle}"`);
  }
  return picked;
}

// ─── presenter (lip-sync a real talking clip to each narration line) ───────
const PRESENTER = process.env.PRESENTER === "1";
const PRESENTER_SOURCE = process.env.EP_PRESENTER || "public/reels/face/IMG_6789.MOV";
const LIPSYNC_MODEL = "fal-ai/sync-lipsync";
const PRESENTER_URL_CACHE = path.join(ROOT, "out", "episodes", "presenter-video-url.txt");

// Upload a local file to fal storage → public URL (data URIs >~4MB get rejected).
async function falUpload(filePath: string, contentType: string): Promise<string> {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(filePath) }),
  });
  if (!init.ok) throw new Error(`upload ${init.status}: ${(await init.text()).slice(0, 200)}`);
  const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string };
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: fs.readFileSync(filePath) });
  if (!put.ok) throw new Error(`upload put ${put.status}`);
  return file_url;
}

// Upload the presenter source clip once and cache its URL for reuse across lines.
// fal storage URLs expire, so validate the cached one (HEAD) and re-upload if dead.
async function presenterVideoUrl(): Promise<string> {
  if (fs.existsSync(PRESENTER_URL_CACHE)) {
    const cached = fs.readFileSync(PRESENTER_URL_CACHE, "utf8").trim();
    if (cached) {
      try {
        const head = await fetch(cached, { method: "HEAD" });
        if (head.ok) return cached;
      } catch {
        /* fall through and re-upload */
      }
      console.log("  presenter: cached URL expired, re-uploading…");
    }
  }
  const abs = path.join(ROOT, PRESENTER_SOURCE);
  const mime = path.extname(abs).toLowerCase() === ".mov" ? "video/quicktime" : "video/mp4";
  const url = await falUpload(abs, mime);
  fs.mkdirSync(path.dirname(PRESENTER_URL_CACHE), { recursive: true });
  fs.writeFileSync(PRESENTER_URL_CACHE, url);
  return url;
}

// Lip-sync the presenter clip to one line's audio → download muted PiP clip.
async function lipsyncLine(videoUrl: string, audioAbs: string, dest: string): Promise<void> {
  const audio_url = await falUpload(audioAbs, "audio/mpeg");
  const out = await falRun<{ video?: { url: string } }>(LIPSYNC_MODEL, {
    video_url: videoUrl,
    audio_url,
    sync_mode: "cut_off",
  });
  if (!out.video?.url) throw new Error("no lipsync video url: " + JSON.stringify(out).slice(0, 200));
  await download(out.video.url, dest);
}

// ─── TTS via fal (queue: submit → poll → result) ───────────────────────────
async function ttsSubmit(text: string): Promise<{ statusUrl: string; responseUrl: string }> {
  const res = await fetch(`https://queue.fal.run/${TTS_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: VOICE,
      stability: 0.45,
      similarity_boost: 0.75,
      style: 0.15,
      speed: Math.min(NARRATION_SPEED, 1.2), // eleven caps speed at 1.2
    }),
  });
  if (!res.ok) throw new Error(`tts submit ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { status_url: string; response_url: string };
  return { statusUrl: j.status_url, responseUrl: j.response_url };
}

async function ttsWait(s: { statusUrl: string; responseUrl: string }): Promise<string> {
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const st = await fetch(s.statusUrl, { headers });
      if (!st.ok) continue;
      const txt = await st.text();
      if (!txt) continue;
      const sj = JSON.parse(txt) as { status: string };
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error("tts FAILED");
    } catch (err) {
      if ((err as Error).message === "tts FAILED") throw err;
    }
  }
  const r = await fetch(s.responseUrl, { headers });
  if (!r.ok) throw new Error(`tts result ${r.status}: ${await r.text()}`);
  const rj = (await r.json()) as { audio?: { url: string } };
  if (!rj.audio?.url) throw new Error("no audio url in tts result");
  return rj.audio.url;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ─── fal voice clone (MiniMax, zero-shot from a reference sample) ───────────
// Default when a sample is present: no subscription, uses the existing FAL_KEY,
// MiniMax speech-02 handles Russian. Set EP_VOICE_ENGINE=eleven to prefer that.
const FAL_CLONE_MODEL = "fal-ai/minimax/voice-clone";
const FAL_CLONE_TTS_MODEL = "fal-ai/minimax/speech-02-hd";
const FAL_VOICE_ID_CACHE = path.join(ROOT, "out", "episodes", "fal-voice-id.txt");

// Generic fal queue call: submit → poll → return the result JSON.
async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`${model} submit ${res.status}: ${await res.text()}`);
  const { status_url, response_url } = (await res.json()) as {
    status_url: string;
    response_url: string;
  };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  // Long window: lip-sync of longer lines can take >5 min on fal's queue.
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const st = await fetch(status_url, { headers });
      if (!st.ok) continue;
      const txt = await st.text();
      if (!txt) continue;
      const sj = JSON.parse(txt) as { status: string };
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error(`${model} FAILED`);
    } catch (err) {
      if ((err as Error).message.endsWith("FAILED")) throw err;
    }
  }
  const r = await fetch(response_url, { headers });
  if (!r.ok) throw new Error(`${model} result ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

function audioDataUri(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const mime =
    ext === ".mp3" ? "audio/mpeg"
    : ext === ".wav" ? "audio/wav"
    : ext === ".m4a" || ext === ".aac" ? "audio/mp4"
    : ext === ".ogg" ? "audio/ogg"
    : ext === ".webm" ? "audio/webm"
    : ext === ".flac" ? "audio/flac"
    : "audio/mpeg";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

async function falEnsureVoice(samplePath: string): Promise<string> {
  if (fs.existsSync(FAL_VOICE_ID_CACHE)) {
    return fs.readFileSync(FAL_VOICE_ID_CACHE, "utf8").trim();
  }
  const out = await falRun<{ custom_voice_id?: string }>(FAL_CLONE_MODEL, {
    audio_url: audioDataUri(samplePath),
  });
  if (!out.custom_voice_id) {
    throw new Error("no custom_voice_id from voice-clone: " + JSON.stringify(out).slice(0, 300));
  }
  fs.mkdirSync(path.dirname(FAL_VOICE_ID_CACHE), { recursive: true });
  fs.writeFileSync(FAL_VOICE_ID_CACHE, out.custom_voice_id);
  return out.custom_voice_id;
}

async function falCloneTTS(text: string, dest: string, voiceId: string): Promise<void> {
  const out = await falRun<{ audio?: { url: string } }>(FAL_CLONE_TTS_MODEL, {
    text,
    voice_setting: { voice_id: voiceId, speed: NARRATION_SPEED, vol: 1, pitch: 0 },
  });
  if (!out.audio?.url) {
    throw new Error("no audio url from minimax tts: " + JSON.stringify(out).slice(0, 300));
  }
  await download(out.audio.url, dest);
}

async function audioSeconds(file: string): Promise<number> {
  const { durationInSeconds } = await parseMedia({
    src: file,
    reader: nodeReader,
    fields: { durationInSeconds: true },
    acknowledgeRemotionLicense: true,
  });
  if (!durationInSeconds) throw new Error(`could not read duration of ${file}`);
  return durationInSeconds;
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  const epNo = Number(process.argv[2] || 1);
  const force = process.argv.includes("--force");
  const ep = LANG === "en" ? EPISODES_EN[epNo] : EPISODES[epNo];
  if (!ep) {
    console.error(`No episode ${epNo} in remotion/episodes/script.ts`);
    process.exit(1);
  }
  // Pick the narration engine. With a voice sample present we clone the creator's
  // voice — via fal/MiniMax by default (no subscription), or ElevenLabs if
  // EP_VOICE_ENGINE=eleven and a key is set. No sample → fal preset voice.
  const sample = findVoiceSample();
  const preferEleven = process.env.EP_VOICE_ENGINE === "eleven";
  type Engine = "fal-clone" | "eleven-clone" | "fal-preset";
  let engine: Engine;
  if (sample && preferEleven && ELEVEN_KEY) engine = "eleven-clone";
  else if (sample && FAL_KEY) engine = "fal-clone";
  else if (sample && ELEVEN_KEY) engine = "eleven-clone";
  else engine = "fal-preset";

  if ((engine === "fal-clone" || engine === "fal-preset") && !FAL_KEY) {
    console.error("Missing FAL_KEY. Get one at https://fal.ai/dashboard/keys");
    process.exit(1);
  }
  if (engine === "eleven-clone" && !ELEVEN_KEY) {
    console.error("EP_VOICE_ENGINE=eleven needs ELEVENLABS_API_KEY");
    process.exit(1);
  }
  const voiceTag =
    engine === "fal-clone" ? "mefal" : engine === "eleven-clone" ? "me" : "brian";

  const nn = String(epNo).padStart(2, "0");
  const audioDir = path.join(ROOT, "public", "episodes", "audio");
  fs.mkdirSync(audioDir, { recursive: true });

  console.log(`\n▶ Episode ${epNo}: ${ep.title}`);

  let cloneVoiceId = "";
  if (engine === "eleven-clone") {
    cloneVoiceId = await elevenEnsureVoice(sample!);
    console.log(`  voice: ElevenLabs clone of ${path.basename(sample!)} (${cloneVoiceId.slice(0, 8)}…)`);
  } else if (engine === "fal-clone") {
    cloneVoiceId = await falEnsureVoice(sample!);
    console.log(`  voice: fal/MiniMax clone of ${path.basename(sample!)} (${cloneVoiceId.slice(0, 12)}…)`);
  } else {
    console.log(`  voice: fal preset "${VOICE}" (drop public/episodes/voice-sample.* to use your own)`);
  }

  // 1. real git history for the sprint act
  const sprintMode = ep.sprintMode ?? "day";
  const commits =
    sprintMode === "curated"
      ? curatedCommits(ep.sprintCommits ?? [])
      : realCommits(ep.gitSince, ep.gitUntil, ep.highlightKeywords);
  console.log(`  git: ${commits.length} commits (${sprintMode}) ${commits[0]?.time}–${commits.at(-1)?.time}`);

  // 2. TTS + timeline
  const PAD = Math.round(FPS * 0.15); // small breathing room; keeps presenter PiP near-continuous
  const lines: TimedLine[] = [];
  let cursor = 0;
  for (let i = 0; i < ep.lines.length; i++) {
    const line = ep.lines[i];
    const rel = `episodes/audio/ep${nn}-${voiceTag}${LANG_TAG}-s${SPEED_TAG}-${i + 1}.mp3`;
    const abs = path.join(ROOT, "public", rel);
    if (force || !fs.existsSync(abs)) {
      process.stdout.write(`  tts[${i + 1}/${ep.lines.length}] "${line.vo.slice(0, 40)}…" `);
      if (engine === "eleven-clone") {
        await elevenTTS(line.vo, abs, cloneVoiceId);
      } else if (engine === "fal-clone") {
        await falCloneTTS(line.vo, abs, cloneVoiceId);
      } else {
        const url = await ttsWait(await ttsSubmit(line.vo));
        await download(url, abs);
      }
      console.log("✓");
    } else {
      console.log(`  tts[${i + 1}/${ep.lines.length}] cached`);
    }
    const secs = await audioSeconds(abs);
    const durationFrames = Math.ceil(secs * FPS) + PAD;
    lines.push({
      act: line.act,
      caption: line.caption,
      audioSrc: rel,
      fromFrame: cursor,
      durationFrames,
    });
    cursor += durationFrames;
  }

  // 2b. Presenter: lip-sync the real talking clip to each line (PiP). Gated by
  // PRESENTER=1 since it costs ~$1-2/episode. Cached per line.
  if (PRESENTER) {
    const presenterDir = path.join(ROOT, "public", "episodes", "presenter");
    fs.mkdirSync(presenterDir, { recursive: true });
    let videoUrl = "";
    for (let i = 0; i < lines.length; i++) {
      const rel = `episodes/presenter/ep${nn}-${voiceTag}${LANG_TAG}-s${SPEED_TAG}-${i + 1}.mp4`;
      const abs = path.join(ROOT, "public", rel);
      if (force || !fs.existsSync(abs)) {
        if (!videoUrl) {
          process.stdout.write("  presenter: uploading source clip… ");
          videoUrl = await presenterVideoUrl();
          console.log("ok");
        }
        process.stdout.write(`  lipsync[${i + 1}/${lines.length}] … `);
        const audioAbs = path.join(ROOT, "public", lines[i].audioSrc);
        await lipsyncLine(videoUrl, audioAbs, abs);
        console.log("✓");
      } else {
        console.log(`  lipsync[${i + 1}/${lines.length}] cached`);
      }
      lines[i].presenterSrc = rel;
    }
  }

  const props: EpisodeReelProps = {
    no: ep.no,
    total: ep.total,
    dateLabel: ep.dateLabel,
    startClock: sprintMode === "day" ? commits[0]?.time ?? "00:00" : "00:00",
    endClock: sprintMode === "day" ? commits.at(-1)?.time ?? "23:59" : "23:59",
    commitCount: commits.length,
    commits,
    lines,
    sprintMode,
    sprintLabel: ep.sprintLabel ?? (LANG === "en" ? "COMMITS IN ONE DAY" : "КОММИТОВ ЗА ДЕНЬ"),
    hookChat: ep.hookChat,
    hookVideo: ep.hookVideo,
    hookBgSrc: ep.hookChat ? pickFace(ep.no) : undefined,
    nextTitle:
      LANG === "en"
        ? SERIES_TITLES_EN[ep.no + 1] ?? EPISODES_EN[ep.no + 1]?.title
        : SERIES_TITLES[ep.no + 1] ?? EPISODES[ep.no + 1]?.title,
    lang: LANG,
    brollSrc: pickBroll(ep.no),
    sprintVideo: pickScreens(ep.no),
  };

  const outDir = path.join(ROOT, "out", "episodes");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `ep${nn}${LANG_TAG}.props.json`), JSON.stringify(props, null, 2));

  const totalFrames = computeDurationInFrames(lines, FPS);
  console.log(`  timeline: ${lines.length} lines, ${(totalFrames / FPS).toFixed(1)}s`);

  // 3. render
  console.log("  bundling Remotion…");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion", "index.ts") });
  const composition = await selectComposition({ serveUrl, id: "EpisodeReel", inputProps: props });
  const outFile = path.join(outDir, `ep${nn}${LANG_TAG}.mp4`);
  console.log("  rendering…");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    inputProps: props,
    outputLocation: outFile,
    // Frames with a full-screen hook video + the presenter PiP decode two clips
    // at once — the default 30s per-frame delayRender timeout is too tight.
    timeoutInMilliseconds: 180000,
    concurrency: 2,
  });

  console.log(`\n✓ Done → ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
