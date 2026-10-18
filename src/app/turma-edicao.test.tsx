import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

const turma = (id: string) => db.turmas.find((t) => t.id === id)!

describe('Turma: sala e director de turma no sítio', () => {
  it('guarda a sala ao sair, recusa uma sala ocupada no mesmo turno e mostra o visto', async () => {
    const a = turma('ano-2026-c7-A')
    const vizinha = db.turmas.find(
      (t) => t.id !== a.id && t.anoLectivoId === a.anoLectivoId && t.turno === a.turno && t.sala,
    )!
    renderizarEm(`/turmas?turma=${a.id}`)
    const utilizador = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª A' })
    await utilizador.click(
      await within(painel).findByRole('button', { name: `Editar Sala: ${a.sala}` }),
    )
    const campo = within(painel).getByLabelText('Sala')
    await utilizador.clear(campo)
    await utilizador.type(campo, `${vizinha.sala}{Enter}`)
    expect(
      await within(painel).findByText(
        `A ${vizinha.sala} já é da ${vizinha.designacao} no mesmo turno.`,
      ),
    ).toBeInTheDocument()
    // O campo volta aberto com o que se escreveu
    expect(within(painel).getByLabelText('Sala')).toHaveValue(vizinha.sala)

    await utilizador.clear(within(painel).getByLabelText('Sala'))
    await utilizador.type(within(painel).getByLabelText('Sala'), 'Laboratório 2')
    await utilizador.tab()
    expect(
      await within(painel).findByRole('button', { name: 'Editar Sala: Laboratório 2' }),
    ).toBeInTheDocument()
    expect(await within(painel).findByText('Guardado')).toBeInTheDocument()
    await waitFor(() => expect(turma(a.id).sala).toBe('Laboratório 2'))
  })

  it('escolhe o director de turma numa lista e não deixa o mesmo professor dirigir duas', async () => {
    const professor = db.professores.find((p) => p.estado === 'ACTIVO')!
    turma('ano-2026-c7-B').directorTurmaId = professor.id
    renderizarEm('/turmas?turma=ano-2026-c7-A')
    const utilizador = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª A' })
    await utilizador.click(
      await within(painel).findByRole('button', {
        name: 'Editar Director de turma: Acrescentar',
      }),
    )
    await utilizador.click(await screen.findByRole('option', { name: new RegExp(professor.nome) }))
    expect(
      await within(painel).findByText(`${professor.nome} já é director de turma da 7.ª B.`),
    ).toBeInTheDocument()
    await utilizador.keyboard('{Escape}')

    const outro = db.professores.find((p) => p.estado === 'ACTIVO' && p.id !== professor.id)!
    await utilizador.click(
      await within(painel).findByRole('button', {
        name: 'Editar Director de turma: Acrescentar',
      }),
    )
    await utilizador.click(await screen.findByRole('option', { name: new RegExp(outro.nome) }))
    expect(
      await within(painel).findByRole('button', {
        name: `Editar Director de turma: ${outro.nome}`,
      }),
    ).toBeInTheDocument()
    await waitFor(() => expect(turma('ano-2026-c7-A').directorTurmaId).toBe(outro.id))

    // Retirar é uma opção da lista
    await utilizador.click(
      within(painel).getByRole('button', { name: `Editar Director de turma: ${outro.nome}` }),
    )
    await utilizador.click(await screen.findByRole('option', { name: 'Sem director de turma' }))
    await waitFor(() => expect(turma('ano-2026-c7-A').directorTurmaId).toBeNull())
  })

  it('quando outra pessoa mudou a sala, mostra o valor actual e deixa escolher', async () => {
    renderizarEm('/turmas?turma=ano-2026-c7-A')
    const utilizador = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª A' })
    const botao = await within(painel).findByRole('button', { name: /^Editar Sala:/ })
    // Entretanto, alguém mudou a sala no servidor
    const a = turma('ano-2026-c7-A')
    a.sala = 'Sala 77'
    a.versao = (a.versao ?? 1) + 1
    await utilizador.click(botao)
    await utilizador.clear(within(painel).getByLabelText('Sala'))
    await utilizador.type(within(painel).getByLabelText('Sala'), 'Sala 88{Enter}')
    const dialogo = await screen.findByRole('dialog', { name: 'Outra pessoa alterou este dado' })
    expect(within(dialogo).getByText('Sala 77')).toBeInTheDocument()
    expect(within(dialogo).getByText('Sala 88')).toBeInTheDocument()
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Guardar o meu' }))
    await waitFor(() => expect(turma('ano-2026-c7-A').sala).toBe('Sala 88'))
  })

  it('quem só consulta vê a sala e o director, sem os editar', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/turmas?turma=ano-2026-c7-A')
    const painel = await screen.findByRole('dialog', { name: '7.ª A' })
    expect(await within(painel).findByText('Director de turma')).toBeInTheDocument()
    expect(within(painel).queryByRole('button', { name: /^Editar Sala/ })).not.toBeInTheDocument()
  })
})
