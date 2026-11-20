import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, Card, Check, EndCard, Phone, Pill, Row, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";

const VID = "yourRules";
const BAD = "#c4473b";

/** Hook: a dark front door at night, the question lands word by word. */
const Door = () => {
  const t = useSec();
  const flicker = 0.75 + 0.25 * Math.abs(Math.sin(t * 9) * Math.sin(t * 3.3));
  const words = ["Who's", "sleeping", "in", "your", "apartment", "tonight?"];
  return (
    <AbsoluteFill style={{ background: "#060e1c" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute" }}>
        <rect x={290} y={760} width={500} height={900} fill="#0b1830" stroke="#1d2f52" strokeWidth={14} />
        <rect x={330} y={800} width={420} height={380} fill="none" stroke="#1d2f52" strokeWidth={8} />
        <rect x={330} y={1220} width={420} height={400} fill="none" stroke="#1d2f52" strokeWidth={8} />
        <circle cx={700} cy={1240} r={18} fill={C.gold} />
        <circle cx={540} cy={1000} r={26} fill="#091528" stroke={C.gold} strokeWidth={6} />
        <circle cx={540} cy={1000} r={10} fill={C.gold2} opacity={flicker} />
        <rect x={0} y={1660} width={1080} height={260} fill="#0b1322" />
        <rect x={340} y={1650} width={400} height={14} fill={C.gold2} opacity={0.35 * flicker} />
      </svg>
      <div style={{ position: "absolute", left: 80, right: 80, top: 180, fontFamily: SERIF, fontWeight: 460, fontSize: 112, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        {words.map((w, i) => {
          const p = i < 2 ? 1 : seg(t, 0.25 + i * 0.28, 0.25, E.back);
          return <span key={i} style={{ display: "inline-block", marginRight: "0.22em", opacity: p, scale: String(0.8 + 0.2 * p), color: i === 5 ? C.gold2 : C.paper }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Risks = () => {
  const t = useSec();
  const items = [["Fake bookings", 0.1], ["Guests you know nothing about", 1.0], ["Payments that never arrive", 2.6]] as const;
  return (
    <AbsoluteFill style={{ background: "#060e1c" }}>
      {items.map(([label, at], i) => {
        const p = seg(t, at, 0.3, E.back);
        return (
          <div key={i} style={{ position: "absolute", left: 80, right: 80, top: 330 + i * 330, opacity: seg(t, at, 0.15), scale: String(1.3 - 0.3 * p), rotate: `${[-2, 1.5, -1][i]}deg` }}>
            <div style={{ background: "#111b2e", border: `3px solid ${BAD}`, borderRadius: 16, padding: "40px 44px", display: "flex", alignItems: "center", gap: 28 }}>
              <svg width={70} height={70} viewBox="0 0 70 70"><circle cx={35} cy={35} r={31} fill="none" stroke={BAD} strokeWidth={6} /><path d="M22 22 L48 48 M48 22 L22 48" stroke={BAD} strokeWidth={7} strokeLinecap="round" /></svg>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 54, color: C.paper, lineHeight: 1.1 }}>{label}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Turn = () => {
  const t = useSec();
  const p = seg(t, 0.05, 0.6);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 90, top: 380, opacity: seg(t, 0, 0.3), scale: String(0.8 + 0.2 * seg(t, 0, 0.5, E.back)), transformOrigin: "left" }}><Mark stem={C.ink} bar={C.gold} size={150} /></div>
      <div style={{ position: "absolute", left: 90, top: 620, width: 900, fontFamily: SERIF, fontWeight: 440, fontSize: 132, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.ink, opacity: p, translate: `0 ${(1 - p) * 40}px` }}>
        Nothing happens <span style={{ color: C.gold }}>without you.</span>
      </div>
    </AbsoluteFill>
  );
};

const Decide = () => {
  const t = useSec();
  const pp = seg(t, 0, 0.5);
  const hoverDecline = t > 1.3 && t < 2.2;
  const acc = t > 2.75;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ translate: `0 ${(1 - pp) * 900}px` }}>
        <Phone y={200}>
          <Card>
            <div style={{ fontFamily: SERIF, fontSize: 54, color: C.ink, marginBottom: 18 }}>New request</div>
            <Row k="Stay" v="2 nights" /><Row k="Guests" v="3" /><Row k="Message" v="Work trip" />
            <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "30px 0", borderRadius: 12, border: `3px solid ${hoverDecline ? C.ink : C.line}`, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: hoverDecline ? C.ink : C.muted, opacity: acc ? 0.35 : 1 }}>Decline</div>
              <div style={{ flex: 1.3, textAlign: "center", padding: "30px 0", borderRadius: 12, background: acc ? C.ok : C.ink, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: "#fff", outline: !hoverDecline && t > 2.2 && !acc ? `5px solid ${C.gold2}` : "none" }}>{acc ? "Accepted" : "Accept"}</div>
            </div>
          </Card>
          <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 34, color: C.ink, fontWeight: 600, opacity: seg(t, 0.4, 0.4) }}>You decide. Every time.</div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

const PayFirst = () => {
  const t = useSec();
  const steps = ["Requested", "Accepted", "Paid", "Confirmed"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 90, top: 250, fontFamily: SERIF, fontSize: 96, color: C.ink, lineHeight: 1.02, opacity: seg(t, 0, 0.3) }}>Paid first.<br /><span style={{ color: C.gold }}>Then confirmed.</span></div>
      {steps.map((s, i) => {
        const p = seg(t, 0.3 + i * 0.55, 0.35, E.back);
        return (
          <div key={s} style={{ position: "absolute", left: 90, right: 90, top: 640 + i * 190, display: "flex", alignItems: "center", gap: 30, opacity: seg(t, 0.3 + i * 0.55, 0.2) }}>
            <div style={{ width: 96, height: 96, borderRadius: 48, background: i === 2 ? C.gold : C.ok, display: "flex", alignItems: "center", justifyContent: "center", scale: String(p) }}><Check size={56} color="#fff" p={p} /></div>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 60, color: C.ink }}>{s}</span>
            {i === 2 && <span style={{ marginLeft: "auto" }}><Pill bg={C.sand} fg={C.ink}>Through HAMLET</Pill></span>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Address = () => {
  const t = useSec();
  const unlock = seg(t, 1.6, 0.4);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 380 }}>
        <Card style={{ background: C.paper }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, color: C.muted, marginBottom: 20 }}>Exact address</div>
          {[640, 520, 300].map((w, i) => <div key={i} style={{ width: w, height: 46, borderRadius: 8, background: C.ink, marginBottom: 18, opacity: 0.9 }} />)}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
            <svg width={70} height={70} viewBox="0 0 70 70"><rect x={12} y={30} width={46} height={34} rx={6} fill={C.gold} /><path d={`M22 30 V${22 - unlock * 0} a13 13 0 0 1 26 0 V30`} stroke={C.gold} strokeWidth={7} fill="none" /></svg>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.ink }}>Private until the booking is paid</span>
          </div>
        </Card>
      </div>
      <div style={{ position: "absolute", left: 90, top: 1100, fontFamily: SERIF, fontSize: 80, color: C.paper, lineHeight: 1.05, opacity: seg(t, 0.5, 0.4) }}>Only confirmed guests<br /><span style={{ color: C.gold2 }}>find their way in.</span></div>
    </AbsoluteFill>
  );
};

const Deposit = () => {
  const t = useSec();
  const hl = seg(t, 1.0, 0.4);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 330 }}>
        <Card>
          <div style={{ fontFamily: SERIF, fontSize: 54, color: C.ink, marginBottom: 16 }}>Guest's checkout</div>
          <Row k="Stay" v="Itemised" />
          <Row k="Cleaning" v="Itemised" />
          <div style={{ margin: "10px -18px", padding: "4px 18px", borderRadius: 10, background: `rgba(184,146,58,${0.22 * hl})`, border: `3px solid rgba(184,146,58,${hl})` }}>
            <Row k="Refundable caution deposit" v="Held" strong />
          </div>
        </Card>
      </div>
      <div style={{ position: "absolute", left: 90, top: 1000, display: "flex", alignItems: "center", gap: 30, opacity: seg(t, 1.2, 0.4) }}>
        <svg width={130} height={150} viewBox="0 0 130 150"><path d="M65 8 L118 28 V72 C118 108 94 132 65 144 C36 132 12 108 12 72 V28Z" fill={C.ink} /><path d="M40 76 L58 94 L92 56" stroke={C.gold2} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ fontFamily: SERIF, fontSize: 76, color: C.ink, lineHeight: 1.05 }}>Your space,<br />protected.</span>
      </div>
    </AbsoluteFill>
  );
};

