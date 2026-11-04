import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { PESSOA_VAZIA } from '@/shared/lib/pessoa'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { useCriarConta, useMudarPapel } from './use-contas'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('contas no backend SIS', () => {
  it('criar (POST /users) e mudar o papel (PATCH /users/{uuid})', async () => {
    const pedidos = escutarEscritas()
    const criar = hookComCliente(() => useCriarConta()).result
    const papel = hookComCliente(() => useMudarPapel()).result
    await act(() =>
      criar.current.mutateAsync({
        ...PESSOA_VAZIA,
        nome: 'Teresa Lukeny',
        dataNascimento: '1992-02-20',
        nacionalidade: 'Angolana',
        rua: 'Rua 5',
        bairro: 'Alvalade',
        municipio: 'Luanda',
        provincia: 'Luanda',
        email: ' Teresa@Escola.ao ',
        papel: 'SECRETARIO',
        palavraPasse: 'uma frase longa',
      }),
    )
    await act(() => papel.current.mutateAsync({ utilizadorId: 'u-2', papel: 'CHEFE_SECRETARIA' }))
    expect(pedidos.map((p) => [p.metodo, p.caminho])).toEqual([
      ['POST', '/users'],
      ['PATCH', '/users/u-2'],
    ])
    expect(pedidos[0]?.corpo).toMatchObject({
      email: 'teresa@escola.ao',
      role: 'SECRETARIO',
      address: { neighborhood: 'Alvalade' },
    })
    expect(pedidos[1]?.corpo).toEqual({ role: 'CHEFE_SECRETARIA' })
  })
})
