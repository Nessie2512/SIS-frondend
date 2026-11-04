import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_PREFERENCIAS, linguaGuardada } from '@/shared/config/constantes'
import { activarLingua } from '@/shared/i18n'
import { usePreferencias } from '@/shared/lib/preferencias'
import { recarregar } from '@/shared/lib/recarregar'
import { renderizarEm } from '@/test/renderizar'

afterEach(async () => {
  usePreferencias.setState({ lingua: 'pt-AO' })
  await activarLingua('pt-AO')
  vi.restoreAllMocks()
})

describe('Definições: língua da aplicação', () => {
  it('escolher English guarda a preferência e recarrega a aplicação', async () => {
    const recarregou = vi.spyOn(recarregar, 'agora').mockImplementation(() => {})
    renderizarEm('/definicoes')
    const grupo = await screen.findByRole('radiogroup', { name: 'Língua da aplicação' })
    const ingles = screen.getByRole('radio', { name: 'English' })
    expect(grupo).toContainElement(ingles)
    expect(ingles).toHaveAttribute('lang', 'en')

    await userEvent.click(ingles)
    expect(recarregou).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)!).state.lingua).toBe('en')
    expect(linguaGuardada()).toBe('en')
  })

  it('escolher a língua que já está activa não recarrega', async () => {
    const recarregou = vi.spyOn(recarregar, 'agora').mockImplementation(() => {})
    renderizarEm('/definicoes')
    await userEvent.click(await screen.findByRole('radio', { name: 'Português' }))
    expect(recarregou).not.toHaveBeenCalled()
  })

  it('em inglês, a interface usa o catálogo traduzido e o <html lang>', async () => {
    usePreferencias.setState({ lingua: 'en' })
    await activarLingua()
    expect(document.documentElement.lang).toBe('en')
    renderizarEm('/definicoes')
    expect(
      await screen.findByRole('radiogroup', { name: 'Application language' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('uma preferência inválida no navegador cai para português', () => {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ state: { lingua: 'xx' } }))
    expect(linguaGuardada()).toBe('pt-AO')
    localStorage.setItem(CHAVE_PREFERENCIAS, '{corrompido')
    expect(linguaGuardada()).toBe('pt-AO')
  })
})
