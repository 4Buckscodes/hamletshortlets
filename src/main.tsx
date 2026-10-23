import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/public-sans/wght.css'
import '@fontsource-variable/public-sans/wght-italic.css'
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
