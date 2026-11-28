// Pulls live NGN exchange rates from ExchangeRate-API and stores them for quoting.
// A bad or missing response never overwrites a good rate: the stored rate simply
// expires after 48 hours and guests then see Naira prices.

export const FX_CURRENCIES = ['USD', 'GBP', 'EUR'] as const;
export type FxCurrency = (typeof FX_CURRENCIES)[number];
export const FX_SOURCE_LABEL = 'exchangerate-api.com';
export const FX_VALID_HOURS = 48;

export interface FxRefreshDeps {
  apiKey: string | undefined;
  internalDispatchSecret: string | undefined;
  verifyVaultDispatchSecret?: (candidate: string) => Promise<boolean>;
  fetchImpl?: typeof fetch;
  applyRate: (input: {
    currency: FxCurrency;
    ngnPerUnit: number;
    source: string;
    validHours: number;
  }) => Promise<{ error: { message: string } | null }>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Converts "1 NGN buys X foreign" rates into "NGN per 1 foreign unit". Returns null if unusable. */
export function ngnPerUnitFromNgnBase(rates: Record<string, unknown>, currency: string): number | null {
  const perNgn = Number(rates[currency]);
  if (!Number.isFinite(perNgn) || perNgn <= 0) return null;
  const ngnPerUnit = 1 / perNgn;
  // Plausibility floor/ceiling: 1 unit of USD/GBP/EUR is never < 100 or > 10,000 naira.
  if (ngnPerUnit < 100 || ngnPerUnit > 10_000) return null;
  return Math.round(ngnPerUnit * 10_000) / 10_000;
}

export async function handleFxRatesRefresh(req: Request, deps: FxRefreshDeps): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = deps.internalDispatchSecret?.trim() ?? '';
  const supplied = req.headers.get('x-hamlet-internal-secret')?.trim() ?? '';
  let authorized = expected.length >= 32 && supplied === expected;
  if (!authorized && supplied.length >= 32 && deps.verifyVaultDispatchSecret) {
    try {
      authorized = await deps.verifyVaultDispatchSecret(supplied);
    } catch {
      authorized = false;
    }
  }
  if (!authorized) return json({ error: 'unauthorized' }, 401);

  const apiKey = deps.apiKey?.trim();
  if (!apiKey) return json({ error: 'rate_provider_not_configured' }, 503);

  let payload: { result?: string; conversion_rates?: Record<string, unknown> };
  try {
    const res = await (deps.fetchImpl ?? fetch)(
      `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/NGN`,
    );
    if (!res.ok) return json({ error: 'rate_provider_unavailable' }, 502);
    payload = await res.json();
  } catch {
    return json({ error: 'rate_provider_unavailable' }, 502);
  }
  if (payload.result !== 'success' || !payload.conversion_rates) {
    return json({ error: 'rate_provider_bad_response' }, 502);
  }

  const results: Record<string, string> = {};
  for (const currency of FX_CURRENCIES) {
    const ngnPerUnit = ngnPerUnitFromNgnBase(payload.conversion_rates, currency);
    if (ngnPerUnit === null) {
      results[currency] = 'skipped_invalid_rate';
      continue;
    }
    const { error } = await deps.applyRate({
      currency,
      ngnPerUnit,
      source: FX_SOURCE_LABEL,
      validHours: FX_VALID_HOURS,
    });
    results[currency] = error ? `rejected: ${error.message}` : `updated:${ngnPerUnit}`;
  }
  return json({ ok: true, results });
}
