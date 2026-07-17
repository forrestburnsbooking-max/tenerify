/**
 * Reels intake bot — send videos from your phone, they land in the local archive.
 *
 *   TELEGRAM_REELS_BOT_TOKEN=xxx npx tsx scripts/reels-bot.ts
 *   (or: npm run reels:bot  — reads the token from .env.local)
 *
 * Long-polls Telegram; every video / document / animation you send is saved into
 * public/reels/<folder>/. Route it by adding a caption: "broll", "screens", "face"
 * or "music" — no caption → public/reels/inbox/. The bot replies to confirm.
 *
 * Notes:
 * - Standard Bot API caps downloads at 20 MB. Short phone clips usually fit; the
 *   bot warns if a file is too big.
 * - Optionally restrict to your own chat: set TELEGRAM_REELS_CHAT_ID.
 * - Runs locally (where the render happens). Stop with Ctrl-C; offset is persisted
 *   so it resumes without re-downloading.
 */
import fs from "fs";
import path from "path";

// Load .env.local so `npm run reels:bot` works without exporting vars by hand.
try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on real env */
}

const TOKEN = process.env.TELEGRAM_REELS_BOT_TOKEN;
const ONLY_CHAT = process.env.TELEGRAM_REELS_CHAT_ID; // optional allow-list
const ROOT = process.cwd();
const REELS_DIR = path.join(ROOT, "public", "reels");
const OFFSET_FILE = path.join(ROOT, "out", "episodes", "reels-bot-offset.txt");
// Cloud Bot API caps downloads at 20 MB (hard Telegram limit). A self-hosted
// Bot API server raises it to 2 GB — then bump REELS_MAX_MB (e.g. 25 or more).
const MAX_BYTES = Number(process.env.REELS_MAX_MB || 20) * 1024 * 1024;
const FOLDERS = ["broll", "screens", "face", "music"];

const api = (m: string) => `https://api.telegram.org/bot${TOKEN}/${m}`;

async function tg<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result as T;
}

async function reply(chatId: number, text: string) {
  try {
    await tg("sendMessage", { chat_id: chatId, text });
  } catch {
    /* non-fatal */
  }
}

function readOffset(): number {
  try {
    return Number(fs.readFileSync(OFFSET_FILE, "utf8").trim()) || 0;
  } catch {
    return 0;
  }
}
function writeOffset(n: number) {
  fs.mkdirSync(path.dirname(OFFSET_FILE), { recursive: true });
  fs.writeFileSync(OFFSET_FILE, String(n));
}

function folderFromCaption(caption?: string): string {
  const c = (caption ?? "").toLowerCase();
  return FOLDERS.find((f) => c.includes(f)) ?? "inbox";
}

function extFor(fileName?: string, mime?: string, kind?: string): string {
  if (fileName && path.extname(fileName)) return path.extname(fileName);
  if (kind === "photo") return ".jpg"; // Telegram photos carry no mime/name
  if (mime?.startsWith("video")) return ".mp4";
  if (mime?.startsWith("audio")) return ".mp3";
  if (mime?.startsWith("image")) return ".jpg";
  return ".mp4";
}

type TgFile = { file_id: string; file_unique_id: string; file_size?: number; file_name?: string; mime_type?: string };

// Pull the best downloadable media object out of a message.
function pickMedia(msg: any): { file: TgFile; kind: string } | null {
  if (msg.video) return { file: msg.video, kind: "video" };
  if (msg.animation) return { file: msg.animation, kind: "animation" };
  if (msg.document) return { file: msg.document, kind: "document" };
  if (msg.audio) return { file: msg.audio, kind: "audio" };
  if (msg.voice) return { file: msg.voice, kind: "voice" };
  if (msg.photo?.length) return { file: msg.photo[msg.photo.length - 1], kind: "photo" };
  return null;
}

