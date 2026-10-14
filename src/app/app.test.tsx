import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { criarQueryClient } from './query-client'
import { routeTree } from './routeTree.gen'

function renderizarEm(url: string) {
  const queryClient = criarQueryClient()
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('Turmas (com API simulada)', () => {
  it('lista as turmas activas do ano em curso', async () => {
    renderizarEm('/turmas')
    expect(await screen.findByRole('heading', { name: 'Turmas' })).toBeInTheDocument()
    expect(await screen.findByText('7.ª A')).toBeInTheDocument()
    expect(screen.getAllByRole('meter').length).toBeGreaterThan(0)
  })

  it('volta ao padrão quando o URL traz um filtro inválido', async () => {
    const router = renderizarEm('/turmas?estado=XPTO&page=-3')
    expect(await screen.findByText('7.ª A')).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ estado: 'ACTIVA', page: 1 })
  })
})
