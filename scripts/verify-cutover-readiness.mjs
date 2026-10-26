#!/usr/bin/env node
/**
 * Read-only HAMLET.REST Next.js Cutover Readiness & Post-Cutover Smoke Verifier
 *
 * Usage:
 *   TARGET_URL=https://hamletshortlets-jonn.vercel.app npm run verify:cutover
 *   TARGET_URL=https://www.hamlet.rest npm run verify:cutover
 *
 * Strictly non-mutating: performs GET checks on public/crawler routes and
 * unauthenticated rejection probes on API routes (never writes data).
 */

const baseUrl = (process.env.TARGET_URL || 'https://hamletshortlets-jonn.vercel.app').replace(
  /\/+$/,
  '',
);

const PUBLIC_CHECKS = [
  {
    path: '/',
    mustContain: ['Your stay, sorted.', 'Yaba', 'Surulere', 'Shomolu'],
    mustNotContain: ['Four pillars of a better stay'],
  },
  {
    path: '/stays',
    mustContain: ['Explore verified', 'Lagos Mainland', 'Victoria Island'],
  },
  {
    path: '/lagos',
    mustContain: ['Lagos Mainland', 'Yaba', 'Shomolu', 'Surulere'],
  },
  {
    path: '/about',
    mustContain: ['Four pillars of a better stay', 'Abundance Abodes'],
  },
  {
    path: '/how-it-works',
    mustContain: ['Request the stay', 'awaiting_payment'],
  },
  {
    path: '/safety',
    mustContain: ['Ownership', 'Identity', 'Authority to list', 'Physical inspection'],
  },
  {
    path: '/faqs',
    mustContain: ['Shortlet FAQs', 'Are the pictures on HAMLET real?'],
  },
  {
    path: '/legal',
    mustContain: ['NDPR', 'Paystack'],
  },
  {
    path: '/signin',
    mustContain: ['Welcome to HAMLET', 'Create account'],
  },
  {
    path: '/partners/apply',
    mustContain: ['100%', '10%', '2.5%'],
  },
  {
    path: '/robots.txt',
    mustContain: ['Sitemap: https://www.hamlet.rest/sitemap.xml', 'Allow: /llms.txt'],
  },
  {
    path: '/sitemap.xml',
    mustContain: ['<urlset', 'https://www.hamlet.rest/stays'],
  },
  {
    path: '/llms.txt',
    mustContain: ['# HAMLET', 'https://www.hamlet.rest'],
  },
];

const API_GUARD_CHECKS = [
  {
    path: '/api/booking-requests',
    body: { propertyId: 'preflight-probe', checkIn: '2027-01-10', checkOut: '2027-01-12', guests: 2 },
  },
  {
    path: '/api/partner/properties',
    body: { title: 'Preflight Probe Only' },
  },
  {
    path: '/api/admin/properties/review',
    body: { propertyId: 'preflight-probe', decision: 'approved', note: 'Preflight check only' },
  },
];

async function run() {
  console.log(`\nHAMLET.REST Cutover Readiness Verification — Target: ${baseUrl}\n`);
  let failures = 0;
  let warnings = 0;

  let homeHtml = '';

  for (const check of PUBLIC_CHECKS) {
    const url = `${baseUrl}${check.path}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      if (check.path === '/') homeHtml = text;

      if (res.status !== 200) {
        console.error(`[FAIL] GET ${check.path} -> HTTP ${res.status} (expected 200)`);
        failures += 1;
        continue;
      }

      const missing = (check.mustContain || []).filter(token => !text.includes(token));
      const forbidden = (check.mustNotContain || []).filter(token => text.includes(token));

      if (missing.length > 0 || forbidden.length > 0) {
        console.error(
          `[FAIL] GET ${check.path} -> content mismatch (missing: ${JSON.stringify(missing)}, forbidden: ${JSON.stringify(forbidden)})`,
        );
        failures += 1;
      } else {
        console.log(`[PASS] GET ${check.path} -> HTTP 200 (${text.length.toLocaleString()} chars)`);
      }
    } catch (err) {
      console.error(`[FAIL] GET ${check.path} -> network error: ${err instanceof Error ? err.message : String(err)}`);
      failures += 1;
    }
  }

  // Verify compiled Tailwind CSS stylesheet asset referenced on `/`
  const cssMatches = [...homeHtml.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(
    m => m[1],
  );
  if (cssMatches.length === 0) {
    console.error('[FAIL] CSS bundle check -> no /_next/static/css/*.css link found on /');
    failures += 1;
  } else {
    let foundCompiledUtilities = false;
    for (const cssPath of cssMatches) {
      const cssRes = await fetch(`${baseUrl}${cssPath}`);
      const cssBody = await cssRes.text();
      if (cssRes.status === 200 && cssBody.includes('.bg-ink-950') && cssBody.includes('.hidden')) {
        foundCompiledUtilities = true;
        console.log(
          `[PASS] CSS bundle ${cssPath} -> HTTP 200 (${cssBody.length.toLocaleString()} bytes, compiled Tailwind utilities verified)`,
        );
      }
    }
    if (!foundCompiledUtilities) {
      console.error(
        '[FAIL] CSS bundle check -> Tailwind utilities (.bg-ink-950 / .hidden) missing from compiled CSS!',
      );
      failures += 1;
    }
  }

  // Verify API route auth & Supabase env configuration guards (401 = env configured, 503 = Supabase env missing)
  for (const apiCheck of API_GUARD_CHECKS) {
    const url = `${baseUrl}${apiCheck.path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(apiCheck.body),
      });
      if (res.status === 401) {
        console.log(
          `[PASS] POST ${apiCheck.path} (unauthenticated) -> HTTP 401 (Supabase public env configured & auth guard active)`,
        );
      } else if (res.status === 503) {
        console.warn(
          `[WARN] POST ${apiCheck.path} -> HTTP 503 (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing on target!)`,
        );
        warnings += 1;
      } else {
        console.error(
          `[FAIL] POST ${apiCheck.path} -> unexpected HTTP ${res.status} (expected 401 or 503)`,
        );
        failures += 1;
      }
    } catch (err) {
      console.error(`[FAIL] POST ${apiCheck.path} -> ${err instanceof Error ? err.message : String(err)}`);
      failures += 1;
    }
  }

  console.log(
    `\nSummary: ${failures === 0 ? 'READY FOR NEXT GATE' : 'BLOCKED'} (${failures} failure(s), ${warnings} warning(s))\n`,
  );
  if (failures > 0) process.exit(1);
}

run();
