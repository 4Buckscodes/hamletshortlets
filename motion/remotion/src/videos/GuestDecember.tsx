import React from "react";
import { AbsoluteFill } from "remotion";
import { C, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, Card, Check, EndCard, Phone, Photo, Pill, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "./EmptyNights";

const VID = "guestDecember";
const FLAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Split-flap departure board: each character flips through letters before it settles. */
const Flap: React.FC<{ text: string; at: number; size?: number; color?: string }> = ({ text, at, size = 92, color = "#f2c94c" }) => {
  const t = useSec();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {text.split("").map((ch, i) => {
        const settle = at + i * 0.05 + 0.35;
        const k = Math.floor(t * 30 + i * 7);
        const shown = ch === " " ? " " : t >= settle ? ch : FLAP[(k * 13 + i * 5) % FLAP.length];
        return (
          <div key={i} style={{ width: size * 0.72, height: size * 1.2, background: "#111", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 700, fontSize: size, color, position: "relative", opacity: ch === " " ? 0 : 1 }}>
            {shown}
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 3, background: "#000" }} />
          </div>
        );
      })}
    </div>
  );
};

const Board = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 150, fontFamily: SERIF, fontWeight: 460, fontSize: 150, lineHeight: 0.96, letterSpacing: "-0.035em", color: C.paper }}>
        Home for <span style={{ color: C.gold2 }}>December?</span>
      </div>
      <div style={{ position: "absolute", left: 70, top: 640, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: "#888", letterSpacing: "0.12em" }}>DEPARTURES</div>
      <div style={{ position: "absolute", left: 70, top: 700, display: "flex", flexDirection: "column", gap: 22 }}>
        <Flap text="LONDON" at={0} size={84} color="#bbb" />
        <Flap text="LAGOS" at={0.25} size={112} />
        <div style={{ display: "flex", gap: 40, marginTop: 10 }}>
          <Flap text="DEC" at={0.5} size={64} color="#bbb" />
          <Flap text="ON TIME" at={0.65} size={64} color="#7bd389" />
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, top: 1330, opacity: seg(t, 1.0, 0.3) }}><Pill bg={C.gold2} fg={C.ink} size={38}>Your stay, sorted before you land</Pill></div>
    </AbsoluteFill>
  );
};

const Currency = () => {
  const t = useSec();
  const cur = t < 1.7 ? 0 : t < 2.7 ? 1 : 2;
  const opts = ["GBP £", "USD $", "NGN ₦"];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 130, fontFamily: SERIF, fontWeight: 460, fontSize: 100, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        Book before you land.<br /><span style={{ color: C.gold2 }}>In pounds or dollars.</span>
      </div>
      <Phone y={500} x={220} w={640} title="Lagos stays">
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {opts.map((o, i) => <Pill key={o} bg={i === cur ? C.ink : C.sand} fg={i === cur ? C.paper : C.muted} size={28}>{o}</Pill>)}
        </div>
        <div style={{ height: 330, borderRadius: 14, overflow: "hidden", position: "relative" }}>
          <Photo src="living-1.jpg" zoom={[1.05, 1.0]} />
          <div style={{ position: "absolute", left: 16, top: 16 }}><Pill bg={C.paper} fg={C.ok} size={26}><Check size={26} /> Verified</Pill></div>
        </div>
        <div style={{ marginTop: 20, fontFamily: SERIF, fontSize: 44, color: C.ink }}>Verified stay, Lagos</div>
        <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 32, color: C.muted }}>Price shown in <b style={{ color: C.ink }}>{opts[cur].split(" ")[0]}</b></div>
      </Phone>
      <div style={{ position: "absolute", left: 80, right: 80, top: 375, fontFamily: SANS, fontSize: 28, color: "rgba(236,233,225,0.75)" }}>Prices in USD/GBP are a guide; you're charged in naira.</div>
    </AbsoluteFill>
  );
};

