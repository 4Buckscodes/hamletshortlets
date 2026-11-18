import { THEME_BOOT_SCRIPT } from './theme';

/** Place in <head>. Resolves the theme before first paint. */
export function ThemeScript() {
  return <script id="hamlet-theme-boot" dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />;
}
