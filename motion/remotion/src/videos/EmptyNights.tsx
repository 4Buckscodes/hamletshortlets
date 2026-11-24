import React from "react";
import { AbsoluteFill } from "remotion";
import { C, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, Card, Check, EndCard, KineticCaption, Phone, Photo, Pill, Row, Sfx, Soundtrack, lines, useSec } from "../kit/kit";

const VID = "emptyNights";

const Stamp: React.FC<{ label: string; at?: number }> = ({ label, at = 0 }) => {
  const t = useSec();
  const p = seg(t, at, 0.28, E.back);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 520 }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 44, color: C.gold2, marginBottom: 10, opacity: seg(t, at, 0.2) }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontWeight: 460, fontSize: 290, lineHeight: 0.9, letterSpacing: "-0.04em", color: C.paper, scale: String(1.25 - 0.25 * p), opacity: at === 0 ? 1 : p, transformOrigin: "left center" }}>Empty.</div>
    </div>
  );
};

const Hook = () => (
  <AbsoluteFill>
    <Photo src="hero-sample-bedroom.jpg" dim={0.5} zoom={[1.15, 1.05]} dur={2.6} pos="40% 50%" />
    <Stamp label="Last night" />
  </AbsoluteFill>
);

const NightBefore = () => {
  const t = useSec();
  const second = t > 0.65;
  return (
    <AbsoluteFill>
      <Photo src={second ? "hero-sample-kitchen.jpg" : "hero-sample-lounge.jpg"} dim={0.55} zoom={[1.1, 1.0]} dur={1.4} />
      <Stamp label={second ? "The night before that" : "The night before"} at={second ? 0.65 : 0} />
    </AbsoluteFill>
  );
};

