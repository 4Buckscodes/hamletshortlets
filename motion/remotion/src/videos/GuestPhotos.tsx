import React from "react";
import { AbsoluteFill } from "remotion";
import { C, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, Card, Check, EndCard, Phone, Photo, Pill, Row, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";

const VID = "guestPhotos";

/** Hook: a glossy listing and a stranger asking for a transfer. */
const Stranger = () => {
  const t = useSec();
  const bubble = (i: number, at: number, text: string) => {
    const p = seg(t, at, 0.35, E.back);
    return (
      <div key={i} style={{ alignSelf: "flex-start", maxWidth: 640, background: "#ffffff", color: "#1b1b1b", fontFamily: SANS, fontSize: 38, lineHeight: 1.25, padding: "22px 28px", borderRadius: "26px 26px 26px 8px", marginBottom: 16, opacity: p > 0 ? 1 : 0, scale: String(0.85 + 0.15 * p), transformOrigin: "left bottom" }}>{text}</div>
    );
  };
  return (
    <AbsoluteFill>
      <Photo src="penthouse.jpg" dim={0.45} zoom={[1.12, 1.02]} dur={4} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 150, fontFamily: SERIF, fontWeight: 460, fontSize: 118, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        Never send money to a <span style={{ color: C.gold2 }}>stranger</span> again.
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 820, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "#d8dde6", marginBottom: 18, opacity: seg(t, 0.2, 0.3) }}>Unknown number</div>
        {bubble(0, 0.35, "Luxury 2-bed Lekki, available now")}
        {bubble(1, 1.2, "Send deposit to confirm, I will send address after")}
        {bubble(2, 2.3, "Payment first pls")}
      </div>
      <div style={{ position: "absolute", left: 70, top: 1290, opacity: seg(t, 2.8, 0.3), scale: String(0.8 + 0.2 * seg(t, 2.8, 0.35, E.back)), transformOrigin: "left" }}>
        <Pill bg="#a8261c" fg="#fff" size={40}>Seen it before?</Pill>
      </div>
    </AbsoluteFill>
  );
};

/** Visited: the real room, with the listing photo on a phone matched against it. */
const Visited = () => {
  const t = useSec();
  const scan = seg(t, 0.5, 1.4, E.inOut);
  const match = seg(t, 1.9, 0.4, E.back);
  return (
    <AbsoluteFill>
      <Photo src="hero-sample-living.jpg" zoom={[1.08, 1.0]} dur={3.5} pos="55% 50%" />
      <AbsoluteFill style={{ background: C.deep, opacity: 0.25 }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 150, fontFamily: SERIF, fontWeight: 460, fontSize: 104, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        Visited before<br /><span style={{ color: C.gold2 }}>it goes live.</span>
      </div>
      <div style={{ position: "absolute", left: 300, top: 560, width: 480, height: 760, background: C.deep, borderRadius: 52, border: "5px solid #2a3b5a", padding: 18, translate: `0 ${(1 - seg(t, 0, 0.6, E.out)) * 900}px` }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 36, overflow: "hidden" }}>
          <Photo src="hero-sample-living.jpg" pos="55% 50%" zoom={[1.0, 1.0]} />
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: 6, background: C.gold2, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", opacity: match, scale: String(0.7 + 0.3 * match) }}>
            <Pill bg={C.paper} fg={C.ok} size={34}><Check size={34} /> Photos match</Pill>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FourChecks = () => {
  const t = useSec();
  const items = ["Who owns it", "Who's letting it", "The person behind it", "The photos, on-site"];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, overflow: "hidden" }}>
        <Photo src="bed-2.jpg" dim={0.35} zoom={[1.1, 1.0]} dur={4} />
      </div>
      <div style={{ position: "absolute", left: 80, top: 420, opacity: seg(t, 0.1, 0.3) }}><Pill bg={C.gold2} fg={C.ink} size={40}>Four checks. Every listing.</Pill></div>
      {items.map((s, i) => {
        const p = seg(t, 0.45 + i * 0.6, 0.4);
        return (
          <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 600 + i * 190, display: "flex", alignItems: "center", gap: 30, opacity: 0.2 + 0.8 * p, borderBottom: "2px solid #2a3b5a", paddingBottom: 34 }}>
            <div style={{ width: 92, height: 92, borderRadius: 46, background: p > 0.5 ? C.ok : "#1d2f52", display: "flex", alignItems: "center", justifyContent: "center", scale: String(0.7 + 0.3 * seg(t, 0.45 + i * 0.6, 0.4, E.back)) }}><Check size={54} color="#fff" p={p} /></div>
            <span style={{ fontFamily: SERIF, fontSize: 70, color: C.paper, letterSpacing: "-0.02em" }}>{s}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const PayLater = () => {
  const t = useSec();
  const acc = t > 1.6;
  const pp = seg(t, 0, 0.55, E.out);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 130, fontFamily: SERIF, fontWeight: 460, fontSize: 100, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.ink }}>
        Pay nothing until<br /><span style={{ color: C.gold }}>the host says yes.</span>
      </div>
      <div style={{ translate: `0 ${(1 - pp) * 900}px` }}>
        <Phone y={470} w={640} x={220} title="Your booking">
          <Card>
            <div style={{ fontFamily: SERIF, fontSize: 50, color: C.ink, marginBottom: 12 }}>Request sent</div>
            <Row k="Dates" v="3 nights" /><Row k="Guests" v="2" />
            <Row k="Charged now" v="₦0" strong color={C.ok} />
            <div style={{ marginTop: 26, padding: "24px 0", textAlign: "center", borderRadius: 12, background: acc ? C.ok : C.sand, color: acc ? "#fff" : C.muted, fontFamily: SANS, fontWeight: 700, fontSize: 36 }}>
              {acc ? "Host accepted · 48 hours to pay" : "Waiting for the host"}
            </div>
          </Card>
          <div style={{ marginTop: 22, fontFamily: SANS, fontSize: 26, color: C.muted, textAlign: "center" }}>Illustrative booking</div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

export const GuestPhotos: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.55 }, { at: 0.35, name: "notify", vol: 0.4 }, { at: 1.2, name: "notify", vol: 0.4 }, { at: 2.3, name: "notify", vol: 0.4 }, { at: 3.1, name: "thud", vol: 0.5 },
    { at: L[1].start - 0.35, name: "riser", vol: 0.3 }, { at: L[1].start - 0.08, name: "swoosh", vol: 0.45 }, { at: L[1].start + 2.0, name: "chime", vol: 0.35 },
    { at: L[2].start - 0.08, name: "swoosh", vol: 0.4 }, ...[0, 1, 2, 3].map((i) => ({ at: L[2].start + 0.55 + i * 0.6, name: "tap", vol: 0.45 })),
    { at: L[3].start - 0.08, name: "swoosh", vol: 0.4 }, { at: L[3].start + 1.6, name: "chime", vol: 0.4 },
    { at: L[4].start - 0.05, name: "impact", vol: 0.45 }, { at: L[4].start + 0.9, name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Stranger />, <Visited />, <FourChecks />, <PayLater />,
          <EndCard head={["Verified", "Lagos stays."]} sub="Every stay visited before it goes live. Pay nothing until the host says yes." cta="Find your stay" url="hamlet.rest" />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[4].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.45} />
    </AbsoluteFill>
  );
};
