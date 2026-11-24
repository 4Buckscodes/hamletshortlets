import React from "react";
import { AbsoluteFill } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, seg } from "../anim";
import { Beats, EndCard, Sfx, Soundtrack, lines, useSec } from "../kit/kit";
import { Captions } from "../kit/captions";
import { AppBar, Badge, Btn, Device, Fine, Heading, StepTrack, Tap, Thumb, Tick, caret, pop, rise, typed } from "./ui";

const VID = "explainHoratio";
const STEPS = ["Brief", "Draft", "Photos", "Submit"];
const MAP = [0, 0, 1, 1, 2, 2, 3, 4, 0, 0, 0];
const DARK = [true, true, false, false, false, false, true, false, true, true, true];
/** The example brief shown in HAMLET's own Horatio box. */
const BRIEF = "2-bedroom apartment in Lekki Phase 1 with 2 bathrooms, inverter backup, Wi-Fi, and parking. Sleeps 4. Owner rate ₦150,000/night.";
const BRIEF_AT = 1.4, BRIEF_CPS = 21;

/* 0. Hook: form after form. */
const Forms = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.deep }}>
      <Heading title="Form after form" accent="after form." top={150} size={118} at={0} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ position: "absolute", left: 160 + i * 22, top: 560 + i * 70, width: 700, height: 760, background: C.paper, borderRadius: 26, padding: 40, rotate: `${(i - 2.5) * 2.2}deg`, boxShadow: "0 20px 50px rgba(0,0,0,0.4)", ...pop(t, 0.15 + i * 0.32) }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.muted, marginBottom: 26 }}>Page {i + 1} of 9</div>
          {[0, 1, 2, 3, 4, 5].map((r) => <div key={r} style={{ height: 52, borderRadius: 10, border: `3px solid ${C.line}`, marginBottom: 22 }} />)}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* 1. Meet Horatio. */
const Meet = () => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", ...pop(t, 0.05) }}>
        <div style={{ width: 300, height: 300, borderRadius: 90, background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }}><Mark stem={C.ink} bar={C.gold} size={180} /></div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", fontFamily: SERIF, fontSize: 130, color: C.paper, letterSpacing: "-0.03em", ...rise(t, 0.3) }}>Meet <span style={{ color: C.gold2 }}>Horatio</span></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 930, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 44, color: C.mist, ...rise(t, 0.6) }}>Your AI listing assistant</div>
      <div style={{ position: "absolute", left: 180, right: 180, top: 1100, background: C.paper, borderRadius: "30px 30px 30px 8px", padding: "28px 34px", fontFamily: SANS, fontSize: 42, color: C.ink, ...pop(t, 1.1) }}>Tell me about your place.</div>
    </AbsoluteFill>
  );
};

/* 2–3. The brief, typed like a message to a friend, then Generate. */
const Brief: React.FC<{ offset: number }> = ({ offset }) => {
  const T = useSec() + offset;
  const done = BRIEF_AT + BRIEF.length / BRIEF_CPS;
  const tapAt = 10.6;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 1" title="Write a" accent="short brief." top={210} size={88} dark={false} at={offset > 0 ? 0 : 0.05} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Add a property" />
        <div style={{ border: `3px solid ${C.gold2}`, borderRadius: 22, padding: 26, background: "#fbf7ec" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}><Mark stem={C.ink} bar={C.gold} size={40} /><span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: C.ink }}>Meet Horatio</span></div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: C.muted, marginBottom: 18 }}>Your AI listing assistant</div>
          <div style={{ background: "#fff", border: `3px solid ${T > BRIEF_AT && T < done + 0.4 ? C.ink : C.line}`, borderRadius: 14, padding: 20, minHeight: 300, fontFamily: SANS, fontSize: 30, lineHeight: 1.4, color: C.ink }}>
            {T < BRIEF_AT ? <span style={{ color: "#9aa1ad" }}>Describe your property for Horatio</span> : <>{typed(T, BRIEF, BRIEF_AT, BRIEF_CPS)}<span style={{ color: C.gold }}>{caret(T, BRIEF_AT, BRIEF, BRIEF_CPS)}</span></>}
          </div>
          <div style={{ marginTop: 20 }}>{T >= tapAt ? <Btn label="Horatio is preparing…" tone="gold" size={30} /> : <Btn label="Generate listing draft" size={30} />}</div>
        </div>
      </Device>
      {offset > 0 && <Tap x={540} y={1215} at={tapAt - offset} />}
    </AbsoluteFill>
  );
};

