import fs from "fs";
import path from "path";

const HOTELS_FILE = path.join(process.cwd(), "data", "hotels.json");

// A partner hotel that has our stand/QR in the lobby. Reached via /?h=<slug>.
// The slug is the attribution key: it flows into the session, then onto every
// booking (see lib/bookings.ts) so we can reconcile the revenue split per hotel.
export type Hotel = {
  slug: string;
  name: string;
  area: string; // macro area the AI knows (for port routing); "" for a multi-area partner whose units are spread out — then the bot must ask the guest
  faq: string; // free-text house info: breakfast, checkout, wifi, pool, reception…
};

export function getHotels(): Hotel[] {
  try {
    if (!fs.existsSync(HOTELS_FILE)) return [];
    return JSON.parse(fs.readFileSync(HOTELS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getHotelBySlug(slug: string): Hotel | undefined {
  if (!slug) return undefined;
  return getHotels().find((h) => h.slug === slug);
}

// Block injected into the system prompt when a guest arrives via a hotel QR.
// Makes the bot double as that hotel's front-desk for house questions, while
// staying strictly grounded — anything not in the FAQ is bounced to reception.
export function getHotelText(hotel: Hotel): string {
  // Attribution-only partner (no house info): don't turn the bot into a front
  // desk — inject nothing. The slug still rides the session to checkout for the
  // revenue split, so the referral commission is tracked without any prompt block.
  if (!hotel.faq || !hotel.faq.trim()) return "";

  // Single-area partner: we know exactly where the guest is, so we skip asking.
  // Multi-area partner (area === ""): units are spread out, so we must still ask.
  const areaLine = hotel.area
    ? `The guest is staying at **${hotel.name}** in **${hotel.area}**. You already know this — never ask where they're staying, and use ${hotel.area} for port/pickup routing.`
    : `The guest scanned the QR in one of **${hotel.name}**'s apartments. Their units are spread across different areas, so you do NOT know which part of the island this guest is in — ask them where they're staying before recommending anything with a pickup or port.`;

  return `## THIS GUEST'S HOTEL (they scanned the QR at ${hotel.name})

${areaLine}

When they ask anything about the accommodation itself (check-in/out, keys, Wi-Fi, parking, pool, manager contact, transfer), answer from the house info below. Keep it short and friendly, like the front desk.

House info:
${hotel.faq}

Rules:
- Answer accommodation questions ONLY from the house info above. If something isn't covered, DON'T guess — tell them to contact ${hotel.name} and give the contact if it's in the info.
- Never invent prices, hours, or policies.
- After helping with a house question, it's natural to offer what you do best — an activity, a restaurant nearby, or a plan for their day — but don't force it.`;
}
