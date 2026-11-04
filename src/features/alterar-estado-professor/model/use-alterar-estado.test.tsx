import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { useAlterarEstadoProfessor } from './use-alterar-estado'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('estado do professor no backend SIS', () => {
  it('desligar = DELETE /teachers/{uuid}; licença não existe no backend', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useAlterarEstadoProfessor('ano-sis-2026'))
    await act(() => result.current.mutateAsync({ professorId: 'prof-1', estado: 'DESLIGADO' }))
    await expect(
      result.current.mutateAsync({ professorId: 'prof-1', estado: 'LICENCA' }),
    ).rejects.toMatchObject({ code: 'NAO_DISPONIVEL' })
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['DELETE /teachers/prof-1'])
  })
})
