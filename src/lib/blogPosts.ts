/**
 * Editorial blog content for /blog.
 *
 * To publish a new article, add an entry to BLOG_POSTS (newest first). Pages, the sitemap and
 * structured data are all generated from this list. Keep claims factual and consistent with the
 * pricing/booking rules on /how-it-works and /faqs.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: readonly string[] };

export interface BlogPost {
  slug: string;
  title: string;
  /** Meta description and index-card summary (aim for 120–160 characters). */
  description: string;
  category: string;
  /** ISO date (YYYY-MM-DD). */
  datePublished: string;
  dateModified?: string;
  author?: string;
  readingMinutes: number;
  body: readonly BlogBlock[];
  /** Internal links shown at the end of the article. */
  related: ReadonlyArray<{ label: string; href: string }>;
}

export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: 'how-to-book-a-verified-shortlet-in-lagos',
    title: 'How to Book a Verified Shortlet in Lagos: A Step-by-Step Guide',
    description:
      'What to check before you book a shortlet in Lagos: verified listings, upfront pricing, power backup, caution deposits and how the request-and-pay process works.',
    category: 'Booking guide',
    datePublished: '2026-11-26',
    readingMinutes: 5,
    body: [
      {
        type: 'p',
        text: 'Booking a shortlet in Lagos should be simple, but photos that do not match the apartment, surprise fees and unclear payment terms are common complaints. This guide covers what to look for before you commit, and how booking works on HAMLET.',
      },
      { type: 'h2', text: '1. Choose the right part of Lagos first' },
      {
        type: 'p',
        text: 'Traffic shapes every trip in Lagos, so location matters more than the apartment itself. Lagos Island areas such as Victoria Island, Ikoyi and Lekki suit business travel and short city breaks. Mainland areas such as Yaba, Surulere and Ikeja suit tech work, campuses and airport access. Pick the area closest to where you will spend most of your time.',
      },
      { type: 'h2', text: '2. Check that the listing is verified' },
      {
        type: 'p',
        text: 'A good listing is more than nice photos. On HAMLET, a stay goes live only after a physical inspection, and the photos are reviewed as part of that check. Look for the verification status on each stay and read the house rules before you request.',
      },
      { type: 'h2', text: '3. Ask about power and connectivity' },
      {
        type: 'p',
        text: 'Backup power is one of the biggest factors in how comfortable a stay in Lagos is. Check whether the apartment has estate supply, an inverter or a generator, and whether Wi-Fi and air conditioning are included. Each HAMLET stay lists these under its amenities.',
      },
      { type: 'h2', text: '4. Understand the full price' },
      {
        type: 'p',
        text: 'Compare the total cost, not just the nightly rate. Look for these items:',
      },
      {
        type: 'ul',
        items: [
          'The nightly rate, and whether service fees are already included. On HAMLET the displayed rate includes the 20% service fee.',
          'Any cleaning or turnover charge, shown as a separate line.',
          'The refundable caution deposit, itemised separately and returned after the check-out inspection.',
        ],
      },
      { type: 'h2', text: '5. Request first, pay when the host confirms' },
      {
        type: 'p',
        text: 'On HAMLET, sending a request does not charge you. Once the partner confirms your dates, a 48-hour payment window opens and you pay securely through Paystack from your account. The stay is confirmed when the payment is verified, and the exact address and arrival guide unlock in your account.',
      },
      { type: 'h2', text: '6. Know what to do if something is wrong' },
      {
        type: 'p',
        text: 'If the apartment is not as described, report it straight away from your booking so the operations team can follow up. Keep your photos and messages in case you need them.',
      },
    ],
    related: [
      { label: 'Browse verified stays', href: '/stays' },
      { label: 'How HAMLET works', href: '/how-it-works' },
      { label: 'Explore Lagos areas', href: '/lagos' },
      { label: 'Booking FAQs', href: '/faqs' },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(post => post.slug === slug);
}

export function formatBlogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
