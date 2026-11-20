import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Caption, SANS, SERIF } from "../brand";
import { FPS, E, fadeInOut, seg } from "../anim";
import { wipeClip } from "../brand";

const BOOKED = [16, 17, 18];

export const S4: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const houseY = 1330 + (1 - seg(t, 0.1, 0.9, E.out)) * 500;
  const badge = seg(t, 0.9, 0.5, E.back);
  const dash = 160 * (1 - seg(t, 1.0, 0.7, E.inOut));
  const cal = seg(t, 2.6, 0.6);
  const a = fadeInOut(t, 0.4, 2.6);
  const b = fadeInOut(t, 2.8, 5.0);
  return (
    <AbsoluteFill style={{ background: C.paper, clipPath: wipeClip(t) }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
        <rect y={1330} width={1080} height={590} fill={C.sand} /><rect y={1326} width={1080} height={8} fill={C.line} />
        <g transform={`translate(540,${houseY})`} opacity={1 - seg(t, 2.6, 0.5)}>
          <rect x={-300} y={-520} width={600} height={520} fill={C.surface} stroke={C.ink} strokeWidth={8} />
          <path d="M-340 -520 L0 -740 L340 -520Z" fill={C.ink} /><rect x={-60} y={-300} width={120} height={300} rx={6} fill={C.gold} />
          <rect x={-250} y={-440} width={130} height={130} fill="#f1e7cf" stroke={C.ink} strokeWidth={6} /><rect x={120} y={-440} width={130} height={130} fill="#f1e7cf" stroke={C.ink} strokeWidth={6} />
          <g transform={`translate(0,-600) scale(${badge})`}>
            <circle r={92} fill={C.paper} stroke={C.gold} strokeWidth={10} />
            <path d="M-42 4 L-12 36 L46 -30" stroke={C.ink} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={160} strokeDashoffset={dash} />
          </g>
        </g>
      </svg>
      <div style={{ position: "absolute", left: 150, top: 400, width: 780, opacity: cal, translate: `0 ${(1 - cal) * 30}px` }}>
        <div style={{ fontFamily: SERIF, fontSize: 60, fontWeight: 480, marginBottom: 26, color: C.ink }}>Lekki Phase 1 · November</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }}>
          {[...Array(30)].map((_, i) => {
            const d = i + 1;
            const k = BOOKED.indexOf(d);
            const p = k >= 0 ? seg(t, 3.3 + k * 0.35, 0.5) : 0;
            return (
              <div key={d} style={{ height: 92, border: `2px solid ${C.line}`, background: C.surface, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", font: `600 32px ${SANS}`, color: p > 0.5 ? "#fff" : C.muted, position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: C.gold, borderRadius: 4, scale: `${p} 1`, transformOrigin: "left" }} />
                <span style={{ position: "relative" }}>{d}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Caption top={150} opacity={a.opacity} y={a.y}>Every listing is verified<br />before it goes live.</Caption>
      <Caption top={150} opacity={b.opacity} y={b.y}>Your nights start filling up.</Caption>
    </AbsoluteFill>
  );
};
