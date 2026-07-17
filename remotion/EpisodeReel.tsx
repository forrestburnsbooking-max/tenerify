import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadMono } from "@remotion/google-fonts/RobotoMono";
import type { Commit, EpisodeReelProps, TimedLine } from "./episodes/types";
import { actWindow } from "./episodes/types";

// Montserrat (not Plus Jakarta Sans) — it ships a Cyrillic subset for the RU copy.
const { fontFamily: SANS } = loadSans("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin", "cyrillic"],
});
const { fontFamily: MONO } = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin", "cyrillic"],
});

const ORANGE = "#fb923c";
const ORANGE_DEEP = "#ea580c";
const GREEN = "#22c55e";
const BG = "#0a0a0a";

// Platform safe-area insets for 1080×1920 Reels/TikTok/Shorts: keep all copy
// clear of the top account/sound overlay and the bottom caption + right-hand
// action rail (like/comment/share). Subtitles live above CAPTION_BOTTOM.
const SAFE_X = 80;
const SAFE_TOP = 150;
const CAPTION_BOTTOM = 340;

// "HH:MM" → total minutes.
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fmtClock(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── ACT 1: terminal hook ────────────────────────────────────────────────
const TerminalHook: React.FC<{ dateLabel: string }> = ({ dateLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prompt = "~/tenerify $ git init";
  // Typewriter reveal of the command.
  const typed = Math.min(prompt.length, Math.floor(frame / 1.7));
  const showOutput = frame > prompt.length * 1.7 + 8;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        justifyContent: "center",
        padding: 70,
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 40}px) scale(${1 + frame * 0.0006})`,
          background: "#111214",
          border: "1px solid #26282c",
          borderRadius: 28,
          padding: "40px 44px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          fontFamily: MONO,
        }}
      >
        {/* window chrome */}
        <div style={{ display: "flex", gap: 14, marginBottom: 34 }}>
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
            <div key={c} style={{ width: 22, height: 22, borderRadius: 999, background: c }} />
          ))}
        </div>
        <div style={{ fontSize: 40, color: "#6b7280", marginBottom: 20 }}>
          # {dateLabel}, 12:49
        </div>
        <div style={{ fontSize: 48, color: "#e5e7eb", lineHeight: 1.4 }}>
          <span style={{ color: GREEN }}>{prompt.slice(0, typed)}</span>
          {typed < prompt.length && cursorOn ? (
            <span style={{ color: GREEN }}>▋</span>
          ) : null}
        </div>
        {showOutput ? (
          <div style={{ fontSize: 40, color: "#6b7280", marginTop: 18 }}>
            Initialized empty Git repository
            {cursorOn ? <span style={{ color: "#e5e7eb" }}> ▋</span> : null}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ─── ACT 1 (alt): full-screen real-footage hook ──────────────────────────
const VideoHook: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const kb = interpolate(frame, [0, durationInFrames], [1, 1.08], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${kb})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.05) 30%, rgba(13,13,13,0.3) 60%, rgba(13,13,13,0.9) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ─── ACT 1 (alt): "AI misbehaving" chat hook ─────────────────────────────
const ChatGlitchHook: React.FC<{ message: string; bgSrc?: string; lang?: "ru" | "en" }> = ({ message, bgSrc, lang = "ru" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 4, fps, config: { damping: 18, mass: 0.7 } });
  const stamp = spring({ frame: frame - 26, fps, config: { damping: 10, mass: 0.6 } });

  return (
    <AbsoluteFill
      style={{ backgroundColor: BG, justifyContent: "center", padding: 70 }}
    >
      {/* Real footage behind the chat card so the hook isn't a flat dark frame */}
      {bgSrc ? (
        <Loop durationInFrames={330}>
          <OffthreadVideo
            src={staticFile(bgSrc)}
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.35) saturate(0.9)",
            }}
          />
        </Loop>
      ) : null}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(220,38,38,0.18), rgba(10,10,10,0.25) 55%)",
        }}
      />
      <div
        style={{
          opacity: card,
          transform: `translateY(${(1 - card) * 50}px) scale(${1 + frame * 0.0007})`,
          background: "rgba(23,23,26,0.9)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 34,
          padding: 44,
          fontFamily: SANS,
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
            }}
          />
          <div style={{ color: "#fff", fontSize: 34, fontWeight: 700 }}>
            Your local AI friend
          </div>
        </div>
        <div style={{ color: "#f3f4f6", fontSize: 46, fontWeight: 600, lineHeight: 1.3 }}>
          {message}
        </div>
        {/* "so you can't" stamp */}
        <div
          style={{
            transform: `scale(${stamp}) rotate(-7deg)`,
            transformOrigin: "left center",
            marginTop: 30,
            display: "inline-block",
            background: "#dc2626",
            color: "#fff",
            fontSize: 34,
            fontWeight: 800,
            padding: "12px 26px",
            borderRadius: 14,
            letterSpacing: 1,
          }}
        >
          {lang === "en" ? "❌ NOT OK" : "❌ ТАК НЕЛЬЗЯ"}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ACT 2: git-log sprint — commit slideshow with hard cuts ─────────────
const CommitSlideshow: React.FC<{
  commits: Commit[];
  commitCount: number;
  startClock: string;
  endClock: string;
  length: number;
  mode: "day" | "curated";
  label: string;
  bgVideo?: string;
}> = ({ commits, commitCount, startClock, endClock, length, mode, label, bgVideo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const curated = mode === "curated";
  const progress = interpolate(frame, [0, length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Feature the narrative (highlighted) commits as full-screen cut shots.
  const featured = commits.filter((c) => c.highlight);
  const shots = featured.length > 0 ? featured : commits;
  const shotLen = length / shots.length;
  const idx = Math.min(shots.length - 1, Math.floor(frame / shotLen));
  const local = frame - idx * shotLen;
  const active = shots[idx];

  // Hard cut + punch: instant swap, quick scale settle, tiny slide drift.
  const punch = interpolate(local, [0, 6], [1.09, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cutIn = interpolate(local, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = interpolate(local, [0, shotLen], [0, -18]);

  const shownCount = Math.max(1, Math.round(progress * commitCount));
  const clock = fmtClock(
    interpolate(progress, [0, 1], [toMinutes(startClock), toMinutes(endClock)])
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: MONO }}>
      {/* Real footage under the commit slideshow (dimmed screen-rec of him coding) */}
      {bgVideo ? (
        <Loop durationInFrames={420}>
          <OffthreadVideo
            src={staticFile(bgVideo)}
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.35) saturate(0.9)",
            }}
          />
        </Loop>
      ) : null}
      {/* Legibility scrim over the footage */}
      {bgVideo ? (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.25) 45%, rgba(10,10,10,0.6) 100%)",
          }}
        />
      ) : null}

      {/* Full-screen commit shot (cuts on every commit) */}
      <div
        key={active.hash}
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: 640,
          opacity: cutIn,
          transform: `scale(${punch}) translateY(${drift}px)`,
          transformOrigin: "left top",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 26 }}>
          <span style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, color: ORANGE }}>
            {active.hash}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 34,
              color: "#9ca3af",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 999,
              padding: "6px 20px",
            }}
          >
            {active.time}
          </span>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 64,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.08,
            letterSpacing: -1,
          }}
        >
          {active.subject.replace(/\s[—–-]\s.*$/, "").trim() || active.subject}
        </div>
        {/* shot index */}
        <div style={{ fontFamily: MONO, fontSize: 32, color: "#4b5563", marginTop: 34 }}>
          {String(idx + 1).padStart(2, "0")} / {String(shots.length).padStart(2, "0")}
        </div>
      </div>

      {/* HUD */}
      {curated ? (
        // Curated: a git-log command header + a themed label (no clock/counter,
        // so we never fight Russian numeral grammar).
        <div style={{ position: "absolute", top: SAFE_TOP, left: SAFE_X, right: SAFE_X }}>
          <div style={{ fontFamily: MONO, fontSize: 40, color: "#6b7280" }}>
            <span style={{ color: GREEN }}>$</span> git log{" "}
            <span style={{ color: "#e5e7eb" }}>--grep</span>
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 52,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.05,
              marginTop: 14,
              letterSpacing: -1,
            }}
          >
            {label}
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", top: SAFE_TOP, left: SAFE_X, fontFamily: SANS }}>
            <div
              style={{
                fontSize: 150,
                fontWeight: 800,
                color: "#fff",
                lineHeight: 0.9,
                letterSpacing: -4,
              }}
            >
              {shownCount}
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: ORANGE, letterSpacing: 2 }}>
              {label}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: SAFE_TOP + 14,
              right: SAFE_X,
              fontFamily: MONO,
              fontSize: 56,
              fontWeight: 700,
              color: "#e5e7eb",
            }}
          >
            {clock}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ─── ACT 3: product payoff ───────────────────────────────────────────────
const ProductPayoff: React.FC<{ length: number; brollSrc?: string }> = ({ length, brollSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 6, fps, config: { damping: 18, mass: 0.7 } });
  const btn = spring({ frame: frame - 22, fps, config: { damping: 12, mass: 0.6 } });

  // Ken Burns on the b-roll + a mid-shot "punch-in" cut so it never sits still.
  const kb = interpolate(frame, [0, length], [1.12, 1.28], { extrapolateRight: "clamp" });
  const punchIn = interpolate(frame, [length * 0.55, length * 0.55 + 5], [1, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bg = brollSrc ? staticFile(brollSrc) : staticFile("videos/hero.mp4");

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: SANS }}>
      <OffthreadVideo
        src={bg}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.5)",
          transform: `scale(${kb})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.1) 40%, rgba(10,10,10,0.85) 100%)",
        }}
      />

      {/* mocked AI chat card — mirrors the real concierge UI */}
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: 600,
          opacity: card,
          transform: `translateY(${(1 - card) * 60}px) scale(${punchIn})`,
          transformOrigin: "center center",
        }}
      >
        <div
          style={{
            background: "rgba(23,23,26,0.86)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            borderRadius: 34,
            padding: 40,
            boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
              }}
            />
            <div style={{ color: "#fff", fontSize: 34, fontWeight: 700 }}>
              Your local AI friend
            </div>
          </div>
          <div style={{ color: "#e5e7eb", fontSize: 38, fontWeight: 600, lineHeight: 1.3 }}>
            🚤 Jet Ski Safari — Puerto Colón
          </div>
          <div style={{ color: "#9ca3af", fontSize: 32, marginTop: 10 }}>
            40 мин · от 4.7★ · южный Тенерифе
          </div>
          <div
            style={{
              marginTop: 30,
              transform: `scale(${btn})`,
              transformOrigin: "left center",
              display: "inline-block",
              background: GREEN,
              color: "#04210f",
              fontSize: 36,
              fontWeight: 800,
              padding: "22px 40px",
              borderRadius: 20,
            }}
          >
            Оплатить и забронировать →
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ACT 4: series outro / end card ──────────────────────────────────────
const CtaBrand: React.FC<{ no: number; total: number; nextTitle?: string; lang?: "ru" | "en" }> = ({
  no,
  total,
  nextTitle,
  lang = "ru",
}) => {
  const en = lang === "en";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 16, mass: 0.7 } });
  const pill = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const next = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  const follow = spring({ frame: frame - 32, fps, config: { damping: 200 } });
  const followPulse = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SANS,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 40%, rgba(234,88,12,0.35), rgba(10,10,10,0) 55%)`,
        }}
      />
      <Img
        src={staticFile("logo.png")}
        style={{ width: 230, transform: `scale(${logoIn})`, marginBottom: 40 }}
      />
      <div
        style={{
          color: "#fff",
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: -1,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.05,
        }}
      >
        {en ? "How I built Tenerify.ai" : "Как я собрал Tenerify.ai"}
      </div>
      <div
        style={{
          marginTop: 30,
          transform: `scale(${pill})`,
          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
          color: "#fff",
          fontSize: 40,
          fontWeight: 800,
          padding: "16px 42px",
          borderRadius: 999,
        }}
      >
        {no === 0 ? (en ? "Trailer" : "Трейлер") : en ? `Part ${no} / ${total}` : `Часть ${no} / ${total}`}
      </div>

      {/* Next-episode teaser */}
      {nextTitle && no < total ? (
        <div
          style={{
            marginTop: 56,
            opacity: next,
            transform: `translateY(${(1 - next) * 30}px)`,
            width: 820,
            maxWidth: "82%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 26,
            padding: "26px 34px",
            textAlign: "center",
          }}
        >
          <div style={{ color: ORANGE, fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>
            {en ? `NEXT · PART ${no + 1}` : `ДАЛЬШЕ · ЧАСТЬ ${no + 1}`}
          </div>
          <div style={{ color: "#fff", fontSize: 46, fontWeight: 800, marginTop: 10, lineHeight: 1.1 }}>
            {nextTitle} →
          </div>
        </div>
      ) : null}

      {/* Follow CTA */}
      <div
        style={{
          marginTop: 48,
          opacity: follow,
          transform: `scale(${followPulse})`,
          color: "#fff",
          fontSize: 40,
          fontWeight: 800,
        }}
      >
        {en ? "🔔 Follow so you don't miss it" : "🔔 Подпишись, чтобы не пропустить"}
      </div>
      <div style={{ marginTop: 26, color: ORANGE, fontSize: 42, fontWeight: 700 }}>
        tenerify.ai
      </div>
    </AbsoluteFill>
  );
};

// ─── presenter layer (real lip-synced founder, bottom-left) ──────────────
// ONE persistent window on top of everything: the frame never re-mounts or
// re-animates with line/act transitions — only the clip inside hard-cuts.
// Each clip's Sequence stretches to the next line's start, so the short PAD
// gap is bridged by a freeze-frame instead of a blink.
const PresenterLayer: React.FC<{ lines: TimedLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } }); // once, at reel start
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        bottom: 96,
        width: 300,
        height: 400,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
        borderRadius: 30,
        overflow: "hidden",
        border: "3px solid rgba(255,255,255,0.85)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
        backgroundColor: "#111",
      }}
    >
      {lines.map((l, i) =>
        l.presenterSrc ? (
          <Sequence
            key={i}
            from={l.fromFrame}
            durationInFrames={(lines[i + 1]?.fromFrame ?? l.fromFrame + l.durationFrames) - l.fromFrame}
          >
            <OffthreadVideo
              src={staticFile(l.presenterSrc)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 22%" }}
            />
          </Sequence>
        ) : null
      )}
    </div>
  );
};

// ─── caption (word-by-word karaoke subtitle) ─────────────────────────────
const Caption: React.FC<{ text: string; length: number; bottom?: number }> = ({ text, length, bottom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const PER_WORD = 3; // frames between word pops → constant micro-motion
  const outOpacity = interpolate(frame, [length - 8, length], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_X,
        right: SAFE_X,
        bottom: bottom ?? CAPTION_BOTTOM,
        display: "flex",
        flexWrap: "wrap",
        gap: "10px 14px",
        justifyContent: "center",
        opacity: outOpacity,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - i * PER_WORD, fps, config: { damping: 16, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: s,
              transform: `translateY(${(1 - s) * 18}px) scale(${0.9 + s * 0.1})`,
              fontFamily: SANS,
              fontSize: 58,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.15,
              letterSpacing: -1,
              background: "rgba(10,10,10,0.6)",
              padding: "4px 14px",
              borderRadius: 12,
              textShadow: "0 3px 24px rgba(0,0,0,0.7)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ─── main composition ────────────────────────────────────────────────────
export const EpisodeReel: React.FC<EpisodeReelProps> = ({
  no,
  total,
  dateLabel,
  startClock,
  endClock,
  commitCount,
  commits,
  lines,
  sprintMode,
  sprintLabel,
  hookChat,
  hookVideo,
  hookBgSrc,
  nextTitle,
  brollSrc,
  sprintVideo,
  lang,
}) => {
  const { fps } = useVideoConfig();
  const hook = actWindow(lines, "hook");
  const sprint = actWindow(lines, "sprint");
  const payoff = actWindow(lines, "payoff");
  const cta = actWindow(lines, "cta");
  const ctaStart = cta ? cta.start : Infinity;
  const hasPresenter = lines.some((l) => l.presenterSrc);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Act backgrounds */}
      {hook ? (
        <Sequence from={hook.start} durationInFrames={hook.length}>
          {hookVideo ? (
            <VideoHook src={hookVideo} />
          ) : hookChat ? (
            <ChatGlitchHook message={hookChat} bgSrc={hookBgSrc} lang={lang} />
          ) : (
            <TerminalHook dateLabel={dateLabel} />
          )}
        </Sequence>
      ) : null}
      {sprint ? (
        <Sequence from={sprint.start} durationInFrames={sprint.length}>
          <CommitSlideshow
            commits={commits}
            commitCount={commitCount}
            startClock={startClock}
            endClock={endClock}
            length={sprint.length}
            mode={sprintMode}
            label={sprintLabel}
            bgVideo={sprintVideo}
          />
        </Sequence>
      ) : null}
      {payoff ? (
        <Sequence from={payoff.start} durationInFrames={payoff.length}>
          <ProductPayoff length={payoff.length} brollSrc={brollSrc} />
        </Sequence>
      ) : null}
      {cta ? (
        <Sequence from={cta.start} durationInFrames={cta.length}>
          <CtaBrand no={no} total={total} nextTitle={nextTitle} lang={lang} />
        </Sequence>
      ) : null}

      {/* Persistent brand chip (hidden during the CTA, which shows the big logo) */}
      {isFinite(ctaStart) && ctaStart > 0 ? (
        <Sequence from={0} durationInFrames={ctaStart}>
          <div
            style={{
              position: "absolute",
              top: 64,
              width: "100%",
              textAlign: "center",
              fontFamily: SANS,
              fontSize: 40,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -1,
              textShadow: "0 2px 20px rgba(0,0,0,0.6)",
              opacity: 0.9,
            }}
          >
            Tenerify.ai 🌋
          </div>
        </Sequence>
      ) : null}

      {/* Captions + voiceover + presenter, one Sequence per line.
          NOTE: default layout (not "none") — an OffthreadVideo nested in a
          layout="none" Sequence renders in stills but drops out of renderMedia. */}
      {lines.map((l, i) => (
        <Sequence
          key={i}
          from={l.fromFrame}
          durationInFrames={l.durationFrames}
        >
          {l.audioSrc ? <Audio src={staticFile(l.audioSrc)} /> : null}
          {/* CTA act already shows the title on screen — skip the redundant caption */}
          {l.act !== "cta" ? (
            <Caption text={l.caption} length={l.durationFrames} bottom={hasPresenter ? 540 : undefined} />
          ) : null}
        </Sequence>
      ))}

      {/* Presenter above everything — its own layer, untouched by line/act transitions */}
      {hasPresenter ? <PresenterLayer lines={lines} /> : null}
    </AbsoluteFill>
  );
};
