import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble, Bath, Users, MapPin, ShieldCheck, X, Check, ChevronLeft, ChevronRight,
  AlertTriangle, Info, ListChecks, Banknote, ArrowRight, UserPlus, LogIn,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { TrustBadge } from '../components/Badges';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { useCurrency } from '../lib/currency';
import { usePageMeta } from '../lib/brand';
import { useToast } from '../lib/toast';
import { priceStay, nightsBetween, formatNaira, lagosIsoDateOffset, addDaysToIsoDate } from '../lib/pricing';
import { buildAuthPath } from '../lib/authRedirect';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, requestBooking, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
  const { currency, formatPrice, ngnPerUsd } = useCurrency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);

  const property = state.properties.find(p => p.id === id);

  usePageMeta(
    property ? `${property.title} · ${property.area}, Lagos | HAMLET` : 'Shortlet Details in Lagos | HAMLET',
    property
      ? `Explore ${property.title} in ${property.area}, Lagos. Review amenities, house rules, verification status, and upfront total pricing on HAMLET.`
      : undefined,
  );

  const [gallery, setGallery] = useState({ propertyId: id, imageIndex: 0 });
  const imgIndex = gallery.propertyId === id ? gallery.imageIndex : 0;
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') ?? lagosIsoDateOffset(2));
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') ?? lagosIsoDateOffset(5));
  const [guests, setGuests] = useState(() => {
    const parsed = Number(searchParams.get('guests') ?? '2');
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 2;
  });
  const [showModal, setShowModal] = useState(() => searchParams.get('book') === '1');
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [note, setNote] = useState(() => searchParams.get('note') ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [datesUnavailable, setDatesUnavailable] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const pricing = property ? priceStay(property, checkIn, checkOut) : null;
  const session = state.session;

  useEffect(() => {
    let active = true;
    if (!property || !checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      Promise.resolve().then(() => { if (active) setDatesUnavailable(false); });
      return () => { active = false; };
    }
    void getUnavailablePropertyIds(checkIn, checkOut)
      .then(ids => {
        if (active) setDatesUnavailable(ids.includes(property.id));
      })
      .catch(() => {
        if (active) setDatesUnavailable(false);
      });
    return () => { active = false; };
  }, [property, checkIn, checkOut, getUnavailablePropertyIds, state.bookings]);

  const dateError = useMemo(() => {
    if (checkIn < todayIso) return 'Check-in cannot be in the past.';
    if (new Date(checkOut) <= new Date(checkIn)) return 'Check-out must be after check-in.';
    if (nights > 60) return 'Stays are limited to 60 nights.';
    if (datesUnavailable) return 'Selected dates overlap an already confirmed or held booking. Please pick another window.';
    return '';
  }, [checkIn, checkOut, nights, todayIso, datesUnavailable]);

  if (!backendReady) {
    return <GuestLayout><div className="mx-auto max-w-lg px-4 py-24 text-center"><p className="text-sm font-semibold text-ink-500">Finding spaces that fit your plans…</p></div></GuestLayout>;
  }
  if (backendError) {
    return <GuestLayout><div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="font-display text-2xl font-black text-ink-900">Something didn’t go as planned.</h1><p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p><Link to="/stays" className="btn-jade mt-6">Browse stays</Link></div></GuestLayout>;
  }
  if (!property) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-black text-ink-900">We couldn’t find that stay</h1>
          <p className="mt-2 text-sm text-ink-500">It may have been suspended or removed since you last saw it.</p>
          <Link to="/stays" className="btn-jade mt-6">Browse approved stays</Link>
        </div>
      </GuestLayout>
    );
  }

  const bookingParams = new URLSearchParams({
    checkIn,
    checkOut,
    guests: String(guests),
    book: '1',
  });
  if (note.trim()) bookingParams.set('note', note.trim());
  const bookingReturnPath = `/stays/${property.id}?${bookingParams.toString()}`;

  const closeModal = () => {
    setShowModal(false);
    if (searchParams.has('book') || searchParams.has('note')) {
      const cleaned = new URLSearchParams(searchParams);
      cleaned.delete('book');
      cleaned.delete('note');
      setSearchParams(cleaned, { replace: true });
    }
  };

  const guestCanBook = property.status === 'approved';
  const warning = property.status === 'approved' && nights > 0 && guests > property.capacity
    ? `This home sleeps ${property.capacity} — please reduce guests to ${property.capacity} or fewer.` : '';

  const submitRequest = async () => {
    if (!session) { navigate(buildAuthPath({ signup: true, redirect: bookingReturnPath })); return; }
    if (session.role !== 'guest') { toast('Partner and admin accounts cannot book stays. Use a guest account.', 'error'); return; }
    if (!termsConfirmed) {
      toast('Please confirm you have reviewed the property details, house rules, and booking terms.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestBooking({
        property, guestId: session.userId, guestName: session.name, guestEmail: session.email,
        checkIn, checkOut, guests, specialRequests: note.trim() || undefined,
      });
      if (!res.ok) { toast(res.error ?? 'Could not submit request.', 'error'); return; }
      closeModal();
      toast(`Your request (${res.booking?.ref ?? ''}) is on its way.`);
      navigate('/account');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GuestLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-ink-500">
            <Link to="/stays" className="hover:text-jade-700">← All stays</Link>
            <span>·</span>
            <Link to="/lagos" className="hover:text-jade-700">Lagos</Link>
            <span>·</span>
            <Link to={`/stays?area=${encodeURIComponent(property.area)}`} className="hover:text-jade-700">{property.area}</Link>
          </div>
          <span className="text-[11px] font-semibold text-ink-400">Listed by {property.submittedRole === 'Owner' ? 'owner' : property.submittedRole.toLowerCase()} · {property.ownerName}</span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-black leading-tight text-ink-900 sm:text-4xl">{property.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-ink-600"><MapPin size={15} className="mt-0.5 shrink-0 text-jade-600" /><span>{property.address}</span></span>
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink-100 pb-6 text-[13px] font-semibold text-ink-700">
              <span className="inline-flex items-center gap-2"><BedDouble size={17} className="shrink-0 text-jade-700" />{property.bedrooms} bedrooms · {property.bedSetup}</span>
              <span className="inline-flex items-center gap-2"><Bath size={17} className="shrink-0 text-jade-700" />{property.bathrooms} bathrooms</span>
              <span className="inline-flex items-center gap-2"><Users size={17} className="shrink-0 text-jade-700" />Sleeps {property.capacity}</span>
            </div>

            {/* Verification panel */}
            <div className="mt-6 rounded-2xl border border-jade-200 bg-jade-50/60 p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-black text-jade-900"><ShieldCheck size={18} className="shrink-0" /> How this home was verified</h2>
              <p className="mt-1 text-[11.5px] font-medium text-jade-800">
                Evidence reviewed by a HAMLET operations lead. Outcomes are recorded — self-reported items are labelled as such.{' '}
                <Link to="/safety" className="underline hover:text-jade-950">Read guest protection guide</Link>.
              </p>
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
                      {v.s === 'verified' ? <Check size={13} strokeWidth={3} className="shrink-0" /> : <Info size={13} className="shrink-0" />}
                      <span className="truncate">{v.s === 'verified' ? 'Verified' : v.s === 'pending_review' ? 'Pending' : v.s === 'missing' ? 'Missing' : 'Self-reported'}</span>
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
            <div className="mt-7 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900"><Banknote size={17} className="shrink-0 text-jade-700" />Deposit & mandatory charges</h2>
                <CurrencyToggle compact />
              </div>
              <dl className="mt-3 space-y-1.5 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between gap-3"><dt className="min-w-0">Refundable security deposit</dt><dd className="shrink-0 tabular-nums">{formatPrice(property.deposit)}</dd></div>
                {property.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatPrice(c.amount)}</dd></div>)}
              </dl>
              <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-ink-400">The deposit is refundable after checkout inspection, is held separately and is never part of the HAMLET fee base. Mandatory charges are known in advance and included in your total before payment.</p>
            </div>
          </div>

          {/* ── Booking widget ──────────────────────── */}
          <aside className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="card overflow-hidden lg:sticky lg:top-20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-950 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-400">Request to book</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-2xl font-black tabular-nums text-paper">{formatPrice(property.nightlyRate)}</span>
                    <span className="text-[12px] font-semibold text-ink-300">/ night · 0% owner fee</span>
                  </div>
                </div>
                <CurrencyToggle variant="dark" />
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="min-w-0">
                    <span className="label">Check in</span>
                    <input
                      type="date"
                      className="input min-w-0"
                      value={checkIn}
                      min={todayIso}
                      onChange={e => {
                        const nextIn = e.target.value;
                        setCheckIn(nextIn);
                        if (nextIn && checkOut <= nextIn) {
                          setCheckOut(addDaysToIsoDate(nextIn, 2));
                        }
                      }}
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="label">Check out</span>
                    <input
                      type="date"
                      className="input min-w-0"
                      value={checkOut}
                      min={checkIn ? addDaysToIsoDate(checkIn, 1) : addDaysToIsoDate(todayIso, 1)}
                      onChange={e => setCheckOut(e.target.value)}
                    />
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
                    <div className="flex justify-between gap-3"><dt className="min-w-0">{formatPrice(property.nightlyRate)} × {nights} night{nights > 1 ? 's' : ''}</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.accommodationSubtotal)}</dd></div>
                    {pricing.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0 text-ink-600">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatPrice(c.amount)}</dd></div>)}
                    <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET guest service fee (3% × {formatPrice(pricing.accommodationSubtotal)})</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.hamletGuestServiceFee)}</dd></div>
                    <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-[15px] font-black text-ink-900">
                      <dt className="min-w-0">Total ({currency === 'USD' ? '$, est.' : '₦'}, before payment)</dt>
                      <dd className="shrink-0 tabular-nums text-jade-800">{formatPrice(pricing.guestTotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 text-[11.5px] text-ink-400"><dt className="min-w-0">Refundable deposit (held separately)</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.refundableDeposit)}</dd></div>
                    {currency === 'USD' && (
                      <p className="pt-1 text-[11px] font-semibold text-jade-800">
                        USD shown at ₦{ngnPerUsd.toLocaleString('en-NG')}/$1 for comparison. Checkout settles in Naira ({formatNaira(pricing.guestTotal)}).
                      </p>
                    )}
                  </dl>
                )}
                <p className="mt-3 text-[10.5px] font-medium leading-snug text-ink-400">
                  3% guest fee on the accommodation subtotal after any discount. Your total cannot increase unexpectedly at checkout.
                </p>

                {guestCanBook ? (
                  <button
                    className="btn-jade mt-4 w-full !py-4 text-[15px]"
                    disabled={!!dateError || !!warning || nights === 0}
                    onClick={() => {
                      setTermsConfirmed(false);
                      setShowModal(true);
                    }}
                  >
                    Request to book <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="btn-outline mt-4 w-full !py-4 text-[15px]" disabled>Not bookable — listing under review</button>
                )}
                <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-400">You won’t be charged yet. Availability and terms are confirmed first.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Booking request modal ─────────────────────────────── */}
      <AnimatePresence>
        {showModal && pricing && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={closeModal} />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-jade-700">{property.title}</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink-900">One last look before you book.</h2>
                  <p className="mt-1 text-[11.5px] font-medium text-ink-500">
                    Check your dates, guest count, total price, house rules, and cancellation terms before sending your request.
                  </p>
                </div>
                <button onClick={closeModal} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50" aria-label="Close"><X size={20} /></button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Display currency</span>
                <CurrencyToggle compact />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-ink-50 p-3 text-center">
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Dates</p><p className="text-[12px] font-bold text-ink-900 sm:text-[12.5px]">{checkIn.slice(5)} → {checkOut.slice(5)}</p></div>
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Nights</p><p className="text-[12.5px] font-bold text-ink-900">{nights}</p></div>
                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Guests</p><p className="text-[12.5px] font-bold text-ink-900">{guests}</p></div>
              </div>
              <dl className="mt-4 space-y-1.5 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between gap-3"><dt className="min-w-0">Subtotal</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.accommodationSubtotal)}</dd></div>
                {pricing.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatPrice(c.amount)}</dd></div>)}
                <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET guest fee (3%)</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.hamletGuestServiceFee)}</dd></div>
                <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2 font-display text-[15px] font-black"><dt className="min-w-0">Total due on acceptance</dt><dd className="shrink-0 tabular-nums text-jade-800">{formatPrice(pricing.guestTotal)}</dd></div>
                <div className="flex justify-between gap-3 text-[11.5px] text-ink-400"><dt className="min-w-0">Refundable deposit</dt><dd className="shrink-0 tabular-nums">{formatPrice(pricing.refundableDeposit)}</dd></div>
                {currency === 'USD' && (
                  <p className="pt-1 text-[11px] font-semibold text-jade-800">
                    Settled in Naira at checkout: {formatNaira(pricing.guestTotal)}
                  </p>
                )}
              </dl>
              <label className="mt-4 block">
                <span className="label">Note for the host (optional)</span>
                <textarea className="input min-h-[72px] resize-none" placeholder="e.g. Arriving from Murtala Muhammed Airport, flight lands 14:10…" value={note} onChange={e => setNote(e.target.value)} />
              </label>
              {session && (
                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-200 bg-ink-50/60 p-3 text-[12px] font-semibold text-ink-800">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={e => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-jade-600"
                  />
                  <span>I have reviewed the property details, house rules, and booking terms.</span>
                </label>
              )}
              {session ? (
                <button className="btn-jade mt-4 w-full !py-4 disabled:opacity-50" onClick={submitRequest} disabled={submitting || !termsConfirmed}>
                  {submitting ? 'Sending…' : <>Submit booking request <ArrowRight size={16} /></>}
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  <Link
                    to={buildAuthPath({ signup: true, redirect: bookingReturnPath })}
                    className="btn-jade w-full !py-4"
                  >
                    <UserPlus size={16} /> Create guest account to book <ArrowRight size={16} />
                  </Link>
                  <Link
                    to={buildAuthPath({ signup: false, redirect: bookingReturnPath })}
                    className="btn-outline w-full !py-3 text-[13px]"
                  >
                    <LogIn size={15} /> Already have an account? Sign in
                  </Link>
                </div>
              )}
              <p className="mt-2 text-center text-[10.5px] font-medium text-ink-400">Request → host checks availability & terms → accepted with a payment deadline → confirmed only after verified provider payment.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GuestLayout>
  );
}
