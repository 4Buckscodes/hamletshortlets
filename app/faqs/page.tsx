import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  buildFaqPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FaqExplorer, type FaqEntry } from './faq-explorer';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Shortlet Booking FAQs',
  description:
    'Answers to common questions about booking shortlets in Lagos on HAMLET.REST — photos, power backup, transparent fees, check-in, payments, and support.',
  pathname: '/faqs',
});

const FAQ_ITEMS: readonly FaqEntry[] = [
  {
    q: '1. Are the pictures on HAMLET real?',
    a: 'Check each listing’s physical inspection pillar. Report any mismatch from your booking page.',
    category: 'trust',
  },
  {
    q: '2. What happens if there is a power outage?',
    a: 'Backup power (24/7 estate supply, inverter, or generator) is listed under each stay’s amenities.',
    category: 'stay',
  },
  {
    q: '3. How do I know if a shortlet is safe?',
    a: 'Check the four verification pillars, security amenities, and house rules before requesting.',
    category: 'trust',
  },
  {
    q: '4. Are there hidden fees?',
    a: 'No. Stay rates include our 20% guest service fee upfront, show cleaning charges clearly, and itemise caution deposits separately. USD/GBP quotes include a single 10% FX buffer and settle in NGN.',
    category: 'pricing',
  },
  {
    q: '5. How does check-in work?',
    a: 'Arrival and check-in details unlock in your HAMLET account once confirmed.',
    category: 'stay',
  },
  {
    q: '6. Is my booking confirmed when I send a request?',
    a: 'No. The host confirms dates first, opening a 48-hour Paystack payment window.',
    category: 'pricing',
  },
  {
    q: '7. Can I cancel and get a refund?',
    a: 'Unpaid requests can be cancelled free of charge. Paid bookings follow the cancellation terms on your reservation.',
    category: 'pricing',
  },
  {
    q: '8. What if the apartment is not as described?',
    a: 'Report it immediately via My Account → Report Issue.',
    category: 'trust',
  },
  {
    q: '9. Are Wi-Fi and air conditioning included?',
    a: 'Yes where listed — check each apartment’s amenities list.',
    category: 'stay',
  },
  {
    q: '10. Can I book for a family or group?',
    a: 'Yes, within the stated guest limit. Unauthorised parties are prohibited.',
    category: 'stay',
  },
  {
    q: '11. Can I pay the owner directly?',
    a: 'No. Pay only via Paystack inside your HAMLET account so your booking and deposit stay protected.',
    category: 'pricing',
  },
  {
    q: '12. How do I get help during my stay?',
    a: 'Use My Account → Report Issue. In an emergency, contact local emergency services first.',
    category: 'trust',
  },
];

export default function FaqsPage() {
  const faqSchema = buildFaqPageSchema([...FAQ_ITEMS]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <JsonLd id="hamlet-faqs-jsonld" data={faqSchema} />

      <main className="flex-1">
        <section data-hamlet-reveal className="border-b border-ink-800 bg-ink-950 text-paper">
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
