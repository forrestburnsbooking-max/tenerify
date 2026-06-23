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
