import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRascunhoMatricula } from '@/features/matricular-estudante/model/rascunho'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

describe('Resumo de erros no topo dos formulários', () => {
  beforeEach(() => useRascunhoMatricula.getState().limpar())

  it('entrar: lista os campos a corrigir, leva a cada um e encolhe ao corrigir', async () => {
    sessao.definirToken(null)
    renderizarEm('/entrar')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Entrar' }))

    const resumo = await screen.findByRole('alert', {
      name: 'Corrija 2 campos antes de continuar.',
    })
    // O foco vai para o primeiro campo com erro (guia 7.2)
    await waitFor(() => expect(screen.getByLabelText(/Email/)).toHaveFocus())

    await utilizador.click(within(resumo).getByRole('button', { name: /^Palavra-passe:/ }))
    expect(screen.getByLabelText(/Palavra-passe/)).toHaveFocus()

    await utilizador.type(screen.getByLabelText(/Email/), 'secretaria@escola.ao')
    expect(
      await screen.findByRole('alert', { name: 'Corrija 1 campo antes de continuar.' }),
    ).toBeInTheDocument()
  })

  it('assistente de matrícula: o resumo mostra só os erros do passo e leva a um selector', async () => {
    renderizarEm('/matriculas/nova')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Seguinte' }))
    const resumo = await screen.findByRole('alert', { name: /^Corrija \d campos/ })
    const itens = within(resumo)
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(itens).toEqual([
      'Nome completo: Escreva o nome completo.',
      'Data de nascimento: Indique a data de nascimento.',
      'Sexo: Escolha o sexo.',
    ])
    await utilizador.click(within(resumo).getByRole('button', { name: /^Data de nascimento:/ }))
    expect(screen.getByLabelText(/Data de nascimento/)).toHaveFocus()
  })

  it('nova turma (sem React Hook Form): leva ao selector da classe pelo erro', async () => {
    renderizarEm('/turmas')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Nova turma' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova turma' })
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar turma' }))
    const resumo = await within(folha).findByRole('alert', { name: /^Corrija 1 campo/ })
    await utilizador.click(within(resumo).getByRole('button', { name: /^Classe:/ }))
    expect(within(folha).getByRole('combobox', { name: /Classe/ })).toHaveFocus()
  })
})
