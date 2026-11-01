/**
 * Guest-facing manual currency switching has been removed in favour of
 * automatic currency detection (`detectUserCurrency` in `src/lib/currency.tsx`).
 * Kept as a null component so legacy Vite bridge imports remain type-safe.
 */
export function CurrencyToggle(_props: {
  variant?: 'light' | 'dark' | 'compact';
  compact?: boolean;
  className?: string;
}) {
  void _props;
  return null;
}
