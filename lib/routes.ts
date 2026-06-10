import fs from "fs";
import path from "path";

const ROUTES_FILE = path.join(process.cwd(), "data", "routes.json");

export type RouteStop = {
  name: string;
  description: string;
  tip?: string;
};

export type SelfDriveRoute = {
  slug: string;
  title: string;
  duration: string;
  distance: string;
  difficulty: string;
  startArea: string;
  description: string;
  stops: RouteStop[];
  highlights: string[];
};

export function getRoutes(): SelfDriveRoute[] {
  try {
    if (!fs.existsSync(ROUTES_FILE)) return [];
    return JSON.parse(fs.readFileSync(ROUTES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getRoutesText(): string {
  const routes = getRoutes();
  if (!routes.length) return "";

  return routes
    .map((r) => {
      const stops = r.stops
        .map((s) => `  - ${s.name}: ${s.description}${s.tip ? ` (Tip: ${s.tip})` : ""}`)
        .join("\n");
      return `### ${r.title}\nDuration: ${r.duration} | Distance: ${r.distance} | Difficulty: ${r.difficulty} | Start: ${r.startArea}\n${r.description}\nStops:\n${stops}\nHighlights: ${r.highlights.join(", ")}`;
    })
    .join("\n\n");
}
