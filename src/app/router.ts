import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { TEMPOS } from '@/shared/config/constantes'
import { routeTree } from './routeTree.gen'

/** Parâmetros do URL que abrem um painel lateral de resumo (guia 6.3) */
const PAINEIS = ['estudante', 'professor', 'turma']

interface MudancaDeLocal {
  fromLocation?: { search: unknown }
  toLocation: { search: unknown }
  pathChanged: boolean
}

/** Tipo da View Transition de uma navegação, ou false para mudar sem animação. */
export function tipoDeTransicao({ fromLocation, toLocation, pathChanged }: MudancaDeLocal) {
  if (!fromLocation) return false
  if (pathChanged) return ['ecra']
  const de = fromLocation.search as Record<string, unknown>
  const para = toLocation.search as Record<string, unknown>
  return PAINEIS.some((p) => de[p] !== para[p]) ? ['painel'] : false
}

export function criarRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent', // pré-carregamento em hover/foco (guia 4.6)
    defaultPreloadStaleTime: 0, // o TanStack Query decide a frescura
    defaultPendingMs: TEMPOS.esqueletoAtraso,
    defaultPendingMinMs: TEMPOS.esqueletoMinimo,
    scrollRestoration: true,
    // Continuidade entre ecrãs (guia 5.6): só ao mudar de ecrã ou abrir/fechar um painel; filtros,
    // pesquisa e páginas mudam sem animação. Sem suporte no navegador, muda sem animação
    defaultViewTransition: { types: tipoDeTransicao },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof criarRouter>
  }
}
