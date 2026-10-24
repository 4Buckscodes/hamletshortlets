import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { useHoratio } from '../components/HoratioDrawer';
import { usePageMeta } from '../lib/brand';
import { buildFaqStructuredData } from '../lib/seo';

type FaqCategory = 'all' | 'trust' | 'pricing' | 'stay';

const FAQ_ITEMS: { q: string; a: string; category: Exclude<FaqCategory, 'all'> }[] = [
  {
    q: '1. Are the pictures on HAMLET real?',
    a: 'Property photos should represent the accommodation being offered. Review the photos alongside the property description, amenities, and location details. Where a listing has been verified, look for the four verification pillars shown on the page. If you notice a significant difference between the listing and what was presented, contact HAMLET through your booking support route and share the relevant evidence.',
    category: 'trust',
  },
  {
    q: '2. What happens if there is a power outage?',
    a: 'Power arrangements differ between properties. Some may have an inverter, a generator, or 24/7 estate power, while others may rely on local supply. Check the listing for details about the available backup, what it powers, and any limitations. If a material power arrangement was explicitly promised and is not available during your stay, document the issue and report it through your booking support route.',
    category: 'stay',
  },
  {
    q: '3. How do I know if a shortlet is safe?',
    a: 'Start by reviewing the property information, access arrangements, house rules, and the four verification pillars shown on the listing. No listing can guarantee that every situation will be risk-free — choose a property whose arrangements meet your needs, keep your access information private, and report concerns through the official support channel.',
    category: 'trust',
  },
  {
    q: '4. Are there hidden fees?',
    a: 'No — review the full price breakdown before submitting a booking request. Charges clearly show the owner’s listed accommodation rate, HAMLET’s 20% domestic accommodation markup, any disclosed mandatory charges (such as cleaning), and any refundable caution deposit itemised separately. International USD ($) and GBP (£) quotes include a single 10% currency buffer on stay pricing (never on the refundable caution deposit) and display the exact Naira settlement total upfront.',
    category: 'pricing',
  },
  {
    q: '5. How does check-in work?',
    a: 'Check-in arrangements depend on the property. Some stays involve a host or property manager meeting you; others use a key collection process or a smart lock. Once your booking is confirmed, HAMLET Wayfinder unlocks arrival guidance and check-in instructions in your account.',
    category: 'stay',
  },
  {
    q: '6. Is my booking confirmed as soon as I submit a request?',
    a: 'No. A booking request and a confirmed reservation are different. On HAMLET, the host or authorised partner first checks availability and terms; once accepted, a 48-hour payment window opens, and the reservation is confirmed only after verified provider payment.',
    category: 'pricing',
  },
  {
    q: '7. Can I cancel my reservation and get a refund?',
    a: 'Refund eligibility depends on the cancellation terms shown for your booking and the stage of the reservation. Requests can be cancelled before confirmation from your guest account. If a confirmed property becomes unavailable or a material discrepancy arises, report it promptly so HAMLET operations can review and process any applicable refund.',
    category: 'pricing',
  },
  {
    q: '8. What if I arrive and the apartment is not as described?',
    a: 'Document the issue with photos, screenshots, or messages where appropriate, and report it from your HAMLET guest account as soon as possible. Explain what differs from the listing and how it affects your stay. If you feel physically unsafe, prioritise your safety and contact local emergency services first.',
    category: 'trust',
  },
  {
    q: '9. Are Wi-Fi and air conditioning included?',
    a: 'Amenities vary by property. Check each listing’s amenities list to confirm whether Wi-Fi, air conditioning, workspace, kitchen facilities, parking, generator backup, and other features are included before booking.',
    category: 'stay',
  },
  {
    q: '10. Can I book a shortlet for a family or group?',
    a: 'Yes, where the property permits your intended occupancy. Check the maximum guest capacity, bedroom configuration, and house rules (for example, HAMLET properties prohibit unauthorised parties or events). Make sure the guest count in your booking matches the people who will be staying.',
    category: 'stay',
  },
  {
    q: '11. Can I pay the property owner directly?',
    a: 'No — always follow the official payment checkout presented inside your HAMLET account for your reservation. Never transfer funds to an unrelated personal account or off-platform contact. Keeping payments within the verified process preserves your booking record and protection.',
    category: 'pricing',
  },
  {
    q: '12. What if I need help during my stay?',
    a: 'Open your HAMLET guest account, select your booking, and use the Report an Issue / Support workflow with your booking reference and a concise description of the problem (plus any supporting evidence). For an urgent physical safety emergency, contact local emergency services first.',
    category: 'trust',
  },
];

