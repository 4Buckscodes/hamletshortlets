"""Produced music beds and cinematic SFX for the 3D agent videos (all synthesised, no samples).
Run: python3 scripts/make-audio-pro.py"""
import json, os, wave, numpy as np
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(os.path.join(ROOT,'src','vo','timings.ts')).read(); T=json.loads(s[s.index('> = ')+4:s.rindex(';')])
SR=44100; rng=np.random.default_rng(42)
mtof=lambda m:440*2**((m-69)/12)
def tt(d): return np.arange(int(d*SR))/SR
def lp(x,fc):  # FFT low-pass with smooth roll-off
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def hp(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(fc/np.maximum(f,1))**4); return np.fft.irfft(X,len(x))
def env(n,a,d): e=np.exp(-np.arange(n)/SR*d); k=max(1,int(a*SR)); e[:k]*=np.linspace(0,1,k); return e
def write(path,st):
    st=st/max(1e-9,np.abs(st).max())*0.89
    with wave.open(path,'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st.T*32767).astype('<i2').tobytes())
class Bus:
    def __init__(s,n): s.L=np.zeros(n); s.R=np.zeros(n); s.n=n
    def add(s,x,at,pan=0.,g=1.,haas=0.):
        i=int(at*SR)
        if i>=s.n: return
        x=x[:s.n-i]*g; d=int(haas*SR)
        s.L[i:i+len(x)]+=x*min(1,1-pan)
        j=min(s.n,i+d); y=x[:s.n-j]; s.R[j:j+len(y)]+=y*min(1,1+pan)
    def st(s): return np.stack([s.L,s.R])
# instruments
def kick():
    t=tt(.45); f=48+110*np.exp(-t*32); body=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7)
    click=hp(rng.standard_normal(len(t)),3000)*np.exp(-t*400)*0.25
    return np.tanh((body+click)*2.2)*0.7
def logdrum(m):
    t=tt(.6); f=mtof(m)*(1+.45*np.exp(-t*24)); x=np.sin(2*np.pi*np.cumsum(f)/SR)+0.35*np.sin(4*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
    return np.tanh(x*np.exp(-t*5.5)*2.5)*0.6
def sub(m,d): t=tt(d); return np.sin(2*np.pi*mtof(m)*t)*env(len(t),.005,1.5)
def shaker(acc):
    t=tt(.09); return hp(rng.standard_normal(len(t)),6000)*np.exp(-t*(60 if acc else 80))*(1 if acc else .55)
def hat_open(): t=tt(.3); return hp(rng.standard_normal(len(t)),7000)*np.exp(-t*14)*.6
def clap():
    t=tt(.3); x=hp(rng.standard_normal(len(t)),900)*np.exp(-t*20)
    for d in (.01,.021,.033): k=int(d*SR); x[k:]+=x[:-k]*.5
    return lp(x,6000)*.6
def rim(): t=tt(.08); return (np.sin(2*np.pi*1700*t)+.6*np.sin(2*np.pi*2600*t))*np.exp(-t*90)*.5
def conga(hi): t=tt(.25); f=(380 if hi else 260)*(1+.2*np.exp(-t*40)); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*16)*.6
def saw(f,t,det):
    out=np.zeros(len(t))
    for k,d in enumerate(np.linspace(-det,det,5)):
        ph=(f*2**(d/1200)*t+rng.uniform())%1; out+=2*ph-1
    return out/5
def pad(ch,d,cut=2200):
    t=tt(d); x=sum(saw(mtof(m),t,14) for m in ch)/len(ch); e=np.ones(len(t)); a=int(.08*SR); e[:a]=np.linspace(0,1,a); e[-a:]*=np.linspace(1,0,a)
    return lp(x,cut)*e
def bell(m,d=1.4):
    t=tt(d); f=mtof(m); mod=np.sin(2*np.pi*f*3.5*t)*2.2*np.exp(-t*6)
    return np.sin(2*np.pi*f*t+mod)*np.exp(-t*3.2)*np.minimum(1,t*800)
