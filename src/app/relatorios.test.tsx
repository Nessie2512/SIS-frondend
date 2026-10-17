import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Relatórios', () => {
  it('gera um relatório, acompanha-o no quadro de tarefas e lista-o nas exportações', async () => {
    renderizarEm('/relatorios')
    const utilizador = userEvent.setup()
    const catalogo = await screen.findByRole('list', { name: 'Relatórios disponíveis' })
    expect(within(catalogo).getAllByRole('listitem')).toHaveLength(6)
    expect(
      await screen.findByText('Ainda não pediu nenhum relatório neste ano.'),
    ).toBeInTheDocument()

    await utilizador.click(screen.getByRole('button', { name: 'Gerar: Ocupação das turmas' }))
    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    expect(await within(quadro).findByText('Ocupação das turmas')).toBeInTheDocument()

    const exportacoes = await screen.findByRole('table', { name: 'Exportações recentes' })
    expect(
      await within(exportacoes).findByRole('link', { name: 'Descarregar: Ocupação das turmas' }),
    ).toHaveAttribute('href', expect.stringMatching(/\/tarefas\/.+\/resultado$/))
  })

  it('o parâmetro obrigatório é pedido antes de gerar', async () => {
    renderizarEm('/relatorios')
    const utilizador = userEvent.setup()
    const cartao = await screen.findByRole('article', { name: 'Lista nominal da turma' })
    await utilizador.click(
      within(cartao).getByRole('button', { name: 'Gerar: Lista nominal da turma' }),
    )
    expect(await within(cartao).findByText('Escolha a turma.')).toBeInTheDocument()
    expect(db.tarefas).toHaveLength(0)

    await utilizador.click(within(cartao).getByRole('combobox', { name: /Turma/ }))
    await utilizador.click(await screen.findByRole('option', { name: '7.ª A' }))
    await utilizador.click(
      within(cartao).getByRole('button', { name: 'Gerar: Lista nominal da turma' }),
    )
    await waitFor(() => expect(db.tarefas[0]?.parametros.turmaId).toBe('ano-2026-c7-A'))
  })
})
