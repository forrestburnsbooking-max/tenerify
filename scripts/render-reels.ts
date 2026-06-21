/**
 * Batch-render vertical Reels for tours from data/tours.json.
 *
 *   npx tsx scripts/render-reels.ts                 # all tours that have an image
 *   npx tsx scripts/render-reels.ts diving-puerto-colon   # a single tour by slug
 *
 * Output: out/reels/<slug>.mp4 (1080x1920, h264).
 */
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import tours from "../data/tours.json";
import { clipKeyForSlug, PHOTO_ONLY_CATEGORIES } from "../remotion/clip-groups";

type Tour = {
  slug: string;
  title: string;
  category?: string;
  priceFrom: number;
  duration?: string;
  minAge?: number;
  imageUrl?: string;
  languages?: string[];
  description?: string;
};

// First sentence of the description, trimmed to a punchy length.
function firstSentence(desc?: string): string {
  const text = (desc ?? "").replace(/\s+/g, " ").trim();
  const end = text.search(/[.!?]/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  return sentence.length > 90 ? sentence.slice(0, 87).trimEnd() + "…" : sentence;
}

async function main() {
  const slugArg = process.argv[2];
  const all = tours as Tour[];
  // Photo-only categories (cars, parks, buses) get NO reel at all.
  const list = slugArg
    ? all.filter((t) => t.slug === slugArg)
    : all.filter((t) => t.imageUrl && !PHOTO_ONLY_CATEGORIES.includes(t.category ?? ""));

  if (list.length === 0) {
    console.error(slugArg ? `No tour with slug "${slugArg}"` : "No tours with images");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "out", "reels");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Bundling Remotion project… (${list.length} reel${list.length > 1 ? "s" : ""})`);
  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
  });

  const force = process.argv.includes("--force");
  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const tour of list) {
    const outFile = path.join(outDir, `${tour.slug}.mp4`);
    if (!force && fs.existsSync(outFile)) {
      skipped++;
      continue;
    }

    const inputProps = {
      title: tour.title,
      priceFrom: tour.priceFrom,
      duration: tour.duration ?? null,
      minAge: tour.minAge ?? null,
      imageUrl: tour.imageUrl ?? "",
      category: tour.category ?? "",
      languages: tour.languages ?? [],
      tagline: firstSentence(tour.description),
      clip: (() => {
        const key = clipKeyForSlug(tour.slug);
        return fs.existsSync(path.join(process.cwd(), "public", "clips", `${key}.mp4`))
          ? `${key}.mp4`
          : "";
      })(),
    };

    try {
      const composition = await selectComposition({ serveUrl, id: "TourReel", inputProps });
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        inputProps,
        outputLocation: outFile,
      });
      done++;
      console.log("✓", tour.slug);
    } catch (err) {
      failed++;
      console.log("✗", tour.slug, "—", (err as Error).message.split("\n")[0]);
    }
  }

  console.log(`\nDone → ${outDir}  (rendered=${done} skipped=${skipped} failed=${failed})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
