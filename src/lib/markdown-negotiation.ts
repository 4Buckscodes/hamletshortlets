import { getApprovedPublicStays } from '@/lib/llm-discovery';
import { PUBLIC_VIEW_SELECT, toPublicStayRecord, type PublicStayRecord } from '@/lib/next-supabase';
import { getPublicSupabase } from '@/lib/supabase-public';
import { formatNaira } from '@/lib/pricing';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

const SITE = HAMLET_CANONICAL_ORIGIN;

function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safe(value: unknown): string {
  return clean(value)
    .replace(/[<>\[\]|\\]/g, '')
    .replace(/([*_])/g, '\\$1');
}

function bullets(values: string[] | null | undefined): string {
  const items = (values ?? []).map(safe).filter(Boolean);
  return items.length ? items.map(item => '- ' + item).join('\n') : 'Not provided in the public listing.';
}

function renderProperty(stay: PublicStayRecord): string {
  const lines = [
    '# ' + safe(stay.title),
    '',
    'Canonical listing: ' + SITE + '/stays/' + encodeURIComponent(stay.id),
    '',
    stay.property_type ? '- Property type: ' + safe(stay.property_type) : null,
    stay.area ? '- Area: ' + safe(stay.area) : null,
    typeof stay.bedrooms === 'number' ? '- Bedrooms: ' + stay.bedrooms : null,
    typeof stay.bathrooms === 'number' ? '- Bathrooms: ' + stay.bathrooms : null,
    typeof stay.capacity === 'number' ? '- Guest capacity: up to ' + stay.capacity : null,
    typeof stay.guest_nightly_ngn === 'number' && stay.guest_nightly_ngn > 0
      ? '- Guest-facing nightly price: ' + formatNaira(stay.guest_nightly_ngn)
      : '- Guest-facing nightly price: Not published',
    stay.amenities?.length ? '- Amenities: ' + stay.amenities.map(safe).filter(Boolean).join(', ') : null,
    stay.trust_label ? '- Listing trust label: ' + safe(stay.trust_label) : null,
    '',
    '## House rules',
    bullets(stay.house_rules),
    '',
    '## Booking information',
    'This listing is approved for public display. A booking request is not a confirmed reservation. The authorised partner must confirm availability and applicable terms before payment. Review the current total, charges and any refundable caution deposit in the booking flow.',
    '',
    'The exact address and private arrival instructions are not included in this public response.',
  ].filter((line): line is string => line !== null);
  return lines.join('\n');
}

const STATIC_PAGES: Record<string, string> = {
  lagos: [
    '# Shortlets in Lagos — Neighbourhood Guide',
    '',
    'HAMLET helps guests discover public shortlet listings across Lagos, Nigeria.',
    '',
    '## Lagos Island and Lekki corridor',
    '- [Victoria Island stays](' + SITE + '/stays?area=Victoria%20Island)',
    '- [Ikoyi stays](' + SITE + '/stays?area=Ikoyi)',
    '- [Lekki Phase 1 stays](' + SITE + '/stays?area=Lekki%20Phase%201)',
    '- [Ajah stays](' + SITE + '/stays?area=Ajah)',
    '',
    '## Lagos Mainland',
    '- [Yaba stays](' + SITE + '/stays?area=Yaba)',
    '- [Ikeja stays](' + SITE + '/stays?area=Ikeja)',
    '- [Surulere stays](' + SITE + '/stays?area=Surulere)',
    '- [Shomolu stays](' + SITE + '/stays?area=Shomolu)',
    '',
    'Area links are discovery shortcuts, not claims that inventory is currently available. Check live approved listings and confirm availability before payment.',
    '',
    '[Explore all Lagos stays](' + SITE + '/stays)',
  ].join('\n'),
  'how-it-works': [
    '# How HAMLET Works',
    '',
    'HAMLET is a shortlet marketplace for discovering accommodation and submitting booking requests.',
    '',
    '## Guest journey',
    '1. Explore public listings and review property details.',
    '2. Submit a booking request with preferred dates and guest information.',
    '3. Wait for the authorised host or partner to confirm availability and applicable terms.',
    '4. Review the total payable amount, charges and any refundable caution deposit.',
    '5. Follow the payment instructions provided through the booking flow.',
    '6. A reservation is confirmed only when HAMLET records the required payment confirmation.',
    '',
    'A booking request is not a confirmed reservation. Do not treat informal messages, screenshots or off-platform transfers as proof of confirmation.',
    '',
    '[Explore Lagos stays](' + SITE + '/stays) · [Guest safety](' + SITE + '/safety)',
  ].join('\n'),
  safety: [
    '# Guest Safety on HAMLET',
    '',
    'HAMLET reviews submitted listings before they are published. Guests should read the verification information shown on each listing and distinguish independently reviewed evidence from self-reported information.',
    '',
    '## Before you pay',
    '- Review photos, amenities, house rules, guest capacity and location details.',
    '- Confirm availability and all applicable charges.',
    '- Review refundable caution-deposit terms, if any.',
    '- Follow the payment instructions in the HAMLET booking flow.',
    '- Keep your booking reference and use the platform support route if an issue arises.',
    '',
    'A booking request is not a confirmed reservation. Exact address and private arrival guidance are shared through the applicable confirmed-booking process.',
    '',
    '[Explore stays](' + SITE + '/stays) · [How HAMLET works](' + SITE + '/how-it-works)',
  ].join('\n'),
  about: [
    '# About HAMLET',
    '',
    'HAMLET is a shortlet marketplace for Lagos, Nigeria, operated under Abundance Abodes.',
    '',
    'Our public promise is: “Your stay, sorted.”',
    '',
    'HAMLET helps guests discover shortlet accommodation and connect with property owners, authorised agents, property managers and shortlet operators. The marketplace focuses on clear listing information, reviewed submissions and accountable booking steps.',
    '',
    '[Explore stays](' + SITE + '/stays) · [Become a partner](' + SITE + '/partners/apply)',
  ].join('\n'),
  faqs: [
    '# HAMLET — Guest FAQs',
    '',
    '## Does a booking request confirm my stay?',
    'No. A booking request is not a confirmed reservation. The authorised host or partner must confirm availability and applicable terms first.',
    '',
    '## When do I pay?',
    'Follow the payment instructions presented in the HAMLET booking flow after availability and terms are confirmed.',
    '',
    '## Are prices inclusive of fees?',
    'Review the total payable amount and any applicable charges displayed in the booking flow before proceeding.',
    '',
    '## Is a caution deposit required?',
    'It depends on the listing. Any applicable refundable caution deposit should be shown separately with its conditions.',
    '',
    '## When do I receive the exact address?',
    'Exact address and private arrival guidance are shared through the applicable confirmed-booking process.',
    '',
    '[Explore stays](' + SITE + '/stays) · [How HAMLET works](' + SITE + '/how-it-works)',
  ].join('\n'),
  legal: [
    '# HAMLET — Legal and Privacy Information',
    '',
    'This page is a pointer to HAMLET current public legal and privacy information. The live legal page and applicable written agreements are authoritative.',
    '',
    'Review the current terms on [HAMLET Legal](' + SITE + '/legal). Do not rely on this Markdown summary as a contract or substitute for the current published terms.',
  ].join('\n'),
  'partners/apply': [
    '# Become a HAMLET Property Partner',
    '',
    'HAMLET welcomes property owners, authorised real estate agents, property managers and shortlet operators who have appropriate authority to submit or manage a property.',
    '',
    'Partner submissions are subject to HAMLET current eligibility, identity, authority and property-review requirements. Access, permissions and commercial arrangements are governed by current written partner terms.',
    '',
    '[Partner application](' + SITE + '/partners/apply) · [HAMLET home](' + SITE + ')',
  ].join('\n'),
};

