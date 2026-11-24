import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, Mark, SANS, SERIF } from "../brand";
import { E, clamp, seg } from "../anim";
import { lines, useSec } from "../kit/kit";

/* ---------- Text helpers ---------- */

/** Text that types itself in from `at`, at `cps` characters per second. */
export const typed = (t: number, text: string, at: number, cps = 22) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));
export const caret = (t: number, at: number, text: string, cps = 22) => (t >= at && t < at + text.length / cps + 0.4 && Math.floor(t * 2.4) % 2 === 0 ? "|" : "");

/** Kicker + serif title, rising in. */
export const Heading: React.FC<{ kicker?: string; title: string; accent?: string; top?: number; dark?: boolean; size?: number; at?: number }> = ({ kicker, title, accent, top = 250, dark = true, size = 92, at = 0.05 }) => {
  const t = useSec();
  const p = at === 0 ? 1 : seg(t, at, 0.55, E.out);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, opacity: p, translate: `0 ${(1 - p) * 30}px` }}>
      {kicker && <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: dark ? C.gold2 : C.gold, marginBottom: 14 }}>{kicker}</div>}
      <div style={{ fontFamily: SERIF, fontWeight: 460, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.03em", color: dark ? C.paper : C.ink }}>
        {title} {accent && <span style={{ color: dark ? C.gold2 : C.gold }}>{accent}</span>}
      </div>
    </div>
  );
};

/* ---------- Step tracker (top of frame) ---------- */

/** Shows which of the four steps the voice is on. `map[i]` = step number for voice line i (0 = hidden). */
export const StepTrack: React.FC<{ vid: string; map: number[]; labels: string[]; dark?: boolean[] }> = ({ vid, map, labels, dark }) => {
  const t = useSec();
  const L = lines(vid);
  let idx = 0;
  L.forEach((l, i) => { if (t >= l.start - 0.12) idx = i; });
  const step = map[idx] ?? 0;
  if (!step) return null;
  const firstLine = map.indexOf(step);
  const appear = seg(t, L[firstLine].start - 0.12, 0.35);
  const isDark = dark ? dark[idx] : true;
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 80, display: "flex", gap: 12 }}>
      {labels.map((lab, i) => {
        const n = i + 1;
        const on = n === step, done = n < step;
        return (
          <div key={lab} style={{ flex: 1 }}>
            <div style={{ height: 8, borderRadius: 4, background: done || on ? C.gold2 : isDark ? "rgba(255,255,255,0.18)" : "rgba(14,31,59,0.12)", overflow: "hidden" }}>
              {on && <div style={{ width: `${appear * 100}%`, height: "100%", background: C.gold }} />}
            </div>
            <div style={{ marginTop: 12, fontFamily: SANS, fontWeight: on ? 700 : 600, fontSize: 26, color: on ? (isDark ? C.paper : C.ink) : isDark ? "rgba(236,233,225,0.55)" : C.muted }}>{n}. {lab}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Device ---------- */

/** A realistic phone: bezel, dynamic island, status bar, soft shadow. */
export const Device: React.FC<{ x?: number; y?: number; w?: number; children: React.ReactNode; bg?: string; enter?: number }> = ({ x = 240, y = 430, w = 600, children, bg = C.paper, enter = 0 }) => {
  const t = useSec();
  const p = enter < 0 ? 1 : seg(t, enter, 0.6, E.out);
  const h = w * 2.02;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, translate: `0 ${(1 - p) * 900}px`, borderRadius: w * 0.13, background: "#0b0f17", padding: w * 0.028, boxShadow: "0 50px 90px rgba(0,0,0,0.45), 0 0 0 3px #2b3446 inset" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.105, background: bg, overflow: "hidden" }}>
        <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 44px", fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.ink }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ display: "inline-flex", gap: 3, alignItems: "flex-end" }}>{[8, 12, 16, 20].map((hh) => <i key={hh} style={{ width: 5, height: hh, background: C.ink, borderRadius: 1 }} />)}</span>
            <span style={{ width: 40, height: 20, border: `2.5px solid ${C.ink}`, borderRadius: 6, padding: 2 }}><i style={{ display: "block", width: "75%", height: "100%", background: C.ink, borderRadius: 2 }} /></span>
          </span>
        </div>
        <div style={{ position: "absolute", left: "50%", top: 16, width: 160, height: 40, borderRadius: 20, background: "#0b0f17", translate: "-50% 0" }} />
        <div style={{ padding: "6px 34px 30px", position: "relative", height: "calc(100% - 70px)" }}>{children}</div>
      </div>
    </div>
  );
};

/** App bar inside the phone. */
export const AppBar: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0 22px", borderBottom: `2px solid ${C.line}`, marginBottom: 24 }}>
    <Mark stem={C.ink} bar={C.gold} size={42} />
    <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.ink }}>{title}</span>
  </div>
);

/** A finger tap: a soft dot that presses, with a ripple. */
export const Tap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const t = useSec();
  const show = t > at - 0.5 && t < at + 0.7;
  if (!show) return null;
  const arrive = seg(t, at - 0.5, 0.45, E.out);
  const r = clamp((t - at) / 0.5);
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 20 }}>
      <div style={{ position: "absolute", left: -60 - r * 40, top: -60 - r * 40, width: 120 + r * 80, height: 120 + r * 80, borderRadius: "50%", border: `5px solid ${C.gold2}`, opacity: t >= at ? 1 - r : 0 }} />
      <div style={{ position: "absolute", left: -38, top: -38, width: 76, height: 76, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", opacity: arrive, scale: t >= at && t < at + 0.15 ? "0.85" : "1", translate: `${(1 - arrive) * 80}px ${(1 - arrive) * 120}px` }} />
    </div>
  );
};

