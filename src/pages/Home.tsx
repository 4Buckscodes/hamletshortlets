import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Banknote, BedDouble, Briefcase, Building2, CalendarDays, Camera,
  CheckCircle2, ChevronRight, Compass, Globe, KeyRound, LifeBuoy, MapPin,
  Search, ShieldCheck, Users, Wifi,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { useHamlet } from '../lib/store';
import { AREAS } from '../lib/seed';
import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const LAGOS_NEIGHBOURHOODS = [
  { label: 'Lekki', href: '/stays?q=Lekki' },
  { label: 'Victoria Island', href: '/stays?area=Victoria+Island' },
  { label: 'Ikoyi', href: '/stays?area=Ikoyi' },
  { label: 'Ikeja', href: '/stays?q=Ikeja' },
  { label: 'Ajah', href: '/stays?area=Ajah' },
  { label: 'Oniru', href: '/stays?area=Oniru' },
  { label: 'Banana Island', href: '/stays?area=Banana+Island' },
];

export default function Home() {
  usePageMeta(
    'HAMLET Shortlets | Find Your Next Stay in Lagos',
    'Explore shortlets in Lagos, from Lekki and Victoria Island to Ikoyi and Ikeja. Compare locations, amenities, prices, and check-in details on HAMLET.',
  );

  const { state, backendReady, backendError } = useHamlet();
  const navigate = useNavigate();

  const today = lagosIsoDateOffset(0);
  const [area, setArea] = useState('');
  const [checkIn, setCheckIn] = useState(() => lagosIsoDateOffset(1));
  const [checkOut, setCheckOut] = useState(() => lagosIsoDateOffset(3));
  const [guests, setGuests] = useState(2);

  const approved = state.properties.filter(property => property.status === 'approved');
  const featured = approved.slice(0, 6);
  const selectableAreas = AREAS;
  const minCheckOut = addDaysToIsoDate(checkIn, 1);

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (area) query.set('area', area);
    query.set('checkIn', checkIn);
    query.set('checkOut', checkOut);
    query.set('guests', String(guests));
    navigate(`/stays?${query.toString()}`);
  };

  return (
    <GuestLayout>
      {/* ── 1. Hero Section ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950">
        <img
          src="/images/prop/penthouse.jpg"
          alt="A light-filled Lagos shortlet living space"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-ink-950/20" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <motion.div {...fadeUp} transition={{ duration: 0.55 }} className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
              SHORTLETS, WITHOUT THE GUESSWORK.
            </p>
            <h1 className="mt-4 font-display text-[38px] font-black leading-[1.03] tracking-tight text-paper sm:text-6xl">
              Come in. Settle down. Feel at home.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] font-medium leading-relaxed text-ink-100 sm:text-base">
              Whether you’re in Lagos for business, a family visit, or a well-deserved escape, find a shortlet that feels right — from the first look to the moment you walk through the door.
            </p>
            <p className="mt-2.5 max-w-xl text-[14px] font-medium leading-relaxed text-ink-200">
              Discover thoughtfully selected apartments, clear booking details, and a better way to plan your stay.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#stay-search" className="btn-brass min-h-12">
                Find your stay <ArrowRight size={16} />
              </a>
              <Link
                to="/lagos"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
              >
                Explore Lagos neighbourhoods
              </Link>
            </div>
          </motion.div>

          <form
            id="stay-search"
            onSubmit={search}
            className="mt-9 grid scroll-mt-24 grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-5"
          >
            <label className="flex min-h-14 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <MapPin size={17} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Where are you going?</span>
                <select
                  value={area}
                  onChange={event => setArea(event.target.value)}
                  aria-label="Where would you like to stay?"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  <option value="">All Lagos neighbourhoods</option>
                  {selectableAreas.map(destination => (
                    <option key={destination} value={destination}>{destination}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="flex min-h-14 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={17} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Check-in</span>
                <input
                  type="date"
                  required
                  value={checkIn}
                  min={today}
                  aria-label="Add arrival date"
                  onChange={event => {
                    const nextCheckIn = event.target.value;
                    setCheckIn(nextCheckIn);
                    if (checkOut <= nextCheckIn) setCheckOut(addDaysToIsoDate(nextCheckIn, 2));
                  }}
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex min-h-14 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={17} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Check-out</span>
                <input
                  type="date"
                  required
                  value={checkOut}
                  min={minCheckOut}
                  aria-label="Add departure date"
                  onChange={event => setCheckOut(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex min-h-14 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <Users size={17} className="shrink-0 text-brass-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Guests</span>
                <select
                  value={guests}
                  onChange={event => setGuests(Number(event.target.value))}
                  aria-label="Who’s coming along?"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                    <option key={count} value={count}>{count} guest{count === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </span>
            </label>
            <button type="submit" className="btn-brass min-h-14 w-full lg:px-3">
              <Search size={17} /> Find your stay
            </button>
          </form>

          <div className="mt-3.5 flex flex-col gap-1 text-[11.5px] font-medium leading-relaxed text-ink-200 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:max-w-5xl">
            <p>Your next stay starts here. Compare your options, understand the details, and choose with confidence.</p>
            <p className="font-bold text-brass-300">Clear prices. Property details you can review. Support when you need it.</p>
          </div>
        </div>
      </section>

      {/* ── 2. The Trust Section (Four Pillars of a Better Stay) ────────── */}
      <section id="trust" className="border-b border-ink-100 bg-clay/70 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Four pillars of a better stay</p>
            <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
              A good stay is about more than beautiful pictures.
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
              You want the apartment to look as good in person as it did online. You want the power situation explained before you arrive. You want to know what you’re paying, how you’ll get in, and who to contact if something goes wrong.
            </p>
            <p className="mt-2 text-sm font-bold text-ink-800">
              Fair enough. Those things should never be left to chance.
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ink-600">
              HAMLET is built around the details that make the difference between simply booking a place and actually enjoying your stay.
            </p>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: '01',
                Icon: BedDouble,
                title: 'Know what you’re booking',
                lead: 'The details matter. We make them count.',
                body: 'Explore property information, photos, amenities, location details, and house rules before you commit. Where a property has been verified by HAMLET, we make that clear so you can make a more informed choice.',
                cta: 'Explore available stays',
                to: '/stays',
              },
              {
                num: '02',
                Icon: Wifi,
                title: 'Power and Wi-Fi, explained',
                lead: 'Stay connected. Know what to expect.',
                body: 'Working remotely? Streaming your favourite show? Getting ready for a full day out? Reliable power and internet can make or break a stay. Review the amenities and backup arrangements provided for each property before booking.',
                extra: 'No guessing about the essentials that matter to you.',
                cta: 'Find a stay that fits your needs',
                to: '/stays',
              },
              {
                num: '03',
                Icon: KeyRound,
                title: 'Booking without the back-and-forth',
                lead: 'Less chasing. More settling in.',
                body: 'Find a place, review the terms, submit your booking request, and follow the next steps clearly. Your host or property partner can confirm the details before your stay is finalised.',
                extra: 'You should know where you stand at every step.',
                cta: 'Find your next stay',
                to: '/how-it-works',
              },
              {
                num: '04',
                Icon: LifeBuoy,
                title: 'Help when you need it',
                lead: 'You should never be left wondering who to call.',
                body: 'Questions before arrival? Need clarification about check-in? Something not going as agreed? HAMLET provides a clear support route for guests who need assistance with their booking.',
                cta: 'Get help with your stay',
                to: '/safety',
              },
            ].map(({ num, Icon, title, lead, body, extra, cta, to }) => (
              <article key={num} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-jade-700">{num}</span>
                  <Icon size={20} className="shrink-0 text-jade-700" strokeWidth={1.8} />
                </div>
                <h3 className="mt-3 font-display text-lg font-black text-ink-900">{title}</h3>
                <p className="mt-1 text-[12.5px] font-bold text-ink-800">{lead}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
                {extra && <p className="mt-2 text-[12px] font-semibold text-ink-700">{extra}</p>}
                <Link to={to} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900">
                  {cta} <ArrowRight size={13} className="shrink-0" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Featured Destination — Lagos ─────────────────────────────── */}
      <section className="border-b border-ink-100 bg-paper py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-8 rounded-3xl border border-ink-100 bg-white p-6 shadow-xs sm:p-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Featured destination · Lagos</p>
              <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
                The city moves. Your stay should make sense.
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
                From the restaurants and nightlife of Lekki to the corporate pulse of Victoria Island and the convenience of Ikeja, Lagos offers a different experience in every neighbourhood.
              </p>
              <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink-600">
                Find a space for a work trip, a weekend with friends, a family visit, or a staycation that gets you out of your usual routine. Choose your location around the places you actually need to be.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/lagos" className="btn-jade min-h-11">
                  Explore shortlets in Lagos <ArrowRight size={15} />
                </Link>
                <Link to="/stays" className="btn-outline min-h-11">
                  Browse all Lagos listings
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl">
                <img src="/images/lagos-hero.jpg" alt="Lagos skyline and neighbourhoods" className="h-64 w-full object-cover sm:h-72" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-300">Lagos neighbourhoods</p>
                  <p className="mt-0.5 text-xs font-semibold text-white/95">Lekki · Victoria Island · Ikoyi · Ikeja · Ajah</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Suggested neighbourhoods in Lagos</p>
            <div className="mt-3 flex gap-2.5 overflow-x-auto overscroll-x-contain pb-2">
              {LAGOS_NEIGHBOURHOODS.map(n => (
                <Link
                  key={n.label}
                  to={n.href}
                  className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 transition hover:border-jade-500 hover:text-jade-800"
                >
                  {n.label}
                  <ChevronRight size={15} className="shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-jade-600" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Featured Stays ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Featured stays</p>
            <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">Take a closer look.</h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
              The right place isn’t always the biggest or the most expensive. It’s the one that works for your trip. Browse spaces with the room you need, the amenities you care about, and a location that makes getting around easier.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CurrencyToggle />
            <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">
              See all available stays <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {backendError ? (
          <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-6 py-6 text-sm font-semibold text-red-800">
            Something didn’t go as planned loading stays: {backendError}
          </div>
        ) : !backendReady ? (
          <div className="mt-7 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
            Finding spaces that fit your plans…
          </div>
        ) : featured.length > 0 ? (
          <>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(property => <PropertyCard key={property.id} p={property} />)}
            </div>
            <p className="mt-4 text-[11px] font-medium text-ink-400">
              Showing {featured.length} of {approved.length} currently approved listing{approved.length === 1 ? '' : 's'}. Review each listing’s verification details, house rules, and full price breakdown before booking.
            </p>
          </>
        ) : (
          <div className="mt-7 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center shadow-xs sm:px-10">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-jade-200 bg-jade-50 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-jade-800">
              <ShieldCheck size={13} className="shrink-0" /> Verified Lagos supply onboarding
            </span>
            <h3 className="mt-3 font-display text-2xl font-black text-ink-900">
              We’re still adding stays in this area.
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
              Try another neighbourhood or check back as more properties become available. HAMLET never displays sample listings or unverified apartments as live inventory — every stay goes public only after manual document and inspection review.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/lagos" className="btn-jade">Explore Lagos neighbourhoods <ArrowRight size={15} /></Link>
              <Link to="/partner/register" className="btn-outline">Become a HAMLET partner</Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 5. Why Guests Choose HAMLET ─────────────────────────────────── */}
      <section className="border-y border-ink-100 bg-clay/60 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Why guests choose HAMLET</p>
              <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
                Because your time is worth more than endless follow-up.
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
                You shouldn’t have to send ten messages to understand the price. You shouldn’t discover an important house rule after you’ve paid. And you shouldn’t spend the first hour of your trip trying to figure out how to get through the gate.
              </p>
              <p className="mt-2.5 text-sm font-semibold text-ink-800">
                HAMLET is designed to make the details easier to understand before you arrive.
              </p>
              <Link to="/stays" className="btn-jade mt-6 min-h-12">
                Find a place that feels right <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {[
                { Icon: BedDouble, title: 'Know the space.', body: 'Review photos, amenities, occupancy limits, and house rules before committing.' },
                { Icon: Banknote, title: 'Understand the cost.', body: 'Check the price breakdown and applicable charges — in Naira (₦), US Dollars ($), or British Pounds (£) — before confirming your booking.' },
                { Icon: KeyRound, title: 'Plan your arrival.', body: 'Know the check-in process and the contact arrangements for your stay.' },
                { Icon: CheckCircle2, title: 'Choose with confidence.', body: 'Review the available property information and any verification details shown on the listing.' },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
                  <Icon size={21} className="shrink-0 text-jade-700" />
                  <h3 className="mt-3 font-display text-base font-black text-ink-900">{title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Social Proof & Traveller Profiles (Honest — No Invented Reviews) ── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Designed around real trips</p>
          <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
            Good stays are worth talking about.
          </h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
            A smooth check-in. A clean apartment. A host who communicates clearly. A space that looks the way you expected. These are the little things guests remember — and the details that make them comfortable recommending a place to someone else.
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-700">
            We’re building a community where honest guest feedback helps people make better booking decisions.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: Briefcase,
              title: 'The business traveller',
              body: 'A convenient location, a comfortable workspace, and a stay that fits the work schedule.',
            },
            {
              Icon: Globe,
              title: 'The returning Nigerian',
              body: 'A welcoming base for reconnecting with family, friends, and home — with clear pricing in NGN (₦), USD ($), or GBP (£).',
            },
            {
              Icon: Compass,
              title: 'The weekend explorer',
              body: 'A well-chosen space for celebrating, relaxing, or discovering a new side of Lagos.',
            },
            {
              Icon: Camera,
              title: 'The content creator',
              body: 'Thoughtful interiors, good lighting, and a setting that suits the occasion — subject to each listing’s house rules.',
            },
          ].map(({ Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
              <Icon size={21} className="shrink-0 text-brass-600" />
              <h3 className="mt-3 font-display text-base font-black text-ink-900">{title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6">
          <Link to="/stays" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jade-800 hover:text-jade-900">
            Discover stays for your next trip <ArrowRight size={15} className="shrink-0" />
          </Link>
        </div>
      </section>

      {/* ── 7. Guest-to-Partner Section ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-7 sm:p-10">
          <img src="/images/prop/exterior-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 to-ink-950/50" />
          <div className="relative max-w-2xl">
            <Building2 size={27} className="shrink-0 text-brass-400" />
            <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-300">
              A good property deserves to reach the right guests.
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-black text-paper sm:text-4xl">
              Have a space people would love to stay in?
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-200">
              HAMLET helps property owners, managers, and hospitality partners present their shortlets to people looking for somewhere to stay. Whether you manage one apartment or several properties, you can begin by joining our partner network.
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-ink-300">
              Bring your property to the marketplace. Share the details guests need. Manage your listing and booking activity through the partner workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/partner/register" className="btn-brass min-h-12">
                Become a HAMLET partner <ArrowRight size={15} />
              </Link>
              <Link
                to="/signin"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
              >
                Open partner workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Final Landing-Page CTA ───────────────────────────────────── */}
      <section className="border-t border-ink-100 bg-paper px-4 py-14 text-center sm:px-6 sm:py-16">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-jade-700">HAMLET. {HAMLET_TAGLINE}</p>
        <h2 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-black text-ink-900 sm:text-4xl">
          Your next stay could be a better experience.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-ink-600">
          The right location. A space that suits your plans. Clear details before you arrive. Start with what matters to you, and find a place that feels right.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/stays" className="btn-jade min-h-12">
            Find your stay <ArrowRight size={15} />
          </Link>
          <Link to="/lagos" className="btn-outline min-h-12">
            Explore shortlets in Lagos
          </Link>
        </div>
      </section>
    </GuestLayout>
  );
}
