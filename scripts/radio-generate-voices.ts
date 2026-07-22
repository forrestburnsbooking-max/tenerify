/**
 * Radio Tenerify — voice renderer.
 * Reads data/radio/segments/latest.json (from npm run radio:news) and renders
 * each line to audio via ElevenLabs, saving mp3s to public/radio/segments/latest/.
 *
 * Requires ELEVENLABS_API_KEY in .env.local (get one at elevenlabs.io).
 * Run: npm run radio:voices
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

// Load .env.local so `npm run radio:voices` works without exporting vars by hand.
try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on real env */
}

// Supports two modes:
//   npx tsx scripts/radio-generate-voices.ts                 → renders the hourly news segment
//   npx tsx scripts/radio-generate-voices.ts --special <slug> → renders a special-topic segment
const specialIdx = process.argv.indexOf("--special");
const specialSlug = specialIdx !== -1 ? process.argv[specialIdx + 1] : null;

const SCRIPT_FILE = specialSlug
  ? path.join(process.cwd(), "data", "radio", "segments", "special", `${specialSlug}.json`)
  : path.join(process.cwd(), "data", "radio", "segments", "latest.json");
const OUT_DIR = specialSlug
  ? path.join(process.cwd(), "public", "radio", "segments", "special", specialSlug)
  : path.join(process.cwd(), "public", "radio", "segments", "latest");
const PUBLIC_PREFIX = specialSlug ? `/radio/segments/special/${specialSlug}` : "/radio/segments/latest";

// Two default ElevenLabs voice IDs (stock library voices — swap for your own picks
// in the ElevenLabs voice library at https://elevenlabs.io/app/voice-library).
const VOICE_IDS: Record<string, string> = {
  Alex: "onwK4e9ZLuTAKqWW03F9", // "Daniel" — steady broadcaster
  Mia: "EXAVITQu4vr4xnSDxMaL", // "Sarah" — mature, confident
};

async function renderLine(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY is not set.");
    console.error("1. Create an account at https://elevenlabs.io");
    console.error("2. Grab an API key from your profile settings");
    console.error("3. Add ELEVENLABS_API_KEY=... to .env.local");
    process.exit(1);
  }
  if (!fs.existsSync(SCRIPT_FILE)) {
    console.error(`No script found at ${SCRIPT_FILE} — run "npm run radio:news" first.`);
    process.exit(1);
  }

  const script = JSON.parse(fs.readFileSync(SCRIPT_FILE, "utf-8")) as {
    generatedAt: string;
    lines: { speaker: "Alex" | "Mia"; text: string }[];
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clear previous segment's audio so stale lines don't linger.
  for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));

  const manifest: { speaker: string; text: string; file: string }[] = [];
  for (let i = 0; i < script.lines.length; i++) {
    const line = script.lines[i];
    const voiceId = VOICE_IDS[line.speaker] ?? VOICE_IDS.Alex;
    console.log(`Rendering line ${i + 1}/${script.lines.length} (${line.speaker})...`);
    const audio = await renderLine(line.text, voiceId, apiKey);
    const fileName = `line-${String(i).padStart(2, "0")}.mp3`;
    fs.writeFileSync(path.join(OUT_DIR, fileName), audio);
    manifest.push({ speaker: line.speaker, text: line.text, file: `${PUBLIC_PREFIX}/${fileName}` });
  }

  // Stitch every line into one continuous episode.mp3 — podcast platforms need
  // a single enclosure file per episode, not a scatter of per-line clips.
  const listFile = path.join(OUT_DIR, "concat-list.txt");
  const episodeFile = path.join(OUT_DIR, "episode.mp3");
  fs.writeFileSync(
    listFile,
    manifest.map((m) => `file '${path.join(OUT_DIR, path.basename(m.file))}'`).join("\n")
  );
  const ffmpegResult = spawnSync(
    ffmpegPath as unknown as string,
    ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", episodeFile],
    { encoding: "utf-8" }
  );
  if (ffmpegResult.status !== 0) {
    throw new Error(`ffmpeg failed: ${ffmpegResult.stderr}`);
  }
  const ffmpegOutput = ffmpegResult.stderr ?? "";
  fs.unlinkSync(listFile);

  const durationMatches = [...ffmpegOutput.matchAll(/time=(\d+):(\d+):(\d+\.\d+)/g)];
  const lastMatch = durationMatches[durationMatches.length - 1];
  const durationSeconds = lastMatch
    ? Number(lastMatch[1]) * 3600 + Number(lastMatch[2]) * 60 + Number(lastMatch[3])
    : null;
  const episodeSizeBytes = fs.statSync(episodeFile).size;

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: script.generatedAt,
        title: (script as { title?: string }).title,
        lines: manifest,
        episodeFile: `${PUBLIC_PREFIX}/episode.mp3`,
        episodeDurationSeconds: durationSeconds,
        episodeSizeBytes,
      },
      null,
      2
    )
  );
  console.log(`Done — ${manifest.length} lines rendered + stitched to ${path.relative(process.cwd(), episodeFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
