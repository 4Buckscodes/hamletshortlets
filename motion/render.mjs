import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const FPS=30, out=process.argv[2]||'hamlet-owner-invite.mp4', only=process.argv[3]; // only = comma list of seconds for stills
const dir=resolve(process.argv[4]||'/tmp/hamlet-frames');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+resolve(process.env.SRC||'owner-invite.html'));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true});
if(only){for(const s of only.split(',')){await p.evaluate(t=>render(t),+s);await p.screenshot({path:`${dir}/still-${s}.png`});}}
else{const D=await p.evaluate(()=>DURATION);const n=Math.round(D*FPS);
 for(let i=0;i<n;i++){await p.evaluate(t=>render(t),i/FPS);await p.screenshot({path:`${dir}/f${String(i).padStart(5,'0')}.png`});}
 const r=spawnSync('ffmpeg',['-y','-framerate',String(FPS),'-i',`${dir}/f%05d.png`,'-c:v','libx264','-pix_fmt','yuv420p','-crf','16','-preset','slow','-movflags','+faststart',out],{stdio:'inherit'});}
await b.close();
