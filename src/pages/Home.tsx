import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Calendar, Users, ShieldCheck, ArrowRight, BadgeCheck,
  MessageSquareLock, Banknote, ClipboardCheck, KeyRound, Building2, ChevronRight, Sparkles,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { PropertyCard } from '../components/PropertyCard';
import { useHamlet } from '../lib/store';
import { formatNaira, calculateGuestPricing, HAMLET_GUEST_SERVICE_FEE_RATE } from '../lib/pricing';

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
};

export default function Home() {
  const { state } = useHamlet();
  const navigate = useNavigate();
  const [area, setArea] = useState('');
  const [checkIn, setCheckIn] = useState('2026-11-06');
  const [checkOut, setCheckOut] = useState('2026-11-09');
  const [guests, setGuests] = useState(2);

  const approved = state.properties.filter(p => p.status === 'approved');
  const featured = approved.slice(0, 6);
  const example = calculateGuestPricing({ accommodationSubtotal: 100000 }); // spec example

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (area) q.set('area', area);
    q.set('checkIn', checkIn); q.set('checkOut', checkOut); q.set('guests', String(guests));
    navigate(`/stays?${q.toString()}`);
  };

  const areas = [...new Set(approved.map(p => p.area))];

  return (
    <GuestLayout>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950">
        <img src="/images/lagos-hero.jpg" alt="Lagos skyline along the lagoon" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:pb-24">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brass-400/40 bg-brass-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brass-300">
              <Sparkles size={12} /> Lagos pilot · Now booking
            </div>
            <h1 className="mt-5 font-display text-[42px] font-black leading-[1.02] tracking-tight text-paper sm:text-6xl">
              Lagos shortlets,<br />
              <span className="italic text-brass-400">verified</span> before you book.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] font-medium leading-relaxed text-ink-100">
              HAMLET is a trusted shortlet marketplace where every home is manually reviewed,
              every price is shown in full before you commit, and every booking is a real,
              request-to-book transaction with named accountability.
            </p>
          </motion.div>

          {/* Search */}
          <motion.form
            onSubmit={search}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
            className="mt-8 grid max-w-3xl grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-ink-900/80 p-2.5 shadow-2xl backdrop-blur-md lg:grid-cols-12"
          >
            <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2.5 lg:col-span-3">
              <MapPin size={16} className="shrink-0 text-brass-400" />
              <span className="w-full">
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-ink-300">Lagos area</span>
                <select value={area} onChange={e => setArea(e.target.value)} className="w-full appearance-none bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900">
                  <option value="">All Lagos areas</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2.5 lg:col-span-3">
              <Calendar size={16} className="shrink-0 text-brass-400" />
              <span>
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-ink-300">Check in</span>
                <input type="date" value={checkIn} min="2026-10-22" onChange={e => setCheckIn(e.target.value)} className="bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]" />
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2.5 lg:col-span-3">
              <Calendar size={16} className="shrink-0 text-brass-400" />
              <span>
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-ink-300">Check out</span>
                <input type="date" value={checkOut} min="2026-10-23" onChange={e => setCheckOut(e.target.value)} className="bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]" />
              </span>
            </label>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2.5 lg:col-span-2">
              <Users size={16} className="shrink-0 text-brass-400" />
              <span>
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-ink-300">Guests</span>
                <select value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full appearance-none bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                </select>
              </span>
            </label>
            <button type="submit" className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-brass-500 px-4 py-3 font-display text-[15px] font-black text-ink-950 transition hover:bg-brass-400 lg:col-span-1">
              <Search size={17} strokeWidth={2.75} /> Search
            </button>
          </motion.form>

          {/* Pilot stats */}
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px] font-semibold text-ink-100">
            {['50 approved properties by 31 Oct 2026', 'Guest fee 3% · Owner fee 0%', 'Every listing reviewed by a human'].map(t => (
              <span key={t} className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-brass-400" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPROVED SUPPLY ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Approved supply</p>
            <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900">This week on HAMLET</h2>
            <p className="mt-1 max-w-md text-[13px] font-medium text-ink-500">{approved.length} of 50 target properties approved — every one manually verified. Only approved, non-suspended listings are ever discoverable.</p>
          </div>
          <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">Explore all stays <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" className="border-y border-ink-100 bg-ink-950 py-16 text-ink-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">How HAMLET works</p>
            <h2 className="mt-2 font-display text-3xl font-black text-paper sm:text-4xl">Request to book.<br />Not request to hope.</h2>
            <p className="mt-2 text-[13.5px] font-medium text-ink-300">A booking becomes real only after the owner accepts and your payment is verified server-side by our payment provider.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Search, step: '01', title: 'Discover verified homes', body: 'Filter Lagos by area, dates, price, capacity and amenities. See honest trust labels — never inflated claims.' },
              { Icon: MessageSquareLock, step: '02', title: 'Request to book', body: 'See the full total — subtotal + 3% guest fee + mandatory charges — before you send the request. No surprises at checkout.' },
              { Icon: ClipboardCheck, step: '03', title: 'Owner confirms & you pay', body: 'Owner checks availability and terms. Acceptance triggers a payment deadline — your money moves only through our provider.' },
              { Icon: KeyRound, step: '04', title: 'Stay with support', body: 'Confirmed booking details, house rules and a direct line to HAMLET support — with issue resolution from check-in to settlement.' },
            ].map(({ Icon, step, title, body }) => (
              <div key={step} className="rounded-2xl border border-ink-800 bg-ink-900 p-6 transition hover:border-brass-600">
                <div className="flex items-center justify-between">
                  <Icon size={26} className="text-brass-400" strokeWidth={1.75} />
                  <span className="font-display text-4xl font-black text-ink-800">{step}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-paper">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST & TRANSPARENT PRICING ──────────────────────── */}
      <section id="trust" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Trust & transparency</p>
            <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">One fee. Shown once.<br />Never moves.</h2>
            <p className="mt-3 max-w-md text-[13.5px] font-medium leading-relaxed text-ink-600">
              The guest-facing total is the discounted accommodation subtotal plus HAMLET's 3% guest service
              fee and any known mandatory charges. It is calculated by a single shared pricing engine —
              the same number your eyes see, the same number the ledger records.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                '3% guest service fee — paid by guests, never by owners (owner fee: 0%)',
                'Fee base: accommodation subtotal after discounts — never on refundable deposits',
                'Provider processing-fee policy is not yet decided — never passed to you by default',
                'Refundable deposits shown separately, released after checkout inspection',
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-[13px] font-medium text-ink-700">
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-jade-600" />{t}
                </li>
              ))}
            </ul>
          </div>
          {/* Receipt-style price breakdown */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-brass-400/30 via-jade-200/40 to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-dashed border-ink-200 pb-3">
                <p className="font-display text-[15px] font-black text-ink-900">Total price, upfront</p>
                <span className="rounded-md bg-jade-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-jade-800">For every stay</span>
              </div>
              <dl className="mt-4 space-y-2.5 text-[13.5px] font-medium text-ink-800">
                <div className="flex justify-between"><dt>Accommodation subtotal (₦100,000)</dt><dd className="tabular-nums">{formatNaira(100000)}</dd></div>
                <div className="flex justify-between"><dt>HAMLET guest service fee ({(HAMLET_GUEST_SERVICE_FEE_RATE * 100).toFixed(0)}% × subtotal)</dt><dd className="tabular-nums">{formatNaira(example.hamletGuestServiceFee)}</dd></div>
                <div className="flex justify-between text-ink-400"><dt>Refundable deposit (separate, not fee-bearing)</dt><dd>varies</dd></div>
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink-900 pt-4">
                <span className="font-display text-base font-black text-ink-900">Guest-facing total</span>
                <span className="font-display text-2xl font-black text-jade-800">{formatNaira(example.guestTotal)}</span>
              </div>
              <p className="mt-2 text-right text-[10.5px] font-semibold text-ink-400">Spec example: ₦100,000 subtotal → ₦3,000 fee → ₦103,000 total</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-[11px] font-semibold text-ink-600">
                <Banknote size={14} className="shrink-0 text-jade-700" /> The total never increases at checkout. What you see is what you pay — plus any separately disclosed mandatory charges, shown in the same breakdown.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AREAS ────────────────────────────────────────────── */}
      <section className="border-t border-ink-100 bg-clay py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Launch areas — Lagos only</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {['Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Oniru', 'Ikeja GRA', 'Banana Island'].map(a => (
              <Link key={a} to={`/stays?area=${encodeURIComponent(a)}`} className="group inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-3 font-display text-[15px] font-bold text-ink-800 transition hover:border-jade-500 hover:text-jade-800">
                {a}<ChevronRight size={15} className="text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-jade-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNER CTA ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-8 sm:p-12">
          <img src="/images/prop/exterior-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 to-ink-950/20" />
          <div className="relative max-w-xl">
            <Building2 size={28} className="text-brass-400" />
            <h2 className="mt-3 font-display text-2xl font-black text-paper sm:text-3xl">Own a Lagos shortlet?<br />List it on verified ground.</h2>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-200">Owners, agents, property managers, shortlet operators, co-hosts and referral partners — one registration, role-based access, zero owner fees. 0% HAMLET fee on your proceeds.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/partner/register" className="btn-brass">Apply as a partner <ArrowRight size={16} /></Link>
              <Link to="/signin" className="btn !border !border-white/20 !bg-white/5 !px-5 !py-3 text-paper hover:bg-white/10">Partner sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
