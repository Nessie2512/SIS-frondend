import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Listas: ordenação no URL, filtros avançados e atalho E', () => {
  it('ordenar por coluna fica no URL e o servidor devolve a página ordenada', async () => {
    const { router } = renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    const tabela = await screen.findByRole('table', { name: 'Estudantes' })
    const cabecalho = within(tabela).getByRole('columnheader', { name: /Nome/ })
    await utilizador.click(within(cabecalho).getByRole('button'))
    await utilizador.click(within(cabecalho).getByRole('button'))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ ordem: '-nome' }))
    expect(cabecalho).toHaveAttribute('aria-sort', 'descending')

    const ultimo = [...db.estudantes].sort((a, b) => b.nome.localeCompare(a.nome, 'pt'))[0]!
    await waitFor(() =>
      expect(within(tabela).getAllByRole('row')[1]).toHaveTextContent(ultimo.nome),
    )
    // Colunas sem campo no servidor não oferecem ordenação
    expect(
      within(within(tabela).getByRole('columnheader', { name: 'Matrícula' })).queryByRole('button'),
    ).toBeNull()
  })

  it('filtros avançados num painel próprio, aplicados juntos e mostrados como etiquetas', async () => {
    const { router } = renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Filtros avançados' }))
    const painel = await screen.findByRole('dialog', { name: 'Filtros avançados' })
    await utilizador.click(within(painel).getByLabelText('Com documentos obrigatórios em falta'))
    await utilizador.click(within(painel).getByRole('radio', { name: 'Feminino' }))
    await utilizador.click(within(painel).getByRole('button', { name: 'Aplicar' }))

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ documentosEmFalta: true, sexo: 'F' }),
    )
    const filtros = await screen.findByRole('list', { name: 'Filtros aplicados' })
    expect(within(filtros).getByText(/em falta/)).toBeInTheDocument()
    expect(within(filtros).getByText(/Feminino/)).toBeInTheDocument()
    const esperado = db.estudantes.filter(
      (e) =>
        e.sexo === 'F' &&
        db.documentos.some(
          (d) => d.estudanteId === e.id && d.obrigatorio && d.estado === 'EM_FALTA',
        ),
    ).length
    expect(await screen.findByText(`${esperado} estudantes`)).toBeInTheDocument()
  })

  it('E edita o campo principal da ficha e, com o foco num cartão, esse cartão', async () => {
    const estudante = db.estudantes[0]!
    renderizarEm(`/estudantes/${estudante.id}`)
    const utilizador = userEvent.setup()
    await screen.findByRole('heading', { level: 1, name: estudante.nome })
    await utilizador.keyboard('e')
    expect(await screen.findByRole('textbox', { name: /Nome completo/ })).toHaveFocus()
    await utilizador.keyboard('{Escape}')

    await utilizador.click(screen.getByRole('tab', { name: 'Encarregados' }))
    const enc = db.encarregados.find((x) => x.id === estudante.encarregadoIds[0])!
    const editar = await screen.findByRole('button', { name: `Editar ${enc.nome}` })
    // Foco dentro do cartão (no botão Retirar, por exemplo) e depois E
    screen.getByRole('button', { name: `Retirar ${enc.nome}` }).focus()
    await utilizador.keyboard('e')
    expect(await screen.findByRole('dialog', { name: 'Editar encarregado' })).toBeInTheDocument()
    expect(editar).toBeInTheDocument()
  })
})
