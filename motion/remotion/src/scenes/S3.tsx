import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Caption, SANS, SERIF, wipeClip } from "../brand";
import { FPS, E, clamp, fadeInOut, seg } from "../anim";

export const S3: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const pp = seg(t, 0.2, 0.9, E.back);
  const rc = seg(t, 1.0, 0.7, E.soft);
  const fp = seg(t, 2.0, 0.9, E.inOut);
  const press = t > 3.1 && t < 3.4;
  const rp = clamp((t - 3.1) / 0.6);
  const acc = t > 3.2;
  const a = fadeInOut(t, 0.8, 3.0);
  const b = fadeInOut(t, 3.2, 5.4);
  const row = (y: number, k: string, v: string) => (
    <>
      <text x={300} y={y} fontFamily={SANS} fontSize={34} fill={C.muted}>{k}</text>
      <text x={780} y={y} textAnchor="end" fontFamily={SANS} fontSize={34} fill={C.ink} fontWeight={600}>{v}</text>
    </>
  );
  return (
    <AbsoluteFill style={{ background: C.ink, clipPath: wipeClip(t) }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(0,${(1 - pp) * 900})`}>
          <rect x={190} y={230} width={700} height={1200} rx={70} fill={C.deep} stroke="#2a3b5a" strokeWidth={6} />
          <rect x={220} y={260} width={640} height={1140} rx={48} fill={C.paper} /><rect x={440} y={276} width={200} height={30} rx={15} fill={C.deep} />
          <text x={270} y={400} fontFamily={SANS} fontWeight={600} fontSize={30} fill={C.muted}>Partner workspace</text>
          <g opacity={rc} transform={`translate(0,${(1 - rc) * 40})`}>
            <rect x={260} y={450} width={560} height={620} rx={12} fill={C.surface} stroke={C.line} strokeWidth={3} /><rect x={260} y={450} width={560} height={14} fill={C.gold} />
            <text x={300} y={540} fontFamily={SERIF} fontSize={54} fill={C.ink} fontWeight={480}>New request</text>
            <line x1={300} y1={580} x2={780} y2={580} stroke={C.line} strokeWidth={3} />
            {row(650, "Stay", "3 nights")}{row(720, "Area", "Lekki Phase 1")}{row(790, "Guests", "2")}
            <rect x={300} y={860} width={480} height={110} rx={10} fill={acc ? C.ok : C.ink} />
            {!acc && <text x={540} y={930} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={40} fill="#fff">Accept</text>}
            {acc && <path d="M455 915 L495 955 L565 880" stroke={C.gold2} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            <text x={540} y={1030} textAnchor="middle" fontFamily={SANS} fontSize={30} fill={acc ? C.ok : C.muted}>
              {acc ? "Accepted. Guest has 48 hours to pay." : "Guest pays after you accept"}
            </text>
          </g>
          <g opacity={t > 2.0 && t < 4.2 ? 1 : 0} transform={`translate(${700 - fp * 140},${1300 - fp * 400 + (press ? 10 : 0)})`}>
            <circle r={30 + rp * 70} fill="none" stroke={C.gold} strokeWidth={6} opacity={t > 3.1 ? 1 - rp : 0} />
            <rect x={-26} y={10} width={52} height={170} rx={26} fill="#6b4226" /><rect x={-26} y={90} width={120} height={90} rx={24} fill="#6b4226" />
          </g>
        </g>
      </svg>
      <Caption top={1530} opacity={a.opacity} y={a.y}>A guest sends a request.</Caption>
      <Caption top={1530} opacity={b.opacity} y={b.y}>They pay only after you accept.</Caption>
    </AbsoluteFill>
  );
};
