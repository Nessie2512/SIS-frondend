import { afterEach, describe, expect, it } from 'vitest'
import { simularSistemaEscuro } from '@/test/setup'
import { sincronizarPreferencias, temaEfectivo, usePreferencias } from './preferencias'

afterEach(() => {
  simularSistemaEscuro(false)
  usePreferencias.setState({ tema: 'sistema', densidade: 'confortavel' })
})

describe('preferências de tema', () => {
  it('segue o sistema por omissão', () => {
    simularSistemaEscuro(true)
    expect(temaEfectivo('sistema')).toBe('escuro')
    simularSistemaEscuro(false)
    expect(temaEfectivo('sistema')).toBe('claro')
  })

  it('a escolha explícita sobrepõe-se ao sistema', () => {
    simularSistemaEscuro(true)
    expect(temaEfectivo('claro')).toBe('claro')
  })

  it('aplica tema e densidade no elemento raiz', () => {
    const parar = sincronizarPreferencias()
    usePreferencias.getState().definirTema('escuro')
    usePreferencias.getState().definirDensidade('compacta')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(document.documentElement.dataset.densidade).toBe('compacta')
    parar()
  })
})