const Gallery = () => {
  const t = useSec();
  const shots = ["hero-sample-bedroom.jpg", "hero-sample-lounge.jpg", "pool-1.jpg"];
  const idx = Math.min(2, Math.floor(t / 1.35));
  const local = t - idx * 1.35;
  return (
    <AbsoluteFill>
      <Photo key={idx} src={shots[idx]} zoom={[1.14, 1.04]} dur={1.6} style={{ opacity: seg(local, 0, 0.2) }} />
      <AbsoluteFill style={{ background: C.deep, opacity: 0.2 }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 150, fontFamily: SERIF, fontWeight: 460, fontSize: 108, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        What you see<br /><span style={{ color: C.gold2 }}>is what you get.</span>
      </div>
      <div style={{ position: "absolute", left: 70, top: 1300, opacity: seg(local, 0.2, 0.25), scale: String(0.8 + 0.2 * seg(local, 0.2, 0.3, E.back)), transformOrigin: "left" }}>
        <Pill bg={C.paper} fg={C.ok} size={40}><Check size={38} /> Visited and verified</Pill>
      </div>
    </AbsoluteFill>
  );
};

const RequestPay = () => {
  const t = useSec();
  const step = t < 1.0 ? 0 : t < 2.0 ? 1 : 2;
  const steps = ["Request sent", "Host says yes", "Pay within 48 hours"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 130, fontFamily: SERIF, fontWeight: 460, fontSize: 100, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.ink }}>
        Request first.<br /><span style={{ color: C.gold }}>Pay once it's a yes.</span>
      </div>
      {steps.map((s, i) => {
        const p = seg(t, 0.1 + i * 1.0, 0.35, E.back);
        return (
          <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 560 + i * 230, opacity: seg(t, 0.1 + i * 1.0, 0.2), translate: `${(1 - p) * -60}px 0` }}>
            <Card style={{ display: "flex", alignItems: "center", gap: 28, background: i <= step ? C.surface : C.sand }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: i === 2 ? C.gold : C.ok, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={48} color="#fff" p={p} /></div>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: C.ink }}>{s}</span>
            </Card>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 80, top: 1270, fontFamily: SANS, fontWeight: 600, fontSize: 38, color: C.muted, opacity: seg(t, 0.4, 0.3) }}>Nothing is charged when you request.</div>
    </AbsoluteFill>
  );
};

const Arrival = () => {
  const t = useSec();
  const unlock = seg(t, 1.6, 0.5, E.back);
  return (
    <AbsoluteFill>
      <Photo src="hamlet-lagos-hero-1280.jpg" dim={0.62} zoom={[1.12, 1.0]} dur={5.5} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 130, fontFamily: SERIF, fontWeight: 460, fontSize: 92, lineHeight: 1.0, letterSpacing: "-0.03em", color: C.paper }}>
        Land late.<br /><span style={{ color: C.gold2 }}>Know where to go.</span>
      </div>
      <Phone y={560} x={220} w={640} title="Arrival guide">
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <Pill bg={unlock > 0.5 ? C.ok : C.sand} fg={unlock > 0.5 ? "#fff" : C.muted} size={28}>{unlock > 0.5 ? "Unlocked" : "Locked until confirmed"}</Pill>
          </div>
          {[["Exact address", 430], ["Directions", 360], ["Gate code", 220]].map(([k, w], i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.muted, marginBottom: 8 }}>{k}</div>
              <div style={{ width: w as number, height: 38, borderRadius: 8, background: unlock > 0.5 ? C.gold2 : C.ink, opacity: unlock > 0.5 ? 0.55 : 0.85 }} />
            </div>
          ))}
        </Card>
        <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 26, color: C.muted, textAlign: "center" }}>Illustrative screen</div>
      </Phone>
    </AbsoluteFill>
  );
};

export const GuestDecember: React.FC = () => {
  const L = lines(VID);
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.5 }, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ at: 0.05 + i * 0.09, name: "tap", vol: 0.25 })), { at: 1.0, name: "chime", vol: 0.3 },
    { at: L[1].start - 0.08, name: "swoosh", vol: 0.45 }, { at: L[1].start + 1.6, name: "tap", vol: 0.45 }, { at: L[1].start + 2.6, name: "tap", vol: 0.45 },
    { at: L[2].start - 0.08, name: "swoosh", vol: 0.4 }, { at: L[2].start + 1.35, name: "swoosh", vol: 0.25 }, { at: L[2].start + 2.7, name: "swoosh", vol: 0.25 },
    { at: L[3].start - 0.08, name: "swoosh", vol: 0.4 }, ...[0, 1, 2].map((i) => ({ at: L[3].start + 0.1 + i * 1.0, name: "pop", vol: 0.35 })),
    { at: L[4].start - 0.35, name: "riser", vol: 0.3 }, { at: L[4].start - 0.08, name: "swoosh", vol: 0.4 }, { at: L[4].start + 1.6, name: "lock", vol: 0.55 }, { at: L[4].start + 1.75, name: "chime", vol: 0.35 },
    { at: L[5].start - 0.05, name: "impact", vol: 0.45 }, { at: L[5].start + 0.9, name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Board />, <Currency />, <Gallery />, <RequestPay />, <Arrival />,
          <EndCard head={["Lagos is", "waiting."]} sub="Verified stays, prices in pounds or dollars, and nothing to pay until the host says yes." cta="Find your stay" url="hamlet.rest" />]}
      </Beats>
      <CaptionUntil vid={VID} until={L[5].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.45} />
    </AbsoluteFill>
  );
};
