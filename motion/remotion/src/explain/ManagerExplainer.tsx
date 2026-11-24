import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { Captions } from "../kit/captions";
import { AppBar, Badge, Bleed, Btn, Checklist, Chip, Device, Field, Fine, Heading, StepTrack, Tap, Thumb, Tick, pop, rise, typed } from "./ui";

const VID = "explainManager";
const STEPS = ["Join", "Add with mandate", "We visit", "Run it all"];
const MAP = [0, 0, 0, 1, 2, 2, 3, 4, 4, 4, 0];
const DARK = [true, true, true, true, false, true, true, false, true, true, true];
const HOMES = ["penthouse.jpg", "living-1.jpg", "duplex.jpg", "studio-1.jpg", "pool-1.jpg", "dining-1.jpg"];
const MSGS = ["Is it free this Friday?", "Sent the transfer, check", "Where do I get the key?", "Can we bring one more?", "Owner wants an update", "Gate code please"];

/* 0. Hook: six homes, messages piling up. */
const Hook = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Heading title="Managing shortlets" accent="for other owners?" top={150} size={100} at={0} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 520, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, opacity: 0.55 }}>
        {HOMES.map((h) => <Thumb key={h} src={h} h={250} />)}
      </div>
      {MSGS.map((m, i) => (
        <div key={m} style={{ position: "absolute", left: [80, 420, 150, 470, 110, 380][i], top: 560 + i * 115, background: "#fff", color: "#1b1b1b", fontFamily: SANS, fontSize: 34, padding: "18px 26px", borderRadius: "24px 24px 24px 6px", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", ...pop(t, 0.1 + i * 0.28) }}>{m}</div>
      ))}
    </AbsoluteFill>
  );
};

