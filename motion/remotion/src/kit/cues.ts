import { TIMINGS, VoLine, VoWord } from "../vo/timings";

export type Cue = { start: number; end: number; words: { w: string; s: number; e: number }[] };

const MAX_CHARS = 34;
const ONE_CUE = 42;

/** Word timings for a line: exact when the voice was generated with timings, otherwise spread by length. */
const wordsOf = (l: VoLine): VoWord[] => {
  if (l.words && l.words.length) return l.words;
  const tw = l.text.split(" ");
  const wts = tw.map((w) => w.replace(/[^\w']/g, "").length + 2);
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0;
  return tw.map((w, i) => {
    const s = (acc / tot) * l.dur; acc += wts[i];
    return { w, s, e: (acc / tot) * l.dur };
  });
};

/**
 * Split every voice line into short caption cues: a new cue at a sentence end, after a comma
 * once the cue has some length, or when it would pass ~30 characters (two short lines at most).
 * Times are absolute (seconds from the start of the video).
 */
export const buildCues = (vid: string, until = Infinity): Cue[] => {
  const L = TIMINGS[vid].lines;
  const cues: Cue[] = [];
  L.forEach((l, li) => {
    if (l.start >= until) return;
    const ws = wordsOf(l).map((w) => ({ w: w.w, s: l.start + w.s, e: l.start + w.e }));
    // split into sentences, then each long sentence into balanced phrases (preferring a break after a comma)
    const sentences: (typeof ws)[] = [];
    let sent: typeof ws = [];
    ws.forEach((w) => { sent.push(w); if (".?!".includes(w.w.slice(-1))) { sentences.push(sent); sent = []; } });
    if (sent.length) sentences.push(sent);
    const len = (a: typeof ws) => a.map((x) => x.w).join(" ").length;
    for (let i = 0; i < sentences.length - 1; i++) {
      if (len(sentences[i]) <= 14 && len(sentences[i]) + 1 + len(sentences[i + 1]) <= ONE_CUE) { sentences[i] = sentences[i].concat(sentences[i + 1]); sentences.splice(i + 1, 1); i--; }
    }
    for (const sw of sentences) {
      const T = len(sw);
      if (T <= ONE_CUE) { cues.push({ start: sw[0].s, end: sw[sw.length - 1].e, words: sw }); continue; }
      const n = Math.ceil(T / MAX_CHARS), target = T / n;
      let cur: typeof ws = [];
      sw.forEach((w, i) => {
        cur.push(w);
        const L0 = len(cur), rest = sw.length - i - 1;
        const comma = w.w.endsWith(",");
        if (rest > 0 && ((comma && L0 >= target * 0.6) || L0 >= target * 0.92)) { cues.push({ start: cur[0].s, end: cur[cur.length - 1].e, words: cur }); cur = []; }
      });
      if (cur.length) {
        const prev = cues[cues.length - 1];
        if (cur.length === 1 && prev && prev.words[0].s >= sw[0].s && len(prev.words) + 1 + cur[0].w.length <= ONE_CUE) { prev.words.push(cur[0]); prev.end = cur[0].e; }
        else cues.push({ start: cur[0].s, end: cur[cur.length - 1].e, words: cur });
      }
    }
    // hold each cue until the next one starts (or a short tail), never past the next line
    const nextLine = L[li + 1]?.start ?? Infinity;
    for (let k = cues.length - 1; k >= 0 && cues[k].start >= l.start; k--) {
      const nextCue = cues[k + 1];
      const hold = nextCue && nextCue.start < nextLine ? nextCue.start - 0.02 : Math.min(cues[k].end + 0.5, nextLine - 0.05);
      cues[k].end = Math.max(cues[k].end, hold);
    }
  });
  return cues;
};

