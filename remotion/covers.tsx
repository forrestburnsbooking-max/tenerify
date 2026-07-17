import { registerRoot, Composition } from "remotion";
import { Cover } from "./Cover";

const CoverRoot: React.FC = () => (
  <Composition
    id="Cover"
    component={Cover}
    durationInFrames={1}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      portraitSrc: "reels/face/avatar-source.jpg",
      kicker: "СЕРИАЛ ПРО ВАЙБКОДИНГ",
      headline: "Я ЗАМЕНИЛ СЕБЯ\nНЕЙРОСЕТЬЮ",
      badge: "ТРЕЙЛЕР",
    }}
  />
);

registerRoot(CoverRoot);
