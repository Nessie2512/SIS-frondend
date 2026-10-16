import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

/** Uma matrícula pendente do ano em curso e os documentos obrigatórios em falta. */
function pendente() {
  const emFaltaDe = (estudanteId: string) =>
    db.documentos.filter(
      (d) => d.estudanteId === estudanteId && d.obrigatorio && d.estado === 'EM_FALTA',
    )
  const matricula = db.matriculas.find(
    (m) =>
      m.anoLectivoId === 'ano-2026' &&
      m.estado === 'PENDENTE' &&
      emFaltaDe(m.estudanteId).length > 0,
  )!
  return { matricula, emFalta: emFaltaDe(matricula.estudanteId) }
}

describe('Confirmar matrícula', () => {
  it('só confirma com os documentos obrigatórios entregues e diz o que falta', async () => {
    const { matricula, emFalta } = pendente()
    renderizarEm(`/estudantes/${matricula.estudanteId}?separador=documentos`)
    const utilizador = userEvent.setup()
    const cartao = await screen.findByRole('region', { name: /Matrícula/ })
    const botao = within(cartao).getByRole('button', { name: 'Confirmar matrícula' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).toHaveAccessibleDescription(/obrigatório/)
    await utilizador.click(botao)
    expect(db.matriculas.find((m) => m.id === matricula.id)!.estado).toBe('PENDENTE')

    // Entregar o que falta activa o botão
    for (const doc of emFalta) await utilizador.click(screen.getByLabelText(doc.designacao))
    const activo = await within(cartao).findByRole('button', { name: 'Confirmar matrícula' })
    await waitFor(() => expect(activo).not.toHaveAttribute('aria-disabled'))
    await utilizador.click(activo)

    await waitFor(() =>
      expect(db.matriculas.find((m) => m.id === matricula.id)!.estado).toBe('CONFIRMADA'),
    )
    expect(await within(cartao).findByText('Confirmada')).toBeInTheDocument()
    expect(
      db.percurso.some(
        (e) => e.estudanteId === matricula.estudanteId && e.descricao === 'Matrícula confirmada',
      ),
    ).toBe(true)
  })
})
