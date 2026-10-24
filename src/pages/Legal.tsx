import { Link, useParams, NavLink } from 'react-router-dom';
import { GuestLayout } from '../components/Navbar';
import { HAMLET_PARENT_COMPANY, usePageMeta } from '../lib/brand';
import { ShieldCheck, ScrollText, Banknote, FileCheck } from 'lucide-react';

const TABS = [
  { to: '/legal/privacy', label: 'Privacy & NDPR', Icon: ShieldCheck },
  { to: '/legal/terms', label: 'Booking terms', Icon: ScrollText },
  { to: '/legal/trust', label: 'Trust & verification', Icon: FileCheck },
  { to: '/legal/pricing', label: 'Fees & settlement', Icon: Banknote },
];

const CONTENT: Record<string, { title: string; intro: string; sections: { h: string; b: string }[] }> = {
  privacy: {
    title: 'Privacy & data protection',
    intro:
      'HAMLET handles personal data under the Nigeria Data Protection Regulation (NDPR) principles: minimisation, purpose limitation, access control, retention discipline and breach readiness.',
    sections: [
      {
        h: 'What we collect',
        b: 'Guests: identity, contact details, booking records, payment references (never card data — that lives with the provider), and private pilot feedback. Partners and owners: identity documents, proof of authority and listing evidence. HAMLET operations: full ledger, audit and incident records.',
      },
      {
        h: 'What we never collect',
        b: 'Card numbers, CVVs or full bank credentials. HAMLET does not hold customer funds and operates no wallet. Provider references only.',
      },
      {
        h: 'Access control',
        b: 'Permissions are enforced server-side and at the data layer, not just in the UI. Sensitive guest, identity and incident data is restricted to authorised operations roles. Public registration never grants admin or partner-privileged access.',
      },
      {
        h: 'Retention & breach procedure',
        b: 'Booking, ledger and incident records are retained per the pilot retention schedule. A documented incident and breach-response procedure is in place; affected users and the NDPC are notified as required.',
      },
    ],
  },
  terms: {
    title: 'Booking terms of service',
    intro:
      'HAMLET is a marketplace, not the property owner. The agreement for your stay is between you and the owner or authorised partner, facilitated and accounted for by HAMLET.',
    sections: [
      {
        h: 'Request to book — the only flow',
        b: 'Every booking is a request. The owner or authorised partner checks availability and terms. Acceptance sets a payment deadline (48h in the pilot). Your booking is confirmed only after our payment provider verifies your payment server-side AND final availability is rechecked.',
      },
      {
        h: 'Payment & proof',
        b: 'Pay only through the provider checkout shown to you. A browser redirect, screenshot or uploaded receipt is never proof of payment and will not confirm a booking. Caution deposits are held separately, excluded from HAMLET markup and FX buffers, and reviewed after post-checkout inspection.',
      },
      {
        h: 'Cancellation & refunds',
        b: 'Cancellation outcomes (guest before acceptance, owner cancellation, expired payment deadline, dispute resolution, force majeure) are recorded on the booking. Refunds follow the recorded outcome and are processed via the provider. Controlled ledger entries are reconciled against provider records.',
      },
      {
        h: 'Issues & disputes',
        b: 'Report any issue from your account. HAMLET operations assigns, investigates, escalates and closes issues with recorded evidence and decisions. Critical safety issues result in immediate listing suspension pending investigation.',
      },
    ],
  },
  trust: {
    title: 'Trust & verification',
    intro:
      'HAMLET verification is manual and evidence-based. We record outcomes honestly instead of printing blanket trust badges.',
    sections: [
      {
        h: 'What “verified” means',
        b: 'Ownership, identity, authority to list and (where completed) physical inspection were reviewed by a named HAMLET reviewer against documentary evidence. Each verification pillar is recorded separately per listing.',
      },
      {
        h: '“Self-reported” means exactly that',
        b: 'A checked box on a submission is an attestation until a reviewer examines the evidence. Self-reported items are labelled as such on the listing and in the partner portal.',
      },
      {
        h: 'Duplicate & integrity checks',
        b: 'Submissions are screened for duplicate listings and inconsistent evidence before approval so multiple authorised partners never accidentally publish duplicate public listings for the same physical unit.',
      },
      {
        h: 'Who lists on HAMLET',
        b: 'Owners, authorised agents, property managers, shortlet operators, co-hosts and referral partners. Each listing records who submitted it, in what role, and the basis of their authority to list it.',
      },
    ],
  },
  pricing: {
    title: 'Fees & settlement',
    intro:
      'One shared pricing engine computes every guest-facing total on HAMLET — the same number on the listing, in your booking request, at payment and in the ledger.',
    sections: [
      {
        h: '20% domestic accommodation markup & commercial mandates',
        b: 'Owners pay 0% — owners receive 100% of their listed NGN accommodation rate (B). Domestic guest accommodation price is B × 1.20. Standard markup allocation covers closing agent commission (10%), direct partner referral reward during an active 90-day window (2.5%, when eligible), HAMLET allocation (5% with referrer or 7.5% without), and an internal payment & settlement cost reserve (2.5%). Owners and authorised partners may also agree recorded property-specific mandates prior to booking.',
      },
      {
        h: 'Worked example (B = ₦200,000)',
        b: 'Owner listed accommodation rate: ₦200,000 → Domestic guest accommodation price: ₦240,000 (₦40,000 markup: ₦20,000 closing agent, ₦5,000 direct referrer when eligible, ₦10,000 or ₦15,000 HAMLET allocation, and ₦5,000 internal payment reserve).',
      },
      {
        h: 'International USD & GBP quotes (10% currency buffer)',
        b: 'When quoted in USD or GBP using an active configured FX rate, the domestic guest price is converted at the quoted rate and a single 10% international currency buffer is added to cover cross-border FX and card conversion costs. Paystack checkout settles transparently in NGN.',
      },
      {
        h: 'Refundable caution deposit & settlement ledger',
        b: 'Refundable caution deposits are itemised and tracked separately from accommodation revenue, are never included in HAMLET’s 20% markup or 10% FX buffer, and are refunded only after post-checkout inspection review (never automatically or instantly). Actual Paystack processing fees are recorded separately in the ledger.',
      },
    ],
  },
};

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const c = CONTENT[page ?? 'privacy'] ?? CONTENT.privacy;
  usePageMeta(`${c.title} | HAMLET`, c.intro);

  return (
    <GuestLayout>
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="eyebrow-light">HAMLET · Legal &amp; policy</p>
          <h1 className="mt-2.5 font-display text-3xl font-bold text-white sm:text-5xl">
            {c.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            {c.intro}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-5">
          {TABS.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition [&>svg]:shrink-0 ${
                  isActive
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
                }`
              }
            >
              <t.Icon size={14} />
              {t.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-7 grid gap-4">
          {c.sections.map((s, idx) => (
            <section key={s.h} className="card p-5 sm:p-7">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h2 className="font-display text-xl font-bold text-ink-900">{s.h}</h2>
              </div>
              <p className="mt-2.5 max-w-4xl text-sm leading-relaxed text-ink-600 sm:pl-7">
                {s.b}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-6 text-xs font-semibold text-ink-500">
          <p>HAMLET Marketplace Ltd · {HAMLET_PARENT_COMPANY} · Lagos · Oct 2026</p>
          <div className="flex flex-wrap gap-4 text-ink-900">
            <Link to="/how-it-works" className="hover:underline">
              How HAMLET works
            </Link>
            <Link to="/safety" className="hover:underline">
              Safety &amp; guest protection
            </Link>
            <Link to="/faqs" className="hover:underline">
              FAQs
            </Link>
            <Link to="/about" className="hover:underline">
              About HAMLET
            </Link>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
