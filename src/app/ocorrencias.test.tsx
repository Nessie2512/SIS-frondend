import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Ocorrências do estudante', () => {
  it('regista uma ocorrência na folha lateral, com validação', async () => {
    const estudante = db.estudantes[1]!
    renderizarEm(`/estudantes/${estudante.id}?separador=ocorrencias`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Registar ocorrência' }))
    const folha = await screen.findByRole('dialog', { name: 'Registar ocorrência' })

    await utilizador.click(within(folha).getByRole('button', { name: 'Registar' }))
    expect(
      await within(folha).findByText('Descreva o que aconteceu (pelo menos 10 caracteres).'),
    ).toBeInTheDocument()

    await utilizador.click(within(folha).getByRole('radio', { name: 'Saúde' }))
    await utilizador.type(
      within(folha).getByLabelText(/O que aconteceu/),
      'Queixou-se de dores de cabeça; o encarregado veio buscá-lo.',
    )
    await utilizador.click(within(folha).getByRole('button', { name: 'Registar' }))

    expect(await screen.findByText(/Queixou-se de dores de cabeça/)).toBeInTheDocument()
    await waitFor(() =>
      expect(db.ocorrencias.find((o) => o.estudanteId === estudante.id)?.tipo).toBe('SAUDE'),
    )
  })
})
