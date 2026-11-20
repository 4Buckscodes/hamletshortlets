import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { C } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";
import { Cam, Coin, CoinFlat, Ground, K, Lights, Pin, Shield3D, Tower, cityLayout } from "../three/kit3d";
import { FinePrint, Label, Title } from "../three/overlay";

const VID = "agentEarn";
const W = 1080, H = 1920;
const CITY = cityLayout(17, 7, 1.45);
const HERO = 31; // the tower the guest books
const FINE = "Commission applies to completed, non-refunded bookings attributed to you under HAMLET's partner rules.";

const Canvas: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <ThreeCanvas width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <color attach="background" args={[bg]} />
    {children}
  </ThreeCanvas>
);

/** Hook: a gold HAMLET coin already spinning on frame one, coins falling behind it. */
const CoinHook = () => {
  const t = useSec();
  const settle = seg(t, 0, 1.3, E.out);
  return (
    <AbsoluteFill>
      <Canvas bg={K.deep}>
        <Cam pos={[0, 0, 9]} />
        <Lights />
        <Coin r={1.55} position={[0, -0.3 + Math.sin(t * 2.2) * 0.06, 0]} rotation={[0.15, Math.PI * 2.5 * (1 - settle) + Math.sin(t * 1.4) * 0.25, 0]} scale={1 + 0.25 * (1 - settle)} />
        {[...Array(16)].map((_, i) => {
          const x = ((i * 37) % 11) - 5.5, z = -3 - (i % 4);
          const y = 9 - ((t * (3 + (i % 3)) + i * 1.3) % 16);
          return <Coin key={i} r={0.45} position={[x, y, z]} rotation={[t * (1 + (i % 3)), t * 2 + i, 0]} />;
        })}
      </Canvas>
      <Title a="Agents." b="Get paid on the stays you close." size={112} top={150} />
    </AbsoluteFill>
  );
};

const City: React.FC<{ phase: "find" | "close" | "verified" }> = ({ phase }) => {
  const t = useSec();
  const ang = 0.6 + t * 0.12 + (phase === "close" ? 0.5 : phase === "verified" ? 1.0 : 0);
  const R = phase === "verified" ? 19 : 17;
  const hero = CITY[HERO];
  const drop = seg(t, 0.4, 0.7, E.back);
  const glow = phase === "find" ? 0 : seg(t, 0.1, 0.6);
  return (
    <AbsoluteFill>
      <Canvas bg={C.sand}>
        <Cam pos={[Math.sin(ang) * R, 12, Math.cos(ang) * R]} look={[0, 3.4, 0]} fov={38} />
        <Lights />
        <Ground />
        {CITY.map((b, i) => <Tower key={i} x={b.x} z={b.z} h={i === HERO ? 3.6 : b.h} glow={i === HERO ? glow : 0} />)}
        <Pin position={[hero.x, 3.6 + (1 - drop) * 6, hero.z]} scale={0.9} />
        {phase === "close" && [...Array(8)].map((_, i) => {
          const p = seg(t, 0.5 + i * 0.22, 0.9, E.inOut);
          const pos: [number, number, number] = [hero.x + Math.cos(ang) * p * 3, 4.2 + p * 5, hero.z - Math.sin(ang) * p * 3];
          return p > 0 && p < 1 ? <Coin key={i} r={0.35} position={pos} rotation={[t * 3, t * 4 + i, 0]} /> : null;
        })}
        {phase === "verified" && <Shield3D position={[0, 6.0 + Math.sin(t * 2) * 0.1, 0]} rotation={[0, Math.sin(t * 1.2) * 0.5 + ang, 0]} scale={1.4 * seg(t, 0.2, 0.6, E.back)} />}
      </Canvas>
      {phase === "find" && <Title a="You find the guest." dark={false} at={0.05} chip />}
      {phase === "close" && <><Title a="Booking closed." b="Commission earned." dark={false} at={0.05} chip /><FinePrint dark={false}>{FINE}</FinePrint></>}
      {phase === "verified" && <Title a="Every listing" b="verified." dark={false} at={0.05} chip />}
    </AbsoluteFill>
  );
};

