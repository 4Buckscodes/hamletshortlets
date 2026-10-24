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
    a: 'Check the four verification pillars on each listing to see whether on-site physical inspection has been completed. Report any material mismatch from your booking page.',
    category: 'trust',
  },
  {
    q: '2. What happens if there is a power outage?',
    a: 'Backup arrangements (24/7 power, inverter, or generator) are listed per property. Check the amenities section before booking.',
    category: 'stay',
  },
  {
    q: '3. How do I know if a shortlet is safe?',
    a: 'Review the four verification pillars, house rules, and security amenities on the listing, and keep your check-in codes private.',
    category: 'trust',
  },
  {
    q: '4. Are there hidden fees?',
    a: 'No. Every quote itemises the owner rate, 20% domestic markup, mandatory charges, and any separate refundable caution deposit upfront. USD/GBP quotes include a single 10% stay buffer and settle in NGN.',
    category: 'pricing',
  },
  {
    q: '5. How does check-in work?',
    a: 'Once confirmed, HAMLET Wayfinder unlocks entrance coordinates and check-in instructions inside your account.',
    category: 'stay',
  },
  {
    q: '6. Is my booking confirmed when I send a request?',
    a: 'No. The host confirms availability first, opening a 48-hour Paystack payment window. Confirmation happens after verified payment.',
    category: 'pricing',
  },
  {
    q: '7. Can I cancel and get a refund?',
    a: 'Requests can be cancelled free before confirmation. Confirmed bookings follow the cancellation terms shown on your reservation.',
    category: 'pricing',
  },
  {
    q: '8. What if the apartment is not as described?',
    a: 'Report the issue with photos immediately from My Bookings so HAMLET operations can investigate.',
    category: 'trust',
  },
  {
    q: '9. Are Wi-Fi and air conditioning included?',
    a: 'Check each listing’s amenities strip for Wi-Fi, workspace, air conditioning, kitchen, and parking.',
    category: 'stay',
  },
  {
    q: '10. Can I book for a family or group?',
    a: 'Yes, within the stated guest capacity. Unauthorised parties and events are prohibited.',
    category: 'stay',
  },
  {
    q: '11. Can I pay the owner directly?',
    a: 'No. Always pay through the Paystack checkout inside your HAMLET account so your booking and deposit remain protected.',
    category: 'pricing',
  },
  {
    q: '12. How do I get help during my stay?',
    a: 'Open My Account → My Bookings → Report Issue. For any physical safety emergency, contact local emergency services first.',
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
      {/* Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow-light">FAQs</p>
          <h1 className="mt-2.5 font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Straight answers.
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: `All (${FAQ_ITEMS.length})` },
                { id: 'trust', label: 'Trust & safety' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'stay', label: 'Check-in & amenities' },
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
        </div>

        <div className="space-y-2.5">
          {visibleItems.map(item => {
            const isOpen = openQuestion === item.q;
            const numMatch = item.q.match(/^(\d+)\.\s*(.*)$/);
            const numLabel = numMatch ? numMatch[1]!.padStart(2, '0') : '';
            const cleanTitle = numMatch ? numMatch[2]! : item.q;

            return (
              <div
                key={item.q}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  isOpen ? 'border-ink-300 shadow-xs' : 'border-ink-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenQuestion(isOpen ? null : item.q)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper/50"
                >
                  <div className="flex items-baseline gap-3">
                    {numLabel && (
                      <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                        {numLabel}
                      </span>
                    )}
                    <span className="font-display text-base font-bold text-ink-900 sm:text-[17px]">
                      {cleanTitle}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={17} className="shrink-0 text-ink-900" />
                  ) : (
                    <ChevronDown size={17} className="shrink-0 text-ink-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600 sm:pl-12">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Need something else?
            </h2>
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
              Explore stays <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
