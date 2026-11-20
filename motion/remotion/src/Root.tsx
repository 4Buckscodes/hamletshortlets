import { Composition } from "remotion";
import { OwnersDay } from "./OwnersDay";
import { FPS } from "./anim";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OwnersDay" component={OwnersDay} width={1080} height={1920} fps={FPS} durationInFrames={24 * FPS} defaultProps={{ voiceover: true }} />
    <Composition id="OwnersDayMusicOnly" component={OwnersDay} width={1080} height={1920} fps={FPS} durationInFrames={24 * FPS} defaultProps={{ voiceover: false }} />
  </>
);
