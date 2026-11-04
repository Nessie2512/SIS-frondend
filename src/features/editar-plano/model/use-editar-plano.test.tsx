import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { planoQuery } from '@/entities/plano'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { disciplinasSis, handlersSis } from '@/test/sis'
import { useEditarPlano } from './use-editar-plano'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

const matematica = disciplinasSis.find((d) => d.code === 'MAT')!
const portugues = disciplinasSis.find((d) => d.code === 'LP')!

describe('plano da classe no backend SIS', () => {
  it('lê as disciplinas de GET /grades/{id}/subjects, sem carga horária', async () => {
    server.use(
      http.get('/sis/grades/:gradeId/subjects', ({ params }) =>
        HttpResponse.json({ gradeId: params.gradeId, subjects: [matematica] }),
      ),
    )
    const { queryClient } = hookComCliente(() => null)
    const plano = await queryClient.fetchQuery(planoQuery('classe-7'))
    expect(plano).toMatchObject({ id: 'classe-7', semCargaHoraria: true, estado: 'VIGENTE' })
    expect(plano.linhas.map((l) => l.sigla)).toEqual(['MAT'])
  })

  it('sem o âmbito curriculum (403), lê de subjectIds da classe, só para consulta', async () => {
    server.use(
      http.get('/sis/grades/:gradeId/subjects', () =>
        HttpResponse.json({ title: 'Forbidden', status: 403 }, { status: 403 }),
      ),
    )
    const { queryClient } = hookComCliente(() => null)
    const plano = await queryClient.fetchQuery(planoQuery('classe-7'))
    // classe-7 tem subjectIds [100] = Matemática no backend falso
    expect(plano.linhas.map((l) => l.disciplina)).toEqual(['Matemática'])
  })

  it('acrescentar e retirar pelos ids numéricos das disciplinas', async () => {
    const pedidos = escutarEscritas({
      'POST /grades/classe-7/subjects': { gradeId: 'classe-7', subjects: [matematica, portugues] },
    })
    server.use(
      http.get('/sis/grades/:gradeId/subjects', ({ params }) =>
        HttpResponse.json({ gradeId: params.gradeId, subjects: [matematica] }),
      ),
    )
    const { result, queryClient } = hookComCliente(() => useEditarPlano('classe-7'))
    await queryClient.fetchQuery(planoQuery('classe-7'))
    await act(async () => {
      result.current.acrescentar({
        disciplinaId: portugues.uuid,
        disciplina: portugues.name,
        sigla: 'LP',
        horasSemanais: 0,
      })
    })
    await act(async () => {
      result.current.retirar({
        disciplinaId: matematica.uuid,
        disciplina: 'Matemática',
        sigla: 'MAT',
        horasSemanais: 0,
      })
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(pedidos.map((p) => [p.metodo, p.caminho, p.corpo])).toEqual([
      ['POST', '/grades/classe-7/subjects', { subjectIds: [101] }],
      ['DELETE', '/grades/classe-7/subjects/100', null],
    ])
  })
})
