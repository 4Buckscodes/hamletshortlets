#!/usr/bin/env python3
"""Mix recorded voiceover lines over the music bed, with the music ducking under the voice.

Put one recording per line in motion/voiceover/ named 01.wav ... 09.wav (wav, mp3 or m4a also fine
if ffmpeg can read it). Missing lines are skipped. Then run from the motion folder:
    python3 mix-voiceover.py            # writes hamlet-owners-day-vo.mp4
Cue times below match the on-screen captions."""
import subprocess, glob, os, wave, numpy as np
SR=44100
CUES={1:(0.5,'Lagos. Early morning.'),2:(2.6,'Your flat is empty again.'),3:(4.9,'No bookings. No income.'),
 4:(7.2,'Then your phone buzzes.'),5:(9.8,'A guest sends a request.'),6:(12.3,'They pay only after you accept.'),
 7:(14.4,'Every listing is verified before it goes live.'),8:(17.1,'Your nights start filling up.'),
 9:(19.5,'List your Lagos stay on HAMLET. Join as a partner. No wahala.')}
def load(p):
    tmp='/tmp/_vo.wav'; subprocess.run(['ffmpeg','-y','-loglevel','error','-i',p,'-ac','1','-ar',str(SR),'-af','loudnorm=I=-16:TP=-2,silenceremove=1:0:-50dB',tmp],check=True)
    with wave.open(tmp) as w: return np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
def music():
    with wave.open('assets/soundtrack-day2.wav') as w: a=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
    return a.reshape(-1,2)
m=music(); N=len(m); vo=np.zeros(N); used=[]
for k,(at,txt) in CUES.items():
    f=next(iter(glob.glob(f'voiceover/{k:02d}.*')),None)
    if not f: continue
    v=load(f); i=int(at*SR); 
    if i+len(v)>N: v=v[:N-i]
    vo[i:i+len(v)]+=v; used.append(k)
if not used: raise SystemExit('No recordings found in motion/voiceover/ (01.wav ... 09.wav).')
env=np.abs(vo); win=int(.25*SR); env=np.convolve(env,np.ones(win)/win,'same'); duck=1-.6*np.clip(env*12,0,1)
duck=np.convolve(duck,np.ones(int(.12*SR))/int(.12*SR),'same')
mix=m*duck[:,None]*0.9+vo[:,None]*1.0
mix=np.tanh(mix*1.1); mix/=max(1e-9,np.abs(mix).max())/.89
with wave.open('assets/mix-vo.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','hamlet-owners-day-video.mp4','-i','assets/mix-vo.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t','24','-movflags','+faststart','hamlet-owners-day-vo.mp4'],check=True)
print('Mixed lines:',used,'-> hamlet-owners-day-vo.mp4')
