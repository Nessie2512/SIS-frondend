import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { useAlterarEstadoDisciplina, useCriarDisciplina } from './use-disciplinas'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('disciplinas no backend SIS', () => {
  it('criar com { name, code } e inactivar por PATCH isActive', async () => {
    const resposta = {
      id: 102,
      uuid: 'disc-fis',
      name: 'Física',
      code: 'FIS',
      isActive: true,
      createdAt: '',
    }
    const pedidos = escutarEscritas({
      'POST /subjects': resposta,
      'PATCH /subjects/disc-fis': { ...resposta, isActive: false },
    })
    const criar = hookComCliente(() => useCriarDisciplina()).result
    const estado = hookComCliente(() => useAlterarEstadoDisciplina()).result
    const nova = await act(() => criar.current.mutateAsync({ nome: 'Física', sigla: 'FIS' }))
    expect(nova).toMatchObject({ id: 'disc-fis', sigla: 'FIS', activa: true, emUso: false })
    const inactiva = await act(() =>
      estado.current.mutateAsync({ id: 'disc-fis', estado: 'INACTIVA' }),
    )
    expect(inactiva.activa).toBe(false)
    expect(pedidos.map((p) => [p.metodo, p.caminho, p.corpo])).toEqual([
      ['POST', '/subjects', { name: 'Física', code: 'FIS' }],
      ['PATCH', '/subjects/disc-fis', { isActive: false }],
    ])
  })
})
