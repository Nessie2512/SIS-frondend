import { act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis, turmasSis } from '@/test/sis'
import { proximoNomeDeTurma, useCriarTurma, useEncerrarTurma } from './use-turmas'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('proximoNomeDeTurma', () => {
  it('usa a letra seguinte que falta entre as turmas da classe', () => {
    expect(proximoNomeDeTurma('7.ª classe', ['7.ª A', '7.ª B'])).toBe('7.ª C')
    expect(proximoNomeDeTurma('7.ª classe', ['7.ª B'])).toBe('7.ª A')
    expect(proximoNomeDeTurma('PRIMARY 1', [])).toBe('PRIMARY 1 A')
  })
})

describe('turmas no backend SIS', () => {
  it('criar envia nome, classe e ano pelos ids numéricos e o turno do SIS', async () => {
    // Como o backend real: 201 sem corpo; a turma nova aparece na lista seguinte
    const pedidos = escutarEscritas({}, () =>
      server.use(
        http.get('/sis/classes', () =>
          HttpResponse.json([
            ...turmasSis,
            { ...turmasSis[0]!, id: 99, uuid: 'nova', name: '7.ª C' },
          ]),
        ),
      ),
    )
    const { result } = hookComCliente(() => useCriarTurma('ano-sis-2026'))
    const criada = await act(() =>
      result.current.mutateAsync({
        classeId: 'classe-7',
        classeDesignacao: '7.ª classe',
        turno: 'NOITE',
        lotacaoMaxima: 40,
        chave: 'k1',
      }),
    )
    expect(pedidos).toEqual([
      {
        metodo: 'POST',
        caminho: '/classes',
        corpo: { name: '7.ª C', gradeId: 10, academicYearId: 1, period: 'NIGHT' },
      },
    ])
    expect(criada).toMatchObject({ id: 'nova', designacao: '7.ª C', classe: '7.ª classe' })
  })

  it('encerrar desactiva a turma pelo uuid', async () => {
    const pedidos = escutarEscritas({}, () =>
      server.use(
        http.get('/sis/classes', () =>
          HttpResponse.json(
            turmasSis.map((t) => (t.uuid === 'turma-7a' ? { ...t, isActive: false } : t)),
          ),
        ),
      ),
    )
    const { result } = hookComCliente(() => useEncerrarTurma())
    const turma = await act(() => result.current.mutateAsync({ turmaId: 'turma-7a', motivo: 'x' }))
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['DELETE /classes/turma-7a'])
    await waitFor(() => expect(turma).toMatchObject({ encerrada: true, classe: '7.ª classe' }))
  })
})