/* 1. The chaos collapses into one HAMLET workspace. */
const OnePlace = () => {
  const t = useSec();
  const pull = seg(t, 1.6, 1.0, E.inOut);
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Heading title="HAMLET puts it all" accent="in one place." top={150} size={96} />
      {MSGS.map((m, i) => {
        const x0 = [80, 420, 150, 470, 110, 380][i], y0 = 560 + i * 115;
        return <div key={m} style={{ position: "absolute", left: x0 + (380 - x0) * pull, top: y0 + (980 - y0) * pull, background: "#fff", fontFamily: SANS, fontSize: 34, padding: "18px 26px", borderRadius: 24, opacity: 1 - pull, scale: String(1 - pull * 0.7) }}>{m}</div>;
      })}
      <div style={{ position: "absolute", left: 240, top: 560, width: 600, ...pop(t, 2.3) }}>
        <div style={{ background: C.paper, borderRadius: 40, padding: 40, boxShadow: "0 40px 80px rgba(0,0,0,0.45)" }}>
          <AppBar title="Partner workspace" />
          {["Requests", "Availability", "Bookings", "Earnings"].map((r, i) => (
            <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "22px 0", borderBottom: `2px solid ${C.line}`, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: C.ink, ...rise(t, 2.6 + i * 0.2) }}><span>{r}</span><span style={{ color: C.gold }}>›</span></div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 2. One front desk for every property: a hub with lines to each home. */
const FrontDesk = () => {
  const t = useSec();
  const pos = [[150, 620], [930, 620], [100, 980], [980, 980], [190, 1340], [890, 1340]];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="One front desk for" accent="every property." top={150} size={92} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {pos.map(([x, y], i) => <line key={i} x1={540} y1={980} x2={x} y2={y} stroke={C.gold2} strokeWidth={4} strokeDasharray={900} strokeDashoffset={900 * (1 - seg(t, 0.4 + i * 0.15, 0.5))} />)}
      </svg>
      {pos.map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x - 100, top: y - 80, width: 200, height: 160, borderRadius: 18, overflow: "hidden", border: `5px solid ${C.paper}`, ...pop(t, 0.3 + i * 0.15) }}>
          <Img src={staticFile(`img/${HOMES[i]}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
      <div style={{ position: "absolute", left: 390, top: 830, width: 300, height: 300, borderRadius: 60, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.4)", ...pop(t, 0.1) }}>
        <Mark stem={C.ink} bar={C.gold} size={120} />
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink }}>Your workspace</span>
      </div>
    </AbsoluteFill>
  );
};

/* 3. Step 1: join and pick the manager role. */
const Join = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 1" title="Join as a" accent="property manager." top={210} size={84} />
      <Device y={470} enter={-1}>
        <AppBar title="Partner with HAMLET" />
        <Field label="Business name" value="Harbour Stays" at={0.3} />
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 12 }}>I am a</div>
        <div style={{ marginBottom: 26 }}><Chip label="Property owner" /><Chip label="Authorised property manager" on={t > 1.9} /><Chip label="Closing agent" /></div>
        <Btn label="Create my account" doneAt={3.0} done="Workspace ready" />
      </Device>
      <Tap x={555} y={1140} at={1.9} />
      <Tap x={540} y={1290} at={3.0} />
      <Fine top={1500}>Illustrative business name</Fine>
    </AbsoluteFill>
  );
};

/* 4. Step 2: add the property with its signed mandate. */
const Mandate = () => {
  const t = useSec();
  const up = seg(t, 1.0, 1.8, E.inOut);
  const ticked = t > 3.4;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 2" title="Add each property" accent="with its mandate." top={210} size={84} dark={false} />
      <Device y={500} enter={-1} bg="#fff">
        <AppBar title="Add a property" />
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 26 }}>
          <Thumb src="duplex.jpg" h={130} style={{ width: 170 }} />
          <div style={{ fontFamily: SERIF, fontSize: 40, color: C.ink, lineHeight: 1.1 }}>Owner's 3-bed duplex</div>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 12 }}>Management mandate</div>
        <div style={{ border: `3px solid ${up >= 1 ? C.ok : C.line}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 22, ...pop(t, 0.6) }}>
          <div style={{ width: 70, height: 90, borderRadius: 8, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 22, color: C.ink }}>PDF</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink }}>Signed mandate.pdf</div>
            <div style={{ marginTop: 12, height: 12, borderRadius: 6, background: C.line, overflow: "hidden" }}><div style={{ width: `${up * 100}%`, height: "100%", background: up >= 1 ? C.ok : C.gold }} /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginTop: 34, ...rise(t, 2.8) }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, border: `4px solid ${ticked ? C.ok : C.line}`, background: ticked ? C.ok : "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 34, flexShrink: 0 }}>{ticked ? "✓" : ""}</div>
          <div style={{ fontFamily: SANS, fontSize: 30, color: C.ink, lineHeight: 1.3 }}>I hold a signed management mandate from the property owner</div>
        </div>
      </Device>
      <Tap x={334} y={1225} at={3.4} />
    </AbsoluteFill>
  );
};

/* 5. Horatio drafts the listing from a plain description. */
const Horatio = () => {
  const t = useSec();
  const ask = "3-bed duplex, Lekki Phase 1. Sea breeze balcony, backup generator, sleeps 6.";
  const draft = ["Breezy 3-bed duplex in Lekki Phase 1", "• Balcony catching the sea breeze", "• Backup generator on site", "• Sleeps up to 6 guests"];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Horatio can" accent="draft the listing." top={200} size={88} />
      <Device y={470} enter={-1}>
        <AppBar title="Horatio" />
        <div style={{ marginLeft: "auto", maxWidth: 440, background: C.ink, color: C.paper, fontFamily: SANS, fontSize: 30, lineHeight: 1.35, padding: "22px 26px", borderRadius: "24px 24px 6px 24px", marginBottom: 24, ...rise(t, 0.2) }}>{typed(t, ask, 0.3, 30)}</div>
        <div style={{ maxWidth: 480, background: C.sand, color: C.ink, fontFamily: SANS, fontSize: 29, lineHeight: 1.4, padding: "22px 26px", borderRadius: "24px 24px 24px 6px", ...rise(t, 3.2) }}>
          <div style={{ fontWeight: 700, fontSize: 26, color: C.gold, marginBottom: 8 }}>Draft listing</div>
          {draft.map((d, i) => <div key={d} style={{ fontWeight: i === 0 ? 700 : 400, opacity: seg(t, 3.4 + i * 0.4, 0.3) }}>{d}</div>)}
        </div>
        <div style={{ marginTop: 24, ...rise(t, 5.2) }}><Badge bg={C.gold2} fg={C.ink}>Review and edit the draft</Badge></div>
      </Device>
      <Fine top={1500}>Illustrative conversation</Fine>
    </AbsoluteFill>
  );
};

