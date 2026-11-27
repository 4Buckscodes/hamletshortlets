import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/llm-discovery', () => ({
  getApprovedPublicStays: vi.fn(async () => []),
}));
vi.mock('@/lib/next-supabase', () => ({
  PUBLIC_VIEW_SELECT: 'public-safe-fields',
  toPublicStayRecord: (value: Record<string, unknown>) => value,
}));
vi.mock('@/lib/supabase-public', () => ({
  getPublicSupabase: () => null,
}));
vi.mock('@/lib/pricing', () => ({
  formatNaira: (value: number) => '₦' + value.toLocaleString('en-NG'),
}));
vi.mock('@/lib/structured-data', () => ({
  HAMLET_CANONICAL_ORIGIN: 'https://hamlet.rest',
}));

import { getNegotiatedMarkdown } from './markdown-negotiation';

describe('Markdown content negotiation representations', () => {
  it('returns a useful homepage Markdown document with public discovery links', async () => {
    const markdown = await getNegotiatedMarkdown([]);
    expect(markdown).toContain('# HAMLET — Your stay, sorted.');
    expect(markdown).toContain('https://hamlet.rest/stays');
    expect(markdown).toContain('A booking request is not a confirmed reservation.');
  });

  it('returns public Lagos neighbourhood discovery content', async () => {
    const markdown = await getNegotiatedMarkdown(['lagos']);
    expect(markdown).toContain('# Shortlets in Lagos');
    expect(markdown).toContain('Victoria Island');
    expect(markdown).toContain('Yaba');
    expect(markdown).toContain('Area links are discovery shortcuts');
  });

  it('returns no Markdown document for unsupported or private routes', async () => {
    expect(await getNegotiatedMarkdown(['account'])).toBeNull();
    expect(await getNegotiatedMarkdown(['admin'])).toBeNull();
    expect(await getNegotiatedMarkdown(['api', 'bookings'])).toBeNull();
  });
});
