import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, Mark, SANS, SERIF } from "../brand";
import { FPS, E, clamp, seg } from "../anim";
import { TIMINGS, VoLine } from "../vo/timings";

export const useSec = () => useCurrentFrame() / FPS;
export const lines = (vid: string) => TIMINGS[vid].lines;
export const totalFrames = (vid: string) => Math.ceil(TIMINGS[vid].total * FPS);
export const f = (s: number) => Math.max(0, Math.round(s * FPS));

/** One visual beat per voice line: starts just before the line, ends just before the next one. */
export const Beats: React.FC<{ vid: string; children: React.ReactNode[] }> = ({ vid, children }) => {
  const L = lines(vid);
  const total = TIMINGS[vid].total;
  return (
    <>
      {children.map((child, i) => {
        if (!child) return null;
        const from = i === 0 ? 0 : L[i].start - 0.12;
        const to = i + 1 < L.length && children[i + 1] ? L[i + 1].start - 0.12 : total;
        return (
          <Sequence key={i} name={`Beat ${i + 1}: ${L[i]?.text ?? ""}`} from={f(from)} durationInFrames={Math.max(1, f(to) - f(from))} layout="none">
            {child}
          </Sequence>
        );
      })}
    </>
  );
};

/** Word-by-word caption for whichever voice line is playing. Word timing is spread by word length. */
export const KineticCaption: React.FC<{ vid: string; top: number; tone?: "light" | "dark"; size?: number }> = ({ vid, top, tone = "dark", size = 60 }) => {
  const t = useSec();
  const L = lines(vid);
  const line = L.find((l, i) => t >= l.start - 0.05 && t < (L[i + 1]?.start ?? 999) - 0.08 && t < l.start + l.dur + 0.6);
  if (!line) return null;
  const words = line.text.split(" ");
  const weights = words.map((w) => w.replace(/[^\w']/g, "").length + 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const base = tone === "dark" ? C.paper : C.ink;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, textAlign: "center" }}>
     <div style={{ display: "inline-block", background: tone === "dark" ? "rgba(9,21,40,0.92)" : "rgba(244,243,239,0.95)", borderRadius: 18, padding: "22px 34px 26px", fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: "-0.01em" }}>
      {words.map((w, i) => {
        const ws = line.start + (acc / sum) * line.dur;
        acc += weights[i];
        const we = line.start + (acc / sum) * line.dur;
        const p = seg(t, ws - 0.04, 0.16, E.out);
        const active = t >= ws && t < we + 0.05;
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: 0.25 + 0.75 * p, translate: `0 ${(1 - p) * 14}px`, color: active ? (tone === "dark" ? C.gold2 : C.gold) : base }}>{w}</span>
        );
      })}
     </div>
    </div>
  );
};

export type Sfx = { at: number; name: string; vol?: number };

/** Voice lines, music ducked under the voice, and sound effects. */
export const Soundtrack: React.FC<{ vid: string; sfx: Sfx[]; musicGain?: number }> = ({ vid, sfx, musicGain = 1 }) => {
  const L = lines(vid);
  const duck = (sec: number) => {
    let d = 0;
    for (const l of L) d = Math.max(d, clamp((sec - (l.start - 0.25)) / 0.25) * clamp((l.start + l.dur + 0.3 - sec) / 0.3));
    return 0.9 - 0.62 * d;
  };
  return (
    <>
      <Audio src={staticFile(`audio/${vid}-music.wav`)} volume={(fr: number) => duck(fr / FPS) * musicGain} />
      {L.map((l: VoLine, i: number) => (
        <Sequence key={i} name={`VO ${i + 1}`} from={f(l.start)} layout="none"><Audio src={staticFile(l.file)} volume={1} /></Sequence>
      ))}
      {sfx.map((s, i) => (
        <Sequence key={`s${i}`} name={`SFX ${s.name}`} from={f(s.at)} layout="none"><Audio src={staticFile(`audio/sfx-${s.name}.wav`)} volume={s.vol ?? 0.5} /></Sequence>
      ))}
    </>
  );
};

