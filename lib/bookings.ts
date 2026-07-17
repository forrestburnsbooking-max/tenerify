import { Redis } from "@upstash/redis";
import { sendBookingConfirmation } from "./email";

// Independent record of every booking that goes through the funnel.
// This is OUR source of truth for the demand dataset and for reconciling the
// revenue split — it lives here regardless of whose Stripe account is the
// merchant of record. Do not couple this to Stripe ownership.

export type BookingStatus = "pending_payment" | "paid";

export type BookingRecord = {
  id: string; // Stripe checkout session id
  status: BookingStatus;
  tourName: string;
  tourSlug: string;
  groupSize: string;
  priceEur: number; // list price for the chosen group size (before deposit split)
  chargedEur: number; // what we actually charge online (deposit-aware)
  discountPercent: number;
  depositPercent: number | null;
  bookingDate: string;
  bookingTime: string;
  meetingPoint: string;
  who: string | null; // family/couple/solo/friends, if known
  language: string | null;
  hotel: string | null; // partner-hotel slug that referred this booking (QR attribution) — drives the revenue split

  // Filled in once payment is confirmed
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerHotel: string | null;
  createdAt: string;
  paidAt: string | null;
};

const KEY_PREFIX = "tenerify:booking:";
const INDEX_KEY = "tenerify:bookings:index"; // sorted set: member=id, score=createdAt ms
const BOOKING_TTL_SECONDS = 2 * 365 * 24 * 60 * 60; // 2 years — this is an asset, keep it

// In-memory fallback for local dev (no Redis configured)
const devStore = new Map<string, BookingRecord>();

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return null;
}

export async function logBookingCreated(
  booking: Omit<BookingRecord, "status" | "createdAt" | "paidAt" | "customerName" | "customerEmail" | "customerPhone" | "customerHotel">
): Promise<void> {
  const record: BookingRecord = {
    ...booking,
    status: "pending_payment",
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerHotel: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(`${KEY_PREFIX}${record.id}`, record, { ex: BOOKING_TTL_SECONDS });
      await redis.zadd(INDEX_KEY, { score: Date.now(), member: record.id });
    } else {
      devStore.set(record.id, record);
    }
  } catch {
    // Never let booking logging break checkout
  }
}

export async function markBookingPaid(
  id: string,
  details: Pick<BookingRecord, "customerName" | "customerEmail" | "customerPhone" | "customerHotel">
): Promise<void> {
  try {
    const redis = getRedis();
    const existing = redis
      ? await redis.get<BookingRecord>(`${KEY_PREFIX}${id}`)
      : devStore.get(id) ?? null;
    if (!existing) {
      console.warn(`[bookings] markBookingPaid: no booking record for ${id} — cannot send confirmation`);
      return;
    }
    if (existing.status === "paid") return; // idempotent
    const updated: BookingRecord = {
      ...existing,
      ...details,
      status: "paid",
      paidAt: new Date().toISOString(),
    };
    if (redis) {
      await redis.set(`${KEY_PREFIX}${id}`, updated, { ex: BOOKING_TTL_SECONDS });
    } else {
      devStore.set(id, updated);
    }
    // Fires exactly once — the early-return above guards against re-sends.
    await sendBookingConfirmation(updated);
  } catch (err) {
    // Non-critical — never break the payment flow, but make it visible.
    console.error(`[bookings] markBookingPaid failed for ${id}:`, err);
  }
}

export async function getBooking(id: string): Promise<BookingRecord | null> {
  try {
    const redis = getRedis();
    if (redis) return await redis.get<BookingRecord>(`${KEY_PREFIX}${id}`);
    return devStore.get(id) ?? null;
  } catch {
    return null;
  }
}

export async function listBookings(limit = 200): Promise<BookingRecord[]> {
  try {
    const redis = getRedis();
    if (redis) {
      // newest first
      const ids = await redis.zrange<string[]>(INDEX_KEY, 0, limit - 1, { rev: true });
      if (!ids.length) return [];
      const records = await Promise.all(ids.map((id) => redis.get<BookingRecord>(`${KEY_PREFIX}${id}`)));
      return records.filter((r): r is BookingRecord => !!r);
    }
    return [...devStore.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}
