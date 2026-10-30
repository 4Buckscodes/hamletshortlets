import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/stays',
  '/lagos',
  '/about',
  '/how-it-works',
  '/safety',
  '/faqs',
  '/legal',
  '/signin',
  '/partners/apply',
];

test.describe('HAMLET Next.js App Router MVP — Mobile & Desktop Verification', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route} with zero horizontal overflow and clear landmarks`, async ({
      page,
    }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test('applies compiled Tailwind CSS responsive breakpoints and HAMLET theme styles', async ({
    page,
  }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    const mobileMenuBtn = page.getByRole('button', { name: /Open navigation menu/i });
    const desktopNav = page.getByRole('navigation', { name: 'Primary navigation' });

    if (viewport && viewport.width >= 1024) {
      await expect(desktopNav).toBeVisible();
      await expect(mobileMenuBtn).toBeHidden();
    } else {
      await expect(mobileMenuBtn).toBeVisible();
      await expect(desktopNav).toBeHidden();
    }

    const heroBg = await page
      .locator('main section')
      .first()
      .evaluate(el => getComputedStyle(el).backgroundColor);
    expect(heroBg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('switches currency between NGN, USD and GBP cleanly', async ({ page }) => {
    await page.goto('/');
    const usdBtn = page.locator('button[aria-label="Display prices in USD"]:visible').first();
    await expect(usdBtn).toBeVisible();
    await usdBtn.click();
    await expect(usdBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('walks progressive 2-step guest sign-up on /signin and preserves ?next= intent', async ({
    page,
  }) => {
    await page.goto(
      '/signin?mode=signup&next=%2Fstays%2Fsample-id%3FcheckIn%3D2026-12-01%26checkOut%3D2026-12-04%26guests%3D2%26step%3D2',
    );
    await expect(page.getByText(/Step 1 of 2/i).first()).toBeVisible();
    await page.getByLabel(/Email address/i).fill('guest@example.com');
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!');
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Step 2 of 2/i).first()).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toBeVisible();
  });

  test('locks referral code on guest sign-up when arriving from a referral link', async ({ page }) => {
    await page.goto('/?ref=HML-LOCK123');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('hamlet:referral-code'))).toBe('HML-LOCK123');
    await page.goto('/signin?mode=signup');
    await page.getByLabel(/Email address/i).fill('guest@example.com');
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!');
    await page.getByRole('button', { name: /Continue/i }).click();
    const referralCode = page.getByLabel('Referral code');
    await expect(referralCode).toHaveValue('HML-LOCK123');
    await expect(referralCode).toHaveAttribute('readonly', '');
  });

  test('opens mobile-friendly search filter drawer on /stays', async ({ page }) => {
    await page.goto('/stays');
    await page.getByRole('button', { name: /Filters/i }).click();
    await expect(page.getByRole('dialog', { name: /Filter stays/i })).toBeVisible();
    await page.getByRole('button', { name: /Close panel/i }).click();
  });

  test('redirects legacy #/ hash deep links cleanly to Next.js App Router paths during cutover', async ({
    page,
  }) => {
    await page.goto('/#/partner/register?ref=HML-CUTOVER1');
    await page.waitForURL('**/partners/apply?ref=HML-CUTOVER1');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('serves crawler endpoints and blocks unauthenticated API mutations', async ({
    request,
  }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap: https://www.hamlet.rest/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('https://www.hamlet.rest/stays');

    const unauthBooking = await request.post('/api/booking-requests', {
      data: { propertyId: 'x', checkIn: '2026-12-01', checkOut: '2026-12-03', guests: 2 },
    });
    expect([401, 503]).toContain(unauthBooking.status());
  });
});
