import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/montserrat/wght.css'
import '@fontsource-variable/lora/wght.css'
import './index.css'
import App from './App'
import { registerServiceWorker } from './pwa'
import { applyTheme, useSettings } from './store/settingsStore'

applyTheme(useSettings.getState().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD) registerServiceWorker()
