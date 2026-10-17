import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/design-system.css'
import './index.css'
import App from './App.jsx'
import { installAuthFetchGuard } from './utils/installAuthFetchGuard'
import BrandingProvider from './data/BrandingProvider'
import { applyBranding, readCachedBranding } from './data/branding'

installAuthFetchGuard()
// Skin dell'ambiente nota dall'ultima visita, applicata prima del primo render
applyBranding(readCachedBranding())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </StrictMode>,
)
