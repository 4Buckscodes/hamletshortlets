import React from "react";
import { AbsoluteFill } from "remotion";
import { C, SANS, SERIF } from "../brand";
import { E, seg, skyline } from "../anim";
import { Beats, Card, Check, EndCard, Phone, Photo, Pill, Row, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";

const VID = "londonLekki";
const LDN = skyline(940, 3, true);
const LOS = skyline(1880, 11, true);

const Clock: React.FC<{ h: number; m: number; x: number; y: number; dark?: boolean }> = ({ h, m, x, y, dark }) => {
  const col = dark ? C.paper : C.ink;
  const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
  return (
    <svg width={150} height={150} viewBox="-75 -75 150 150" style={{ position: "absolute", left: x, top: y }}>
      <circle r={68} fill="none" stroke={col} strokeWidth={6} />
      <line x1={0} y1={0} x2={Math.sin((ha * Math.PI) / 180) * 36} y2={-Math.cos((ha * Math.PI) / 180) * 36} stroke={col} strokeWidth={8} strokeLinecap="round" />
      <line x1={0} y1={0} x2={Math.sin((ma * Math.PI) / 180) * 54} y2={-Math.cos((ma * Math.PI) / 180) * 54} stroke={C.gold2} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
};

/** Hook: London on top, Lagos below, both visible on frame one. */
const Split: React.FC<{ phone?: boolean }> = ({ phone }) => {
  const t = useSec();
  const mins = Math.floor(t * 4);
  const buzz = phone && t > 0.2 ? Math.sin(t * 60) * 5 : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 960, background: "#c9cfd8", overflow: "hidden" }}>
        <svg viewBox="0 0 1080 960" width={1080} height={960} style={{ position: "absolute" }}>
          <g fill="#5d6b80">{LDN.map((r, i) => <rect key={i} x={r.x} y={r.y + 60} width={r.w} height={r.h} />)}</g>
          <g fill="#3d4a5e"><rect x={760} y={330} width={90} height={640} /><path d="M760 330 L805 220 L850 330Z" /><circle cx={805} cy={420} r={30} fill="#c9cfd8" /></g>
        </svg>
        <div style={{ position: "absolute", left: 80, top: 120, fontFamily: SERIF, fontSize: 150, color: C.ink, letterSpacing: "-0.03em" }}>London</div>
        <div style={{ position: "absolute", left: 86, top: 300, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: C.ink }}>You are here</div>
        <Clock h={7} m={mins} x={860} y={140} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 960, width: 1080, height: 960, background: "#f1e7cf", overflow: "hidden" }}>
        <svg viewBox="0 960 1080 960" width={1080} height={960} style={{ position: "absolute" }}>
          <circle cx={820} cy={1440} r={150} fill={C.gold2} />
          <g fill={C.ink}>{LOS.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</g>
        </svg>
        <div style={{ position: "absolute", left: 80, top: 90, fontFamily: SERIF, fontSize: 150, color: C.ink, letterSpacing: "-0.03em" }}>Lekki</div>
        <div style={{ position: "absolute", left: 86, top: 270, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: C.ink }}>Your apartment is here</div>
        <Clock h={8} m={mins} x={860} y={110} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 952, width: 1080, height: 16, background: C.gold }} />
      {phone && (
        <div style={{ position: "absolute", left: 120, top: 520, translate: `${buzz}px 0` }}>
          {[0, 1, 2].map((i) => {
            const p = seg(t, 0.15 + i * 0.35, 0.3, E.back);
            return <div key={i} style={{ marginBottom: 16, opacity: seg(t, 0.15 + i * 0.35, 0.15), scale: String(p), transformOrigin: "left" }}><Pill bg={C.ink} fg={C.paper} size={36}>{["New enquiry", "Guest arriving?", "Who has the keys?"][i]}</Pill></div>;
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Workspace: React.FC<{ tabs?: boolean }> = ({ tabs }) => {
  const t = useSec();
  const pp = seg(t, 0, 0.5);
  const names = ["Requests", "Availability", "Bookings", "Earnings"];
  const L = lines(VID);
  const lineDur = L[3].dur;
  const idx = tabs ? Math.min(3, Math.floor(Math.max(0, t - 0.12) / (lineDur / 4.2))) : 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ translate: `0 ${(1 - pp) * (tabs ? 0 : 900)}px` }}>
        <Phone y={200}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 30 }}>
            {names.map((n, i) => <Pill key={n} bg={i === idx ? C.ink : C.sand} fg={i === idx ? C.paper : C.muted} size={28}>{n}</Pill>)}
          </div>
          <Card>
            {idx === 0 && <><div style={{ fontFamily: SERIF, fontSize: 50, color: C.ink, marginBottom: 12 }}>New request</div><Row k="Stay" v="4 nights" /><Row k="Guests" v="2" /><div style={{ marginTop: 18 }}><Pill bg={C.ink} fg="#fff">Accept or decline</Pill></div></>}
            {idx === 1 && <><div style={{ fontFamily: SERIF, fontSize: 50, color: C.ink, marginBottom: 18 }}>Availability</div><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>{[...Array(28)].map((_, i) => <div key={i} style={{ height: 52, borderRadius: 6, background: [3, 4, 10, 11, 12, 20].includes(i) ? C.sand : C.surface, border: `2px solid ${C.line}` }} />)}</div></>}
            {idx === 2 && <><div style={{ fontFamily: SERIF, fontSize: 50, color: C.ink, marginBottom: 12 }}>Bookings</div><Row k="Confirmed" v="Paid" color={C.ok} /><Row k="Awaiting payment" v="48-hour window" /><Row k="Requests" v="To review" /></>}
            {idx === 3 && <><div style={{ fontFamily: SERIF, fontSize: 50, color: C.ink, marginBottom: 12 }}>Earnings</div><Row k="Your agreed rate" v="Per night" /><Row k="Payouts" v="After ID check" /><Row k="Statements" v="In one place" /></>}
          </Card>
          <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 28, color: C.muted, textAlign: "center" }}>Illustrative screens</div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

