import { describe, expect, it } from 'vitest';
import { handleFxRatesRefresh, ngnPerUnitFromNgnBase } from './handler';

const SECRET = 'x'.repeat(40);
const req = (secret = SECRET) =>
  new Request('https://x.test/fx', { method: 'POST', headers: { 'x-hamlet-internal-secret': secret } });
const okFetch = (rates: Record<string, number>) =>
  (async () => new Response(JSON.stringify({ result: 'success', conversion_rates: rates }))) as typeof fetch;

describe('fx-rates-refresh', () => {
  it('inverts NGN-base rates and rejects implausible ones', () => {
    expect(ngnPerUnitFromNgnBase({ EUR: 0.001 }, 'EUR')).toBe(1000);
    expect(ngnPerUnitFromNgnBase({ EUR: 0 }, 'EUR')).toBeNull();
    expect(ngnPerUnitFromNgnBase({ EUR: 5 }, 'EUR')).toBeNull();
    expect(ngnPerUnitFromNgnBase({}, 'EUR')).toBeNull();
  });

  it('rejects callers without the secret', async () => {
    const res = await handleFxRatesRefresh(req('nope'), {
      apiKey: 'k', internalDispatchSecret: SECRET, applyRate: async () => ({ error: null }),
    });
    expect(res.status).toBe(401);
  });

  it('stores USD, GBP and EUR rates from the provider', async () => {
    const applied: Array<[string, number]> = [];
    const res = await handleFxRatesRefresh(req(), {
      apiKey: 'k',
      internalDispatchSecret: SECRET,
      fetchImpl: okFetch({ USD: 1 / 1500, GBP: 1 / 2000, EUR: 1 / 1700 }),
      applyRate: async i => { applied.push([i.currency, i.ngnPerUnit]); return { error: null }; },
    });
    expect(res.status).toBe(200);
    expect(applied).toEqual([['USD', 1500], ['GBP', 2000], ['EUR', 1700]]);
  });

  it('stores nothing when the provider fails', async () => {
    let called = false;
    const res = await handleFxRatesRefresh(req(), {
      apiKey: 'k',
      internalDispatchSecret: SECRET,
      fetchImpl: (async () => new Response('x', { status: 500 })) as typeof fetch,
      applyRate: async () => { called = true; return { error: null }; },
    });
    expect(res.status).toBe(502);
    expect(called).toBe(false);
  });
});
