import { describe, expect, it } from 'vitest';
import sitemap from '../../app/sitemap';
import robots from '../../app/robots';
import { metadata as formMetadata } from '../../app/partners/apply/form/page';
import { metadata as contactMetadata } from '../../app/contact/page';

describe('private and duplicate-title pages', () => {
  it('keeps the partner verification form out of search', async () => {
    expect(formMetadata.robots).toMatchObject({ index: false });
    const urls = (await Promise.resolve(sitemap())).map(entry => entry.url);
    expect(urls.some(url => url.endsWith('/partners/apply/form'))).toBe(false);
    expect(JSON.stringify(robots())).not.toContain('/partners/apply/form');
  });

  it('does not repeat the site name in page titles (the layout adds it)', () => {
    expect(String(contactMetadata.title)).toBe('Contact HAMLET');
    expect(String(formMetadata.title)).not.toMatch(/HAMLET\.REST/);
  });
});
