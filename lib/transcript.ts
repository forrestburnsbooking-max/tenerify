import { Redis } from "@upstash/redis";

// Persisted chat transcript so a returning visitor can pick up the conversation
// where they left off. Stored separately from SessionData (lib/session.ts) so
// the per-request session read in the chat route stays small. Keyed by the same
// tfy_sid cookie. Best-effort: never throws into the request path.

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  hidden?: boolean;
  options?: string[];
  bookingText?: string;
  tourMedia?: unknown;
  tourMediaList?: unknown;
  needsDate?: boolean;
  needsLicense?: boolean;
  needsTime?: boolean;
  availableTimeSlots?: string[];
};

export type Transcript = {
  messages: StoredMessage[];
  who?: string;
  language?: string;
  updatedAt: string;
};

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const KEY_PREFIX = "tenerify:transcript:";
const MAX_MESSAGES = 40;
const MAX_BYTES = 200_000;

const devStore = new Map<string, { data: Transcript; expiresAt: number }>();

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  }
  return null;
}

export async function getTranscript(id: string): Promise<Transcript | null> {
  if (!id) return null;
  try {
    const redis = getRedis();
    if (redis) return await redis.get<Transcript>(`${KEY_PREFIX}${id}`);
    const entry = devStore.get(id);
    if (!entry || Date.now() > entry.expiresAt) {
      devStore.delete(id);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function saveTranscript(id: string, t: Transcript): Promise<void> {
  if (!id) return;
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(`${KEY_PREFIX}${id}`, t, { ex: TTL_SECONDS });
    } else {
      devStore.set(id, { data: t, expiresAt: Date.now() + TTL_SECONDS * 1000 });
    }
  } catch {
    // Non-critical
  }
}

export async function deleteTranscript(id: string): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) await redis.del(`${KEY_PREFIX}${id}`);
    else devStore.delete(id);
  } catch {
    // Non-critical
  }
}

// Keep only known fields and enforce limits. Returns null if the payload is
// malformed or too large, so the route can reject it.
export function sanitizeMessages(input: unknown): StoredMessage[] | null {
  if (!Array.isArray(input)) return null;
  const out: StoredMessage[] = [];
  for (const raw of input.slice(-MAX_MESSAGES)) {
    const m = raw as Record<string, unknown>;
    if (m?.role !== "user" && m?.role !== "assistant") return null;
    if (typeof m.content !== "string" || m.content.length > 4000) return null;
    const msg: StoredMessage = { role: m.role, content: m.content };
    if (m.hidden === true) msg.hidden = true;
    if (Array.isArray(m.options)) msg.options = m.options.slice(0, 8).map(String);
    if (typeof m.bookingText === "string") msg.bookingText = m.bookingText;
    if (m.tourMedia && typeof m.tourMedia === "object") msg.tourMedia = m.tourMedia;
    if (Array.isArray(m.tourMediaList)) msg.tourMediaList = m.tourMediaList;
    if (m.needsDate === true) msg.needsDate = true;
    if (m.needsLicense === true) msg.needsLicense = true;
    if (m.needsTime === true) msg.needsTime = true;
    if (Array.isArray(m.availableTimeSlots)) msg.availableTimeSlots = m.availableTimeSlots.map(String);
    out.push(msg);
  }
  if (JSON.stringify(out).length > MAX_BYTES) return null;
  return out;
}