const Calendar: React.FC<{ mode: "empty" | "booked" }> = ({ mode }) => {
  const t = useSec();
  const empty = mode === "empty";
  const count = empty ? Math.min(20, Math.floor(Math.max(0, t - 0.25) / 0.1)) : Math.min(30, Math.floor(Math.max(0, t - 0.2) / 0.045));
  return (
    <AbsoluteFill style={{ background: empty ? C.ink : C.paper }}>
      <div style={{ position: "absolute", left: 90, top: 250, fontFamily: SERIF, fontSize: 84, color: empty ? C.paper : C.ink }}>{empty ? "This month" : "Booked"}</div>
      {empty && <div style={{ position: "absolute", right: 90, top: 270, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: C.gold2 }}>{count} nights empty</div>}
      <div style={{ position: "absolute", left: 90, top: 420, width: 900, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 12 }}>
        {[...Array(30)].map((_, i) => {
          const on = empty ? i < count : i < count && i % 6 !== 5;
          return (
            <div key={i} style={{ position: "relative", height: 112, borderRadius: 8, border: `2px solid ${empty ? "#2a3b5a" : C.line}`, background: empty ? C.deep : on ? C.gold : C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 34, color: empty ? (on ? "#4a5a78" : C.mist) : on ? "#fff" : C.muted }}>
              {i + 1}
              {empty && on && <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}><line x1="12" y1="88" x2="88" y2="12" stroke={C.gold2} strokeWidth="5" /></svg>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Verified = () => {
  const t = useSec();
  const cards = [
    { src: "penthouse.jpg", x: 70, y: 380, r: -5, at: 0.3 },
    { src: "living-1.jpg", x: 330, y: 720, r: 4, at: 0.6 },
    { src: "pool-1.jpg", x: 110, y: 1060, r: -2, at: 0.9 },
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 90, top: 200, fontFamily: SERIF, fontSize: 92, color: C.ink, opacity: seg(t, 0.05, 0.4) }}>Verified homes.</div>
      {cards.map((c, i) => {
        const p = seg(t, c.at, 0.55, E.back);
        return (
          <div key={i} style={{ position: "absolute", left: c.x, top: c.y, width: 680, height: 420, borderRadius: 10, overflow: "hidden", border: `8px solid ${C.surface}`, rotate: `${c.r}deg`, scale: String(0.6 + 0.4 * p), opacity: seg(t, c.at, 0.2), translate: `0 ${(1 - p) * 200}px` }}>
            <Photo src={c.src} zoom={[1.05, 1.0]} />
            <div style={{ position: "absolute", left: 22, top: 22, opacity: seg(t, c.at + 0.35, 0.2) }}><Pill bg={C.paper} fg={C.ok}><Check size={30} /> Verified</Pill></div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Request = () => {
  const t = useSec();
  const acc = t > 1.55;
  const pp = seg(t, 0, 0.55, E.out);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ translate: `0 ${(1 - pp) * 900}px` }}>
        <Phone y={200}>
          <Card>
            <div style={{ fontFamily: SERIF, fontSize: 54, color: C.ink, marginBottom: 18 }}>New request</div>
            <Row k="Stay" v="3 nights" /><Row k="Guests" v="2" /><Row k="Guest ID" v="Verified" color={C.ok} />
            <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "30px 0", borderRadius: 12, border: `3px solid ${C.line}`, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: C.muted, opacity: acc ? 0.35 : 1 }}>Decline</div>
              <div style={{ flex: 1.3, textAlign: "center", padding: "30px 0", borderRadius: 12, background: acc ? C.ok : C.ink, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: "#fff", scale: t > 1.45 && t < 1.65 ? "0.95" : "1" }}>{acc ? "Accepted" : "Accept"}</div>
            </div>
          </Card>
          <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 28, color: C.muted, textAlign: "center" }}>Illustrative request</div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

const Paid = () => {
  const t = useSec();
  const steps = [["Accepted", 0.1], ["Guest pays", 0.9], ["Confirmed", 1.9]] as const;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Phone y={200}>
        <div style={{ fontFamily: SERIF, fontSize: 54, color: C.ink, marginBottom: 30 }}>Booking</div>
        {steps.map(([label, at], i) => {
          const p = seg(t, at, 0.4);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 0", borderBottom: `2px solid ${C.line}`, opacity: 0.3 + 0.7 * p }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: p > 0.5 ? C.ok : C.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={40} color="#fff" p={p} /></div>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: C.ink }}>{label}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 40, opacity: seg(t, 2.0, 0.4) }}><Pill bg={C.ok} fg="#fff" size={34}>Paid before it's confirmed</Pill></div>
      </Phone>
    </AbsoluteFill>
  );
};

export const EmptyNights: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.02, name: "thud", vol: 0.7 }, { at: L[1].start - 0.1, name: "thud", vol: 0.6 }, { at: L[1].start + 0.55, name: "thud", vol: 0.55 },
    { at: L[2].start - 0.15, name: "whoosh", vol: 0.4 }, { at: L[3].start - 0.15, name: "whoosh", vol: 0.45 },
    { at: L[3].start + 0.2, name: "pop", vol: 0.4 }, { at: L[3].start + 0.5, name: "pop", vol: 0.4 }, { at: L[3].start + 0.8, name: "pop", vol: 0.4 },
    { at: L[4].start - 0.1, name: "notify", vol: 0.45 }, { at: L[4].start + 1.42, name: "tap", vol: 0.7 },
    { at: L[5].start + 1.8, name: "ding", vol: 0.45 }, { at: L[6].start - 0.15, name: "whoosh", vol: 0.4 },
    { at: L[7].start - 0.05, name: "stamp", vol: 0.5 }, { at: L[7].start + 0.8, name: "ding", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Hook />, <NightBefore />, <Calendar mode="empty" />, <Verified />, <Request />, <Paid />, <Calendar mode="booked" />,
          <EndCard head={["List your", "shortlet."]} sub="Verified guests. You choose who stays. Paid before it's confirmed." />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[7].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} />
    </AbsoluteFill>
  );
};

export const CaptionUntil: React.FC<{ vid: string; until: number; top?: number; size?: number }> = ({ vid, until, top = 1560, size = 60 }) => {
  const t = useSec();
  return t < until ? <KineticCaption vid={vid} top={top} size={size} /> : null;
};
