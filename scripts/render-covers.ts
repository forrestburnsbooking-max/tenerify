/** Render designed Reel covers (RU + EN) for the trailer + episodes. */
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { CoverProps } from "../remotion/Cover";

const PORTRAIT = "reels/face/avatar-source.jpg";

const RU: Record<string, Omit<CoverProps, "portraitSrc">> = {
  "00": { kicker: "СЕРИАЛ ПРО ВАЙБКОДИНГ", headline: "Я ЗАМЕНИЛ СЕБЯ\nНЕЙРОСЕТЬЮ", badge: "ТРЕЙЛЕР" },
  "01": { kicker: "КАК Я СОБРАЛ TENERIFY.AI", headline: "ПЛАТФОРМА\nЗА ОДИН ДЕНЬ", badge: "ЧАСТЬ 1" },
  "02": { kicker: "КАК Я СОБРАЛ TENERIFY.AI", headline: "МОЙ AI\nРАЗДАВАЛ\nДЕНЬГИ", badge: "ЧАСТЬ 2" },
  "03": { kicker: "КАК Я СОБРАЛ TENERIFY.AI", headline: "ПРОДАВАЛ ТУРЫ\nСЕБЕ В МИНУС", badge: "ЧАСТЬ 3" },
};

const EN: Record<string, Omit<CoverProps, "portraitSrc">> = {
  "00": { kicker: "A SERIES ABOUT VIBE-CODING", headline: "I REPLACED\nMYSELF WITH AI", badge: "TRAILER" },
  "01": { kicker: "HOW I BUILT TENERIFY.AI", headline: "A PLATFORM\nIN ONE DAY", badge: "PART 1" },
  "02": { kicker: "HOW I BUILT TENERIFY.AI", headline: "MY AI GAVE\nAWAY MONEY", badge: "PART 2" },
  "03": { kicker: "HOW I BUILT TENERIFY.AI", headline: "I SOLD TOURS\nAT A LOSS", badge: "PART 3" },
};

async function main() {
  const only = process.argv[2]; // optional "00" etc.
  const ROOT = process.cwd();
  const outDir = path.join(ROOT, "out", "covers");
  fs.mkdirSync(outDir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion", "covers.tsx") });

  for (const [lang, map] of [["ru", RU], ["en", EN]] as const) {
    for (const [nn, data] of Object.entries(map)) {
      if (only && only !== nn) continue;
      const inputProps: CoverProps = { portraitSrc: PORTRAIT, ...data };
      const out = path.join(outDir, `cover-ep${nn}-${lang}.png`);
      const composition = await selectComposition({ serveUrl, id: "Cover", inputProps });
      await renderStill({ composition, serveUrl, frame: 0, inputProps, output: out, imageFormat: "png" });
      console.log("✓", `ep${nn}-${lang}`);
    }
  }
  console.log(`\n→ ${outDir}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
