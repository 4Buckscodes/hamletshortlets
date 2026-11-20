import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { FPS } from "./anim";
import { S1 } from "./scenes/S1";
import { S2 } from "./scenes/S2";
import { S3 } from "./scenes/S3";
import { S4 } from "./scenes/S4";
import { S5 } from "./scenes/S5";

export type OwnersDayProps = { voiceover: boolean };

// Scenes overlap slightly: each one wipes in over the previous one.
const f = (s: number) => Math.round(s * FPS);

export const OwnersDay: React.FC<OwnersDayProps> = ({ voiceover }) => (
  <AbsoluteFill style={{ background: "#f4f3ef" }}>
    <Sequence name="Lagos morning" from={f(0)} durationInFrames={f(4.8)} layout="none"><S1 /></Sequence>
    <Sequence name="The flat" from={f(4.4)} durationInFrames={f(5.0)} layout="none"><S2 /></Sequence>
    <Sequence name="The request" from={f(9.0)} durationInFrames={f(5.4)} layout="none"><S3 /></Sequence>
    <Sequence name="Verified, booked" from={f(14.0)} durationInFrames={f(5.0)} layout="none"><S4 /></Sequence>
    <Sequence name="Invite" from={f(18.6)} durationInFrames={f(5.4)} layout="none"><S5 /></Sequence>
    <Audio src={staticFile(voiceover ? "audio/music-vo.wav" : "audio/music.wav")} />
  </AbsoluteFill>
);
