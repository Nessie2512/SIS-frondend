import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Impressão com pré-visualização', () => {
  it('a lista nominal abre a partir da turma, em ordem alfabética, e imprime', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { router } = renderizarEm('/turmas?turma=ano-2026-c7-A')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('link', { name: 'Imprimir lista' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/imprimir/turma/ano-2026-c7-A'),
    )

    const folha = await screen.findByRole('article', { name: 'Lista nominal — 7.ª A' })
    const tabela = within(folha).getByRole('table', { name: 'Estudantes da turma 7.ª A' })
    const nomes = within(tabela)
      .getAllByRole('row')
      .slice(1)
      .map((linha) => within(linha).getAllByRole('cell')[1]!.textContent)
    const esperados = db.matriculas
      .filter((m) => m.turmaId === 'ano-2026-c7-A')
      .map((m) => db.estudantes.find((e) => e.id === m.estudanteId)!.nome)
      .sort((a, b) => a.localeCompare(b, 'pt'))
    expect(nomes).toEqual(esperados)
    expect(document.title).toBe('Lista nominal — 7.ª A')

    await utilizador.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(imprimir).toHaveBeenCalledOnce()
    imprimir.mockRestore()
  })

  it('a ficha do estudante segue o termo de matrícula: dados, encarregado, regulamento e assinaturas', async () => {
    const estudante = db.estudantes[0]!
    renderizarEm(`/estudantes/${estudante.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('link', { name: 'Imprimir ficha' }))
    const nome = estudante.nome
    const folha = await screen.findByRole('article', { name: `Ficha — ${nome}` })
    expect(
      within(folha).getByRole('heading', {
        name: 'Termo de matrícula e de aceitação do regulamento escolar',
      }),
    ).toBeInTheDocument()
    expect(
      within(folha)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      '1. Informação do estudante',
      '2. Informação do encarregado de educação',
      '3. Regulamento escolar e código de conduta',
      '4. Declaração e compromisso do encarregado de educação',
      '5. Assinaturas',
    ])
    const dados = within(folha).getByRole('heading', {
      name: '1. Informação do estudante',
    }).parentElement!
    expect(within(dados).getByText(nome)).toBeInTheDocument()
    expect(within(dados).getByText(estudante.numeroProcesso!)).toBeInTheDocument()
    // Sem documentos nem percurso: o modelo não os tem
    expect(within(folha).queryByRole('table')).toBeNull()
  })
})
