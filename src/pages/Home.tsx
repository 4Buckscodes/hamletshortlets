import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Banknote, BedDouble, Building2, CalendarDays,
  ChevronRight, ClipboardCheck, FileText, LifeBuoy, MapPin, Search, Users,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { useHamlet } from '../lib/store';
import { HAMLET_TAGLINE } from '../lib/brand';

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
};

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateValue(date);
}

export default function Home() {
  const { state, backendReady, backendError } = useHamlet();
  const navigate = useNavigate();
  const [area, setArea] = useState('');
  const [checkIn, setCheckIn] = useState(() => addDays(dateValue(new Date()), 1));
  const [checkOut, setCheckOut] = useState(() => addDays(dateValue(new Date()), 2));
  const [guests, setGuests] = useState(2);

  const approved = state.properties.filter(property => property.status === 'approved');
  const featured = approved.slice(0, 3);
  const areas = [...new Set(approved.map(property => property.area))].sort();
  const today = dateValue(new Date());
  const minCheckOut = addDays(checkIn, 1);

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
      <section className="relative overflow-hidden bg-ink-950">
        <img
          src="/images/prop/penthouse.jpg"
          alt="A light-filled shortlet living space"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/65 to-ink-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-ink-950/20" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">HAMLET · Abundance Abodes</p>
            <h1 className="mt-4 font-display text-[42px] font-black leading-[1.02] tracking-tight text-paper sm:text-6xl">
              {HAMLET_TAGLINE}
            </h1>
            <p className="mt-5 max-w-lg text-[15px] font-medium leading-relaxed text-ink-100 sm:text-base">
              Find a place that fits your plans, understand what to expect and book with greater confidence.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#stay-search" className="btn-brass min-h-12">
                Find my stay <ArrowRight size={16} />
              </a>
              <Link to="/partner/register" className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10">
                Own or manage a property? Partner with HAMLET
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
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Destination</span>
                <select
                  value={area}
                  onChange={event => setArea(event.target.value)}
                  aria-label="Destination"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  <option value="">All available locations</option>
                  {areas.map(destination => <option key={destination} value={destination}>{destination}</option>)}
                </select>
              </span>
            </label>
            <label className="flex min-h-14 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={17} className="shrink-0 text-brass-400" />
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Check-in</span>
                <input
                  type="date"
                  required
                  value={checkIn}
                  min={today}
                  onChange={event => {
                    const nextCheckIn = event.target.value;
                    setCheckIn(nextCheckIn);
                    if (checkOut <= nextCheckIn) setCheckOut(addDays(nextCheckIn, 1));
                  }}
                  className="max-w-full bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex min-h-14 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
              <CalendarDays size={17} className="shrink-0 text-brass-400" />
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink-300">Check-out</span>
                <input
                  type="date"
                  required
                  value={checkOut}
                  min={minCheckOut}
                  onChange={event => setCheckOut(event.target.value)}
                  className="max-w-full bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
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
                  aria-label="Number of guests"
                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                    <option key={count} value={count}>{count} guest{count === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </span>
            </label>
            <button type="submit" className="btn-brass min-h-14 w-full lg:px-3">
              <Search size={17} /> Find my stay
            </button>
          </form>
          <p className="mt-3 max-w-3xl text-[11px] font-medium leading-relaxed text-ink-200">
            Your dates and guest count carry into your request. The host checks availability and terms before a booking is accepted.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Guest stays</p>
            <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">Find a place that fits your plans.</h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
              From a weekend away to a family visit or business trip, discover stays that suit the way you travel.
            </p>
          </div>
          <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">Explore all stays <ArrowRight size={15} /></Link>
        </div>
        {backendError ? (
          <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-6 py-6 text-sm font-semibold text-red-800">We couldn't load available stays: {backendError}</div>
        ) : !backendReady ? (
          <div className="mt-7 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">Loading verified stays…</div>
        ) : featured.length > 0 ? (
          <>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(property => <PropertyCard key={property.id} p={property} />)}
            </div>
            <p className="mt-4 text-[11px] font-medium text-ink-400">
              Showing {featured.length} of {approved.length} currently approved listing{approved.length === 1 ? '' : 's'}. Verification details vary by property.
            </p>
          </>
        ) : (
          <div className="mt-7 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center">
            <h3 className="font-display text-xl font-bold text-ink-900">New stays are on the way.</h3>
            <p className="mt-2 text-sm text-ink-500">There are no approved listings to show right now. Explore stays again soon.</p>
            <Link to="/stays" className="btn-jade mt-5">Explore stays <ArrowRight size={15} /></Link>
          </div>
        )}
      </section>

      <section id="trust" className="border-y border-ink-100 bg-clay/70 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Before you book</p>
            <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">Feel good about where you stay.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
              Know the important details before you commit, from property information to the cost and conditions of your stay.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: BedDouble, title: 'Know what you’re booking.', body: 'Review each listing’s available details, amenities, house rules and property-specific verification information.' },
              { Icon: Banknote, title: 'Understand the full cost.', body: 'See accommodation charges, applicable mandatory fees and any refundable caution fee separately.' },
              { Icon: FileText, title: 'Keep a clear booking record.', body: 'Check your booking status and payment details from your guest account.' },
              { Icon: LifeBuoy, title: 'Know where to turn.', body: 'For eligible bookings, raise a property or booking issue from your booking record.' },
            ].map(({ Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
                <Icon size={22} className="text-jade-700" strokeWidth={1.8} />
                <h3 className="mt-4 font-display text-base font-bold text-ink-900">{title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
              </article>
            ))}
          </div>
          <Link to="/account" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-jade-800 hover:text-jade-900">
            View your bookings <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {areas.length > 0 && (
        <section className="border-t border-ink-100 bg-clay py-11">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Explore available areas</p>
            <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2">
              {areas.map(destination => (
                <Link key={destination} to={`/stays?area=${encodeURIComponent(destination)}`} className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 font-semibold text-ink-800 transition hover:border-jade-500 hover:text-jade-800">
                  {destination}<ChevronRight size={15} className="text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-jade-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-ink-950 p-7 text-paper sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">A clearer way to handle the unexpected</p>
            <h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">Your booking should have a clear record and a clear route for raising concerns.</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
              Follow booking and payment details from your guest account. Where available, report a property or booking issue from the relevant booking record.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Link to="/account" className="btn-brass min-h-12">Go to my bookings <ArrowRight size={15} /></Link>
            <Link to="/legal/trust" className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-ink-200 hover:text-white">
              Read about property verification <BadgeCheck size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-7 sm:p-10">
          <img src="/images/prop/exterior-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 to-ink-950/45" />
          <div className="relative max-w-2xl">
            <Building2 size={27} className="text-brass-400" />
            <h2 className="mt-3 font-display text-3xl font-black text-paper sm:text-4xl">Your property deserves more than a listing.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-200">
              Bring your shortlet onto a platform with tools to organise property details, bookings and earnings, and work with authorised partners.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/partner/register" className="btn-brass min-h-12">List or manage a property <ArrowRight size={15} /></Link>
              <Link to="/signin" className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10">
                Partner sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-paper px-4 py-12 text-center sm:px-6 sm:py-14">
        <ClipboardCheck size={23} className="mx-auto text-jade-700" />
        <h2 className="mt-3 font-display text-3xl font-black text-ink-900">Your next stay starts here.</h2>
        <p className="mt-2 text-sm font-medium text-ink-500">Find a place that fits your plans and feel good about your choice.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/stays" className="btn-jade min-h-12">Explore stays <ArrowRight size={15} /></Link>
          <Link to="/partner/register" className="btn-outline min-h-12">Partner with HAMLET</Link>
        </div>
      </section>
    </GuestLayout>
  );
}
