import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEm } from '@/test/renderizar'

describe('Filtros como etiquetas removíveis', () => {
  it('mostra cada filtro aplicado e retira-o com um clique', async () => {
    const { router } = renderizarEm('/estudantes?q=Ana&classeId=c8&estado=ACTIVO')
    const utilizador = userEvent.setup()
    const lista = await screen.findByRole('list', { name: 'Filtros aplicados' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(3)
    expect(within(lista).getByText('8.ª classe')).toBeInTheDocument()

    await utilizador.click(
      within(lista).getByRole('button', { name: 'Retirar o filtro Classe: 8.ª classe' }),
    )
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('classeId'))
    expect(router.state.location.search).toMatchObject({ q: 'Ana', estado: 'ACTIVO' })

    // Retirar a pesquisa limpa também o campo
    await utilizador.click(screen.getByRole('button', { name: 'Retirar o filtro Pesquisa: Ana' }))
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('q'))
    expect(screen.getByRole('searchbox', { name: 'Pesquisar' })).toHaveValue('')
  })

  it('«Limpar filtros» retira todos de uma vez', async () => {
    const { router } = renderizarEm('/matriculas?classeId=c7&semTurma=true')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ page: 1 }))
    expect(screen.queryByRole('list', { name: 'Filtros aplicados' })).toBeNull()
  })
})
