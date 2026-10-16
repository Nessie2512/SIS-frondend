import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

const emFalta = (estudanteId: string) =>
  db.documentos.filter(
    (d) => d.estudanteId === estudanteId && d.obrigatorio && d.estado === 'EM_FALTA',
  ).length

describe('Confirmar matrículas em lote', () => {
  it('pré-visualiza o efeito e confirma só as que podem', async () => {
    renderizarEm('/matriculas?estado=PENDENTE')
    const utilizador = userEvent.setup()
    await screen.findAllByRole('checkbox', { name: /^Seleccionar (?!todas)/ })

    // Uma com documentos completos e outra com falta, entre as linhas visíveis
    const visiveis = db.matriculas.filter(
      (m) =>
        m.anoLectivoId === 'ano-2026' &&
        m.estado === 'PENDENTE' &&
        screen.queryByRole('checkbox', {
          name: `Seleccionar ${db.estudantes.find((e) => e.id === m.estudanteId)!.nome}`,
        }),
    )
    const completa = visiveis.find((m) => emFalta(m.estudanteId) === 0)!
    const incompleta = visiveis.find((m) => emFalta(m.estudanteId) > 0)!
    const nome = (id: string) => db.estudantes.find((e) => e.id === id)!.nome

    await utilizador.click(
      screen.getByRole('checkbox', { name: `Seleccionar ${nome(completa.estudanteId)}` }),
    )
    await utilizador.click(
      screen.getByRole('checkbox', { name: `Seleccionar ${nome(incompleta.estudanteId)}` }),
    )
    const barra = screen.getByRole('toolbar', { name: 'Acções em lote' })
    expect(within(barra).getByText('2 seleccionados')).toBeInTheDocument()

    await utilizador.click(within(barra).getByRole('button', { name: 'Confirmar…' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar matrículas' })
    expect(within(dialogo).getByText('1 matrícula fica confirmada.')).toBeInTheDocument()
    expect(within(dialogo).getByText(nome(incompleta.estudanteId))).toBeInTheDocument()
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Confirmar 1 matrícula' }))

    await waitFor(() =>
      expect(db.matriculas.find((m) => m.id === completa.id)!.estado).toBe('CONFIRMADA'),
    )
    expect(db.matriculas.find((m) => m.id === incompleta.id)!.estado).toBe('PENDENTE')
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Acções em lote' })).toBeNull(),
    )
  })
})
