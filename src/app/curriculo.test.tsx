import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

const plano = (id: string) => db.planos.find((p) => p.id === id)!
const horas = (id: string, disciplinaId: string) =>
  plano(id).linhas.find((l) => l.disciplinaId === disciplinaId)?.horasSemanais

describe('Currículo: planos', () => {
  it('abre o rascunho e edita a carga no sítio, com o total actualizado', async () => {
    renderizarEm('/curriculo?classeId=c7')
    const utilizador = userEvent.setup()
    expect(await screen.findByRole('heading', { name: 'Plano da 7.ª classe' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Versão 3 · Rascunho' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const antes = plano('p-c7-3').linhas.reduce((s, l) => s + l.horasSemanais, 0)

    await utilizador.click(screen.getByRole('button', { name: 'Editar Matemática' }))
    const campo = screen.getByLabelText('Matemática')
    await utilizador.clear(campo)
    await utilizador.type(campo, '6{Enter}')

    expect(await screen.findByText(`${antes + 1} h`)).toBeInTheDocument()
    await waitFor(() => expect(horas('p-c7-3', 'd-mat')).toBe(6))
  })

  it('retirar uma disciplina tem Desfazer e acrescentar volta a pô-la', async () => {
    renderizarEm('/curriculo?classeId=c7')
    const utilizador = userEvent.setup()
    await utilizador.click(
      await screen.findByRole('button', { name: 'Retirar Informática do plano' }),
    )
    await waitFor(() => expect(horas('p-c7-3', 'd-inf')).toBeUndefined())
    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(horas('p-c7-3', 'd-inf')).toBe(1))
    expect(await screen.findByRole('button', { name: 'Editar Informática' })).toBeInTheDocument()
  })

  it('o vigente não se edita; publicar o rascunho arquiva o vigente', async () => {
    renderizarEm('/curriculo?classeId=c7&plano=p-c7-2')
    const utilizador = userEvent.setup()
    expect(await screen.findByText(/Em vigor desde/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()

    await utilizador.click(screen.getByRole('radio', { name: 'Versão 3 · Rascunho' }))
    await utilizador.click(await screen.findByRole('button', { name: 'Publicar versão 3' }))
    const dialogo = await screen.findByRole('dialog')
    expect(
      within(dialogo).getByText(/A versão 3 passa a vigente e a versão 2 fica arquivada/),
    ).toBeInTheDocument()
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Publicar' }))

    await waitFor(() => expect(plano('p-c7-3').estado).toBe('VIGENTE'))
    expect(plano('p-c7-2').estado).toBe('ARQUIVADO')
    expect(await screen.findByRole('button', { name: 'Criar nova versão' })).toBeInTheDocument()
  })

  it('criar nova versão a partir do vigente abre o rascunho novo', async () => {
    const { router } = renderizarEm('/curriculo?classeId=c8')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ plano: 'p-c8-3' }))
    expect(plano('p-c8-3').estado).toBe('RASCUNHO')
    expect(await screen.findByRole('button', { name: 'Editar Matemática' })).toBeInTheDocument()
  })

  it('se outra pessoa alterou o plano (412), mostra a versão actual e explica', async () => {
    renderizarEm('/curriculo?classeId=c7')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Editar Física' }))
    // Outra pessoa guarda entretanto
    plano('p-c7-3').linhas.find((l) => l.disciplinaId === 'd-mat')!.horasSemanais = 7
    plano('p-c7-3').revisao++
    const campo = screen.getByLabelText('Física')
    await utilizador.clear(campo)
    await utilizador.type(campo, '3{Enter}')

    expect(await screen.findByText(/Outra pessoa alterou este registo/)).toBeInTheDocument()
    expect(await screen.findByText('7 h por semana')).toBeInTheDocument()
    expect(horas('p-c7-3', 'd-fis')).toBe(2)
  })

  it('uma conta só de consulta vê o plano sem controlos de edição', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/curriculo?classeId=c7')
    expect(await screen.findByRole('heading', { name: 'Plano da 7.ª classe' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()
    expect(screen.queryByRole('button', { name: /Publicar/ })).toBeNull()
  })
})

describe('Currículo: disciplinas', () => {
  it('cria uma disciplina na folha lateral, validando os campos', async () => {
    renderizarEm('/curriculo/disciplinas')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Nova disciplina' }))
    const folha = await screen.findByRole('dialog')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar disciplina' }))
    expect(await within(folha).findByText('Escreva o nome da disciplina.')).toBeInTheDocument()

    await utilizador.type(within(folha).getByLabelText(/Nome/), 'Educação Ambiental')
    await utilizador.type(within(folha).getByLabelText(/Sigla/), 'mat')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar disciplina' }))
    expect(await within(folha).findByText('Esta sigla já está em uso.')).toBeInTheDocument()

    await utilizador.clear(within(folha).getByLabelText(/Sigla/))
    await utilizador.type(within(folha).getByLabelText(/Sigla/), 'ea')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar disciplina' }))
    expect(await screen.findByRole('cell', { name: 'Educação Ambiental' })).toBeInTheDocument()
    expect(db.disciplinas.find((d) => d.nome === 'Educação Ambiental')?.sigla).toBe('EA')
  })

  it('o que está em uso só se inactiva; o que não está pode eliminar-se', async () => {
    db.disciplinas.push({ id: 'd-nova', nome: 'Música', sigla: 'MUS', estado: 'ACTIVA' })
    renderizarEm('/curriculo/disciplinas')
    const utilizador = userEvent.setup()
    expect(await screen.findByRole('button', { name: 'Inactivar Matemática' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar Matemática' })).toBeNull()

    await utilizador.click(screen.getByRole('button', { name: 'Inactivar Matemática' }))
    expect(await screen.findByRole('button', { name: 'Reactivar Matemática' })).toBeInTheDocument()
    await waitFor(() =>
      expect(db.disciplinas.find((d) => d.id === 'd-mat')?.estado).toBe('INACTIVA'),
    )
    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(db.disciplinas.find((d) => d.id === 'd-mat')?.estado).toBe('ACTIVA'))

    await utilizador.click(screen.getByRole('button', { name: 'Eliminar Música' }))
    const dialogo = await screen.findByRole('dialog')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Eliminar disciplina' }))
    await waitFor(() => expect(db.disciplinas.some((d) => d.id === 'd-nova')).toBe(false))
    expect(screen.queryByRole('cell', { name: 'Música' })).toBeNull()
  })
})
