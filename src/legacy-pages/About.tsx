import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  Building2,
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
  HAMLET_USP,
  usePageMeta,
} from '../lib/brand';

const FOUR_PILLARS = [
  {
    num: '01',
    Icon: BedDouble,
    title: 'Know what you’re booking',
    body: 'Clear photos, amenities, house rules, and four-pillar verification status upfront.',
    cta: 'Explore stays',
    to: '/stays',
  },
  {
    num: '02',
    Icon: Wifi,
    title: 'Power and Wi-Fi, explained',
    body: 'Check 24/7 power, inverter/generator backup, and internet setup before booking.',
    cta: 'Filter amenities',
    to: '/stays',
  },
  {
    num: '03',
    Icon: KeyRound,
    title: 'Clear booking steps',
    body: 'Request dates first, pay via Paystack once confirmed, and arrive with Wayfinder.',
    cta: 'How it works',
    to: '/how-it-works',
  },
  {
    num: '04',
    Icon: LifeBuoy,
    title: 'Help when you need it',
    body: 'Log and track stay issues directly from your booking record.',
    cta: 'Safety & support',
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
      {/* Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow-light">
            {HAMLET_BRAND_NAME} · By {HAMLET_PARENT_COMPANY}
          </p>
          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Shortlet stays,{' '}
            <span className="italic text-brass-300">with accountability.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            Built under <strong className="text-white">{HAMLET_PARENT_COMPANY}</strong> as{' '}
            <strong className="text-white">{HAMLET_POSITIONING}</strong> — starting in Lagos with honest verification, upfront pricing, and reliable arrival guidance.
          </p>
        </div>
      </section>

      {/* Four Pillars of a Better Stay */}
      <section id="four-pillars" className="border-b border-ink-100 bg-clay/60 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Four pillars of a better stay</p>
            <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              A good stay is about more than beautiful pictures.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FOUR_PILLARS.map(({ num, Icon, title, body, cta, to }) => (
              <article
                key={num}
                className="flex flex-col rounded-3xl border border-ink-100 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                    {num}
                  </span>
                  <Icon size={19} className="shrink-0 text-ink-900" strokeWidth={1.8} />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{body}</p>
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

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-9">
          <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="eyebrow-light">{HAMLET_USP}</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                {HAMLET_MANTRA}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/stays" className="btn-brass !rounded-full !px-6">
                <ShieldCheck size={15} /> Explore stays
              </Link>
              <Link
                to="/partner/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 [&>svg]:shrink-0"
              >
                <Building2 size={15} /> Partner with us
              </Link>
            </div>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
