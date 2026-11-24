// Render a still at the middle of every voice line: node scripts/stills.mjs <outdir> [compId...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const ids = process.argv.slice(3).length ? process.argv.slice(3) : ["EmptyNights", "YourRules", "LondonLekki"];
const key = { EmptyNights: "emptyNights", YourRules: "yourRules", LondonLekki: "londonLekki", AgentEarn: "agentEarn", AgentNetwork: "agentNetwork", GuestPhotos: "guestPhotos", GuestDecember: "guestDecember", OwnerExplainer: "explainOwner", ManagerExplainer: "explainManager", GuestExplainer: "explainGuest", HoratioExplainer: "explainHoratio" };
const ts = readFileSync("src/vo/timings.ts", "utf8"); const T = JSON.parse(ts.slice(ts.indexOf("> = ") + 4, ts.lastIndexOf(";")));
const browserExecutable = process.env.REMOTION_BROWSER;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  const frames = T[key[id]].lines.map((l) => Math.round((l.start + l.dur * 0.7) * 30)).concat([composition.durationInFrames - 2]);
  for (const [i, frame] of frames.entries()) {
    await renderStill({ composition, serveUrl, frame, output: `${out}/${id}-${i + 1}.png`, browserExecutable, chromiumOptions, scale: 0.5 });
  }
  console.log(id, frames.join(","));
}
