import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { CaptionUntil } from "../videos/EmptyNights";
import { AppBar, Badge, Bleed, Btn, Checklist, Device, Fine, Heading, StepTrack, Tap, Thumb, Tick, pop, rise, typed } from "./ui";

const VID = "explainGuest";
const STEPS = ["Search", "Request", "Pay", "Arrive"];
const MAP = [0, 0, 0, 1, 2, 3, 3, 4, 4, 0];
const DARK = [true, true, true, false, true, false, false, true, true, true];

/* 0. Hook: the photo you're sent vs. what you might get: a coin flip. */
const Gamble = () => {
  const t = useSec();
  const flip = seg(t, 0.9, 0.6, E.inOut);
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Heading title="Booking in Lagos shouldn't feel like" accent="a gamble." top={150} size={100} at={0} />
      <div style={{ position: "absolute", left: 140, top: 620, width: 800, height: 620, perspective: 1600 }}>
        <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", rotate: `y ${flip * 180}deg` }}>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 26, overflow: "hidden" }}>
            <Thumb src="penthouse.jpg" h={620} r={26} />
            <div style={{ position: "absolute", left: 24, top: 24 }}><Badge bg="#fff" fg="#1b1b1b">The photo you were sent</Badge></div>
          </div>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", rotate: "y 180deg", borderRadius: 26, background: "#1d2533", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: SERIF, fontSize: 260, color: "#c4473b", lineHeight: 1 }}>?</div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.paper }}>What you might find</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 1. Verified: every home visited first. */
const Verified = () => {
  const t = useSec();
  return (
    <AbsoluteFill>
      <Bleed src="hero-sample-living.jpg" dim={0.6} zoom={[1.1, 1.0]} dur={8} />
      <Heading title="On HAMLET, every home is" accent="visited first." top={200} size={92} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 600 }}>
        <Checklist items={["Who owns it", "The photos are real", "The backup power"]} at={2.4} gap={1.2} size={60} />
      </div>
      <div style={{ position: "absolute", left: 80, top: 1180, ...pop(t, 6.2) }}><Badge size={36}>✓ Verified before it goes live</Badge></div>
    </AbsoluteFill>
  );
};

/* 2. Four steps at a glance. */
const Overview = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 80, top: 200, ...pop(t, 0.05) }}><Mark stem={C.paper} bar={C.gold2} size={100} /></div>
      <Heading title="Booking in" accent="four simple steps." top={350} size={96} at={0.1} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 720, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ background: i % 3 === 0 ? C.gold2 : C.paper, borderRadius: 28, padding: "40px 34px", ...pop(t, 0.6 + i * 0.3) }}>
            <div style={{ fontFamily: SERIF, fontSize: 90, color: C.ink, lineHeight: 1 }}>{i + 1}</div>
            <div style={{ marginTop: 16, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: C.ink }}>{s}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* 3. Step 1: search. */
const Search = () => {
  const t = useSec();
  const results = ["hero-sample-bedroom.jpg", "living-1.jpg"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 1" title="Search" accent="your way." top={210} size={88} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Find a stay" />
        {[["Where", "Lekki Phase 1", 0.2], ["When", "Dec 20 – Dec 27", 0.9], ["Guests", "2 adults", 1.6]].map(([k, v, at]) => (
          <div key={k as string} style={{ border: `3px solid ${C.line}`, borderRadius: 16, padding: "16px 22px", marginBottom: 14, display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 30 }}>
            <span style={{ color: C.muted, fontWeight: 600 }}>{k}</span><span style={{ color: C.ink, fontWeight: 700 }}>{typed(t, v as string, at as number, 26)}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, marginBottom: 18 }}><Btn label="Search verified stays" doneAt={2.5} done="Showing verified stays" size={30} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {results.map((r, i) => (
            <div key={r} style={{ position: "relative", ...pop(t, 2.8 + i * 0.25) }}>
              <Thumb src={r} h={190} />
              <div style={{ position: "absolute", left: 10, top: 10 }}><Badge size={20}>✓ Verified</Badge></div>
            </div>
          ))}
        </div>
      </Device>
      <Tap x={540} y={1100} at={2.5} />
      <Fine top={1500} dark={false}>Illustrative search</Fine>
    </AbsoluteFill>
  );
};

/* 4. Step 2: request: ₦0 now. */
const Request = () => {
  const t = useSec();
  const sent = t > 2.4;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 2" title="Send a request." accent="Pay nothing yet." top={210} size={84} />
      <Device y={470} enter={-1}>
        <div style={{ margin: "0 -34px" }}><Thumb src="hero-sample-bedroom.jpg" h={360} r={0} /></div>
        <div style={{ marginTop: 20, fontFamily: SERIF, fontSize: 46, color: C.ink }}>Calm 2-bed, Lekki Phase 1</div>
        <div style={{ marginTop: 10, marginBottom: 22 }}><Badge>✓ Verified</Badge></div>
        {!sent ? <Btn label="Send request" /> : (
          <div style={{ border: `3px solid ${C.ok}`, borderRadius: 16, padding: 24, ...pop(t, 2.4) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}><Tick p={seg(t, 2.45, 0.4)} size={64} /><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: C.ink }}>Request sent</span></div>
            <div style={{ marginTop: 14, fontFamily: SANS, fontSize: 32, color: C.muted }}>Charged now: <b style={{ color: C.ok }}>₦0</b></div>
          </div>
        )}
      </Device>
      <Tap x={540} y={1308} at={2.3} />
    </AbsoluteFill>
  );
};