/* 4. The form fills itself. */
const FIELDS: [string, string][] = [["Title", "2-bedroom apartment in Lekki Phase 1"], ["Property type", "Apartment"], ["Area", "Lekki Phase 1"], ["Bedrooms · Bathrooms · Sleeps", "2 · 2 · 4"], ["Nightly rate", "₦150,000"]];
const AMENITIES = ["Inverter backup", "Wi-Fi", "Parking"];

const DraftForm: React.FC<{ phase: "fill" | "review" }> = ({ phase }) => {
  const t = useSec();
  const f0 = phase === "fill" ? 0.6 : -10;
  const applied = phase === "review" && t > 4.6;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 2" title={phase === "fill" ? "Horatio fills" : "You check it,"} accent={phase === "fill" ? "the form." : "then apply."} top={210} size={88} dark={false} at={0.05} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Listing draft" />
        {phase === "fill" ? (
          <>
            {FIELDS.map(([k, v], i) => {
              const at = f0 + i * 0.75;
              const flash = seg(t, at, 0.2) * (1 - seg(t, at + 0.5, 0.5));
              return (
                <div key={k} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: C.muted, marginBottom: 6 }}>{k}</div>
                  <div style={{ border: `3px solid ${flash > 0.1 ? C.gold : C.line}`, background: `rgba(212,178,104,${0.25 * flash})`, borderRadius: 12, padding: "14px 18px", fontFamily: SANS, fontSize: 30, color: C.ink, minHeight: 64 }}>{typed(t, v, at, 60)}</div>
                </div>
              );
            })}
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: C.muted, marginBottom: 8 }}>Amenities</div>
            <div>{AMENITIES.map((a, i) => <span key={a} style={{ display: "inline-block", marginRight: 10, ...pop(t, f0 + 3.9 + i * 0.2) }}><Badge bg={C.sand} fg={C.ink} size={26}>{a}</Badge></span>)}</div>
          </>
        ) : (
          <>
            <div style={{ border: `3px solid ${C.gold2}`, background: "#fbf7ec", borderRadius: 16, padding: 22, marginBottom: 18, ...rise(t, 0.3) }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: C.ink, marginBottom: 10 }}>Still needed</div>
              {["Exact address", "Cleaning fee", "Caution deposit", "First available date", "House rules"].map((m, i) => <div key={m} style={{ fontFamily: SANS, fontSize: 28, color: C.ink, padding: "6px 0", ...rise(t, 0.6 + i * 0.25, 16) }}>• {m}</div>)}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 24, lineHeight: 1.35, color: C.muted, marginBottom: 20, ...rise(t, 2.2) }}>Horatio has not verified these details. Check all fields before applying them.</div>
            <Btn label="Apply draft" doneAt={4.6} done="Draft applied" size={30} />
            {applied && <div style={{ marginTop: 18, ...pop(t, 4.8) }}><Badge>✓ Form filled · add what's missing</Badge></div>}
          </>
        )}
      </Device>
      {phase === "review" && <Tap x={540} y={1305} at={4.6} />}
      <Fine top={1500} dark={false}>Example brief from HAMLET's Horatio box</Fine>
    </AbsoluteFill>
  );
};

