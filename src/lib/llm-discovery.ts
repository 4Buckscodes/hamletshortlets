import { PUBLIC_VIEW_SELECT, type PublicStayRecord, toPublicStayRecord } from '@/lib/next-supabase';
import { stayPath } from './stayRoutes';
import { formatNaira } from '@/lib/pricing';
import { getPublicSupabase } from '@/lib/supabase-public';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';

const SITE = HAMLET_CANONICAL_ORIGIN;
const MAX_STAYS = 500;

function cleanText(value: string | null | undefined): string {
  const printable = Array.from(value || '')
    .filter(character => {
      const code = character.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');
  return printable
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeMarkdownLabel(value: string): string {
  return cleanText(value).replace(/\\|\[|\]|<|>/g, '\\$&');
}

function safeListText(value: string | null | undefined): string {
  return cleanText(value)
    .replace(/\[|\]|<|>|\|/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function publicStayMarkdown(stay: PublicStayRecord): string {
  const path = stayPath(stay);
  const details = [
    stay.property_type,
    typeof stay.bedrooms === 'number' ? `${stay.bedrooms} bedrooms` : null,
    typeof stay.bathrooms === 'number' ? `${stay.bathrooms} bathrooms` : null,
    typeof stay.capacity === 'number' ? `up to ${stay.capacity} guests` : null,
  ].filter(Boolean);
  const lines = [
    `### [${escapeMarkdownLabel(stay.title)}](${SITE}${path})`,
    cleanText(stay.area) ? `- Area: ${safeListText(stay.area)}` : null,
    details.length ? `- Accommodation: ${details.map(safeListText).join(', ')}` : null,
    typeof stay.guest_nightly_ngn === 'number' && stay.guest_nightly_ngn > 0
      ? `- Guest-facing nightly price: ${formatNaira(stay.guest_nightly_ngn)}`
      : null,
    stay.amenities?.length ? `- Recorded amenities: ${stay.amenities.map(safeListText).filter(Boolean).join(', ')}` : null,
    stay.image_urls?.filter(Boolean).length ? `- Photos: ${stay.image_urls.filter(Boolean).length} public image(s)` : null,
    `- Listing status: approved`,
    `- Booking: request; availability and applicable terms must be confirmed before payment.`,
  ].filter((line): line is string => Boolean(line));
  return lines.join('\n');
}

export async function getApprovedPublicStays(): Promise<PublicStayRecord[]> {
  const db = getPublicSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('public_properties')
    .select(PUBLIC_VIEW_SELECT)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(MAX_STAYS);
  if (error || !Array.isArray(data)) return [];
  return data
    .map(row => toPublicStayRecord(row as Record<string, unknown>))
    .filter(stay => stay.status === 'approved' && Boolean(stay.id && stay.title));
}

export function renderLlmStays(stays: PublicStayRecord[]): string {
  const heading = [
    '# HAMLET — Approved Lagos Shortlet Listings',
    '',
    `> A live, limited snapshot of approved public HAMLET listings. Updated when this feed is revalidated. This is not an availability calendar or a booking confirmation.`,
    '',
    `- Canonical marketplace: ${SITE}/stays`,
    `- Records in this feed: ${stays.length}`,
    `- Listing cap: ${MAX_STAYS}`,
    '',
    'Each item links to its public HAMLET listing. Guest-facing prices are shown only when a positive public price is present in the public view. Availability must be confirmed through the booking request flow.',
    '',
  ];
  const body = stays.length
    ? stays.map(publicStayMarkdown).join('\n\n')
    : 'No approved public listings were returned at the time this feed was generated. Check the marketplace for current inventory.';
  return `${heading.join('\n')}${body}\n`;
}

export function renderLlmMain(): string {
  return `# HAMLET

> HAMLET (${SITE}) is a shortlet marketplace for Lagos, Nigeria, operated under Abundance Abodes. Its public promise is: “Your stay, sorted.”

## Marketplace & Guest Guides

- [HAMLET Home](${SITE}/): Discover the marketplace.
- [Explore Lagos Shortlets](${SITE}/stays): Browse approved shortlet listings.
- [Lagos Neighbourhood Guide](${SITE}/lagos): Explore Lagos Mainland and Lagos Island neighbourhoods.
- [How HAMLET Works](${SITE}/how-it-works): Understand booking requests and host confirmation.
- [Guest Safety](${SITE}/safety): Learn about listing review and booking safeguards.
- [About HAMLET](${SITE}/about): Learn about HAMLET and its operating principles.
- [Guest FAQs](${SITE}/faqs): Answers to common guest questions.
- [Approved public listing feed](${SITE}/llms-stays.txt): A live snapshot of approved public listings.

## Partner Network

HAMLET supports property owners, authorised agents, property managers and shortlet operators. Partners must have appropriate authority to submit or manage a property. Applicable access, eligibility and commercial arrangements are governed by current written partner terms.

HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies.

## Legal, Trust & Pricing Policies

- [Legal and Privacy](${SITE}/legal): Review current marketplace terms and privacy information.
- [Guest booking guidance](${SITE}/how-it-works): Review the booking request, availability confirmation and payment process.
- [Guest safety](${SITE}/safety): Understand listing review and guest safeguards.

A booking request is not a confirmed reservation. The host or authorised property partner must confirm availability and applicable terms before payment. Review the total payable amount, applicable charges and any refundable caution deposit in the booking flow before proceeding. A refundable caution deposit is distinct from accommodation charges and is handled under the applicable booking and inspection terms.

## Optional

For a more detailed public overview of HAMLET, see [llms-full.txt](${SITE}/llms-full.txt). Live listings, booking information, public legal terms and current written partner terms take precedence.
`;
}

export function renderLlmFull(): string {
  return `# HAMLET — Public AI & Search Reference

> HAMLET (${SITE}) is a shortlet marketplace for Lagos, Nigeria, operated under Abundance Abodes. “Your stay, sorted.”

For a concise link directory, see ${SITE}/llms.txt. This document describes public product information and does not replace live listing details, booking terms, public legal terms or written partner agreements.

## 1. What HAMLET Does

HAMLET helps guests discover shortlet accommodation and connect with property owners, authorised agents, property managers and shortlet operators. Guests can review public listing information, submit booking requests and follow the booking process through the platform.

HAMLET's current marketplace focus is Lagos, Nigeria. Public inventory and supported locations may change as approved properties are added.

## 2. Marketplace & Guest Guides

- Home: ${SITE}/
- Explore stays: ${SITE}/stays
- Approved public listing feed: ${SITE}/llms-stays.txt
- Lagos neighbourhood guide: ${SITE}/lagos
- How HAMLET works: ${SITE}/how-it-works
- Guest safety: ${SITE}/safety
- About HAMLET: ${SITE}/about
- Guest FAQs: ${SITE}/faqs
- Legal and privacy terms: ${SITE}/legal
- Partner application: ${SITE}/partners/apply

## 3. Four Verification Pillars

Property submissions are reviewed across four areas:

1. Ownership evidence.
2. Identity of the owner or authorised representative.
3. Authority to list or manage the property.
4. Physical property inspection and listing accuracy.

A self-reported declaration should not be described as independently verified. Guests should read the verification status displayed on each property page and assess the evidence and listing details provided.

## 4. Booking Lifecycle

1. **Booking request:** A guest submits preferred dates, guest count and other required information. Submitting a request does not itself confirm a reservation or charge the guest.
2. **Availability confirmation:** The authorised host, property partner or HAMLET operations confirms availability and applicable terms.
3. **Payment:** The guest follows the payment instructions presented in the HAMLET booking flow after confirmation.
4. **Reservation confirmation:** A reservation is confirmed only when HAMLET records the required payment confirmation.
5. **Stay support:** Guests should use the relevant booking and support channels for assistance or to report a problem.

Guests should not treat informal messages, screenshots or off-platform transfers as proof that a reservation is confirmed.

## 5. Pricing, Payment and Refundable Deposits

The booking flow and current public terms are the source of truth for the guest's payable amount, applicable charges, payment currency, payment instructions and cancellation conditions.

Where a refundable caution deposit applies, it is shown separately from accommodation charges and is handled under the applicable inspection and refund terms. Guests should review the amount and conditions before proceeding.

HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies.

## 6. Partner Network

HAMLET's partner ecosystem may include:

- **Property owners:** People or organisations with authority to list their accommodation.
- **Authorised agents:** Representatives with documented permission to market or manage a property.
- **Property managers:** Professionals responsible for property and guest operations.
- **Shortlet operators and co-hosts:** Accommodation operators supporting the guest experience.
- **Other approved partners:** Participants accepted under HAMLET's current partner requirements.

Partner access, permissions, eligibility and commercial arrangements are governed by HAMLET's current written terms. No particular reward or commercial arrangement should be assumed from this document.

## 7. Lagos Neighbourhood Coverage

HAMLET's Lagos discovery experience includes neighbourhoods and corridors such as:

### Lagos Mainland and environs
Yaba, Shomolu, Surulere, Ikeja, Maryland, Gbagada, Ilupeju, Ebute Metta, Ogudu and Magodo.

### Lagos Island and Lekki corridor
Victoria Island, Ikoyi, Lekki Phase 1, Ikate, Oniru, Banana Island and Ajah.

The live marketplace should be checked for actual approved inventory in each area. Mention of a neighbourhood in this guide is not a claim that a property is currently available there.

## 8. Guest Guidance

- Review property photos, amenities, house rules, capacity and location details before requesting a stay.
- Check the property's recorded verification information and distinguish verified evidence from self-reported information.
- Confirm availability and all applicable charges before payment.
- Follow the payment instructions in the HAMLET booking flow.
- Keep booking references and use the platform's support route if an issue arises.
- For urgent physical safety emergencies, contact local emergency services first.

## 9. Accuracy and Updates

This file is a general public reference, not a live inventory feed or a contract. Property status, availability, pricing, payment instructions, policies and partner terms may change. The current property page, booking flow, public legal terms and written partner agreement take precedence.

HAMLET must not be represented as having a listing, review, verification outcome, availability status or service capability unless that information is supported by the live product and its records.
`;
}
