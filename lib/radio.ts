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