/* 6. Photos: straight from the phone, optimised, turned upright, pick a cover. */
const Photos = () => {
  const t = useSec();
  const imgs = ["hero-sample-living.jpg", "hero-sample-bedroom.jpg", "hero-sample-kitchen.jpg", "bath-1.jpg", "dining-1.jpg", "living-1.jpg"];
  const opt = seg(t, 1.0, 2.6, E.inOut);
  const cover = t > 5.4;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading kicker="Step 3" title="Add photos" accent="from your phone." top={210} size={86} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Property photos & cover order" />
        <div style={{ marginBottom: 18 }}><Btn label="Select photos from device" tone="ghost" doneAt={0.6} done="6 photos selected" size={28} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {imgs.map((src, i) => {
            const turn = i === 2 ? 90 * (1 - seg(t, 2.6, 0.6, E.inOut)) : 0;
            return (
              <div key={src} style={{ position: "relative", ...pop(t, 0.8 + i * 0.18) }}>
                <div style={{ rotate: `${turn}deg` }}><Thumb src={src} h={170} /></div>
                {i === 1 && cover && <div style={{ position: "absolute", left: 8, top: 8, ...pop(t, 5.4) }}><Badge bg={C.gold2} fg={C.ink} size={22}>Cover</Badge></div>}
                {i === 1 && !cover && t > 4.4 && <div style={{ position: "absolute", right: 8, bottom: 8 }}><Badge bg="#fff" fg={C.ink} size={20}>Make cover</Badge></div>}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 600, fontSize: 26, color: opt >= 1 ? C.ok : C.muted }}>{opt >= 1 ? "✓ Photos optimised and uploaded" : "Optimising photos…"}</div>
        <div style={{ marginTop: 8, height: 10, borderRadius: 5, background: C.line, overflow: "hidden" }}><div style={{ width: `${opt * 100}%`, height: "100%", background: opt >= 1 ? C.ok : C.gold }} /></div>
      </Device>
      <Tap x={540} y={698} at={0.6} />
      <Tap x={760} y={1045} at={5.3} />
    </AbsoluteFill>
  );
};

/* 7. Preview, confirm authority, submit. */
const Submit = () => {
  const t = useSec();
  const ticked = t > 1.3;
  const sent = t > 2.6;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading kicker="Step 4" title="Preview," accent="confirm, submit." top={210} size={86} dark={false} />
      <Device y={470} enter={-1} bg="#fff">
        <AppBar title="Authority & final review" />
        <div style={{ border: `3px solid ${C.line}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.muted, marginBottom: 8 }}>Pricing & guest total preview</div>
          {[["You receive per night", "₦150,000"], ["Guest service fee", "Added on top"], ["Cleaning", "Shown separately"]].map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 27, padding: "6px 0", color: C.muted }}><span>{k}</span><b style={{ color: C.ink }}>{v}</b></div>)}
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ width: 50, height: 50, borderRadius: 10, border: `4px solid ${ticked ? C.ok : C.line}`, background: ticked ? C.ok : "#fff", color: "#fff", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ticked ? "✓" : ""}</div>
          <div style={{ fontFamily: SANS, fontSize: 28, lineHeight: 1.3, color: C.ink }}>I own this property or hold a signed management mandate</div>
        </div>
        <Btn label="Submit for HAMLET review" doneAt={2.6} done="Submitted" size={30} />
        {sent && <div style={{ marginTop: 20, background: C.ink, color: C.paper, borderRadius: 14, padding: "18px 22px", fontFamily: SANS, fontWeight: 600, fontSize: 28, ...pop(t, 2.7) }}>Listing submitted for HAMLET review.</div>}
      </Device>
      <Tap x={308} y={1095} at={1.3} />
      <Tap x={540} y={1225} at={2.6} />
    </AbsoluteFill>
  );
};

/* 8. More apartments: repeat, each brief and photos. */
const Many = () => {
  const t = useSec();
  const apts = [["hero-sample-living.jpg", "Lekki Phase 1 · 2-bed"], ["penthouse.jpg", "Ikoyi · 3-bed"], ["studio-1.jpg", "Yaba · studio"], ["duplex.jpg", "Ajah · duplex"]];
  const st = ["Brief", "Draft", "Photos", "Submitted"];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Heading title="Got more apartments?" accent="Do it again." top={190} size={88} />
      {apts.map(([img, name], i) => {
        const base = 0.4 + i * 1.1;
        const k = Math.max(0, Math.min(3, Math.floor((t - base) / 0.3)));
        const done = k === 3;
        return (
          <div key={name} style={{ position: "absolute", left: 80, right: 80, top: 480 + i * 215, background: C.paper, borderRadius: 22, padding: 18, display: "flex", alignItems: "center", gap: 24, ...rise(t, base - 0.2) }}>
            <Thumb src={img} h={150} style={{ width: 190 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SERIF, fontSize: 44, color: C.ink }}>{name}</div>
              <div style={{ marginTop: 10 }}><Badge bg={done ? C.ok : C.sand} fg={done ? "#fff" : C.ink} size={24}>{done ? "✓ Submitted for review" : st[k]}</Badge></div>
            </div>
          </div>
        );
      })}
      <Fine top={1360}>Illustrative apartments. One brief and a set of photos per listing.</Fine>
    </AbsoluteFill>
  );
};

/* 9. HAMLET checks every listing, then it goes live. */
const Checked = () => {
  const t = useSec();
  const chain = [["In review", 0.3], ["Checked by HAMLET", 1.3], ["Live for guests", 2.6]] as const;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Heading title="We check every listing" accent="before it goes live." top={190} size={86} dark={false} />
      {chain.map(([s, at], i) => (
        <div key={s} style={{ position: "absolute", left: 80, right: 80, top: 600 + i * 220, display: "flex", alignItems: "center", gap: 30, ...rise(t, at) }}>
          <Tick p={seg(t, at + 0.1, 0.4)} size={110} color={i === 2 ? C.gold : C.ok} />
          <span style={{ fontFamily: SERIF, fontSize: 72, color: C.ink, letterSpacing: "-0.02em" }}>{s}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1300, fontFamily: SANS, fontSize: 34, color: C.muted, ...rise(t, 1.0) }}>Ownership or mandate, the person behind it, and an on-site visit.</div>
    </AbsoluteFill>
  );
};

export const HoratioExplainer: React.FC = () => {
  const L = lines(VID);
  const at = (i: number, d = 0) => L[i].start - 0.12 + d;
  const off3 = L[3].start - L[2].start;
  const typeTicks = [...Array(14)].map((_, k) => ({ at: at(2, BRIEF_AT + k * 0.42), name: "tap", vol: 0.12 }));
  const sfx: Sfx[] = [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.15 + i * 0.32, name: "land", vol: 0.25 })),
    { at: at(1), name: "swoosh", vol: 0.4 }, { at: at(1, 1.1), name: "notify", vol: 0.35 },
    { at: at(2), name: "swoosh", vol: 0.3 }, ...typeTicks,
    { at: at(3, 10.6 - off3), name: "tap", vol: 0.5 },
    { at: at(4), name: "riser", vol: 0.25 }, ...FIELDS.map((_, i) => ({ at: at(4, 0.6 + i * 0.75), name: "spark", vol: 0.25 })), ...[0, 1, 2].map((i) => ({ at: at(4, 4.5 + i * 0.2), name: "pop", vol: 0.2 })),
    { at: at(5, 0.3), name: "notify", vol: 0.25 }, { at: at(5, 4.6), name: "tap", vol: 0.5 }, { at: at(5, 4.8), name: "chime", vol: 0.3 },
    { at: at(6), name: "swoosh", vol: 0.3 }, { at: at(6, 0.6), name: "tap", vol: 0.45 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: at(6, 0.8 + i * 0.18), name: "pop", vol: 0.18 })), { at: at(6, 3.6), name: "chime", vol: 0.25 }, { at: at(6, 5.3), name: "tap", vol: 0.45 },
    { at: at(7, 1.3), name: "tap", vol: 0.45 }, { at: at(7, 2.6), name: "tap", vol: 0.5 }, { at: at(7, 2.7), name: "chime", vol: 0.35 },
    ...[0, 1, 2, 3].map((i) => ({ at: at(8, 0.4 + i * 1.1 + 0.9), name: "pop", vol: 0.28 })),
    ...[0.3, 1.3, 2.6].map((d) => ({ at: at(9, d + 0.1), name: "pop", vol: 0.25 })), { at: at(9, 2.7), name: "chime", vol: 0.35 },
    { at: at(10), name: "impact", vol: 0.4 }, { at: at(10, 0.9), name: "chime", vol: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Beats vid={VID}>
        {[<Forms />, <Meet />, <Brief offset={0} />, <Brief offset={off3} />, <DraftForm phase="fill" />, <DraftForm phase="review" />, <Photos />, <Submit />, <Many />, <Checked />,
          <EndCard head={["Tell Horatio.", "Add photos. Submit."]} sub="Let Horatio draft your listings, apartment after apartment. HAMLET checks each one before it goes live." cta="List with Horatio" url="hamlet.rest/partners/apply" />]}
      </Beats>
      <StepTrack vid={VID} map={MAP} labels={STEPS} dark={DARK} />
      <Captions vid={VID} until={L[10].start - 0.12} />
      <Soundtrack vid={VID} sfx={sfx} musicGain={0.32} />
    </AbsoluteFill>
  );
};