export const YourRules: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: L[1].start - 0.05, name: "thud", vol: 0.6 }, { at: L[1].start + 0.95, name: "thud", vol: 0.6 }, { at: L[1].start + 2.55, name: "thud", vol: 0.6 },
    { at: L[2].start - 0.15, name: "whoosh", vol: 0.45 }, { at: L[2].start + 0.05, name: "stamp", vol: 0.4 },
    { at: L[3].start - 0.1, name: "notify", vol: 0.45 }, { at: L[3].start + 2.6, name: "tap", vol: 0.7 },
    ...[0, 1, 2, 3].map((i) => ({ at: L[4].start + 0.2 + i * 0.55, name: "pop", vol: 0.35 })), { at: L[4].start + 1.95, name: "ding", vol: 0.35 },
    { at: L[5].start + 1.5, name: "lock", vol: 0.6 }, { at: L[6].start + 0.9, name: "ding", vol: 0.3 },
    { at: L[7].start - 0.05, name: "whoosh", vol: 0.4 }, { at: L[7].start + 0.9, name: "ding", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: "#060e1c" }}>
      <Beats vid={VID}>
        {[<Door />, <Risks />, <Turn />, <Decide />, <PayFirst />, <Address />, <Deposit />,
          <EndCard head={["Your property.", "Your rules."]} sub="Every request comes to you first. Guests pay before it's confirmed." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[7].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} />
    </AbsoluteFill>
  );
};
