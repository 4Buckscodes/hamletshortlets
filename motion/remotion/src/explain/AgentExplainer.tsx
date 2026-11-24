import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { Captions } from "../kit/captions";
import { AppBar, Badge, Bleed, Btn, Chip, Device, Field, Fine, Heading, StepTrack, Tap, Thumb, Tick, pop, rise } from "./ui";

const VID = "explainAgent";
const STEPS = ["Join", "Share", "Client books", "Get paid"];
const MAP = [0, 0, 0, 1, 2, 2, 2, 3, 4, 4, 0];
const DARK = [true, true, true, true, false, true, true, false, true, true, true];
const FINE = "Commission applies to completed, non-refunded bookings attributed to you under HAMLET's partner rules. Estimates are not guaranteed payouts.";

/* Chat bubble in a generic messaging thread. */
const Bubble: React.FC<{ me?: boolean; children: React.ReactNode; style?: React.CSSProperties }> = ({ me, children, style }) => (
  <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 720, background: me ? "#d9fdd3" : "#fff", color: "#1b1b1b", fontFamily: SANS, fontSize: 36, lineHeight: 1.3, padding: "20px 26px", borderRadius: me ? "26px 26px 6px 26px" : "26px 26px 26px 6px", boxShadow: "0 6px 18px rgba(0,0,0,0.18)", marginBottom: 16, ...style }}>{children}</div>
);

/* 0. Hook: clients asking an agent for places. */
const Hook = () => {
  const t = useSec();
  const msgs = ["Do you have a 2-bed in Lekki for Friday?", "Need somewhere near VI for 3 nights", "Is it verified? I got scammed last time"];
  return (
    <AbsoluteFill style={{ background: "#0b1426" }}>
      <Heading title="You're an agent." accent="Clients ask you first." top={150} size={100} at={0} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 620, display: "flex", flexDirection: "column" }}>
        {msgs.map((m, i) => <Bubble key={m} style={pop(t, 0.2 + i * 0.7)}>{m}</Bubble>)}
      </div>
    </AbsoluteFill>
  );
};

/* 1. The promise: the stays you close can earn a commission. */
const Promise = () => {
  const t = useSec();
  return (
    <AbsoluteFill>
      <Bleed src="penthouse.jpg" dim={0.55} zoom={[1.1, 1.0]} dur={4} />
      <Heading title="The stays you close can" accent="earn you a commission." top={200} size={96} />
      <div style={{ position: "absolute", left: 80, top: 760, ...pop(t, 1.4) }}><Badge bg={C.gold2} fg={C.ink} size={42}>On HAMLET</Badge></div>
      <Fine top={1440}>{FINE}</Fine>
    </AbsoluteFill>
  );
};

/* 2. Four steps. */
const Overview = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 80, top: 200, ...pop(t, 0.05) }}><Mark stem={C.paper} bar={C.gold2} size={100} /></div>
      <Heading title="Four" accent="simple steps." top={350} size={110} at={0.1} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 650, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ background: i % 3 === 0 ? C.gold2 : C.paper, borderRadius: 28, padding: "40px 34px", ...pop(t, 0.4 + i * 0.3) }}>
            <div style={{ fontFamily: SERIF, fontSize: 90, color: C.ink, lineHeight: 1 }}>{i + 1}</div>
            <div style={{ marginTop: 16, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: C.ink }}>{s}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* 3. Step 1: join as a closing agent. */
const Join = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 1" title="Join as a" accent="closing agent." top={210} size={88} />
      <Device y={470} enter={-1}>
        <AppBar title="Partner with HAMLET" />
        <Field label="Your name" value="Tunde, Lagos Stays" at={0.3} />
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 12 }}>I am a</div>
        <div style={{ marginBottom: 26 }}><Chip label="Property owner" /><Chip label="Property manager" /><Chip label="Closing agent" on={t > 1.9} /></div>
        <Btn label="Create my account" doneAt={3.0} done="Workspace ready" />
      </Device>
      <Tap x={745} y={1140} at={1.9} />
      <Tap x={540} y={1290} at={3.0} />
      <Fine top={1500}>Illustrative name</Fine>
    </AbsoluteFill>
  );
};

