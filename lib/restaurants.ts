import fs from "fs";
import path from "path";

const RESTAURANTS_FILE = path.join(process.cwd(), "data", "restaurants.json");

export type Restaurant = {
  slug: string;
  name: string;
  cuisine: string; // e.g. "Canarian", "Seafood", "Italian", "Steakhouse"
  area: string; // town / zone, e.g. "Costa Adeje", "Los Cristianos", "La Caleta"
  priceRange: string; // "€" | "€€" | "€€€" | "€€€€"
  goodFor?: string[]; // e.g. ["couples", "families", "sunset", "groups"]
  mustTry?: string[]; // signature dishes
  description: string;
  meetingPoint?: string; // address / how to find it
  mapsUrl?: string;
  menuUrl?: string; // page with photos + menu + prices
  imageUrl?: string; // representative photo, if available
  bookingAdvised?: boolean; // worth calling ahead
  rating?: number; // display-only social proof
  reviewCount?: number;
  reviewSource?: string; // "Google", "Tripadvisor", ...
};

export function getRestaurants(): Restaurant[] {
  try {
    if (!fs.existsSync(RESTAURANTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(RESTAURANTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getRestaurantBySlug(slug: string): Restaurant | undefined {
  return getRestaurants().find((r) => r.slug === slug);
}

// South coast west→east, then Costa del Silencio (next to Las Galletas, near
// the airport), then the north-coast towns.
export const AREA_GROUP_ORDER = [
  "Los Cristianos",
  "Las Americas",
  "Costa Adeje",
  "Los Gigantes",
  "Las Galletas",
  "Costa del Silencio",
  "La Laguna",
  "Puerto de la Cruz",
  "Santa Cruz",
] as const;

export type AreaGroup = (typeof AREA_GROUP_ORDER)[number];

// Raw `area` values carry parenthetical detail ("(harbour)", "(north)") or a
// sub-neighborhood prefix ("La Caleta, Costa Adeje") — strip those down to
// one of the macro groups above so restaurants group geographically.
export function getAreaGroup(area: string): AreaGroup {
  const clean = area.replace(/\s*\([^)]*\)/g, "").trim();
  if (clean.includes("Américas") || clean.includes("Americas")) return "Las Americas";
  for (const group of AREA_GROUP_ORDER) {
    if (clean === group || clean.endsWith(`, ${group}`) || clean.includes(group)) return group;
  }
  return clean as AreaGroup;
}

export function getRestaurantsText(): string {
  const restaurants = getRestaurants();
  if (!restaurants.length) return "";

  return restaurants
    .map((r) => {
      const goodForPart = r.goodFor?.length ? ` | Good for: ${r.goodFor.join(", ")}` : "";
      const mustTryPart = r.mustTry?.length ? ` | Must try: ${r.mustTry.join(", ")}` : "";
      const bookingPart = r.bookingAdvised ? " | 📞 booking advised" : "";
      const ratingPart = r.rating
        ? ` | ⭐ ${r.rating}${r.reviewCount ? ` (${r.reviewCount} reviews${r.reviewSource ? `, ${r.reviewSource}` : ""})` : ""}`
        : "";
      const mapsPart = r.mapsUrl ? ` | 🗺️ ${r.mapsUrl}` : "";
      const menuPart = r.menuUrl ? ` | 📋 Photos & menu: ${r.menuUrl}` : "";
      return `### ${r.name} — ${r.cuisine} | 📍 ${r.area} | 💶 ${r.priceRange}${goodForPart}${ratingPart}${bookingPart}\n${r.description}${mustTryPart}${menuPart}${mapsPart}`;
    })
    .join("\n\n");
}
