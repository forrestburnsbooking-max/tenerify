/**
 * Multi-shot reel pipeline for ONE product: take its hero + gallery photos
 * (data/tours.json `imageUrl` + `images[]`), turn EACH into a vertical 9:16
 * first frame (FLUX Kontext), then animate EACH into a Kling clip. The render
 * step sequences the clips as cuts (see remotion/TourReel multi-shot path).
 *
 *   FAL_KEY=xxx npx tsx scripts/multishot.ts maxicat-catamaran              # enhance + animate
 *   FAL_KEY=xxx npx tsx scripts/multishot.ts maxicat-catamaran --enhance    # frames only (cheap)
 *
 * Frames → public/images/tours/_vert/<slug>-<n>.jpg
 * Clips  → public/clips/<slug>-<n>.mp4
 * Skip-existing, so safe to re-run. Get a key at https://fal.ai/dashboard/keys
 */
import fs from "fs";
import path from "path";
import tours from "../data/tours.json";

const FAL_KEY = process.env.FAL_KEY;
const KONTEXT = "fal-ai/flux-pro/kontext";
const KLING = "fal-ai/kling-video/v1.6/standard/image-to-video";

const PRESERVE_PROMPT =
  "Recompose this exact photograph into a tall vertical 9:16 frame. Keep the main " +
  "subject exactly as it is — identical shapes, colours, branding and lettering — " +
  "do not redraw or invent it. Extend the scene naturally above and below to fill " +
  "the taller frame, subject centred. Enhance to clean, sharp, bright golden-hour " +
  "quality. Photorealistic, no text, no watermark.";

const MOTION_PROMPT =
  "Strong realistic forward motion, the scene comes alive — water moving, the boat " +
  "easing forward, gentle camera drift. Cinematic, photorealistic.";
const MOTION_NEG =
  "morphing, warping, distorted face, extra limbs, text, watermark, blurry, low quality, frozen, static";

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

async function enhance(src: string, dest: string): Promise<void> {
  const sub = await submit(KONTEXT, {
    image_url: resolveImageUrl(src),
    prompt: PRESERVE_PROMPT,
    aspect_ratio: "9:16",
    guidance_scale: 3.5,
    num_images: 1,
    output_format: "jpeg",
    safety_tolerance: "5",
  });
  const j = await wait(sub, 36);
  const url = j?.images?.[0]?.url;
  if (!url) throw new Error("no image url");
  await download(url, dest);
}

async function animate(vertFrame: string, dest: string): Promise<void> {
  const sub = await submit(KLING, {
    image_url: resolveImageUrl(vertFrame),
    prompt: MOTION_PROMPT,
    negative_prompt: MOTION_NEG,
    duration: "5",
    aspect_ratio: "9:16",
    cfg_scale: 0.5,
  });
  const j = await wait(sub, 96);
  const url = j?.video?.url;
  if (!url) throw new Error("no video url");
  await download(url, dest);
}

async function main() {
  if (!FAL_KEY) {
    console.error("Missing FAL_KEY. Run: FAL_KEY=xxx npx tsx scripts/multishot.ts <slug>");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const enhanceOnly = args.includes("--enhance");
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    console.error("Usage: npx tsx scripts/multishot.ts <slug> [--enhance]");
    process.exit(1);
  }

  const tour = (tours as any[]).find((t) => t.slug === slug);
  if (!tour) throw new Error(`no tour ${slug}`);

  // hero + gallery, de-duplicated, in order.
  const sources: string[] = [];
  for (const p of [tour.imageUrl, ...(tour.images ?? [])]) {
    if (p && !sources.includes(p)) sources.push(p);
  }
  if (sources.length < 2) throw new Error(`${slug} has <2 distinct photos — pick another product`);

  const vertDir = path.join(process.cwd(), "public", "images", "tours", "_vert");
  const clipDir = path.join(process.cwd(), "public", "clips");
  fs.mkdirSync(vertDir, { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });

  console.log(`${slug}: ${sources.length} shots`);

  for (let i = 0; i < sources.length; i++) {
    const n = i + 1;
    const frame = path.join(vertDir, `${slug}-${n}.jpg`);
    if (fs.existsSync(frame)) {
      console.log(`  shot ${n}: frame exists`);
    } else {
      process.stdout.write(`  shot ${n}: enhance ${sources[i]} … `);
      await enhance(sources[i], frame);
      console.log("✓");
    }
    if (enhanceOnly) continue;

    const clip = path.join(clipDir, `${slug}-${n}.mp4`);
    if (fs.existsSync(clip)) {
      console.log(`  shot ${n}: clip exists`);
    } else {
      process.stdout.write(`  shot ${n}: animate → Kling … `);
      await animate(`/images/tours/_vert/${slug}-${n}.jpg`, clip);
      console.log("✓");
    }
  }

  console.log(enhanceOnly ? "\nFrames done. Drop --enhance to animate." : "\nFrames + clips done. Render the multi-shot reel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
