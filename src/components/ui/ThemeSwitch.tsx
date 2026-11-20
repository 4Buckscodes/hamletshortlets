'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { cx } from './cx';
import { THEME_CHOICES, THEME_STORAGE_KEY, isThemeChoice, resolveTheme, type ThemeChoice } from './theme';

const LABELS: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const CHANGE_EVENT = 'hamlet-theme-change';

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(choice, window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.themeChoice = choice;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function readChoice(): ThemeChoice {
  const saved = document.documentElement.dataset.themeChoice;
  return isThemeChoice(saved) ? saved : 'system';
}

/** System / Light / Dark switch. "System" follows the device and updates live when it changes. */
export function ThemeSwitch({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'system' as ThemeChoice);

  useEffect(() => {
    if (choice !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [choice]);

  const select = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this page view.
    }
    apply(next);
  }, []);

  return (
    <div role="radiogroup" aria-label="Appearance" className={cx('hm-theme-switch', className)}>
      {THEME_CHOICES.map(option => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={choice === option}
          tabIndex={choice === option ? 0 : -1}
          onClick={() => select(option)}
          onKeyDown={event => {
            // Radio-group keyboard pattern: arrows move and select, one Tab stop for the group.
            const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            const index = THEME_CHOICES.indexOf(option);
            const next = THEME_CHOICES[(index + step + THEME_CHOICES.length) % THEME_CHOICES.length];
            select(next);
            const group = event.currentTarget.parentElement;
            (group?.children[THEME_CHOICES.indexOf(next)] as HTMLElement | undefined)?.focus();
          }}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
