import { Link } from 'react-router-dom';
import {
  ArrowRight, BedDouble, Building2, CheckCircle2, Compass, KeyRound, LifeBuoy, ShieldCheck, Wifi,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';

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
    'HAMLET was created around a simple idea: choosing where you stay should feel more straightforward, more transparent, and less stressful.',
  );

  return (
    <GuestLayout>
      <section className="border-b border-ink-100 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">About HAMLET</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-tight sm:text-5xl">
            We believe a good stay should begin before you arrive.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-ink-100">
            Finding an apartment should be the easy part of your trip.
          </p>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
            Yet anyone who has booked a shortlet knows how quickly the excitement can turn into uncertainty. The photos look promising, but are they current? The location sounds convenient, but how far is it really? Is the power backup adequate? What will you pay in total? And when you arrive, will someone be there to let you in?
          </p>
          <p className="mt-3 max-w-3xl text-sm font-bold text-brass-200">
            These are not small details. They shape the entire experience.
          </p>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
            HAMLET was created around a simple idea: choosing where you stay should feel more straightforward, more transparent, and less stressful.
          </p>
        </div>
      </section>

      {/* Four Pillars of a Better Stay (moved from homepage to About Us) */}
      <section id="four-pillars" className="border-b border-ink-100 bg-clay/70 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
              Four pillars of a better stay
            </p>
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
            {FOUR_PILLARS.map(({ num, Icon, title, lead, body, extra, cta, to }) => (
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

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-jade-700">
              <Compass size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Marketplace clarity</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
              More than a listing. A better way to choose.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              We’re building a shortlet marketplace that brings guests and property owners, managers, and hospitality partners together.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              For guests, that means a place to discover accommodation, compare options, review important details, and understand the booking process. For partners, it means a platform to present their properties, manage their listings, and connect with people looking for a place to stay.
            </p>
            <p className="mt-2.5 text-sm font-bold text-ink-900">
              Our goal is not simply to show you more apartments. It is to help you make a better-informed choice.
            </p>
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-jade-700">
              <CheckCircle2 size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Real traveller needs</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
              Built for the way you actually travel in Lagos.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              From the corporate pulse of Victoria Island and Ikoyi to the energy of Lekki and the mainland convenience of Ikeja, every trip comes with different expectations.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              A business traveller may need dependable internet and a convenient location. A family may prioritise space, security arrangements, and a kitchen. A couple planning a weekend away may care about privacy, atmosphere, and a comfortable setting.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              Useful property information matters — amenities, power arrangements, house rules, access procedures, and upfront pricing help you decide whether a space fits your plans.
            </p>
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-jade-700">
              <ShieldCheck size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Earned accountability</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
              Trust is something we have to earn.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              We don’t believe trust comes from putting the word verified on a page or making promises that sound good in an advert.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
              Trust comes from clear information, responsible partners, honest communication, consistent processes, and taking concerns seriously when something goes wrong.
            </p>
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-jade-700">
              <Building2 size={19} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Guests & partners</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
              A better experience on both sides.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Guests need clarity and confidence. Property owners and hospitality partners need a practical way to present their spaces, reach serious guests, and manage booking activity.
            </p>
            <p className="mt-2.5 text-sm font-semibold text-ink-800">
              HAMLET brings both sides together around making stays easier to discover, understand, and manage.
            </p>
          </section>
        </div>

        <section className="rounded-3xl bg-ink-950 p-7 text-center text-paper sm:p-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">HAMLET. {HAMLET_TAGLINE}</p>
          <h2 className="mt-2 font-display text-3xl font-black">{HAMLET_TAGLINE}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-ink-200">
            Find your space. Understand the details. Make your plans with greater confidence.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/stays" className="btn-brass min-h-12">
              Find your stay <ArrowRight size={15} />
            </Link>
            <Link
              to="/partner/register"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
            >
              Join our partner network
            </Link>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
