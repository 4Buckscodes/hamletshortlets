import { useParams, Link, NavLink } from 'react-router-dom';
import { GuestLayout } from '../components/Navbar';
import { ShieldCheck, ScrollText, Banknote, FileCheck } from 'lucide-react';

const TABS = [
  { to: '/legal/privacy', label: 'Privacy & data', Icon: ShieldCheck },
  { to: '/legal/terms', label: 'Booking terms', Icon: ScrollText },
  { to: '/legal/trust', label: 'Trust & verification', Icon: FileCheck },
  { to: '/legal/pricing', label: 'Fees & settlement', Icon: Banknote },
];

const CONTENT: Record<string, { title: string; intro: string; sections: { h: string; b: string }[] }> = {
  privacy: {
    title: 'Privacy & data protection',
    intro: 'HAMLET handles personal data under the Nigeria Data Protection Regulation (NDPR) principles: minimisation, purpose limitation, access control, retention discipline and breach readiness.',
    sections: [
      { h: 'What we collect', b: 'Guests: identity, contact details, booking records, payment references (never card data — that lives with the provider), and private pilot feedback. Partners and owners: identity documents, proof of authority and listing evidence. HAMLET operations: full ledger, audit and incident records.' },
      { h: 'What we never collect', b: 'Card numbers, CVVs or full bank credentials. HAMLET does not hold customer funds and operates no wallet. Provider references only.' },
      { h: 'Access control', b: 'Permissions are enforced server-side and at the data layer, not just in the UI. Sensitive guest, identity and incident data is restricted to authorised operations roles. Public registration never grants admin or partner-privileged access.' },
      { h: 'Retention & breach procedure', b: 'Booking, ledger and incident records are retained per the pilot retention schedule. A documented incident and breach-response procedure is in place; affected users and the NDPC are notified as required. A formal privacy notice and data-protection assessment is a launch dependency and is being completed before full launch.' },
    ],
  },
  terms: {
    title: 'Booking terms of service',
    intro: 'HAMLET is a marketplace, not the property owner. The agreement for your stay is between you and the owner/authorised partner, facilitated and accounted for by HAMLET.',
    sections: [
      { h: 'Request to book — the only flow', b: 'Every booking is a request. The owner or authorised partner checks availability and terms. Acceptance sets a payment deadline (48h in the pilot). Your booking is confirmed only after our payment provider verifies your payment server-side AND final availability is rechecked.' },
      { h: 'Payment & proof', b: 'Pay only through the provider checkout shown to you. A browser redirect, screenshot or uploaded receipt is never proof of payment and will not confirm a booking. Deposits are refundable and held separately; they are never part of the HAMLET fee base.' },
      { h: 'Cancellation & refunds', b: 'Cancellation outcomes (guest before acceptance, owner cancellation, expired payment deadline, dispute resolution, force majeure) are recorded on the booking. Refunds follow the recorded outcome and are processed via the provider. Controlled ledger entries are reconciled against provider records.' },
      { h: 'Issues & disputes', b: 'Report any issue from your account. HAMLET operations assigns, investigates, escalates and closes issues with recorded evidence and decisions. Critical safety issues result in immediate listing suspension pending investigation.' },
    ],
  },
  trust: {
    title: 'Trust & verification',
    intro: 'HAMLET verification is manual and evidence-based. We record outcomes honestly instead of printing blanket trust badges.',
    sections: [
      { h: 'What “verified” means', b: 'Ownership, identity, authority to list and (where completed) physical inspection were reviewed by a named HAMLET reviewer against documentary evidence. Each verification pillar is recorded separately per listing.' },
      { h: '“Self-reported” means exactly that', b: 'A checked box on a submission is an attestation until a reviewer examines the evidence. Self-reported items are labelled as such on the listing and in the partner portal.' },
      { h: 'Duplicate & integrity checks', b: 'Submissions are screened for duplicate listings and inconsistent evidence before approval. Suspensions are used when justified — safety incidents, undisclosed works, misrepresentation.' },
      { h: 'Who lists on HAMLET', b: 'Owners, authorised agents, property managers, shortlet operators, co-hosts and referral partners. Each listing records who submitted it, in what role, and the basis of their authority to list it.' },
    ],
  },
  pricing: {
    title: 'Fees & settlement',
    intro: 'One shared pricing engine computes every guest-facing total on HAMLET — the same number on the listing, in your cart, at payment and in the ledger.',
    sections: [
      { h: 'Guest service fee', b: '3% of the accommodation subtotal after any applicable accommodation discount. Paid by guests. Owners pay 0% — owner proceeds are never reduced by the guest-facing fee.' },
      { h: 'Worked example', b: '₦100,000 accommodation subtotal → ₦3,000 HAMLET guest fee → ₦103,000 guest-facing total before any later-approved processing-fee policy or other separately disclosed mandatory charges.' },
      { h: 'Excluded from the fee base', b: 'Refundable deposits. Separately disclosed mandatory charges (e.g. cleaning). Provider processing-fee charges are excluded until a written policy is decided and approved — they are never collected from guests by default.' },
      { h: 'Pilot settlement', b: 'Transactions are recorded in a controlled ledger with booking reference, amounts, statuses, provider references, fee calculations, refunds, reconciliation variances and the responsible operator. Settlements during the pilot are manual and reconciled. Automated commission splitting and payouts are deferred.' },
    ],
  },
};

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const c = CONTENT[page ?? 'privacy'] ?? CONTENT.privacy;

  return (
    <GuestLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">HAMLET · Legal & policy</p>
        <h1 className="mt-1.5 font-display text-3xl font-black text-ink-900">{c.title}</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] font-medium leading-relaxed text-ink-600">{c.intro}</p>

        <div className="mt-6 flex flex-wrap gap-1.5 border-b border-ink-100 pb-4">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11.5px] font-bold transition ${isActive ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
              <t.Icon size={14} />{t.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          {c.sections.map(s => (
            <section key={s.h} className="card p-6">
              <h2 className="font-display text-[17px] font-black text-ink-900">{s.h}</h2>
              <p className="mt-1.5 max-w-4xl text-[13.5px] font-medium leading-relaxed text-ink-700">{s.b}</p>
            </section>
          ))}
        </div>
        <p className="mt-6 text-[10.5px] font-semibold text-ink-400">HAMLET v1.0 · Decision date 11 October 2026 · Lagos pilot · These documents reflect the pilot release and are subject to the Nigerian legal review launch dependency. Last updated 22 Oct 2026.</p>
      </div>
    </GuestLayout>
  );
}