async function download(fileId: string, dest: string) {
  const f = await tg<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.file_path}`);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ─── voice → text (whisper on fal) ─────────────────────────────────────────
const FAL_KEY = process.env.FAL_KEY;
const WHISPER_MODEL = "fal-ai/whisper";
const NOTES_FILE = path.join(ROOT, "out", "notes", "transcripts.md");

async function falUpload(filePath: string, contentType: string): Promise<string> {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType, file_name: path.basename(filePath) }),
  });
  if (!init.ok) throw new Error(`upload ${init.status}`);
  const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string };
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: fs.readFileSync(filePath) });
  if (!put.ok) throw new Error(`put ${put.status}`);
  return file_url;
}

async function transcribe(filePath: string): Promise<string> {
  if (!FAL_KEY) throw new Error("no FAL_KEY for transcription");
  const audio_url = await falUpload(filePath, "audio/ogg");
  const res = await fetch(`https://queue.fal.run/${WHISPER_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url, task: "transcribe", language: "ru" }),
  });
  if (!res.ok) throw new Error(`whisper submit ${res.status}`);
  const { status_url, response_url } = (await res.json()) as { status_url: string; response_url: string };
  const headers = { Authorization: `Key ${FAL_KEY}` };
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const s = await fetch(status_url, { headers });
      if (!s.ok) continue;
      const t = await s.text();
      if (!t) continue;
      const sj = JSON.parse(t) as { status: string };
      if (sj.status === "COMPLETED") break;
      if (sj.status === "FAILED") throw new Error("whisper FAILED");
    } catch (e) { if ((e as Error).message === "whisper FAILED") throw e; }
  }
  const r = await fetch(response_url, { headers });
  if (!r.ok) throw new Error(`whisper result ${r.status}`);
  const rj = (await r.json()) as { text?: string };
  return (rj.text ?? "").trim();
}

async function handle(msg: any) {
  const chatId = msg.chat?.id as number;
  if (!chatId) return;
  if (ONLY_CHAT && String(chatId) !== ONLY_CHAT) return;

  if (msg.text === "/start" || msg.text === "/id") {
    await reply(chatId, `Кидай видео — в архив рилсов (подпись broll/screens/face/music).\nШли голосовое — расшифрую в текст для правок.\nchat id: ${chatId}`);
    return;
  }

  const media = pickMedia(msg);
  if (!media) {
    if (msg.text) await reply(chatId, "Пришли видео, файл или голосовое 🎥🎧");
    return;
  }
  const { file, kind } = media;

  // Voice / audio note → transcribe to text, log to out/notes/transcripts.md.
  if (kind === "voice" || kind === "audio") {
    await reply(chatId, "🎧 Расшифровываю…");
    const dir = path.dirname(NOTES_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const voicePath = path.join(dir, `voice-${stamp}.oga`);
    try {
      await download(file.file_id, voicePath);
      const text = await transcribe(voicePath);
      fs.appendFileSync(NOTES_FILE, `\n## ${stamp}\n${text}\n`);
      console.log(`📝 ${text}`);
      await reply(chatId, `📝 ${text}`);
    } catch (err) {
      console.error("✗ transcribe", (err as Error).message);
      await reply(chatId, `❌ Не смог расшифровать: ${(err as Error).message}`);
    }
    return;
  }

  if (file.file_size && file.file_size > MAX_BYTES) {
    const mb = (file.file_size / 1024 / 1024).toFixed(1);
    await reply(chatId, `⚠️ Файл ${mb} МБ — больше лимита Telegram (20 МБ). Пришли покороче или как сжатое видео.`);
    return;
  }

  const folder = folderFromCaption(msg.caption);
  const dir = path.join(REELS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const base = file.file_name?.replace(/\s+/g, "-") ?? `${kind}-${stamp}-${file.file_unique_id}${extFor(undefined, file.mime_type, kind)}`;
  const dest = path.join(dir, base);

  try {
    await download(file.file_id, dest);
    const mb = ((file.file_size ?? fs.statSync(dest).size) / 1024 / 1024).toFixed(1);
    console.log(`✓ ${folder}/${base} (${mb} MB)`);
    await reply(chatId, `✅ Сохранил в ${folder}/ (${mb} МБ)`);
  } catch (err) {
    console.error("✗", (err as Error).message);
    await reply(chatId, `❌ Не смог сохранить: ${(err as Error).message}`);
  }
}

async function main() {
  if (!TOKEN) {
    console.error("Missing TELEGRAM_REELS_BOT_TOKEN. Create a bot via @BotFather, then:\n  add TELEGRAM_REELS_BOT_TOKEN=... to .env.local");
    process.exit(1);
  }
  const me = await tg<{ username: string }>("getMe");
  console.log(`▶ Reels bot @${me.username} listening. Send videos from your phone. Ctrl-C to stop.`);
  console.log(`  → saving into ${REELS_DIR}/<folder>/`);

  let offset = readOffset();
  for (;;) {
    let updates: any[] = [];
    try {
      updates = await tg<any[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
    } catch (err) {
      console.error("poll error:", (err as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    for (const u of updates) {
      offset = u.update_id + 1;
      if (u.message) {
        try {
          await handle(u.message);
        } catch (err) {
          console.error("handle error:", (err as Error).message);
        }
      }
    }
    if (updates.length) writeOffset(offset);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
