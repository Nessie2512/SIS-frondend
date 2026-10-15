import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Providers } from './providers'
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
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
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

  it('Enter abre o painel lateral da turma e o URL regista-o', async () => {
    const router = renderizarEm('/turmas')
    const linha = (await screen.findByText('7.ª A')).closest('tr')!
    linha.focus()
    fireEvent.keyDown(linha, { key: 'Enter' })
    expect(await screen.findByRole('dialog', { name: '7.ª A' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ turma: 'ano-2026-c7-A' })
  })

  it('volta ao padrão quando o URL traz um filtro inválido', async () => {
    const router = renderizarEm('/turmas?estado=XPTO&page=-3')
    expect(await screen.findByText('7.ª A')).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ estado: 'ACTIVA', page: 1 })
  })
})
