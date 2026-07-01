/**
 * Build a single HTML contact sheet of the source photos that actually drive the
 * reels (one per clip; grouped tours share their representative's photo). Open it
 * to eyeball which photos are bad and need replacing.
 *
 *   npx tsx scripts/photo-review.ts   →   out/photo-review.html
 */
import fs from "fs";
import path from "path";
import tours from "../data/tours.json";
import {
  clipKeyForSlug,
  representativeSlug,
  PHOTO_ONLY_CATEGORIES,
  NO_ANIMATE_CATEGORIES,
} from "../remotion/clip-groups";

type Tour = { slug: string; title: string; category?: string; imageUrl?: string };

const all = tours as Tour[];
// Tours whose hero photo becomes a Kling first-frame: animated only (skip photo-only
// categories and no-animate shows).
const skip = [...PHOTO_ONLY_CATEGORIES, ...NO_ANIMATE_CATEGORIES];
const animated = all.filter((t) => t.imageUrl && !skip.includes(t.category ?? ""));

// Group animated tours by the clip (photo) that backs them.
const byClip = new Map<string, { rep: Tour; members: Tour[] }>();
for (const t of animated) {
  const key = clipKeyForSlug(t.slug);
  if (!byClip.has(key)) {
    const rep = all.find((x) => x.slug === representativeSlug(key)) ?? t;
    byClip.set(key, { rep, members: [] });
  }
  byClip.get(key)!.members.push(t);
}

// In an HTML at out/, local /images/... live under ../public/images/...
function imgSrc(url: string): string {
  return /^https?:/i.test(url) ? url : `../public${url}`;
}

const cards = [...byClip.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([key, { rep, members }]) => {
    const grouped = members.length > 1;
    const memberList = grouped
      ? `<div class="members">used by ${members.length}: ${members.map((m) => m.slug).join(", ")}</div>`
      : "";
    return `
      <div class="card">
        <div class="imgwrap"><img class="bg" loading="lazy" src="${imgSrc(rep.imageUrl ?? "")}" alt=""><img class="fg" loading="lazy" src="${imgSrc(rep.imageUrl ?? "")}" alt="${key}"></div>
        <div class="meta">
          <div class="key">${key}${grouped ? ` <span class="badge">group</span>` : ""}</div>
          <div class="title">${rep.title}</div>
          ${memberList}
        </div>
      </div>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Kling first-frame photos — ${byClip.size} clips</title>
<style>
  body { margin:0; background:#0d0d0d; color:#ededed; font:14px/1.4 system-ui, sans-serif; padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#888; margin-bottom:20px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
  .card { background:#1a1a1a; border-radius:12px; overflow:hidden; border:1px solid #262626; }
  .imgwrap { aspect-ratio:9/16; background:#000; position:relative; overflow:hidden; }
  /* blurred fill + whole image on top — mirrors the reel composition (no crop) */
  .imgwrap .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(18px) brightness(0.5); transform:scale(1.2); }
  .imgwrap .fg { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
  .meta { padding:10px 12px; }
  .key { font-weight:700; color:#fb923c; }
  .badge { font-size:10px; background:#fb923c; color:#000; border-radius:4px; padding:1px 5px; vertical-align:middle; }
  .title { color:#ededed; margin:2px 0; }
  .members { color:#777; font-size:11px; margin-top:4px; word-break:break-word; }
</style></head>
<body>
  <h1>Reel source photos — ${byClip.size} clips for ${animated.length} tours</h1>
  <div class="sub">Each tile = the first frame fed to Kling (shown WHOLE, like the new reel composition — no crop). Spot any to re-shoot.</div>
  <div class="grid">${cards}</div>
</body></html>`;

const out = path.join(process.cwd(), "out", "photo-review.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log("→", out);
console.log(`${byClip.size} clip photos for ${animated.length} tours`);
