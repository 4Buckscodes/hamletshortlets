import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import './index.css'
import App from './App.tsx'
import { normalizeDirectPathnameToHash } from './lib/authRedirect.ts'

if (typeof window !== 'undefined') {
  const normalizedHashUrl = normalizeDirectPathnameToHash(
    window.location.pathname,
    window.location.search,
    window.location.hash,
  );
  if (normalizedHashUrl) {
    window.history.replaceState(null, '', normalizedHashUrl);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
