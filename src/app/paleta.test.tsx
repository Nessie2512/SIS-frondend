import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Paleta de comandos', () => {
  it('encontra um estudante pelo número de processo e abre a ficha', async () => {
    const alvo = db.estudantes[5]!
    const { router } = renderizarEm('/')
    const utilizador = userEvent.setup()
    await screen.findByRole('heading', { level: 1 })
    await utilizador.keyboard('{Control>}k{/Control}')
    await utilizador.type(await screen.findByRole('combobox'), alvo.numeroProcesso)

    await utilizador.click(await screen.findByRole('option', { name: new RegExp(alvo.nome) }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/estudantes/${alvo.id}`))
  })
})
