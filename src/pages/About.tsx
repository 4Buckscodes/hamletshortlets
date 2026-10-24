import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  Compass,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import {
  HAMLET_BRAND_NAME,
  HAMLET_MANTRA,
  HAMLET_PARENT_COMPANY,
  HAMLET_POSITIONING,
  HAMLET_TAGLINE,
  HAMLET_USP,
  usePageMeta,
} from '../lib/brand';

const FOUR_PILLARS = [
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
    cta: 'How booking works',
    to: '/how-it-works',
  },
  {
    num: '04',
    Icon: LifeBuoy,
    title: 'Help when you need it',
    lead: 'You should never be left wondering who to call.',
    body: 'Questions before arrival? Need clarification about check-in? Something not going as agreed? HAMLET provides a clear support route for guests who need assistance with their booking.',
    cta: 'Guest safety & support',
    to: '/safety',
  },
];

export default function About() {
  usePageMeta(
    'About HAMLET | A Better Way to Book Shortlets',
    'HAMLET for Your Shortlets — a Nigerian shortlet marketplace and property operating platform by Abundance Abodes. Shortlets, with accountability.',
  );

  return (
    <GuestLayout>
      {/* Editorial Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-22">
          <p className="eyebrow-light">
            {HAMLET_BRAND_NAME} · By {HAMLET_PARENT_COMPANY}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            We believe a good stay should begin{' '}
            <span className="italic text-brass-300">before you arrive.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-brass-200">
            {HAMLET_USP} — {HAMLET_MANTRA}
          </p>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200 sm:text-[15px]">
            Anyone who has booked a shortlet knows how quickly excitement can turn into uncertainty. Are the photos current? How reliable is the power backup? What will you pay in total? And when you arrive, will check-in actually work?
          </p>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200 sm:text-[15px]">
            HAMLET was created under <strong className="text-white">{HAMLET_PARENT_COMPANY}</strong> with a long-term vision to build{' '}
            <strong className="text-white">{HAMLET_POSITIONING}</strong> — starting in Lagos with honest verification, single-source pricing, and accountable arrival operations.
          </p>
        </div>
      </section>

      {/* Four Pillars of a Better Stay (required canonical section on About) */}
      <section id="four-pillars" className="border-b border-ink-100 bg-clay/60 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="eyebrow">Four pillars of a better stay</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
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
            {FOUR_PILLARS.map(({ num, Icon, title, lead, body, extra, cta, to }) => (
              <article
                key={num}
                className="flex flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                    {num}
                  </span>
                  <Icon size={20} className="shrink-0 text-ink-900" strokeWidth={1.8} />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{title}</h3>
                <p className="mt-1 text-[12.5px] font-bold text-ink-800">{lead}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
                {extra && <p className="mt-2 text-[12px] font-semibold text-ink-700">{extra}</p>}
                <Link
                  to={to}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-ink-900 hover:text-brass-700"
                >
                  {cta} <ArrowRight size={13} className="shrink-0" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Core Platform Architecture Cards */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brass-700">
              <Compass size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">
                Marketplace clarity
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink-900">
              More than a listing board. An accountable operating system.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              For guests, HAMLET brings together verified property facts, upfront NGN / USD / GBP stay pricing, server-verified Paystack checkout, and Wayfinder arrival guidance.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              For property owners, authorised agents, managers, operators, and referral partners, HAMLET records commercial mandates, 0% owner fees, booking confirmations, and controlled ledger settlements in one place.
            </p>
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brass-700">
              <CheckCircle2 size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">
                Built for Lagos travel
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink-900">
              From Lagos Mainland to Lagos Island &amp; Lekki.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              From Victoria Island, Ikoyi, and Lekki Phase 1 to Yaba, Surulere, Shomolu, Ikeja GRA, Gbagada, and Maryland — every trip comes with real practical requirements.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              Whether you need reliable power and Wi-Fi for remote work, proximity to Murtala Muhammed Airport, or space for a family visit, HAMLET puts the operational details front and centre.
            </p>
          </section>
        </div>

        {/* Closing Brand Callout */}
        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="eyebrow-light">
                {HAMLET_TAGLINE} · {HAMLET_USP}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                {HAMLET_MANTRA}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-200">
                Explore verified apartments across Lagos or apply to join the HAMLET Partner Network under {HAMLET_PARENT_COMPANY}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/stays" className="btn-brass !rounded-full !px-6">
                <ShieldCheck size={15} /> Explore stays
              </Link>
              <Link
                to="/partner/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 [&>svg]:shrink-0"
              >
                <Building2 size={15} /> Partner with HAMLET
              </Link>
            </div>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
