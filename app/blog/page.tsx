import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { BLOG_POSTS, formatBlogDate } from '@/lib/blogPosts';
import { buildInformationalPageSchema, buildPublicPageMetadata } from '@/lib/structured-data';

const TITLE = 'HAMLET Blog: Lagos Shortlet Guides and Travel Tips';
const DESCRIPTION =
  'Practical guides for booking shortlets in Lagos: neighbourhoods, pricing, verification, power backup and what to expect on HAMLET.REST.';

export const metadata: Metadata = buildPublicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  pathname: '/blog',
});

const BLOG_INDEX_SCHEMA = buildInformationalPageSchema({
  title: TITLE,
  description: DESCRIPTION,
  pathname: '/blog',
  breadcrumbName: 'Blog',
});

export default function BlogIndexPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-blog-jsonld" data={BLOG_INDEX_SCHEMA} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">Blog</p>
            <h1 className="hm-display hm-content-title">
              Lagos stays, <em>explained.</em>
            </h1>
          </div>
        </section>

        <div className="hm-shell hm-section-tight">
          <ul className="hm-blog-list">
            {BLOG_POSTS.map(post => (
              <li key={post.slug}>
                <article>
                  <p className="hm-label">
                    {post.category} · <time dateTime={post.datePublished}>{formatBlogDate(post.datePublished)}</time>
                  </p>
                  <h2>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="hm-body">{post.description}</p>
                  <Link href={`/blog/${post.slug}`} className="hm-link">
                    Read the guide <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
