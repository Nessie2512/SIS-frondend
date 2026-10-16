import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { sincronizarPreferencias } from './shared/lib/preferencias'
import './shared/styles/tokens.css'

// Modo mock: `pnpm dev:mock`, ou a build dos testes ponta a ponta (`vite build --mode mock`).
// Constante em tempo de compilação: na build de produção normal o MSW nem entra no pacote.
const MODO_SIMULADO = import.meta.env.MODE === 'mock'

async function prepararApiSimulada() {
  // Enquanto não há backend/OpenAPI: `pnpm dev:mock` (ou VITE_API_MOCK=true em .env.local)
  const simulada =
    MODO_SIMULADO || (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true')
  if (simulada) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass', quiet: import.meta.env.PROD })
  }
}

sincronizarPreferencias()

void prepararApiSimulada().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Na build simulada não há service worker da PWA: ocuparia o lugar do worker do MSW
  if (import.meta.env.PROD && !MODO_SIMULADO) {
    // Fora do JavaScript inicial: só depois da primeira pintura
    void import('./app/observabilidade').then((m) => m.iniciarObservabilidade())
    void import('./app/pwa').then((m) => m.registarServiceWorker())
  }
})
