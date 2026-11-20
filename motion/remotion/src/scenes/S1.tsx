import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Caption } from "../brand";
import { FPS, E, fadeInOut, seg, skyline } from "../anim";

const SKY = skyline(1250, 7, true);

export const S1: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const sunY = 1160 - seg(t, 0, 4.8, E.soft) * 470;
  const danfoX = -480 + seg(t, 0.2, 4.6, E.linear) * 1700;
  const a = fadeInOut(t, 0.4, 2.4);
  const b = fadeInOut(t, 2.5, 4.8);
  return (
    <AbsoluteFill style={{ background: "#f1e7cf" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <circle cx={540} cy={sunY} r={210} fill={C.gold2} />
        <g fill={C.surface} transform={`translate(${t * 28},0)`}>
          <rect x={120} y={360} width={260} height={46} rx={23} /><rect x={190} y={326} width={150} height={60} rx={30} />
          <rect x={700} y={520} width={280} height={46} rx={23} /><rect x={770} y={486} width={150} height={60} rx={30} />
        </g>
        <g fill={C.ink}>
          {SKY.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}
          {/* cable-stayed bridge */}
          <rect x={300} y={880} width={26} height={370} /><rect x={700} y={880} width={26} height={370} />
          <rect x={0} y={1210} width={1080} height={22} />
        </g>
        <g stroke={C.ink} strokeWidth={4}>
          {[...Array(9)].map((_, i) => (
            <g key={i}>
              <line x1={313} y1={900 + i * 6} x2={313 - 40 - i * 34} y2={1210} /><line x1={313} y1={900 + i * 6} x2={313 + 40 + i * 34} y2={1210} />
              <line x1={713} y1={900 + i * 6} x2={713 - 40 - i * 34} y2={1210} /><line x1={713} y1={900 + i * 6} x2={713 + 40 + i * 34} y2={1210} />
            </g>
          ))}
        </g>
        <rect y={1250} width={1080} height={250} fill={C.night} />
        <g transform={`translate(${-200 + t * 95},1300)`}>
          <path d="M0 40 L180 40 L150 0 L40 0Z" fill={C.gold} /><rect x={60} y={-40} width={6} height={40} fill={C.ink} /><path d="M66 -40 L130 -8 L66 -8Z" fill={C.surface} />
        </g>
        <rect y={1500} width={1080} height={420} fill={C.deep} />
        <rect y={1690} width={1080} height={8} fill={C.gold2} opacity={0.8} />
        <g transform={`translate(${danfoX},1510)`}>
          <rect width={420} height={190} rx={22} fill="#f2b705" /><rect y={92} width={420} height={22} fill={C.deep} />
          <rect x={270} y={20} width={120} height={60} rx={8} fill={C.surface} /><rect x={140} y={20} width={110} height={60} rx={8} fill={C.surface} /><rect x={20} y={20} width={100} height={60} rx={8} fill={C.surface} />
          <rect x={330} y={130} width={70} height={30} rx={6} fill={C.surface} />
          <circle cx={90} cy={195} r={42} fill={C.deep} /><circle cx={90} cy={195} r={18} fill="#c9c6bb" />
          <circle cx={330} cy={195} r={42} fill={C.deep} /><circle cx={330} cy={195} r={18} fill="#c9c6bb" />
        </g>
      </svg>
      <Caption top={300} opacity={a.opacity} y={a.y}>Lagos. Early morning.</Caption>
      <Caption top={300} opacity={b.opacity} y={b.y}>Your flat is empty again.</Caption>
    </AbsoluteFill>
  );
};
