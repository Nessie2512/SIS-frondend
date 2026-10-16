import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ErroDeRota, RegiaoAnuncios } from '@/shared/ui'

export interface ContextoRouter {
  queryClient: QueryClient
}

/** Raiz: só o que é comum ao ecrã de entrada e à aplicação. */
export const Route = createRootRouteWithContext<ContextoRouter>()({
  component: () => (
    <>
      <Outlet />
      <RegiaoAnuncios />
    </>
  ),
  errorComponent: ErroDeRota,
})
