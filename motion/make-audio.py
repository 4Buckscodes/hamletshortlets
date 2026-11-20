import numpy as np, wave
SR=44100; DUR=21.5; N=int(SR*(DUR+1)); t=np.arange(N)/SR
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
def mtof(m): return 440*2**((m-69)/12)
def add(sig,at,pan=0.0,g=1.0):
    i=int(at*SR); s=sig[:N-i]*g
    L[i:i+len(s)]+=s*(1-max(pan,0)); R[i:i+len(s)]+=s*(1+min(pan,0))
def env_ar(n,a,r):
    e=np.ones(n); na=int(a*SR); e[:na]=np.linspace(0,1,na)**2; nr=int(r*SR); e[-nr:]*=np.linspace(1,0,nr)**2; return e
# pad chords (Cmaj7 -> Am9 -> Fmaj7 -> G6 -> Cmaj9)
chords={0:[48,55,59,64],3.2:[45,52,60,64,67],7.0:[41,57,60,64,67],11.8:[43,55,59,62,64],16.6:[48,55,59,64,71]}
keys=sorted(chords)
for k,s in enumerate(keys):
    e=(keys[k+1] if k+1<len(keys) else DUR+0.8)+1.2
    n=int((e-s)*SR); tt=np.arange(n)/SR
    pad=np.zeros(n)
    for m in chords[s]:
        for d in (-0.15,0.15):
            f=mtof(m)*2**(d/100*1.0)
            pad+=np.sin(2*np.pi*f*tt+rng.uniform(0,6))*0.5+np.sin(2*np.pi*2*f*tt)*0.12+np.sin(2*np.pi*3*f*tt)*0.04
    pad*=env_ar(n,1.4,1.4)*0.045*(1+0.15*np.sin(2*np.pi*0.25*tt))
    add(pad,s,0,1)
# soft kalimba arpeggio, 84bpm eighths from 3.2s (sparse in A)
def pluck(m,dur=1.6):
    n=int(dur*SR); tt=np.arange(n)/SR; f=mtof(m)
    return (np.sin(2*np.pi*f*tt)+0.25*np.sin(2*np.pi*f*4.0*tt)*np.exp(-tt*25)+0.1*np.sin(2*np.pi*2*f*tt))*np.exp(-tt*3.2)*np.minimum(1,tt*400)
beat=60/84/2
scale={0:[72,76,79,83],3.2:[69,72,76,81],7.0:[65,69,72,76],11.8:[67,71,74,79],16.6:[72,76,79,83,84]}
step=0
tm=0.6
while tm<DUR-1.0:
    seg=max(k for k in keys if k<=tm)
    if tm>=3.2 or step%2==0:
        notes=scale[seg]; m=notes[[0,1,2,1,3,2,1,0][step%8]]
        g=0.07 if tm>=7 else 0.05
        add(pluck(m),tm,pan=(-0.4 if step%2 else 0.4),g=g)
    step+=1; tm+=beat
# low sub-note on scene starts
for s,m in [(0,36),(3.2,33),(7.0,29),(11.8,31),(16.6,36)]:
    n=int(3.2*SR); tt=np.arange(n)/SR
    add(np.sin(2*np.pi*mtof(m)*tt)*np.exp(-tt*0.9)*np.minimum(1,tt*50)*0.16,s,0,1)
# whooshes at wipes (band-passed noise swell)
def whoosh(dur=1.1,hi=1):
    n=int(dur*SR); x=rng.standard_normal(n); y=np.zeros(n); lp=0.0
    tt=np.linspace(0,1,n); c=0.02+0.30*tt**1.5 if hi else 0.02+0.2*tt
    for i in range(n): lp+=c[i]*(x[i]-lp); y[i]=lp
    hp=np.zeros(n); a=0
    for i in range(n): a+=0.01*(y[i]-a); hp[i]=y[i]-a
    return hp*np.sin(np.pi*tt)**1.5
for s in (3.2,7.0,11.8,16.6):
    add(whoosh(),s-0.05,0,0.9)
# gentle text ticks: soft airy blip on each headline reveal
for s,m in [(0.55,84),(4.45,88),(16.6+1.0,88)]:
    add(pluck(m,1.2),s,0.2,0.05)
# end chime (button + logo)
def bell(f,dur=3.0):
    n=int(dur*SR); tt=np.arange(n)/SR
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*d) for r,a,d in [(1,1,1.4),(2.76,.35,2.6),(5.4,.15,4.5)])*np.minimum(1,tt*500)
add(bell(mtof(88)),18.6,0.2,0.05); add(bell(mtof(95)),19.4,-0.2,0.04); add(bell(mtof(84)),19.4,0,0.05)
# master: fade out, soft clip, normalize
fo=np.ones(N); i0=int((DUR-1.2)*SR); fo[i0:]=np.linspace(1,0,N-i0)**1.5; fi=np.minimum(1,t/0.5)
L*=fo*fi; R*=fo*fi
# simple stereo reverb via feedback comb taps
def rev(x):
    y=x.copy()
    for d,g in [(0.043,.35),(0.071,.3),(0.113,.25),(0.171,.2)]:
        k=int(d*SR); y[k:]+=x[:-k]*g
    return y
L=rev(L); R=rev(np.roll(R,int(0.011*SR)))
m=np.tanh(np.stack([L,R])*1.4); m=m/np.abs(m).max()*0.7
pcm=(m.T*32767).astype('<i2')
with wave.open('assets/soundtrack.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
