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
  category: string; // subcategory slug, e.g. "whale-watching"
  group?: string; // top-level group: water | land | air | shows | rental
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
  rating?: number; // operator/venue review rating — display-only social proof
  reviewCount?: number;
  reviewSource?: string; // where the rating is from: "Google", "Tripadvisor", etc.
  reviewedName?: string; // whose rating it is (operator/venue name)
};

// Top-level groups (Water / Land / Air / Shows / Rental)
export type GroupId = "water" | "land" | "air" | "shows" | "rental";

export const GROUP_ORDER: GroupId[] = ["water", "land", "air", "shows", "rental"];

export const GROUP_LABEL: Record<string, string> = {
  water: "WATER",
  land: "LAND",
  air: "AIR",
  shows: "EVENING SHOWS",
  rental: "CAR & VEHICLE RENTAL",
};

export const GROUP_EMOJI: Record<string, string> = {
  water: "🌊",
  land: "🏝️",
  air: "✈️",
  shows: "🎭",
  rental: "🚗",
};

// Subcategories, with display label + emoji
export const SUBCATEGORY_LABEL: Record<string, string> = {
  "whale-watching": "Whale & dolphin watching",
  fishing: "Fishing tours",
  "boat-rental": "No-licence boats",
  jetski: "Jet ski & parasailing",
  "water-activities": "Water activities",
  "buggy-quad": "Buggy, quads & jeeps",
  parks: "Theme parks",
  "bus-tours": "Bus tours & stargazing",
  air: "Air tours",
  shows: "Shows & dinners",
  "car-rental": "Car & vehicle rental",
};

export const SUBCATEGORY_EMOJI: Record<string, string> = {
  "whale-watching": "🐋",
  fishing: "🎣",
  "boat-rental": "🚤",
  jetski: "🛥️",
  "water-activities": "🤿",
  "buggy-quad": "🏎️",
  parks: "🎡",
  "bus-tours": "🚌",
  air: "🪂",
  shows: "🎭",
  "car-rental": "🚗",
};

// Subcategories that belong to each group, in display order
export const GROUP_SUBCATEGORIES: Record<string, string[]> = {
  water: ["whale-watching", "fishing", "boat-rental", "jetski", "water-activities"],
  land: ["buggy-quad", "parks", "bus-tours"],
  air: ["air"],
  shows: ["shows"],
  rental: ["car-rental"],
};

export function groupOf(subcategory: string): GroupId {
  for (const g of GROUP_ORDER) {
    if (GROUP_SUBCATEGORIES[g]?.includes(subcategory)) return g;
  }
  return "land";
}

export function getTours(): string {
  try {
    if (!fs.existsSync(TOURS_FILE)) return "";
    const tours: Tour[] = JSON.parse(fs.readFileSync(TOURS_FILE, "utf-8"));
    if (!tours.length) return "";

    const bySub = new Map<string, Tour[]>();
    for (const t of tours) {
      if (!bySub.has(t.category)) bySub.set(t.category, []);
      bySub.get(t.category)!.push(t);
    }

    const lines: string[] = [];
    for (const g of GROUP_ORDER) {
      const subs = GROUP_SUBCATEGORIES[g].filter((s) => bySub.has(s));
      if (!subs.length) continue;
      lines.push(`\n${GROUP_EMOJI[g]} ${GROUP_LABEL[g]}`);
      for (const sub of subs) {
        const items = bySub.get(sub)!;
        lines.push(`\n  ${SUBCATEGORY_EMOJI[sub] ?? "🌴"} ${SUBCATEGORY_LABEL[sub] ?? sub}`);
        for (const t of items) {
          const pricePart = formatPrice(t);
          const agePart = t.minAge ? ` | min age ${t.minAge}` : "";
          const durPart = t.duration ? ` | ${t.duration}` : "";
          const incPart = t.included ? ` | Includes: ${t.included.slice(0, 200)}` : "";
          const excPart = t.notIncluded ? ` | NOT included: ${t.notIncluded.slice(0, 200)}` : "";
          const slotsPart = t.timeSlots?.length ? ` | timeSlots: ${t.timeSlots.join(", ")}` : "";
          const depositPart = t.depositPercent ? ` | 💳 ${t.depositPercent}% deposit online, rest paid on pickup` : "";
          const noDiscountPart = t.supplierId === "nere" ? ` | 🔒 NO DISCOUNT (fixed price)` : "";
          lines.push(`    • [slug:${t.slug}] ${t.title}${durPart} | ${pricePart}${agePart}${incPart}${excPart}${slotsPart}${depositPart}${noDiscountPart}`);
          if (t.description) {
            lines.push(`      ${t.description.slice(0, 500)}`);
          }
          if (t.pricing.length > 1) {
            const options = t.pricing.map((p) => `${p.label}: €${p.price}`).join(" / ");
            lines.push(`      Pricing: ${options}`);
          }
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

export function tourImages(t: Tour): string[] {
  if (t.images?.length) return t.images;
  if (t.imageUrl) return [t.imageUrl];
  return [];
}

export function formatPriceFrom(t: Tour): string {
  if (!t.pricing?.length) return "Price on request";
  return t.pricing.length === 1 ? `€${t.priceFrom}` : `from €${t.priceFrom}`;
}
