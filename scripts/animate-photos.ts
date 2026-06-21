/**
 * Animate every tour photo into a short looping clip via the Kling image-to-video
 * model on fal.ai, then save it to public/clips/<slug>.mp4 so the reels can use it.
 *
 *   FAL_KEY=xxxxx npx tsx scripts/animate-photos.ts                 # all tours with a photo
 *   FAL_KEY=xxxxx npx tsx scripts/animate-photos.ts diving-puerto-colon   # one tour
 *
 * Already-animated tours are skipped, so it's safe to re-run (resumes where it stopped).
 * Get a key at https://fal.ai/dashboard/keys
 */
import fs from "fs";
import path from "path";
import tours from "../data/tours.json";
import {
  clipKeyForSlug,
  representativeSlug,
  PHOTO_ONLY_CATEGORIES,
  NO_ANIMATE_CATEGORIES,
} from "../remotion/clip-groups";

const FAL_KEY = process.env.FAL_KEY;
const MODEL = "fal-ai/kling-video/v1.6/standard/image-to-video";
const NEGATIVE = "morphing, warping, distorted face, extra limbs, text, watermark, blurry, low quality, frozen, static";

type Tour = {
  slug: string;
  title: string;
  category?: string;
  imageUrl?: string;
};

// Tailored motion for shared-clip groups — explicit forward motion so Kling moves
// the subject through the scene rather than just rippling the water.
const GROUP_PROMPTS: Record<string, string> = {
  jetski:
    "The jet ski accelerates and races forward across the frame at high speed, throwing up a big fan of spray, churning a white wake behind it, water rushing past, the rider leaning into the turn. Fast dynamic action, cinematic tracking shot, photorealistic.",
  buggy:
    "The buggy drives forward fast along the dirt trail, kicking up a cloud of dust, wheels spinning, the volcanic landscape rushing past the camera. Fast dynamic motion, cinematic tracking shot, photorealistic.",
  quad:
    "The quad bikes ride forward fast along the mountain trail, wheels spinning, dust trailing behind, scenery rushing past. Dynamic motion, cinematic tracking shot, photorealistic.",
  sailing:
    "The sailing boat surges forward over the swell, sails full of wind, the bow cutting through the water and pushing a white wake behind it, sea spray flying. Strong forward motion, cinematic tracking shot, photorealistic.",
  paddle:
    "The paddler strokes and glides forward across the water, the board moving ahead, ripples and a small wake spreading behind, sunlight on the sea. Smooth forward motion, photorealistic.",
};

// A motion hint tuned to each kind of experience — drives real forward movement.
function promptFor(tour: Tour): string {
  const base = "Strong realistic forward motion, cinematic tracking shot, photorealistic.";
  const byCategory: Record<string, string> = {
    jetski:
      "The jet ski races forward across the frame at speed, throwing up spray, churning a white wake behind it, water rushing past.",
    "buggy-quad":
      "The vehicle drives forward fast along the dirt trail, kicking up dust, wheels spinning, the landscape rushing past.",
    "water-activities":
      "Fast watery action: the craft moves forward across the water, spray flying, a wake churning behind, sun sparkling on the sea.",
    "whale-watching":
      "The boat moves forward across the open sea, cutting through the rolling swell, a white wake widening behind it, spray drifting, a dolphin surfacing nearby.",
    "boat-rental":
      "The motorboat drives forward across the water, the bow lifting, a white wake spreading behind it, water rushing past the hull, sunlight glinting on the sea.",
    fishing:
      "The fishing boat powers forward over open water, the wake churning behind it, swell rolling past, spray in the air.",
    air: "Flying forward over the landscape, the ground gliding past below, clouds drifting, a real sense of forward flight.",
    parks:
      "Water rushing and splashing down the slides, spray flying, an energetic lively scene full of movement.",
  };
  const hint = byCategory[tour.category ?? ""] ?? "The scene comes alive with clear, natural movement.";
  return `${hint} ${base}`;
}

