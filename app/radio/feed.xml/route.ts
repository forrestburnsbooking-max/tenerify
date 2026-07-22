import { getSpecialEpisodes } from "@/lib/radio";

const SITE_URL = "https://tenerify.ai";
const COVER_ART = `${SITE_URL}/og.png`; // 1200x630 — swap for a square 3000x3000 cover if you make one

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function GET() {
  const episodes = getSpecialEpisodes();

  const items = episodes
    .map((ep) => {
      const url = `${SITE_URL}${ep.episodeFile}`;
      const pubDate = new Date(ep.generatedAt).toUTCString();
      const description = ep.lines.map((l) => `${l.speaker}: ${l.text}`).join(" ");
      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(description.slice(0, 500))}</description>
      <guid isPermaLink="false">radio-tenerify-${ep.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${url}" length="${ep.episodeSizeBytes ?? 0}" type="audio/mpeg" />
      <itunes:duration>${formatDuration(ep.episodeDurationSeconds)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Radio Tenerify</title>
    <link>${SITE_URL}/radio</link>
    <atom:link href="${SITE_URL}/radio/feed.xml" rel="self" type="application/rss+xml" />
    <language>en</language>
    <description>AI-generated island radio for Tenerife — music plus deep-dive chats between two hosts on what's actually happening on the island.</description>
    <itunes:author>Radio Tenerify</itunes:author>
    <itunes:image href="${COVER_ART}" />
    <itunes:category text="News" />
    <itunes:explicit>false</itunes:explicit>
    <itunes:owner>
      <itunes:email>support@tenerify.ai</itunes:email>
    </itunes:owner>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
