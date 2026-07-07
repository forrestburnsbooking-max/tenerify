// Fetch one photo per restaurant from Google Places API (New) and wire it
// into data/restaurants.json. Photo author attributions are saved alongside
// in data/restaurant-photo-credits.json so we can render credits if needed.
//
// Usage: node scripts/fetch-restaurant-photos.mjs [--only <slug>]

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data", "restaurants.json");
const CREDITS = path.join(ROOT, "data", "restaurant-photo-credits.json");
const OUT_DIR = path.join(ROOT, "public", "images", "restaurants");

const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
const KEY = env.match(/^GOOGLE_PLACES_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("GOOGLE_PLACES_API_KEY not found in .env.local");
  process.exit(1);
}

const onlyIdx = process.argv.indexOf("--only");
const onlySlug = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

fs.mkdirSync(OUT_DIR, { recursive: true });

const restaurants = JSON.parse(fs.readFileSync(DATA, "utf-8"));
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, "utf-8")) : {};

async function searchPlace(r) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos",
    },
    body: JSON.stringify({ textQuery: `${r.name} ${r.area} Tenerife` }),
  });
  if (!res.ok) throw new Error(`search ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places?.[0] ?? null;
}

// Prefer a roughly-landscape photo (cards are 16:10); fall back to the first.
function pickPhoto(photos) {
  if (!photos?.length) return null;
  return photos.find((p) => p.widthPx >= p.heightPx) ?? photos[0];
}

async function downloadPhoto(photoName, dest) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

let ok = 0, skipped = 0, failed = 0;

for (const r of restaurants) {
  if (onlySlug && r.slug !== onlySlug) continue;
  if (r.imageUrl && !onlySlug) { skipped++; continue; }

  try {
    const place = await searchPlace(r);
    if (!place) {
      console.log(`✗ ${r.slug}: no search result`);
      failed++;
      continue;
    }
    const photo = pickPhoto(place.photos);
    if (!photo) {
      console.log(`✗ ${r.slug}: place found (${place.displayName?.text}) but no photos`);
      failed++;
      continue;
    }
    const dest = path.join(OUT_DIR, `${r.slug}.jpg`);
    const bytes = await downloadPhoto(photo.name, dest);
    r.imageUrl = `/images/restaurants/${r.slug}.jpg`;
    credits[r.slug] = {
      matchedName: place.displayName?.text,
      matchedAddress: place.formattedAddress,
      authors: photo.authorAttributions?.map((a) => a.displayName) ?? [],
    };
    console.log(`✓ ${r.slug}: ${place.displayName?.text} (${Math.round(bytes / 1024)}KB, ${photo.widthPx}x${photo.heightPx})`);
    ok++;
  } catch (e) {
    console.log(`✗ ${r.slug}: ${e.message}`);
    failed++;
  }
  await new Promise((res) => setTimeout(res, 200));
}

fs.writeFileSync(DATA, JSON.stringify(restaurants, null, 2) + "\n");
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + "\n");
console.log(`\nDone: ${ok} ok, ${skipped} skipped (already had photo), ${failed} failed`);
