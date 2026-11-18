import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages = {
  privacy: {
    title: 'Privacy & data protection',
    intro: 'HAMLET collects and uses personal information only for account access, property discovery, booking, payment administration, safety, legal compliance and customer support.',
    sections: [
      ['Information we collect', 'Depending on how you use HAMLET, this may include your name, contact details, account information, booking records, payment-provider references, property information, partner authority evidence and support communications.'],
      ['How information is used', 'We use information to operate accounts, process booking requests, coordinate stays, prevent fraud, support users, administer partner relationships and meet applicable legal obligations.'],
      ['Payments and sensitive information', 'Payments are handled through the payment provider presented during checkout. Do not send card numbers, CVVs, passwords or banking credentials to HAMLET through messages or support forms.'],
      ['Access, retention and requests', 'Access to personal information should be limited to people who need it to perform their role. You may contact HAMLET through its published support channel to request access, correction or other action available under applicable data-protection law.'],
    ],
  },
  terms: {
    title: 'Booking terms',
    intro: 'HAMLET provides a marketplace for guests to discover shortlet accommodation and submit booking requests to owners or authorised property partners.',
    sections: [
      ['Booking requests', 'A booking request is not a confirmed reservation. The property owner or authorised partner must confirm availability and the applicable terms. A booking is confirmed only when HAMLET records the required confirmation steps.'],
      ['Price and payment', 'Review the complete price breakdown, payment deadline, cancellation terms and any refundable caution deposit before paying. Only use the payment method presented through the official HAMLET booking flow. A screenshot or transfer receipt alone does not establish payment confirmation.'],
      ['Cancellations and refunds', 'Cancellation and refund outcomes depend on the booking status, the disclosed policy and the circumstances recorded for the booking. Refunds and adjustments must be reconciled against the payment provider and HAMLET transaction records.'],
      ['Property and guest responsibilities', 'Guests must follow the published house rules and occupancy limits. Owners and authorised partners must keep listing information accurate and honour confirmed booking commitments.'],
      ['Issues and disputes', 'Report booking, property or safety issues through the available HAMLET support channels. HAMLET may request relevant evidence and restrict a listing while a serious safety or integrity concern is investigated.'],
    ],
  },
  trust: {
    title: 'Trust & verification',
    intro: 'HAMLET aims to make property information and partner authority clearer. Verification status must reflect evidence actually reviewed, not an assumed or blanket guarantee.',
    sections: [
      ['Property review', 'A listing may be reviewed for identity, ownership or authority to list, property details, duplicate records and supporting evidence. The scope and status of review should be represented accurately.'],
      ['Self-reported information', 'Information supplied by an owner or partner remains self-reported until the relevant evidence has been reviewed. A submitted application is not itself proof of ownership or authorisation.'],
      ['Partner roles', 'Owners, property managers, operators, co-hosts and agents may participate where their role and authority are recorded. Access to a property or booking must be limited to the permissions granted to that partner.'],
      ['Safety concerns', 'Guests and partners should report suspected fraud, unsafe conditions, misrepresentation or unauthorised access promptly. HAMLET may pause a listing or booking workflow while concerns are reviewed.'],
    ],
  },
  pricing: {
    title: 'Fees, payments & settlement',
    intro: 'HAMLET aims to show guests a clear transaction breakdown before payment and to keep owner proceeds, partner earnings, platform fees, processor charges, deposits and refunds separately auditable.',
    sections: [
      ['Transparent price before payment', 'The booking flow should show the accommodation amount and each applicable mandatory charge, platform fee, payment-related charge and refundable caution deposit before the guest commits. The displayed checkout total is the amount to review before proceeding.'],
      ['Platform fee and who pays it', 'The applicable HAMLET platform fee and the party responsible for it must be disclosed before a booking is accepted or paid. Fee payer and deduction policy are subject to the applicable commercial terms; no fee should be silently deducted from an owner or partner allocation.'],
      ['Partner earnings', 'Agent, referral and management earnings depend on the recorded role, agreed property or booking terms, attribution and the applicable booking milestone. Earnings may be adjusted for cancellations, refunds or disputes.'],
      ['Refundable caution deposit', 'A caution deposit is separate from accommodation revenue, platform revenue and partner commission. Any proposed deduction must have a recorded reason and supporting evidence, with a route for review or dispute.'],
      ['Settlement and reconciliation', 'Payment-provider fees, platform allocations, owner proceeds, partner earnings, deposits and refunds should be represented as separate ledger entries and reconciled against provider records.'],
    ],
  },
} as const;

type LegalPage = keyof typeof pages;
const nav: { key: LegalPage; label: string }[] = [
  { key: 'privacy', label: 'Privacy' },
  { key: 'terms', label: 'Booking terms' },
  { key: 'trust', label: 'Trust & verification' },
  { key: 'pricing', label: 'Fees & settlement' },
];

export function generateStaticParams() { return nav.map(({ key }) => ({ page: key })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = pages[page as LegalPage];
  return content ? { title: content.title + ' | HAMLET.REST', description: content.intro, robots: { index: true, follow: true } } : {};
}

export default async function LegalPageView({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!(page in pages)) notFound();
  const content = pages[page as LegalPage];
  return <main className="legal-page shell" style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 20px 80px' }}>
    <p style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>HAMLET · Policies</p>
    <h1 className="serif" style={{ fontSize: 'clamp(36px,6vw,58px)', fontWeight: 500, lineHeight: 1.08, margin: '12px 0' }}>{content.title}</h1>
    <p style={{ maxWidth: 760, color: 'var(--muted)', fontSize: 17, lineHeight: 1.8 }}>{content.intro}</p>
    <nav aria-label="Legal pages" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '28px 0 34px' }}>
      {nav.map(item => <Link key={item.key} href={'/legal/' + item.key} aria-current={page === item.key ? 'page' : undefined} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '9px 14px', fontSize: 13, fontWeight: 650, background: page === item.key ? 'var(--ink)' : 'transparent', color: page === item.key ? 'var(--paper)' : 'inherit' }}>{item.label}</Link>)}
    </nav>
    <div style={{ display: 'grid', gap: 14 }}>{content.sections.map(([heading, body], index) => <section key={heading} style={{ background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 24px' }}><p style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 800, letterSpacing: '.1em' }}>{String(index + 1).padStart(2, '0')}</p><h2 className="serif" style={{ fontSize: 25, fontWeight: 500, margin: '6px 0 8px' }}>{heading}</h2><p style={{ color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>{body}</p></section>)}</div>
    <p style={{ marginTop: 28, color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }}>These pages provide general platform information and do not replace legal advice or the specific terms shown for an individual property or booking. HAMLET should have these policies reviewed and approved before production launch.</p>
  </main>;
}
