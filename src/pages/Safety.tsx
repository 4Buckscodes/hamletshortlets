import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, CreditCard, LifeBuoy, Lock, RefreshCcw, ShieldCheck, Zap } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { usePageMeta } from '../lib/brand';

export default function Safety() {
  usePageMeta(
    'Guest Safety & Booking Protection | HAMLET',
    'How HAMLET handles property verification, clear pricing, payment awareness, physical access, amenities, and support if something goes wrong.',
  );

  return (
    <GuestLayout>
      <section className="border-b border-ink-100 bg-ink-950 text-paper">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
            Safety, transparency & guest protection
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black leading-tight sm:text-5xl">
            Your peace of mind matters.
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-ink-100">
            A shortlet booking involves more than choosing an attractive room. You are trusting a listing, a property representative, and a set of arrangements that need to work when you arrive. We take that seriously.
          </p>
          <p className="mt-2.5 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
            HAMLET is designed to make property information, booking terms, payment instructions, and support routes easier to understand before you commit. Here is what guests should know.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-14 sm:px-6 sm:py-16">
        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <ShieldCheck size={20} className="shrink-0 text-jade-700" /> 1. Property information and verification
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            We want guests to be able to make decisions based on accurate, useful information. Where a property is marked as verified, the listing explains the relevant verification status (ownership, identity, authority to list, and inspection) and what was checked. Verification should not be interpreted as a guarantee that every amenity will always work or that every future stay will be problem-free.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Before booking, review the listing photos, location, facilities, occupancy limits, and house rules. If you notice a material discrepancy, contact HAMLET through your booking support channel and provide the booking details and any relevant evidence.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <Banknote size={20} className="shrink-0 text-jade-700" /> 2. Clear pricing before commitment
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            You should understand the cost of your stay before you confirm. Review the price breakdown, including the nightly rate, the 3% HAMLET guest service fee, disclosed mandatory charges, and any refundable security deposit shown for your booking. Check the payment instructions and cancellation terms before proceeding.
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-800">
            Never rely on an informal promise that conflicts with the displayed booking terms. If someone requests an additional payment that was not disclosed, pause and contact HAMLET through the official support route before sending money.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <CreditCard size={20} className="shrink-0 text-jade-700" /> 3. Payment awareness
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            Follow the payment process presented through HAMLET for your reservation. Confirm the amount, recipient, and booking reference before making a payment. Do not send funds to an unrelated personal account or an unverified contact simply because someone claims to represent a property.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Keep receipts, payment confirmations, and booking records until your stay is complete. Reservations are confirmed only after server-verified payment.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <Lock size={20} className="shrink-0 text-jade-700" /> 4. Physical safety and property access
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            Every property has its own access arrangements. Review the entry instructions and ask questions about anything that is unclear before arrival. Where provided, check the details of gated access, building security, smart locks, parking, and identification requirements.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-700">
            <li>Share your itinerary with someone you trust when appropriate.</li>
            <li>Keep access codes and keys private.</li>
            <li>Confirm you are communicating with the authorised property contact.</li>
            <li>Do not disclose passwords, banking PINs, or one-time banking codes.</li>
            <li>If you arrive and the property or access arrangements materially differ from what was agreed, document the issue and contact support.</li>
          </ul>
          <p className="mt-3 text-xs font-medium text-ink-500">
            No online platform can guarantee complete physical safety at every property. Our aim is to help guests make informed choices and provide a clear process for raising concerns.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <Zap size={20} className="shrink-0 text-jade-700" /> 5. Power, water, Wi-Fi and other amenities
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            Amenities vary from property to property. If uninterrupted power, air conditioning, hot water, or reliable internet is essential to your stay, review the property’s stated arrangements before booking. A listed amenity is an important representation — if a material discrepancy affects your stay, report it from your booking record with the relevant details.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <LifeBuoy size={20} className="shrink-0 text-jade-700" /> 6. What happens if something goes wrong?
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            If you encounter a problem, report an issue from your HAMLET guest account as soon as possible and provide:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Your booking reference.</li>
            <li>The property and issue involved.</li>
            <li>The time the problem occurred.</li>
            <li>Relevant photos, screenshots, or messages, where safe and appropriate.</li>
            <li>The resolution you are seeking.</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-red-800">
            For an immediate threat to life or physical safety, contact the appropriate local emergency service first.
          </p>
        </section>

        <section className="card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
            <RefreshCcw size={20} className="shrink-0 text-jade-700" /> 7. Cancellations, refunds and disputes
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
            Cancellation and refund eligibility depends on the terms shown for the booking and the circumstances of the issue. Review the policy before confirming your reservation. If a significant problem arises, report it promptly and retain your supporting evidence. Any refund or dispute outcome is handled according to the applicable policy and recorded booking terms.
          </p>
        </section>

        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">Our commitment</p>
          <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">
            Trust should be visible in the details, the communication, and the way problems are addressed.
          </h2>
          <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
            We want HAMLET to be a place where guests can compare accommodation with greater clarity and where concerns are handled through a defined process — not just in the words on a website.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/stays" className="btn-brass min-h-12">
              Explore available stays <ArrowRight size={15} />
            </Link>
            <Link
              to="/account"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
            >
              Contact guest support
            </Link>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
