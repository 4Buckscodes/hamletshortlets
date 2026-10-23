import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Compass, ShieldCheck } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';

export default function About() {
  usePageMeta(
    'About HAMLET | A Better Way to Book Shortlets',
    'HAMLET was created around a simple idea: choosing where you stay should feel more straightforward, more transparent, and less stressful.',
  );

  return (
    <GuestLayout>
      <section className="border-b border-ink-100 bg-ink-950 text-paper">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
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

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-14 sm:px-6 sm:py-16">
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
            We understand that the right stay looks different for different people. That is why useful property information matters — including amenities, power arrangements, house rules, access procedures, pricing, and the details that help you decide whether a space fits your plans.
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
            Trust comes from clear information, responsible partners, honest communication, consistent processes, and taking concerns seriously when something goes wrong. HAMLET is being built to make those expectations part of the experience.
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            As our marketplace grows, we continue to strengthen property checks, improve booking transparency, and keep clear routes for guests and partners to resolve issues.
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
            A good marketplace should work for guests and the people providing the accommodation. Guests need clarity and confidence. Property owners need a practical way to present their spaces and manage booking activity. Hospitality partners need a platform that helps them reach the right audience.
          </p>
          <p className="mt-2.5 text-sm font-semibold text-ink-800">
            HAMLET brings these needs together around one shared purpose: making stays easier to discover, understand, and manage.
          </p>
        </section>

        <section className="rounded-3xl bg-ink-950 p-7 text-center text-paper sm:p-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">HAMLET. {HAMLET_TAGLINE}</p>
          <h2 className="mt-2 font-display text-3xl font-black">{HAMLET_TAGLINE}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-ink-200">
            Whether you’re planning a night away, a week of meetings, a family visit, or a longer stay, we want HAMLET to be a useful place to begin. Find your space. Understand the details. Make your plans with greater confidence.
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
