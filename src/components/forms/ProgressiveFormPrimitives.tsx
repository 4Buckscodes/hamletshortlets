'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';

export interface ProgressiveDraftConfig<T> {
  storageKey: string;
  initialValues: T;
  initialStep?: number;
}

/**
 * Persistent progressive form draft hook backed by localStorage.
 * Hydration-safe for Next.js SSR; never overwrites server markup before mount.
 */
export function useProgressiveDraft<T>(
  keyOrConfig: string | ProgressiveDraftConfig<T>,
  maybeInitialValue?: T,
) {
  const storageKey =
    typeof keyOrConfig === 'string' ? keyOrConfig : keyOrConfig.storageKey;
  const initialValue = (
    typeof keyOrConfig === 'string'
      ? maybeInitialValue
      : keyOrConfig.initialValues
  ) as T;
  const initialStep =
    typeof keyOrConfig === 'string' ? 0 : (keyOrConfig.initialStep ?? 0);

  const [draft, setDraft] = useState<T>(initialValue);
  const [step, setStepState] = useState<number>(initialStep);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const initialRef = useRef(initialValue);
  const initialStepRef = useRef(initialStep);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            data?: T;
            step?: number;
            savedAt?: string;
          };
          if (parsed && parsed.data && typeof parsed.data === 'object') {
            setDraft(prev => ({ ...prev, ...parsed.data }));
            if (typeof parsed.step === 'number' && parsed.step >= 0) {
              setStepState(parsed.step);
            }
            setSavedAt(parsed.savedAt || null);
            setRestoredFromStorage(true);
          }
        }
      } catch {
        // Ignore storage read errors in private/restricted contexts.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const updateDraft = useCallback(
    (updater: Partial<T> | ((prev: T) => T)) => {
      setDraft(prev => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : { ...prev, ...updater };
        try {
          const nowIso = new Date().toISOString();
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ data: next, step, savedAt: nowIso }),
          );
          setSavedAt(nowIso);
        } catch {
          // Ignore quota/storage errors.
        }
        return next;
      });
    },
    [step, storageKey],
  );

  const setStep = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setStepState(prev => {
        const nextStep = typeof updater === 'function' ? updater(prev) : updater;
        return Math.max(0, nextStep);
      });
    },
    [],
  );

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
    setDraft(initialRef.current);
    setStepState(initialStepRef.current);
    setSavedAt(null);
    setRestoredFromStorage(false);
  }, [storageKey]);

  return {
    draft,
    setDraft: updateDraft,
    values: draft,
    setValues: updateDraft,
    step,
    setStep,
    clearDraft,
    hydrated,
    savedAt,
    lastSavedAt: savedAt,
    restoredFromStorage,
    hasSavedDraft: restoredFromStorage || Boolean(savedAt),
  };
}

export interface StepDefinition {
  id: string;
  title: string;
  shortLabel?: string;
  description?: string;
}

