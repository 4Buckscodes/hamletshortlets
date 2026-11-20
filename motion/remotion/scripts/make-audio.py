"""Synthesise the three music beds and the shared sound effects (no samples, no licences).
Music is timed to the voice lines in src/vo/timings.ts. Run: python3 scripts/make-audio.py"""
import json, os, wave, numpy as np
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(os.path.join(ROOT,'src','vo','timings.ts')).read(); T=json.loads(s[s.index('> = ')+4:s.rindex(';')])
SR=44100; rng=np.random.default_rng(5)
mtof=lambda m:440*2**((m-69)/12)
def save(path,st):
    st=np.tanh(st*1.3); st=st/np.abs(st).max()*0.8
    with wave.open(path,'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st.T*32767).astype('<i2').tobytes())
class Mix:
    def __init__(s,dur): s.N=int(SR*dur); s.L=np.zeros(s.N); s.R=np.zeros(s.N)
    def add(s,sig,at,pan=0.,g=1.):
        i=int(at*SR)
        if i>=s.N or i<0: return
        x=sig[:s.N-i]*g; s.L[i:i+len(x)]+=x*(1-max(pan,0)); s.R[i:i+len(x)]+=x*(1+min(pan,0))
    def out(s,fade_in=.3,fade_out=1.5):
        n=s.N; e=np.ones(n); a=int(fade_in*SR); e[:a]=np.linspace(0,1,a); b=int(fade_out*SR); e[-b:]*=np.linspace(1,0,b)**1.5
        L,R=s.L*e,s.R*e
        def rev(x):
            y=x.copy()
            for d,g in [(.037,.28),(.067,.22),(.109,.18),(.163,.14),(.241,.1)]:
                k=int(d*SR); y[k:]+=x[:-k]*g
            return y
        return np.stack([rev(L),rev(np.roll(R,int(.009*SR)))])
def tt(d): return np.arange(int(d*SR))/SR
def noise(n,lp): x=rng.standard_normal(n); return x-np.convolve(x,np.ones(lp)/lp,'same')
def lowpass(x,k): return np.convolve(x,np.ones(k)/k,'same')
def kick(): t=tt(.35); f=45+90*np.exp(-t*28); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def logdrum(m,d=.55): t=tt(d); f=mtof(m)*(1+.35*np.exp(-t*28)); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*5.5)*np.minimum(1,t*500)
def shaker(): t=tt(.07); return noise(len(t),5)*np.exp(-t*55)*np.minimum(1,t*300)
def hat(): t=tt(.05); return noise(len(t),3)*np.exp(-t*90)
def clap():
    t=tt(.25); x=noise(len(t),14)*np.exp(-t*22)
    for d in (.012,.024): k=int(d*SR); x[k:]+=x[:-k]*.6
    return x
def conga(): t=tt(.22); f=320*(1+.25*np.exp(-t*40)); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*22)
def ks(m,d=.9):
    f=mtof(m); n=int(d*SR); p=int(SR/f); buf=rng.uniform(-1,1,p); out=np.zeros(n)
    for i in range(n):
        j=i%p; out[i]=buf[j]; buf[j]=(buf[j]+buf[(j+1)%p])*.5*.996
    return out*np.minimum(1,np.arange(n)/300)
