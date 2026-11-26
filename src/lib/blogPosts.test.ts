import { describe, expect, it } from 'vitest';
import { BLOG_POSTS, getBlogPost } from './blogPosts';

describe('blog posts', () => {
  it('has unique URL-safe slugs and valid ISO dates', () => {
    const slugs = BLOG_POSTS.map(post => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const post of BLOG_POSTS) {
      expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(Number.isNaN(new Date(post.datePublished).getTime())).toBe(false);
      expect(getBlogPost(post.slug)).toBe(post);
    }
  });

  it('has search-friendly metadata and body content', () => {
    for (const post of BLOG_POSTS) {
      expect(post.title.length).toBeLessThanOrEqual(70);
      expect(post.description.length).toBeGreaterThanOrEqual(80);
      expect(post.description.length).toBeLessThanOrEqual(170);
      expect(post.body.length).toBeGreaterThan(3);
      expect(post.related.length).toBeGreaterThan(0);
    }
  });
});
