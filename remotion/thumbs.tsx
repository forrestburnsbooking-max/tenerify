import { registerRoot, Composition } from "remotion";
import { ClipThumb } from "./ClipThumb";

const ThumbRoot: React.FC = () => (
  <Composition
    id="ClipThumb"
    component={ClipThumb}
    durationInFrames={1}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ src: "", startFrom: 0 }}
  />
);

registerRoot(ThumbRoot);
