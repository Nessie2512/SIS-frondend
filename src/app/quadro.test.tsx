import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { contarInscritos, db } from '@/mocks/db'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

const semTurmaDa7 = () =>
  db.matriculas.find((m) => m.classeId === 'c7' && !m.turmaId && m.anoLectivoId === 'ano-2026')!
const nomeDe = (estudanteId: string) => db.estudantes.find((e) => e.id === estudanteId)!.nome

/** O quadro é o ecrã mais pesado (uma coluna por turma, um cartão por estudante): esperar que monte. */
async function abrirQuadro() {
  const resultado = renderizarEm('/turmas/quadro?classeId=c7')
  await screen.findByRole('region', { name: 'Sem turma' }, { timeout: 20_000 })
  return resultado
}

async function abrirMenu(utilizador: ReturnType<typeof userEvent.setup>, nome: string) {
  await utilizador.click(await screen.findByRole('button', { name: `Mover ${nome} para…` }))
}

describe('Quadro da turma', () => {
  it('inscreve um estudante sem turma pelo menu "Mover para…", de forma optimista, e permite desfazer', async () => {
    const m = semTurmaDa7()
    const nome = nomeDe(m.estudanteId)
    await abrirQuadro()
    const utilizador = userEvent.setup()
    await abrirMenu(utilizador, nome)
    await utilizador.click(await screen.findByRole('menuitem', { name: /^7\.ª C/ }))

    // O cartão assenta logo na turma de destino
    const coluna = screen.getByRole('region', { name: '7.ª C' })
    expect(within(coluna).getByText(nome)).toBeInTheDocument()
    await waitFor(() =>
      expect(db.matriculas.find((x) => x.id === m.id)!.turmaId).toBe('ano-2026-c7-C'),
    )

    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(db.matriculas.find((x) => x.id === m.id)!.turmaId).toBeNull())
  })

  it('mudar entre turmas pede o motivo e regista-o no percurso', async () => {
    const m = db.matriculas.find((x) => x.turmaId === 'ano-2026-c7-C')!
    const nome = nomeDe(m.estudanteId)
    await abrirQuadro()
    const utilizador = userEvent.setup()
    await abrirMenu(utilizador, nome)
    await utilizador.click(await screen.findByRole('menuitem', { name: /^7\.ª A/ }))

    const dialogo = await screen.findByRole('dialog')
    const confirmar = within(dialogo).getByRole('button', { name: 'Mudar de turma' })
    expect(confirmar).toBeDisabled()
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Pedido do encarregado')
    await utilizador.click(confirmar)

    await waitFor(() =>
      expect(db.matriculas.find((x) => x.id === m.id)!.turmaId).toBe('ano-2026-c7-A'),
    )
    expect(
      db.percurso.some(
        (e) => e.estudanteId === m.estudanteId && e.descricao.includes('Pedido do encarregado'),
      ),
    ).toBe(true)
  })

  it('turma cheia: sem permissão de excepção, nem tenta e explica a lotação', async () => {
    // 7.ª B começa com 40 de 40
    expect(contarInscritos('ano-2026-c7-B')).toBe(40)
    const m = db.matriculas.find((x) => x.turmaId === 'ano-2026-c7-C')!
    const nome = nomeDe(m.estudanteId)
    await abrirQuadro()
    const utilizador = userEvent.setup()
    await abrirMenu(utilizador, nome)
    const opcao = await screen.findByRole('menuitem', { name: /^7\.ª B/ })
    expect(within(opcao).getByText('cheia')).toBeInTheDocument()
  })
})
