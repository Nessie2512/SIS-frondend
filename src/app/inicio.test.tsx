import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Início', () => {
  it('mostra os indicadores do ano e cada um abre o ecrã filtrado', async () => {
    const pendentes = db.matriculas.filter(
      (m) => m.anoLectivoId === 'ano-2026' && m.estado === 'PENDENTE',
    ).length
    const { router } = renderizarEm('/')
    const cartao = await screen.findByRole('link', { name: /Matrículas a confirmar/ })
    expect(within(cartao).getByText(String(pendentes))).toBeInTheDocument()

    await userEvent.setup().click(cartao)
    await waitFor(() => expect(router.state.location.pathname).toBe('/matriculas'))
    expect(router.state.location.search).toMatchObject({ estado: 'PENDENTE' })
  })
})
