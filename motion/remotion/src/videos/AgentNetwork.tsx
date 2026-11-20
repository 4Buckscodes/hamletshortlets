import React from "react";
import { AbsoluteFill } from "remotion";
import { E, seg } from "../anim";
import { Beats, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";
import { Cam, Glyphs3D } from "../three/kit3d";
import { FinePrint, Label, Title } from "../three/overlay";
import { Gold, Stage, P } from "../pro/studio";
import { Coin, Floor, House, Mark, Plinth, Shield, Tower, Trail, onArc } from "../pro/kit";
import { EndCard3D } from "../pro/EndCard3D";

const VID = "agentNetwork";
const FINE = "Referral rewards apply to eligible, completed bookings under HAMLET's partner rules.";
const HUB: [number, number, number] = [0, 4.6, 0];
const NODES = [...Array(10)].map((_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.3;
  const r = i % 2 ? 6.2 : 4.8;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, owner: i % 3 === 1, h: 1.3 + ((i * 7) % 4) * 0.45 };
});

type Phase = "hook" | "invite" | "reward" | "days" | "verified";
const OFFSET: Record<Phase, number> = { hook: 0, invite: 2.3, reward: 5.6, days: 8.6, verified: 11.9 };

const Network: React.FC<{ phase: Phase }> = ({ phase }) => {
  const t = useSec();
  const T = t + OFFSET[phase];
  const ang = 0.2 + T * 0.085;
  const R = 22 - Math.min(T, 14) * 0.25;
  const tilt = phase === "days" ? seg(t, 0, 1.2, E.inOut) : phase === "verified" ? 1 - seg(t, 0, 1.2, E.inOut) : 0;
  const camY = 10 + tilt * 3;
  const look: [number, number, number] = [0, 2.6 + tilt * 4.2, 0];
  const grown = (i: number) => (phase === "hook" ? 0 : seg(T, 2.5 + i * 0.12, 0.6, E.back));
  const flow = phase === "reward" || phase === "days" || phase === "verified";
  return (
    <AbsoluteFill>
      <Stage fog={[22, 52]}>
        <Cam pos={[Math.sin(ang) * R, camY, Math.cos(ang) * R]} look={look} fov={40} />
        <Plinth r={7.6} />
        <Tower x={0} z={0} h={4.4} w={1.3} gold={1} />
        <Mark position={[0, 5.5, 0]} rotation={[0, ang, 0]} scale={1.3} stem="paper" depth={6} />
        <pointLight position={[0, 6, 0]} intensity={18} distance={12} color="#ffd48a" />
        {NODES.map((n, i) => {
          const g = grown(i);
          const top: [number, number, number] = [n.x, g > 0.05 ? (n.owner ? 1.3 : n.h) * g + 0.1 : 0.45, n.z];
          const fire = seg(T, 0.1 + i * 0.13, 0.55, E.out);
          return (
            <group key={i}>
              <Trail a={top} b={HUB} lift={2.6} p={fire} />
              {g < 0.05 ? (
                <mesh position={[n.x, 0.45, n.z]} scale={seg(T, 0.1 + i * 0.13, 0.35, E.back)} castShadow><sphereGeometry args={[0.38, 32, 32]} /><Gold rough={0.15} glow={0.2} /></mesh>
              ) : n.owner ? <House x={n.x} z={n.z} s={g} lit={flow ? 1 : 0.5} /> : <Tower x={n.x} z={n.z} h={Math.max(0.2, n.h * g)} w={0.85} lit={flow ? 0.9 : 0.4} />}
              {flow && [0, 1].map((k) => {
                const ph = (T * 0.5 + i * 0.137 + k * 0.5) % 1;
                return <Coin key={k} r={0.26} position={onArc(top, HUB, 2.6, ph)} rotation={[0.2, T * 3 + i, 0]} />;
              })}
            </group>
          );
        })}
        {phase === "days" && (
          <group position={[0, 9.2, 0]} rotation={[0, ang, 0]} scale={seg(t, 0.15, 0.7, E.back)}>
            <Glyphs3D text="90" size={2.6} depth={0.55} color={P.gold} />
            <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[2.5, 0.07, 16, 128, Math.PI * 2 * seg(t, 0.4, 2.6, E.inOut)]} /><meshStandardMaterial color="#ffd48a" emissive="#ffc766" emissiveIntensity={2} toneMapped={false} /></mesh>
          </group>
        )}
        {phase === "verified" && <Shield position={[0, 7.3 + Math.sin(t * 2) * 0.08, 0]} rotation={[0, ang + Math.sin(t) * 0.35, 0]} scale={1.5 * seg(t, 0.2, 0.7, E.back)} />}
        <Floor />
      </Stage>
      {phase === "hook" && <Title a="Your network" b="is worth more." size={128} top={140} />}
      {phase === "invite" && <><Title a="Invite agents" b="and property owners." size={100} at={0.05} /><Label x={290} y={1330} at={0.7}>Agents</Label><Label x={790} y={1330} at={0.9}>Property owners</Label></>}
      {phase === "reward" && <><Title a="Their bookings." b="Your referral reward." size={100} at={0.05} /><FinePrint>{FINE}</FinePrint></>}
      {phase === "days" && <><Title a="For 90 days," b="it keeps paying." size={100} at={0.05} chip /><FinePrint>{FINE}</FinePrint></>}
      {phase === "verified" && <Title a="Every listing" b="verified." size={112} at={0.05} chip />}
    </AbsoluteFill>
  );
};

export const AgentNetwork: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.75 }, ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ at: 0.12 + i * 0.13, name: "spark", vol: 0.22 })),
    { at: L[1].start - 0.08, name: "swoosh", vol: 0.45 }, ...[0, 2, 4, 6, 8].map((i) => ({ at: L[1].start + 0.05 + i * 0.12, name: "land", vol: 0.3 })),
    { at: L[2].start - 0.08, name: "swoosh", vol: 0.4 }, ...[0, 1, 2, 3].map((i) => ({ at: L[2].start + 0.4 + i * 0.55, name: "chime", vol: 0.28 })),
    { at: L[3].start - 0.35, name: "riser", vol: 0.35 }, { at: L[3].start + 0.15, name: "impact", vol: 0.55 }, { at: L[3].start + 2.9, name: "chime", vol: 0.35 },
    { at: L[4].start - 0.08, name: "swoosh", vol: 0.4 }, { at: L[4].start + 0.3, name: "impact", vol: 0.45 },
    { at: L[5].start - 0.4, name: "riser", vol: 0.35 }, { at: L[5].start - 0.05, name: "impact", vol: 0.6 }, { at: L[5].start + 0.9, name: "chime", vol: 0.4 },
  ];
  return (
    <AbsoluteFill style={{ background: P.deep }}>
      <Beats vid={VID}>
        {[<Network phase="hook" />, <Network phase="invite" />, <Network phase="reward" />, <Network phase="days" />, <Network phase="verified" />,
          <EndCard3D head={["Your network", "pays."]} sub="Invite agents and property owners to HAMLET. Earn referral rewards on their completed bookings for 90 days." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[5].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.45} />
    </AbsoluteFill>
  );
};
