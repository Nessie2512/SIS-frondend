import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import './shared/styles/tokens.css'

async function prepararApiSimulada() {
  // Enquanto não há backend/OpenAPI: `pnpm dev:mock` (ou VITE_API_MOCK=true em .env.local)
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }
}

void prepararApiSimulada().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
