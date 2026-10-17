import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

const TURMA = 'ano-2026-c7-A'
const confirmadas = () =>
  db.matriculas.filter((m) => m.turmaId === TURMA && m.estado === 'CONFIRMADA')

describe('Resultados finais da turma', () => {
  it('marca os em falta como aprovados, ajusta um e guarda tudo de uma vez', async () => {
    renderizarEm(`/turmas/${TURMA}/resultados`)
    const utilizador = userEvent.setup()
    const tabela = await screen.findByRole('table', { name: 'Resultados finais da turma 7.ª A' })
    const n = confirmadas().length
    expect(within(tabela).getAllByRole('row')).toHaveLength(n + 1)
    expect(screen.getByText(`0 de ${n} registados`)).toBeInTheDocument()

    await utilizador.click(
      screen.getByRole('button', { name: `Marcar os ${n} em falta como aprovados` }),
    )
    const primeiro = db.estudantes.find((e) => e.id === confirmadas()[0]!.estudanteId)!
    const grupo = screen.getByRole('radiogroup', { name: `Resultado de ${primeiro.nome}` })
    await utilizador.click(within(grupo).getByRole('radio', { name: 'Reprovado' }))
    expect(screen.getByText(new RegExp(`${n} por guardar`))).toBeInTheDocument()
    // Nada é gravado antes de Guardar
    expect(confirmadas().every((m) => m.resultado === null)).toBe(true)

    await utilizador.click(screen.getByRole('button', { name: 'Guardar resultados' }))
    await waitFor(() => expect(confirmadas().every((m) => m.resultado !== null)).toBe(true))
    expect(confirmadas().find((m) => m.estudanteId === primeiro.id)!.resultado).toBe('REPROVADO')
    expect(await screen.findByText(`${n} de ${n} registados`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar resultados' })).toBeDisabled()
  })
})