// fal needs a public HTTPS URL or a Data URI. Local /images/... paths (served from
// public/) aren't reachable by fal, so inline them as a base64 Data URI.
function resolveImageUrl(imageUrl: string): string {
  if (/^https?:/i.test(imageUrl)) return imageUrl;
  const file = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
  const b64 = fs.readFileSync(file).toString("base64");
  return `data:${mime};base64,${b64}`;
}

type SubmitResult = { statusUrl: string; responseUrl: string };

async function falSubmit(imageUrl: string, prompt: string): Promise<SubmitResult> {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      negative_prompt: NEGATIVE,
      duration: "5",
      aspect_ratio: "9:16", // vertical, ready for Reels — no cropping needed
      cfg_scale: 0.5,
    }),
  });
  if (!res.ok) throw new Error(`submit failed ${res.status}: ${await res.text()}`);
  // fal returns the exact status/response URLs (shorter base path than the model id).
  const json = (await res.json()) as { status_url: string; response_url: string };
  return { statusUrl: json.status_url, responseUrl: json.response_url };
}

async function falWait({ statusUrl, responseUrl }: SubmitResult): Promise<string> {
  const headers = { Authorization: `Key ${FAL_KEY}` };

  // Kling takes ~1–3 min; poll up to ~8 min. The status endpoint occasionally
  // returns an empty/invalid body on a 200 — tolerate it and keep polling.
  for (let i = 0; i < 96; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const s = await fetch(statusUrl, { headers });
      if (!s.ok) continue;
      const text = await s.text();
      if (!text) continue;
      const sj = JSON.parse(text) as { status: string };
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error("generation FAILED");
    } catch (err) {
      if ((err as Error).message === "generation FAILED") throw err;
      // transient parse/network blip — keep polling
    }
  }
  const r = await fetch(responseUrl, { headers });
  if (!r.ok) throw new Error(`result failed ${r.status}: ${await r.text()}`);
  const rj = (await r.json()) as { video?: { url: string } };
  if (!rj.video?.url) throw new Error("no video url in result");
  return rj.video.url;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  if (!FAL_KEY) {
    console.error("Missing FAL_KEY. Get one at https://fal.ai/dashboard/keys and run:\n  FAL_KEY=xxx npx tsx scripts/animate-photos.ts");
    process.exit(1);
  }

  const slugArg = process.argv[2];
  const all = tours as Tour[];
  const skipCategories = [...PHOTO_ONLY_CATEGORIES, ...NO_ANIMATE_CATEGORIES];
  const wanted = (slugArg ? all.filter((t) => t.slug === slugArg) : all)
    .filter((t) => t.imageUrl)
    .filter((t) => !skipCategories.includes(t.category ?? ""));

  // Collapse to one job per clip key (grouped activities share a clip).
  const jobs = new Map<string, Tour>();
  for (const tour of wanted) {
    const key = clipKeyForSlug(tour.slug);
    if (jobs.has(key)) continue;
    const rep = all.find((t) => t.slug === representativeSlug(key)) ?? tour;
    if (rep.imageUrl) jobs.set(key, rep);
  }

  const outDir = path.join(process.cwd(), "public", "clips");
  fs.mkdirSync(outDir, { recursive: true });

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const [key, tour] of jobs) {
    const dest = path.join(outDir, `${key}.mp4`);
    if (fs.existsSync(dest)) {
      skipped++;
      console.log("· skip (exists)", key);
      continue;
    }
    try {
      process.stdout.write(`→ ${key} (from ${tour.slug}) … `);
      const prompt = GROUP_PROMPTS[key] ?? promptFor(tour);
      const submitted = await falSubmit(resolveImageUrl(tour.imageUrl!), prompt);
      const videoUrl = await falWait(submitted);
      await download(videoUrl, dest);
      done++;
      console.log("✓");
    } catch (err) {
      failed++;
      console.log("✗", (err as Error).message);
    }
  }

  console.log(`\nClips needed for ${wanted.length} tours → ${jobs.size} unique generations.`);

  console.log(`\nDone. animated=${done} skipped=${skipped} failed=${failed}`);
  console.log("Now render the reels:  npm run reels:render");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
