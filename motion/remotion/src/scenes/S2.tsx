import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Caption, wipeClip } from "../brand";
import { FPS, clamp, fadeInOut, skyline } from "../anim";

const CITY = skyline(830, 19, false);

export const S2: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const buzzing = t > 2.6 && t < 4.8;
  const buzz = buzzing ? Math.sin(t * 70) * 4 : 0;
  const ringing = t > 2.7;
  const a = fadeInOut(t, 0.5, 2.5);
  const b = fadeInOut(t, 2.7, 5.0);
  return (
    <AbsoluteFill style={{ background: C.sand, clipPath: wipeClip(t) }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <pattern id="ank" width={60} height={60} patternUnits="userSpaceOnUse">
            <rect width={60} height={60} fill={C.gold} /><circle cx={30} cy={30} r={22} fill={C.ink} /><circle cx={30} cy={30} r={12} fill={C.gold2} /><circle cx={30} cy={30} r={5} fill={C.ink} />
            <circle cx={0} cy={0} r={9} fill={C.ink} /><circle cx={60} cy={60} r={9} fill={C.ink} />
          </pattern>
        </defs>
        <rect y={1420} width={1080} height={500} fill={C.line} /><rect y={1414} width={1080} height={10} fill="#c9c6bb" />
        {/* window */}
        <rect x={560} y={330} width={420} height={520} fill={C.surface} /><rect x={580} y={350} width={380} height={480} fill="#f1e7cf" />
        <g fill={C.ink} transform="translate(580,508) scale(.35)">{CITY.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</g>
        <rect x={768} y={350} width={8} height={480} fill={C.surface} />
        {/* empty wall calendar */}
        <rect x={110} y={330} width={360} height={400} rx={6} fill={C.surface} stroke={C.line} strokeWidth={4} /><rect x={110} y={330} width={360} height={70} fill={C.ink} />
        <g fill="none" stroke={C.line} strokeWidth={3}>
          {[...Array(35)].map((_, i) => <rect key={i} x={120 + (i % 7) * 48.5} y={420 + Math.floor(i / 7) * 60} width={48.5} height={60} />)}
        </g>
        {/* sofa */}
        <rect x={70} y={1080} width={560} height={320} rx={24} fill={C.ink} /><rect x={40} y={1190} width={110} height={230} rx={22} fill={C.night} /><rect x={550} y={1190} width={110} height={230} rx={22} fill={C.night} />
        <rect x={130} y={1250} width={420} height={120} rx={14} fill="#1d2f52" /><rect x={150} y={1130} width={130} height={130} rx={14} fill="url(#ank)" transform="rotate(-8 215 1195)" />
        <rect x={130} y={1400} width={10} height={24} fill={C.ink} /><rect x={560} y={1400} width={10} height={24} fill={C.ink} />
        {/* lamp + plant */}
        <rect x={745} y={1090} width={8} height={330} fill={C.gold} /><path d="M700 1090 L800 1090 L780 1000 L720 1000Z" fill={C.gold2} /><ellipse cx={749} cy={1424} rx={60} ry={10} fill={C.gold} />
        <g transform="translate(880,1424)"><rect x={-40} y={-90} width={80} height={90} rx={10} fill={C.gold} /><path d="M0 -90 C -80 -170 -90 -240 -60 -290 C -20 -230 0 -170 0 -90Z M0 -90 C 70 -180 100 -230 70 -300 C 30 -240 6 -170 0 -90Z" fill={C.ok} /></g>
        {/* owner */}
        <g transform="translate(300,1424)">
          <rect x={-40} y={-330} width={30} height={330} rx={10} fill={C.deep} /><rect x={12} y={-330} width={30} height={330} rx={10} fill={C.deep} /><rect x={-58} y={-340} width={116} height={30} rx={8} fill={C.deep} />
          <rect x={-70} y={-640} width={140} height={330} rx={40} fill={C.gold} /><rect x={-6} y={-640} width={12} height={260} fill={C.gold2} />
          <rect x={-18} y={-690} width={36} height={60} fill="#6b4226" /><circle cy={-740} r={62} fill="#6b4226" />
          <path d="M-62 -745 C-62 -815 62 -815 62 -745 C40 -780 -40 -780 -62 -745Z" fill="#1a1411" />
          <circle cx={-22} cy={-738} r={5} fill="#1a1411" /><circle cx={22} cy={-738} r={5} fill="#1a1411" />
          <path d={ringing ? "M-20 -712 Q0 -684 20 -712" : "M-18 -706 Q0 -714 18 -706"} stroke="#1a1411" strokeWidth={5} fill="none" strokeLinecap="round" />
          <g transform="translate(-60,-600)"><rect x={-24} width={48} height={190} rx={24} fill={C.gold} transform="rotate(8)" /></g>
          <g transform={`translate(${60 + buzz},-600)`}>
            <rect x={-24} width={48} height={150} rx={24} fill={C.gold} transform="rotate(-50)" />
            <g transform="translate(-95,95) rotate(-20)"><rect x={-38} y={-62} width={76} height={124} rx={12} fill={C.deep} /><rect x={-30} y={-54} width={60} height={108} rx={6} fill={ringing ? C.gold2 : C.night} /></g>
          </g>
        </g>
        {[0, 1].map((i) => {
          const p = clamp((t - 2.7 - i * 0.35) / 1.2);
          return <circle key={i} cx={205} cy={1000} r={40 + p * 80} fill="none" stroke={C.gold} strokeWidth={6} opacity={ringing ? 1 - p : 0} />;
        })}
      </svg>
      <Caption top={1560} opacity={a.opacity} y={a.y}>No bookings. No income.</Caption>
      <Caption top={1560} opacity={b.opacity} y={b.y}>Then, your phone buzzes.</Caption>
    </AbsoluteFill>
  );
};