/* 4. Step 2: Share & Studio, shareable approved stays. */
const Studio = () => {
  const t = useSec();
  const stays = [["hero-sample-living.jpg", "Lekki Phase 1 · 2-bed"], ["penthouse.jpg", "Ikoyi · 3-bed"], ["studio-1.jpg", "Yaba · studio"]];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 2" title="Pick verified stays" accent="to share." top={210} size={86} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="HAMLET Share Engine" />
        <div style={{ border: `3px solid ${C.line}`, borderRadius: 14, padding: "14px 20px", fontFamily: SANS, fontSize: 28, color: "#9aa1ad", marginBottom: 18 }}>Search stays or areas…</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.muted, marginBottom: 10 }}>Shareable approved properties</div>
        {stays.map(([img, name], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderBottom: `2px solid ${C.line}`, ...rise(t, 0.6 + i * 0.35) }}>
            <Thumb src={img} h={110} style={{ width: 150 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink }}>{name}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}><Badge size={20}>✓ Verified</Badge><Badge bg={C.sand} fg={C.ink} size={20}>Network sharing: Open</Badge></div>
            </div>
          </div>
        ))}
      </Device>
      <Fine top={1500} dark={false}>Owners choose which stays are open to the partner network.</Fine>
    </AbsoluteFill>
  );
};

/* 5. Branded card + QR, shared on WhatsApp. */
const Card = () => {
  const t = useSec();
  const sent = t > 4.4;
  const qr = [...Array(81)].map((_, i) => ((i * 37 + (i >> 2) * 11) % 7 < 3) || [0, 1, 2, 9, 11, 18, 19, 20, 6, 7, 8, 15, 17, 24, 25, 26, 54, 55, 56, 63, 65, 72, 73, 74].includes(i));
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Your name on it." accent="Share in a tap." top={190} size={88} />
      {!sent ? (
        <div style={{ position: "absolute", left: 140, right: 140, top: 450, background: C.paper, borderRadius: 30, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.45)", ...pop(t, 0.2) }}>
          <Thumb src="hero-sample-living.jpg" h={430} r={0} />
          <div style={{ padding: 30 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 48, color: C.ink }}>Lekki Phase 1 · 2-bed</div>
                <div style={{ marginTop: 10 }}><Badge size={22}>✓ Verified by HAMLET</Badge></div>
              </div>
              <div style={{ width: 150, height: 150, display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 2, padding: 8, background: "#fff", borderRadius: 10, opacity: seg(t, 1.6, 0.4) }}>
                {qr.map((on, i) => <div key={i} style={{ background: on ? C.ink : "#fff" }} />)}
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: `2px solid ${C.line}`, display: "flex", alignItems: "center", gap: 14, ...rise(t, 0.9) }}>
              <Mark stem={C.ink} bar={C.gold} size={40} />
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.ink }}>Shared by Tunde · Lagos Stays</span>
            </div>
          </div>
          <div style={{ padding: "0 30px 30px" }}><Btn label="Share on WhatsApp" tone="gold" doneAt={4.2} done="Shared" size={30} /></div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 70, right: 70, top: 460, display: "flex", flexDirection: "column" }}>
          <Bubble>Do you have a 2-bed in Lekki for Friday?</Bubble>
          <Bubble me style={pop(t, 4.4)}>
            <Thumb src="hero-sample-living.jpg" h={260} r={14} />
            <div style={{ marginTop: 12, fontWeight: 700 }}>Lekki Phase 1 · 2-bed · Verified</div>
            <div style={{ color: "#3a7bd5", fontSize: 30 }}>hamlet.rest/…</div>
          </Bubble>
        </div>
      )}
      {!sent && <Tap x={540} y={1395} at={4.2} />}
      <Fine top={1500}>Illustrative card and chat</Fine>
    </AbsoluteFill>
  );
};

