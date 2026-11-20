import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark as Mark2D, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { useSec } from "../kit/kit";
import { Cam } from "../three/kit3d";
import { Stage } from "./studio";
import { Coin } from "./kit";

/** Closing card: spinning gold coin above the call to action. */
export const EndCard3D: React.FC<{ head: [string, string]; sub: string }> = ({ head, sub }) => {
  const t = useSec();
  const r = (a: number) => { const p = seg(t, a, 0.6); return { opacity: p, translate: `0 ${(1 - p) * 26}px` }; };
  const pop = seg(t, 0, 0.9, E.back);
  return (
    <AbsoluteFill style={{ background: "#060d1a" }}>
      <Stage bg="#060d1a" fog={[30, 60]}>
        <Cam pos={[0, 0, 10]} look={[0, 0, 0]} fov={35} />
        <Coin r={1.05 * pop} position={[0, 1.95, 0]} rotation={[0.12, t * 1.6 + 0.4, 0]} />
      </Stage>
      <div style={{ position: "absolute", left: 90, top: 760, width: 920, fontFamily: SERIF, fontWeight: 440, letterSpacing: "-0.03em", fontSize: 140, lineHeight: 0.98, color: C.paper }}>
        {head.map((h, i) => {
          const p = seg(t, 0.15 + i * 0.14, 0.8);
          return <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}><span style={{ display: "inline-block", translate: `0 ${(1 - p) * 110}%`, color: i === 1 ? "#e8c77e" : C.paper }}>{h}</span></span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 90, top: 1080, width: 880, fontFamily: SANS, fontSize: 42, lineHeight: 1.4, color: "#b4bccb", ...r(0.6) }}>{sub}</div>
      <div style={{ position: "absolute", left: 90, top: 1300, background: "#e2be6e", color: C.ink, borderRadius: 14, fontFamily: SANS, fontWeight: 700, fontSize: 46, padding: "34px 60px", ...r(0.85) }}>Partner with us</div>
      <div style={{ position: "absolute", left: 90, top: 1480, fontFamily: SANS, fontSize: 46, color: C.paper, fontWeight: 600, ...r(1.05) }}>hamlet.rest/partners/apply</div>
      <div style={{ position: "absolute", left: 90, top: 1700, display: "flex", alignItems: "center", gap: 22, ...r(1.3) }}>
        <Mark2D stem={C.paper} bar="#e2be6e" size={80} />
        <span style={{ fontFamily: SERIF, fontSize: 60, fontWeight: 480, letterSpacing: ".02em", color: C.paper }}>HAMLET.</span>
      </div>
    </AbsoluteFill>
  );
};
