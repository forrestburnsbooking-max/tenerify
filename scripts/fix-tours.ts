/**
 * Post-processes data/tours.json:
 * - Generates proper titles from slugs
 * - Extracts real prices from description text ("from 180 €")
 * - Cleans description junk (language list, "Book now", etc.)
 * Run: npx tsx scripts/fix-tours.ts
 */

import fs from "fs";
import path from "path";

type Tour = {
  slug: string;
  title: string;
  category: string;
  duration?: string;
  price: string;
  description: string;
  included?: string;
  url: string;
};

// Manual price overrides (confirmed from WebFetch) for tours where auto-extract fails
const PRICE_OVERRIDES: Record<string, string> = {
  "buggy-costa-adventure": "From €180 (2-seat) / €240 (4-seat)",
  "buggy-off-road": "From €180 (2-seat) / €240 (4-seat)",
  "2-hours-buggy-trip": "From €130 (2-seat)",
  "coastal-quads": "From €90 (single) / €110 (double)",
  "quad-sunset-tour": "From €120 (single) / €140 (double)",
  "quad-teide-tour": "From €120 (single) / €140 (double)",
  "quad-masca-tour": "From €120 (single) / €140 (double)",
  "quad-off-road-tour": "From €120 (single) / €140 (double)",
  "white-paradise-catamaran": "From €49 (adult) / €25 (child)",
  "maxicat-catamaran": "From €40 (adult) / €19 (child)",
  "loro-parque": "€44 (adult) / €32 (child 3–11)",
  "siam-park": "€44 (adult) / €32 (child 3–11)",
  "jungle-park": "From €27 (adult)",
  "aqualand": "From €27 (adult)",
};

// Manual title overrides for slugs where generated title isn't readable
const TITLE_OVERRIDES: Record<string, string> = {
  "buggy-costa-adventure": "Buggy – South Coast Adventure (3h)",
  "buggy-sunset-adventure": "Buggy – Sunset Adventure (3h)",
  "buggy-teide-adventure": "Buggy – Teide Adventure (3h)",
  "buggy-off-road": "Buggy – Extreme Off-Road (3h)",
  "2-hours-buggy-trip": "Buggy – Quick Ride (2h)",
  "coastal-quads": "Quad – Coastal Tour (2-3h)",
  "quad-sunset-tour": "Quad – Sunset Tour (3h)",
  "quad-teide-tour": "Quad – Teide Tour (3h)",
  "quad-masca-tour": "Quad – Masca Tour (4h)",
  "quad-off-road-tour": "Quad – Off-Road Forest (3h)",
  "jet-ski-puerto-colon": "Jet Ski Safari – Puerto Colón (1h)",
  "five-star-catamaran": "Five Star Catamaran – Whale Watching & Snorkel (3h)",
  "white-paradise-catamaran": "White Paradise Catamaran – Eco Sailing (3h)",
  "maxicat-catamaran": "Maxicat Catamaran – Relax Cruise (3h)",
  "royal-delfin-boat": "Royal Delfín – Underwater View Catamaran (4.5h)",
  "lady-sunshine-yacht-private-charter": "Lady Sunshine – Private Yacht Charter",
  "loro-parque": "Loro Parque – Zoo & Shows",
  "siam-park": "Siam Park – Best Water Park in the World",
  "jungle-park": "Jungle Park – Birds & Animals",
  "aqualand": "Aqualand – Water Park with Dolphins",
  "twin-ticket-loro-parque-siam-park": "Twin Ticket – Loro Parque + Siam Park",
  "helidream-helicopter-tour": "Helicopter Tour – Tenerife from the Sky",
  "paragliding": "Paragliding – Bird's Eye View of Tenerife",
  "diving-puerto-colon": "Scuba Diving – Puerto Colón",
  "kayaking-stand-up-paddle-los-cristianos": "Kayaking & SUP – Los Cristianos (2h)",
  "flamenco-show-sala-coliseo": "Flamenco Show – Sala Coliseo",
  "medieval-show": "Medieval Show – Castillo San Miguel (3h)",
  "scandal-dinner-show": "Scandal Dinner Show – Costa Adeje",
  "la-gomera": "Day Trip – La Gomera Island (10h)",
  "gran-canaria": "Day Trip – Gran Canaria Island (11h)",
  "teide-tour-cable-car": "Teide Tour with Cable Car (8h)",
};

function extractRealPrice(description: string): string | null {
  // Look for "from X €" where X is a plausible tour price (≥15)
  const matches = [...description.matchAll(/from\s+(\d+(?:[.,]\d+)?)\s*€/gi)];
  for (const m of matches) {
    const val = parseFloat(m[1].replace(",", "."));
    if (val >= 15) return `From €${val}`;
  }
  // Look for "X€" standalone with no decimal weirdness
  const matches2 = [...description.matchAll(/(\d{2,4})€/g)];
  for (const m of matches2) {
    const val = parseFloat(m[1]);
    if (val >= 15 && val <= 2000) return `From €${val}`;
  }
  return null;
}

function cleanDescription(desc: string): string {
  return desc
    // Remove language list at start
    .replace(/^(?:Deutsch|English|Español|Français|Italiano|Neerlandés|Rumano|Русский)[,\s]+/gi, "")
    // Remove "from X € Book now..." boilerplate
    .replace(/from\s+\d+\s*€\s*Book now.*?(?:Free cancellation\s*)?(?:Description\s*Information\s*Map\s*Q&A\s*)?/gi, "")
    // Remove bullet character
    .replace(/^・\s*/, "")
    // Remove SVG/URL junk
    .replace(/\/\/www\.w3\.org[^\s]*/g, "")
    .replace(/\/\/www\.google\.com\/maps[^\s]*/g, "")
    .replace(/class="[^"]*"[^>]*/g, "")
    .replace(/width="[^"]*"/g, "")
    .replace(/viewBox="[^"]*"/g, "")
    // Decode HTML entities
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Cap length
    .slice(0, 280);
}

function fixDuration(slug: string, duration?: string): string | undefined {
  // Exclude garbage durations like "24h", "48h", "30h" (from midnight 00:00 timestamps)
  if (!duration) return undefined;
  const h = parseFloat(duration);
  if (h > 12) return undefined; // parks have no fixed duration
  return duration;
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "tours.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const tours: Tour[] = JSON.parse(raw);

  const fixed = tours.map((t) => {
    const title = TITLE_OVERRIDES[t.slug] || t.title;
    const realPrice = PRICE_OVERRIDES[t.slug] || extractRealPrice(t.description) || t.price;
    const cleanDesc = cleanDescription(t.description);
    const duration = fixDuration(t.slug, t.duration);

    return {
      ...t,
      title,
      price: realPrice,
      description: cleanDesc,
      duration,
      included: t.included?.startsWith("//") ? undefined : t.included,
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2));
  console.log(`Fixed ${fixed.length} tours.`);
  fixed.forEach((t) => console.log(`  ${t.title} — ${t.price}`));
}

main();
