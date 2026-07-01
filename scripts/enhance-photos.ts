/**
 * Turn each animated tour's hero photo into a vertical 9:16 "first frame" via the
 * FLUX Kontext image model on fal.ai, saved to public/images/tours/_vert/<key>.jpg.
 *
 * Why: Kling is image-to-video — it keeps the input frame's shape. Feeding it a
 * vertical frame makes it return a ~9:16 clip that FILLS the reel (no letterbox
 * bars). Kontext outpaints the sea/sky to a tall canvas and enhances quality while
 * KEEPING THE REAL BOAT (branding, hull, name) — the authenticity we care about.
 *
 *   FAL_KEY=xxx npx tsx scripts/enhance-photos.ts                  # all animated clip keys
 *   FAL_KEY=xxx npx tsx scripts/enhance-photos.ts maxicat-catamaran   # one tour (test)
 *   FAL_KEY=xxx npx tsx scripts/enhance-photos.ts --force kosamui      # overwrite existing
 *
 * Already-enhanced keys are skipped, so re-running resumes where it stopped.
 * Run this BEFORE animate-photos.ts (which should read the _vert frames). Eyeball
 * the result on ONE boat (e.g. maxicat-catamaran) and confirm the boat survived
 * before batching. Get a key at https://fal.ai/dashboard/keys
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
const MODEL = "fal-ai/flux-pro/kontext";
const OUT_DIR = path.join(process.cwd(), "public", "images", "tours", "_vert");

type Tour = {
  slug: string;
  title: string;
  category?: string;
  imageUrl?: string;
};

// Generic activities — one craft looks like another, so let Kontext recompose
// freely (centre the subject, clean it up). Everything else defaults to PRESERVE:
// keep the exact, recognisable vessel and only outpaint the surrounding sea/sky.
const GENERIC_KEYS = new Set(["jetski", "buggy", "quad", "paddle"]);

const PRESERVE_PROMPT =
  "Recompose this exact photograph into a tall vertical 9:16 frame. Keep the boat " +
  "exactly as it is — identical hull shape, colours, deck, branding, name and any " +
  "lettering — do not redraw, restyle or invent the vessel. Extend the open sea " +
  "below and the sky above naturally to fill the taller frame, with the boat " +
  "centred. Enhance to clean, sharp, bright golden-hour quality. Photorealistic, " +
  "no text, no watermark.";

// Per-generic-key recomposition prompts (subject identity doesn't matter here).
const GENERIC_PROMPTS: Record<string, string> = {
  jetski:
    "The same jet ski, centred, racing across open turquoise water throwing up " +
    "spray, golden-hour light, clean vertical 9:16 composition, sharp enhanced " +
    "quality, photorealistic, no text.",
  buggy:
    "The same buggy, centred on a volcanic dirt trail kicking up dust, golden-hour " +
    "light, clean vertical 9:16 composition, sharp enhanced quality, photorealistic, no text.",
  quad:
    "The same quad bikes, centred on a mountain trail, golden-hour light, clean " +
    "vertical 9:16 composition, sharp enhanced quality, photorealistic, no text.",
  paddle:
    "The same paddle board and paddler, centred on calm turquoise water, golden-hour " +
    "light, clean vertical 9:16 composition, sharp enhanced quality, photorealistic, no text.",
};

function promptFor(key: string): string {
  return GENERIC_KEYS.has(key) ? GENERIC_PROMPTS[key] ?? PRESERVE_PROMPT : PRESERVE_PROMPT;
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
      aspect_ratio: "9:16", // vertical first frame → Kling returns a 9:16 clip
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: "5",
    }),
  });
  if (!res.ok) throw new Error(`submit failed ${res.status}: ${await res.text()}`);
  // fal returns the exact status/response URLs (shorter base path than the model id).
  const json = (await res.json()) as { status_url: string; response_url: string };
  return { statusUrl: json.status_url, responseUrl: json.response_url };
}

async function falWait({ statusUrl, responseUrl }: SubmitResult): Promise<string> {
  const headers = { Authorization: `Key ${FAL_KEY}` };
  // Kontext is fast (~10–30s); poll up to ~3 min. Tolerate transient empty bodies.
  for (let i = 0; i < 36; i++) {
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
  const rj = (await r.json()) as { images?: { url: string }[] };
  const url = rj.images?.[0]?.url;
  if (!url) throw new Error("no image url in result");
  return url;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!FAL_KEY) {
    console.error("Missing FAL_KEY. Get one at https://fal.ai/dashboard/keys and run:\n  FAL_KEY=xxx npx tsx scripts/enhance-photos.ts");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const slugArg = args.find((a) => !a.startsWith("--"));

  const all = tours as Tour[];
  const skipCategories = [...PHOTO_ONLY_CATEGORIES, ...NO_ANIMATE_CATEGORIES];
  const wanted = (slugArg ? all.filter((t) => t.slug === slugArg) : all)
    .filter((t) => t.imageUrl)
    .filter((t) => !skipCategories.includes(t.category ?? ""));

  if (slugArg && wanted.length === 0) {
    console.error(`No animated tour with a photo matches "${slugArg}".`);
    process.exit(1);
  }

  // Collapse to one job per clip key (grouped activities share a frame), using the
  // representative's photo — exactly the granularity animate-photos.ts consumes.
  const jobs = new Map<string, Tour>();
  for (const tour of wanted) {
    const key = clipKeyForSlug(tour.slug);
    if (jobs.has(key)) continue;
    const rep = all.find((t) => t.slug === representativeSlug(key)) ?? tour;
    if (rep.imageUrl) jobs.set(key, rep);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const [key, tour] of jobs) {
    const dest = path.join(OUT_DIR, `${key}.jpg`);
    if (fs.existsSync(dest) && !force) {
      skipped++;
      console.log("· skip (exists)", key);
      continue;
    }
    try {
      process.stdout.write(`→ ${key} (from ${tour.slug}) … `);
      const submitted = await falSubmit(resolveImageUrl(tour.imageUrl!), promptFor(key));
      const imageUrl = await falWait(submitted);
      await download(imageUrl, dest);
      done++;
      console.log("✓", path.relative(process.cwd(), dest));
    } catch (err) {
      failed++;
      console.log("✗", (err as Error).message);
    }
  }

  console.log(`\n${jobs.size} vertical first frames targeted.`);
  console.log(`Done. enhanced=${done} skipped=${skipped} failed=${failed}`);
  console.log("Eyeball public/images/tours/_vert/ — confirm the boat survived, then run npm run reels:animate.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
