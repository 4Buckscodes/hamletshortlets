import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { Captions } from "../kit/captions";
import { AppBar, Badge, Bleed, Btn, Checklist, Chip, Device, Field, Fine, Heading, StepTrack, Tap, Thumb, Tick, pop, rise } from "./ui";

const VID = "explainOwner";
const STEPS = ["Join", "Add your place", "We check it", "Say yes"];
const MAP = [0, 0, 1, 2, 3, 3, 4, 4, 4, 4, 4, 0];
const DARK = [true, true, true, false, true, false, true, false, false, true, false, true];

/* 0. Hook: an empty home at night, the week's calendar sitting empty. */
const Hook = () => {
  const t = useSec();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <AbsoluteFill>
      <Bleed src="hero-sample-living.jpg" dim={0.55} zoom={[1.12, 1.02]} dur={3.2} />
      <Heading title="Empty nights" accent="again?" size={140} top={230} at={0} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 900, display: "flex", gap: 12 }}>
        {days.map((d, i) => (
          <div key={d} style={{ flex: 1, borderRadius: 14, background: "rgba(244,243,239,0.94)", padding: "18px 0", textAlign: "center", ...pop(t, 0.2 + i * 0.12) }}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.muted }}>{d}</div>
            <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 22, color: "#a8261c" }}>Empty</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* 1. The whole idea in four steps, like a map before the trip. */
const Overview = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 80, top: 200, ...pop(t, 0.05) }}><Mark stem={C.paper} bar={C.gold2} size={110} /></div>
      <Heading title="Fill empty nights with" accent="verified guests." top={360} size={96} at={0.15} />
      {STEPS.map((s, i) => (
        <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 700 + i * 175, display: "flex", alignItems: "center", gap: 30, ...rise(t, 1.6 + i * 0.45) }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: C.gold2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 68, color: C.ink }}>{i + 1}</div>
          <div style={{ fontFamily: SERIF, fontSize: 66, color: C.paper, letterSpacing: "-0.02em" }}>{s}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* 2. Step 1: sign up as a partner. */
const Join = () => {
  const t = useSec();
  const ready = t > 2.6;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 1" title="Join as a" accent="partner." top={210} size={88} />
      <Device y={470} enter={-1}>
        {!ready ? (
          <>
            <AppBar title="Partner with HAMLET" />
            <Field label="Your name" value="Ada, Lekki" at={0.4} />
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 12 }}>I am a</div>
            <div style={{ marginBottom: 26 }}><Chip label="Property owner" on={t > 1.5} /><Chip label="Property manager" /><Chip label="Closing agent" /></div>
            <Btn label="Create my account" doneAt={2.2} done="Created" />
          </>
        ) : (
          <div style={{ paddingTop: 120, textAlign: "center", ...pop(t, 2.6) }}>
            <div style={{ display: "flex", justifyContent: "center" }}><Tick p={seg(t, 2.65, 0.4)} size={150} /></div>
            <div style={{ marginTop: 40, fontFamily: SERIF, fontSize: 60, color: C.ink }}>Your workspace is ready</div>
            <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 32, color: C.muted }}>Properties · Bookings · Earnings</div>
          </div>
        )}
      </Device>
      <Tap x={420} y={1062} at={1.5} />
      <Tap x={540} y={1210} at={2.2} />
    </AbsoluteFill>
  );
};

/* 3. Step 2: add your place: photos, description, price. */
const AddPlace = () => {
  const t = useSec();
  const photos = ["hero-sample-living.jpg", "hero-sample-bedroom.jpg", "hero-sample-kitchen.jpg", "bath-1.jpg"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 2" title="Add" accent="your place." top={210} size={88} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Add a property" />
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 12 }}>Photos</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {photos.map((p, i) => <div key={p} style={pop(t, 0.3 + i * 0.35)}><Thumb src={p} h={150} /></div>)}
        </div>
        <Field label="Describe it" value="Bright 2-bed with a balcony" at={1.8} cps={26} />
        <Field label="Price per night" value="₦ 120,000" at={3.2} cps={14} />
      </Device>
      <Fine top={1490} dark={false}>Illustrative example</Fine>
    </AbsoluteFill>
  );
};

/* 4. Step 3: we check it, on site. */
const Check = () => {
  return (
    <AbsoluteFill>
      <Bleed src="exterior-1.jpg" dim={0.62} zoom={[1.12, 1.0]} dur={6.5} />
      <Heading kicker="Step 3" title="We" accent="check it." top={210} size={88} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 520 }}>
        <Checklist items={["Who owns it", "Who's allowed to let it", "The person behind the listing", "A visit: the photos are real"]} at={0.6} gap={0.95} size={54} />
      </div>
    </AbsoluteFill>
  );
};

