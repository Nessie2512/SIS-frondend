import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { problema } from '@/mocks/apoio'
import { db } from '@/mocks/db'
import { server } from '@/mocks/node'
import { renderizarEm } from '@/test/renderizar'

async function abrirNovaTurma(utilizador: ReturnType<typeof userEvent.setup>) {
  await utilizador.click(await screen.findByRole('button', { name: 'Nova turma' }))
  const folha = await screen.findByRole('dialog', { name: 'Nova turma' })
  await utilizador.click(within(folha).getByRole('combobox', { name: /Classe/ }))
  await utilizador.click(await screen.findByRole('option', { name: '7.ª classe' }))
  return folha
}

describe('Criar e encerrar turmas', () => {
  it('cria uma turma com a designação seguinte e a linha aparece já na lista', async () => {
    renderizarEm('/turmas')
    const utilizador = userEvent.setup()
    const folha = await abrirNovaTurma(utilizador)
    await utilizador.click(within(folha).getByRole('radio', { name: 'Tarde' }))
    const lotacao = within(folha).getByLabelText(/Lotação máxima/)
    await utilizador.clear(lotacao)
    await utilizador.type(lotacao, '5')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar turma' }))
    expect(
      await within(folha).findByText('A lotação vai de 10 a 60 estudantes.'),
    ).toBeInTheDocument()
    await utilizador.type(lotacao, '0')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar turma' }))

    const tabela = screen.getByRole('table', { name: 'Turmas' })
    expect(await within(tabela).findByText('7.ª D')).toBeInTheDocument()
    expect(db.turmas.find((t) => t.id === 'ano-2026-c7-D')).toMatchObject({
      turno: 'TARDE',
      lotacaoMaxima: 50,
      estado: 'ACTIVA',
    })
  })

  it('se o servidor recusar, a linha sai e o formulário volta com o que foi escrito', async () => {
    server.use(
      http.post('/api/v1/turmas', () =>
        problema(422, 'Dados inválidos', {
          errors: [{ campo: 'lotacaoMaxima', mensagem: 'Não há salas para mais turmas.' }],
        }),
      ),
    )
    renderizarEm('/turmas')
    const utilizador = userEvent.setup()
    const folha = await abrirNovaTurma(utilizador)
    await utilizador.type(within(folha).getByLabelText(/Sala/), 'Sala 20')
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar turma' }))
    const deVolta = await screen.findByRole('dialog', { name: 'Nova turma' })
    expect(await within(deVolta).findByText('Não há salas para mais turmas.')).toBeInTheDocument()
    expect(within(deVolta).getByLabelText(/Sala/)).toHaveValue('Sala 20')
    expect(screen.queryByText('A criar…')).toBeNull()
  })

  it('encerrar fica desactivado, com a razão, enquanto a turma tem estudantes', async () => {
    renderizarEm('/turmas?turma=ano-2026-c7-A')
    const botao = await screen.findByRole('button', { name: 'Encerrar turma' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).toHaveAccessibleDescription(/Mova primeiro os \d+ estudantes para outra turma\./)
  })

  it('sem estudantes, encerrar pede o motivo e a turma fica encerrada', async () => {
    const base = db.turmas.find((t) => t.id === 'ano-2026-c7-A')!
    db.turmas.push({ ...base, id: 'ano-2026-c7-Z', designacao: '7.ª Z' })
    renderizarEm('/turmas?turma=ano-2026-c7-Z')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Encerrar turma' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Encerrar a turma 7.ª Z' })
    await utilizador.type(within(dialogo).getByLabelText(/Motivo/), 'Turma criada por engano')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Encerrar 7.ª Z' }))
    await waitFor(() =>
      expect(db.turmas.find((t) => t.id === 'ano-2026-c7-Z')!.estado).toBe('ENCERRADA'),
    )
  })
})