/* 6. Step 3: on-site visit. */
const Visit = () => (
  <AbsoluteFill>
    <Bleed src="duplex.jpg" dim={0.6} zoom={[1.12, 1.0]} dur={7} />
    <Heading kicker="Step 3" title="We visit" accent="every property." top={210} size={88} />
    <div style={{ position: "absolute", left: 80, right: 80, top: 560 }}>
      <Checklist items={["Photos match the home", "Backup power checked", "Address confirmed"]} at={1.2} gap={1.0} size={58} />
    </div>
    <div style={{ position: "absolute", left: 80, top: 1180 }}><Badge bg={C.paper} fg={C.ink} size={34}>Only then does it go live</Badge></div>
  </AbsoluteFill>
);

/* 7. Step 4: every property, every request, one workspace. */
const RunIt = () => {
  const t = useSec();
  const props = [["penthouse.jpg", "Ikoyi penthouse", "2 requests"], ["duplex.jpg", "Lekki duplex", "1 request"], ["studio-1.jpg", "Yaba studio", "Calendar updated"]];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 4" title="Run them all" accent="from one place." top={210} size={84} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Your properties" />
        {props.map(([img, name, st], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 0", borderBottom: `2px solid ${C.line}`, ...rise(t, 0.3 + i * 0.3) }}>
            <Thumb src={img} h={110} style={{ width: 140 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink }}>{name}</div>
              <div style={{ marginTop: 8 }}><Badge bg={i === 2 ? C.sand : C.gold2} fg={C.ink} size={22}>{st}</Badge></div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 26, border: `3px solid ${C.line}`, borderRadius: 16, padding: 22, ...pop(t, 2.6) }}>
          <div style={{ fontFamily: SERIF, fontSize: 38, color: C.ink, marginBottom: 14 }}>Ikoyi penthouse · Fri – Sun</div>
          <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><Btn label="Decline" tone="ghost" size={28} /></div><div style={{ flex: 1.3 }}><Btn label="Accept" doneAt={4.6} done="Accepted" size={28} /></div></div>
        </div>
      </Device>
      <Tap x={640} y={1380} at={4.6} />
      <Fine top={1500} dark={false}>Illustrative screens</Fine>
    </AbsoluteFill>
  );
};

