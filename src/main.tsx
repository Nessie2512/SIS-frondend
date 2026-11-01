import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/app'
import { prepararCache } from './app/instancias'
import { activarLingua } from './shared/i18n'
import { sincronizarPreferencias } from './shared/lib/preferencias'
import './shared/styles/tokens.css'

// MSW só é iniciado na build dedicada aos testes ponta a ponta (`vite build --mode mock`).
const MODO_SIMULADO = import.meta.env.MODE === 'mock'

async function prepararApiSimulada() {
  if (MODO_SIMULADO) {
    const { worker } = await import('./mocks/browser')
    // Os pedidos que não são cobertos pelas fixtures seguem para a rede.
    await worker.start({ onUnhandledFrame: 'bypass', quiet: import.meta.env.PROD })
    manterSimulacaoActiva()
  }
}

/**
 * O navegador pode parar o service worker do MSW (separador em segundo plano, poupança de
 * energia). Ao arrancar de novo, o worker esquece que esta página usa a simulação e deixa os
 * pedidos seguirem para o servidor real sem passar pelo MSW.
 * Voltar a registar a página quando fica visível, ganha foco, a cada gesto (antes do pedido
 * que o gesto provoca) e a cada 2 s resolve isso nos testes de navegador.
 */
function manterSimulacaoActiva() {
  const reactivar = () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.controller?.postMessage('MOCK_ACTIVATE')
    }
  }
  document.addEventListener('visibilitychange', reactivar)
  window.addEventListener('focus', reactivar)
  document.addEventListener('pointerdown', reactivar, { capture: true, passive: true })
  document.addEventListener('keydown', reactivar, { capture: true, passive: true })
  setInterval(reactivar, 2_000)
}

sincronizarPreferencias()

// O catálogo de mensagens, o MSW de testes e a cache em disco preparam-se em paralelo
void Promise.all([activarLingua(), prepararApiSimulada(), prepararCache()]).then(() => {
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
