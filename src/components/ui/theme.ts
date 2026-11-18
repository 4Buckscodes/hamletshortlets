export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hamlet-theme';
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** Browser bar colours: the forest band in light mode, the darker band in dark mode. */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#172119', dark: '#121b16' };

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return prefersDark ? 'dark' : 'light';
  return choice;
}

/**
 * Inline script run before first paint: applies the saved choice (or the device setting) to
 * html[data-theme] and html[data-theme-choice] so a dark-mode visitor never sees a light flash.
 * Kept dependency-free and wrapped in try/catch so private browsing or blocked storage is harmless.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=localStorage.getItem(k);if(c!=='light'&&c!=='dark')c='system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=c==='system'?(d?'dark':'light'):c;var r=document.documentElement;r.dataset.theme=t;r.dataset.themeChoice=c;}catch(e){}})();`;