/* 5. Step 3: host says yes, 48 hours, pay with Paystack. */
const Pay = () => {
  const t = useSec();
  const ring = seg(t, 1.6, 2.4, E.inOut);
  const paid = t > 5.6;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 3" title="The host says yes." accent="You pay safely." top={210} size={84} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <div style={{ background: C.ok, color: "#fff", borderRadius: 18, padding: "22px 26px", fontFamily: SANS, fontWeight: 700, fontSize: 32, ...pop(t, 0.6) }}>✓ The host accepted your request</div>
        <div style={{ display: "flex", alignItems: "center", gap: 30, margin: "36px 0" }}>
          <svg width={200} height={200} viewBox="0 0 230 230"><circle cx={115} cy={115} r={100} fill="none" stroke={C.line} strokeWidth={18} /><circle cx={115} cy={115} r={100} fill="none" stroke={C.gold} strokeWidth={18} strokeDasharray={628} strokeDashoffset={628 * (1 - ring)} transform="rotate(-90 115 115)" strokeLinecap="round" /><text x={115} y={128} textAnchor="middle" fontFamily="Newsreader" fontSize={70} fill={C.ink}>48h</text></svg>
          <div style={{ fontFamily: SANS, fontSize: 32, color: C.ink, lineHeight: 1.35, fontWeight: 600 }}>You have 48 hours to pay</div>
        </div>
        <div style={{ border: `3px solid ${C.line}`, borderRadius: 18, padding: 24, ...rise(t, 3.4) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.muted, marginBottom: 14 }}>Secure checkout · Paystack</div>
          <div style={{ fontFamily: SANS, fontSize: 30, color: C.ink, marginBottom: 18 }}>•••• •••• •••• 4242</div>
          <Btn label="Pay now" doneAt={5.6} done="Payment verified" size={30} />
        </div>
        {paid && <div style={{ marginTop: 22, ...pop(t, 5.9) }}><Badge bg={C.gold2} fg={C.ink} size={30}>Stay confirmed</Badge></div>}
      </Device>
      <Tap x={540} y={1420} at={5.6} />
      <Fine top={1500} dark={false}>Card details are handled by Paystack and never stored on HAMLET.</Fine>
    </AbsoluteFill>
  );
};

/* 6. No surprises: every line shown before you request. */
const Price = () => {
  const t = useSec();
  const rows = [["Nightly price", "Includes our fee", 0.6], ["Cleaning", "Its own line", 1.8], ["Caution deposit", "Refundable", 3.0], ["Added at checkout", "Nothing", 4.4]] as const;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="The price you see." accent="No surprises." top={200} size={96} dark={false} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 560, background: "#fff", borderRadius: 26, padding: "20px 40px", border: `3px solid ${C.line}` }}>
        {rows.map(([k, v, at], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "34px 0", borderBottom: i < 3 ? `2px solid ${C.line}` : "none", ...rise(t, at) }}>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: C.ink }}>{k}</span>
            <Badge bg={i === 3 ? C.ok : C.sand} fg={i === 3 ? "#fff" : C.ink} size={30}>{v}</Badge>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1330, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 38, color: C.ink, ...rise(t, 5.4) }}>All shown before you send a request.</div>
    </AbsoluteFill>
  );
};

/* 7. Step 4: arrival guide unlocks. */
const Arrive = () => {
  const t = useSec();
  const open = t > 2.0;
  const route = seg(t, 2.6, 2.4, E.inOut);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 4" title="Your arrival guide" accent="unlocks." top={210} size={84} />
      <Device y={470} enter={-1}>
        <AppBar title="Arrival guide" />
        <Badge bg={open ? C.ok : C.ink}>{open ? "Unlocked · stay confirmed" : "Locked until confirmed"}</Badge>
        <div style={{ marginTop: 24, borderRadius: 18, overflow: "hidden", background: "#e7e2d4", height: 380, position: "relative" }}>
          <svg width="100%" height="100%" viewBox="0 0 520 380">
            <path d="M0 300 L520 260 M60 0 L140 380 M300 0 L260 380 M0 120 L520 160" stroke="#fff" strokeWidth={22} />
            <path d="M60 340 C 160 300, 200 200, 270 170 S 400 110, 440 80" fill="none" stroke={C.gold} strokeWidth={10} strokeLinecap="round" strokeDasharray={600} strokeDashoffset={600 * (1 - route)} opacity={open ? 1 : 0} />
            <circle cx={440} cy={80} r={18} fill={C.ink} opacity={open ? 1 : 0.2} />
          </svg>
          {!open && <div style={{ position: "absolute", inset: 0, background: "rgba(14,31,59,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 34, color: "#fff" }}>Hidden until confirmed</div>}
        </div>
        {[["Exact address", 0.0], ["Directions", 0.3], ["Gate code", 0.6]].map(([k, d]) => (
          <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "18px 0", borderBottom: `2px solid ${C.line}`, fontFamily: SANS, fontSize: 30 }}>
            <span style={{ color: C.muted, fontWeight: 600 }}>{k}</span>
            <span style={{ width: 200, height: 30, borderRadius: 8, background: open ? C.gold2 : C.ink, opacity: open ? seg(t, 2.2 + (d as number), 0.3) * 0.7 + 0.3 : 0.85 }} />
          </div>
        ))}
      </Device>
    </AbsoluteFill>
  );
};

