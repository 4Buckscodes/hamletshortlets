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
      await expect(page.getByRole('main')).toBeVisible();
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
      await expect(
        page.getByRole('heading', { level: 1, name: /Find your place to belong\./i }),
      ).toBeVisible();
      const homeOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(homeOverflow, `/ should not overflow horizontally at ${width}px`).toBe(false);

      await page.goto('/stays');
      await expect(
        page.getByRole('heading', { level: 1, name: /Find a stay/i }),
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
    await lagosPage.goto('/stays');
    await expect(
      lagosPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(lagosPage.getByText(/₦ \(NGN\)/).first()).toBeVisible();
    await lagosCtx.close();

    // 2. UK visitor -> GBP (£) automatically via locale/timezone and /api/geo
    const ukCtx = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      extraHTTPHeaders: { 'x-vercel-ip-country': 'GB' },
    });
    const ukPage = await ukCtx.newPage();
    await ukPage.goto('/stays');
    await expect(
      ukPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(ukPage.getByText(/£ \(GBP\)/).first()).toBeVisible();
    await ukCtx.close();

    // 3. US visitor -> USD ($) automatically via locale/timezone and /api/geo
    const usCtx = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: { 'x-vercel-ip-country': 'US' },
    });
    const usPage = await usCtx.newPage();
    await usPage.goto('/stays');
    await expect(
      usPage.locator('button[aria-label*="Display prices in"]'),
    ).toHaveCount(0);
    await expect(usPage.getByText(/\$ \(USD\)/).first()).toBeVisible();
    await usCtx.close();
  });

  test('supports homepage neighbourhood and area discovery, combined /stays filters, price validation, and Clear filters', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Find your place to belong\./i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /Every place has its feeling\./i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /Find somewhere that feels right\./i }),
    ).toBeVisible();

    const neighbourhoods = page.getByRole('region', { name: 'Lagos neighbourhoods' });
    await expect(neighbourhoods.getByRole('link', { name: /Island energy/i })).toBeVisible();
    await expect(neighbourhoods.getByRole('link', { name: /Mainland rhythm/i })).toBeVisible();
    await expect(neighbourhoods.getByRole('link', { name: /A little hideaway/i })).toBeVisible();

    const search = page.getByRole('search', { name: /Search Lagos shortlets/i });
    await expect(search).toBeVisible();
    const quickAreas = page.getByRole('region', { name: 'Search for a stay' });
    for (const area of ['Lekki', 'Victoria Island', 'Ikoyi', 'Yaba']) {
      await expect(quickAreas.getByRole('link', { name: area, exact: true })).toBeVisible();
    }

    await quickAreas.getByRole('link', { name: 'Yaba', exact: true }).click();
    await expect(page).toHaveURL(/\/stays\?area=Yaba/);
    await expect(page.getByRole('button', { name: /Clear filters/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /Clear filters/i }).first().click();
    await expect(page).not.toHaveURL(/area=Yaba/);

    // Navigate to /stays with combined filters & verify invalid min > max price validation
    await page.goto('/stays?area=Yaba&minPrice=300000&maxPrice=100000');
    await expect(
      page.getByText(/Minimum price cannot be higher than maximum price/i).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: /Clear filters/i }).first().click();
    await expect(page).toHaveURL(/\/stays$/);
  });

  test('omits illustrative showcase demo concepts across / and /stays and returns 404 for removed showcase routes', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText(/Illustrative concept/i)).toHaveCount(0);
    await expect(page.getByText(/Lagos showcase concepts/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View showcase/i })).toHaveCount(0);

    await page.goto('/stays');
    await expect(
      page.getByRole('heading', { level: 1, name: /Find a stay/i }),
    ).toBeVisible();
    await expect(page.getByText(/Illustrative concept/i)).toHaveCount(0);
    await expect(page.getByText(/Lagos showcase concepts/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View showcase/i })).toHaveCount(0);

    const removedDemoRes = await page.goto('/stays/showcase/hamlet-preview-lagos-001');
    expect(removedDemoRes?.status()).toBe(404);
    await expect(page.getByText(/Page not found\./i)).toBeVisible();
  });

  test('uses streamlined email-and-password guest sign-up and preserves ?next= intent', async ({
    page,
  }) => {
    await page.goto(
      '/signin?mode=signup&next=%2Fstays%2Fsample-id%3FcheckIn%3D2026-12-01%26checkOut%3D2026-12-04%26guests%3D2%26step%3D2',
    );
    await expect(page.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel(/Email address/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create my account/i })).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toHaveCount(0);
    await expect(page.getByLabel(/Phone/i)).toHaveCount(0);
    await expect(page.getByLabel(/Referral code/i)).toHaveCount(0);
  });

  test('captures referral code from a referral link without adding a manual signup field', async ({
    page,
  }) => {
    await page.goto('/?ref=HML-LOCK123');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('hamlet:referral-code')))
      .toBe('HML-LOCK123');
    await page.goto('/signin?mode=signup');
    await expect(page.getByLabel(/Email address/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create my account/i })).toBeVisible();
    await expect(page.getByLabel(/Referral code/i)).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('hamlet:referral-code')))
      .toBe('HML-LOCK123');
  });

  test('redirects legacy #/ hash deep links cleanly to Next.js App Router paths during cutover', async ({
    page,
  }) => {
    await page.goto('/#/partner/register?ref=HML-CUTOVER1');
    await page.waitForURL('**/partners/apply?ref=HML-CUTOVER1');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('renders mobile hero search form, full-screen nav drawer, and accordion footer at 390x844', async ({
    browser,
  }) => {
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'en-NG',
      timezoneId: 'Africa/Lagos',
    });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto('/');

    // Mobile hero search form landmark
    const mobileSearchRegion = mobilePage.getByRole('search', {
      name: /Search Lagos shortlets/i,
    });
    await expect(mobileSearchRegion).toBeVisible();
    await expect(mobileSearchRegion.getByLabel('Enter a Lagos area')).toBeVisible();
    await expect(mobileSearchRegion.getByLabel('Check-in date')).toBeVisible();
    await expect(mobileSearchRegion.getByLabel('Check-out date')).toBeVisible();
    await expect(mobileSearchRegion.getByLabel('Number of guests')).toBeVisible();
    await expect(mobileSearchRegion.getByRole('button', { name: /Find my stay/i })).toBeVisible();

    // Trust section on homepage
    await expect(
      mobilePage.getByRole('heading', { level: 2, name: /Good stays\. Zero guesswork\./i }),
    ).toBeVisible();

    // Mobile full-screen navigation drawer
    await mobilePage.getByRole('button', { name: /Open navigation menu/i }).click();
    const mobileDrawer = mobilePage.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileDrawer).toBeVisible();
    await expect(mobileDrawer.getByRole('button', { name: /Ask Horatio/i })).toBeVisible();
    await expect(mobileDrawer.getByRole('link', { name: 'Explore stays' })).toBeVisible();
    await expect(mobileDrawer.getByRole('link', { name: 'Lagos guide' })).toBeVisible();
    await expect(mobileDrawer.getByRole('link', { name: 'Partner with us' })).toBeVisible();
    await expect(mobileDrawer.getByRole('link', { name: 'Create guest account' })).toBeVisible();
    await mobileDrawer.getByRole('button', { name: /Close navigation menu/i }).click();
    await expect(mobileDrawer).toBeHidden();

    // Mobile collapsible accordion footer
    const exploreToggle = mobilePage.locator('footer').getByRole('button', {
      name: /Explore Lagos/i,
    });
    await expect(exploreToggle).toHaveAttribute('aria-expanded', 'false');
    await exploreToggle.click();
    await expect(exploreToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(
      mobilePage.locator('#footer-accordion-explore').getByRole('link', {
        name: /All Lagos stays/i,
      }),
    ).toBeVisible();

    await mobileCtx.close();
  });

  test('serves crawler endpoints, /api/geo, structured data, and blocks unauthenticated API mutations', async ({
    request,
    page,
  }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap: https://hamlet.rest/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('https://hamlet.rest/stays');

    await page.goto('/about');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://hamlet.rest/about');

    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(2);
    const parsedNodes = jsonLdScripts.flatMap(raw => {
      const parsed = JSON.parse(raw) as { '@graph'?: Array<Record<string, unknown>>; '@type'?: string };
      return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
    });
    const orgNodes = parsedNodes.filter(node => node['@type'] === 'Organization');
    const siteNodes = parsedNodes.filter(node => node['@type'] === 'WebSite');
    expect(orgNodes).toHaveLength(1);
    expect(siteNodes).toHaveLength(1);
    expect(orgNodes[0]?.name).toBe('HAMLET');
    expect(orgNodes[0]?.url).toBe('https://hamlet.rest');
    expect((orgNodes[0]?.parentOrganization as { name?: string })?.name).toBe(
      'Abundance Abodes',
    );
    expect(parsedNodes.some(node => node['@type'] === 'AboutPage')).toBe(true);
    expect(parsedNodes.some(node => node['@type'] === 'BreadcrumbList')).toBe(true);

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

  test('renders PR #76 /admin/communications cleanly without horizontal overflow and returns 404 for excluded PR #74 /partners/deals route', async ({
    page,
  }) => {
    const commRes = await page.goto('/admin/communications');
    expect(commRes?.status()).toBe(200);
    await expect(page.getByRole('main')).toBeVisible();
    const commOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(commOverflow).toBe(false);

    const excludedPr74Res = await page.goto('/partners/deals');
    expect(excludedPr74Res?.status()).toBe(404);
    await expect(page.getByText(/Page not found\./i)).toBeVisible();
  });
});
