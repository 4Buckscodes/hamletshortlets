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

const REQUIRED_VIEWPORT_WIDTHS = [320, 375, 390, 430, 768, 1440] as const;

test.describe('HAMLET Next.js App Router — Guest Property Discovery & Automatic Currency', () => {
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

  test('maintains zero horizontal overflow across 320px, 375px, 390px, 430px, 768px, and 1440px on / and /stays', async ({
    page,
  }) => {
    for (const width of REQUIRED_VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });

      await page.goto('/');
      await expect(page.getByRole('heading', { name: /Find your next stay\./i })).toBeVisible();
      const homeOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(homeOverflow, `/ should not overflow horizontally at ${width}px`).toBe(false);

      await page.goto('/stays');
      await expect(
        page.getByRole('heading', { name: /Explore verified shortlet stays across Lagos\./i }),
      ).toBeVisible();
      const staysOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(staysOverflow, `/stays should not overflow horizontally at ${width}px`).toBe(
        false,
      );
    }
  });

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

  test('removes manual currency switcher controls and auto-detects NGN, GBP, and USD cleanly', async ({
    browser,
  }) => {
    // 1. Default Lagos visitor -> NGN (₦) with zero manual currency toggle buttons
    const lagosCtx = await browser.newContext({
      locale: 'en-NG',
      timezoneId: 'Africa/Lagos',
    });
    const lagosPage = await lagosCtx.newPage();
    await lagosPage.goto('/stays/showcase/hamlet-preview-lagos-001');
    await expect(
      lagosPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(lagosPage.getByText(/₦145,000/)).toBeVisible();
    await lagosCtx.close();

    // 2. UK visitor -> GBP (£) automatically via locale/timezone and /api/geo
    const ukCtx = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      extraHTTPHeaders: { 'x-vercel-ip-country': 'GB' },
    });
    const ukPage = await ukCtx.newPage();
    await ukPage.goto('/stays/showcase/hamlet-preview-lagos-001');
    await expect(
      ukPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(ukPage.getByText(/\(GBP\)/)).toBeVisible();
    await ukCtx.close();

    // 3. US visitor -> USD ($) automatically via locale/timezone and /api/geo
    const usCtx = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: { 'x-vercel-ip-country': 'US' },
    });
    const usPage = await usCtx.newPage();
    await usPage.goto('/stays/showcase/hamlet-preview-lagos-001');
    await expect(
      usPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(usPage.getByText(/\(USD\)/)).toBeVisible();
    await usCtx.close();
  });

  test('supports homepage neighbourhood rail discovery, combined /stays filters, price validation, and Clear filters', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Find your next stay\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Places worth staying in/i })).toBeVisible();

    const rail = page.getByRole('region', { name: 'Lagos neighbourhoods' });
    await expect(rail.getByRole('button', { name: /Lekki Phase 1/i })).toBeVisible();
    await expect(rail.getByRole('button', { name: /Ikate/i })).toBeVisible();
    await expect(rail.getByRole('button', { name: /Victoria Island/i })).toBeVisible();
    await expect(rail.getByRole('button', { name: /Yaba/i })).toBeVisible();

    await rail.getByRole('button', { name: /Ikate/i }).click();
    await expect(page).toHaveURL(/area=Ikate/);
    await expect(page.getByRole('button', { name: /Clear filters/i }).first()).toBeVisible();

    // Navigate to /stays with combined filters & verify invalid min > max price validation
    await page.goto('/stays?area=Yaba&minPrice=300000&maxPrice=100000');
    await expect(
      page.getByText(/Minimum price cannot be higher than maximum price/i).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: /Clear filters/i }).first().click();
    await expect(page).toHaveURL(/\/stays$/);
  });

  test('separates non-bookable showcase concepts from bookable stays and omits booking actions on showcase pages', async ({
    page,
  }) => {
    await page.goto('/stays');
    await expect(
      page.getByRole('heading', { name: /Explore verified shortlet stays across Lagos\./i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Illustrative concept previews · Non-bookable/i),
    ).toBeVisible();

    const firstShowcaseLink = page.getByRole('link', { name: /View showcase/i }).first();
    await expect(firstShowcaseLink).toBeVisible();
    await firstShowcaseLink.click();

    await expect(page).toHaveURL(/\/stays\/showcase\//);
    await expect(page.getByText(/Not accepting bookings/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Request to book|Reserve/i })).toHaveCount(0);
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

  test('locks referral code on guest sign-up when arriving from a referral link', async ({
    page,
  }) => {
    await page.goto('/?ref=HML-LOCK123');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('hamlet:referral-code')))
      .toBe('HML-LOCK123');
    await page.goto('/signin?mode=signup');
    await page.getByLabel(/Email address/i).fill('guest@example.com');
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!');
    await page.getByRole('button', { name: /Continue/i }).click();
    const referralCode = page.getByLabel('Referral code');
    await expect(referralCode).toHaveValue('HML-LOCK123');
    await expect(referralCode).toHaveAttribute('readonly', '');
  });

  test('redirects legacy #/ hash deep links cleanly to Next.js App Router paths during cutover', async ({
    page,
  }) => {
    await page.goto('/#/partner/register?ref=HML-CUTOVER1');
    await page.waitForURL('**/partners/apply?ref=HML-CUTOVER1');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('serves crawler endpoints, /api/geo, and blocks unauthenticated API mutations', async ({
    request,
  }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap: https://www.hamlet.rest/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('https://www.hamlet.rest/stays');

    const geoGb = await request.get('/api/geo', {
      headers: { 'x-vercel-ip-country': 'GB' },
    });
    expect(geoGb.status()).toBe(200);
    expect(await geoGb.json()).toEqual({ country: 'GB', currency: 'GBP' });

    const unauthBooking = await request.post('/api/booking-requests', {
      data: { propertyId: 'x', checkIn: '2026-12-01', checkOut: '2026-12-03', guests: 2 },
    });
    expect([401, 503]).toContain(unauthBooking.status());
  });
});