/* 5. Live. */
const Live = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="Then it" accent="goes live." top={200} size={96} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Your listing" />
        <div style={{ position: "relative" }}>
          <Thumb src="hero-sample-living.jpg" h={430} r={18} />
          <div style={{ position: "absolute", left: 18, top: 18, ...pop(t, 0.5) }}><Badge>✓ Verified</Badge></div>
        </div>
        <div style={{ marginTop: 24, fontFamily: SERIF, fontSize: 48, color: C.ink }}>Bright 2-bed with a balcony</div>
        <div style={{ marginTop: 20, ...pop(t, 0.9) }}><Badge bg={C.gold2} fg={C.ink} size={32}>● Live for guests</Badge></div>
      </Device>
    </AbsoluteFill>
  );
};

/* 6. Step 4: requests: you choose. */
const Requests = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 4" title="Guests ask." accent="You choose." top={210} size={88} />
      <Device y={470} enter={-1}>
        <AppBar title="Requests" />
        <div style={{ border: `3px solid ${C.line}`, borderRadius: 18, padding: 28, ...pop(t, 0.3) }}>
          <div style={{ fontFamily: SERIF, fontSize: 46, color: C.ink }}>New request</div>
          {[["Dates", "Fri – Sun, 2 nights"], ["Guests", "2 adults"], ["Note", "Visiting family"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 30, padding: "14px 0", color: C.muted }}><span>{k}</span><span style={{ color: C.ink, fontWeight: 600 }}>{v}</span></div>
          ))}
          <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
            <div style={{ flex: 1, opacity: t > 3.6 ? 0.35 : 1 }}><Btn label="Decline" tone="ghost" size={30} /></div>
            <div style={{ flex: 1.3 }}><Btn label="Accept" doneAt={3.6} done="Accepted" size={30} /></div>
          </div>
        </div>
        <div style={{ marginTop: 30, fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.ink, ...rise(t, 1.0) }}>Nothing is booked without your yes.</div>
      </Device>
      <Tap x={640} y={1205} at={3.6} />
      <Fine top={1500}>Illustrative request</Fine>
    </AbsoluteFill>
  );
};

/* 7. Payment: 48 hours, verified, confirmed. */
const Payment = () => {
  const t = useSec();
  const steps = [["You accept", 0.3], ["Guest pays within 48 hours", 1.6], ["Payment verified", 3.6], ["Booking confirmed", 4.8]] as const;
  const ring = seg(t, 1.6, 2.0, E.inOut);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="Paid first." accent="Then confirmed." top={200} size={96} dark={false} />
      <div style={{ position: "absolute", right: 90, top: 470, width: 230, height: 230 }}>
        <svg width={230} height={230} viewBox="0 0 230 230"><circle cx={115} cy={115} r={100} fill="none" stroke={C.line} strokeWidth={16} /><circle cx={115} cy={115} r={100} fill="none" stroke={C.gold} strokeWidth={16} strokeDasharray={628} strokeDashoffset={628 * (1 - ring)} transform="rotate(-90 115 115)" strokeLinecap="round" /></svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: SERIF, color: C.ink }}><span style={{ fontSize: 76, lineHeight: 1 }}>48</span><span style={{ fontFamily: SANS, fontSize: 24, color: C.muted }}>hours</span></div>
      </div>
      {steps.map(([s, at], i) => (
        <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 760 + i * 170, display: "flex", alignItems: "center", gap: 28, ...rise(t, at) }}>
          <Tick p={seg(t, at + 0.1, 0.4)} size={84} color={i === 3 ? C.gold : C.ok} />
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 50, color: C.ink }}>{s}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* 8. The fee: on top, never out of your rate. Blocks a child could read. */
const Fee = () => {
  const t = useSec();
  const add = seg(t, 1.2, 0.6, E.back);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="Your rate" accent="stays yours." top={200} size={100} dark={false} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 560, display: "flex", flexDirection: "column-reverse", alignItems: "stretch" }}>
        <div style={{ height: 520, borderRadius: 24, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 64, color: C.paper, ...pop(t, 0.2) }}>Your price</div>
        <div style={{ height: 180 * add, overflow: "hidden", borderRadius: 24, background: C.gold2, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.ink }}>+ service fee</div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1330, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.ink, ...rise(t, 2.2) }}>The guest pays both. You keep your price.</div>
    </AbsoluteFill>
  );
};

/* 9. Privacy and protection. */
const Protect = () => {
  const t = useSec();
  const unlocked = t > 2.6;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Your address" accent="stays private." top={200} size={92} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 480, background: C.paper, borderRadius: 22, padding: 36, ...pop(t, 0.2) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.muted }}>Exact address</span>
          <Badge bg={unlocked ? C.ok : C.ink}>{unlocked ? "Shared after payment" : "Hidden until paid"}</Badge>
        </div>
        {[620, 460].map((w, i) => <div key={i} style={{ width: w, height: 44, borderRadius: 10, background: unlocked ? C.gold2 : C.ink, opacity: unlocked ? 0.6 : 0.85, marginBottom: 16 }} />)}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 920, display: "flex", alignItems: "center", gap: 34, ...rise(t, 3.8) }}>
        <svg width={170} height={196} viewBox="0 0 130 150"><path d="M65 8 L118 28 V72 C118 108 94 132 65 144 C36 132 12 108 12 72 V28Z" fill={C.gold2} /><path d="M40 76 L58 94 L92 56" stroke={C.ink} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ fontFamily: SERIF, fontSize: 64, color: C.paper, lineHeight: 1.05 }}>A refundable<br />caution deposit<br /><span style={{ color: C.gold2 }}>protects your home.</span></div>
      </div>
    </AbsoluteFill>
  );
};

