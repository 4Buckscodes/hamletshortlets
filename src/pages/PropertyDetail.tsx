import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble, Bath, Users, MapPin, ShieldCheck, X, Check, ChevronLeft, ChevronRight,
  AlertTriangle, Info, ListChecks, Banknote, ArrowRight,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { TrustBadge } from '../components/Badges';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import { priceStay, nightsBetween, formatNaira } from '../lib/pricing';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { state, requestBooking } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const property = state.properties.find(p => p.id === id);
  const [gallery, setGallery] = useState({ propertyId: id, imageIndex: 0 });
  const imgIndex = gallery.propertyId === id ? gallery.imageIndex : 0;
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') ?? '2026-11-13');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '2026-11-16');
  const [guests, setGuests] = useState(Number(searchParams.get('guests') ?? '2'));
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const pricing = property ? priceStay(property, checkIn, checkOut) : null;
  const session = state.session;

  const dateError = useMemo(() => {
    if (new Date(checkOut) <= new Date(checkIn)) return 'Check-out must be after check-in.';
    if (nights > 60) return 'Stays are limited to 60 nights in the pilot.';
    return '';
  }, [checkIn, checkOut, nights]);

  if (!property) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-black text-ink-900">We couldn't find that stay</h1>
          <p className="mt-2 text-sm text-ink-500">It may have been suspended or removed since you last saw it.</p>
          <Link to="/stays" className="btn-jade mt-6">Browse approved stays</Link>
        </div>
      </GuestLayout>
    );
  }

  const guestCanBook = property.status === 'approved';
  const warning = property.status === 'approved' && nights > 0 && guests > property.capacity
    ? `This home sleeps ${property.capacity} — please reduce guests to ${property.capacity} or fewer.` : '';

  const submitRequest = () => {
    if (!session) { navigate('/signin'); return; }
    if (session.role !== 'guest') { toast('Partner and admin accounts cannot book stays. Use a guest account.', 'error'); return; }
    setSubmitting(true);
    const res = requestBooking({
      property, guestId: session.userId, guestName: session.name, guestEmail: session.email,
      checkIn, checkOut, guests, specialRequests: note.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) { toast(res.error ?? 'Could not submit request.', 'error'); return; }
    setShowModal(false);
    toast(`Booking request ${res.booking!.ref} sent to the host.`);
    navigate('/account');
  };

  return (
    <GuestLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/stays" className="text-[12px] font-bold text-ink-500 hover:text-jade-700">← All stays</Link>
          <span className="text-[11px] font-semibold text-ink-400">Listed by {property.submittedRole === 'Owner' ? 'owner' : property.submittedRole.toLowerCase()} · {property.ownerName}</span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-black leading-tight text-ink-900 sm:text-4xl">{property.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600"><MapPin size={15} className="text-jade-600" />{property.address}</span>
          <TrustBadge label={property.trustLabel} />
        </div>

        {/* Gallery */}
        <div className="mt-5 grid gap-2 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-2xl lg:col-span-8">
            <img src={property.images[imgIndex]} alt={`${property.title} — photo ${imgIndex + 1}`} className="h-72 w-full object-cover sm:h-96 lg:h-[440px]" />
            <button onClick={() => setGallery({ propertyId: id, imageIndex: (imgIndex - 1 + property.images.length) % property.images.length })} aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-white backdrop-blur transition hover:bg-ink-950/80"><ChevronLeft size={18} /></button>
            <button onClick={() => setGallery({ propertyId: id, imageIndex: (imgIndex + 1) % property.images.length })} aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-white backdrop-blur transition hover:bg-ink-950/80"><ChevronRight size={18} /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">{imgIndex + 1} / {property.images.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 lg:col-span-4 lg:grid-cols-2">
            {property.images.slice(0, 4).map((src, i) => (
              <button key={i} onClick={() => setGallery({ propertyId: id, imageIndex: i })} className={`overflow-hidden rounded-2xl border-2 transition ${i === imgIndex ? 'border-brass-500' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                <img src={src} alt="" className="h-24 w-full object-cover sm:h-44 lg:h-[212px]" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* ── Left column ─────────────────────────── */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-5 border-b border-ink-100 pb-6 text-[13px] font-semibold text-ink-700">
              <span className="inline-flex items-center gap-2"><BedDouble size={17} className="text-jade-700" />{property.bedrooms} bedrooms · {property.bedSetup}</span>
              <span className="inline-flex items-center gap-2"><Bath size={17} className="text-jade-700" />{property.bathrooms} bathrooms</span>
              <span className="inline-flex items-center gap-2"><Users size={17} className="text-jade-700" />Sleeps {property.capacity}</span>
            </div>

            {/* Verification panel */}
            <div className="mt-6 rounded-2xl border border-jade-200 bg-jade-50/60 p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-black text-jade-900"><ShieldCheck size={18} /> How this home was verified</h2>
              <p className="mt-1 text-[11.5px] font-medium text-jade-800">Evidence reviewed by a HAMLET operations lead. Outcomes are recorded — self-reported items are labelled as such.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Ownership', s: property.verification.ownership },
                  { label: 'Identity', s: property.verification.identity },
                  { label: 'Authority to list', s: property.verification.authority },
                  { label: 'Inspection', s: property.verification.inspection },
                ].map(v => (
                  <div key={v.label} className="rounded-xl border border-jade-100 bg-white px-3 py-2.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-500">{v.label}</p>
                    <p className={`mt-0.5 flex items-center gap-1 text-[12px] font-bold ${v.s === 'verified' ? 'text-jade-700' : v.s === 'missing' ? 'text-red-700' : 'text-amber-800'}`}>
                      {v.s === 'verified' ? <Check size={13} strokeWidth={3} /> : <Info size={13} />}
                      {v.s === 'verified' ? 'Verified' : v.s === 'pending_review' ? 'Pending' : v.s === 'missing' ? 'Missing' : 'Self-reported'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <h2 className="mt-7 font-display text-lg font-black text-ink-900">Amenities</h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {property.amenities.map(a => <span key={a} className="rounded-xl border border-ink-100 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-800">{a}</span>)}
            </div>

            {/* House rules */}
            <h2 className="mt-7 font-display text-lg font-black text-ink-900">House rules</h2>
            <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {property.houseRules.map(r => <li key={r} className="flex items-start gap-2 text-[13px] font-medium text-ink-700"><ListChecks size={15} className="mt-0.5 shrink-0 text-jade-600" />{r}</li>)}
            </ul>

            {/* Deposit & charges */}
            <div className="mt-7 rounded-2xl border border-ink-100 bg-white p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900"><Banknote size={17} className="text-jade-700" />Deposit & mandatory charges</h2>
              <dl className="mt-3 space-y-1.5 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between"><dt>Refundable security deposit</dt><dd className="tabular-nums">{formatNaira(property.deposit)}</dd></div>
                {property.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between"><dt>{c.label}</dt><dd className="tabular-nums">{formatNaira(c.amount)}</dd></div>)}
              </dl>
              <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-ink-400">The deposit is refundable after checkout inspection, is held separately and is never part of the HAMLET fee base. Mandatory charges are known in advance and included in your total before payment.</p>
            </div>
          </div>

          {/* ── Booking widget ──────────────────────── */}
          <aside className="lg:col-span-5">
            <div className="card sticky top-20 overflow-hidden">
              <div className="border-b border-ink-100 bg-ink-950 px-6 py-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-400">Request to book</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-paper">{formatNaira(property.nightlyRate)}</span>
                  <span className="text-[12px] font-semibold text-ink-300">/ night · 0% owner fee</span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="label">Check in</span>
                    <input type="date" className="input" value={checkIn} min="2026-10-22" onChange={e => setCheckIn(e.target.value)} />
                  </label>
                  <label>
                    <span className="label">Check out</span>
                    <input type="date" className="input" value={checkOut} min="2026-10-23" onChange={e => setCheckOut(e.target.value)} />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="label">Guests</span>
                  <select className="input" value={guests} onChange={e => setGuests(Number(e.target.value))}>
                    {Array.from({ length: property.capacity }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                  </select>
                </label>

                {(dateError || warning) && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{dateError || warning}</p>
                )}

                {/* Price breakdown — the shared pricing engine */}
                {pricing && nights > 0 && !dateError && (
                  <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-[13px] font-medium text-ink-800">
                    <div className="flex justify-between"><dt>{formatNaira(property.nightlyRate)} × {nights} night{nights > 1 ? 's' : ''}</dt><dd className="tabular-nums">{formatNaira(pricing.accommodationSubtotal)}</dd></div>
                    {pricing.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between"><dt className="pr-2 text-ink-600">{c.label}</dt><dd className="tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                    <div className="flex justify-between"><dt>HAMLET guest service fee (3% × {formatNaira(pricing.accommodationSubtotal)})</dt><dd className="tabular-nums">{formatNaira(pricing.hamletGuestServiceFee)}</dd></div>
                    <div className="flex justify-between border-t-2 border-ink-900 pt-2.5 font-display text-[15px] font-black text-ink-900"><dt>Total (₦, before payment)</dt><dd className="tabular-nums text-jade-800">{formatNaira(pricing.guestTotal)}</dd></div>
                    <div className="flex justify-between text-[11.5px] text-ink-400"><dt>Refundable deposit (held separately)</dt><dd className="tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd></div>
                  </dl>
                )}
                <p className="mt-3 text-[10.5px] font-medium leading-snug text-ink-400">
                  3% guest fee on the accommodation subtotal after any discount. Provider processing-fee policy is not yet decided and is not added here. Your total cannot increase unexpectedly at checkout.
                </p>

                {guestCanBook ? (
                  <button
                    className="btn-jade mt-4 w-full !py-4 text-[15px]"
                    disabled={!!dateError || !!warning || nights === 0}
                    onClick={() => setShowModal(true)}
                  >
                    Request to book <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="btn-outline mt-4 w-full !py-4 text-[15px]" disabled>Not bookable — listing under review</button>
                )}
                <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-400">You won't be charged yet. The host has 24–48h to confirm availability & terms.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Booking request modal ─────────────────────────────── */}
      <AnimatePresence>
        {showModal && pricing && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Confirm your request</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink-900">{property.title}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50"><X size={20} /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-ink-50 p-3 text-center">
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Dates</p><p className="text-[12.5px] font-bold text-ink-900">{checkIn.slice(5)} → {checkOut.slice(5)}</p></div>
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Nights</p><p className="text-[12.5px] font-bold text-ink-900">{nights}</p></div>
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Guests</p><p className="text-[12.5px] font-bold text-ink-900">{guests}</p></div>
              </div>
              <dl className="mt-4 space-y-1.5 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(pricing.accommodationSubtotal)}</dd></div>
                {pricing.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between"><dt>{c.label}</dt><dd className="tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                <div className="flex justify-between"><dt>HAMLET guest fee (3%)</dt><dd className="tabular-nums">{formatNaira(pricing.hamletGuestServiceFee)}</dd></div>
                <div className="flex justify-between border-t-2 border-ink-900 pt-2 font-display text-[15px] font-black"><dt>Total due on acceptance</dt><dd className="tabular-nums text-jade-800">{formatNaira(pricing.guestTotal)}</dd></div>
                <div className="flex justify-between text-[11.5px] text-ink-400"><dt>Refundable deposit</dt><dd className="tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd></div>
              </dl>
              <label className="mt-4 block">
                <span className="label">Note for the host (optional)</span>
                <textarea className="input min-h-[72px] resize-none" placeholder="e.g. Arriving from Abuja, flight lands 14:10…" value={note} onChange={e => setNote(e.target.value)} />
              </label>
              {session ? (
                <button className="btn-jade mt-4 w-full !py-4" onClick={submitRequest} disabled={submitting}>
                  {submitting ? 'Sending…' : <>Send booking request <ArrowRight size={16} /></>}
                </button>
              ) : (
                <Link to="/signin" className="btn-jade mt-4 w-full !py-4">Sign in to send request <ArrowRight size={16} /></Link>
              )}
              <p className="mt-2 text-center text-[10.5px] font-medium text-ink-400">Request → host checks availability & terms → accepted with a payment deadline → confirmed only after verified provider payment.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GuestLayout>
  );
}
