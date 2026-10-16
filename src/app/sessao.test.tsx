import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sessao } from '@/shared/api'
import { usePermissoesStore } from '@/shared/lib/permissoes'
import { renderizarEm } from '@/test/renderizar'

describe('Sessão', () => {
  it('sem sessão, vai para a entrada e volta à rota pedida depois de entrar', async () => {
    sessao.definirToken(null)
    const { router } = renderizarEm('/turmas?estado=ENCERRADA')
    expect(await screen.findByRole('heading', { name: 'Secretaria' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')

    const utilizador = userEvent.setup()
    await utilizador.type(screen.getByLabelText(/Email/), 'secretaria@escola.ao')
    await utilizador.type(screen.getByLabelText(/Palavra-passe/), 'secretaria')
    await utilizador.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas'))
    expect(router.state.location.search).toMatchObject({ estado: 'ENCERRADA' })
    expect(sessao.tokenAcesso()).toBe('tk-u1')
  })

  it('credenciais erradas mostram uma mensagem simples, sem códigos', async () => {
    sessao.definirToken(null)
    renderizarEm('/entrar')
    const utilizador = userEvent.setup()
    await utilizador.type(await screen.findByLabelText(/Email/), 'secretaria@escola.ao')
    await utilizador.type(screen.getByLabelText(/Palavra-passe/), 'errada')
    await utilizador.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(
      await screen.findByText('O email ou a palavra-passe não estão correctos.'),
    ).toBeInTheDocument()
  })

  it('valida os campos ao submeter e põe o foco no primeiro erro', async () => {
    sessao.definirToken(null)
    renderizarEm('/entrar')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Escreva um email válido.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveFocus()
  })

  it('carrega as permissões do utilizador a partir de /auth/me', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/')
    await waitFor(() => expect(usePermissoesStore.getState().carregadas).toBe(true))
    expect(usePermissoesStore.getState().permissoes.has('turmas:ler')).toBe(true)
    expect(usePermissoesStore.getState().permissoes.has('turmas:escrever')).toBe(false)
  })
})
