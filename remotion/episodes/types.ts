import type { Act } from "./script";

/** One real commit, shown in the git-log "sprint" act. */
export type Commit = {
  hash: string;
  time: string; // "HH:MM"
  subject: string;
  highlight: boolean;
};

/** A narration line placed on the timeline (frames), with its TTS audio. */
export type TimedLine = {
  act: Act;
  caption: string;
  /** Path under public/ for the TTS clip, or "" for a silent preview line. */
  audioSrc: string;
  /** Path under public/ for the lip-synced presenter clip (muted PiP), if any. */
  presenterSrc?: string;
  fromFrame: number;
  durationFrames: number;
};

export type EpisodeReelProps = {
  no: number;
  total: number;
  dateLabel: string;
  startClock: string; // first commit time, "HH:MM" (day mode)
  endClock: string; // last commit time, "HH:MM" (day mode)
  commitCount: number;
  commits: Commit[];
  lines: TimedLine[];
  /** "day" = single-day sprint with a ticking clock; "curated" = hand-picked
   *  commits across dates (commit.time holds a date label like "12 июн"). */
  sprintMode: "day" | "curated";
  /** HUD label under the commit counter in the sprint act. */
  sprintLabel: string;
  /** If set, the hook act shows a mocked AI chat message instead of a terminal. */
  hookChat?: string;
  /** If set, the hook act plays this real clip full-screen (path under public/). */
  hookVideo?: string;
  /** Dimmed real-footage backdrop behind the chat-glitch hook card. */
  hookBgSrc?: string;
  /** Title of the next episode, teased on the outro card. */
  nextTitle?: string;
  /** Real b-roll clip (path under public/) for the payoff background; falls back
   *  to the stock hero video when absent. */
  brollSrc?: string;
  /** UI language for baked-in strings (end card, stamps). Default "ru". */
  lang?: "ru" | "en";
  /** Real screen-rec clip (path under public/) shown dimmed behind the sprint act. */
  sprintVideo?: string;
};

/** Total render length = end of the last line + a short tail. */
export function computeDurationInFrames(
  lines: TimedLine[],
  fps: number
): number {
  if (lines.length === 0) return fps * 6;
  const end = Math.max(...lines.map((l) => l.fromFrame + l.durationFrames));
  return end + Math.round(fps * 0.6); // ~0.6s tail so the CTA holds
}

/** Frame window [start, end) covering every line of a given act. */
export function actWindow(
  lines: TimedLine[],
  act: Act
): { start: number; length: number } | null {
  const own = lines.filter((l) => l.act === act);
  if (own.length === 0) return null;
  const start = Math.min(...own.map((l) => l.fromFrame));
  const end = Math.max(...own.map((l) => l.fromFrame + l.durationFrames));
  return { start, length: end - start };
}
