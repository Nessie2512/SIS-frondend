import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import {
  useCriarCiclo,
  useCriarClasse,
  useEliminarClasse,
  useEstadoClasse,
  useRenomearClasse,
} from './use-classes'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('classes e ciclos no backend SIS', () => {
  it('criar ciclo e classe; a classe refere o ciclo pelo id numérico', async () => {
    const pedidos = escutarEscritas()
    const ciclo = hookComCliente(() => useCriarCiclo()).result
    const classe = hookComCliente(() => useCriarClasse()).result
    await act(() => ciclo.current.mutateAsync('III Ciclo'))
    await act(() => classe.current.mutateAsync({ cicloId: 'nivel-ii', designacao: '11.ª classe' }))
    expect(pedidos).toEqual([
      { metodo: 'POST', caminho: '/academic-levels', corpo: { name: 'III Ciclo' } },
      { metodo: 'POST', caminho: '/grades', corpo: { name: '11.ª classe', academicLevelId: 2 } },
    ])
  })

  it('renomear e desactivar pelo uuid; eliminar e reactivar não existem', async () => {
    const pedidos = escutarEscritas()
    const renomear = hookComCliente(() => useRenomearClasse()).result
    const estado = hookComCliente(() => useEstadoClasse()).result
    const eliminar = hookComCliente(() => useEliminarClasse()).result
    await act(() => renomear.current.mutateAsync({ id: 'classe-7', designacao: '7.ª Classe' }))
    await act(() => estado.current.mutateAsync({ id: 'classe-7', estado: 'INACTIVA' }))
    await expect(eliminar.current.mutateAsync('classe-7')).rejects.toMatchObject({
      code: 'NAO_DISPONIVEL',
    })
    await expect(
      estado.current.mutateAsync({ id: 'classe-10', estado: 'ACTIVA' }),
    ).rejects.toMatchObject({ code: 'NAO_DISPONIVEL' })
    expect(pedidos.map((p) => [p.metodo, p.caminho, p.corpo])).toEqual([
      ['PATCH', '/grades/classe-7', { name: '7.ª Classe' }],
      ['DELETE', '/grades/classe-7/deactivate', null],
    ])
  })
})
