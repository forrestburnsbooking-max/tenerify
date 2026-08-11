import path from "path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

async function main() {
  const ep = process.argv[2] || "02";
  const props = require(`../out/episodes/ep${ep}.props.json`);
  const ROOT = process.cwd();
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion", "index.ts") });
  const composition = await selectComposition({ serveUrl, id: "EpisodeReel", inputProps: props });
  const end = Math.max(...props.lines.map((l:any)=>l.fromFrame+l.durationFrames));
  const acts:Record<string,number> = {};
  for (const l of props.lines) if (!(l.act in acts)) acts[l.act] = l.fromFrame + Math.round(l.durationFrames*0.6);
  acts["cta"] = end - 20;
  for (const [name, frame] of Object.entries(acts)) {
    const out = path.join(ROOT, "out", "episodes", `ep${ep}-still-${name}.png`);
    await renderStill({ composition, serveUrl, frame, inputProps: props, output: out });
    console.log("✓", name, frame);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
