import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble,
  Bath,
  Users,
  MapPin,
  ShieldCheck,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  ListChecks,
  Banknote,
  ArrowRight,
  UserPlus,
  LogIn,
  CalendarClock,
  Tag,
  Compass,
  Lock,
  Heart,
  Sparkles,
  Share2,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { TrustBadge } from '../components/Badges';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHoratio } from '../components/HoratioDrawer';
import { useWishlist } from '../lib/wishlist';
import { useHamlet, getPersistedClosingAgentCode } from '../lib/store';
import { useCurrency, formatMinorCurrency } from '../lib/currency';
import { usePageMeta } from '../lib/brand';
import { buildPropertyStructuredData } from '../lib/seo';
import { useToast } from '../lib/toast';
import {
  priceStay,
  guestFacingNightlyNgn,
  nightsBetween,
  formatNaira,
  formatDate,
  formatDateTime,
  lagosIsoDateOffset,
  addDaysToIsoDate,
  calculateBookingCurrencyQuote,
} from '../lib/pricing';
import { computePropertyAvailabilitySummary, formatConfirmationStatusLabel } from '../lib/availability';
import { buildAuthPath } from '../lib/authRedirect';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, requestBooking, resolveReferralCode, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
  const {
    currency,
    currencySymbol,
    formatStayPrice,
    formatUnbufferedMoney,
    activeRateConfig,
    activeRateIsAvailable,
  } = useCurrency();
  const { isSaved, toggleSaved } = useWishlist();
  const { openHoratio } = useHoratio();
  const { toast } = useToast();
  const navigate = useNavigate();

  const todayIso = useMemo(() => lagosIsoDateOffset(0), []);
  const defaultFutureCheckIn = useMemo(() => lagosIsoDateOffset(2), []);

  const property = state.properties.find(p => p.id === id);

  const propertyStructuredData = useMemo(() => {
    if (!property || property.status !== 'approved') return null;
    return buildPropertyStructuredData(property, guestFacingNightlyNgn(property.nightlyRate));
  }, [property]);

  usePageMeta(
    property ? `${property.title} · ${property.area}, Lagos | HAMLET` : 'Shortlet Details in Lagos | HAMLET',
    property
      ? `Explore ${property.title} in ${property.area}, Lagos. Review availability calendar, amenities, house rules, verification status, and upfront total pricing on HAMLET.`
      : undefined,
    {
      canonicalPath: property ? `/stays/${property.id}` : '/stays',
      noindex: !property || property.status !== 'approved',
      ogImage: property?.images[0],
      ogImageAlt: property ? `${property.title} in ${property.area}, Lagos on HAMLET` : undefined,
      structuredData: propertyStructuredData,
    },
  );

  const baseAvailabilitySummary = useMemo(() => {
    if (!property) return null;
    return computePropertyAvailabilitySummary({
      property,
      bookings: state.bookings,
      publicCalendarSpans: state.publicCalendarSpans,
    });
  }, [property, state.bookings, state.publicCalendarSpans]);

  const smartInitialCheckIn = useMemo(() => {
    const nextOpen = baseAvailabilitySummary?.nextAvailableDate;
    if (nextOpen && nextOpen > defaultFutureCheckIn) return nextOpen;
    return defaultFutureCheckIn;
  }, [baseAvailabilitySummary, defaultFutureCheckIn]);

  const [gallery, setGallery] = useState({ propertyId: id, imageIndex: 0 });
  const imgIndex = gallery.propertyId === id ? gallery.imageIndex : 0;
  const [userCheckIn, setUserCheckIn] = useState<string | null>(() => searchParams.get('checkIn'));
  const [userCheckOut, setUserCheckOut] = useState<string | null>(() => searchParams.get('checkOut'));
  const checkIn = userCheckIn ?? smartInitialCheckIn;
  const checkOut = userCheckOut ?? addDaysToIsoDate(checkIn, 3);
  const setCheckIn = (next: string) => setUserCheckIn(next);
  const setCheckOut = (next: string) => setUserCheckOut(next);

  const [guests, setGuests] = useState(() => {
    const parsed = Number(searchParams.get('guests') ?? '2');
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 2;
  });
  const [showModal, setShowModal] = useState(() => searchParams.get('book') === '1');
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [note, setNote] = useState(() => searchParams.get('note') ?? '');
  const [closingAgentCode, setClosingAgentCode] = useState(
    () => searchParams.get('agent') ?? getPersistedClosingAgentCode(),
  );
  const [resolvedAgent, setResolvedAgent] = useState<{ valid: boolean; referrerName?: string; referrerCompany?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [datesUnavailable, setDatesUnavailable] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const pricing = property ? priceStay(property, checkIn, checkOut) : null;
  const session = state.session;

  const activeConfirmedGuestBooking = useMemo(() => {
    if (!property || !session) return undefined;
    return state.bookings.find(
      b =>
        b.propertyId === property.id &&
        b.guestId === session.userId &&
        b.status === 'confirmed',
    );
  }, [property, session, state.bookings]);

  const availabilitySummary = useMemo(() => {
    if (!property) return null;
    return computePropertyAvailabilitySummary({
      property,
      bookings: state.bookings,
      publicCalendarSpans: state.publicCalendarSpans,
      requestedCheckIn: checkIn,
      requestedCheckOut: checkOut,
    });
  }, [property, state.bookings, state.publicCalendarSpans, checkIn, checkOut]);

  const upcomingDays = useMemo(() => {
    if (!property || !availabilitySummary) return [];
    const spans = availabilitySummary.occupiedSpans;
    const firstAvail = property.firstAvailableDate;
    return Array.from({ length: 21 }, (_, idx) => {
      const iso = addDaysToIsoDate(todayIso, idx);
      const beforeFirstAvail = Boolean(firstAvail && iso < firstAvail);
      const inSpan = spans.some(s => iso >= s.startDate && iso < s.endDate);
      const occupied = beforeFirstAvail || inSpan;
      const d = new Date(`${iso}T00:00:00Z`);
      const weekday = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
      const dayNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      return { iso, weekday, dayNum, occupied };
    });
  }, [property, availabilitySummary, todayIso]);

  useEffect(() => {
    let active = true;
    const trimmed = closingAgentCode.trim();
    if (!trimmed) {
      Promise.resolve().then(() => { if (active) setResolvedAgent(null); });
      return () => { active = false; };
    }
    void resolveReferralCode(trimmed).then(res => {
      if (active) setResolvedAgent(res);
    });
    return () => { active = false; };
  }, [closingAgentCode, resolveReferralCode]);

  const fxQuote = useMemo(() => {
    if (!pricing) return null;
    return calculateBookingCurrencyQuote({
      ownerListedPriceNgn: pricing.accommodationSubtotal,
      mandatoryChargesTotalNgn: pricing.mandatoryChargesTotal,
      refundableDepositNgn: pricing.refundableDeposit,
      quoteCurrency: currency,
      exchangeRateConfig: currency !== 'NGN' ? activeRateConfig : null,
    });
  }, [pricing, currency, activeRateConfig]);

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
    if (availabilitySummary?.selectedDatesStatus === 'unavailable' || datesUnavailable) {
      return availabilitySummary?.nextAvailableLabel
        ? `Unavailable for selected dates. ${availabilitySummary.nextAvailableLabel}.`
        : 'Unavailable for selected dates. Please pick another window.';
    }
    return '';
  }, [checkIn, checkOut, nights, todayIso, datesUnavailable, availabilitySummary]);

  if (!backendReady) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <p className="text-sm font-semibold text-ink-500">Finding spaces that fit your plans…</p>
        </div>
      </GuestLayout>
    );
  }
  if (backendError) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">Something didn’t go as planned.</h1>
          <p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p>
          <Link to="/stays" className="btn-jade mt-6">Browse stays</Link>
        </div>
      </GuestLayout>
    );
  }
  if (!property) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">We couldn’t find that stay</h1>
          <p className="mt-2 text-sm text-ink-500">It may have been paused, suspended or removed since you last saw it.</p>
          <Link to="/stays" className="btn-jade mt-6">Browse approved stays</Link>
        </div>
      </GuestLayout>
    );
  }

  const saved = isSaved(property.id);
  const guestNightlyNgn = guestFacingNightlyNgn(property.nightlyRate);

  const bookingParams = new URLSearchParams({
    checkIn,
    checkOut,
    guests: String(guests),
    book: '1',
  });
  if (note.trim()) bookingParams.set('note', note.trim());
  if (closingAgentCode.trim()) bookingParams.set('agent', closingAgentCode.trim());
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
  const warning =
    property.status === 'approved' && nights > 0 && guests > property.capacity
      ? `This home sleeps ${property.capacity} — please reduce guests to ${property.capacity} or fewer.`
      : '';

  const jumpToNextAvailable = () => {
    if (!availabilitySummary?.nextAvailableDate) return;
    const nextStart = availabilitySummary.nextAvailableDate;
    setCheckIn(nextStart);
    setCheckOut(addDaysToIsoDate(nextStart, Math.max(nights, 2)));
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Listing link copied to clipboard.');
    } catch {
      toast('Could not copy link automatically.', 'error');
    }
  };

  const submitRequest = async () => {
    if (!session) {
      navigate(buildAuthPath({ signup: true, redirect: bookingReturnPath }));
      return;
    }
    if (session.role !== 'guest') {
      toast('Partner and admin accounts cannot book stays. Use a guest account.', 'error');
      return;
    }
    if (!termsConfirmed) {
      toast('Please confirm you have reviewed the property details, house rules, and booking terms.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestBooking({
        property,
        guestId: session.userId,
        guestName: session.name,
        guestEmail: session.email,
        checkIn,
        checkOut,
        guests,
        specialRequests: note.trim() || undefined,
        quoteCurrency: currency !== 'NGN' && activeRateIsAvailable ? currency : 'NGN',
        closingAgentCode: closingAgentCode.trim() || undefined,
      });
      if (!res.ok) {
        toast(res.error ?? 'Could not submit request.', 'error');
        return;
      }
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
        {/* Breadcrumb + Action Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-ink-500">
            <Link to="/stays" className="hover:text-ink-900">← All stays</Link>
            <span>·</span>
            <Link to="/lagos" className="hover:text-ink-900">Lagos</Link>
            <span>·</span>
            <Link to={`/stays?area=${encodeURIComponent(property.area)}`} className="hover:text-ink-900">{property.area}</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openHoratio(`Tell me about ${property.title} (${property.id}) and its verification and pricing.`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-800 transition hover:border-ink-400"
            >
              <Sparkles size={13} className="text-brass-600" /> Ask Horatio
            </button>
            <button
              type="button"
              onClick={() => void copyShareLink()}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-400"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              type="button"
              onClick={() => {
                toggleSaved(property.id);
                toast(saved ? 'Removed from saved stays.' : 'Saved to your shortlist.');
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                saved
                  ? 'border-brass-500 bg-brass-500/15 text-ink-900'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
              }`}
            >
              <Heart size={13} className={saved ? 'fill-brass-500 text-brass-600' : ''} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Title & Verification Header */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-4xl">
              {property.title}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-ink-600">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brass-600" />
                <span>{property.address}</span>
              </span>
              <TrustBadge label={property.trustLabel} />
              {availabilitySummary && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${
                    availabilitySummary.currentStatus === 'available_now'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <CalendarClock size={12} className="shrink-0" />
                  {availabilitySummary.currentStatus === 'currently_booked'
                    ? 'Currently booked'
                    : availabilitySummary.currentStatus === 'currently_unavailable'
                      ? 'Currently unavailable'
                      : 'Available now'}
                  {availabilitySummary.nextAvailableLabel ? ` · ${availabilitySummary.nextAvailableLabel}` : ''}
                </span>
              )}
            </div>
          </div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-400">
            Ref {property.id.toUpperCase()} · Listed by {property.submittedRole === 'Owner' ? 'owner' : property.submittedRole.toLowerCase()} ({property.ownerName})
          </span>
        </div>

        {/* Editorial Gallery */}
        <div className="mt-5 grid gap-2.5 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-3xl bg-ink-100 lg:col-span-8">
            <img
              src={property.images[imgIndex]}
              alt={`${property.title} — photo ${imgIndex + 1}`}
              className="h-72 w-full object-cover sm:h-96 lg:h-[460px]"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <span className="rounded-full bg-ink-950/80 px-3 py-1 font-mono text-[10.5px] font-bold text-white backdrop-blur-md">
                {property.area} · Lagos
              </span>
            </div>
            <button
              onClick={() =>
                setGallery({
                  propertyId: id,
                  imageIndex: (imgIndex - 1 + property.images.length) % property.images.length,
                })
              }
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/65 p-2.5 text-white backdrop-blur transition hover:bg-ink-950/85"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                setGallery({
                  propertyId: id,
                  imageIndex: (imgIndex + 1) % property.images.length,
                })
              }
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/65 p-2.5 text-white backdrop-blur transition hover:bg-ink-950/85"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3.5 right-3.5 rounded-full bg-ink-950/75 px-3 py-1 font-mono text-[11px] font-bold text-white backdrop-blur">
              {imgIndex + 1} / {property.images.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5 lg:col-span-4 lg:grid-cols-2">
            {property.images.slice(0, 4).map((src, i) => (
              <button
                key={i}
                onClick={() => setGallery({ propertyId: id, imageIndex: i })}
                className={`overflow-hidden rounded-3xl border-2 transition ${
                  i === imgIndex
                    ? 'border-brass-500 ring-2 ring-brass-500/30'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="h-24 w-full object-cover sm:h-44 lg:h-[224px]"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* ── Left column ─────────────────────────── */}
          <div className="lg:col-span-7">
            {/* Key Spec Chips */}
            <div className="flex flex-wrap items-center gap-2.5 border-b border-ink-100 pb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
                <BedDouble size={15} className="shrink-0 text-brass-600" />
                {property.bedrooms} bedroom{property.bedrooms === 1 ? '' : 's'} · {property.bedSetup}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
                <Bath size={15} className="shrink-0 text-brass-600" />
                {property.bathrooms} bathroom{property.bathrooms === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
                <Users size={15} className="shrink-0 text-brass-600" />
                Sleeps {property.capacity}
              </span>
            </div>

            {/* Availability & Calendar Transparency Panel */}
            {availabilitySummary && (
              <div className="mt-6 rounded-3xl border border-ink-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                    <CalendarClock size={18} className="shrink-0 text-brass-600" /> Calendar &amp; availability status
                  </h2>
                  <span className="rounded-full border border-ink-200 bg-paper px-3 py-0.5 text-[10.5px] font-bold text-ink-700">
                    {formatConfirmationStatusLabel(availabilitySummary.confirmationStatus)}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium text-ink-600">
                  {availabilitySummary.currentStatus === 'currently_booked'
                    ? `Currently booked on a confirmed HAMLET stay. ${availabilitySummary.nextAvailableLabel ?? ''}${availabilitySummary.relativeDaysUntilAvailable ? ` (${availabilitySummary.relativeDaysUntilAvailable})` : ''}.`
                    : availabilitySummary.currentStatus === 'currently_unavailable'
                      ? `Currently unavailable due to an owner/external calendar block. ${availabilitySummary.nextAvailableLabel ?? ''}${availabilitySummary.relativeDaysUntilAvailable ? ` (${availabilitySummary.relativeDaysUntilAvailable})` : ''}.`
                      : 'Available now for upcoming dates — select a day below or choose your check-in and check-out dates to request a stay.'}
                </p>
                {upcomingDays.length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                        Next 21 days — tap an open date to set check-in
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Open
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-ink-900" /> Selected
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400" /> Occupied
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1.5">
                      {upcomingDays.map(day => {
                        const inSelectedStay = Boolean(
                          checkIn && checkOut && day.iso >= checkIn && day.iso < checkOut,
                        );
                        return (
                          <button
                            key={day.iso}
                            type="button"
                            disabled={day.occupied}
                            onClick={() => {
                              setCheckIn(day.iso);
                              if (!checkOut || checkOut <= day.iso) {
                                setCheckOut(addDaysToIsoDate(day.iso, 3));
                              }
                            }}
                            title={
                              day.occupied
                                ? `${day.dayNum}: Occupied / blocked`
                                : inSelectedStay
                                  ? `${day.dayNum}: Selected in stay`
                                  : `${day.dayNum}: Available — click to set check-in`
                            }
                            className={`rounded-xl border px-1.5 py-1.5 text-center transition ${
                              day.occupied
                                ? 'cursor-not-allowed border-amber-200 bg-amber-50/70 text-amber-800 line-through opacity-75'
                                : inSelectedStay
                                  ? 'border-ink-900 bg-ink-900 text-paper shadow-2xs'
                                  : 'border-emerald-200 bg-emerald-50/60 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100/70'
                            }`}
                          >
                            <span className="block text-[9.5px] font-bold uppercase opacity-75">
                              {day.weekday}
                            </span>
                            <span className="block text-[11px] font-extrabold tabular-nums">
                              {day.dayNum}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {availabilitySummary.occupiedSpans.length > 0 && (
                  <div className="mt-3.5">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                      Upcoming unavailable windows
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {availabilitySummary.occupiedSpans.slice(0, 6).map((span, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-950"
                        >
                          {formatDate(span.startDate)} → {formatDate(span.endDate)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {property.lastAvailabilityUpdate && (
                  <p className="mt-3 text-[10.5px] font-semibold text-ink-400">
                    Calendar last updated {formatDateTime(property.lastAvailabilityUpdate)}
                    {property.calendarResponsiblePerson
                      ? ` · Managed by ${property.calendarResponsiblePerson}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {/* 4-Pillar Verification Status Grid */}
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/55 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                  <ShieldCheck size={19} className="shrink-0 text-emerald-700" /> Four-pillar verification record
                </h2>
                <Link to="/safety" className="text-xs font-extrabold text-emerald-800 underline hover:text-ink-900">
                  Read safety guide
                </Link>
              </div>
              <p className="mt-1 text-xs font-medium text-ink-600">
                Evidence reviewed by HAMLET operations. Outcomes are recorded honestly per pillar — self-reported items are labelled as such.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Ownership', s: property.verification.ownership },
                  { label: 'Identity', s: property.verification.identity },
                  { label: 'Authority to list', s: property.verification.authority },
                  { label: 'Inspection', s: property.verification.inspection },
                ].map(v => (
                  <div key={v.label} className="rounded-2xl border border-emerald-200/80 bg-white px-3.5 py-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-500">
                      {v.label}
                    </p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-xs font-bold ${
                        v.s === 'verified'
                          ? 'text-emerald-700'
                          : v.s === 'missing'
                            ? 'text-red-700'
                            : 'text-amber-800'
                      }`}
                    >
                      {v.s === 'verified' ? (
                        <Check size={13} strokeWidth={3} className="shrink-0" />
                      ) : (
                        <Info size={13} className="shrink-0" />
                      )}
                      <span className="truncate">
                        {v.s === 'verified'
                          ? 'Verified'
                          : v.s === 'pending_review'
                            ? 'Pending'
                            : v.s === 'missing'
                              ? 'Missing'
                              : 'Self-reported'}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="mt-7">
              <h2 className="font-display text-xl font-bold text-ink-900">Amenities &amp; utilities</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {property.amenities.map(a => (
                  <span
                    key={a}
                    className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-800"
                  >
                    <Check size={13} className="shrink-0 text-emerald-600" />
                    <span className="truncate">{a}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* House rules */}
            <div className="mt-7 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-ink-900">House rules</h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {property.houseRules.map(r => (
                  <li key={r} className="flex items-start gap-2 text-[13px] font-medium text-ink-700">
                    <ListChecks size={15} className="mt-0.5 shrink-0 text-brass-600" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Location & Wayfinder Arrival Overview */}
            <div className="mt-7 rounded-3xl border border-ink-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-700">
                    <Compass size={13} className="shrink-0" /> HAMLET Wayfinder · Location &amp; arrival
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold text-ink-900">
                    {property.area}, Lagos
                  </h2>
                </div>
                {property.wayfinderStatus === 'guide_ready' ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-800">
                    <ShieldCheck size={12} className="shrink-0 text-emerald-700" /> Door-to-door arrival guide ready
                  </span>
                ) : property.locationAccuracy === 'verified_entrance' ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-900">
                    <MapPin size={12} className="shrink-0 text-sky-700" /> Entrance pin verified · Guide partial
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-paper px-2.5 py-1 text-[10.5px] font-bold text-ink-600">
                    Street address on file
                  </span>
                )}
              </div>

              <p className="mt-2 text-[13px] font-semibold text-ink-800">{property.address}</p>

              {property.publicLocationSummary && (
                <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink-600">
                  {property.publicLocationSummary}
                </p>
              )}

              {property.publicLandmarks && property.publicLandmarks.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                    Nearby public landmarks
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {property.publicLandmarks.map(lm => (
                      <span
                        key={lm}
                        className="rounded-lg border border-ink-100 bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-ink-700"
                      >
                        {lm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { step: '01 · Area', desc: `${property.area} neighbourhood` },
                  { step: '02 · Entrance', desc: 'Google Maps gate pin' },
                  { step: '03 · Building', desc: 'Compound & block turns' },
                  { step: '04 · Door', desc: 'Floor & check-in access' },
                ].map(item => (
                  <div key={item.step} className="rounded-2xl border border-ink-100 bg-paper/70 px-3 py-2.5">
                    <p className="font-mono text-[10.5px] font-extrabold text-ink-900">{item.step}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-ink-600">{item.desc}</p>
                  </div>
                ))}
              </div>

              {activeConfirmedGuestBooking ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-bold text-emerald-900">
                    You have a confirmed stay here ({activeConfirmedGuestBooking.ref}).
                  </p>
                  <Link
                    to={`/wayfinder/${activeConfirmedGuestBooking.id}`}
                    className="btn-jade !rounded-full !px-4 !py-2 text-xs"
                  >
                    <Compass size={14} /> Open Wayfinder
                  </Link>
                </div>
              ) : (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-ink-500">
                  <Lock size={13} className="mt-0.5 shrink-0 text-ink-400" />
                  <span>
                    For resident safety, exact entrance coordinates, internal compound directions, apartment numbers, and check-in codes are shared exclusively after your booking is confirmed.
                  </span>
                </p>
              )}
            </div>

            {/* Separate Refundable Caution Deposit & Mandatory Charges */}
            <div className="mt-7 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                  <Banknote size={18} className="shrink-0 text-brass-600" /> Caution deposit &amp; mandatory charges
                </h2>
                <CurrencyToggle compact />
              </div>
              <dl className="mt-3 space-y-2 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between gap-3">
                  <dt className="min-w-0">Refundable caution deposit (unbuffered, tracked separately)</dt>
                  <dd className="shrink-0 font-mono font-bold tabular-nums">{formatUnbufferedMoney(property.deposit)}</dd>
                </div>
                {property.mandatoryCharges.map(c => (
                  <div key={c.label} className="flex justify-between gap-3">
                    <dt className="min-w-0">{c.label}</dt>
                    <dd className="shrink-0 font-mono font-bold tabular-nums">{formatStayPrice(c.amount)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-500">
                The refundable caution deposit is itemised and tracked separately from accommodation revenue, is never included in HAMLET’s 20% markup or 10% international currency buffer, and is refunded after post-checkout inspection.
              </p>
            </div>
          </div>

          {/* ── Sticky Booking Request Card ──────────────────────── */}
          <aside className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lg lg:sticky lg:top-20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-5 py-5 sm:px-6">
                <div>
                  <p className="eyebrow-light">Request to book</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                      {formatStayPrice(guestNightlyNgn)}
                    </span>
                    <span className="text-xs font-semibold text-ink-300">/ night · guest stay rate</span>
                  </div>
                </div>
                <CurrencyToggle variant="dark" />
              </div>

              <div className="p-5 sm:p-6">
                {currency !== 'NGN' && !activeRateIsAvailable && (
                  <p
                    role="status"
                    className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-900"
                  >
                    Live {currency} FX rate is currently unavailable or expired — displaying exact Naira (₦) pricing.
                  </p>
                )}

                {availabilitySummary && checkIn && checkOut && checkOut > checkIn && (
                  <div
                    className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2 text-[11.5px] font-bold ${
                      availabilitySummary.selectedDatesStatus === 'unavailable'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : availabilitySummary.selectedDatesStatus === 'needs_confirmation'
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <span>{availabilitySummary.selectedDatesLabel}</span>
                    {availabilitySummary.selectedDatesStatus === 'unavailable' &&
                      availabilitySummary.nextAvailableDate && (
                        <button
                          type="button"
                          onClick={jumpToNextAvailable}
                          className="underline hover:opacity-80"
                        >
                          Select next available ({formatDate(availabilitySummary.nextAvailableDate)})
                        </button>
                      )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  <select
                    className="input"
                    value={guests}
                    onChange={e => setGuests(Number(e.target.value))}
                  >
                    {Array.from({ length: property.capacity }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n} guest{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {(dateError || warning) && (
                  <p className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    {dateError || warning}
                  </p>
                )}

                {/* Price breakdown — single-source pricing engine */}
                {pricing && fxQuote && nights > 0 && !dateError && (
                  <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-[13px] font-medium text-ink-800">
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">
                        Owner listed rate ({formatNaira(property.nightlyRate)} × {nights} night{nights > 1 ? 's' : ''})
                      </dt>
                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.accommodationSubtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.hamletGuestServiceFee)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold text-ink-900">
                      <dt className="min-w-0">
                        Domestic guest accommodation ({nights} night{nights > 1 ? 's' : ''})
                      </dt>
                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd>
                    </div>
                    {pricing.mandatoryCharges.map(c => (
                      <div key={c.label} className="flex justify-between gap-3">
                        <dt className="min-w-0 text-ink-600">{c.label}</dt>
                        <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
                      </div>
                    ))}

                    {fxQuote.quoteCurrency !== 'NGN' &&
                    fxQuote.convertedBaseMinor !== null &&
                    fxQuote.internationalBufferMinor !== null ? (
                      <>
                        <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-ink-200 pt-2 text-xs text-ink-600">
                          <dt className="min-w-0">
                            Converted stay base (@ ₦{fxQuote.fxRate?.toLocaleString('en-NG')}/{currencySymbol}1)
                          </dt>
                          <dd className="shrink-0 font-mono tabular-nums">
                            {formatMinorCurrency(fxQuote.convertedBaseMinor, fxQuote.quoteCurrency)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 text-xs text-ink-600">
                          <dt className="min-w-0">International currency buffer (10%)</dt>
                          <dd className="shrink-0 font-mono tabular-nums">
                            {formatMinorCurrency(fxQuote.internationalBufferMinor, fxQuote.quoteCurrency)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-base font-bold text-ink-900">
                          <dt className="min-w-0">Quoted stay total ({fxQuote.quoteCurrency})</dt>
                          <dd className="shrink-0 font-mono tabular-nums text-ink-900">
                            {formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}
                          </dd>
                        </div>
                        {pricing.refundableDeposit > 0 && (
                          <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
                            <dt className="min-w-0">Refundable caution deposit (unbuffered, held separately)</dt>
                            <dd className="shrink-0 font-mono tabular-nums">
                              {formatUnbufferedMoney(pricing.refundableDeposit)} ({formatNaira(pricing.refundableDeposit)})
                            </dd>
                          </div>
                        )}
                        <p className="pt-1 text-[11px] font-semibold text-ink-700">
                          FX rate: 1 {fxQuote.quoteCurrency} = ₦{fxQuote.fxRate?.toLocaleString('en-NG')} ({fxQuote.fxRateSource}). Paystack stay checkout settles in NGN: {formatNaira(fxQuote.settlementTotalNgn)}.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-base font-bold text-ink-900">
                          <dt className="min-w-0">Stay checkout total (Paystack NGN)</dt>
                          <dd className="shrink-0 font-mono tabular-nums text-ink-900">
                            {formatNaira(fxQuote.settlementTotalNgn)}
                          </dd>
                        </div>
                        {pricing.refundableDeposit > 0 && (
                          <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
                            <dt className="min-w-0">
                              Refundable caution deposit (tracked separately, refunded post-inspection)
                            </dt>
                            <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                )}
                <p className="mt-3 text-[10.5px] font-medium leading-snug text-ink-400">
                  20% domestic accommodation markup (0% owner fee). International USD/GBP quotes include a single 10% currency buffer on stay pricing and never on the refundable caution deposit.
                </p>

                {guestCanBook ? (
                  <button
                    className="btn-jade mt-4 w-full !rounded-full !py-4 text-[15px]"
                    disabled={!!dateError || !!warning || nights === 0}
                    onClick={() => {
                      setTermsConfirmed(false);
                      setShowModal(true);
                    }}
                  >
                    Request to book <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="btn-outline mt-4 w-full !rounded-full !py-4 text-[15px]" disabled>
                    Not bookable — listing {property.status.replace('_', ' ')}
                  </button>
                )}
                <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-400">
                  You won’t be charged yet. Availability and terms are confirmed first.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Booking request modal ─────────────────────────────── */}
      <AnimatePresence>
        {showModal && pricing && fxQuote && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{property.title}</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-ink-900">
                    One last look before you book.
                  </h2>
                  <p className="mt-1 text-xs font-medium text-ink-500">
                    Check your dates, guest count, quote breakdown, house rules, and refundable caution deposit terms before sending your request.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="shrink-0 rounded-xl p-1.5 text-ink-400 hover:bg-ink-50"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  Quote currency
                </span>
                <CurrencyToggle compact />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Dates</p>
                  <p className="text-xs font-bold text-ink-900">
                    {checkIn.slice(5)} → {checkOut.slice(5)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Nights</p>
                  <p className="text-xs font-bold text-ink-900">{nights}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Guests</p>
                  <p className="text-xs font-bold text-ink-900">{guests}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-[13px] font-medium text-ink-800">
                <div className="flex justify-between gap-3">
                  <dt className="min-w-0">
                    Domestic accommodation ({nights} nights incl. 20% markup)
                  </dt>
                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd>
                </div>
                {pricing.mandatoryCharges.map(c => (
                  <div key={c.label} className="flex justify-between gap-3">
                    <dt className="min-w-0">{c.label}</dt>
                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
                  </div>
                ))}
                {fxQuote.quoteCurrency !== 'NGN' && fxQuote.internationalBufferMinor !== null && (
                  <div className="flex justify-between gap-3 text-xs text-ink-600">
                    <dt className="min-w-0">
                      International {fxQuote.quoteCurrency} quote (incl. 10% buffer)
                    </dt>
                    <dd className="shrink-0 font-mono font-bold tabular-nums">
                      {formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2 font-display text-[15px] font-bold">
                  <dt className="min-w-0">Paystack stay settlement on acceptance (NGN)</dt>
                  <dd className="shrink-0 font-mono tabular-nums text-ink-900">
                    {formatNaira(fxQuote.settlementTotalNgn)}
                  </dd>
                </div>
                {pricing.refundableDeposit > 0 && (
                  <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
                    <dt className="min-w-0">
                      Separate refundable caution deposit (post-inspection refund)
                    </dt>
                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
                  </div>
                )}
              </dl>
              <label className="mt-4 block">
                <span className="label flex items-center gap-1">
                  <Tag size={12} /> Closing agent / partner code (optional)
                </span>
                <input
                  className="input font-mono text-xs uppercase"
                  placeholder="e.g. HML-ZAINAB-3C4D"
                  value={closingAgentCode}
                  onChange={e => setClosingAgentCode(e.target.value)}
                />
                {closingAgentCode.trim() && resolvedAgent && (
                  <p
                    className={`mt-1 text-[11px] font-semibold ${
                      resolvedAgent.valid ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {resolvedAgent.valid
                      ? `Closing agent verified: ${resolvedAgent.referrerName}${resolvedAgent.referrerCompany ? ` (${resolvedAgent.referrerCompany})` : ''}`
                      : 'Code not recognised as an active HAMLET partner — booking will still submit normally.'}
                  </p>
                )}
              </label>
              <label className="mt-3 block">
                <span className="label">Note for the host (optional)</span>
                <textarea
                  className="input min-h-[68px] resize-none"
                  placeholder="e.g. Arriving from Murtala Muhammed Airport, flight lands 14:10…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
              {session && (
                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-ink-200 bg-paper p-3 text-xs font-semibold text-ink-800">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={e => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink-900"
                  />
                  <span>
                    I have reviewed the property details, house rules, caution deposit inspection terms, and booking terms.
                  </span>
                </label>
              )}
              {session ? (
                <button
                  className="btn-jade mt-4 w-full !rounded-full !py-4 disabled:opacity-50"
                  onClick={submitRequest}
                  disabled={submitting || !termsConfirmed}
                >
                  {submitting ? (
                    'Sending…'
                  ) : (
                    <>
                      Submit booking request <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  <Link
                    to={buildAuthPath({ signup: true, redirect: bookingReturnPath })}
                    className="btn-jade w-full !rounded-full !py-4"
                  >
                    <UserPlus size={16} /> Create guest account to book <ArrowRight size={16} />
                  </Link>
                  <Link
                    to={buildAuthPath({ signup: false, redirect: bookingReturnPath })}
                    className="btn-outline w-full !rounded-full !py-3 text-[13px]"
                  >
                    <LogIn size={15} /> Already have an account? Sign in
                  </Link>
                </div>
              )}
              <p className="mt-2 text-center text-[10.5px] font-medium text-ink-400">
                Request → host checks availability &amp; terms → accepted with a payment deadline → confirmed only after verified provider payment.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GuestLayout>
  );
}
