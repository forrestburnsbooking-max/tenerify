import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/Montserrat";

const { fontFamily: SANS } = loadSans("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["latin", "cyrillic"],
});

const ORANGE = "#fb923c";
const ORANGE_DEEP = "#ea580c";

export type CoverProps = {
  portraitSrc: string; // path under public/
  kicker: string; // small line above headline
  headline: string; // big hook; use \n for line breaks
  badge: string; // "ТРЕЙЛЕР" / "ЧАСТЬ 1"
};

// Grid-safe designed cover (1080×1920): face full-bleed, bold hook at the
// bottom, episode badge + brand. Rendered as a still, set as the Reel cover.
export const Cover: React.FC<CoverProps> = ({ portraitSrc, kicker, headline, badge }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", fontFamily: SANS }}>
      <Img
        src={staticFile(portraitSrc)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 28%",
        }}
      />
      {/* darken only the band below the chin (behind the text) — face stays lit */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0) 16%, rgba(10,10,10,0) 55%, rgba(10,10,10,0.85) 64%, rgba(10,10,10,0.94) 100%)",
        }}
      />

      {/* brand + badge */}
      <div style={{ position: "absolute", top: 70, left: 70, right: 70, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: -1, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
          Tenerify.ai 🌋
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
            color: "#fff",
            fontSize: 34,
            fontWeight: 800,
            padding: "12px 30px",
            borderRadius: 999,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
      </div>

      {/* headline block — anchored just BELOW the chin, grows downward, so it
          never lands on the face and its bottom stays above the grid crop. */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 1140 }}>
        <div style={{ color: ORANGE, fontSize: 40, fontWeight: 800, letterSpacing: 2, marginBottom: 22 }}>
          {kicker}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 118,
            fontWeight: 900,
            lineHeight: 0.98,
            letterSpacing: -3,
            textShadow: "0 6px 40px rgba(0,0,0,0.6)",
            whiteSpace: "pre-line",
          }}
        >
          {headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
