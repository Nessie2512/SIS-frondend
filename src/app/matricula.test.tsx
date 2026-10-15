import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRascunhoMatricula } from '@/features/matricular-estudante/model/rascunho'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

async function preencherDados(utilizador: ReturnType<typeof userEvent.setup>, nome: string) {
  await utilizador.type(await screen.findByLabelText(/Nome completo/), nome)
  await utilizador.type(screen.getByLabelText(/Data de nascimento/), '03/04/2013')
  await utilizador.tab()
  await utilizador.click(screen.getByRole('radio', { name: 'Feminino' }))
}

describe('Assistente de matrícula', () => {
  beforeEach(() => useRascunhoMatricula.getState().limpar())

  it('matricula um estudante novo em cinco passos e mostra o número de processo', async () => {
    const antes = db.matriculas.length
    const { router } = renderizarEm('/matriculas/nova')
    const utilizador = userEvent.setup()

    await preencherDados(utilizador, 'Esperança Txilombo Nunda')
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))

    expect(await screen.findByRole('heading', { name: 'Encarregados' })).toBeInTheDocument()
    await utilizador.type(screen.getAllByLabelText(/Nome completo/)[0]!, 'Rosa Nunda')
    await utilizador.type(screen.getByLabelText(/Parentesco/), 'Mãe')
    await utilizador.type(screen.getByLabelText(/Telefone/), '923 111 222')
    await utilizador.keyboard('{Enter}') // Enter avança

    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    for (const doc of [
      'Certidão de nascimento',
      'Bilhete de identidade',
      'Duas fotografias tipo passe',
      'Atestado médico',
    ]) {
      await utilizador.click(screen.getByLabelText(doc))
    }
    expect(await screen.findByText(/a matrícula fica confirmada/)).toBeInTheDocument()
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))

    expect(await screen.findByRole('heading', { name: 'Classe e turma' })).toBeInTheDocument()
    await utilizador.click(await screen.findByRole('combobox', { name: /Classe/ }))
    await utilizador.click(await screen.findByRole('option', { name: /7\.ª classe/ }))
    // A turma com mais vagas é sugerida e fica escolhida
    expect(await screen.findByText('Sugerida')).toBeInTheDocument()
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))

    const revisao = await screen.findByRole('heading', { name: 'Revisão' })
    expect(revisao).toBeInTheDocument()
    expect(await screen.findByText('Esperança Txilombo Nunda')).toBeInTheDocument()
    await utilizador.click(screen.getByRole('button', { name: 'Matricular' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Matrícula de Esperança Txilombo Nunda registada',
      }),
    ).toBeInTheDocument()
    expect(db.matriculas).toHaveLength(antes + 1)
    const nova = db.matriculas.at(-1)!
    expect(nova.estado).toBe('CONFIRMADA')
    expect(nova.turmaId).not.toBeNull()
    expect(router.state.location.pathname).toBe('/matriculas/nova')
  })

  it('não deixa avançar com campos inválidos e põe o foco no primeiro erro', async () => {
    renderizarEm('/matriculas/nova')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Seguinte' }))
    expect(await screen.findByText('Escreva o nome completo.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome completo/)).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Dados pessoais' })).toBeInTheDocument()
  })

  it('avisa de um possível duplicado e exige justificação para o ignorar', async () => {
    const existente = db.estudantes[5]!
    renderizarEm('/matriculas/nova')
    const utilizador = userEvent.setup()
    await preencherDados(utilizador, existente.nome)

    const cartao = await screen.findByRole('region', { name: 'Pode ser o mesmo estudante' })
    // O avatar pode repetir o nome para leitores de ecrã enquanto a imagem não chega
    expect((await within(cartao).findAllByText(existente.nome))[0]).toBeInTheDocument()
    expect(within(cartao).getByRole('link', { name: 'Abrir processo' })).toBeInTheDocument()

    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    expect(
      await screen.findByText('Confirme se é o mesmo estudante antes de continuar.'),
    ).toBeInTheDocument()

    await utilizador.click(within(cartao).getByLabelText('Não é o mesmo estudante'))
    await utilizador.type(
      await screen.findByLabelText(/Porque não é o mesmo estudante/),
      'Pais diferentes, outra escola',
    )
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Encarregados' })).toBeInTheDocument(),
    )
  })
})
