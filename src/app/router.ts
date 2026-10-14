import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { TEMPOS } from '@/shared/config/constantes'
import { routeTree } from './routeTree.gen'

export function criarRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent', // pré-carregamento em hover/foco (guia 4.6)
    defaultPreloadStaleTime: 0, // o TanStack Query decide a frescura
    defaultPendingMs: TEMPOS.esqueletoAtraso,
    defaultPendingMinMs: TEMPOS.esqueletoMinimo,
    scrollRestoration: true,
    defaultViewTransition: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof criarRouter>
  }
}