const FAQ_SCHEMA = buildFaqStructuredData(FAQ_ITEMS);

export default function Faqs() {
  usePageMeta(
    'Shortlet Booking FAQs | HAMLET',
    'Answers to common questions about booking shortlets in Lagos on HAMLET — photos, power backup, transparent fees, check-in, payments, and support.',
    { canonicalPath: '/faqs', structuredData: FAQ_SCHEMA },
  );

  const { openHoratio } = useHoratio();
  const [category, setCategory] = useState<FaqCategory>('all');
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQ_ITEMS[0]!.q);

  const visibleItems =
    category === 'all' ? FAQ_ITEMS : FAQ_ITEMS.filter(item => item.category === category);

  return (
    <GuestLayout>
      {/* Editorial Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow-light">Straight answers</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Shortlet FAQs,{' '}
            <span className="italic text-brass-300">no guesswork.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            Clear answers on property verification, power arrangements, upfront pricing, check-in, Paystack verification, and stay support on HAMLET.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Category Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: `All (${FAQ_ITEMS.length})` },
                { id: 'trust', label: 'Verification & safety' },
                { id: 'pricing', label: 'Pricing & payment' },
                { id: 'stay', label: 'Power, Wi-Fi & check-in' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  category === tab.id
                    ? 'bg-ink-900 text-white'
                    : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs font-bold text-ink-400">
            {visibleItems.length} of {FAQ_ITEMS.length} questions
          </span>
        </div>

        {/* Numbered Editorial Accordion */}
        <div className="space-y-3">
          {visibleItems.map(item => {
            const isOpen = openQuestion === item.q;
            const numMatch = item.q.match(/^(\d+)\.\s*(.*)$/);
            const numLabel = numMatch ? numMatch[1]!.padStart(2, '0') : '';
            const cleanTitle = numMatch ? numMatch[2]! : item.q;

            return (
              <div
                key={item.q}
                className={`overflow-hidden rounded-3xl border bg-white transition ${
                  isOpen ? 'border-ink-300 shadow-sm' : 'border-ink-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenQuestion(isOpen ? null : item.q)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left transition hover:bg-paper/50 sm:px-6"
                >
                  <div className="flex items-baseline gap-3.5">
                    {numLabel && (
                      <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                        {numLabel}
                      </span>
                    )}
                    <span className="font-display text-base font-bold text-ink-900 sm:text-[18px]">
                      {cleanTitle}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="shrink-0 text-ink-900" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-ink-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-ink-100 px-5 py-4.5 text-sm leading-relaxed text-ink-600 sm:px-6 sm:pl-14">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Concierge / Explore Card */}
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl border border-ink-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="eyebrow">Still have a question?</p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">
              Ask Horatio or explore verified Lagos homes.
            </h2>
            <p className="mt-1 text-xs font-medium text-ink-600 sm:text-[13px]">
              Compare neighbourhoods, check house rules, and view total stay prices upfront.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => openHoratio()}
              className="btn-outline min-h-11 !rounded-full"
            >
              <Sparkles size={15} className="text-brass-600" /> Ask Horatio
            </button>
            <Link to="/stays" className="btn-jade min-h-11 !rounded-full">
              Find my stay <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
