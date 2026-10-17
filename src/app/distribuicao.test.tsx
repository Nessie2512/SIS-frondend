import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

const semTurmaDa7 = () =>
  db.matriculas.filter((m) => m.classeId === 'c7' && !m.turmaId && m.anoLectivoId === 'ano-2026')
const nomeDe = (estudanteId: string) => db.estudantes.find((e) => e.id === estudanteId)!.nome

describe('Distribuição por turmas', () => {
  it('uma matrícula por confirmar fica no quadro, mas não se arrasta nem se move', async () => {
    const pendente = semTurmaDa7().find((m) => m.estado === 'PENDENTE')!
    const nome = nomeDe(pendente.estudanteId)
    renderizarEm('/turmas/quadro?classeId=c7')
    const coluna = await screen.findByRole('region', { name: 'Sem turma' }, { timeout: 20_000 })
    expect(within(coluna).getByText(nome)).toBeInTheDocument()
    expect(
      within(coluna).getByText('Matrícula por confirmar: confirme-a antes de inscrever.'),
    ).toBeInTheDocument()
    expect(within(coluna).queryByRole('button', { name: `Arrastar ${nome}` })).toBeNull()
    expect(within(coluna).queryByRole('button', { name: `Mover ${nome} para…` })).toBeNull()
  })

  it('simula com o critério, deixa ajustar à mão e inscreve o número exacto', async () => {
    const confirmadas = semTurmaDa7().filter((m) => m.estado === 'CONFIRMADA')
    expect(confirmadas).toHaveLength(2)
    renderizarEm('/turmas/quadro?classeId=c7')
    const utilizador = userEvent.setup()
    await utilizador.click(
      await screen.findByRole(
        'button',
        { name: 'Distribuir automaticamente' },
        { timeout: 20_000 },
      ),
    )
    const folha = await screen.findByRole('dialog', { name: 'Distribuir automaticamente' })
    expect(await within(folha).findByRole('heading', { name: 'Proposta (2)' })).toBeInTheDocument()
    expect(within(folha).getByRole('heading', { name: 'Ficam de fora (1)' })).toBeInTheDocument()
    expect(within(folha).getByText(/matrícula por confirmar/)).toBeInTheDocument()

    // Equilibrar ocupação: as duas vão para a turma com mais vagas (7.ª C)
    const ocupacao = within(folha).getByRole('table', {
      name: 'Ocupação das turmas depois da distribuição',
    })
    const linhaC = within(ocupacao).getByRole('row', { name: /^7\.ª C/ })
    const [agora, depois] = within(linhaC)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(Number(depois!.split(' / ')[0]) - Number(agora!.split(' / ')[0])).toBe(2)

    const segundo = nomeDe(confirmadas[1]!.estudanteId)
    await utilizador.click(within(folha).getByRole('combobox', { name: `Turma de ${segundo}` }))
    await utilizador.click(await screen.findByRole('option', { name: 'Não inscrever agora' }))
    await utilizador.click(within(folha).getByRole('button', { name: 'Inscrever 1 estudante' }))

    await waitFor(() =>
      expect(confirmadas.filter((m) => m.turmaId === 'ano-2026-c7-C')).toHaveLength(1),
    )
    expect(confirmadas.find((m) => nomeDe(m.estudanteId) === segundo)!.turmaId).toBeNull()
    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    expect(
      await within(quadro).findByText('Distribuição por turmas: 1 inscrito'),
    ).toBeInTheDocument()
  })
})
