import fs from "fs";
import path from "path";

export type RadioSegmentLine = { speaker: string; text: string; file: string };
export type RadioSegment = { generatedAt: string; lines: RadioSegmentLine[] };

const TRACKS_DIR = path.join(process.cwd(), "public", "radio", "tracks");
const SEGMENT_MANIFEST = path.join(process.cwd(), "public", "radio", "segments", "latest", "manifest.json");

// Music tracks are dropped in manually (exported from Suno) — we just list
// whatever's in the folder, newest first isn't tracked so alphabetical is fine.
export function getMusicTracks(): { title: string; url: string }[] {
  if (!fs.existsSync(TRACKS_DIR)) return [];
  return fs
    .readdirSync(TRACKS_DIR)
    .filter((f) => /\.mp3$/i.test(f))
    .sort()
    .map((f) => ({
      title: f.replace(/\.mp3$/i, "").replace(/[-_]/g, " "),
      url: `/radio/tracks/${f}`,
    }));
}

export function getLatestSegment(): RadioSegment | null {
  if (!fs.existsSync(SEGMENT_MANIFEST)) return null;
  return JSON.parse(fs.readFileSync(SEGMENT_MANIFEST, "utf-8"));
}

export type SpecialEpisode = { slug: string; title: string; generatedAt: string; lines: RadioSegmentLine[] };

const SPECIAL_DIR = path.join(process.cwd(), "public", "radio", "segments", "special");

// One-off "programme" episodes (e.g. a deep-dive discussion), generated via
// scripts/radio-generate-special.ts — each lives in its own subfolder with a manifest.
export function getSpecialEpisodes(): SpecialEpisode[] {
  if (!fs.existsSync(SPECIAL_DIR)) return [];
  return fs
    .readdirSync(SPECIAL_DIR)
    .filter((slug) => fs.existsSync(path.join(SPECIAL_DIR, slug, "manifest.json")))
    .map((slug) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(SPECIAL_DIR, slug, "manifest.json"), "utf-8"));
      return { slug, title: manifest.title ?? slug, generatedAt: manifest.generatedAt, lines: manifest.lines };
    });
}