export function StepProgressHeader({
  steps,
  currentStep,
  onSelectStep,
  maxCompletedStep = currentStep,
}: {
  steps: readonly StepDefinition[];
  currentStep: number;
  onSelectStep?: (index: number) => void;
  maxCompletedStep?: number;
}) {
  const active = steps[currentStep] ?? steps[0];
  const pct = Math.round(((currentStep + 1) / Math.max(1, steps.length)) * 100);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-brass-700">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-xs font-semibold text-ink-500">{pct}% complete</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Step ${currentStep + 1} of ${steps.length}: ${active.title}`}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div
          className="h-full rounded-full bg-ink-900 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {steps.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStep;
            const isDone = idx < currentStep || idx <= maxCompletedStep;
            const canClick = Boolean(onSelectStep && (idx <= maxCompletedStep || idx < currentStep));
            return (
              <button
                key={step.id}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep?.(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                  isCurrent
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : isDone
                      ? 'cursor-pointer border-ink-200 bg-paper text-ink-800 hover:border-ink-500'
                      : 'border-ink-100 bg-white text-ink-400'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-extrabold ${
                    isCurrent
                      ? 'bg-brass-500 text-ink-950'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {idx < currentStep ? <Check className="h-2.5 w-2.5 shrink-0" /> : idx + 1}
                </span>
                <span>{step.shortLabel || step.title}</span>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="serif text-2xl font-medium text-ink-900 sm:text-[28px]">
          {active.title}
        </h2>
        {active.description && (
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{active.description}</p>
        )}
      </div>
    </div>
  );
}

export function DraftStatusBar({
  savedAt,
  lastSavedAt,
  hasSavedDraft,
  restoredFromStorage,
  onClearDraft,
  extraStatus,
}: {
  savedAt?: string | null;
  lastSavedAt?: string | null;
  hasSavedDraft?: boolean;
  restoredFromStorage?: boolean;
  onClearDraft?: () => void;
  extraStatus?: string | null;
}) {
  const effectiveSavedAt = savedAt ?? lastSavedAt ?? null;
  if (!effectiveSavedAt && !hasSavedDraft && !extraStatus) return null;
  const formattedTime = effectiveSavedAt
    ? new Date(effectiveSavedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-200 bg-paper px-3.5 py-2.5 text-xs text-ink-700">
      <div className="flex items-center gap-2">
        <Save className="h-3.5 w-3.5 shrink-0 text-brass-700" />
        <span>
          {extraStatus ||
            (restoredFromStorage
              ? `Resumed your saved draft${formattedTime ? ` (last saved ${formattedTime})` : ''}.`
              : `Draft auto-saved locally${formattedTime ? ` at ${formattedTime}` : ''}.`)}
        </span>
      </div>
      {onClearDraft && (
        <button
          type="button"
          onClick={onClearDraft}
          className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full px-2.5 font-bold text-ink-600 hover:bg-white hover:text-ink-900"
        >
          <RotateCcw className="h-3 w-3 shrink-0" />
          Start fresh
        </button>
      )}
    </div>
  );
}

export function FormField({
  label,
  optional = false,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (fieldProps: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  htmlFor?: string;
}) {
  const autoId = useId();
  const id = htmlFor || `field-${autoId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-ink-900">
          {label}
        </label>
        {optional && (
          <span className="text-xs font-medium text-ink-400">Optional</span>
        )}
      </div>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="m-0 text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="m-0 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export interface OptionCardItem {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export function OptionCardGroup({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 2,
}: {
  options: readonly OptionCardItem[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  columns?: 1 | 2;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid gap-2.5 ${columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      {options.map(option => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[60px] w-full cursor-pointer items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
              selected
                ? 'border-ink-900 bg-paper ring-2 ring-ink-900/10'
                : 'border-ink-200 bg-white hover:border-ink-400'
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink-900">{option.label}</span>
                {option.badge && (
                  <span className="rounded-full bg-brass-200/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-700">
                    {option.badge}
                  </span>
                )}
              </div>
              {option.description && (
                <p className="mt-1 mb-0 text-xs leading-relaxed text-ink-500">
                  {option.description}
                </p>
              )}
            </div>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-300 bg-white'
              }`}
            >
              {selected && <Check className="h-3 w-3 shrink-0" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ChipMultiSelect({
  options,
  selected,
  onChange,
  ariaLabel = 'Options',
  allowCustom = false,
  customPlaceholder = 'Add another item…',
  maxItems = 25,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  ariaLabel?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  maxItems?: number;
}) {
  const [customInput, setCustomInput] = useState('');

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter(x => x !== item));
    } else if (selected.length < maxItems) {
      onChange([...selected, item]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed) && selected.length < maxItems) {
      onChange([...selected, trimmed]);
    }
    setCustomInput('');
  };

  const allShown = Array.from(new Set([...options, ...selected]));

  return (
    <div className="space-y-3">
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {allShown.map(item => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(item)}
              className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition ${
                active
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-800 hover:border-ink-400 hover:bg-paper/60'
              }`}
            >
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-brass-400" />}
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            maxLength={120}
            placeholder={customPlaceholder}
            className="min-h-[46px] flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900"
          />
          <button
            type="button"
            onClick={addCustom}
            className="secondary-button min-h-[46px] shrink-0 px-4"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export function StepperCounter({
  label,
  hint,
  value,
  min = 0,
  max = 50,
  onChange,
  zeroLabel,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  zeroLabel?: string;
}) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="m-0 text-sm font-bold text-ink-900">{label}</p>
        {hint && <p className="m-0 mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-900 transition hover:border-ink-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4 shrink-0" />
        </button>
        <span
          aria-live="polite"
          className="min-w-[44px] text-center font-mono text-base font-extrabold text-ink-900"
        >
          {value === 0 && zeroLabel ? zeroLabel : value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-900 transition hover:border-ink-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export function StepFooterActions({
  canGoBack,
  onBack,
  isLastStep,
  nextLabel = 'Continue',
  submitLabel = 'Submit',
  busy = false,
  busyLabel = 'Saving…',
  secondaryAction,
}: {
  canGoBack: boolean;
  onBack?: () => void;
  isLastStep: boolean;
  nextLabel?: string;
  submitLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
      <div>
        {canGoBack && onBack && (
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="secondary-button min-h-[48px] px-5"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            Back
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {secondaryAction}
        <button
          type="submit"
          disabled={busy}
          className="primary-button min-h-[48px] px-6"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {busyLabel}
            </>
          ) : isLastStep ? (
            submitLabel
          ) : (
            <>
              {nextLabel}
              <ChevronRight className="h-4 w-4 shrink-0" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Accessible mobile bottom-sheet / desktop right-drawer for focused operational & filter actions.
 */
export function FocusedDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/45 backdrop-blur-sm sm:items-stretch sm:justify-end"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-white shadow-[0_24px_80px_-24px_rgba(9,21,40,0.5)] sm:m-3 sm:h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-24px)] sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-paper/75 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="serif m-0 text-xl font-medium text-ink-900">{title}</h2>
            {subtitle && <p className="m-0 mt-1 text-xs text-ink-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-700 hover:border-ink-500"
          >
            <X className="h-4 w-4 shrink-0" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-y-contain p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export const FIELD_INPUT_CLASS =
  'page-control min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-400 transition focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/15';
