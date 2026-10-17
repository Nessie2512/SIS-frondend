import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

const activo = () => db.professores.find((p) => p.estado === 'ACTIVO')!

describe('Professores', () => {
  it('pesquisa pelo número de agente e filtra por disciplina', async () => {
    const alvo = activo()
    const { router } = renderizarEm('/professores')
    const utilizador = userEvent.setup()
    await utilizador.type(
      await screen.findByRole('searchbox', { name: 'Pesquisar' }),
      alvo.numeroAgente,
    )
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ q: alvo.numeroAgente }),
    )
    expect(await screen.findByText(alvo.nome)).toBeInTheDocument()
    expect(await screen.findByText('1 professores')).toBeInTheDocument()
  })

  it('a ficha mostra as atribuições do ano com o total igual à carga lectiva', async () => {
    const alvo = activo()
    const horas = db.atribuicoes
      .filter((a) => a.professorId === alvo.id && a.anoLectivoId === 'ano-2026')
      .reduce((soma, a) => soma + a.horasSemanais, 0)
    renderizarEm(`/professores/${alvo.id}?separador=atribuicoes`)
    const tabela = await screen.findByRole('table', { name: 'Atribuições no ano lectivo' })
    const total = within(tabela).getByRole('row', { name: /Total semanal/ })
    expect(within(total).getByText(String(horas))).toBeInTheDocument()
  })

  it('mudar o estado é imediato e pode ser desfeito', async () => {
    const alvo = activo()
    renderizarEm(`/professores/${alvo.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Alterar estado' }))
    await utilizador.click(await screen.findByRole('menuitemradio', { name: /De licença/ }))

    // A etiqueta do cabeçalho muda antes de o servidor responder
    const cabecalho = screen.getByRole('heading', { level: 1 }).closest('header')!
    expect(await within(cabecalho).findByText('De licença')).toBeInTheDocument()
    await waitFor(() =>
      expect(db.professores.find((p) => p.id === alvo.id)!.estado).toBe('LICENCA'),
    )

    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(db.professores.find((p) => p.id === alvo.id)!.estado).toBe('ACTIVO'))
  })

  it('uma conta só de consulta não pode mudar o estado', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm(`/professores/${activo().id}`)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).toBeNull()
  })
})
