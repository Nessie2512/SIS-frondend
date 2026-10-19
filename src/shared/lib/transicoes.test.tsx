import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFiltrarEmTransicao } from './transicoes'

describe('useFiltrarEmTransicao', () => {
  it('fica pendente enquanto a navegação do filtro não termina', async () => {
    const { result } = renderHook(() => useFiltrarEmTransicao())
    let terminar!: () => void
    const navegacao = new Promise<void>((resolve) => (terminar = resolve))

    act(() => result.current.filtrar(() => navegacao))
    expect(result.current.aFiltrar).toBe(true)

    await act(async () => {
      terminar()
      await navegacao
    })
    expect(result.current.aFiltrar).toBe(false)
  })
})
