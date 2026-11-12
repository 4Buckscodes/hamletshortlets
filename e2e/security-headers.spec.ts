import { expect, test } from '@playwright/test';

test('serves baseline security headers on public pages', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();

  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['strict-transport-security']).toContain('max-age=31536000');
  expect(headers['permissions-policy']).toContain('geolocation=(self)');
});
