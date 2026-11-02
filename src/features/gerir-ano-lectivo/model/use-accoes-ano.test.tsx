import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { anosSis, handlersSis } from '@/test/sis'
import { useActivarAno, useCriarAno } from './use-accoes-ano'

// As acções do ano recarregam o router no fim; aqui só interessa o pedido e a resposta
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate: () => Promise.resolve() }),
}))

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('anos lectivos no backend SIS', () => {
  it('criar: 201 sem corpo; o ano novo lê-se da lista pela designação', async () => {
    const pedidos = escutarEscritas({}, () =>
      server.use(
        http.get('/sis/academic-years', () =>
          HttpResponse.json([
            ...anosSis,
            { ...anosSis[0]!, id: 3, uuid: 'ano-sis-2027', label: '2027/2028', startYear: 2027 },
          ]),
        ),
      ),
    )
    const { result } = hookComCliente(() => useCriarAno())
    const ano = await act(() =>
      result.current.mutateAsync({ dataInicio: '2027-09-01', dataFim: '2028-07-31' }),
    )
    expect(pedidos.map((p) => p.corpo)).toEqual([{ label: '2027/2028', startYear: 2027 }])
    expect(ano).toEqual({ id: 'ano-sis-2027' })
  })

  it('activar pelo uuid, sem depender da resposta', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useActivarAno('ano-sis-2025'))
    await act(() => result.current.mutateAsync())
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([
      'PUT /academic-years/ano-sis-2025/activate',
    ])
  })
})
