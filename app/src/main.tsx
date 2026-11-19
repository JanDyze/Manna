import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/caveat'
import '@fontsource-variable/outfit'
import './index.css'
import './icons.css'
import './icons-more.css'
import App from './App'
import { applyTheme, getThemePref } from './lib/theme'
import { watchKeyboard } from './lib/keyboard'
import { feelLikeAnApp } from './lib/appfeel'

applyTheme(getThemePref())
watchKeyboard()
feelLikeAnApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support and "Add to Home Screen" (public/sw.js). Not in dev, where it would cache stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
