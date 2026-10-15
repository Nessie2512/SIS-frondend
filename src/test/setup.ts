import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { reporBaseDeDados } from '@/mocks/db'
import { server } from '@/mocks/node'
import { sessao } from '@/shared/api'
import { usePermissoesStore } from '@/shared/lib/permissoes'
import '@/shared/i18n'

// Máquinas mais lentas (ou o primeiro teste, a frio) passam de 1 s a montar o router e as queries
configure({ asyncUtilTimeout: 5000 })

// jsdom não implementa scrollTo (usado pela restauração de scroll do router)
window.scrollTo = () => {}

// jsdom não implementa ResizeObserver (usado pelos primitivos Radix)
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom não implementa scrollIntoView (usado pelo cmdk)
Element.prototype.scrollIntoView ??= function () {}

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

// Cada teste começa com dados iniciais e com a secretária autenticada
beforeEach(() => {
  reporBaseDeDados()
  sessao.definirToken('tk-u1')
  usePermissoesStore.getState().limpar()
})

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
