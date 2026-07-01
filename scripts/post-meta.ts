/**
 * Post ONE reel to Instagram (and optionally Facebook Page) via the Meta Graph API.
 * One post per run — you approve each Bash call, like outreach/send.py.
 *
 *   npx tsx scripts/post-meta.ts \
 *     --video-url https://cdn.tenerify.ai/reels/maxicat-catamaran.mp4 \
 *     --caption-file /tmp/cap.txt \
 *     [--fb]            # also post to the linked FB Page
 *     [--dry-run]
 *
 * Env (never commit — put in .env.local):
 *   META_ACCESS_TOKEN   long-lived Page/User token with instagram_content_publish + pages_manage_posts
 *   IG_USER_ID          Instagram Business account id (numeric)
 *   FB_PAGE_ID          Facebook Page id (numeric) — only needed for --fb
 *
 * Notes:
 * - Instagram Reels publishing is async: create a media container (media_type=REELS,
 *   video_url), poll status_code until FINISHED, then publish. Video MUST be at a
 *   public HTTPS URL (IG fetches it) — host reels on R2/Blob/tenerify.ai, not locally.
 * - IG allows ~25 API-published posts per 24h. Plenty for a daily cadence.
 */
import fs from "fs";

const API = "https://graph.facebook.com/v21.0";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const TOKEN = process.env.META_ACCESS_TOKEN ?? "";
const IG_USER_ID = process.env.IG_USER_ID ?? "";
const FB_PAGE_ID = process.env.FB_PAGE_ID ?? "";

const videoUrl = arg("video-url");
const captionFile = arg("caption-file");
const alsoFb = has("fb");
const dryRun = has("dry-run");

async function gql(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const url = new URL(`${API}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res =
    method === "GET"
      ? await fetch(`${url}?${body}`)
      : await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Graph ${path} failed: ${JSON.stringify(json.error ?? json)}`);
  }
  return json;
}

async function postInstagram(caption: string) {
  // 1. create container
  const container = await gql(`${IG_USER_ID}/media`, {
    media_type: "REELS",
    video_url: videoUrl!,
    caption,
    share_to_feed: "true",
  });
  const creationId = container.id as string;
  console.log(`IG container ${creationId} created — waiting for processing…`);

  // 2. poll until FINISHED (Reels transcode can take 30-90s)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await gql(creationId, { fields: "status_code,status" }, "GET");
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error(`IG processing error: ${st.status}`);
    process.stdout.write(".");
  }
  console.log();

  // 3. publish
  const pub = await gql(`${IG_USER_ID}/media_publish`, { creation_id: creationId });
  console.log(`✓ Instagram published: media ${pub.id}`);
}

async function postFacebook(caption: string) {
  const res = await gql(`${FB_PAGE_ID}/videos`, {
    file_url: videoUrl!,
    description: caption,
  });
  console.log(`✓ Facebook published: video ${res.id}`);
}

async function main() {
  if (!videoUrl || !captionFile) {
    console.error("Usage: --video-url <url> --caption-file <path> [--fb] [--dry-run]");
    process.exit(1);
  }
  const caption = fs.readFileSync(captionFile, "utf8").trim();

  if (dryRun) {
    console.log("DRY RUN — would post:");
    console.log("  video:", videoUrl);
    console.log("  targets:", ["Instagram", alsoFb ? "Facebook" : null].filter(Boolean).join(" + "));
    console.log("  caption:\n" + caption.replace(/^/gm, "    "));
    return;
  }
  if (!TOKEN || !IG_USER_ID) {
    console.error("Missing META_ACCESS_TOKEN / IG_USER_ID in env");
    process.exit(1);
  }

  await postInstagram(caption);
  if (alsoFb) {
    if (!FB_PAGE_ID) throw new Error("--fb needs FB_PAGE_ID in env");
    await postFacebook(caption);
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
