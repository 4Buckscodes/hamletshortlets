import type { Metadata } from 'next';
import { buildFaqStructuredData } from '@/lib/seo';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FaqExplorer, type FaqEntry } from './faq-explorer';

export const metadata: Metadata = {
  title: 'Shortlet Booking FAQs',
  description:
    'Answers to common questions about booking shortlets in Lagos on HAMLET.REST — photos, power backup, transparent fees, check-in, payments, and support.',
  alternates: { canonical: '/faqs' },
};

const FAQ_ITEMS: readonly FaqEntry[] = [
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
    a: 'No. Every quote itemises the stay price, mandatory charges, and any separate refundable caution deposit upfront. USD/GBP quotes include a single 10% stay buffer and settle in NGN.',
    category: 'pricing',
  },
  {
    q: '5. How does check-in work?',
    a: 'Once confirmed, check-in instructions and arrival guidance unlock inside your HAMLET account.',
    category: 'stay',
  },
  {
    q: '6. Is my booking confirmed when I send a request?',
    a: 'No. The host confirms availability first, opening a 48-hour Paystack payment window. Confirmation happens only after server-verified payment.',
    category: 'pricing',
  },
  {
    q: '7. Can I cancel and get a refund?',
    a: 'Requests can be cancelled free before confirmation. Confirmed bookings follow the cancellation terms shown on your reservation.',
    category: 'pricing',
  },
  {
    q: '8. What if the apartment is not as described?',
    a: 'Report the issue immediately from My Account → Report Issue so HAMLET operations can investigate.',
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
    a: 'Open My Account → Report Issue. For any physical safety emergency, contact local emergency services first.',
    category: 'trust',
  },
];

export default function FaqsPage() {
  const faqSchema = buildFaqStructuredData([...FAQ_ITEMS]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="flex-1">
        <section className="page-hero border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">Shortlet FAQs</p>
            <h1 className="mt-2.5 font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              Straight <span className="italic text-brass-300">answers.</span>
            </h1>
          </div>
        </section>

        <FaqExplorer items={FAQ_ITEMS} />
      </main>

      <SiteFooter />
    </div>
  );
}