const VerifiedList = () => {
  const t = useSec();
  const items = ["Ownership or title evidence", "Partner identity", "Authority to list", "Physical inspection"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 760, overflow: "hidden" }}><Photo src="exterior-1.jpg" zoom={[1.08, 1.0]} dur={4.5} /></div>
      <div style={{ position: "absolute", left: 60, top: 640, opacity: seg(t, 0.2, 0.3) }}><Pill bg={C.ok} fg="#fff" size={40}><Check size={36} color="#fff" /> Verified before it goes live</Pill></div>
      {items.map((s, i) => {
        const p = seg(t, 0.6 + i * 0.5, 0.35);
        return (
          <div key={s} style={{ position: "absolute", left: 90, right: 90, top: 860 + i * 150, display: "flex", alignItems: "center", gap: 26, opacity: 0.25 + 0.75 * p, borderBottom: `2px solid ${C.line}`, paddingBottom: 30 }}>
            <Check size={64} p={p} />
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: C.ink }}>{s}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Currencies = () => {
  const t = useSec();
  const syms = ["₦", "$", "£"];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 90, top: 280, fontFamily: SERIF, fontSize: 92, color: C.paper, lineHeight: 1.05 }}>Guests abroad<br /><span style={{ color: C.gold2 }}>see their currency.</span></div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 760, display: "flex", justifyContent: "space-between" }}>
        {syms.map((s, i) => {
          const p = seg(t, 0.4 + i * 0.4, 0.4, E.back);
          return (
            <div key={s} style={{ width: 270, height: 270, borderRadius: 135, border: `6px solid ${i === 0 ? "#2a3b5a" : C.gold2}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 150, color: i === 0 ? C.mist : C.paper, scale: String(p), opacity: seg(t, 0.4 + i * 0.4, 0.2) }}>{s}</div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 90, top: 1110, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: C.mist, opacity: seg(t, 1.6, 0.4) }}>Naira, US dollars and British pounds</div>
    </AbsoluteFill>
  );
};

const RateCard = () => {
  const t = useSec();
  const r = (a: number) => ({ opacity: seg(t, a, 0.35), translate: `0 ${(1 - seg(t, a, 0.35)) * 20}px` });
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 90, top: 250, fontFamily: SERIF, fontSize: 96, color: C.ink, lineHeight: 1.02 }}>Your rate<br /><span style={{ color: C.gold }}>stays your rate.</span></div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 620 }}>
        <Card>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.muted, marginBottom: 10 }}>Example stay</div>
          <div style={r(0.4)}><Row k="Your agreed rate" v="₦200,000" strong /></div>
          <div style={r(1.1)}><Row k="Guest service fee, added on top" v="+ ₦40,000" color={C.gold} /></div>
          <div style={{ height: 3, background: C.line, margin: "12px 0", ...r(1.6) }} />
          <div style={r(1.8)}><Row k="Guest's stay price" v="₦240,000" strong /></div>
        </Card>
      </div>
      <div style={{ position: "absolute", left: 90, top: 1240, ...r(2.4) }}><Pill bg={C.ink} fg={C.paper} size={38}>The fee isn't taken out of your rate</Pill></div>
    </AbsoluteFill>
  );
};

export const LondonLekki: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.02, name: "pop", vol: 0.35 },
    { at: L[1].start + 0.05, name: "buzz", vol: 0.4 }, { at: L[1].start + 0.4, name: "notify", vol: 0.35 }, { at: L[1].start + 0.75, name: "notify", vol: 0.3 },
    { at: L[2].start - 0.15, name: "whoosh", vol: 0.45 },
    ...[0, 1, 2, 3].map((i) => ({ at: L[3].start + 0.12 + i * (L[3].dur / 4.2), name: "tap", vol: 0.5 })),
    { at: L[4].start - 0.15, name: "whoosh", vol: 0.4 }, ...[0, 1, 2, 3].map((i) => ({ at: L[4].start + 0.6 + i * 0.5, name: "pop", vol: 0.3 })),
    ...[0, 1, 2].map((i) => ({ at: L[5].start + 0.3 + i * 0.4, name: "pop", vol: 0.35 })),
    { at: L[6].start + 1.0, name: "ding", vol: 0.3 }, { at: L[7].start - 0.05, name: "whoosh", vol: 0.4 }, { at: L[7].start + 0.9, name: "ding", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Split />, <Split phone />, <Workspace />, <Workspace tabs />, <VerifiedList />, <Currencies />, <RateCard />,
          <EndCard head={["Your place,", "working."]} sub="Run your Lagos shortlet from anywhere, on HAMLET." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[7].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} />
    </AbsoluteFill>
  );
};