/** Full-bleed photo with a slow push-in. */
export const Photo: React.FC<{ src: string; dim?: number; zoom?: [number, number]; dur?: number; pos?: string; style?: React.CSSProperties }> = ({ src, dim = 0, zoom = [1.12, 1.0], dur = 4, pos = "50% 50%", style }) => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img src={staticFile(`img/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, scale: String(zoom[0] + (zoom[1] - zoom[0]) * seg(t, 0, dur, E.soft)) }} />
      {dim > 0 && <AbsoluteFill style={{ background: C.deep, opacity: dim }} />}
    </AbsoluteFill>
  );
};

export const Phone: React.FC<{ x?: number; y?: number; w?: number; children: React.ReactNode; title?: string }> = ({ x = 190, y = 260, w = 700, children, title = "Partner workspace" }) => {
  const h = w * 1.86;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: C.deep, borderRadius: 72, border: "6px solid #2a3b5a", padding: 28 }}>
      <div style={{ position: "relative", width: "100%", height: "100%", background: C.paper, borderRadius: 50, overflow: "hidden", padding: "70px 40px 40px" }}>
        <div style={{ position: "absolute", left: "50%", top: 18, width: 190, height: 30, borderRadius: 15, background: C.deep, translate: "-50% 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
          <Mark stem={C.ink} bar={C.gold} size={44} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.muted }}>{title}</span>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.surface, border: `3px solid ${C.line}`, borderRadius: 14, padding: "34px 36px", ...style }}>{children}</div>
);

export const Row: React.FC<{ k: string; v: string; strong?: boolean; color?: string }> = ({ k, v, strong, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 34, padding: "14px 0", color: C.muted }}>
    <span>{k}</span><span style={{ color: color ?? C.ink, fontWeight: strong ? 700 : 600 }}>{v}</span>
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; bg: string; fg: string; size?: number }> = ({ children, bg, fg, size = 30 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, background: bg, color: fg, fontFamily: SANS, fontWeight: 700, fontSize: size, padding: "10px 22px", borderRadius: 999 }}>{children}</span>
);

export const Check: React.FC<{ size?: number; color?: string; p?: number }> = ({ size = 40, color = C.ok, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40"><path d="M8 21 L17 30 L33 11" stroke={color} strokeWidth={5.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} /></svg>
);

/** Shared closing card. */
export const EndCard: React.FC<{ head: [string, string]; sub: string }> = ({ head, sub }) => {
  const t = useSec();
  const r = (a: number) => { const p = seg(t, a, 0.6); return { opacity: p, translate: `0 ${(1 - p) * 26}px` }; };
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 90, top: 330, width: 900, fontFamily: SERIF, fontWeight: 420, letterSpacing: "-0.025em", fontSize: 150, lineHeight: 0.98, color: C.paper }}>
        {head.map((h, i) => {
          const p = seg(t, 0.05 + i * 0.14, 0.8);
          return <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}><span style={{ display: "inline-block", translate: `0 ${(1 - p) * 110}%`, color: i === 1 ? C.gold2 : C.paper }}>{h}</span></span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 90, top: 720, width: 880, fontFamily: SANS, fontSize: 46, lineHeight: 1.4, color: C.mist, ...r(0.5) }}>{sub}</div>
      <div style={{ position: "absolute", left: 90, top: 1010, background: C.gold2, color: C.ink, borderRadius: 12, fontFamily: SANS, fontWeight: 700, fontSize: 46, padding: "36px 60px", ...r(0.8) }}>Partner with us</div>
      <div style={{ position: "absolute", left: 90, top: 1200, fontFamily: SANS, fontSize: 48, color: C.paper, fontWeight: 600, ...r(1.0) }}>hamlet.rest/partners/apply</div>
      <div style={{ position: "absolute", left: 90, top: 1690, display: "flex", alignItems: "center", gap: 22, ...r(1.3) }}>
        <Mark stem={C.paper} bar={C.gold2} size={84} />
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 480, letterSpacing: ".02em", color: C.paper }}>HAMLET.</span>
      </div>
      <div style={{ position: "absolute", right: 90, top: 1712, fontFamily: SANS, fontSize: 36, color: C.mist, ...r(1.4) }}>Your stay, sorted.</div>
    </AbsoluteFill>
  );
};
