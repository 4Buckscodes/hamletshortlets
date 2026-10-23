import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, KeyRound, Search } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { usePageMeta } from '../lib/brand';

export default function HowItWorks() {
  usePageMeta(
    'How HAMLET Works | Booking Shortlets Made Clear',
    'Three simple steps to find, review, and request a shortlet stay in Lagos on HAMLET — with clear pricing and arrival details.',
  );

  const steps = [
    {
      step: 'Step 1',
      Icon: Search,
      title: 'Find a space that fits.',
      body: 'Start with your destination, dates, and number of guests. Explore available apartments and compare their location, photos, amenities, prices (in Naira or US Dollars), and house rules.',
      extra: 'Need strong Wi-Fi for work? A kitchen for family meals? A particular Lagos neighbourhood? Start with the things that matter most.',
      cta: { label: 'Explore available stays', to: '/stays' },
    },
    {
      step: 'Step 2',
      Icon: ClipboardCheck,
      title: 'Review the details and request your booking.',
      body: 'Found somewhere you like? Check the property information, total applicable charges, cancellation terms, and check-in arrangements.',
      extra: 'Submit your booking request and follow the instructions provided. Your reservation is subject to availability confirmation by the host or authorised partner and verified payment.',
    },
    {
      step: 'Step 3',
      Icon: KeyRound,
      title: 'Get ready to settle in.',
      body: 'Once your booking is confirmed after verified payment, follow the arrival instructions provided for your stay. Review the check-in time, access process, host or partner contact details, and any property-specific requirements.',
      extra: 'Arrive knowing what to expect, get comfortable, and make the most of your time.',
      cta: { label: 'Find your next stay', to: '/stays' },
    },
  ];

  const checklist = [
    'Confirm the dates and number of guests.',
    'Review the total price and payment instructions.',
    'Check the amenities you rely on.',
    'Read the house rules and cancellation policy.',
    'Save your arrival instructions and support contact details.',
  ];

  return (
    <GuestLayout>
      <section className="border-b border-ink-100 bg-ink-950 text-paper">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">How HAMLET works</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black leading-tight sm:text-5xl">
            Three simple steps to your next stay.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-ink-200">
            You have enough to organise before a trip. Finding a place to stay shouldn’t become another full-time job. Here’s how to get started with HAMLET.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-6">
          {steps.map(({ step, Icon, title, body, extra, cta }) => (
            <article key={step} className="card p-6 sm:p-8">
              <div className="flex items-center gap-2.5 text-jade-700">
                <Icon size={20} className="shrink-0" />
                <span className="font-mono text-xs font-extrabold uppercase tracking-widest">{step}</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-ink-900">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>
              <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink-700">{extra}</p>
              {cta && (
                <Link to={cta.to} className="btn-jade mt-5 min-h-11">
                  {cta.label} <ArrowRight size={15} />
                </Link>
              )}
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-jade-200 bg-jade-50/60 p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-800">Before you book</p>
          <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900">
            A few minutes of checking can make a big difference.
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {checklist.map(item => (
              <li key={item} className="flex items-start gap-2.5 rounded-xl border border-jade-100 bg-white px-4 py-3 text-sm font-semibold text-ink-800">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-jade-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-jade-900">
            A little clarity now makes for a smoother arrival later.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/safety" className="btn-outline !bg-white">Read guest safety & protection</Link>
            <Link to="/faqs" className="btn-outline !bg-white">Browse booking FAQs</Link>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
