import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { administracao } from '@/mocks/administracao'
import { sessao } from '@/shared/api'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

describe('Definições: administração', () => {
  it('lista utilizadores com filtros e desactiva uma conta com Desfazer', async () => {
    renderizarEm('/definicoes/utilizadores')
    const utilizador = userEvent.setup()
    const tabela = await screen.findByRole('table', { name: 'Utilizadores' })
    // A própria conta não tem botão para se desactivar
    expect(within(tabela).getByText('(a sua conta)')).toBeInTheDocument()
    expect(within(tabela).queryByRole('button', { name: 'Desactivar Maria Secretária' })).toBeNull()

    const alvo = administracao.utilizadores.find((u) => u.id !== 'u1' && u.estado === 'ACTIVO')!
    await utilizador.click(within(tabela).getByRole('button', { name: `Desactivar ${alvo.nome}` }))
    await waitFor(() => expect(alvo.estado).toBe('INACTIVO'))
    expect(administracao.auditoria[0]?.detalhe).toBe(`${alvo.nome}: desactivado`)
    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(alvo.estado).toBe('ACTIVO'))

    await utilizador.click(screen.getByRole('combobox', { name: 'Estado' }))
    await utilizador.click(await screen.findByRole('option', { name: 'Inactivo' }))
    const filtros = await screen.findByRole('list', { name: 'Filtros aplicados' })
    expect(within(filtros).getByText(/Inactivo/)).toBeInTheDocument()
    await waitFor(() =>
      expect(within(tabela).getAllByRole('row').length).toBe(
        1 + administracao.utilizadores.filter((u) => u.estado === 'INACTIVO').length,
      ),
    )
  })

  it('perfis mostram o acesso por área e ligam aos utilizadores', async () => {
    renderizarEm('/definicoes/perfis')
    const consulta = await screen.findByRole('article', { name: 'Consulta' })
    const permissoes = within(consulta).getByRole('table', {
      name: 'Permissões do perfil Consulta',
    })
    const linha = within(permissoes).getByRole('row', { name: /Matrículas/ })
    expect(within(linha).getByText('Só consultar')).toBeInTheDocument()
    expect(
      within(consulta).getByRole('link', { name: 'Ver os utilizadores com o perfil Consulta' }),
    ).toHaveAttribute('href', '/definicoes/utilizadores?perfilId=perfil-consulta')
  })

  it('a auditoria filtra por acção e pagina', async () => {
    renderizarEm('/definicoes/auditoria')
    const utilizador = userEvent.setup()
    expect(await screen.findByText('64 registos')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    await utilizador.click(screen.getByRole('combobox', { name: 'Acção' }))
    await utilizador.click(await screen.findByRole('option', { name: 'Publicou' }))
    const n = administracao.auditoria.filter((e) => e.accao === 'PUBLICAR').length
    expect(await screen.findByText(`${n} registos`)).toBeInTheDocument()
  })

  it('quem não administra não vê as secções nem o conteúdo', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/definicoes')
    const nav = await screen.findByRole('navigation', { name: 'Secções das definições' })
    expect(within(nav).getAllByRole('link')).toHaveLength(1)
    expect(within(nav).queryByRole('link', { name: 'Utilizadores' })).toBeNull()
  })
})
