import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { BLOG_POSTS, formatBlogDate, getBlogPost } from '@/lib/blogPosts';
import { buildBlogArticleSchema, buildPublicPageMetadata } from '@/lib/structured-data';

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Article not found', robots: { index: false, follow: false } };
  return buildPublicPageMetadata({
    title: post.title,
    description: post.description,
    pathname: `/blog/${post.slug}`,
    ogType: 'article',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const schema = buildBlogArticleSchema({
    slug: post.slug,
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    authorName: post.author,
    articleSection: post.category,
  });

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-blog-post-jsonld" data={schema} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">
              <Link href="/blog">Blog</Link> · {post.category}
            </p>
            <h1 className="hm-h2 hm-content-title" style={{ maxWidth: '24ch' }}>{post.title}</h1>
            <p className="hm-meta">
              <time dateTime={post.datePublished}>{formatBlogDate(post.datePublished)}</time> · {post.readingMinutes} min read
            </p>
          </div>
        </section>

        <article className="hm-shell hm-section-tight hm-prose">
          {post.body.map((block, i) => {
            if (block.type === 'h2') {
              return (
                <h2 key={i}>{block.text}</h2>
              );
            }
            if (block.type === 'ul') {
              return (
                <ul key={i}>
                  {block.items.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="hm-body">
                {block.text}
              </p>
            );
          })}

          <nav aria-label="Related pages" className="hm-prose-actions flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/stays" className="hm-btn hm-btn-primary">
              Find a verified stay <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {post.related
              .filter(link => link.href !== '/stays')
              .map(link => (
                <Link key={link.href} href={link.href} className="hm-link">
                  {link.label}
                </Link>
              ))}
          </nav>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
