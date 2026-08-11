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

// Days a tour actually runs. Order matters — it's the order they're printed in,
// and Mon-first matches how the operators quote their schedules.
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** "Mon & Thu", "Mon, Wed & Fri" — always in week order, whatever the JSON order. */
export function formatDays(days: Weekday[]): string {
  const sorted = [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  if (sorted.length <= 1) return sorted[0] ?? "";
  return `${sorted.slice(0, -1).join(", ")} & ${sorted[sorted.length - 1]}`;
}

export type Tour = {
  slug: string;
  title: string;
  category: string; // subcategory slug, e.g. "whale-watching"
  group?: string; // top-level group: water | land | air | shows | rental
  duration?: string;
  languages?: string[];
  minAge?: number;
  capacity?: number; // max passengers — mainly for boat rentals
  pricing: PricingOption[];
  priceFrom: number;
  description: string;
  included?: string;
  notIncluded?: string;
  meetingPoint?: string;
  // Hotel pickup / transfer: "yes" = included free, "no" = none (customer goes
  // to the meeting point), "price" = available for an extra fee paid directly
  // to the operator (we NEVER charge it through checkout).
  pickup?: "yes" | "no" | "price";
  faq: FaqItem[];
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  timeSlots?: string[];
  // Days of the week the tour departs at all. Absent = runs every day.
  days?: Weekday[];
  url: string;
  bookingPhone?: string;
  depositPercent?: number;
  supplierId?: string;
  rating?: number; // operator/venue review rating — display-only social proof
  reviewCount?: number;
  reviewSource?: string; // where the rating is from: "Google", "Tripadvisor", etc.
  reviewedName?: string; // whose rating it is (operator/venue name)
  prep?: import("./prep").PrepOverride; // optional override for "what to bring / how to dress"
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
          const capPart = t.capacity ? ` | up to ${t.capacity} people` : "";
          const durPart = t.duration ? ` | ${t.duration}` : "";
          const incPart = t.included ? ` | Includes: ${t.included.slice(0, 200)}` : "";
          const excPart = t.notIncluded ? ` | NOT included: ${t.notIncluded.slice(0, 200)}` : "";
          const slotsPart = t.timeSlots?.length ? ` | timeSlots: ${t.timeSlots.join(", ")}` : "";
          const daysPart = t.days?.length ? ` | 📅 RUNS ${formatDays(t.days)} ONLY` : "";
          const depositPart = t.depositPercent ? ` | 💳 ${t.depositPercent}% deposit online, rest paid on pickup` : "";
          const pickupPart =
            t.pickup === "yes" ? " | 🚐 hotel pickup included"
            : t.pickup === "no" ? " | 🚐 no pickup (customer goes to meeting point)"
            : t.pickup === "price" ? " | 🚐 optional pickup for an extra fee paid to the operator (never charged by us)"
            : "";
          const discountOkPart = t.category === "buggy-quad" ? ` | 🏷️ 8% chat discount available` : "";
          const ratingPart = t.rating ? ` | ⭐ ${t.rating}${t.reviewCount ? ` (${t.reviewCount} reviews${t.reviewSource ? `, ${t.reviewSource}` : ""})` : ""}` : "";
          lines.push(`    • [slug:${t.slug}] ${t.title}${durPart} | ${pricePart}${agePart}${capPart}${incPart}${excPart}${daysPart}${slotsPart}${depositPart}${pickupPart}${discountOkPart}${ratingPart}`);
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

// Words that carry no identity — they appear in half the catalogue, so letting
// them score would make "X — Private boat trip" look like "Y — Private boat trip".
const NAME_STOPWORDS = new Set([
  "the", "and", "with", "from", "for", "your", "our", "in", "of", "at", "on", "to",
  "tour", "tours", "trip", "trips", "ticket", "tickets", "experience", "excursion",
  "de", "la", "el", "los", "las", "y",
]);

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameTokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !NAME_STOPWORDS.has(w))
  );
}

// Dice coefficient over the two token sets: 1 = same words, 0 = nothing shared.
function diceScore(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return (2 * shared) / (a.size + b.size);
}

/**
 * Resolve a tour from the free-text name the AI wrote into [BOOK_NOW: ...].
 *
 * This is a FALLBACK — checkout passes the exact slug whenever the chat message
 * carried one. It matters that a near-miss returns null rather than a plausible
 * neighbour: the resolved tour supplies the checkout photo, the meeting point
 * printed on the customer's Stripe page and confirmation, the deposit rule and
 * the discount eligibility. Sending someone to the wrong marina is worse than
 * sending them a booking with no meeting point line.
 */
export function findTourByName(tourName: string): Tour | null {
  const tours = getAllTours();
  const target = normalizeName(tourName);
  if (target.length < 3) return null;

  // 1. Exact title (punctuation-insensitive) — the overwhelmingly common case.
  const exact = tours.find((t) => normalizeName(t.title) === target);
  if (exact) return exact;

  // 2. The AI truncated the title ("Loro Parque tickets" for "Loro Parque
  //    tickets — The biggest ZOO in Tenerife"). A unique prefix match is strong
  //    evidence; two candidates ("Fiat 500" → plain + Cabrio) means ambiguous.
  if (target.length >= 6) {
    const prefixed = tours.filter((t) => normalizeName(t.title).startsWith(target));
    if (prefixed.length === 1) return prefixed[0];
  }

  // 3. One name fully contains the other, and they're comparable in length. The
  //    length floor stops a short generic title ("Aqualand") from swallowing a
  //    long combo title that merely mentions it ("2 Parks Ticket ... Aqualand").
  const contained = tours
    .map((t) => ({ tour: t, norm: normalizeName(t.title) }))
    .filter(({ norm }) => {
      if (norm.length < 6) return false;
      if (!norm.includes(target) && !target.includes(norm)) return false;
      return Math.min(norm.length, target.length) / Math.max(norm.length, target.length) >= 0.5;
    })
    .sort((a, b) => Math.abs(a.norm.length - target.length) - Math.abs(b.norm.length - target.length));
  if (contained.length) return contained[0].tour;

  // 4. Token overlap, but only with a clear winner — ambiguity fails closed.
  const targetTokens = nameTokens(tourName);
  const scored = tours
    .map((t) => ({ tour: t, score: diceScore(targetTokens, nameTokens(t.title)) }))
    .sort((a, b) => b.score - a.score);
  const [best, runnerUp] = scored;
  if (best && best.score >= 0.4 && (!runnerUp || best.score - runnerUp.score >= 0.08)) {
    return best.tour;
  }
  return null;
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
