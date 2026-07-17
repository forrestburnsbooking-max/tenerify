/**
 * Edit a photo: put the person in a clean white Tenerify t-shirt.
 *   npx tsx scripts/tshirt-edit.ts [image] [logo] [model]
 * Default: avatar-source.jpg + public/logo.png via fal Nano Banana (Gemini) edit.
 * Output: out/avatar/tshirt.png
 */
import fs from "fs";
import path from "path";

try {
  for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const FAL_KEY = process.env.FAL_KEY;
const ROOT = process.cwd();
const IMAGE = process.argv[2] || "public/reels/face/avatar-source.jpg";
const LOGO = process.argv[3] || "public/logo.png";
const MODEL = process.argv[4] || "fal-ai/nano-banana/edit";

async function falUpload(filePath: string, contentType: string): Promise<string> {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(filePath) }),
  });
  if (!init.ok) throw new Error(`upload ${init.status}: ${(await init.text()).slice(0, 200)}`);
  const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string };
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: fs.readFileSync(filePath) });
  if (!put.ok) throw new Error(`put ${put.status}`);
  return file_url;
}

async function falRun<T>(model: string, input: unknown): Promise<T> {
  const res = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { status_url, response_url } = (await res.json()) as { status_url: string; response_url: string };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const s = await fetch(status_url, { headers });
      if (!s.ok) continue;
      const t = await s.text();
      if (!t) continue;
      const sj = JSON.parse(t) as { status: string };
      process.stdout.write(`\r  ${sj.status}   `);
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error("FAILED");
    } catch (e) { if ((e as Error).message === "FAILED") throw e; }
  }
  const r = await fetch(response_url, { headers });
  if (!r.ok) throw new Error(`result ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

async function main() {
  if (!FAL_KEY) return console.error("Missing FAL_KEY");
  console.log(`▶ tshirt edit\n  model: ${MODEL}`);
  const imageUrl = await falUpload(path.join(ROOT, IMAGE), "image/jpeg");
  const logoUrl = await falUpload(path.join(ROOT, LOGO), "image/png");
  const prompt =
    "Replace the person's shirt with a clean, plain white cotton t-shirt. Print the provided Tenerify logo (orange volcano mark with the word Tenerify) neatly on the left chest, small and tasteful like real merch. Keep the person's face, sunglasses, skin, pose and the background exactly the same. Photorealistic.";
  const out = await falRun<{ images?: { url: string }[] }>(MODEL, {
    prompt,
    image_urls: [imageUrl, logoUrl],
    num_images: 1,
  });
  const url = out.images?.[0]?.url;
  if (!url) return console.error("\nno image:", JSON.stringify(out).slice(0, 200));
  const dir = path.join(ROOT, "out", "avatar");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "tshirt.png");
  const v = await fetch(url);
  fs.writeFileSync(dest, Buffer.from(await v.arrayBuffer()));
  console.log(`\n✓ ${dest}`);
}
main().catch((e) => { console.error("\n", (e as Error).message); process.exit(1); });
