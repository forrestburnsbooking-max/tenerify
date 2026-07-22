"use client";

import { useEffect, useRef, useState } from "react";

type Track = { title: string; url: string };
type SegmentLine = { speaker: string; text: string; file: string };
type QueueItem =
  | { kind: "music"; title: string; url: string }
  | { kind: "segment"; speaker: string; text: string; url: string };

function buildQueue(tracks: Track[], segmentLines: SegmentLine[]): QueueItem[] {
  const musicItems: QueueItem[] = tracks.map((t) => ({ kind: "music", title: t.title, url: t.url }));
  const segmentItems: QueueItem[] = segmentLines.map((l) => ({
    kind: "segment",
    speaker: l.speaker,
    text: l.text,
    url: l.file,
  }));
  if (musicItems.length === 0) return segmentItems;
  if (segmentItems.length === 0) return musicItems;
  // Drop the news segment in after the first track, then keep rotating through music.
  return [musicItems[0], ...segmentItems, ...musicItems.slice(1)];
}

export default function RadioPlayer({
  tracks,
  segment,
}: {
  tracks: Track[];
  segment: { generatedAt: string; lines: SegmentLine[] } | null;
}) {
  const queue = buildQueue(tracks, segment?.lines ?? []);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = queue[index] ?? null;

  useEffect(() => {
    if (!audioRef.current || !current) return;
    audioRef.current.src = current.url;
    if (playing) audioRef.current.play().catch(() => setPlaying(false));
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const next = () => setIndex((i) => (i + 1) % Math.max(queue.length, 1));

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
        No tracks yet. Drop an mp3 from Suno into <code className="text-orange-400">public/radio/tracks/</code> to
        go on air.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
      <audio ref={audioRef} onEnded={next} />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-14 h-14 shrink-0 rounded-full bg-orange-500 hover:bg-orange-400 transition-colors flex items-center justify-center text-black text-xl"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-orange-400">On air</div>
          {current?.kind === "music" ? (
            <div className="text-white font-medium truncate">{current.title}</div>
          ) : current?.kind === "segment" ? (
            <div className="text-white font-medium truncate">{current.speaker} — Tenerife news</div>
          ) : null}
        </div>
        <button
          onClick={next}
          className="ml-auto px-4 py-2 rounded-full text-sm border border-white/15 text-white/80 hover:border-orange-500 hover:text-orange-400 transition-colors"
        >
          Skip →
        </button>
      </div>

      {current?.kind === "segment" && (
        <p className="text-white/80 text-sm leading-relaxed border-t border-white/10 pt-4">"{current.text}"</p>
      )}

      {segment && (
        <div className="text-xs text-white/40">
          News segment generated {new Date(segment.generatedAt).toLocaleString("en-GB")}
        </div>
      )}
    </div>
  );
}
