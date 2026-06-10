import fs from "fs";
import path from "path";

const LEGENDS_FILE = path.join(process.cwd(), "data", "legends.json");

export type Legend = {
  slug: string;
  title: string;
  region: string;
  era: string;
  story: string;
};

export function getLegends(): Legend[] {
  try {
    if (!fs.existsSync(LEGENDS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LEGENDS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getLegendsText(): string {
  const legends = getLegends();
  if (!legends.length) return "";

  return legends
    .map((l) => `### ${l.title}\nRegion: ${l.region} | Era: ${l.era}\n${l.story}`)
    .join("\n\n");
}
