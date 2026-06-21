/**
 * Tours that share ONE animated background clip — same activity, only the
 * price/location/title differ. Saves generating a near-identical clip per tour.
 *
 * The first slug in each list is the "representative": its photo is the one sent
 * to Kling to produce the shared clip. Everything not listed here gets its own clip.
 */
export const CLIP_GROUPS: Record<string, string[]> = {
  jetski: [
    "jet-ski-puerto-colon", // representative photo
    "booster-pack-puerto-colon",
    "watersport-pack-puerto-colon",
    "jetski-las-galletas",
    "jetski-extreme",
  ],
  buggy: ["buggy-teide-adventure", "buggy-sunset-adventure"],
  quad: ["quad-teide-tour", "quad-sunset-tour", "ultimate-quads"],
  // 12-seat local sailing boats — Kosamui, Cool Sailing, Arriro, Sonador, Galatea.
  sailing: [
    "kosamui-boat", // representative photo
    "cool-sailing",
    "arriro-boat",
    "sonador-boat",
    "galatea-boat",
  ],
  // Stand-up paddle — same board-on-water look.
  paddle: ["kayaking-stand-up-paddle-los-cristianos"],
  // Soul Jeep 4x4 safaris — same convoy photo for self-drive and passenger tours.
  souljeep: ["soul-jeep-self-drive-safari", "soul-jeep-passenger-tour"],
};

/**
 * Categories that stay as photo-only reels (no AI animation) — motion adds little
 * and a clean still card reads better. Render falls back to the Ken Burns photo.
 */
export const PHOTO_ONLY_CATEGORIES = ["car-rental", "parks", "bus-tours"];

/**
 * Categories that get a reel but with a STATIC photo — no AI animation.
 * (e.g. shows: animating a stage/poster looks wrong.) Skipped by the animate step,
 * still rendered by the render step (falls back to the photo).
 */
export const NO_ANIMATE_CATEGORIES = ["shows"];

const slugToKey: Record<string, string> = {};
const keyToRepresentative: Record<string, string> = {};
for (const [key, slugs] of Object.entries(CLIP_GROUPS)) {
  keyToRepresentative[key] = slugs[0];
  for (const slug of slugs) slugToKey[slug] = key;
}

/** The clip filename key for a tour: its group key, or its own slug if ungrouped. */
export function clipKeyForSlug(slug: string): string {
  return slugToKey[slug] ?? slug;
}

/** The tour slug whose photo represents a clip key (for the animation step). */
export function representativeSlug(clipKey: string): string {
  return keyToRepresentative[clipKey] ?? clipKey;
}
