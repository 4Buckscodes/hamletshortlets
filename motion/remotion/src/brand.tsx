import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const C = {
  ink: "#0e1f3b", deep: "#091528", paper: "#f4f3ef", sand: "#eae8e1",
  line: "#dcd9d0", gold: "#b8923a", gold2: "#d4b268", muted: "#5a6578",
  surface: "#faf9f6", night: "#16223a", ok: "#256b43", mist: "#a5aebf",
};

loadFont({ family: "Newsreader", url: staticFile("fonts/newsreader-latin-wght.woff2"), weight: "200 800" });
loadFont({ family: "Hanken", url: staticFile("fonts/hanken-grotesk-latin-wght.woff2"), weight: "100 900" });

export const SERIF = "Newsreader, Georgia, serif";
export const SANS = "Hanken, system-ui, sans-serif";

export const Mark: React.FC<{ stem: string; bar: string; size: number }> = ({ stem, bar, size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path d="M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z" fill={stem} />
    <path d="M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z" fill={stem} />
    <path d="M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z" fill={bar} />
  </svg>
);

export const Caption: React.FC<{ top: number; opacity: number; y: number; children: React.ReactNode }> = ({ top, opacity, y, children }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top, textAlign: "center", opacity, translate: `0 ${y}px` }}>
    <span style={{
      display: "inline-block", background: C.paper, color: C.ink, fontFamily: SERIF, fontWeight: 480,
      fontSize: 66, lineHeight: 1.12, letterSpacing: "-0.02em", padding: "26px 40px 30px", borderRadius: 12,
    }}>{children}</span>
  </div>
);

/** Left-to-right reveal used when a scene takes over from the previous one. */
export const wipeClip = (t: number) => `inset(0 ${(1 - clampWipe(t)) * 100}% 0 0)`;
import { seg, E } from "./anim";
const clampWipe = (t: number) => seg(t, 0, 0.8, E.inOut);
