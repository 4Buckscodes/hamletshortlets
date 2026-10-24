import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { CURRENCY_ORDER, CURRENCY_SYMBOLS, useCurrency, type DisplayCurrency } from '../lib/currency';
import { useToast } from '../lib/toast';

const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  NGN: 'Nigerian Naira (₦)',
  USD: 'US Dollar ($)',
  GBP: 'British Pound (£)',
};

export function CurrencyToggle({
  variant = 'light',
  compact = false,
  className = '',
}: {
  variant?: 'light' | 'dark' | 'compact';
  compact?: boolean;
  className?: string;
}) {
  const { currency, exchangeRates, setCurrency } = useCurrency();
  const { toast } = useToast();
  const [mountMs] = useState(() => Date.now());
  const effectiveVariant = compact ? 'compact' : variant;

  const isCodeAvailable = (code: DisplayCurrency): boolean => {
    if (code === 'NGN') return true;
    const cfg = exchangeRates.find(r => r.currency === code);
    if (!cfg || !cfg.isActive || !(cfg.ngnPerUnit > 0)) return false;
    if (cfg.expiresAt && new Date(cfg.expiresAt).getTime() <= mountMs) return false;
    return true;
  };

  const availableCurrencies = CURRENCY_ORDER.filter(isCodeAvailable);

  const handleSelect = (code: DisplayCurrency) => {
    if (!isCodeAvailable(code)) {
      setCurrency('NGN');
      toast(`${CURRENCY_LABELS[code]} exchange rate is currently unavailable — showing verified Naira (₦) pricing.`, 'info');
      return;
    }
    setCurrency(code);
  };

  if (effectiveVariant === 'compact') {
    const cycleList: DisplayCurrency[] = availableCurrencies.length > 0 ? availableCurrencies : ['NGN'];
    const currentIdx = cycleList.indexOf(currency);
    const nextCurrency = cycleList[(currentIdx >= 0 ? currentIdx + 1 : 0) % cycleList.length];
    return (
      <button
        type="button"
        onClick={() => handleSelect(nextCurrency)}
        aria-label={`Switch stay currency (currently ${CURRENCY_LABELS[currency]}). Click for ${CURRENCY_LABELS[nextCurrency]}`}
        title="Switch between Naira (₦), US Dollar ($), and British Pound (£) stay prices"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-[11.5px] font-extrabold text-ink-800 transition hover:border-jade-400 hover:text-jade-800 [&>svg]:shrink-0 ${className}`}
      >
        <ArrowLeftRight size={12} className="text-jade-700" />
        <span>{CURRENCY_SYMBOLS[currency]} {currency}</span>
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
      {CURRENCY_ORDER.map(code => {
        const active = currency === code;
        const available = isCodeAvailable(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={active}
            title={
              available
                ? `Show stay prices in ${CURRENCY_LABELS[code]}`
                : `${CURRENCY_LABELS[code]} rate temporarily unavailable — showing Naira (₦)`
            }
            className={`rounded-lg px-2 py-1 text-[11px] font-extrabold tracking-wide transition sm:px-2.5 ${
              active
                ? isDark
                  ? 'bg-brass-500 text-ink-950'
                  : 'bg-jade-700 text-white'
                : !available
                  ? 'opacity-45 hover:opacity-75'
                  : isDark
                    ? 'text-ink-300 hover:text-white'
                    : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {CURRENCY_SYMBOLS[code]} {code}
          </button>
        );
      })}
    </div>
  );
}