def produce(vid,bpm,prog,drop_line,motif):
    v=T[vid]; L=v['lines']; dur=v['total']; n=int(dur*SR); b16=60/bpm/4
    drop=L[drop_line]['start']-0.05; end=L[-1]['start']+0.2
    drums=Bus(n); bass=Bus(n); chords=Bus(n); lead=Bus(n)
    sc=np.ones(n)  # sidechain envelope
    bar=0; t0=0.0
    while t0<dur-0.5:
        ch,root=prog[bar%len(prog)]
        for s16 in range(16):
            at=t0+s16*b16+(b16*0.12 if s16%2 else 0)
            if at>=dur: break
            if s16 in (0,4,8,12):
                drums.add(kick(),at,0,1.0)
                i=int(at*SR); k=int(.22*SR); e=1-0.65*np.exp(-np.arange(min(k,n-i))/SR*14); sc[i:i+len(e)]=np.minimum(sc[i:i+len(e)],e)
            drums.add(shaker(s16%4==2),at,.35 if s16%2 else -.35,.35)
            if s16 in (4,12): drums.add(clap(),at,0,.55,.008)
            if s16 in (0,3,6,10,12): drums.add(rim(),at,.4,.3)
            if s16 in (2,6,10,14): drums.add(hat_open(),at,-.2,.22)
            if s16 in (3,7,11,14): drums.add(conga(s16 in (7,14)),at,-.45,.4)
            if s16 in (0,6,10): drums.add(logdrum(root+12+(7 if s16==10 else 0)),at,0,.55)
            if s16 in (0,3,8,11,14): bass.add(sub(root,b16*2.2),at,0,.55)
        chords.add(pad(ch,b16*16),t0,0,.5,0.012)
        for k,(st,m) in enumerate(motif):
            lead.add(bell(m+12*(bar%2==1 and k==len(motif)-1)),t0+st*b16,.3 if k%2 else -.3,.22,0.01)
        t0+=b16*16; bar+=1
    full=drums.st()+bass.st()*sc+chords.st()*sc*0.8+lead.st()*0.8
    # intro: band-limited until the drop, then the whole mix opens up; drums thin out after the last line
    filt=np.stack([lp(full[0],700),lp(full[1],700)])
    x=np.arange(n)/SR; w=np.clip((x-drop)/0.25,0,1)
    out=filt*(1-w)+full*w
    tail=np.clip((x-end)/1.2,0,1); out=out*(1-tail*0.55)
    # final hold chord
    fin=Bus(n); fin.add(pad(prog[0][0],dur-end,1800),end,0,.6,0.012); out+=fin.st()*tail
    # bus glue: gentle RMS compression + soft clip
    rms=np.sqrt(np.convolve(out.mean(0)**2,np.ones(2048)/2048,'same'))+1e-6; g=np.minimum(1,(0.18/rms)**0.35); out=out*g
    out=np.tanh(out*1.6)
    fo=np.ones(n); k=int(1.2*SR); fo[-k:]=np.linspace(1,0,k)**1.5; out*=fo
    write(os.path.join(ROOT,'public','audio',f'{vid}-music.wav'),out)
PROG=[([53,56,60,63,67],41),([49,53,56,60,63],37),([56,60,63,67],44),([51,55,58,62],39)]   # Fm9, Dbmaj7, Ab, Eb
produce('agentEarn',112,PROG,1,[(0,72),(3,75),(6,79),(10,77),(13,75)])
produce('agentNetwork',108,PROG,1,[(0,75),(2,79),(6,80),(8,79),(12,72)])
# SFX
def sfx(name,x,stereo=None):
    st=stereo if stereo is not None else np.stack([x,x]); write(os.path.join(ROOT,'public','audio',f'sfx-{name}.wav'),st)
t=tt(1.6); boom=np.sin(2*np.pi*np.cumsum(38+70*np.exp(-t*9))/SR)*np.exp(-t*2.6); crack=lp(rng.standard_normal(len(t)),2500)*np.exp(-t*18)
sfx('impact',np.tanh((boom+crack*.6)*1.8))
t=tt(1.0); sw=np.sin(2*np.pi*np.cumsum(200+1800*(t/1.0)**2)/SR)*.25; nz=hp(rng.standard_normal(len(t)),1500)*(t/1.0)**2.2
sfx('riser',(sw+nz)*np.minimum(1,(1-t/1.0)*30))
t=tt(.55); nz=rng.standard_normal(len(t)); bell_=np.sin(np.pi*t/.55)**2; a=lp(nz,2500)*bell_; pan=np.linspace(-1,1,len(t))
sfx('swoosh',None,np.stack([a*(1-pan)/2*1.5,a*(1+pan)/2*1.5]))
t=tt(1.6); sfx('chime',bell(88,1.6)+.6*np.concatenate([np.zeros(int(.09*SR)),bell(95,1.6)[:len(t)-int(.09*SR)]]))
t=tt(.5); sfx('clink',sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*d) for f,a,d in [(2350,1,14),(3720,.7,18),(5110,.5,22),(6830,.3,28)])*np.minimum(1,t*3000))
t=tt(.35); sfx('land',np.sin(2*np.pi*np.cumsum(70+60*np.exp(-t*30))/SR)*np.exp(-t*12)+lp(rng.standard_normal(len(t)),1200)*np.exp(-t*40)*.3)
t=tt(.12); sfx('spark',np.sin(2*np.pi*(2600+1500*t/.12)*t)*np.exp(-t*40))
# guest videos: warmer major-key beds
WARM=[([56,60,63,67,70],44),([53,56,60,63,67],41),([49,53,56,60,63],37),([51,55,58,63],39)]   # Abmaj9, Fm9, Dbmaj9, Eb
import sys
if 'guestPhotos' in T: produce('guestPhotos',100,WARM,1,[(0,75),(3,79),(6,80),(10,82),(13,79)])
if 'guestDecember' in T: produce('guestDecember',104,WARM,1,[(0,79),(2,80),(6,82),(8,84),(12,80)])
# explainers: calm, warm, unobtrusive under a long voice-over
for vid,bpm in (('explainOwner',96),('explainManager',100),('explainGuest',98),('explainHoratio',104),('explainAgent',102)):
    if vid in T: produce(vid,bpm,WARM,1,[(0,75),(4,79),(8,80),(12,79)])
print('pro audio ok')
