import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { docentesQuery } from '@/entities/turma'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { atribuicoesSis, handlersSis } from '@/test/sis'
import { useAtribuirDocente } from './use-atribuir-docente'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('docentes da turma no backend SIS', () => {
  it('uma linha por disciplina da classe, com o professor atribuído à turma', async () => {
    const { queryClient } = hookComCliente(() => null)
    const linhas = await queryClient.fetchQuery(docentesQuery('turma-7a'))
    // 7.ª classe tem Matemática; atr-1 liga o Mário à 7.ª A em Matemática
    expect(linhas).toEqual([
      expect.objectContaining({
        disciplina: 'Matemática',
        actual: expect.objectContaining({ professor: 'Mário Kiala', professorId: 'prof-1' }),
      }),
    ])
  })

  it('atribuir: POST /teachers/{uuid}/assignments com disciplina, turma e ano numéricos', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useAtribuirDocente('turma-7b'))
    server.use(
      http.get('/sis/teachers/:uuid/assignments', () =>
        HttpResponse.json([
          ...atribuicoesSis,
          { ...atribuicoesSis[0]!, id: 9, uuid: 'atr-9', classId: 21 },
        ]),
      ),
    )
    const linha = await act(() =>
      result.current.mutateAsync({
        disciplinaId: 'disc-mat',
        professorId: 'prof-1',
        professor: 'Mário Kiala',
        desde: '2026-09-01',
      }),
    )
    expect(pedidos.map((p) => [p.caminho, p.corpo])).toEqual([
      ['/teachers/prof-1/assignments', { subjectId: 100, classId: 21, academicYearId: 1 }],
    ])
    expect(linha.actual?.professor).toBe('Mário Kiala')
  })
})
