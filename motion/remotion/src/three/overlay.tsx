import React from "react";
import { C, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { useSec } from "../kit/kit";

/** Big two-line headline that rises in. Second line in gold. */
export const Title: React.FC<{ a: string; b?: string; top?: number; dark?: boolean; size?: number; at?: number; chip?: boolean }> = ({ a, b, top = 170, dark = true, size = 104, at = 0, chip = false }) => {
  const t = useSec();
  const line = (txt: string, i: number, color: string) => {
    const p = at === 0 && i === 0 ? 1 : seg(t, at + i * 0.15, 0.55, E.out);
    return <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}><span style={{ display: "inline-block", translate: `0 ${(1 - p) * 110}%`, color }}>{txt}</span></span>;
  };
  return (
    <div style={{ position: "absolute", left: chip ? 50 : 80, right: chip ? 50 : 80, top, fontFamily: SERIF, fontWeight: 460, fontSize: size, lineHeight: 1.0, letterSpacing: "-0.03em", ...(chip ? { background: dark ? "rgba(9,21,40,0.9)" : "rgba(244,243,239,0.93)", padding: "30px 36px 38px", borderRadius: 20 } : {}) }}>
      {line(a, 0, dark ? C.paper : C.ink)}
      {b && line(b, 1, dark ? C.gold2 : C.gold)}
    </div>
  );
};

export const FinePrint: React.FC<{ children: React.ReactNode; dark?: boolean; top?: number }> = ({ children, dark = true, top = 1450 }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: "center", fontFamily: SANS, fontSize: 26, lineHeight: 1.35, color: dark ? "rgba(236,233,225,0.75)" : C.muted }}>{children}</div>
);

export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; dark?: boolean; at?: number }> = ({ x, y, children, dark, at = 0 }) => {
  const t = useSec();
  const p = seg(t, at, 0.35, E.back);
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% 0", scale: String(p), opacity: seg(t, at, 0.15), background: dark ? C.ink : C.paper, color: dark ? C.paper : C.ink, fontFamily: SANS, fontWeight: 700, fontSize: 34, padding: "12px 24px", borderRadius: 999, whiteSpace: "nowrap", border: `2px solid ${dark ? "#2a3b5a" : C.line}` }}>{children}</div>
  );
};
