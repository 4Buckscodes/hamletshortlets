// Tailwind is processed by @tailwindcss/vite for the legacy Vite app.
// The new App Router screens currently use the hand-authored global CSS below
// and do not require a PostCSS plugin. This avoids loading an uninstalled
// PostCSS plugin during the legacy deployment transition.
const config = { plugins: {} };
export default config;
