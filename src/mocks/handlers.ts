import { delay, http, HttpResponse } from 'msw'
import { anosLectivos, turmas, utilizador } from './dados'

const API = '/api/v1'

/** Os mesmos handlers servem desenvolvimento, testes e Storybook (guia 3.2). */
export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(utilizador)),

  http.get(`${API}/anos-lectivos`, async () => {
    await delay(150)
    return HttpResponse.json(anosLectivos)
  }),

  http.get(`${API}/turmas`, async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const anoLectivoId = url.searchParams.get('anoLectivoId')
    const estado = url.searchParams.get('estado')
    const turno = url.searchParams.get('turno')
    const classeId = url.searchParams.get('classeId')
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 50)

    const filtradas = turmas.filter(
      (t) =>
        t.anoLectivoId === anoLectivoId &&
        (!estado || t.estado === estado) &&
        (!turno || t.turno === turno) &&
        (!classeId || t.classeId === classeId),
    )
    const items = filtradas
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ anoLectivoId: _, ...t }) => t)
    return HttpResponse.json({ items, total: filtradas.length, page, pageSize })
  }),

  http.get(`${API}/turmas/:id`, ({ params }) => {
    const turma = turmas.find((t) => t.id === params.id)
    if (!turma) {
      return HttpResponse.json(
        { title: 'Turma não encontrada', status: 404 },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    const { anoLectivoId: _, ...dto } = turma
    return HttpResponse.json(dto, { headers: { ETag: '"v1"' } })
  }),
]