/* 6. The tracking link follows the client through to the booking. */
const Tracking = () => {
  const t = useSec();
  const path = seg(t, 1.0, 3.2, E.inOut);
  const nodes = [["Your link", 0.2], ["Client browses", 1.4], ["Client books", 2.6], ["Linked to you", 3.8]] as const;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Your link" accent="remembers you." top={190} size={100} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 460, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: "22px 28px", fontFamily: "monospace", fontSize: 38, color: C.paper, ...pop(t, 0.1) }}>
        hamlet.rest/stays/…<span style={{ color: C.gold2, background: "rgba(226,190,110,0.18)", padding: "2px 8px", borderRadius: 6 }}>?ref=your-code</span>
      </div>
      <div style={{ position: "absolute", left: 150, top: 660, width: 8, height: 700 * path, background: C.gold2, borderRadius: 4 }} />
      {nodes.map(([s, at], i) => (
        <div key={s} style={{ position: "absolute", left: 110, top: 640 + i * 230, display: "flex", alignItems: "center", gap: 34, ...rise(t, at) }}>
          <Tick p={seg(t, at + 0.15, 0.4)} size={90} color={i === 3 ? C.gold : C.ok} />
          <span style={{ fontFamily: SERIF, fontSize: 66, color: i === 3 ? C.gold2 : C.paper, letterSpacing: "-0.02em" }}>{s}</span>
        </div>
      ))}
      <Fine top={1530}>Each link carries your HAMLET attribution token. Illustrative link format.</Fine>
    </AbsoluteFill>
  );
};

/* 7. Step 3: request, accept, pay through HAMLET. */
const Books = () => {
  const t = useSec();
  const steps = [["Client sends a request", 0.4], ["Host accepts", 1.8], ["Client pays through HAMLET", 3.2]] as const;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 3" title="Your client" accent="books safely." top={210} size={88} dark={false} />
      {steps.map(([s, at], i) => (
        <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 580 + i * 250, background: "#fff", border: `3px solid ${C.line}`, borderRadius: 26, padding: "34px 34px", display: "flex", alignItems: "center", gap: 28, ...rise(t, at) }}>
          <Tick p={seg(t, at + 0.2, 0.4)} size={96} color={i === 2 ? C.gold : C.ok} />
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 50, color: C.ink, lineHeight: 1.15 }}>{s}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* 8. Step 4: commission recorded in the ledger; owner's rate whole. */
const Ledger = () => {
  const t = useSec();
  const add = seg(t, 4.6, 0.7, E.back);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 4" title="Stay completed." accent="Commission recorded." top={210} size={84} />
      <Device y={500} enter={-1} bg="#fff">
        <AppBar title="Attributed commission ledger" />
        {[["Lekki Phase 1 · 2-bed", "Stay completed", 0.5], ["Ikoyi · 3-bed", "Awaiting stay", 1.0]].map(([n, s, at], i) => (
          <div key={n as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", borderBottom: `2px solid ${C.line}`, ...rise(t, at as number) }}>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink }}>{n}</span>
            <Badge bg={i === 0 ? C.ok : C.sand} fg={i === 0 ? "#fff" : C.ink} size={22}>{s}</Badge>
          </div>
        ))}
        <div style={{ marginTop: 36, fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.muted, ...rise(t, 3.0) }}>Where your commission comes from</div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column-reverse", ...rise(t, 3.2) }}>
          <div style={{ height: 200, borderRadius: 18, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.paper }}>Owner's rate · stays whole</div>
          <div style={{ height: 110, borderRadius: 18, background: C.gold2, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.ink }}>
            <span>HAMLET's fee</span><span style={{ opacity: add, background: "#fff", borderRadius: 999, padding: "6px 16px" }}>→ your commission</span>
          </div>
        </div>
      </Device>
      <Fine top={1530}>{FINE}</Fine>
    </AbsoluteFill>
  );
};

