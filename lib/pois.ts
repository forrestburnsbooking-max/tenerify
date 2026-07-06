import fs from "fs";
import path from "path";

const POIS_FILE = path.join(process.cwd(), "data", "pois.json");

export type Poi = {
  category: "landmark" | "museum" | "park-garden" | "beach-nature" | "shop" | "transport-parking" | "toilet";
  name: string;
  description: string;
  area: string;
  lat: number;
  lng: number;
  mapsUrl: string;
};

const CATEGORY_LABEL: Record<Poi["category"], string> = {
  landmark: "🏛️ LANDMARKS & FAMOUS SITES",
  museum: "🖼️ MUSEUMS",
  "park-garden": "🌿 GARDENS & PARKS",
  "beach-nature": "🏖️ BEACHES, NATURAL POOLS & PLACES",
  shop: "🛒 SUPERMARKETS & SHOPPING",
  "transport-parking": "🚗 AIRPORTS, PORTS & PARKING",
  toilet: "🚻 PUBLIC TOILETS",
};

const CATEGORY_ORDER: Poi["category"][] = [
  "landmark",
  "museum",
  "park-garden",
  "beach-nature",
  "shop",
  "transport-parking",
  "toilet",
];

export function getPoisText(): string {
  try {
    if (!fs.existsSync(POIS_FILE)) return "";
    const pois: Poi[] = JSON.parse(fs.readFileSync(POIS_FILE, "utf-8"));
    if (!pois.length) return "";

    const byCat = new Map<string, Poi[]>();
    for (const p of pois) {
      if (!byCat.has(p.category)) byCat.set(p.category, []);
      byCat.get(p.category)!.push(p);
    }

    const lines: string[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = byCat.get(cat);
      if (!items?.length) continue;
      lines.push(`\n${CATEGORY_LABEL[cat]}`);
      for (const p of items) {
        const descPart = p.description ? ` — ${p.description}` : "";
        lines.push(`  • ${p.name} (${p.area})${descPart} | 📍 ${p.mapsUrl}`);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

export function getAllPois(): Poi[] {
  try {
    if (!fs.existsSync(POIS_FILE)) return [];
    return JSON.parse(fs.readFileSync(POIS_FILE, "utf-8"));
  } catch {
    return [];
  }
}