/** Three stacks: owner's rate (untouched), HAMLET's fee, and your commission built from the fee. */
const Stacks: React.FC<{ phase: "fee" | "haggle" }> = ({ phase }) => {
  const t = useSec();
  const hops = phase === "fee" ? 4 : 4;
  return (
    <AbsoluteFill>
      <Canvas bg={C.paper}>
        <Cam pos={[0, 2.6, 8.5]} look={[0, 0.7, 0]} fov={40} />
        <Lights />
        <Ground color={C.sand} />
        {[...Array(14)].map((_, i) => <CoinFlat key={`o${i}`} color={K.ink} position={[-1.15, 0.05 + i * 0.1, 0]} />)}
        {[...Array(8)].map((_, i) => {
          const k = 7 - i; // top coins hop first
          const hopAt = phase === "fee" ? 0.9 + k * 0.45 : -10;
          const p = k < hops ? seg(t, hopAt, 0.5, E.inOut) : 0;
          if (k < hops && (phase === "haggle" || p >= 1)) return null;
          return <CoinFlat key={`f${i}`} position={[0 + 1.15 * p, 0.05 + i * 0.1 + Math.sin(p * Math.PI) * 1.4, 0]} />;
        })}
        {[...Array(hops)].map((_, k) => {
          const landed = phase === "haggle" || t > 0.9 + k * 0.45 + 0.5;
          return landed ? <CoinFlat key={`c${k}`} position={[1.15, 0.05 + k * 0.1, 0]} /> : null;
        })}
        {phase === "haggle" && <Coin r={0.45} position={[1.15, 1.25 + Math.sin(t * 3) * 0.05, 0]} rotation={[0, t * 2, 0]} />}
      </Canvas>
      {phase === "fee" ? <Title a="Paid from HAMLET's fee." b="Owner's rate stays whole." dark={false} size={86} at={0.05} /> : <Title a="No haggling" b="over your cut." dark={false} size={104} at={0.05} />}
      <Label x={190} y={1290} at={0.3}>Owner's rate</Label>
      <Label x={540} y={1290} at={0.5}>HAMLET's fee</Label>
      <Label x={890} y={1290} at={0.7} dark>Your commission</Label>
      <FinePrint dark={false}>{FINE}</FinePrint>
    </AbsoluteFill>
  );
};

export const AgentEarn: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "stamp", vol: 0.55 }, { at: 0.35, name: "ding", vol: 0.3 },
    { at: L[1].start - 0.12, name: "whoosh", vol: 0.4 }, { at: L[1].start + 0.85, name: "thud", vol: 0.45 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: L[2].start + 0.5 + i * 0.22, name: "pop", vol: 0.28 })),
    { at: L[3].start - 0.12, name: "whoosh", vol: 0.4 }, ...[0, 1, 2, 3].map((k) => ({ at: L[3].start + 1.3 + k * 0.45, name: "tap", vol: 0.45 })),
    { at: L[4].start + 0.3, name: "ding", vol: 0.3 }, { at: L[5].start - 0.12, name: "whoosh", vol: 0.4 }, { at: L[5].start + 0.4, name: "stamp", vol: 0.45 },
    { at: L[6].start - 0.05, name: "whoosh", vol: 0.4 }, { at: L[6].start + 0.9, name: "ding", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: K.deep }}>
      <Beats vid={VID}>
        {[<CoinHook />, <City phase="find" />, <City phase="close" />, <Stacks phase="fee" />, <Stacks phase="haggle" />, <City phase="verified" />,
          <EndCard head={["Close stays.", "Earn more."]} sub="Join HAMLET as a closing agent and earn commission on the stays you close." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[6].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} />
    </AbsoluteFill>
  );
};
