import React from "react";
import { AbsoluteFill } from "remotion";
import { E, seg } from "../anim";
import { Beats, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";
import { Cam } from "../three/kit3d";
import { FinePrint, Label, Title } from "../three/overlay";
import { Stage, P } from "../pro/studio";
import { Coin, Disc, Floor, Pin, Plinth, Shield, Tower, cityPlan } from "../pro/kit";
import { EndCard3D } from "../pro/EndCard3D";

const VID = "agentEarn";
const CITY = cityPlan(23);
const HERO = CITY.reduce((best, b, i) => (Math.hypot(b.x, b.z) < 1.4 && b.h > CITY[best].h ? i : best), 0);
const FINE = "Commission applies to completed, non-refunded bookings attributed to you under HAMLET's partner rules.";

/** Hook: a gold coin already spinning into frame, coins falling behind it. */
const CoinHook = () => {
  const t = useSec();
  const settle = seg(t, 0, 1.4, E.out);
  return (
    <AbsoluteFill>
      <Stage fog={[14, 34]}>
        <Cam pos={[0, 0.6, 9]} look={[0, 0.2, 0]} fov={36} />
        <Coin r={1.25} position={[0, -0.2 + Math.sin(t * 2) * 0.05, -(1 - settle) * 9]} rotation={[0.12, (1 - settle) * Math.PI * 3 + Math.sin(t * 1.3) * 0.35, (1 - settle) * 0.4]} />
        {[...Array(14)].map((_, i) => {
          const x = ((i * 53) % 13) - 6.5, z = -4 - (i % 5) * 1.2;
          const y = 8 - ((t * (2.4 + (i % 3) * 0.6) + i * 1.7) % 14);
          return <Coin key={i} r={0.42} position={[x, y, z]} rotation={[t * (1.2 + (i % 3)), t * 2.2 + i, 0.3]} />;
        })}
      </Stage>
      <Title a="Agents." b="Get paid on the stays you close." size={118} top={140} />
    </AbsoluteFill>
  );
};

/** The city diorama. Phases share one continuous camera path. */
const City: React.FC<{ phase: "find" | "close" | "verified" }> = ({ phase }) => {
  const t = useSec();
  const T = t + (phase === "find" ? 0 : phase === "close" ? 2.9 : 9.0);
  const hero = CITY[HERO];
  const push = phase === "close" ? seg(t, 0, 2.6, E.inOut) : 0;
  const ang = -0.5 + T * 0.1;
  const R = phase === "verified" ? 21 : 20 - push * 7;
  const camY = phase === "verified" ? 9.5 : 8 - push * 2;
  const look: [number, number, number] = phase === "close" ? [hero.x * push, 2.2 + push * 1.2, hero.z * push] : [0, 1.4, 0];
  const drop = seg(t, 0.35, 0.8, E.out);
  const goldP = phase === "find" ? 0 : phase === "close" ? seg(t, 0.25, 1.3, E.inOut) : 1;
  return (
    <AbsoluteFill>
      <Stage fog={[20, 50]}>
        <Cam pos={[look[0] + Math.sin(ang) * R, camY, look[2] + Math.cos(ang) * R]} look={look} fov={38} />
        <Plinth r={7} />
        {CITY.map((b, i) => <Tower key={i} x={b.x} z={b.z} h={b.h} lit={0.25 + ((i * 7) % 5) * 0.08} gold={i === HERO ? goldP : 0} />)}
        <Pin position={[hero.x, hero.h + 0.05 + (1 - (phase === "find" ? drop : 1)) * 6, hero.z]} scale={0.85} />
        {phase === "close" && [0, 1, 2].map((k) => {
          const p = seg(t, 1.2 + k * 0.45, 1.2, E.out);
          return p > 0 ? <Coin key={k} r={0.42} position={[hero.x + (k - 1) * 0.9 * p, hero.h + 1.6 + p * 2.4, hero.z]} rotation={[0.2, t * 3 + k, 0]} /> : null;
        })}
        {phase === "verified" && <Shield position={[hero.x, hero.h + 2.0 + Math.sin(t * 2) * 0.08, hero.z]} rotation={[0, ang + Math.sin(t * 1.1) * 0.4, 0]} scale={1.35 * seg(t, 0.15, 0.7, E.back)} />}
        <Floor />
      </Stage>
      {phase === "find" && <Title a="You find the guest." at={0.05} />}
      {phase === "close" && <><Title a="You close it." b="You earn commission." at={0.05} /><FinePrint>{FINE}</FinePrint></>}
      {phase === "verified" && <Title a="Every listing" b="verified." at={0.05} chip />}
    </AbsoluteFill>
  );
};

/** Owner's rate (untouched), HAMLET's fee, and your commission built from the fee. */
const Pedestals: React.FC<{ phase: "fee" | "haggle" }> = ({ phase }) => {
  const t = useSec();
  const T = t + (phase === "haggle" ? 3.7 : 0);
  const hopAt = (k: number) => 1.0 + k * 0.5;
  const ang = -0.25 + T * 0.04;
  const camR = phase === "haggle" ? 10 - seg(t, 0, 1.6, E.inOut) * 3.0 : 10.5;
  const look: [number, number, number] = phase === "haggle" ? [1.5 * seg(t, 0, 1.6, E.inOut), 1.0, 0] : [0, 1.0, 0];
  const peds = [-1.5, 0, 1.5];
  return (
    <AbsoluteFill>
      <Stage fog={[14, 34]}>
        <Cam pos={[look[0] + Math.sin(ang) * camR, 3.4, Math.cos(ang) * camR]} look={look} fov={38} />
        <spotLight position={[0, 7, 3]} angle={0.6} penumbra={0.8} intensity={60} color="#ffe6bf" castShadow />
        {peds.map((x, i) => (
          <mesh key={i} position={[x, -0.25, 0]} castShadow receiveShadow><cylinderGeometry args={[0.6, 0.62, 0.5, 64]} /><meshStandardMaterial color="#13213d" roughness={0.3} metalness={0.5} /></mesh>
        ))}
        {[...Array(16)].map((_, i) => <Disc key={`o${i}`} ink position={[-1.5, 0.05 + i * 0.09, 0]} />)}
        {[...Array(8)].map((_, i) => {
          const k = 7 - i;
          const moving = k < 4;
          const p = moving ? (phase === "haggle" ? 1 : seg(T, hopAt(k), 0.55, E.inOut)) : 0;
          if (moving && p >= 1) return null;
          return <Disc key={`f${i}`} position={[1.5 * p, 0.05 + i * 0.09 + Math.sin(p * Math.PI) * 1.3, 0]} rotation={[0, 0, p * Math.PI * 2]} />;
        })}
        {[0, 1, 2, 3].map((k) => (phase === "haggle" || T > hopAt(k) + 0.55 ? <Disc key={`c${k}`} position={[1.5, 0.05 + k * 0.09, 0]} /> : null))}
        {phase === "haggle" && <Coin r={0.55} position={[1.5, 1.35 + Math.sin(t * 2.4) * 0.06, 0]} rotation={[0.1, t * 1.8, 0]} />}
        <Floor />
      </Stage>
      {phase === "fee" ? <Title a="Paid from HAMLET's fee." b="Owner's rate stays whole." size={84} at={0.05} /> : <Title a="No haggling" b="over your cut." size={112} at={0.05} />}
      {phase === "fee" && <><Label x={200} y={1210} at={0.3}>Owner's rate</Label><Label x={540} y={1210} at={0.5}>HAMLET's fee</Label><Label x={880} y={1210} at={0.7}>Your commission</Label></>}
      <FinePrint>{FINE}</FinePrint>
    </AbsoluteFill>
  );
};

export const AgentEarn: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.8 }, { at: 1.1, name: "chime", vol: 0.45 },
    { at: L[1].start - 0.35, name: "riser", vol: 0.35 }, { at: L[1].start - 0.08, name: "swoosh", vol: 0.5 }, { at: L[1].start + 1.05, name: "land", vol: 0.55 },
    { at: L[2].start - 0.08, name: "swoosh", vol: 0.45 }, ...[0, 1, 2].map((k) => ({ at: L[2].start + 1.3 + k * 0.45, name: "chime", vol: 0.32 })),
    { at: L[3].start - 0.08, name: "swoosh", vol: 0.45 }, ...[0, 1, 2, 3].map((k) => ({ at: L[3].start + 1.1 + k * 0.5 + 0.5, name: "clink", vol: 0.5 })),
    { at: L[4].start - 0.08, name: "swoosh", vol: 0.4 }, { at: L[4].start + 0.4, name: "chime", vol: 0.4 },
    { at: L[5].start - 0.08, name: "swoosh", vol: 0.45 }, { at: L[5].start + 0.3, name: "impact", vol: 0.45 },
    { at: L[6].start - 0.4, name: "riser", vol: 0.35 }, { at: L[6].start - 0.05, name: "impact", vol: 0.6 }, { at: L[6].start + 0.9, name: "chime", vol: 0.4 },
  ];
  return (
    <AbsoluteFill style={{ background: P.deep }}>
      <Beats vid={VID}>
        {[<CoinHook />, <City phase="find" />, <City phase="close" />, <Pedestals phase="fee" />, <Pedestals phase="haggle" />, <City phase="verified" />,
          <EndCard3D head={["Close stays.", "Earn more."]} sub="Join HAMLET as a closing agent and earn commission on the stays you close." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[6].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.45} />
    </AbsoluteFill>
  );
};
