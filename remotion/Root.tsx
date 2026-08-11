import { Composition } from "remotion";
import { TourReel } from "./TourReel";
import { EpisodeReel } from "./EpisodeReel";
import type { TourReelProps } from "./types";
import {
  computeDurationInFrames,
  type EpisodeReelProps,
} from "./episodes/types";
import { clipKeyForSlug } from "./clip-groups";
import tours from "../data/tours.json";

const FPS = 30;
const DURATION_SECONDS = 14;

// Studio-only sample so the EpisodeReel preview isn't blank. The build script
// (scripts/build-episode.ts) overrides every prop with real git + TTS data and
// derives the true length via calculateMetadata.
const EPISODE_SAMPLE: EpisodeReelProps = {
  no: 1,
  total: 10,
  dateLabel: "7 июня 2026",
  startClock: "12:49",
  endClock: "23:48",
  commitCount: 16,
  commits: [
    { hash: "9284938", time: "12:49", subject: "Initial commit — Tenerify.ai", highlight: true },
    { hash: "ef5cb89", time: "16:44", subject: "Add photos to tours, media cards in chat", highlight: true },
    { hash: "fc3a19c", time: "17:21", subject: "Add Stripe Checkout: Pay & Book button", highlight: true },
    { hash: "bf83a5b", time: "17:49", subject: "Add ticket generation with QR code", highlight: false },
    { hash: "681ce32", time: "23:48", subject: "Add IP-based rate limiting", highlight: false },
  ],
  sprintMode: "day",
  sprintLabel: "КОММИТОВ ЗА ДЕНЬ",
  nextTitle: "Мой AI начал раздавать деньги",
  lines: [
    { act: "hook", caption: "Пустая папка. Одна команда.", audioSrc: "", fromFrame: 0, durationFrames: 90 },
    { act: "sprint", caption: "16 коммитов за день", audioSrc: "", fromFrame: 90, durationFrames: 150 },
    { act: "payoff", caption: "Из git init — в работающую платформу", audioSrc: "", fromFrame: 240, durationFrames: 120 },
    { act: "cta", caption: "Как я собрал Tenerify · 1 / 10", audioSrc: "", fromFrame: 360, durationFrames: 120 },
  ],
};

// Pick a tour with an image so the Studio preview isn't blank.
const sample = (tours as Array<Record<string, unknown>>).find((t) => t.imageUrl) ?? tours[0];

// First sentence of the description, trimmed to a punchy length.
function firstSentence(desc: unknown): string {
  const text = String(desc ?? "").replace(/\s+/g, " ").trim();
  const end = text.search(/[.!?]/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  return sentence.length > 90 ? sentence.slice(0, 87).trimEnd() + "…" : sentence;
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="TourReel"
      component={TourReel}
      durationInFrames={FPS * DURATION_SECONDS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={
        {
          title: String(sample.title ?? ""),
          priceFrom: Number(sample.priceFrom ?? 0),
          duration: (sample.duration as string) ?? null,
          minAge: (sample.minAge as number) ?? null,
          imageUrl: String(sample.imageUrl ?? ""),
          category: String(sample.category ?? ""),
          languages: (sample.languages as string[]) ?? [],
          tagline: firstSentence(sample.description),
          // Studio preview points at the sample's clip; render passes the real value.
          clip: `${clipKeyForSlug(String(sample.slug ?? ""))}.mp4`,
        } satisfies TourReelProps
      }
    />

    <Composition
      id="EpisodeReel"
      component={EpisodeReel}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={EPISODE_SAMPLE}
      calculateMetadata={({ props }) => ({
        durationInFrames: computeDurationInFrames(props.lines, FPS),
      })}
    />
    </>
  );
};
