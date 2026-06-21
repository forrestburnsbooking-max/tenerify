/**
 * Set a tour's imageUrl by slug, preserving the rest of data/tours.json.
 *   npx tsx scripts/set-photo.ts <slug> <imageUrlOrLocalPath>
 */
import fs from "fs";
import path from "path";

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error("usage: npx tsx scripts/set-photo.ts <slug> <imageUrl>");
  process.exit(1);
}

const file = path.join(process.cwd(), "data", "tours.json");
const tours = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
const tour = tours.find((t) => t.slug === slug);
if (!tour) {
  console.error(`No tour with slug "${slug}"`);
  process.exit(1);
}

const old = tour.imageUrl;
tour.imageUrl = url;
fs.writeFileSync(file, JSON.stringify(tours, null, 2) + "\n");
console.log(`✓ ${slug}\n  old: ${old}\n  new: ${url}`);
