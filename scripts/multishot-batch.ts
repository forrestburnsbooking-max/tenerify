/**
 * Batch multi-shot pipeline over all reel clip-keys (grouped activities share a key).
 * For each key produces SHOTS=3 vertical 9:16 frames, then (optionally) Kling clips.
 *
 * Shots: if the key's representative tour has a real gallery (images[] >= SHOTS) we
 * use those real photos; otherwise shot 1 = identity-preserve of the hero and shots
 * 2..N = AI angle/scene variations of the same hero (FLUX Kontext).
 *
 *   FAL_KEY=xxx npx tsx scripts/multishot-batch.ts                 # enhance ALL keys (frames, cheap)
 *   FAL_KEY=xxx npx tsx scripts/multishot-batch.ts --kling --limit 5   # also animate, 5 keys (a batch)
 *   FAL_KEY=xxx npx tsx scripts/multishot-batch.ts --kling --keys maxicat-catamaran,white-dream
 *
 * Frames → public/images/tours/_vert/<key>-<n>.jpg
 * Clips  → public/clips/<key>-<n>.mp4
 * Skip-existing throughout, so re-running advances the batch. The render step
 * (render-reels.ts) gathers <key>-1..N.mp4 per product into a multi-shot reel.
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
const KONTEXT = "fal-ai/flux-pro/kontext";
const KLING = "fal-ai/kling-video/v1.6/standard/image-to-video";
const SHOTS = 3;
const VERT_DIR = path.join(process.cwd(), "public", "images", "tours", "_vert");
const CLIP_DIR = path.join(process.cwd(), "public", "clips");

type Tour = { slug: string; title: string; category?: string; imageUrl?: string; images?: string[] };

const PRESERVE =
  "Recompose this exact photograph into a tall vertical 9:16 frame. Keep the main " +
  "subject exactly as it is — identical shapes, colours, branding and lettering — do " +
  "not redraw or invent it. Extend the scene naturally above and below to fill the " +
  "taller frame, subject centred. Enhance to clean sharp bright golden-hour quality. " +
  "Photorealistic, no text, no watermark.";

const V = "golden-hour light, tall vertical 9:16 frame, sharp, photorealistic, no text.";

// AI variations of the SAME subject for shots 2..N — a genuinely DIFFERENT angle/scene
// tuned per category (a boat-only prompt collapsed non-boats like helicopters to dupes).
function variationPrompt(category: string, shot: number): string {
  const second = shot === 2;
  switch (category) {
    case "air":
      return second
        ? `Aerial view from the aircraft looking down at the Tenerife coastline and turquoise ocean far below, the island spread out, ${V}`
        : `The same aircraft banking over the volcanic landscape and the sea, a dramatic different angle, ${V}`;
    case "water-activities":
      return second
        ? `The same water activity in close-up dynamic action, water and spray flying, big smiles, ${V}`
        : `A wider shot of the same water activity on the open turquoise sea with the coast behind, ${V}`;
    case "jetski": // jetski + parascending etc — water tow / spray action
      return second
        ? `The same activity in close-up dynamic action, spray flying over turquoise water, ${V}`
        : `A wider cinematic shot of the same activity over the open sea with the coast behind, ${V}`;
    case "buggy-quad": // buggy / quad / soul-jeep — off-road on volcanic trails
      return second
        ? `The same off-road vehicle in close-up action kicking up dust on a volcanic trail, ${V}`
        : `A wider shot of the same off-road vehicle against the volcanic Teide landscape, ${V}`;
    default: // boats: whale-watching, boat-rental, fishing
      return second
        ? `The exact same boat — identical hull, colours, branding and name — from a closer three-quarter angle with happy passengers on deck, ${V}`
        : `The exact same boat — identical hull, colours, branding and name — from a low angle near the waterline, bow pushing forward with a little spray, ${V}`;
  }
}

function resolveImageUrl(imageUrl: string): string {
  if (/^https?:/i.test(imageUrl)) return imageUrl;
  const file = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

type Submit = { statusUrl: string; responseUrl: string };
async function submit(model: string, body: Record<string, unknown>): Promise<Submit> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { status_url: string; response_url: string };
  return { statusUrl: j.status_url, responseUrl: j.response_url };
}
async function wait({ statusUrl, responseUrl }: Submit, tries: number): Promise<any> {
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < tries; i++) {
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
    }
  }
  const r = await fetch(responseUrl, { headers });
  if (!r.ok) throw new Error(`result ${r.status}: ${await r.text()}`);
  return r.json();
}
async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function enhance(srcImage: string, prompt: string, dest: string): Promise<void> {
  const j = await wait(
    await submit(KONTEXT, {
      image_url: resolveImageUrl(srcImage),
      prompt,
      aspect_ratio: "9:16",
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: "5",
    }),
    36
  );
  const url = j?.images?.[0]?.url;
  if (!url) throw new Error("no image url");
  await download(url, dest);
}
async function animate(vertFrame: string, dest: string): Promise<void> {
  const j = await wait(
    await submit(KLING, {
      image_url: resolveImageUrl(vertFrame),
      prompt:
        "Strong realistic forward motion, the scene comes alive — water moving, the " +
        "subject easing forward, gentle camera drift. Cinematic, photorealistic.",
      negative_prompt:
        "morphing, warping, distorted face, extra limbs, text, watermark, blurry, low quality, frozen, static",
      duration: "5",
      aspect_ratio: "9:16",
      cfg_scale: 0.5,
    }),
    96
  );
  const url = j?.video?.url;
  if (!url) throw new Error("no video url");
  await download(url, dest);
}

// Ordered, de-duplicated keys for all reel-eligible products.
function allKeys(): { key: string; rep: Tour }[] {
  const all = tours as Tour[];
  const skip = [...PHOTO_ONLY_CATEGORIES, ...NO_ANIMATE_CATEGORIES];
  const eligible = all.filter((t) => t.imageUrl && !skip.includes(t.category ?? ""));
  const seen = new Set<string>();
  const out: { key: string; rep: Tour }[] = [];
  for (const t of eligible) {
    const key = clipKeyForSlug(t.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    const rep = all.find((x) => x.slug === representativeSlug(key)) ?? t;
    out.push({ key, rep });
  }
  return out;
}

// Real gallery photos for the rep, de-duped — used when there are >= SHOTS of them.
function gallery(rep: Tour): string[] {
  const set: string[] = [];
  for (const p of [rep.imageUrl, ...(rep.images ?? [])]) if (p && !set.includes(p)) set.push(p);
  return set;
}

async function main() {
  if (!FAL_KEY) {
    console.error("Missing FAL_KEY. Run: FAL_KEY=xxx npx tsx scripts/multishot-batch.ts");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const doKling = args.includes("--kling");
  const limit = (() => {
    const i = args.indexOf("--limit");
    return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
  })();
  const keysArg = (() => {
    const i = args.indexOf("--keys");
    return i >= 0 ? new Set(args[i + 1].split(",")) : null;
  })();

  fs.mkdirSync(VERT_DIR, { recursive: true });
  fs.mkdirSync(CLIP_DIR, { recursive: true });

  let keys = allKeys();
  if (keysArg) keys = keys.filter((k) => keysArg.has(k.key));

  // For Kling, treat --limit as "process N keys that still need any clip" (a batch).
  let processed = 0;
  let frames = 0,
    clips = 0,
    skipped = 0,
    failed = 0;

  for (const { key, rep } of keys) {
    if (processed >= limit) break;
    const gal = gallery(rep);
    const useReal = gal.length >= SHOTS;

    // --- enhance phase: ensure SHOTS vertical frames exist ---
    let touchedKey = false;
    for (let n = 1; n <= SHOTS; n++) {
      const dest = path.join(VERT_DIR, `${key}-${n}.jpg`);
      if (fs.existsSync(dest)) {
        skipped++;
        continue;
      }
      touchedKey = true;
      try {
        const src = useReal ? gal[n - 1] : gal[0];
        const prompt = n === 1 || useReal ? PRESERVE : variationPrompt(rep.category ?? "", n);
        process.stdout.write(`→ ${key} frame ${n} ${useReal ? "(real)" : n === 1 ? "(preserve)" : "(variation)"} … `);
        await enhance(src, prompt, dest);
        frames++;
        console.log("✓");
      } catch (err) {
        failed++;
        console.log("✗", (err as Error).message);
      }
    }

    // --- kling phase (optional) ---
    if (doKling) {
      for (let n = 1; n <= SHOTS; n++) {
        const frame = path.join(VERT_DIR, `${key}-${n}.jpg`);
        const dest = path.join(CLIP_DIR, `${key}-${n}.mp4`);
        if (!fs.existsSync(frame)) continue;
        if (fs.existsSync(dest)) {
          skipped++;
          continue;
        }
        touchedKey = true;
        try {
          process.stdout.write(`→ ${key} clip ${n} → Kling … `);
          await animate(`/images/tours/_vert/${key}-${n}.jpg`, dest);
          clips++;
          console.log("✓");
        } catch (err) {
          failed++;
          console.log("✗", (err as Error).message);
        }
      }
    }

    if (touchedKey) processed++;
  }

  console.log(`\nKeys total=${keys.length} processed-this-run=${processed}`);
  console.log(`frames=${frames} clips=${clips} skipped=${skipped} failed=${failed}`);
  console.log(doKling ? "Render: npx tsx scripts/render-reels.ts --force" : "Frames done. Add --kling --limit 5 to animate a batch.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
