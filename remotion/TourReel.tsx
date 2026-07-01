import {
  AbsoluteFill,
  Img,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import type { TourReelProps } from "./types";

const { fontFamily } = loadFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

const ORANGE = "#fb923c"; // app's orange-400 accent
const ORANGE_DEEP = "#ea580c"; // orange-600

// Kling clips are ~5s; loop the background so it fills the whole reel (no freeze).
const CLIP_LOOP_FRAMES = 150;

// Background layers: a blurred, darkened copy fills the frame, the sharp media is
// shown whole on top (object-fit: contain) so the boat/product is never cropped.
const FILL_BLUR: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: "blur(36px) brightness(0.55)",
  transform: "scale(1.2)",
};
const FIT_CONTAIN: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

// Title font size shrinks as the title gets longer so it always fits.
function titleSize(title: string): number {
  if (title.length > 46) return 70;
  if (title.length > 32) return 84;
  if (title.length > 22) return 98;
  return 112;
}

function prettyCategory(category: string): string {
  return category.replace(/-/g, " ").toUpperCase();
}

// Fade in over the first `edge` frames and out over the last `edge` frames of a window.
function beatFade(localFrame: number, length: number, edge = 16): number {
  return interpolate(
    localFrame,
    [0, edge, length - edge, length],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
}

// Fade in then hold (for the final beat, which stays until the end).
function fadeInHold(localFrame: number, edge = 16): number {
  return interpolate(localFrame, [0, edge], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const Chip: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 26}px)`,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(8px)",
        borderRadius: 999,
        padding: "16px 30px",
        fontSize: 38,
        fontWeight: 600,
        color: "#fff",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

export const TourReel: React.FC<TourReelProps> = ({
  title,
  priceFrom,
  duration,
  minAge,
  imageUrl,
  category,
  languages,
  tagline,
  clip,
  clips,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const multishot = clips && clips.length > 1;
  const segLen = multishot ? Math.floor(durationInFrames / clips!.length) : 0;
  const clipSrc = clip ? (clip.startsWith("http") ? clip : staticFile(`clips/${clip}`)) : "";
  // Local /images/... paths must go through staticFile; remote URLs pass through.
  const imgSrc = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : staticFile(imageUrl.replace(/^\//, ""))
    : "";

  // Beat timing (frames). Three acts: HOOK → DETAILS → OFFER.
  const beatA = { from: 0, len: Math.round(durationInFrames * 0.34) };
  const beatB = { from: beatA.len, len: Math.round(durationInFrames * 0.33) };
  const beatC = { from: beatA.len + beatB.len, len: durationInFrames - beatA.len - beatB.len };

  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const ctaPulse = 1 + 0.035 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0d0d", fontFamily }}>
      {/* Background: animated clip if present, else photo. The whole subject is
          shown (object-fit: contain) over a blurred fill so nothing is cropped. */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {multishot ? (
          <Series>
            {clips!.map((c, i) => {
              // Last shot absorbs the rounding remainder so the cuts fill the reel exactly.
              const len = i === clips!.length - 1 ? durationInFrames - segLen * (clips!.length - 1) : segLen;
              const src = c.startsWith("http") ? c : staticFile(`clips/${c}`);
              return (
                <Series.Sequence key={c} durationInFrames={len}>
                  <OffthreadVideo src={src} muted style={FILL_BLUR} />
                  <OffthreadVideo src={src} muted style={FIT_CONTAIN} />
                </Series.Sequence>
              );
            })}
          </Series>
        ) : clipSrc ? (
          <Loop durationInFrames={CLIP_LOOP_FRAMES}>
            <OffthreadVideo src={clipSrc} muted style={FILL_BLUR} />
            <OffthreadVideo src={clipSrc} muted style={FIT_CONTAIN} />
          </Loop>
        ) : imgSrc ? (
          <>
            <Img src={imgSrc} style={FILL_BLUR} />
            <Img src={imgSrc} style={FIT_CONTAIN} />
          </>
        ) : null}
      </AbsoluteFill>

      {/* Legibility gradient */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,13,13,0.6) 0%, rgba(13,13,13,0.05) 30%, rgba(13,13,13,0.25) 55%, rgba(13,13,13,0.94) 100%)",
        }}
      />

      {/* Brand (persistent) */}
      <div
        style={{
          position: "absolute",
          top: 70,
          width: "100%",
          textAlign: "center",
          fontSize: 46,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: -1,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}
      >
        Tenerify 🌋
      </div>

      {/* Persistent title near the bottom */}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 430,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 50}px)`,
          color: "#fff",
          fontSize: titleSize(title),
          lineHeight: 1.02,
          fontWeight: 800,
          letterSpacing: -2,
          textShadow: "0 4px 30px rgba(0,0,0,0.55)",
        }}
      >
        {title}
      </div>

      {/* Rotating slot above title: changes each beat */}
      {/* BEAT A — hook: category */}
      <Sequence from={beatA.from} durationInFrames={beatA.len} layout="none">
        <BeatBox opacity={(f) => beatFade(f, beatA.len)}>
          {category ? (
            <div style={{ color: ORANGE, fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>
              {prettyCategory(category)}
            </div>
          ) : null}
        </BeatBox>
      </Sequence>

      {/* BEAT B — details: chips + tagline */}
      <Sequence from={beatB.from} durationInFrames={beatB.len} layout="none">
        <BeatBox opacity={(f) => beatFade(f, beatB.len)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {duration ? <Chip delay={4}>⏱ {duration}</Chip> : null}
              {minAge ? <Chip delay={9}>👶 {minAge}+</Chip> : null}
              {languages.length ? <Chip delay={14}>🌍 {languages.length} languages</Chip> : null}
            </div>
            {tagline ? (
              <div style={{ color: "#f3f3f3", fontSize: 40, fontWeight: 600, lineHeight: 1.2 }}>
                {tagline}
              </div>
            ) : null}
          </div>
        </BeatBox>
      </Sequence>

      {/* BEAT C — offer: price + CTA (holds to the end) */}
      <Sequence from={beatC.from} durationInFrames={beatC.len} layout="none">
        <BeatBox opacity={(f) => fadeInHold(f)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <PriceBadge priceFrom={priceFrom} />
            <div
              style={{
                transform: `scale(${ctaPulse})`,
                transformOrigin: "left center",
                color: "#fff",
                fontSize: 48,
                fontWeight: 800,
              }}
            >
              Book now → Tenerify.ai
            </div>
          </div>
        </BeatBox>
      </Sequence>
    </AbsoluteFill>
  );
};

// Container for the rotating content slot (sits just below the persistent title).
const BeatBox: React.FC<{
  children: React.ReactNode;
  opacity: (localFrame: number) => number;
}> = ({ children, opacity }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 150,
        opacity: opacity(frame),
      }}
    >
      {children}
    </div>
  );
};

const PriceBadge: React.FC<{ priceFrom: number }> = ({ priceFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  return (
    <div
      style={{
        transform: `scale(${pop})`,
        alignSelf: "flex-start",
        background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
        borderRadius: 28,
        padding: "22px 44px",
        boxShadow: "0 18px 50px rgba(234,88,12,0.5)",
      }}
    >
      <span style={{ color: "#fff", fontSize: 38, fontWeight: 600, opacity: 0.9 }}>from </span>
      <span style={{ color: "#fff", fontSize: 64, fontWeight: 800 }}>€{priceFrom}</span>
    </div>
  );
};
