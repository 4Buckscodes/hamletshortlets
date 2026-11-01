'use client';

import { useCurrency } from '@/lib/currency';
import { getValidShowcaseNightlyNgn } from '@/lib/discovery';

export function ShowcaseIndicativePrice({
  nightlyRateNgn,
}: {
  nightlyRateNgn: number;
}) {
  const { formatPrice, currency } = useCurrency();
  const validRate = getValidShowcaseNightlyNgn(nightlyRateNgn);

  if (validRate === null) {
    return <p className="mt-1 text-lg font-bold text-ink-600">Price unavailable</p>;
  }

  return (
    <p className="mt-1 font-mono text-2xl font-extrabold text-ink-950">
      {formatPrice(validRate, { roundWhole: true })}{' '}
      <span className="font-sans text-xs font-medium text-ink-600">
        / night indicative{currency !== 'NGN' ? ` (${currency})` : ''}
      </span>
    </p>
  );
}
