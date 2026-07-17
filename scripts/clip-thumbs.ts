/** Render a preview frame + print metadata for every clip in public/reels/. */
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";

const ROOT = process.cwd();
const REELS = path.join(ROOT, "public", "reels");

function listClips(): string[] {
  const out: string[] = [];
  for (const folder of ["inbox", "broll", "screens", "face", "music"]) {
    const dir = path.join(REELS, folder);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/\.(mp4|mov|m4v|webm)$/i.test(f)) out.push(`reels/${folder}/${f}`);
    }
  }
  return out;
}

async function main() {
  const clips = listClips();
  if (!clips.length) return console.log("No clips in public/reels/");
  const outDir = path.join(ROOT, "out", "thumbs");
  fs.mkdirSync(outDir, { recursive: true });

  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion", "thumbs.tsx") });

  for (const rel of clips) {
    const abs = path.join(ROOT, "public", rel);
    let meta = "";
    try {
      const m = await parseMedia({
        src: abs,
        reader: nodeReader,
        fields: { durationInSeconds: true, dimensions: true },
        acknowledgeRemotionLicense: true,
      });
      meta = `${m.dimensions?.width}x${m.dimensions?.height}, ${m.durationInSeconds?.toFixed(1)}s`;
    } catch (e) {
      meta = `meta err: ${(e as Error).message.split("\n")[0]}`;
    }
    const name = rel.replace(/[\/]/g, "__");
    const out = path.join(outDir, `${name}.png`);
    try {
      const composition = await selectComposition({ serveUrl, id: "ClipThumb", inputProps: { src: rel } });
      await renderStill({ composition, serveUrl, frame: 0, inputProps: { src: rel }, output: out, imageFormat: "png" });
      console.log(`✓ ${rel}  [${meta}]`);
    } catch (e) {
      console.log(`✗ ${rel}  [${meta}]  render: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`\nThumbs → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
