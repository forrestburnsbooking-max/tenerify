import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";
import { getTranscript, saveTranscript, deleteTranscript, sanitizeMessages } from "@/lib/transcript";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

// Save / restore the chat transcript for the current tfy_sid cookie, so a
// returning visitor can continue the conversation. See lib/transcript.ts.

export const dynamic = "force-dynamic";

function withCookie(res: NextResponse, id: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}

export async function GET(req: NextRequest) {
  const id = req.cookies.get(SESSION_COOKIE)?.value;
  if (!id) return NextResponse.json({ messages: [], who: null, language: null });
  const t = await getTranscript(id);
  return NextResponse.json({
    messages: t?.messages ?? [],
    who: t?.who ?? null,
    language: t?.language ?? null,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`transcript:${ip}`, 60, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const { messages, who, language } = (body ?? {}) as {
    messages?: unknown;
    who?: unknown;
    language?: unknown;
  };
  const clean = sanitizeMessages(messages);
  if (!clean) return NextResponse.json({ error: "Invalid messages" }, { status: 400 });

  const id = req.cookies.get(SESSION_COOKIE)?.value || randomUUID();
  await saveTranscript(id, {
    messages: clean,
    who: typeof who === "string" ? who.slice(0, 100) : undefined,
    language: typeof language === "string" ? language.slice(0, 10) : undefined,
    updatedAt: new Date().toISOString(),
  });
  return withCookie(NextResponse.json({ ok: true }), id);
}

export async function DELETE(req: NextRequest) {
  const id = req.cookies.get(SESSION_COOKIE)?.value;
  if (id) await deleteTranscript(id);
  return NextResponse.json({ ok: true });
}
