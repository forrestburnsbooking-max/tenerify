/** Sample several frames from the face clip to pick an avatar source photo. */
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

async function main() {
  const src = process.argv[2] || "reels/face/IMG_6700.MOV";
  const frames = (process.argv[3] || "20,60,110,160,210,260,310")
    .split(",")
    .map(Number);
  const ROOT = process.cwd();
  const outDir = path.join(ROOT, "out", "face");
  fs.mkdirSync(outDir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion", "thumbs.tsx") });
  for (const f of frames) {
    const inputProps = { src, startFrom: f };
    const composition = await selectComposition({ serveUrl, id: "ClipThumb", inputProps });
    const out = path.join(outDir, `frame-${String(f).padStart(3, "0")}.png`);
    await renderStill({ composition, serveUrl, frame: 0, inputProps, output: out, imageFormat: "png" });
    console.log("✓", f);
  }
  console.log(`\n→ ${outDir}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
