// Props for a single Reel — a flat subset of a tour from data/tours.json.
export type TourReelProps = {
  title: string;
  priceFrom: number;
  duration: string | null;
  minAge: number | null;
  imageUrl: string;
  category: string;
  languages: string[];
  tagline: string;
  // Optional animated background: a full URL, or a filename under public/clips/.
  // Empty string → fall back to the Ken Burns photo.
  clip: string;
  // Multi-shot: 2+ clip filenames under public/clips/, sequenced as cuts (no loop).
  // When set, takes precedence over `clip`.
  clips?: string[];
};