/** Input field that types its value. */
export const Field: React.FC<{ label: string; value: string; at: number; cps?: number }> = ({ label, value, at, cps = 20 }) => {
  const t = useSec();
  const active = t >= at && t < at + value.length / cps + 0.3;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ border: `3px solid ${active ? C.ink : C.line}`, borderRadius: 14, padding: "18px 22px", fontFamily: SANS, fontSize: 32, color: C.ink, background: "#fff", minHeight: 76 }}>
        {typed(t, value, at, cps)}<span style={{ color: C.gold }}>{caret(t, at, value, cps)}</span>
      </div>
    </div>
  );
};

/** Primary button that changes state after `doneAt`. */
export const Btn: React.FC<{ label: string; done?: string; doneAt?: number; tone?: "ink" | "gold" | "ghost"; size?: number }> = ({ label, done, doneAt = 999, tone = "ink", size = 34 }) => {
  const t = useSec();
  const isDone = t >= doneAt;
  const bg = isDone ? C.ok : tone === "gold" ? C.gold2 : tone === "ghost" ? "#fff" : C.ink;
  const fg = isDone ? "#fff" : tone === "gold" ? C.ink : tone === "ghost" ? C.ink : "#fff";
  return (
    <div style={{ textAlign: "center", padding: "26px 0", borderRadius: 14, background: bg, color: fg, fontFamily: SANS, fontWeight: 700, fontSize: size, border: tone === "ghost" && !isDone ? `3px solid ${C.line}` : "none", scale: t > doneAt - 0.08 && t < doneAt + 0.08 ? "0.96" : "1" }}>
      {isDone && done ? `✓  ${done}` : label}
    </div>
  );
};

export const Chip: React.FC<{ label: string; on?: boolean; size?: number }> = ({ label, on, size = 28 }) => (
  <span style={{ display: "inline-block", padding: "12px 22px", borderRadius: 999, fontFamily: SANS, fontWeight: 700, fontSize: size, background: on ? C.ink : C.sand, color: on ? C.paper : C.muted, marginRight: 10, marginBottom: 10 }}>{label}</span>
);

export const Tick: React.FC<{ p: number; size?: number; color?: string }> = ({ p, size = 56, color = C.ok }) => (
  <div style={{ width: size, height: size, borderRadius: size / 2, background: p > 0.4 ? color : "rgba(14,31,59,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, scale: String(0.7 + 0.3 * Math.min(1, p * 1.2)) }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 40 40"><path d="M8 21 L17 30 L33 11" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} /></svg>
  </div>
);

/** A checklist that ticks item by item. */
export const Checklist: React.FC<{ items: string[]; at: number; gap?: number; dark?: boolean; size?: number }> = ({ items, at, gap = 0.55, dark = true, size = 52 }) => {
  const t = useSec();
  return (
    <div>
      {items.map((s, i) => {
        const p = seg(t, at + i * gap, 0.4);
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 26, padding: "26px 0", borderBottom: `2px solid ${dark ? "rgba(255,255,255,0.12)" : C.line}`, opacity: 0.3 + 0.7 * p }}>
            <Tick p={p} size={72} />
            <span style={{ fontFamily: SERIF, fontSize: size, color: dark ? C.paper : C.ink, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Full-bleed photo with a slow push-in. */
export const Bleed: React.FC<{ src: string; dim?: number; zoom?: [number, number]; dur?: number; pos?: string }> = ({ src, dim = 0, zoom = [1.1, 1.0], dur = 6, pos = "50% 50%" }) => {
  const t = useSec();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(`img/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, scale: String(zoom[0] + (zoom[1] - zoom[0]) * seg(t, 0, dur, E.soft)) }} />
      {dim > 0 && <AbsoluteFill style={{ background: C.deep, opacity: dim }} />}
    </AbsoluteFill>
  );
};

export const Thumb: React.FC<{ src: string; h?: number; r?: number; style?: React.CSSProperties }> = ({ src, h = 200, r = 12, style }) => (
  <div style={{ height: h, borderRadius: r, overflow: "hidden", ...style }}>
    <Img src={staticFile(`img/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; bg?: string; fg?: string; size?: number }> = ({ children, bg = C.ok, fg = "#fff", size = 28 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: bg, color: fg, fontFamily: SANS, fontWeight: 700, fontSize: size, padding: "8px 18px", borderRadius: 999 }}>{children}</span>
);

export const Fine: React.FC<{ children: React.ReactNode; top?: number; dark?: boolean }> = ({ children, top = 1480, dark = true }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: "center", fontFamily: SANS, fontSize: 26, lineHeight: 1.35, color: dark ? "rgba(236,233,225,0.72)" : C.muted }}>{children}</div>
);

/** Pop-in helper for any element. */
export const pop = (t: number, at: number) => ({ opacity: seg(t, at, 0.2), scale: String(0.85 + 0.15 * seg(t, at, 0.35, E.back)) });
export const rise = (t: number, at: number, d = 40) => ({ opacity: seg(t, at, 0.35), translate: `0 ${(1 - seg(t, at, 0.45, E.out)) * d}px` });