/* 8. Booking from abroad + Horatio. */
const Abroad = () => {
  const t = useSec();
  const cur = t < 1.4 ? 0 : t < 2.4 ? 1 : 2;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="From abroad?" accent="See £ or $." top={200} size={96} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 470, display: "flex", gap: 20 }}>
        {["NGN ₦", "GBP £", "USD $"].map((c, i) => <div key={c} style={{ flex: 1, ...pop(t, 0.3 + i * 0.15) }}><div style={{ textAlign: "center", padding: "34px 0", borderRadius: 22, background: i === cur ? C.gold2 : "rgba(255,255,255,0.08)", fontFamily: SANS, fontWeight: 700, fontSize: 44, color: i === cur ? C.ink : C.paper }}>{c}</div></div>)}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 720, background: C.paper, borderRadius: 30, padding: 34, ...rise(t, 3.4) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}><Mark stem={C.ink} bar={C.gold} size={48} /><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: C.ink }}>Ask Horatio</span></div>
        <div style={{ marginLeft: "auto", maxWidth: 560, background: C.ink, color: C.paper, fontFamily: SANS, fontSize: 32, padding: "18px 24px", borderRadius: "22px 22px 6px 22px", marginBottom: 16 }}>{typed(t, "Which area is close to the airport?", 3.8, 26)}</div>
        <div style={{ maxWidth: 600, background: C.sand, color: C.ink, fontFamily: SANS, fontSize: 32, lineHeight: 1.35, padding: "18px 24px", borderRadius: "22px 22px 22px 6px", opacity: seg(t, 5.6, 0.3) }}>Ikeja GRA is a short drive from the airport. Want me to show verified stays there?</div>
      </div>
      <Fine top={1470}>Prices in USD or GBP are a guide; you're charged in naira. Illustrative conversation.</Fine>
    </AbsoluteFill>
  );
};

export const GuestExplainer: React.FC = () => {
  const L = lines(VID);
  const at = (i: number, d = 0) => L[i].start - 0.12 + d;
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.35 }, { at: 0.9, name: "swoosh", vol: 0.4 }, { at: 1.5, name: "thud", vol: 0.35 },
    { at: at(1), name: "swoosh", vol: 0.3 }, ...[0, 1, 2].map((i) => ({ at: at(1, 2.4 + i * 1.2), name: "tap", vol: 0.35 })), { at: at(1, 6.2), name: "chime", vol: 0.3 },
    ...[0, 1, 2, 3].map((i) => ({ at: at(2, 0.6 + i * 0.3), name: "pop", vol: 0.25 })),
    { at: at(3), name: "swoosh", vol: 0.3 }, { at: at(3, 2.5), name: "tap", vol: 0.45 }, { at: at(3, 2.8), name: "pop", vol: 0.25 },
    { at: at(4), name: "swoosh", vol: 0.3 }, { at: at(4, 2.3), name: "tap", vol: 0.5 }, { at: at(4, 2.45), name: "chime", vol: 0.3 },
    { at: at(5, 0.6), name: "notify", vol: 0.35 }, { at: at(5, 5.6), name: "tap", vol: 0.5 }, { at: at(5, 5.9), name: "chime", vol: 0.35 },
    ...[0.6, 1.8, 3.0, 4.4].map((d) => ({ at: at(6, d), name: "pop", vol: 0.22 })),
    { at: at(7), name: "swoosh", vol: 0.3 }, { at: at(7, 2.0), name: "lock", vol: 0.45 },
    { at: at(8, 1.4), name: "tap", vol: 0.3 }, { at: at(8, 2.4), name: "tap", vol: 0.3 }, { at: at(8, 5.6), name: "notify", vol: 0.3 },
    { at: at(9), name: "impact", vol: 0.4 }, { at: at(9, 0.9), name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Gamble />, <Verified />, <Overview />, <Search />, <Request />, <Pay />, <Price />, <Arrive />, <Abroad />,
          <EndCard head={["Verified stays.", "Simple booking."]} sub="Request first. Pay once the host says yes. Your arrival guide unlocks when it's confirmed." cta="Find your stay" url="hamlet.rest" />]}
      </Beats>
      <StepTrack vid={VID} map={MAP} labels={STEPS} dark={DARK} />
      <CaptionUntil vid={VID} until={L[9].start - 0.12} top={1545} size={50} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.32} />
    </AbsoluteFill>
  );
};
