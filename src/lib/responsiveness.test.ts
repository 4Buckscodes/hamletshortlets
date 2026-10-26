import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSrc = (relPath: string) =>
  readFileSync(resolve(process.cwd(), 'src', relPath), 'utf8');

describe('Global & Page-by-Page Responsiveness Invariants (Icons, Text & Scrolls)', () => {
  it('enforces global horizontal overflow clipping and non-shrinking button/chip SVG icons in index.css', () => {
    const css = readSrc('index.css');
    expect(css).toContain('overflow-x: clip;');
    for (const cls of ['.btn ', '.btn-jade ', '.btn-brass ', '.btn-dark ', '.btn-outline ', '.btn-ghost-dark ', '.chip ']) {
      const line = css.split('\n').find(l => l.includes(cls));
      expect(line, `Expected ${cls.trim()} rule in index.css`).toBeDefined();
      expect(line).toContain('[&>svg]:shrink-0');
    }
  });

  it('uses dynamic viewport height (h-dvh) and overscroll containment in WorkspaceShell and AdminIssues drawer', () => {
    const shell = readSrc('components/WorkspaceShell.tsx');
    expect(shell).toContain('h-dvh');
    expect(shell).not.toContain('h-screen');
    expect(shell).toContain('max-w-[82vw]');
    expect(shell).toContain('overscroll-y-contain');

    const issues = readSrc('legacy-pages/admin/Issues.tsx');
    expect(issues).toContain('h-dvh');
    expect(issues).toContain('overscroll-y-contain');
    expect(issues).toContain('overflow-hidden');
  });

  it('makes every modal dialog vertically scrollable within 92dvh on short and mobile viewports', () => {
    const modalFiles = [
      'legacy-pages/PropertyDetail.tsx',
      'legacy-pages/Account.tsx',
      'legacy-pages/partner/Properties.tsx',
      'legacy-pages/admin/Properties.tsx',
      'legacy-pages/admin/Ledger.tsx',
    ];

    for (const file of modalFiles) {
      const src = readSrc(file);
      expect(src, `${file} should constrain modal height to max-h-[92dvh]`).toContain('max-h-[92dvh]');
      expect(src, `${file} should enable overflow-y-auto on modals`).toContain('overflow-y-auto');
    }

    // Account.tsx has both PaymentModal and IssueModal; AdminLedger has both Reconcile and Record modals
    expect(readSrc('legacy-pages/Account.tsx').match(/max-h-\[92dvh\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(readSrc('legacy-pages/admin/Ledger.tsx').match(/max-h-\[92dvh\]/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps Stays and PropertyDetail sidebars non-sticky on mobile and scrollable when sticky on desktop', () => {
    const stays = readSrc('legacy-pages/Stays.tsx');
    expect(stays).toContain('lg:sticky lg:top-20');
    expect(stays).toContain('lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto');
    expect(stays).not.toContain('card sticky top-20');

    const detail = readSrc('legacy-pages/PropertyDetail.tsx');
    expect(detail).toContain('lg:sticky lg:top-20');
    expect(detail).not.toContain('card sticky top-20');
  });

  it('pairs every horizontal overflow-x-auto scroll container with overscroll-x-contain', () => {
    const horizontalScrollFiles = [
      'legacy-pages/Home.tsx',
      'legacy-pages/partner/NewProperty.tsx',
      'legacy-pages/partner/Earnings.tsx',
      'legacy-pages/admin/Ledger.tsx',
      'legacy-pages/admin/Applications.tsx',
      'legacy-pages/admin/Assignments.tsx',
    ];

    for (const file of horizontalScrollFiles) {
      const src = readSrc(file);
      const overflowMatches = src.match(/overflow-x-auto/g)?.length ?? 0;
      const overscrollMatches = src.match(/overscroll-x-contain/g)?.length ?? 0;
      expect(overflowMatches, `${file} should have overflow-x-auto`).toBeGreaterThan(0);
      expect(overscrollMatches, `${file} should pair overflow-x-auto with overscroll-x-contain`).toBe(overflowMatches);
    }

    // Verify new PartnerBookingReview page enforces responsive padding and shrink-0 icons
    const bookingReview = readSrc('legacy-pages/partner/BookingReview.tsx');
    expect(bookingReview).toContain('p-4 sm:p-6 lg:p-8');
    expect(bookingReview).toContain('shrink-0');
    expect(bookingReview).toContain('min-w-0');
  });
});