/* 10. Bookings and earnings in one place. */
const Earnings = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="Everything in" accent="one place." top={200} size={96} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Your workspace" />
        <div style={{ marginBottom: 22 }}><Chip label="Bookings" on={t < 2.4} /><Chip label="Earnings" on={t >= 2.4} /><Chip label="Calendar" /></div>
        {t < 2.4 ? (
          [["Fri – Sun", "Confirmed"], ["Next week", "Awaiting payment"], ["Dec 20 – 27", "New request"]].map(([d, s], i) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0", borderBottom: `2px solid ${C.line}`, ...rise(t, 0.2 + i * 0.25) }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, color: C.ink }}>{d}</span>
              <Badge bg={i === 0 ? C.ok : i === 1 ? C.gold2 : C.sand} fg={i === 0 ? "#fff" : C.ink} size={24}>{s}</Badge>
            </div>
          ))
        ) : (
          <div style={pop(t, 2.4)}>
            <div style={{ fontFamily: SANS, fontSize: 28, color: C.muted }}>Earnings</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 300, marginTop: 20 }}>
              {[0.4, 0.55, 0.5, 0.8, 0.95].map((h, i) => <div key={i} style={{ flex: 1, height: `${h * 100 * seg(t, 2.5 + i * 0.1, 0.4)}%`, background: i === 4 ? C.gold : C.ink, borderRadius: 10 }} />)}
            </div>
            <div style={{ marginTop: 30 }}><Badge>✓ Identity verified before first payout</Badge></div>
          </div>
        )}
      </Device>
      <Fine top={1490} dark={false}>Illustrative screens</Fine>
    </AbsoluteFill>
  );
};

export const OwnerExplainer: React.FC = () => {
  const L = lines(VID);
  const at = (i: number, d = 0) => L[i].start - 0.12 + d;
  const sfx: Sfx[] = [
    { at: 0.0, name: "impact", vol: 0.4 }, ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: 0.2 + i * 0.12, name: "tap", vol: 0.18 })),
    { at: at(1), name: "swoosh", vol: 0.35 }, ...[0, 1, 2, 3].map((i) => ({ at: at(1, 1.6 + i * 0.45), name: "pop", vol: 0.25 })),
    { at: at(2), name: "swoosh", vol: 0.3 }, { at: at(2, 1.5), name: "tap", vol: 0.45 }, { at: at(2, 2.2), name: "tap", vol: 0.45 }, { at: at(2, 2.65), name: "chime", vol: 0.3 },
    { at: at(3), name: "swoosh", vol: 0.3 }, ...[0, 1, 2, 3].map((i) => ({ at: at(3, 0.3 + i * 0.35), name: "pop", vol: 0.22 })),
    { at: at(4), name: "swoosh", vol: 0.3 }, ...[0, 1, 2, 3].map((i) => ({ at: at(4, 0.7 + i * 0.95), name: "tap", vol: 0.35 })),
    { at: at(5, 0.5), name: "chime", vol: 0.35 },
    { at: at(6), name: "notify", vol: 0.35 }, { at: at(6, 3.6), name: "tap", vol: 0.5 },
    ...[0.3, 1.6, 3.6].map((d) => ({ at: at(7, d + 0.1), name: "pop", vol: 0.25 })), { at: at(7, 4.9), name: "chime", vol: 0.35 },
    { at: at(8, 1.2), name: "land", vol: 0.4 },
    { at: at(9, 2.6), name: "lock", vol: 0.45 }, { at: at(9, 3.8), name: "swoosh", vol: 0.25 },
    { at: at(10, 2.4), name: "tap", vol: 0.4 },
    { at: at(11), name: "impact", vol: 0.4 }, { at: at(11, 0.9), name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Hook />, <Overview />, <Join />, <AddPlace />, <Check />, <Live />, <Requests />, <Payment />, <Fee />, <Protect />, <Earnings />,
          <EndCard head={["Your home.", "Your rules."]} sub="Verified guests, on your terms. Join as a partner today." cta="List your property" url="hamlet.rest/partners/apply" />]}
      </Beats>
      <StepTrack vid={VID} map={MAP} labels={STEPS} dark={DARK} />
      <Captions vid={VID} until={L[11].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.32} />
    </AbsoluteFill>
  );
};
