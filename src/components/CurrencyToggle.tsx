import { ArrowLeftRight } from 'lucide-react';
import { useCurrency } from '../lib/currency';

export function CurrencyToggle({
  variant = 'light',
  compact = false,
  className = '',
}: {
  variant?: 'light' | 'dark' | 'compact';
  compact?: boolean;
  className?: string;
}) {
  const { currency, setCurrency, toggleCurrency } = useCurrency();
  const effectiveVariant = compact ? 'compact' : variant;

  if (effectiveVariant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleCurrency}
        aria-label={`Switch stay currency (currently ${currency}). Click for ${currency === 'NGN' ? 'US Dollar ($)' : 'Nigerian Naira (₦)'}`}
        title="Switch between Naira (₦) and US Dollar ($) stay prices"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-[11.5px] font-extrabold text-ink-800 transition hover:border-jade-400 hover:text-jade-800 [&>svg]:shrink-0 ${className}`}
      >
        <ArrowLeftRight size={12} className="text-jade-700" />
        <span>{currency === 'NGN' ? '₦ NGN' : '$ USD'}</span>
      </button>
    );
  }

  const isDark = effectiveVariant === 'dark';

  return (
    <div
      role="group"
      aria-label="Stay price currency"
      className={`inline-flex shrink-0 items-center rounded-xl border p-0.5 ${
        isDark
          ? 'border-white/15 bg-ink-900/90 text-ink-200'
          : 'border-ink-200 bg-white text-ink-700 shadow-2xs'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setCurrency('NGN')}
        aria-pressed={currency === 'NGN'}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide transition ${
          currency === 'NGN'
            ? isDark
              ? 'bg-brass-500 text-ink-950'
              : 'bg-jade-700 text-white'
            : isDark
              ? 'text-ink-300 hover:text-white'
              : 'text-ink-600 hover:text-ink-900'
        }`}
      >
        ₦ NGN
      </button>
      <button
        type="button"
        onClick={() => setCurrency('USD')}
        aria-pressed={currency === 'USD'}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide transition ${
          currency === 'USD'
            ? isDark
              ? 'bg-brass-500 text-ink-950'
              : 'bg-jade-700 text-white'
            : isDark
              ? 'text-ink-300 hover:text-white'
              : 'text-ink-600 hover:text-ink-900'
        }`}
      >
        $ USD
      </button>
    </div>
  );
}
