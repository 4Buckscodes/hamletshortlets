import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, UploadCloud, ShieldCheck, BadgeCheck, CircleAlert } from 'lucide-react';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { AREAS } from '../../lib/seed';

const STEPS = ['Property basics', 'Listing details', 'Pricing & inventory', 'Documentation & authority', 'Review & submit'];
const AMENITIES = ['Wifi', 'Pool', 'Gym', 'Parking', '24/7 Power', 'Security', 'Workspace', 'Kitchen', 'TV', 'Air Conditioning', 'Generator', 'Concierge', 'Garden', 'Balcony'];
const PROPERTY_TYPES = ['Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa', 'Terrace'];

export default function NewProperty() {
  const { submitProperty, state } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Serviced apartment');
  const [area, setArea] = useState('Victoria Island');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [capacity, setCapacity] = useState(4);
  const [bedSetup, setBedSetup] = useState('1 king · 2 twin');
  const [nightlyRate, setNightlyRate] = useState(200000);
  const [cleaningFee, setCleaningFee] = useState(25000);
  const [deposit, setDeposit] = useState(150000);
  const [amenities, setAmenities] = useState<string[]>(['Wifi', 'Kitchen', 'TV', 'Air Conditioning']);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(['/images/prop/living-1.jpg', '/images/prop/bed-1.jpg']);
  const [houseRules, setHouseRules] = useState('Check-in from 2:00 PM\nCheck-out by 11:00 AM\nNo parties or events');
  const [role, setRole] = useState(state.session?.partnerRole ?? 'Property Owner');
  const [ownershipDoc, setOwnershipDoc] = useState(false);
  const [idDoc, setIdDoc] = useState(false);
  const [authorityDoc, setAuthorityDoc] = useState(false);
  const [authorityNote, setAuthorityNote] = useState('');
  const [selfDeclaration, setSelfDeclaration] = useState(false);

  const toggleAmenity = (a: string) => setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const addImage = () => {
    const v = imageUrl.trim();
    if (!v) return;
    setImages(prev => [...prev, v]);
    setImageUrl('');
  };

  const stepValid = [
    title.trim().length >= 8 && address.trim().length >= 10,
    bedrooms >= 1 && capacity >= 1 && bedSetup.trim().length > 0,
    nightlyRate >= 20000 && deposit >= 0,
    ownershipDoc && idDoc && authorityDoc && selfDeclaration && authorityNote.trim().length > 8,
    true,
  ][step];

  const submit = () => {
    submitProperty({
      title: title.trim(), type, area, address: address.trim(),
      nightlyRate, cleaningFee,
      mandatoryCharges: cleaningFee > 0 ? [{ label: 'Cleaning & turnover (mandatory)', amount: cleaningFee }] : [],
      deposit, bedrooms, bathrooms, capacity, bedSetup: bedSetup.trim(),
      amenities, images, houseRules: houseRules.split('\n').map(s => s.trim()).filter(Boolean),
      authorityBasis: authorityNote.trim(),
    });
    toast('Property submitted. HAMLET will review documentation before it can go live.', 'info');
    navigate('/partner/properties');
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate('/partner/properties')} className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-400 hover:text-ink-100"><ChevronLeft size={14} /> My properties</button>
      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">New listing</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">List a property</h1>

      {/* Stepper */}
      <ol className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const done = i < step, active = i === step;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1">
              <button onClick={() => i < step && setStep(i)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10.5px] font-extrabold uppercase tracking-wide transition ${active ? 'bg-brass-500 text-ink-950' : done ? 'bg-ink-800 text-jade-300' : 'text-ink-500'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${active ? 'bg-ink-950 text-brass-400' : done ? 'bg-jade-600 text-white' : 'bg-ink-800'}`}>{done ? <Check size={11} strokeWidth={4} /> : i + 1}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="text-ink-700">›</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 rounded-2xl border border-ink-800 bg-ink-900 p-5 sm:p-7">
        {step === 0 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="label-dark">Property title</span><input className="input-dark" placeholder="e.g. The Meridian 3-Bed Sky Residence" value={title} onChange={e => setTitle(e.target.value)} /></label>
              <label><span className="label-dark">Property type</span>
                <select className="input-dark" value={type} onChange={e => setType(e.target.value)}>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </label>
              <label><span className="label-dark">Lagos area</span>
                <select className="input-dark" value={area} onChange={e => setArea(e.target.value)}>{AREAS.map(a => <option key={a}>{a}</option>)}</select>
              </label>
              <label className="sm:col-span-2"><span className="label-dark">Full address</span><input className="input-dark" placeholder="Street, landmark, area, Lagos" value={address} onChange={e => setAddress(e.target.value)} /></label>
            </div>
            <p className="text-[10.5px] font-medium text-ink-500">Launch market is Lagos only. Abuja and Ibadan expansion is a later release — submissions from other cities will be rejected.</p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label><span className="label-dark">Bedrooms</span><input type="number" min={1} className="input-dark" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} /></label>
              <label><span className="label-dark">Bathrooms</span><input type="number" min={1} className="input-dark" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} /></label>
              <label><span className="label-dark">Capacity</span><input type="number" min={1} max={20} className="input-dark" value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></label>
              <label><span className="label-dark">Bed setup</span><input className="input-dark" value={bedSetup} onChange={e => setBedSetup(e.target.value)} /></label>
            </div>
            <div>
              <span className="label-dark">Amenities</span>
              <div className="flex flex-wrap gap-1.5">
                {AMENITIES.map(a => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${amenities.includes(a) ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-700 text-ink-300 hover:border-ink-500'}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="label-dark">Photos — references (URLs)</span>
              <div className="flex gap-2">
                <input className="input-dark" placeholder="Paste an image URL…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())} />
                <button type="button" onClick={addImage} className="btn-ghost-dark !px-4"><UploadCloud size={16} /> Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <span key={i} className="group relative">
                    <img src={src} alt={`Reference ${i + 1}`} className="h-16 w-20 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">×</button>
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-ink-500">Photo references are stored with the listing. HAMLET will validate actual media during review.</p>
            </div>
            <label><span className="label-dark">House rules (one per line)</span><textarea className="input-dark min-h-[84px]" value={houseRules} onChange={e => setHouseRules(e.target.value)} /></label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label><span className="label-dark">Nightly rate (₦)</span><input type="number" min={20000} step={5000} className="input-dark" value={nightlyRate} onChange={e => setNightlyRate(Number(e.target.value))} /></label>
              <label><span className="label-dark">Cleaning & turnover (₦)</span><input type="number" min={0} step={1000} className="input-dark" value={cleaningFee} onChange={e => setCleaningFee(Number(e.target.value))} /></label>
              <label><span className="label-dark">Refundable deposit (₦)</span><input type="number" min={0} step={10000} className="input-dark" value={deposit} onChange={e => setDeposit(Number(e.target.value))} /></label>
            </div>
            <div className="rounded-2xl border border-brass-500/30 bg-brass-500/5 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brass-400">What the guest will see</p>
              <dl className="mt-2 grid gap-1 text-[12px] font-semibold text-ink-100">
                <div className="flex justify-between"><dt>Accommodation (per night)</dt><dd className="tabular-nums">₦{nightlyRate.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt>Mandatory cleaning & turnover</dt><dd className="tabular-nums">₦{cleaningFee.toLocaleString()}</dd></div>
                <div className="flex justify-between"><dt>HAMLET guest fee (3% — guest pays, owner pays 0%)</dt><dd className="tabular-nums">₦{Math.round(nightlyRate * 0.03).toLocaleString()} / night</dd></div>
                <div className="flex justify-between"><dt>Refundable deposit (held separately, excluded from fee)</dt><dd className="tabular-nums">₦{deposit.toLocaleString()}</dd></div>
              </dl>
              <p className="mt-2 text-[10px] font-medium text-ink-400">The guest-facing total is computed by HAMLET's shared pricing engine from the full stay subtotal — never hard-coded in this form. Provider processing-fee treatment remains undecided and is not added here.</p>
            </div>
            <p className="text-[10.5px] font-medium text-ink-500">Pricing & availability inputs are captured at submission. Advanced calendar synchronisation and dynamic pricing are explicitly deferred from Release 1.</p>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <label><span className="label-dark">Your role in relation to this property</span>
              <select className="input-dark" value={role} onChange={e => setRole(e.target.value)}>
                {['Property Owner', 'Agent (authorised)', 'Property Manager', 'Shortlet Operator', 'Co-host / Hospitality Operator', 'Referral Partner'].map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label><span className="label-dark">Authority to list — describe the basis</span>
              <textarea className="input-dark min-h-[70px]" placeholder="e.g. Registered owner — title deed in my name; or: Management agreement with owner, signed 12 Oct 2026…" value={authorityNote} onChange={e => setAuthorityNote(e.target.value)} />
            </label>
            <div className="space-y-2">
              {[
                { v: ownershipDoc, set: setOwnershipDoc, label: 'I have attached/referenced proof of ownership (title deed, C of O, or purchase evidence)' },
                { v: idDoc, set: setIdDoc, label: 'I have attached/referenced a government-issued ID matching the account holder' },
                { v: authorityDoc, set: setAuthorityDoc, label: 'I have attached/referenced authority to list — or explicit owner consent (if listing on behalf of the owner)' },
                { v: selfDeclaration, set: setSelfDeclaration, label: 'I declare the information is accurate and I consent to a HAMLET inspection and document review' },
              ].map(({ v, set, label }) => (
                <label key={label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-800 bg-ink-850 p-3.5 transition hover:border-ink-600">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#C9A227]" checked={v} onChange={e => set(e.target.checked)} />
                  <span className="text-[12px] font-medium leading-snug text-ink-100">{label}</span>
                </label>
              ))}
            </div>
            <p className="flex items-start gap-2 text-[10.5px] font-medium leading-relaxed text-amber-200/80"><CircleAlert size={13} className="mt-0.5 shrink-0" /> Checked boxes are <strong>self-reported</strong> until a HAMLET reviewer examines the evidence. They do not, by themselves, verify anything. False declarations lead to rejection and suspension.</p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-black text-ink-50"><ShieldCheck size={19} className="text-brass-400" /> Review before submitting</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-[12px] font-medium text-ink-100">
              {[
                ['Title', title || '—'], ['Type / Area', `${type} · ${area}`], ['Address', address || '—'],
                ['Capacity', `${bedrooms} bed · ${bathrooms} bath · sleeps ${capacity}`], ['Bed setup', bedSetup],
                ['Nightly / Cleaning / Deposit', `₦${nightlyRate.toLocaleString()} · ₦${cleaningFee.toLocaleString()} · ₦${deposit.toLocaleString()}`],
                ['Amenities', `${amenities.length} selected`], ['Photo references', `${images.length} attached`],
                ['Role', role], ['Submitter', `${state.session?.name} (${role})`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-xl border border-ink-800 bg-ink-850 px-4 py-3">
                  <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{k}</p>
                  <p className="mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-jade-500/30 bg-jade-500/10 p-4 text-[11.5px] font-medium leading-relaxed text-jade-200">
              <BadgeCheck size={14} className="mb-1" /> On submission, this listing enters <strong>submitted</strong> status. HAMLET's duplicate check and manual review will move it to <strong>approved</strong>, <strong>needs correction</strong>, <strong>rejected</strong> or leave it pending. It is not public until approved.
            </div>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost-dark !py-3 text-[12px] disabled:opacity-30"><ChevronLeft size={16} /> Back</button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!stepValid} className="btn-brass !py-3 text-[12px]">Continue <ChevronRight size={16} /></button>
        ) : (
          <button onClick={submit} className="btn-brass !py-3 text-[13px]"><ShieldCheck size={16} /> Submit for review</button>
        )}
      </div>
    </div>
  );
}
