import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { usePageMeta } from '../lib/brand';
import { buildFaqStructuredData } from '../lib/seo';

const FAQ_ITEMS = [
  {
    q: '1. Are the pictures on HAMLET real?',
    a: 'Property photos should represent the accommodation being offered. Review the photos alongside the property description, amenities, and location details. Where a listing has been verified, look for the verification information provided. If you notice a significant difference between the listing and what was presented, contact HAMLET through your booking support route and share the relevant evidence.',
  },
  {
    q: '2. What happens if there is a power outage?',
    a: 'Power arrangements differ between properties. Some may have an inverter, a generator, or 24/7 estate power, while others may rely on local supply. Check the listing for details about the available backup, what it powers, and any limitations. If a material power arrangement was explicitly promised and is not available during your stay, document the issue and report it through your booking support route.',
  },
  {
    q: '3. How do I know if a shortlet is safe?',
    a: 'Start by reviewing the property information, access arrangements, house rules, and the four verification pillars shown on the listing. No listing can guarantee that every situation will be risk-free — choose a property whose arrangements meet your needs, keep your access information private, and report concerns through the official support channel.',
  },
  {
    q: '4. Are there hidden fees?',
    a: 'No — review the full price breakdown before submitting a booking request. Charges clearly show the owner’s listed accommodation rate, HAMLET’s 20% domestic accommodation markup, any disclosed mandatory charges (such as cleaning), and any refundable caution deposit itemised separately. International USD ($) and GBP (£) quotes include a single 10% currency buffer on stay pricing (never on the refundable caution deposit) and display the exact Naira settlement total upfront.',
  },
  {
    q: '5. How does check-in work?',
    a: 'Check-in arrangements depend on the property. Some stays involve a host or property manager meeting you; others use a key collection process or a smart lock. Your confirmed booking record explains the arrival window and house rules. If you expect to arrive late or your plans change, add a note on your booking or notify support.',
  },
  {
    q: '6. Is my booking confirmed as soon as I submit a request?',
    a: 'No. A booking request and a confirmed reservation are different. On HAMLET, the host or authorised partner first checks availability and terms; once accepted, a 48-hour payment window opens, and the reservation is confirmed only after verified provider payment.',
  },
  {
    q: '7. Can I cancel my reservation and get a refund?',
    a: 'Refund eligibility depends on the cancellation terms shown for your booking and the stage of the reservation. Requests can be cancelled before confirmation from your guest account. If a confirmed property becomes unavailable or a material discrepancy arises, report it promptly so HAMLET operations can review and process any applicable refund.',
  },
  {
    q: '8. What if I arrive and the apartment is not as described?',
    a: 'Document the issue with photos, screenshots, or messages where appropriate, and report it from your HAMLET guest account as soon as possible. Explain what differs from the listing and how it affects your stay. If you feel physically unsafe, prioritise your safety and contact local emergency services first.',
  },
  {
    q: '9. Are Wi-Fi and air conditioning included?',
    a: 'Amenities vary by property. Check each listing’s amenities list to confirm whether Wi-Fi, air conditioning, workspace, kitchen facilities, parking, generator backup, and other features are included before booking.',
  },
  {
    q: '10. Can I book a shortlet for a family or group?',
    a: 'Yes, where the property permits your intended occupancy. Check the maximum guest capacity, bedroom configuration, and house rules (for example, HAMLET properties prohibit unauthorised parties or events). Make sure the guest count in your booking matches the people who will be staying.',
  },
  {
    q: '11. Can I pay the property owner directly?',
    a: 'No — always follow the official payment checkout presented inside your HAMLET account for your reservation. Never transfer funds to an unrelated personal account or off-platform contact. Keeping payments within the verified process preserves your booking record and protection.',
  },
  {
    q: '12. What if I need help during my stay?',
    a: 'Open your HAMLET guest account, select your booking, and use the Report an Issue / Support workflow with your booking reference and a concise description of the problem (plus any supporting evidence). For an urgent physical safety emergency, contact local emergency services first.',
  },
];

const FAQ_SCHEMA = buildFaqStructuredData(FAQ_ITEMS);

export default function Faqs() {
  usePageMeta(
    'Shortlet Booking FAQs | HAMLET',
    'Answers to common questions about booking shortlets in Lagos on HAMLET — photos, power backup, transparent fees, check-in, payments, and support.',
    { canonicalPath: '/faqs', structuredData: FAQ_SCHEMA },
  );

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <GuestLayout>
      <section className="border-b border-ink-100 bg-ink-950 text-paper">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
            Frequently asked questions
          </p>
          <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:text-5xl">
            Before you book, let’s clear a few things up.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
            Straightforward answers on how property verification, power arrangements, pricing, check-in, payments, and support work on HAMLET.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-ink-50/60 sm:px-6"
                >
                  <span className="font-display text-base font-black text-ink-900 sm:text-[17px]">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp size={18} className="shrink-0 text-jade-700" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-ink-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-ink-50 px-5 py-4 text-sm leading-relaxed text-ink-600 sm:px-6">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl border border-ink-100 bg-clay/70 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-start gap-3">
            <HelpCircle size={22} className="mt-0.5 shrink-0 text-jade-700" />
            <div>
              <h2 className="font-display text-lg font-black text-ink-900">Ready to explore available stays?</h2>
              <p className="mt-1 text-xs font-medium text-ink-600">
                Compare verified Lagos apartments, review house rules, and see total stay prices upfront.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/stays" className="btn-jade min-h-11">
              Find my stay <ArrowRight size={15} />
            </Link>
            <Link to="/safety" className="btn-outline min-h-11 !bg-white">
              Safety & protection
            </Link>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
