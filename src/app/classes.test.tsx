import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { classes } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Ciclos e classes', () => {
  it('mostra a sequência e o uso; em uso só se inactiva, com Desfazer', async () => {
    renderizarEm('/curriculo/classes')
    const utilizador = userEvent.setup()
    const ciclo1 = await screen.findByRole('region', { name: 'I ciclo do ensino secundário' })
    expect(within(ciclo1).getByText(/A seguir: 8\.ª classe/)).toBeInTheDocument()
    const ciclo2 = screen.getByRole('region', { name: 'II ciclo do ensino secundário' })
    expect(within(ciclo2).getByText(/Última classe da escola/)).toBeInTheDocument()
    expect(within(ciclo2).queryByRole('button', { name: 'Eliminar 10.ª classe' })).toBeNull()

    const inactivar = within(ciclo2).getByRole('button', { name: 'Inactivar 10.ª classe' })
    expect(inactivar).toHaveAccessibleDescription(
      'Está em uso: mantém turmas, matrículas e planos; só deixa de ser oferecida.',
    )
    await utilizador.click(inactivar)
    await waitFor(() => expect(classes.find((c) => c.id === 'c10')!.estado).toBe('INACTIVA'))
    expect(await within(ciclo2).findByText('Inactiva')).toBeInTheDocument()
  })

  it('cria uma classe no fim do ciclo, sem uso pode eliminar-se', async () => {
    renderizarEm('/curriculo/classes')
    const utilizador = userEvent.setup()
    const ciclo2 = await screen.findByRole('region', { name: 'II ciclo do ensino secundário' })
    await utilizador.click(
      within(ciclo2).getByRole('button', { name: 'Nova classe em II ciclo do ensino secundário' }),
    )
    const folha = await screen.findByRole('dialog', { name: 'Nova classe' })
    await utilizador.type(within(folha).getByLabelText(/Designação/), '11.ª classe')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar classe' }))

    expect(await within(ciclo2).findByText(/A seguir: 11\.ª classe/)).toBeInTheDocument()
    expect(within(ciclo2).getByText(/Ainda sem uso/)).toBeInTheDocument()
    expect(classes.find((c) => c.designacao === '11.ª classe')!.ordem).toBe(11)

    await utilizador.click(within(ciclo2).getByRole('button', { name: 'Eliminar 11.ª classe' }))
    await waitFor(() => expect(classes.some((c) => c.designacao === '11.ª classe')).toBe(false))
  })

  it('uma classe inactiva deixa de ser oferecida para turmas novas', async () => {
    classes.find((c) => c.id === 'c10')!.estado = 'INACTIVA'
    renderizarEm('/turmas')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Nova turma' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova turma' })
    await utilizador.click(within(folha).getByRole('combobox', { name: /Classe/ }))
    expect(await screen.findByRole('option', { name: '9.ª classe' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '10.ª classe' })).toBeNull()
  })
})
