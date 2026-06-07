export type UserProfile = {
  who: string;
  language: string;
  visits: { date: string; vibes: string[] }[];
  likedTopics: string[];
};

const KEY = "tenerify_profile";

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}

export function updateVisit(profile: UserProfile, vibe: string): UserProfile {
  const today = new Date().toISOString().slice(0, 10);
  const last = profile.visits[profile.visits.length - 1];

  if (last && last.date === today) {
    last.vibes = [...new Set([...last.vibes, vibe])];
  } else {
    profile.visits.push({ date: today, vibes: [vibe] });
  }

  if (!profile.likedTopics.includes(vibe)) {
    profile.likedTopics.push(vibe);
  }

  return profile;
}

export function profileToContext(profile: UserProfile): string {
  const visitCount = profile.visits.length;
  const lastVisit = profile.visits[profile.visits.length - 1]?.date;
  const topics = profile.likedTopics.join(", ");

  if (visitCount === 1) return "";

  return `RETURNING USER CONTEXT: This person has visited Tenerify ${visitCount} times. Last visit: ${lastVisit}. They have previously shown interest in: ${topics}. Reference this naturally — e.g. "Last time you were into adventure, want to try something different?" Don't repeat recommendations they've likely already seen.`;
}
