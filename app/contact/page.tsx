import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { buildInformationalPageSchema, buildPublicPageMetadata } from '@/lib/structured-data';

const TITLE = 'Contact HAMLET';
const DESCRIPTION =
  'How to reach HAMLET: booking issues from your account, partner enquiries, and email for everything else.';

export const metadata: Metadata = buildPublicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  pathname: '/contact',
});

const CONTACT_SCHEMA = buildInformationalPageSchema({
  title: `${TITLE} — HAMLET.REST`,
  description: DESCRIPTION,
  pathname: '/contact',
  breadcrumbName: TITLE,
});

const ROUTES = [
  {
    title: 'A booking you have made',
    body: 'Report the issue from your account so it is attached to the booking, the stay and the people involved.',
    action: { href: '/account/issues', label: 'Report a booking issue' },
  },
  {
    title: 'Questions about areas or stays',
    body: 'Ask Horatio, our assistant, from the menu. It answers questions about Lagos areas, prices and how booking works.',
    action: { href: '/faqs', label: 'Read the FAQs' },
  },
  {
    title: 'Listing a property',
    body: 'Property owners, closing agents and managers can join the partner network and open a workspace straight away.',
    action: { href: '/partners/apply', label: 'Become a partner' },
  },
  {
    title: 'Anything else',
    body: 'Press, partnerships, privacy requests and general questions.',
    action: { href: 'mailto:hello@hamlet.rest', label: 'hello@hamlet.rest' },
  },
] as const;

export default function ContactPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-contact-jsonld" data={CONTACT_SCHEMA} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">Contact</p>
            <h1 className="hm-display hm-content-title">Who to talk to, and how.</h1>
          </div>
        </section>

        <div className="hm-shell hm-section-tight space-y-10">
          <ul className="hm-contact-list">
            {ROUTES.map(route => (
              <li key={route.title} data-hamlet-reveal>
                <div>
                  <h2 className="hm-h3">{route.title}</h2>
                  <p className="hm-body">{route.body}</p>
                </div>
                {route.action.href.startsWith('mailto:') ? (
                  <a className="hm-link" href={route.action.href}>{route.action.label}</a>
                ) : (
                  <Link className="hm-link" href={route.action.href}>{route.action.label}</Link>
                )}
              </li>
            ))}
          </ul>

          <p className="hm-meta">
            HAMLET.REST is an Abundance Abodes product, based in Lagos, Nigeria. Our{' '}
            <Link className="hm-link" href="/legal#terms">terms</Link> and{' '}
            <Link className="hm-link" href="/legal#privacy">privacy notice</Link> are on the legal page.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
