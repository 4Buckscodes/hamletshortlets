import React from "react";
import { C, SANS } from "../brand";
import { seg } from "../anim";
import { buildCues } from "./cues";
import { useSec } from "./kit";

/** On-screen captions: one short phrase at a time, the spoken word highlighted in time with the voice. */
export const Captions: React.FC<{ vid: string; until?: number; top?: number; size?: number }> = ({ vid, until = Infinity, top = 1610, size = 54 }) => {
  const t = useSec();
  const cues = React.useMemo(() => buildCues(vid, until), [vid, until]);
  const cue = cues.find((c) => t >= c.start - 0.06 && t < c.end);
  if (!cue || t >= until) return null;
  const inP = seg(t, cue.start - 0.06, 0.12);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 940, background: "rgba(9,21,40,0.88)", borderRadius: 20, padding: "20px 34px 24px", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 1.2, letterSpacing: "-0.01em", color: "#ffffff", opacity: inP, translate: `0 ${(1 - inP) * 10}px` }}>
        {cue.words.map((w, i) => {
          const active = t >= w.s - 0.03 && t < w.e + 0.04;
          return (
            <span key={i} style={{ display: "inline-block", marginRight: i < cue.words.length - 1 ? "0.24em" : 0, color: active ? C.gold2 : "#ffffff" }}>{w.w}</span>
          );
        })}
      </div>
    </div>
  );
};
