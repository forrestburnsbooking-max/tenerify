import { kv } from "@vercel/kv";

export type SessionData = {
  id: string;
  who?: string;
  language?: string;
  visits: { date: string; vibes: string[] }[];
  likedTopics: string[];
  createdAt: string;
  lastSeen: string;
};

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const KEY_PREFIX = "tenerify:session:";

// In-memory fallback for local dev (no KV configured)
const devStore = new Map<string, { data: SessionData; expiresAt: number }>();

function isKvAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getSession(id: string): Promise<SessionData | null> {
  if (!id) return null;
  try {
    if (isKvAvailable()) {
      return await kv.get<SessionData>(`${KEY_PREFIX}${id}`);
    }
    // Dev fallback
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

export async function saveSession(id: string, data: SessionData): Promise<void> {
  data.lastSeen = new Date().toISOString();
  try {
    if (isKvAvailable()) {
      await kv.set(`${KEY_PREFIX}${id}`, data, { ex: SESSION_TTL_SECONDS });
    } else {
      devStore.set(id, { data, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 });
    }
  } catch {
    // Silent fail — session is non-critical
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    if (isKvAvailable()) {
      await kv.del(`${KEY_PREFIX}${id}`);
    } else {
      devStore.delete(id);
    }
  } catch {}
}

export function createSession(id: string): SessionData {
  const now = new Date().toISOString();
  return { id, visits: [], likedTopics: [], createdAt: now, lastSeen: now };
}

export function updateSessionVisit(session: SessionData, who: string, language: string): SessionData {
  const today = new Date().toISOString().slice(0, 10);
  const last = session.visits[session.visits.length - 1];
  if (last && last.date === today) {
    last.vibes = [...new Set([...last.vibes, who])];
  } else {
    session.visits.push({ date: today, vibes: [who] });
  }
  if (who && !session.likedTopics.includes(who)) session.likedTopics.push(who);
  session.who = who;
  session.language = language;
  return session;
}

export function sessionToContext(session: SessionData): string {
  if (session.visits.length <= 1) return "";
  const count = session.visits.length;
  const last = session.visits[session.visits.length - 1]?.date;
  const topics = session.likedTopics.join(", ");
  return `RETURNING VISITOR: Has used Tenerify ${count} times. Last visit: ${last}. Previously interested in: ${topics}. Reference naturally — e.g. "Last time you were into adventure, fancy something different?" Don't repeat already-seen recommendations.`;
}

export const SESSION_COOKIE = "tfy_sid";
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