def keys(m,d=1.8): t=tt(d); f=mtof(m); return (np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*2*f*t)*np.exp(-t*5)+.1*np.sin(2*np.pi*4*f*t)*np.exp(-t*12))*np.exp(-t*2.2)*np.minimum(1,t*300)
def pad(ch,d,g=1.):
    t=tt(d); x=np.zeros(len(t))
    for m in ch:
        for det in (-.12,.12): x+=np.sin(2*np.pi*mtof(m)*2**(det/100)*t+rng.uniform(0,6))+.15*np.sin(2*np.pi*2*mtof(m)*t)
    e=np.ones(len(t)); a=min(len(t)//3,int(1.2*SR)); e[:a]=np.linspace(0,1,a)**2; e[-a:]*=np.linspace(1,0,a)**2
    return x*e*g
def tick(): t=tt(.03); return np.sin(2*np.pi*2400*t)*np.exp(-t*220)
def groove(m,start,end,bpm,prog,full_from,density=2,logs=True):
    sb=60/bpm/4; b=0; t0=start
    while t0<end:
        ch,root,arp=prog[b%len(prog)]
        for s in range(16):
            at=t0+s*sb
            if at>=end: break
            sw=sb*.25 if s%2 else 0; full=at>=full_from
            if s%2==0: m.add(shaker(),at+sw,.3,.06 if s%4 else .045)
            if full:
                if s in (0,10): m.add(kick(),at,0,.5)
                if logs and s in (0,6,10,14): m.add(logdrum(root-12+(7 if s==14 else 0)),at,0,.34)
                if s in (4,12): m.add(clap(),at,.1,.16)
                if density>1 and s in (3,7,11,15): m.add(conga(),at+sw,-.3,.09)
                if s in (0,3,6,8,11,14): m.add(ks(arp[[0,1,2,3,2,1][[0,3,6,8,11,14].index(s)]],.8),at+sw,.35,.09)
                if s==0:
                    for k,n in enumerate(ch): m.add(keys(n,2.0),at+k*.012,-.2,.035)
        t0+=sb*16; b+=1
PROG=[([53,57,60,64],41,[72,69,65,69]),([52,55,59,62],40,[71,67,64,67]),([50,53,57,60],38,[69,65,62,65]),([48,52,55,59],36,[67,64,60,64])]
PROG_MIN=[([50,53,57,60],38,[69,65,62,65]),([46,50,53,57],34,[70,65,62,65]),([48,52,55,58],36,[67,64,60,64]),([45,48,52,55],33,[64,60,57,60])]
os.makedirs(os.path.join(ROOT,'public','audio'),exist_ok=True)

# 1. Empty nights: clock ticks over a cold drone, then the groove lifts when HAMLET arrives (line 4)
v=T['emptyNights']; L=v['lines']; m=Mix(v['total']); lift=L[3]['start']-0.4
for i in range(int(lift/0.5)): m.add(tick(),0.25+i*0.5,.2 if i%2 else -.2,.18)
m.add(pad([45,52,57],lift+1.0,1.0),0,0,.022)
m.add(np.sin(2*np.pi*55*tt(lift+.5))*np.minimum(1,tt(lift+.5)/2),0,0,.05)
m.add(pad([53,57,60,64,69],v['total']-lift,1.0),lift,0,.018)
groove(m,lift,v['total']-1.0,104,PROG,lift+0.05)
save(os.path.join(ROOT,'public','audio','emptyNights-music.wav'),m.out())

# 2. Your rules: heartbeat tension under the questions, confident minor groove from line 3
v=T['yourRules']; L=v['lines']; m=Mix(v['total']); turn=L[2]['start']-0.3
hb=lambda: logdrum(31,.4)
for i in range(int(turn/0.75)): m.add(hb(),0.2+i*0.75,0,.35); m.add(hb(),0.2+i*0.75+.22,0,.22)
m.add(pad([38,45,50,53],turn+1.0),0,0,.02)
m.add(pad([50,57,62,65],v['total']-turn),turn,0,.016)
groove(m,turn,v['total']-1.0,96,PROG_MIN,turn+0.05,density=2)
save(os.path.join(ROOT,'public','audio','yourRules-music.wav'),m.out())

# 3. London to Lekki: light, travelling guitar from the first second, full groove on line 3
v=T['londonLekki']; L=v['lines']; m=Mix(v['total']); full=L[2]['start']-0.2
groove(m,0.0,v['total']-1.0,100,PROG,full,density=2)
m.add(pad([53,57,60,64],v['total']),0,0,.016)
save(os.path.join(ROOT,'public','audio','londonLekki-music.wav'),m.out(fade_in=.15))

# shared sound effects (mono -> stereo)
def sfx(name,x):
    x=x/np.abs(x).max()*.9; st=np.stack([x,x]); 
    with wave.open(os.path.join(ROOT,'public','audio',f'sfx-{name}.wav'),'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st.T*32767).astype('<i2').tobytes())
t=tt(.6); sfx('whoosh',lowpass(rng.standard_normal(len(t)),30)*np.sin(np.pi*t/.6)**2)
t=tt(.12); sfx('pop',np.sin(2*np.pi*(500+700*np.exp(-t*40))*t)*np.exp(-t*35))
t=tt(.05); sfx('tap',noise(len(t),4)*np.exp(-t*120)+np.sin(2*np.pi*1800*t)*np.exp(-t*90)*.5)
t=tt(1.2); sfx('ding',sum(a*np.sin(2*np.pi*1320*r*t)*np.exp(-t*d) for r,a,d in [(1,1,2),(2.76,.3,4),(5.4,.1,6)]))
t=tt(.7); sfx('notify',np.concatenate([np.sin(2*np.pi*988*tt(.12))*np.exp(-tt(.12)*20),np.sin(2*np.pi*1319*tt(.5))*np.exp(-tt(.5)*6)]))
t=tt(.6); sfx('buzz',np.sin(2*np.pi*170*t)*(np.sin(2*np.pi*14*t)>0)*np.exp(-t*2))
t=tt(.18); sfx('lock',noise(len(t),3)*np.exp(-t*60)*.6+np.sin(2*np.pi*220*t)*np.exp(-t*30))
t=tt(.35); sfx('thud',np.sin(2*np.pi*np.cumsum(60+80*np.exp(-t*30))/SR)*np.exp(-t*10))
t=tt(.25); sfx('stamp',np.sin(2*np.pi*np.cumsum(90+120*np.exp(-t*40))/SR)*np.exp(-t*16)+noise(len(t),6)*np.exp(-t*50)*.4)
print('ok')
