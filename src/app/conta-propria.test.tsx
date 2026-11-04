import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { renderizarEm } from '@/test/renderizar'
import { handlersSis } from '@/test/sis'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

async function abrir() {
  renderizarEm('/definicoes')
  await userEvent.click(await screen.findByRole('button', { name: 'Alterar palavra-passe' }))
}

describe('Definições: a própria conta no backend SIS', () => {
  it('PATCH /users/{uuid} (o uuid de /auth/me) só com a palavra-passe nova', async () => {
    const pedidos = escutarEscritas()
    await abrir()
    await userEvent.type(screen.getByLabelText(/Nova palavra-passe/), 'uma-frase-longa-1')
    await userEvent.type(screen.getByLabelText(/Repita a palavra-passe/), 'uma-frase-longa-1')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() =>
      expect(pedidos).toEqual([
        { metodo: 'PATCH', caminho: '/users/u-1', corpo: { password: 'uma-frase-longa-1' } },
      ]),
    )
  })

  it('curta ou diferente: não envia e diz porquê', async () => {
    const pedidos = escutarEscritas()
    await abrir()
    await userEvent.type(screen.getByLabelText(/Nova palavra-passe/), 'curta')
    await userEvent.type(screen.getByLabelText(/Repita a palavra-passe/), 'outra')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('A palavra-passe tem de 12 a 128 caracteres.')).toBeVisible()
    expect(screen.getByText('As duas palavras-passe não são iguais.')).toBeVisible()
    expect(pedidos).toEqual([])
  })

  it('sem gerir contas, o chefe da secretaria não vê a área de utilizadores', async () => {
    renderizarEm('/definicoes')
    const nav = await screen.findByRole('navigation', { name: 'Secções das definições' })
    expect(nav).not.toHaveTextContent('Utilizadores')
  })
})
