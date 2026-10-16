import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { Providers } from '@/app/providers'
import { criarQueryClient } from '@/app/query-client'
import { routeTree } from '@/app/routeTree.gen'

/** Monta a aplicação inteira num URL, com API simulada (MSW) e router em memória. */
export function renderizarEm(url: string) {
  const queryClient = criarQueryClient()
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  const resultado = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, queryClient, ...resultado }
}
