import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/node'
import '@/shared/i18n'

// Máquinas mais lentas (ou o primeiro teste, a frio) passam de 1 s a montar o router e as queries
configure({ asyncUtilTimeout: 5000 })

// jsdom não implementa scrollTo (usado pela restauração de scroll do router)
window.scrollTo = () => {}

// jsdom não implementa matchMedia; os testes controlam o tema do sistema por aqui
let sistemaEscuro = false
export function simularSistemaEscuro(valor: boolean) {
  sistemaEscuro = valor
}
window.matchMedia = (query: string) =>
  ({
    matches: query.includes('dark') ? sistemaEscuro : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
