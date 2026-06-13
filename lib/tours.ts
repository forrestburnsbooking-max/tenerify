import fs from "fs";
import path from "path";

const TOURS_FILE = path.join(process.cwd(), "data", "tours.json");
const SUPPLIERS_FILE = path.join(process.cwd(), "data", "suppliers.json");

export type PricingOption = {
  label: string;
  price: number;
  net?: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  commissionPercent?: number;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type Tour = {
  slug: string;
  title: string;
  category: string;
  duration?: string;
  languages?: string[];
  minAge?: number;
  pricing: PricingOption[];
  priceFrom: number;
  description: string;
  included?: string;
  notIncluded?: string;
  meetingPoint?: string;
  faq: FaqItem[];
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  timeSlots?: string[];
  url: string;
  bookingPhone?: string;
  depositPercent?: number;
  supplierId?: string;
};

const CATEGORY_EMOJI: Record<string, string> = {
  buggy: "🚗",
  quad: "🏍️",
  jetski: "🛥️",
  boat: "⛵",
  park: "🎡",
  adventure: "🪂",
  show: "🎭",
  excursion: "🗺️",
  rental: "🚗",
  wellness: "🧖",
  other: "🌴",
};

const CATEGORY_LABEL: Record<string, string> = {
  buggy: "BUGGY TOURS",
  quad: "QUAD TOURS",
  jetski: "JET SKI",
  boat: "BOAT, YACHT & WHALE WATCHING",
  park: "THEME PARKS",
  adventure: "ADVENTURE & WATERSPORTS",
  show: "SHOWS & DINNER EXPERIENCES",
  excursion: "ISLAND EXCURSIONS",
  rental: "CAR & VEHICLE RENTAL",
  wellness: "SPA & WELLNESS",
  other: "OTHER EXPERIENCES",
};

export function getTours(): string {
  try {
    if (!fs.existsSync(TOURS_FILE)) return "";
    const tours: Tour[] = JSON.parse(fs.readFileSync(TOURS_FILE, "utf-8"));
    if (!tours.length) return "";

    const byCategory = new Map<string, Tour[]>();
    for (const t of tours) {
      if (!byCategory.has(t.category)) byCategory.set(t.category, []);
      byCategory.get(t.category)!.push(t);
    }

    const lines: string[] = [];
    for (const [cat, items] of byCategory) {
      const emoji = CATEGORY_EMOJI[cat] ?? "🌴";
      const label = CATEGORY_LABEL[cat] ?? cat.toUpperCase();
      lines.push(`\n${emoji} ${label}`);
      for (const t of items) {
        const pricePart = formatPrice(t);
        const agePart = t.minAge ? ` | min age ${t.minAge}` : "";
        const durPart = t.duration ? ` | ${t.duration}` : "";
        const incPart = t.included ? ` | Includes: ${t.included.slice(0, 200)}` : "";
        const slotsPart = t.timeSlots?.length ? ` | timeSlots: ${t.timeSlots.join(", ")}` : "";
        const depositPart = t.depositPercent ? ` | 💳 ${t.depositPercent}% deposit online, rest paid on pickup` : "";
        lines.push(`  • [slug:${t.slug}] ${t.title}${durPart} | ${pricePart}${agePart}${incPart}${slotsPart}${depositPart}`);
        if (t.description) {
          lines.push(`    ${t.description.slice(0, 220)}`);
        }
        if (t.pricing.length > 1) {
          const options = t.pricing.map((p) => `${p.label}: €${p.price}`).join(" / ");
          lines.push(`    Pricing: ${options}`);
        }
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

function formatPrice(t: Tour): string {
  if (t.pricing.length === 0) return "Price on request";
  if (t.pricing.length === 1) return `€${t.priceFrom}`;
  return `from €${t.priceFrom}`;
}

export function getSuppliers(): Supplier[] {
  try {
    if (!fs.existsSync(SUPPLIERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SUPPLIERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getTourBySlug(slug: string): Tour | null {
  try {
    const tours: Tour[] = JSON.parse(fs.readFileSync(TOURS_FILE, "utf-8"));
    return tours.find((t) => t.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export function getAllTours(): Tour[] {
  try {
    if (!fs.existsSync(TOURS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TOURS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export const CATEGORY_EMOJIS = CATEGORY_EMOJI;
export const CATEGORY_LABELS = CATEGORY_LABEL;

export function tourImages(t: Tour): string[] {
  if (t.images?.length) return t.images;
  if (t.imageUrl) return [t.imageUrl];
  return [];
}

export function formatPriceFrom(t: Tour): string {
  if (!t.pricing?.length) return "Price on request";
  return t.pricing.length === 1 ? `€${t.priceFrom}` : `from €${t.priceFrom}`;
}