/* 9. Referral rewards. */
const Referral = () => {
  const t = useSec();
  const ring = [[200, 980, "Agent"], [880, 980, "Owner"], [300, 1320, "Manager"], [780, 1320, "Agent"]] as const;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Invite partners." accent="Earn referral rewards." top={190} size={84} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {ring.map(([x, y], i) => <line key={i} x1={540} y1={700} x2={x} y2={y} stroke={C.gold2} strokeWidth={5} strokeDasharray={800} strokeDashoffset={800 * (1 - seg(t, 0.5 + i * 0.4, 0.5))} />)}
      </svg>
      <div style={{ position: "absolute", left: 440, top: 600, width: 200, height: 200, borderRadius: 100, background: C.gold2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 58, color: C.ink, ...pop(t, 0.2) }}>You</div>
      {ring.map(([x, y, label], i) => (
        <div key={i} style={{ position: "absolute", left: x - 95, top: y - 95, width: 190, height: 190, borderRadius: 95, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...pop(t, 0.7 + i * 0.4) }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.ink }}>{label}</span>
          <span style={{ marginTop: 8, opacity: seg(t, 2.6 + i * 0.25, 0.3) }}><Badge size={20}>+ reward</Badge></span>
        </div>
      ))}
      <Fine top={1500}>Referral rewards apply to eligible, completed bookings under HAMLET's partner rules.</Fine>
    </AbsoluteFill>
  );
};

export const AgentExplainer: React.FC = () => {
  const L = lines(VID);
  const at = (i: number, d = 0) => L[i].start - 0.12 + d;
  const sfx: Sfx[] = [
    ...[0, 1, 2].map((i) => ({ at: 0.2 + i * 0.7, name: "notify", vol: 0.3 })),
    { at: at(1), name: "swoosh", vol: 0.35 }, { at: at(1, 1.4), name: "chime", vol: 0.3 },
    ...[0, 1, 2, 3].map((i) => ({ at: at(2, 0.4 + i * 0.3), name: "pop", vol: 0.22 })),
    { at: at(3), name: "swoosh", vol: 0.3 }, { at: at(3, 1.9), name: "tap", vol: 0.45 }, { at: at(3, 3.0), name: "tap", vol: 0.45 },
    { at: at(4), name: "swoosh", vol: 0.3 }, ...[0, 1, 2].map((i) => ({ at: at(4, 0.6 + i * 0.35), name: "pop", vol: 0.2 })),
    { at: at(5), name: "swoosh", vol: 0.3 }, { at: at(5, 1.6), name: "spark", vol: 0.25 }, { at: at(5, 4.2), name: "tap", vol: 0.5 }, { at: at(5, 4.4), name: "notify", vol: 0.35 },
    { at: at(6), name: "swoosh", vol: 0.3 }, ...[0.2, 1.4, 2.6, 3.8].map((d) => ({ at: at(6, d + 0.15), name: "pop", vol: 0.22 })), { at: at(6, 3.95), name: "chime", vol: 0.3 },
    { at: at(7), name: "swoosh", vol: 0.3 }, ...[0.4, 1.8, 3.2].map((d) => ({ at: at(7, d + 0.2), name: "pop", vol: 0.25 })),
    { at: at(8, 0.5), name: "chime", vol: 0.3 }, { at: at(8, 4.6), name: "clink", vol: 0.45 },
    ...[0, 1, 2, 3].map((i) => ({ at: at(9, 0.7 + i * 0.4), name: "pop", vol: 0.25 })), { at: at(9, 2.6), name: "chime", vol: 0.3 },
    { at: at(10), name: "impact", vol: 0.4 }, { at: at(10, 0.9), name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Hook />, <Promise />, <Overview />, <Join />, <Studio />, <Card />, <Tracking />, <Books />, <Ledger />, <Referral />,
          <EndCard head={["Share stays.", "Get credited."]} sub="Join HAMLET as a closing agent. Share verified stays with your own tracked link." cta="Start sharing" url="hamlet.rest/partners/apply" />]}
      </Beats>
      <StepTrack vid={VID} map={MAP} labels={STEPS} dark={DARK} />
      <Captions vid={VID} until={L[10].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.32} />
    </AbsoluteFill>
  );
};
