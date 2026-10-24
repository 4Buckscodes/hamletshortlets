import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { DocStatusBadge } from '../components/Badges';
import { usePageMeta } from '../lib/brand';
import type { DocStatus } from '../lib/types';

const VERIFICATION_PILLARS = [
  {
    num: '01',
    title: 'Ownership',
    body: 'Title deed, Certificate of Occupancy, or purchase documentation is reviewed against the property record before a verified ownership status is granted.',
  },
  {
    num: '02',
    title: 'Identity',
    body: 'Government-issued identification is verified against the property owner or authorised representative submitting the listing.',
  },
  {
    num: '03',
    title: 'Authority to list',
    body: 'Direct ownership, a signed property management mandate, or documented owner consent is recorded so unauthorised third parties cannot duplicate a unit.',
  },
  {
    num: '04',
    title: 'Physical inspection',
    body: 'Where completed, a HAMLET reviewer checks real apartment photography, stated amenities, power backup arrangements, and arrival accuracy on-site.',
  },
] as const;

const HONEST_STATUSES: { status: DocStatus; code: string; desc: string }[] = [
  {
    status: 'verified',
    code: 'verified',
    desc: 'Independently reviewed documentary or on-site evidence recorded by HAMLET.',
  },
  {
    status: 'self_reported',
    code: 'self_reported',
    desc: 'Declared by the partner at submission and honestly labelled until reviewed.',
  },
  {
    status: 'pending_review',
    code: 'pending_review',
    desc: 'Evidence submitted and currently in the HAMLET operations review queue.',
  },
  {
    status: 'missing',
    code: 'missing',
    desc: 'Not yet supplied — shown transparently rather than hidden behind a blanket badge.',
  },
];

export default function Safety() {
  usePageMeta(
    'Guest Safety & Booking Protection | HAMLET',
    'How HAMLET handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution.',
  );

  return (
    <GuestLayout>
      {/* Editorial Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow-light">Guest safety &amp; protection</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Trust is a{' '}
            <span className="italic text-brass-300">four-pillar structure.</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            Off-platform transfers, unverified middlemen, and misleading photos are how shortlet stays go wrong. HAMLET is built to make verification status, total pricing, payment checkout, and issue escalation clear before you commit.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:px-6 sm:py-16">
        {/* Four Verification Pillars (01–04) */}
        <section>
          <p className="eyebrow">Recorded per listing</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            How HAMLET reviews properties
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VERIFICATION_PILLARS.map(pillar => (
              <article key={pillar.num} className="card flex flex-col p-6">
                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                  {pillar.num}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{pillar.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Honest Labelling Legend */}
        <section className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
          <p className="eyebrow">No blanket badges</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink-900">
            Honest labelling — verified vs. self-reported
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600">
            Not every pillar is completed at the same moment, so HAMLET never prints a vague trust seal over unreviewed claims. Every listing displays the exact status of each pillar:
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HONEST_STATUSES.map(item => (
              <div
                key={item.code}
                className="rounded-2xl border border-ink-100 bg-paper/75 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <DocStatusBadge status={item.status} />
                  <span className="font-mono text-[10.5px] font-bold text-ink-400">
                    {item.code}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-ink-700">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Protection + NDPR Privacy Dual Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-6 sm:p-7">
            <div className="flex items-center gap-2 text-ink-900">
              <CreditCard size={20} className="shrink-0 text-brass-600" />
              <h2 className="font-display text-xl font-bold">Payment &amp; pricing protection</h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
              {[
                'Checkout opens only inside your signed-in HAMLET guest account after availability is confirmed',
                'Reservations confirm exclusively via Paystack’s signed server-side webhook — never screenshots',
                'Never transfer money to personal bank accounts or informal off-platform contacts',
                'Full breakdown shown upfront: owner rate, 20% markup, mandatory charges, and 10% USD/GBP buffer where applicable',
                'Refundable caution deposits are tracked separately and reviewed post-checkout',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6 sm:p-7">
            <div className="flex items-center gap-2 text-ink-900">
              <Lock size={20} className="shrink-0 text-brass-600" />
              <h2 className="font-display text-xl font-bold">Privacy &amp; physical access</h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
              {[
                'Zero card numbers or CVVs stored on HAMLET servers — payment credentials stay with Paystack',
                'Exact gate pins, internal compound turns, and door codes unlock only for confirmed bookings',
                'Row-level access controls protect identity documents and operational records under NDPR principles',
                'Keep access codes private and verify you are speaking with the authorised property contact',
                'Power backup, Wi-Fi, and house rules are stated per property before you commit',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Power & Amenity Expectations */}
        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
            <Zap size={20} className="shrink-0 text-brass-600" /> Power, water, Wi-Fi &amp; arrival accuracy
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            Amenities vary from property to property across Lagos. Before requesting a booking, check whether the home provides 24/7 estate power, inverter or generator backup, dedicated workspace, parking, and gated security. Verification is evidence-based rather than a guarantee against unforeseen utility faults — if a material discrepancy affects your stay, report it immediately from your booking record so HAMLET operations (<em>The Watch</em>) can investigate against the listing record.
          </p>
        </section>

        {/* Escalation Callout */}
        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-10">
          <div className="flex items-center gap-2 text-brass-300">
            <LifeBuoy size={18} className="shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">
              Something wrong during a stay?
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Report issues directly from your booking record.
          </h2>
          <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
            Open <strong>My Account → My Bookings → Report Issue</strong> with your booking reference, timestamp, and supporting photos or notes. HAMLET operations logs, assigns, and tracks every incident through resolution. For any immediate threat to physical safety, contact local emergency services first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/account" className="btn-brass min-h-12 !rounded-full !px-6">
              Report from my account <ArrowRight size={15} />
            </Link>
            <Link
              to="/stays"
              className="inline-flex min-h-12 items-center rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              Browse verified homes
            </Link>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
