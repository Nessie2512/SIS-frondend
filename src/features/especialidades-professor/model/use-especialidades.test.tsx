import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { useAlterarEspecialidades } from './use-especialidades'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('especialidades do professor no backend SIS', () => {
  it('PUT /teachers/{uuid}/specialties com as disciplinas pelos ids numéricos', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useAlterarEspecialidades('prof-1'))
    await act(() => result.current.mutateAsync(['disc-mat', 'disc-port']))
    expect(pedidos).toEqual([
      {
        metodo: 'PUT',
        caminho: '/teachers/prof-1/specialties',
        corpo: { specialtySubjectIds: [100, 101] },
      },
    ])
  })
})
