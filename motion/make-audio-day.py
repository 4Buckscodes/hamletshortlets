import numpy as np, wave
SR=44100; DUR=24.0; N=int(SR*(DUR+1)); t=np.arange(N)/SR
rng=np.random.default_rng(11); L=np.zeros(N); R=np.zeros(N)
def mtof(m): return 440*2**((m-69)/12)
def add(sig,at,pan=0.0,g=1.0):
    i=int(at*SR)
    if i>=N: return
    s=sig[:N-i]*g; L[i:i+len(s)]+=s*(1-max(pan,0)); R[i:i+len(s)]+=s*(1+min(pan,0))
BPM=104; sb=60/BPM/4  # 16th
def kick():
    n=int(.35*SR); tt=np.arange(n)/SR; f=45+90*np.exp(-tt*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
def logdrum(m):
    n=int(.5*SR); tt=np.arange(n)/SR; f=mtof(m)*(1+.5*np.exp(-tt*30))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*6)*np.minimum(1,tt*600)
def noise(n,lp):
    x=rng.standard_normal(n); k=np.ones(lp)/lp; return x-np.convolve(x,k,'same')
def hat(open_=False):
    n=int((.2 if open_ else .05)*SR); tt=np.arange(n)/SR; return noise(n,6)*np.exp(-tt*(18 if open_ else 90))
def clap():
    n=int(.25*SR); tt=np.arange(n)/SR; x=noise(n,14)*np.exp(-tt*22); 
    for d in (.012,.024): k=int(d*SR); x[k:]+=x[:-k]*.6
    return x
def shaker():
    n=int(.09*SR); tt=np.arange(n)/SR; return noise(n,4)*np.exp(-tt*45)*np.minimum(1,tt*300)
def pluck(m,dur=.7):
    n=int(dur*SR); tt=np.arange(n)/SR; f=mtof(m)
    return (np.sin(2*np.pi*f*tt)+.5*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*10)+.2*np.sin(2*np.pi*3*f*tt)*np.exp(-tt*14))*np.exp(-tt*7)*np.minimum(1,tt*500)
# groove starts at 0.0 light, full from 4.4 (flat) on; drops out for the CTA tail
bars=int(DUR/(sb*16))+1
roots=[50,48,53,48]   # Dm, C, F, C  (bass root in octave)
riff=[0,3,5,3,7,5,3,0]  # d pentatonic degrees (semitones from root-ish)
dm=[62,65,67,69,72,74,77]
for b in range(bars):
    t0=b*sb*16; full=t0>=4.0 and t0<22.2
    for s in range(16):
        at=t0+s*sb
        if at>=DUR: break
        if t0>=2.0 or s%4==0:
            if s%2==0 or t0>=4.0: add(shaker(),at,0.3 if s%4 else -0.3,.10 if s%2 else .06)
        if full:
            if s in (0,6,10): add(kick(),at,0,.55)
            if s in (4,12): add(clap(),at,0.1,.22)
            if s in (3,7,11,15): add(hat(),at,.25,.10)
            if s==14: add(hat(True),at,-.25,.10)
            if s in (0,3,6,10,12): add(logdrum([38,36,41,36][b%4] + (0 if s!=10 else 7)),at,0,.45)
            if s in (2,5,8,11,13,14):
                m=dm[(b*3+s*2)%7]; add(pluck(m),at,(-.4 if s%2 else .4),.09)
        elif t0<4.0 and s%8==0 and t0>=1.0:
            add(logdrum(38),at,0,.25)
# warm pad
chords=[(0,[50,57,60,65]),(4.4,[50,57,60,65]),(9.0,[48,55,60,64]),(14.0,[53,57,60,64]),(18.6,[50,57,62,65,69])]
for k,(s,ch) in enumerate(chords):
    e=(chords[k+1][0] if k+1<len(chords) else DUR)+1.0; n=int((e-s)*SR); tt=np.arange(n)/SR; pad=np.zeros(n)
    for m in ch:
        for d in (-.15,.15): f=mtof(m)*2**(d/100); pad+=np.sin(2*np.pi*f*tt+rng.uniform(0,6))*.5+np.sin(2*np.pi*2*f*tt)*.1
    en=np.ones(n); na=int(1.2*SR); en[:na]=np.linspace(0,1,na)**2; nr=int(1.2*SR); en[-nr:]*=np.linspace(1,0,nr)**2
    add(pad*en*.03,s,0,1)
# phone buzz (S2 l=2.7 -> t=7.1) and accept tick (S3 l=3.2 -> 12.2), ping
def buzz():
    n=int(.9*SR); tt=np.arange(n)/SR; return np.sin(2*np.pi*170*tt)*(np.sin(2*np.pi*14*tt)>0)*.6*np.minimum(1,tt*200)*np.exp(-tt*1.2)
add(buzz(),7.1,0,.35)
def bell(f,dur=2.4):
    n=int(dur*SR); tt=np.arange(n)/SR
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*d) for r,a,d in [(1,1,1.6),(2.76,.35,3),(5.4,.15,5)])*np.minimum(1,tt*500)
add(bell(mtof(84)),12.2,0,.10); add(bell(mtof(91)),12.35,.2,.07)   # accepted
add(bell(mtof(88)),14.9,0,.09)                                      # verified badge
for i,m in enumerate([84,88,91]): add(bell(mtof(m),1.2),17.3+i*.35,0,.07)   # nights fill
add(bell(mtof(88)),20.6,.2,.08); add(bell(mtof(95)),21.5,-.2,.06); add(bell(mtof(84)),21.5,0,.07)
# whoosh at wipes
def whoosh(dur=.8):
    n=int(dur*SR); x=rng.standard_normal(n); k=np.convolve(x,np.ones(40)/40,'same'); tt=np.linspace(0,1,n); return k*np.sin(np.pi*tt)**1.5*1.4
for s in (4.4,9.0,14.0,18.6): add(whoosh(),s,0,.22)
# fade out + master
fo=np.ones(N); i0=int((DUR-1.4)*SR); fo[i0:]=np.linspace(1,0,N-i0)**1.5; fi=np.minimum(1,t/.4); L*=fo*fi; R*=fo*fi
def rev(x):
    y=x.copy()
    for d,g in [(.037,.3),(.067,.25),(.109,.2),(.163,.15)]:
        k=int(d*SR); y[k:]+=x[:-k]*g
    return y
L=rev(L); R=rev(np.roll(R,int(.009*SR)))
m=np.tanh(np.stack([L,R])*1.5); m=m/np.abs(m).max()*.72
with wave.open('assets/soundtrack-day.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m.T*32767).astype('<i2').tobytes())
