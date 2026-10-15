import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEm } from '@/test/renderizar'

describe('Quadro de tarefas', () => {
  it('gerar a lista nominal acompanha a tarefa até ao resultado', async () => {
    renderizarEm('/turmas?turma=ano-2026-c7-A')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Gerar lista nominal' }))

    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    const descarregar = await within(quadro).findByRole('link', { name: 'Descarregar' })
    expect(descarregar).toHaveAttribute('href', expect.stringMatching(/\/tarefas\/.+\/resultado$/))
  })

  it('uma tarefa falhada mostra o relatório de erros por linha', async () => {
    renderizarEm('/turmas?turma=ano-2026-c7-C')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Gerar lista nominal' }))

    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    expect(await within(quadro).findByText(/Linha 12/)).toBeInTheDocument()
    await utilizador.click(within(quadro).getByRole('button', { name: 'Dispensar' }))
    expect(screen.queryByRole('region', { name: 'Tarefas em segundo plano' })).toBeNull()
  })
})
