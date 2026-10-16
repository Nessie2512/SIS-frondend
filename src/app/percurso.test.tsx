import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

const comPercurso = () => {
  const evento = db.percurso.find((p) => p.tipo === 'INSCRICAO')!
  return { estudanteId: evento.estudanteId, evento }
}

describe('Percurso do estudante', () => {
  it('rectificar cria um registo novo ligado ao original, que se mantém', async () => {
    const { estudanteId, evento } = comPercurso()
    renderizarEm(`/estudantes/${estudanteId}?separador=percurso`)
    const utilizador = userEvent.setup()
    await utilizador.click(
      await screen.findByRole('button', { name: `Rectificar: ${evento.descricao}` }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Rectificar o registo' })
    const motivo = within(dialogo).getByLabelText(/Motivo/)
    await utilizador.type(motivo, 'curto')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Registar rectificação' }))
    expect(
      await within(dialogo).findByText('Explique o motivo (pelo menos 10 caracteres).'),
    ).toBeInTheDocument()

    const correcto = within(dialogo).getByLabelText(/Registo correcto/)
    await utilizador.clear(correcto)
    await utilizador.type(correcto, 'Inscrito na turma 7.ª C')
    await utilizador.clear(motivo)
    await utilizador.type(motivo, 'Turma registada por engano')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Registar rectificação' }))

    expect(await screen.findByText('Inscrito na turma 7.ª C')).toBeInTheDocument()
    expect(screen.getByText(evento.descricao)).toBeInTheDocument()
    expect(screen.getByText('Rectificada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a rectificação' })).toBeInTheDocument()
    expect(screen.getByText(/Motivo: Turma registada por engano/)).toBeInTheDocument()
    await waitFor(() =>
      expect(db.percurso.find((p) => p.rectificaId === evento.id)?.motivo).toBe(
        'Turma registada por engano',
      ),
    )
    // O original não mudou
    expect(db.percurso.find((p) => p.id === evento.id)?.descricao).toBe(evento.descricao)
  })

  it('sem permissão de escrita não há Rectificar', async () => {
    sessao.definirToken('tk-u2')
    const { estudanteId, evento } = comPercurso()
    renderizarEm(`/estudantes/${estudanteId}?separador=percurso`)
    expect(await screen.findByText(evento.descricao)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Rectificar/ })).toBeNull()
  })
})