/* 8. No chasing transfers. */
const NoChasing = () => {
  const t = useSec();
  const strike = seg(t, 0.9, 0.4);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="No more" accent="chasing transfers." top={200} size={92} />
      <div style={{ position: "absolute", left: 100, right: 100, top: 560, background: "#fff", borderRadius: 24, padding: 30, ...pop(t, 0.2) }}>
        <div style={{ fontFamily: SANS, fontSize: 32, color: "#1b1b1b" }}>"I've sent it, check your account"</div>
        <div style={{ position: "absolute", left: 20, right: 20, top: "50%", height: 8, background: "#c4473b", scale: `${strike} 1`, transformOrigin: "left" }} />
      </div>
      <div style={{ position: "absolute", left: 100, right: 100, top: 820, background: C.paper, borderRadius: 24, padding: 36, ...rise(t, 1.6) }}>
        {[["Guest pays through HAMLET", 1.8], ["Payment verified", 2.6], ["Booking confirmed", 3.4]].map(([s, at]) => (
          <div key={s as string} style={{ display: "flex", alignItems: "center", gap: 24, padding: "16px 0" }}><Tick p={seg(t, at as number, 0.4)} size={70} /><span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.ink }}>{s}</span></div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* 9. Referral rewards. */
const Referral = () => {
  const t = useSec();
  const ring = [[200, 1000, "Owner"], [880, 1000, "Agent"], [300, 1350, "Owner"], [780, 1350, "Manager"]] as const;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Bring partners." accent="Earn referral rewards." top={200} size={84} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {ring.map(([x, y], i) => <line key={i} x1={540} y1={720} x2={x} y2={y} stroke={C.gold2} strokeWidth={5} strokeDasharray={800} strokeDashoffset={800 * (1 - seg(t, 0.6 + i * 0.4, 0.5))} />)}
      </svg>
      <div style={{ position: "absolute", left: 440, top: 620, width: 200, height: 200, borderRadius: 100, background: C.gold2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 58, color: C.ink, ...pop(t, 0.2) }}>You</div>
      {ring.map(([x, y, label], i) => (
        <div key={i} style={{ position: "absolute", left: x - 95, top: y - 95, width: 190, height: 190, borderRadius: 95, background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...pop(t, 0.8 + i * 0.4) }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.ink }}>{label}</span>
          <span style={{ marginTop: 8, opacity: seg(t, 2.8 + i * 0.25, 0.3) }}><Badge size={20}>+ reward</Badge></span>
        </div>
      ))}
      <Fine top={1500}>Referral rewards apply to eligible, completed bookings under HAMLET's partner rules.</Fine>
    </AbsoluteFill>
  );
};

export const ManagerExplainer: React.FC = () => {
  const L = lines(VID);
  const at = (i: number, d = 0) => L[i].start - 0.12 + d;
  const sfx: Sfx[] = [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.1 + i * 0.28, name: "notify", vol: 0.22 })),
    { at: at(1, 1.6), name: "swoosh", vol: 0.4 }, { at: at(1, 2.3), name: "chime", vol: 0.35 },
    { at: at(2), name: "swoosh", vol: 0.3 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: at(2, 0.3 + i * 0.15), name: "pop", vol: 0.2 })),
    { at: at(3), name: "swoosh", vol: 0.3 }, { at: at(3, 1.9), name: "tap", vol: 0.45 }, { at: at(3, 3.0), name: "tap", vol: 0.45 },
    { at: at(4), name: "swoosh", vol: 0.3 }, { at: at(4, 2.8), name: "chime", vol: 0.25 }, { at: at(4, 3.4), name: "tap", vol: 0.5 },
    { at: at(5, 3.2), name: "notify", vol: 0.3 },
    { at: at(6), name: "swoosh", vol: 0.3 }, ...[0, 1, 2].map((i) => ({ at: at(6, 1.2 + i * 1.0), name: "tap", vol: 0.35 })),
    { at: at(7), name: "swoosh", vol: 0.3 }, { at: at(7, 4.6), name: "tap", vol: 0.5 },
    { at: at(8, 0.9), name: "thud", vol: 0.35 }, { at: at(8, 3.4), name: "chime", vol: 0.35 },
    ...[0, 1, 2, 3].map((i) => ({ at: at(9, 0.8 + i * 0.4), name: "pop", vol: 0.25 })), { at: at(9, 2.8), name: "chime", vol: 0.3 },
    { at: at(10), name: "impact", vol: 0.4 }, { at: at(10, 0.9), name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Hook />, <OnePlace />, <FrontDesk />, <Join />, <Mandate />, <Horatio />, <Visit />, <RunIt />, <NoChasing />, <Referral />,
          <EndCard head={["One workspace.", "Every property."]} sub="Join as an authorised property manager and bring your portfolio to HAMLET." cta="Add your first property" url="hamlet.rest/partners/apply" />]}
      </Beats>
      <StepTrack vid={VID} map={MAP} labels={STEPS} dark={DARK} />
      <Captions vid={VID} until={L[10].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.32} />
    </AbsoluteFill>
  );
};
