// Export closed-caption files (.srt and .vtt) using the same cues as the on-screen captions.
// Run: npx tsx scripts/export-captions.ts <vid> <out-basename> [untilLineIndex]
import { writeFileSync } from "node:fs";
import { buildCues } from "../src/kit/cues";
import { TIMINGS } from "../src/vo/timings";

const [vid, base, untilIdx] = process.argv.slice(2);
const L = TIMINGS[vid].lines;
const until = untilIdx !== undefined ? L[Number(untilIdx)].start + L[Number(untilIdx)].dur + 0.5 : Infinity;
const cues = buildCues(vid, until);
const ts = (x: number, sep: string) => {
  const ms = Math.max(0, Math.round(x * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(r).padStart(3, "0")}`;
};
const text = (c: (typeof cues)[number]) => c.words.map((w) => w.w).join(" ");
writeFileSync(`${base}.srt`, cues.map((c, i) => `${i + 1}\n${ts(c.start, ",")} --> ${ts(c.end, ",")}\n${text(c)}\n`).join("\n"));
writeFileSync(`${base}.vtt`, "WEBVTT\n\n" + cues.map((c) => `${ts(c.start, ".")} --> ${ts(c.end, ".")}\n${text(c)}\n`).join("\n"));
console.log(vid, cues.length, "cues ->", base + ".srt/.vtt");
