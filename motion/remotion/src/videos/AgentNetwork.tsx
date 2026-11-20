import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";
import { Arc, Cam, Coin, Glyphs3D, Ground, K, Lights, Mark3D, Shield3D, Tower, pointOnArc } from "../three/kit3d";
import { FinePrint, Label, Title } from "../three/overlay";

const VID = "agentNetwork";
const W = 1080, H = 1920;
const FINE = "Referral rewards apply to eligible, completed bookings under HAMLET's partner rules.";
const CENTER: [number, number, number] = [0, 4.2, 0];
const NODES = [...Array(12)].map((_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.18 : 0);
  const r = i % 2 ? 6.4 : 4.6;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, owner: i % 3 === 1, h: 1.0 + ((i * 7) % 5) * 0.35 };
});

type Phase = "hook" | "invite" | "reward" | "days" | "verified";

const House: React.FC<{ x: number; z: number; s: number; glow: number }> = ({ x, z, s, glow }) => (
  <group position={[x, 0, z]} scale={[1, s, 1]}>
    <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.0, 0.9, 1.0]} /><meshStandardMaterial color={K.paper} emissive={K.gold} emissiveIntensity={glow * 0.3} /></mesh>
    <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.85, 0.6, 4]} /><meshStandardMaterial color={K.gold} emissive={K.gold} emissiveIntensity={0.15} /></mesh>
  </group>
);

const Network: React.FC<{ phase: Phase }> = ({ phase }) => {
  const t = useSec();
  const off = { hook: 0, invite: 2.2, reward: 5.4, days: 8.3, verified: 11.6 }[phase];
  const T = t + off; // continuous time across beats so the camera never jumps
  const ang = 0.3 + T * 0.09;
  const R = 27 - Math.min(T, 14) * 0.25;
  const arcP = (i: number) => seg(T, 0.05 + i * 0.12 - 0.6, 0.5, E.out);
  const rise = (i: number) => (phase === "hook" ? 0 : seg(T, 2.3 + i * 0.1, 0.5, E.back));
  const coinsOn = phase === "reward" || phase === "days" || phase === "verified";
  const glowAll = phase === "verified" ? seg(t, 0.3, 0.8) : 0;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <color attach="background" args={[K.deep]} />
        <Cam pos={[Math.sin(ang) * R, 15, Math.cos(ang) * R]} look={[0, 4.2, 0]} fov={40} />
        <Lights />
        <Ground color="#0f1d36" size={80} />
        <Tower x={0} z={0} h={4.2} w={1.2} d={1.2} glow={0.85} />
        <Mark3D position={[0, 5.2, 0]} rotation={[0, ang, 0]} scale={1.2} color={K.paper} bar={K.gold} depth={0.25} />
        {NODES.map((n, i) => {
          const r = rise(i);
          const top: [number, number, number] = [n.x, phase === "hook" ? 0.4 : (n.owner ? 1.4 : n.h) * Math.max(0.3, r) + 0.1, n.z];
          return (
            <group key={i}>
              <Arc a={top} b={CENTER} lift={2.4} p={arcP(i)} r={0.045} />
              {phase === "hook" || r < 0.05 ? (
                <mesh position={[n.x, 0.4, n.z]} scale={seg(T, i * 0.12 - 0.6, 0.3, E.back)}><sphereGeometry args={[0.35, 24, 24]} /><meshStandardMaterial color={K.gold2} emissive={K.gold2} emissiveIntensity={0.6} /></mesh>
              ) : n.owner ? <House x={n.x} z={n.z} s={r} glow={glowAll} /> : <Tower x={n.x} z={n.z} h={n.h * r} w={0.8} d={0.8} color={K.ink} glow={glowAll * 0.6} />}
              {coinsOn && [0, 1].map((k) => {
                const ph = ((T * 0.55 + i * 0.137 + k * 0.5) % 1);
                return <Coin key={k} r={0.26} position={pointOnArc(top, CENTER, 2.4, ph)} rotation={[0, T * 3 + i, 0]} />;
              })}
            </group>
          );
        })}
        {phase === "days" && (
          <group position={[0, 9.4, 0]} rotation={[0, ang, 0]}>
            <Glyphs3D text="90" size={2.4} depth={0.5} color={K.gold} scale={seg(t, 0.1, 0.6, E.back)} />
            <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[2.3, 0.08, 12, 96, Math.PI * 2 * seg(t, 0.3, 2.6, E.inOut)]} /><meshStandardMaterial color={K.gold2} emissive={K.gold2} emissiveIntensity={0.5} /></mesh>
          </group>
        )}
        {phase === "verified" && <Shield3D position={[0, 8.6 + Math.sin(t * 2) * 0.1, 0]} rotation={[0, ang + Math.sin(t) * 0.3, 0]} scale={1.6 * seg(t, 0.2, 0.6, E.back)} />}
      </ThreeCanvas>
      {phase === "hook" && <Title a="Your network" b="is worth more." size={128} top={150} />}
      {phase === "invite" && <><Title a="Invite agents" b="and property owners." size={100} at={0.05} /><Label x={300} y={1300} at={0.6}>Agents</Label><Label x={780} y={1300} at={0.8}>Property owners</Label></>}
      {phase === "reward" && <><Title a="Their bookings." b="Your referral reward." size={100} at={0.05} /><FinePrint>{FINE}</FinePrint></>}
      {phase === "days" && <><Title a="For 90 days," b="it keeps paying." size={100} at={0.05} chip /><FinePrint>{FINE}</FinePrint></>}
      {phase === "verified" && <Title a="Every listing" b="verified." size={110} at={0.05} />}
    </AbsoluteFill>
  );
};

export const AgentNetwork: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "whoosh", vol: 0.5 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.15 + i * 0.24, name: "pop", vol: 0.25 })),
    { at: L[1].start + 0.1, name: "whoosh", vol: 0.35 }, ...[0, 1, 2, 3].map((i) => ({ at: L[1].start + 0.3 + i * 0.3, name: "tap", vol: 0.35 })),
    { at: L[2].start + 0.2, name: "ding", vol: 0.3 }, { at: L[2].start + 1.0, name: "pop", vol: 0.3 }, { at: L[2].start + 1.6, name: "pop", vol: 0.3 },
    { at: L[3].start + 0.1, name: "stamp", vol: 0.45 }, { at: L[3].start + 2.6, name: "ding", vol: 0.3 },
    { at: L[4].start + 0.2, name: "stamp", vol: 0.45 }, { at: L[5].start - 0.05, name: "whoosh", vol: 0.4 }, { at: L[5].start + 0.9, name: "ding", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: K.deep }}>
      <Beats vid={VID}>
        {[<Network phase="hook" />, <Network phase="invite" />, <Network phase="reward" />, <Network phase="days" />, <Network phase="verified" />,
          <EndCard head={["Your network", "pays."]} sub="Invite agents and property owners to HAMLET. Earn referral rewards on their completed bookings for 90 days." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[5].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} />
    </AbsoluteFill>
  );
};
