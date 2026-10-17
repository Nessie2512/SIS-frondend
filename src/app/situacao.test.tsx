import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

function estudanteEmTurma() {
  const m = db.matriculas.find(
    (x) =>
      x.anoLectivoId === 'ano-2026' && x.estado === 'CONFIRMADA' && x.turmaId === 'ano-2026-c8-A',
  )!
  return { m, e: db.estudantes.find((x) => x.id === m.estudanteId)! }
}

describe('Anular matrícula e situação do estudante', () => {
  it('anular a matrícula diz o efeito, pede o motivo e liberta o lugar', async () => {
    const { m, e } = estudanteEmTurma()
    renderizarEm(`/estudantes/${e.id}?separador=documentos`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Anular matrícula' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Anular a matrícula' })
    expect(dialogo).toHaveAccessibleDescription(
      `Anula a matrícula de ${e.nome} (8.ª classe · 8.ª A). O lugar na turma fica livre. Não pode ser desfeito.`,
    )
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Anular a matrícula' }))
    expect(
      await within(dialogo).findByText('Explique porque anula (pelo menos 10 caracteres).'),
    ).toBeInTheDocument()
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Matrícula feita em duplicado')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Anular a matrícula' }))
    await waitFor(() => expect(m.estado).toBe('ANULADA'))
    expect(m.turmaId).toBeNull()
    expect(
      db.percurso.find(
        (p) => p.estudanteId === e.id && p.descricao === 'Matrícula anulada na 8.ª classe',
      )?.motivo,
    ).toBe('Matrícula feita em duplicado')
  })

  it('desistência, reingresso e nova matrícula no mesmo processo', async () => {
    const { m, e } = estudanteEmTurma()
    const totalEstudantes = db.estudantes.length
    renderizarEm(`/estudantes/${e.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Situação' }))
    expect(screen.queryByRole('menuitem', { name: /Registar reingresso/ })).toBeNull()
    await utilizador.click(screen.getByRole('menuitem', { name: /Registar desistência/ }))
    let dialogo = await screen.findByRole('dialog', { name: `Registar a desistência de ${e.nome}` })
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Mudou-se para o estrangeiro')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Registar desistência' }))
    await waitFor(() => expect(e.estado).toBe('DESISTENTE'))
    expect(m.estado).toBe('ANULADA')

    await utilizador.click(await screen.findByRole('button', { name: 'Situação' }))
    await utilizador.click(await screen.findByRole('menuitem', { name: /Registar reingresso/ }))
    dialogo = await screen.findByRole('dialog', { name: `Registar o reingresso de ${e.nome}` })
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Voltou a residir em Luanda')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Registar reingresso' }))
    await waitFor(() => expect(e.estado).toBe('ACTIVO'))

    await utilizador.click(await screen.findByRole('button', { name: 'Matricular neste ano' }))
    const folha = await screen.findByRole('dialog', { name: 'Matricular em 2026/2027' })
    await utilizador.click(within(folha).getByRole('combobox', { name: /Classe/ }))
    await utilizador.click(await screen.findByRole('option', { name: /8\.ª classe/ }))
    await utilizador.click(within(folha).getByRole('button', { name: 'Matricular' }))
    await waitFor(() =>
      expect(
        db.matriculas.filter((x) => x.estudanteId === e.id && x.estado !== 'ANULADA'),
      ).toHaveLength(1),
    )
    expect(db.estudantes).toHaveLength(totalEstudantes) // o mesmo processo, sem duplicar a pessoa
    const tipos = db.percurso.filter((p) => p.estudanteId === e.id && p.tipo === 'SITUACAO')
    expect(tipos.map((p) => p.descricao)).toEqual(['Desistência', 'Reingresso'])
  })

  it('anular o processo só existe para activos e não tem volta', async () => {
    const { e } = estudanteEmTurma()
    renderizarEm(`/estudantes/${e.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Situação' }))
    await utilizador.click(screen.getByRole('menuitem', { name: /Anular o processo/ }))
    const dialogo = await screen.findByRole('dialog', { name: `Anular o processo de ${e.nome}` })
    expect(dialogo).toHaveAccessibleDescription(/Não pode ser desfeito\./)
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Processo aberto por engano')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Anular o processo' }))
    await waitFor(() => expect(e.estado).toBe('ANULADO'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Situação' })).toBeNull())
  })
})