export async function getNegotiatedMarkdown(pathSegments: string[] | undefined): Promise<string | null> {
  const path = (pathSegments ?? []).join('/').replace(/^\/+|\/+$/g, '');

  if (!path) {
    const stays = await getApprovedPublicStays();
    const listingLines = stays.slice(0, 12).map(stay =>
      '- [' + safe(stay.title) + '](' + SITE + '/stays/' + encodeURIComponent(stay.id) + ') — ' + safe(stay.area || 'Lagos')
    );
    return [
      '# HAMLET — Your stay, sorted.',
      '',
      'HAMLET is a shortlet marketplace for Lagos, Nigeria, operated under Abundance Abodes. Discover public listings, review property information and submit booking requests.',
      '',
      '## Explore',
      '- [Explore Lagos shortlets](' + SITE + '/stays)',
      '- [Lagos neighbourhood guide](' + SITE + '/lagos)',
      '- [How HAMLET works](' + SITE + '/how-it-works)',
      '- [Guest safety](' + SITE + '/safety)',
      '- [Guest FAQs](' + SITE + '/faqs)',
      '- [About HAMLET](' + SITE + '/about)',
      '- [Partner with HAMLET](' + SITE + '/partners/apply)',
      '',
      'A booking request is not a confirmed reservation. Availability and applicable terms must be confirmed before payment.',
      listingLines.length ? '' : null,
      listingLines.length ? '## Featured approved public listings' : null,
      ...listingLines,
    ].filter((line): line is string => line !== null).join('\n');
  }

  if (path === 'stays') {
    const stays = await getApprovedPublicStays();
    const lines = [
      '# Explore Lagos Shortlet Stays on HAMLET',
      '',
      'Approved public listings currently returned: ' + stays.length,
      '',
      'Listings below are approved for public display. This is not a live availability calendar. Confirm dates and applicable terms through the booking request flow.',
      '',
      ...stays.map(stay => [
        '## [' + safe(stay.title) + '](' + SITE + '/stays/' + encodeURIComponent(stay.id) + ')',
        '',
        '- Area: ' + safe(stay.area || 'Lagos'),
        '- Type: ' + safe(stay.property_type || 'Not specified'),
        '- Bedrooms: ' + (stay.bedrooms ?? 'Not specified'),
        '- Guest capacity: ' + (stay.capacity ?? 'Not specified'),
        '- Nightly price: ' + (typeof stay.guest_nightly_ngn === 'number' && stay.guest_nightly_ngn > 0 ? formatNaira(stay.guest_nightly_ngn) : 'Not published'),
      ].join('\n')),
    ];
    return lines.join('\n\n');
  }

  if (path.startsWith('stays/')) {
    const id = decodeURIComponent(path.slice('stays/'.length));
    if (!id || id.includes('/')) return null;
    const db = getPublicSupabase();
    if (!db) return null;
    const { data, error } = await db
      .from('public_properties')
      .select(PUBLIC_VIEW_SELECT)
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle();
    if (error || !data) return null;
    const stay = toPublicStayRecord(data as Record<string, unknown>);
    return stay.status === 'approved' ? renderProperty(stay) : null;
  }

  return STATIC_PAGES[path] ?? null;
}
