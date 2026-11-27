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
        text: 'On HAMLET, sending a request does not charge you. Once the partner confirms your dates, you have 2 hours to pay securely through Paystack from your account. The stay is confirmed when the payment is verified, and the exact address and arrival guide unlock in your account.',
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
  {
    slug: 'lagos-island-vs-mainland-shortlets',
    title: 'Lagos Island vs Mainland: Where Should You Book a Shortlet?',
    description:
      'Compare shortlets on Lagos Island (Victoria Island, Ikoyi, Lekki, Ajah) and the Mainland (Yaba, Surulere, Shomolu, Ikeja) to pick the area that fits your trip.',
    category: 'Lagos areas',
    datePublished: '2026-11-19',
    readingMinutes: 4,
    body: [
      {
        type: 'p',
        text: 'The first decision when booking a shortlet in Lagos is not the apartment, it is the side of the city. Lagos Island and the Mainland feel different, and the right choice depends on where you need to be each day.',
      },
      { type: 'h2', text: 'Lagos Island: business, dining and quieter estates' },
      {
        type: 'ul',
        items: [
          'Victoria Island: business districts, conferences, embassies and city dining.',
          'Ikoyi and Banana Island: quiet residential apartments and penthouses with controlled estate access.',
          'Lekki Phase 1 and Oniru: serviced apartments near dining, retail and waterfront venues.',
          'Ajah: spacious duplexes and apartments suited to family and extended stays.',
        ],
      },
      { type: 'h2', text: 'Lagos Mainland: tech, campuses, airport and local life' },
      {
        type: 'ul',
        items: [
          'Yaba: tech hubs, campuses and fast Third Mainland Bridge access to Lagos Island.',
          'Surulere: tree-lined avenues, creative studios and central Mainland–Island links.',
          'Shomolu, Gbagada and Ilupeju: central Ikorodu Road and Gbagada expressway access across Lagos.',
          'Ikeja and the northern Mainland: convenient to Murtala Muhammed Airport, corporate offices and gated GRAs.',
        ],
      },
      { type: 'h2', text: 'How to choose' },
      {
        type: 'p',
        text: 'Start from your daily destination. If your meetings, events or restaurants are on the Island, staying there saves you from crossing the city every day. If you are working with a tech team, visiting a campus or flying out of the airport, the Mainland is often the more practical base. For family trips and longer stays, look at areas with larger apartments and duplexes.',
      },
      {
        type: 'p',
        text: 'Whichever side you pick, check the amenities for backup power and Wi-Fi, and read the house rules before you request. HAMLET lists verified stays for each area, and you can browse them from our Lagos guide.',
      },
    ],
    related: [
      { label: 'Lagos neighbourhood guide', href: '/lagos' },
      { label: 'Browse verified stays', href: '/stays' },
      { label: 'Shortlets in Yaba', href: '/lagos/yaba' },
      { label: 'Shortlets in Victoria Island', href: '/lagos/victoria-island' },
    ],
  },
  {
    slug: 'shortlet-fees-and-caution-deposits-in-lagos',
    title: 'Shortlet Fees and Caution Deposits in Lagos, Explained',
    description:
      'What you pay for a Lagos shortlet: nightly rate, service fee, cleaning charge, refundable caution deposit and currency conversion, and how to avoid surprises.',
    category: 'Pricing',
    datePublished: '2026-11-12',
    readingMinutes: 4,
    body: [
      {
        type: 'p',
        text: 'Hidden fees are one of the most common worries when booking a shortlet. Knowing what each charge is for makes it easy to compare listings fairly. Here is how pricing works on HAMLET.',
      },
      { type: 'h2', text: 'The nightly rate' },
      {
        type: 'p',
        text: 'The nightly price you see already includes HAMLET’s 20% service fee. No extra service fee is added at checkout, so the number on the listing is the number you compare.',
      },
      { type: 'h2', text: 'Cleaning and turnover' },
      {
        type: 'p',
        text: 'When a stay has a cleaning or turnover charge, it is shown as its own line before you send a request, not buried in the nightly rate.',
      },
      { type: 'h2', text: 'The caution deposit' },
      {
        type: 'p',
        text: 'A caution deposit is a refundable amount held against damage or breakages. On HAMLET it is itemised separately from the stay price and returned after the check-out inspection. Always check the deposit amount and return terms on the listing before you request.',
      },
      { type: 'h2', text: 'Paying from abroad' },
      {
        type: 'p',
        text: 'If you are booking from outside Nigeria, prices can be shown in USD or GBP with a single 10% exchange buffer. You are charged in naira, and your own bank may add a card fee on top.',
      },
      { type: 'h2', text: 'When you actually pay' },
      {
        type: 'ul',
        items: [
          'Sending a request does not charge you.',
          'When the partner accepts, you have 2 hours to pay from your account.',
          'You pay through Paystack, and the stay is confirmed once the payment is verified.',
        ],
      },
      {
        type: 'p',
        text: 'Unpaid requests can be cancelled free of charge. Paid bookings follow the cancellation terms shown on your reservation.',
      },
    ],
    related: [
      { label: 'How HAMLET works', href: '/how-it-works' },
      { label: 'Booking FAQs', href: '/faqs' },
      { label: 'Browse verified stays', href: '/stays' },
    ],
  },
  {
    slug: 'what-to-look-for-in-a-lagos-shortlet-for-business-travel',
    title: 'Business Trip to Lagos? What to Look for in a Shortlet',
    description:
      'Choosing a shortlet for a business trip to Lagos: the best areas for meetings, reliable power and Wi-Fi, secure estates, and flexible booking for longer stays.',
    category: 'Travel tips',
    datePublished: '2026-11-05',
    readingMinutes: 4,
    body: [
      {
        type: 'p',
        text: 'A shortlet can be a better base than a hotel for a business trip: more space, a kitchen and a workspace. The details below help you pick one that supports your schedule.',
      },
      { type: 'h2', text: 'Pick the area around your meetings' },
      {
        type: 'p',
        text: 'Victoria Island is known for business districts, conferences and embassies. Ikeja suits trips built around corporate offices or the airport, and Yaba suits tech and campus visits. Staying close to where you will spend your days matters more than any amenity.',
      },
      { type: 'h2', text: 'Confirm power and Wi-Fi' },
      {
        type: 'p',
        text: 'Reliable power and internet decide whether you can work from the apartment. Check the amenities list for 24/7 estate supply, an inverter or a generator, and for Wi-Fi and air conditioning.',
      },
      { type: 'h2', text: 'Look at security and access' },
      {
        type: 'p',
        text: 'Many Lagos stays sit in gated estates with controlled access. Check the listed security amenities and the verification status, and read the house rules for visitors, which matter if you plan to host a meeting.',
      },
      { type: 'h2', text: 'Plan for longer stays' },
      {
        type: 'p',
        text: 'For a week or more, look for spacious apartments with a proper kitchen and workspace. Areas such as Ajah and Lekki have larger apartments and duplexes suited to extended stays.',
      },
      { type: 'h2', text: 'Book with a clear paper trail' },
      {
        type: 'p',
        text: 'Because the partner confirms your dates before you pay, you know the stay is available before any money moves. You pay within 2 hours of acceptance and can find your booking details and arrival guide in your account, which is handy for expense reports.',
      },
    ],
    related: [
      { label: 'Shortlets in Victoria Island', href: '/lagos/victoria-island' },
      { label: 'Shortlets in Ikeja', href: '/lagos/ikeja' },
      { label: 'Browse verified stays', href: '/stays' },
      { label: 'Verification and safety', href: '/safety' },
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
