import fs from "fs";
import path from "path";

const CULTURE_FILE = path.join(process.cwd(), "data", "culture.json");

export type CultureTopic = {
  slug: string;
  title: string;
  body: string;
};

export function getCultureTopics(): CultureTopic[] {
  try {
    if (!fs.existsSync(CULTURE_FILE)) return [];
    return JSON.parse(fs.readFileSync(CULTURE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getCultureText(): string {
  const topics = getCultureTopics();
  if (!topics.length) return "";

  return topics.map((t) => `### ${t.title}\n${t.body}`).join("\n\n");
}
