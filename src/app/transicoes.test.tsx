import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEm } from '@/test/renderizar'
import { tipoDeTransicao } from './router'

const local = (search: Record<string, unknown>) => ({ search })

describe('View Transitions', () => {
  it('anima a mudança de ecrã e a abertura de painéis, não os filtros nem as páginas', () => {
    expect(tipoDeTransicao({ toLocation: local({}), pathChanged: true })).toBe(false)
    expect(
      tipoDeTransicao({ fromLocation: local({}), toLocation: local({}), pathChanged: true }),
    ).toEqual(['ecra'])
    expect(
      tipoDeTransicao({
        fromLocation: local({ page: 1 }),
        toLocation: local({ page: 1, estudante: 'e1' }),
        pathChanged: false,
      }),
    ).toEqual(['painel'])
    expect(
      tipoDeTransicao({
        fromLocation: local({ page: 1, q: 'ana' }),
        toLocation: local({ page: 2, q: 'ana', classeId: 'c7' }),
        pathChanged: false,
      }),
    ).toBe(false)
  })

  it('a linha aberta e o painel partilham o nome «ficha», um de cada vez', async () => {
    renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    const tabela = await screen
      .findByRole('grid', { name: 'Estudantes' })
      .catch(() => screen.findByRole('table', { name: 'Estudantes' }))
    const linha = (await within(tabela).findAllByRole('row'))[1]!
    await utilizador.click(within(linha).getAllByRole('cell')[1]!)

    const painel = await screen.findByRole('dialog')
    expect(painel.style.viewTransitionName).toBe('ficha')
    expect(linha.style.viewTransitionName).toBe('')

    // Fechado o painel, a linha não volta a ter o nome (o painel ainda o tem ao sair)
    await utilizador.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(linha.style.viewTransitionName).toBe(''), { timeout: 2_000 })
  })
})
