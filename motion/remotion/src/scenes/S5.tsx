import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Mark, SANS, SERIF, wipeClip } from "../brand";
import { FPS, rise, seg } from "../anim";

const Line: React.FC<{ t: number; at: number; children: string }> = ({ t, at, children }) => {
  const p = seg(t, at, 1.0);
  return (
    <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
      <span style={{ display: "inline-block", translate: `0 ${(1 - p) * 110}%`, opacity: p > 0 ? 1 : 0 }}>{children}</span>
    </span>
  );
};

export const S5: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const sub = rise(t, 1.9), btn = rise(t, 2.5), url = rise(t, 2.8), logo = rise(t, 3.3), tag = rise(t, 3.5);
  const at = (r: { opacity: number; y: number }) => ({ opacity: r.opacity, translate: `0 ${r.y}px` });
  return (
    <AbsoluteFill style={{ background: C.ink, clipPath: wipeClip(t) }}>
      <div style={{ position: "absolute", left: 96, top: 420, width: 890, fontFamily: SERIF, fontWeight: 420, letterSpacing: "-0.025em", fontSize: 158, lineHeight: 0.98, color: C.paper }}>
        <Line t={t} at={0.9}>List your</Line><Line t={t} at={1.04}>Lagos stay.</Line>
      </div>
      <div style={{ position: "absolute", left: 96, top: 880, width: 860, fontFamily: SANS, fontSize: 48, lineHeight: 1.4, color: C.mist, ...at(sub) }}>
        Join as a partner. Your workspace opens straight away. No wahala.
      </div>
      <div style={{ position: "absolute", left: 96, top: 1240, background: C.paper, color: C.ink, borderRadius: 10, fontFamily: SANS, fontWeight: 600, fontSize: 40, padding: "34px 56px", ...at(btn) }}>Become a partner</div>
      <div style={{ position: "absolute", left: 96, top: 1420, fontFamily: SANS, fontSize: 44, color: C.gold2, fontWeight: 500, ...at(url) }}>hamlet.rest/partner/register</div>
      <div style={{ position: "absolute", left: 96, top: 1700, display: "flex", alignItems: "center", gap: 22, ...at(logo) }}>
        <Mark stem={C.paper} bar={C.gold2} size={84} />
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 480, letterSpacing: ".02em", color: C.paper }}>HAMLET.</span>
      </div>
      <div style={{ position: "absolute", right: 96, top: 1722, fontFamily: SANS, fontSize: 36, color: C.mist, ...at(tag) }}>Your stay, sorted.</div>
    </AbsoluteFill>
  );
};
