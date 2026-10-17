import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

const TURMA = 'ano-2026-c7-A'
const daTurma = (disciplinaId: string) =>
  db.atribuicoes.filter((a) => a.turmaId === TURMA && a.disciplinaId === disciplinaId)

async function escolherPrimeiroDisponivel(utilizador: ReturnType<typeof userEvent.setup>) {
  const opcoes = await screen.findAllByRole('option')
  const livre = opcoes.find((o) => o.getAttribute('aria-disabled') !== 'true')!
  await utilizador.click(livre)
}

describe('Docentes da turma', () => {
  it('atribui um docente habilitado a uma disciplina sem docente', async () => {
    db.atribuicoes = db.atribuicoes.filter(
      (a) => !(a.turmaId === TURMA && a.disciplinaId === 'd-mat'),
    )
    renderizarEm(`/turmas?turma=${TURMA}`)
    const utilizador = userEvent.setup()
    const seccao = await screen.findByRole('region', { name: 'Docentes' })
    expect(within(seccao).getByText('1 sem docente')).toBeInTheDocument()

    await utilizador.click(
      within(seccao).getByRole('button', { name: 'Atribuir docente a Matemática' }),
    )
    const form = within(seccao).getByRole('form', { name: 'Atribuir docente a Matemática' })
    await utilizador.click(within(form).getByRole('combobox', { name: /Docente/ }))
    await escolherPrimeiroDisponivel(utilizador)
    await utilizador.click(within(form).getByRole('button', { name: 'Atribuir' }))

    await waitFor(() => expect(daTurma('d-mat')).toHaveLength(1))
    const professor = db.professores.find((p) => p.id === daTurma('d-mat')[0]!.professorId)!
    expect(professor.habilitadas).toContain('d-mat')
    expect(professor.estado).toBe('ACTIVO')
    expect(await within(seccao).findByText(professor.nome)).toBeInTheDocument()
    expect(within(seccao).queryByText(/sem docente/)).toBeNull()
  })

  it('substituir pede data e motivo e guarda a anterior no histórico', async () => {
    renderizarEm(`/turmas?turma=${TURMA}`)
    const utilizador = userEvent.setup()
    const seccao = await screen.findByRole('region', { name: 'Docentes' })
    const anterior = daTurma('d-lp')[0]!
    const nomeAnterior = db.professores.find((p) => p.id === anterior.professorId)!.nome

    await utilizador.click(
      within(seccao).getByRole('button', {
        name: 'Substituir o docente de Língua Portuguesa',
      }),
    )
    const form = within(seccao).getByRole('form', {
      name: 'Substituir o docente de Língua Portuguesa',
    })
    await utilizador.click(within(form).getByRole('combobox', { name: /Novo docente/ }))
    await escolherPrimeiroDisponivel(utilizador)
    await utilizador.click(within(form).getByRole('button', { name: 'Substituir' }))
    expect(
      await within(form).findByText('Diga porque muda de docente (pelo menos 5 caracteres).'),
    ).toBeInTheDocument()

    await utilizador.type(within(form).getByLabelText(/Motivo/), 'Licença de maternidade')
    await utilizador.click(within(form).getByRole('button', { name: 'Substituir' }))
    await waitFor(() => expect(anterior.ate).not.toBeNull())
    expect(anterior.motivo).toBe('Licença de maternidade')
    expect(daTurma('d-lp').filter((a) => a.ate === null)).toHaveLength(1)

    await utilizador.click(
      await within(seccao).findByRole('button', { name: 'Histórico de Língua Portuguesa' }),
    )
    expect(within(seccao).getByText(nomeAnterior)).toBeInTheDocument()
    expect(within(seccao).getByText(/Licença de maternidade/)).toBeInTheDocument()
  })

  it('quem só consulta vê os docentes sem poder mudar', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm(`/turmas?turma=${TURMA}`)
    const seccao = await screen.findByRole('region', { name: 'Docentes' })
    await within(seccao).findAllByText(/h\/semana/)
    expect(within(seccao).queryByRole('button', { name: /^(Atribuir|Substituir)/ })).toBeNull()
  })
})
