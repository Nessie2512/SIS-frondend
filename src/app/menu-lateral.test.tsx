import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { usePreferencias } from '@/shared/lib/preferencias'
import { renderizarEm } from '@/test/renderizar'

describe('Menu lateral', () => {
  it('navega pelo menu e assinala a página actual', async () => {
    const { router } = renderizarEm('/')
    const utilizador = userEvent.setup()
    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    await utilizador.click(within(menu).getByRole('link', { name: 'Professores' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/professores'))
    expect(within(menu).getByRole('link', { name: 'Professores' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('recolhido mostra só ícones, mas os nomes continuam acessíveis e a escolha fica guardada', async () => {
    renderizarEm('/')
    const utilizador = userEvent.setup()
    const alternar = await screen.findByRole('button', { name: 'Recolher o menu' })
    expect(alternar).toHaveAttribute('aria-expanded', 'true')
    await utilizador.click(alternar)

    expect(screen.getByRole('button', { name: 'Expandir o menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(usePreferencias.getState().menuRecolhido).toBe(true)
    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).getByRole('link', { name: 'Estudantes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Definições' })).toBeInTheDocument()
  })

  it('Ctrl+B alterna entre recolhido e expandido', async () => {
    renderizarEm('/')
    await screen.findByRole('button', { name: 'Recolher o menu' })
    await userEvent.setup().keyboard('{Control>}b{/Control}')
    expect(await screen.findByRole('button', { name: 'Expandir o menu' })).toBeInTheDocument()
  })

  it('as definições mudam o tema, a densidade e o menu', async () => {
    renderizarEm('/')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('link', { name: 'Definições' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Definições' })).toBeInTheDocument()

    await utilizador.click(screen.getByRole('radio', { name: 'Escuro' }))
    await utilizador.click(screen.getByRole('radio', { name: 'Compacta' }))
    await utilizador.click(screen.getByRole('radio', { name: 'Recolhido' }))
    expect(usePreferencias.getState()).toMatchObject({
      tema: 'escuro',
      densidade: 'compacta',
      menuRecolhido: true,
    })
    expect(screen.getByRole('button', { name: 'Expandir o menu' })).toBeInTheDocument()
  })
})
