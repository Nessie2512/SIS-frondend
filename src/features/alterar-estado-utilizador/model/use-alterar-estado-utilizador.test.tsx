import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { useAlterarEstadoUtilizador } from './use-alterar-estado-utilizador'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('estado da conta no backend SIS', () => {
  it('desactivar = DELETE /users/{uuid}; reactivar não existe no backend', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useAlterarEstadoUtilizador())
    await act(() => result.current.mutateAsync({ utilizadorId: 'u-2', estado: 'INACTIVO' }))
    await expect(
      result.current.mutateAsync({ utilizadorId: 'u-2', estado: 'ACTIVO' }),
    ).rejects.toMatchObject({ code: 'NAO_DISPONIVEL' })
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['DELETE /users/u-2'])
  })
})
