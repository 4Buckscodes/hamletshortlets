# Warm highlife / Afro-fusion bed for the owner's-day video. Built to sit under a voice:
# mellow mid-range, round log drum, soft shaker, palm-wine-style guitar, Rhodes-like keys.
import numpy as np, wave
SR=44100; DUR=24.0; N=int(SR*(DUR+1)); t=np.arange(N)/SR
rng=np.random.default_rng(21); L=np.zeros(N); R=np.zeros(N)
mtof=lambda m:440*2**((m-69)/12)
def add(sig,at,pan=0.0,g=1.0):
    i=int(at*SR)
    if i>=N: return
    s=sig[:N-i]*g; L[i:i+len(s)]+=s*(1-max(pan,0)); R[i:i+len(s)]+=s*(1+min(pan,0))
BPM=98; sb=60/BPM/4
def ks(m,dur=1.1,bright=.5):                       # Karplus-Strong: plucked guitar
    f=mtof(m); n=int(dur*SR); d=int(SR/f); buf=rng.uniform(-1,1,d)*np.hanning(d)**.3; out=np.zeros(n)
    for i in range(n):
        j=i%d; nxt=(buf[j]+buf[(j+1)%d])*.5*(.996-.002*(1-bright)); out[i]=buf[j]; buf[j]=nxt
    return out*np.minimum(1,np.arange(n)/300)
def keys(m,dur=1.6):                               # soft electric piano
    tt=np.arange(int(dur*SR))/SR; f=mtof(m)
    return (np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*5)+.12*np.sin(2*np.pi*4*f*tt)*np.exp(-tt*12))*np.exp(-tt*2.2)*np.minimum(1,tt*300)
def logdrum(m):
    n=int(.55*SR); tt=np.arange(n)/SR; f=mtof(m)*(1+.35*np.exp(-tt*28))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*5.5)*np.minimum(1,tt*500)
def noise(n,lp): x=rng.standard_normal(n); return x-np.convolve(x,np.ones(lp)/lp,'same')
def shaker(): n=int(.07*SR); tt=np.arange(n)/SR; return noise(n,5)*np.exp(-tt*55)*np.minimum(1,tt*300)
def conga():
    n=int(.22*SR); tt=np.arange(n)/SR; f=320*(1+.25*np.exp(-tt*40)); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*22)
def bell(f,dur=2.4):
    tt=np.arange(int(dur*SR))/SR
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*d) for r,a,d in [(1,1,1.6),(2.76,.3,3),(5.4,.12,5)])*np.minimum(1,tt*500)
# harmony: Fmaj7 | Em7 | Dm7 | Cmaj7 per bar (bars of 16 sixteenths)
prog=[([53,57,60,64],41,[72,69,65,69]),([52,55,59,62],40,[71,67,64,67]),([50,53,57,60],38,[69,65,62,65]),([48,52,55,59],36,[67,64,60,64])]
bars=int(DUR/(sb*16))+2
for b in range(bars):
    t0=b*sb*16; ch,root,arp=prog[b%4]
    if t0>=DUR: break
    inten=0 if t0<2.0 else (1 if t0<4.4 else 2)
    if t0>=21.4: inten=0 if t0>=22.8 else 1
    for s in range(16):
        at=t0+s*sb
        if at>=DUR: break
        sw=(sb*.28 if s%2 else 0)                # swing
        a=at+sw
        if inten>=1 and s%2==0: add(shaker(),a,.3,.07 if s%4 else .05)
        if inten>=1 and s in (0,10): add(logdrum(root-12),at,0,.42)
        if inten>=2:
            if s in (6,14): add(logdrum(root-12+7),at,0,.30)
            if s in (3,7,11,15): add(conga(),a,-.3,.10)
        # guitar arpeggio (palm-wine style)
        if inten>=1 and s in (0,3,6,8,11,14):
            m=arp[[0,1,2,3,2,1][[0,3,6,8,11,14].index(s)]]; add(ks(m,.9),a,.35,.12)
        if inten>=2 and s==0:
            for k,m in enumerate(ch): add(keys(m,2.2),at+k*.012,-.2,.045)
        if inten==0 and s==0:
            for k,m in enumerate(ch): add(keys(m,2.6),at+k*.02,-.2,.04)
# soft pad underneath
for s,ch in [(0,[53,57,60,64]),(9.0,[50,53,57,60]),(14.0,[48,52,55,59]),(18.6,[53,57,60,64,69])]:
    e=s+6; n=int(e*SR-s*SR); tt=np.arange(n)/SR; pad=np.zeros(n)
    for m in ch:
        for d in (-.12,.12): pad+=np.sin(2*np.pi*mtof(m-12)*2**(d/100)*tt+rng.uniform(0,6))
    en=np.ones(n); na=int(1.5*SR); en[:na]=np.linspace(0,1,na)**2; en[-na:]*=np.linspace(1,0,na)**2; add(pad*en,s,0,.018)
# story cues (match picture)
def buzz(): n=int(.9*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*170*tt)*(np.sin(2*np.pi*14*tt)>0)*np.minimum(1,tt*200)*np.exp(-tt*1.2)
add(buzz(),7.1,0,.2)
add(bell(mtof(84)),12.2,0,.09); add(bell(mtof(91)),12.35,.2,.06)
add(bell(mtof(88)),14.9,0,.08)
for i,m in enumerate([84,88,91]): add(bell(mtof(m),1.2),17.3+i*.35,0,.06)
add(bell(mtof(88)),20.6,.2,.07); add(bell(mtof(95)),21.5,-.2,.05); add(bell(mtof(84)),21.5,0,.06)
def whoosh(d=.8):
    n=int(d*SR); k=np.convolve(rng.standard_normal(n),np.ones(50)/50,'same'); tt=np.linspace(0,1,n); return k*np.sin(np.pi*tt)**1.5*1.4
for s in (4.4,9.0,14.0,18.6): add(whoosh(),s,0,.16)
fo=np.ones(N); i0=int((DUR-1.4)*SR); fo[i0:]=np.linspace(1,0,N-i0)**1.5; fi=np.minimum(1,t/.5); L*=fo*fi; R*=fo*fi
def rev(x):
    y=x.copy()
    for d,g in [(.037,.3),(.067,.25),(.109,.2),(.163,.15)]:
        k=int(d*SR); y[k:]+=x[:-k]*g
    return y
L=rev(L); R=rev(np.roll(R,int(.009*SR)))
m=np.tanh(np.stack([L,R])*1.4); m=m/np.abs(m).max()*.7
with wave.open('assets/soundtrack-day2.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m.T*32767).astype('<i2').tobytes())
