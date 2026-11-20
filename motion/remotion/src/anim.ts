import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

type Ease = (t: number) => number;
export const E: Record<string, Ease> = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: (t) => t,
};

/** 0 -> 1 progress between seconds a and a+d, eased. `t` is local scene time in seconds. */
export const seg = (t: number, a: number, d: number, ease: Ease = E.out) =>
  ease(clamp((t - a) / d));

/** Caption-style fade in at a, out before b. Returns opacity and rise offset. */
export const fadeInOut = (t: number, a: number, b: number, d = 0.45) => {
  const i = seg(t, a, d, E.soft);
  const o = 1 - seg(t, b - d, d, E.soft);
  return { opacity: Math.min(i, o), y: (1 - i) * 30 };
};

export const rise = (t: number, a: number, d = 0.7) => {
  const p = seg(t, a, d);
  return { opacity: p, y: (1 - p) * 24 };
};

/** Deterministic skyline rectangles. */
export const skyline = (baseY: number, seed: number, tall: boolean) => {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  let x = -20;
  let s = seed;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (x < 1100) {
    const w = 60 + r() * 90;
    const h = (tall ? 180 : 90) + r() * (tall ? 420 : 200);
    rects.push({ x, y: baseY - h, w, h });
    x += w + 4;
  }
  return rects;
};

export { interpolate };
