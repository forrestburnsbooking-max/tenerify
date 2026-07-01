import fs from "fs";
import path from "path";

const CARD_FILE = path.join(process.cwd(), "data", "canarian-character.md");

/**
 * The Canarian character card — voice, lexicon and cultural background that
 * makes the assistant sound like a real local rather than a booking bot.
 * Injected into the system prompt. Returns "" if the file is missing so the
 * bot still works without it.
 */
export function getCharacterCard(): string {
  try {
    if (!fs.existsSync(CARD_FILE)) return "";
    return fs.readFileSync(CARD_FILE, "utf-8");
  } catch {
    return "";
  }
}
