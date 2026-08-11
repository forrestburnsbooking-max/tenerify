import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

// Dev-only: render a single frame of a local clip so we can eyeball footage
// dropped into public/reels/.
export const ClipThumb: React.FC<{ src: string; startFrom?: number }> = ({ src, startFrom }) => {
  const url = src.startsWith("http") ? src : staticFile(src);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {src ? (
        <OffthreadVideo
          src={url}
          muted
          startFrom={startFrom ?? 0}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
