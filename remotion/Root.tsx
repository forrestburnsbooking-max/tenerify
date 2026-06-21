import { Composition } from "remotion";
import { TourReel } from "./TourReel";
import type { TourReelProps } from "./types";
import { clipKeyForSlug } from "./clip-groups";
import tours from "../data/tours.json";

const FPS = 30;
const DURATION_SECONDS = 14;

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
  );
};
