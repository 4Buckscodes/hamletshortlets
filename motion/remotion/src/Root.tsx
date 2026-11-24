import { Composition, Folder } from "remotion";
import { OwnersDay } from "./OwnersDay";
import { EmptyNights } from "./videos/EmptyNights";
import { YourRules } from "./videos/YourRules";
import { LondonLekki } from "./videos/LondonLekki";
import { AgentEarn } from "./videos/AgentEarn";
import { AgentNetwork } from "./videos/AgentNetwork";
import { FPS } from "./anim";
import { Lab } from "./pro/Lab";
import { OwnerExplainer } from "./explain/OwnerExplainer";
import { ManagerExplainer } from "./explain/ManagerExplainer";
import { GuestExplainer } from "./explain/GuestExplainer";
import { GuestPhotos } from "./videos/GuestPhotos";
import { GuestDecember } from "./videos/GuestDecember";
import { totalFrames } from "./kit/kit";

const V = { width: 1080, height: 1920, fps: FPS };

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Owner-campaign">
      <Composition id="EmptyNights" component={EmptyNights} {...V} durationInFrames={totalFrames("emptyNights")} />
      <Composition id="YourRules" component={YourRules} {...V} durationInFrames={totalFrames("yourRules")} />
      <Composition id="LondonLekki" component={LondonLekki} {...V} durationInFrames={totalFrames("londonLekki")} />
    </Folder>
    <Folder name="Agent-campaign-3D">
      <Composition id="AgentEarn" component={AgentEarn} {...V} durationInFrames={totalFrames("agentEarn")} />
      <Composition id="AgentNetwork" component={AgentNetwork} {...V} durationInFrames={totalFrames("agentNetwork")} />
    </Folder>
    <Folder name="Guest-campaign">
      <Composition id="GuestPhotos" component={GuestPhotos} {...V} durationInFrames={totalFrames("guestPhotos")} />
      <Composition id="GuestDecember" component={GuestDecember} {...V} durationInFrames={totalFrames("guestDecember")} />
    </Folder>
    <Folder name="Explainers">
      <Composition id="OwnerExplainer" component={OwnerExplainer} {...V} durationInFrames={totalFrames("explainOwner")} />
      <Composition id="ManagerExplainer" component={ManagerExplainer} {...V} durationInFrames={totalFrames("explainManager")} />
      <Composition id="GuestExplainer" component={GuestExplainer} {...V} durationInFrames={totalFrames("explainGuest")} />
    </Folder>
    <Composition id="Lab" component={Lab} {...V} durationInFrames={60} />
    <Folder name="Earlier">
      <Composition id="OwnersDay" component={OwnersDay} {...V} durationInFrames={24 * FPS} defaultProps={{ voiceover: true }} />
      <Composition id="OwnersDayMusicOnly" component={OwnersDay} {...V} durationInFrames={24 * FPS} defaultProps={{ voiceover: false }} />
    </Folder>
  </>
);
