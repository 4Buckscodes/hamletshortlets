export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hamlet-theme';
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** Browser bar colours: page colour in light and dark. */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f4f3ef', dark: '#121816' };

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return prefersDark ? 'dark' : 'light';
  return choice;
}

/**
 * Inline script run before first paint: follows the device setting automatically (no manual switch) and updates live on
 * html[data-theme] and html[data-theme-choice] so a dark-mode visitor never sees a light flash.
 * Kept dependency-free and wrapped in try/catch so private browsing or blocked storage is harmless.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var r=document.documentElement;function a(){r.dataset.theme=m.matches?'dark':'light';r.dataset.themeChoice='system';}a();if(m.addEventListener)m.addEventListener('change',a);}catch(e){}})();`;
