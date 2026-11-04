import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { apiSis, idNumerico, porId, referenciaSis } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { normalizarTexto, ordenarLocal, paginarLocal } from '@/shared/lib/paginacao-local'
import {
  paraPaginaProfessores,
  paraProfessor,
  paraProfessorDoSis,
  paraProfessorResumoDoSis,
} from '../model/mapeadores'
import type { FiltrosProfessores, PaginaProfessores } from '../model/tipos'

export const professorKeys = {
  todos: ['professores'] as const,
  listas: () => [...professorKeys.todos, 'lista'] as const,
  lista: (f: FiltrosProfessores) => [...professorKeys.listas(), f] as const,
  detalhe: (id: string, anoLectivoId: string) =>
    [...professorKeys.todos, 'detalhe', id, anoLectivoId] as const,
}

export function professoresQuery(filtros: FiltrosProfessores) {
  return queryOptions({
    queryKey: professorKeys.lista(filtros),
    queryFn: async ({ signal, client }) => {
      if (eReal('professores')) return paginaDoSis(client, filtros)
      const { data } = await api.GET('/professores', {
        params: { query: { ...filtros, pageSize: PAGINACAO.porPagina } },
        signal,
      })
      return paraPaginaProfessores(data!)
    },
    staleTime: filtros.pesquisa ? FRESCURA.pesquisa : FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}

export function professorQuery(id: string, anoLectivoId: string) {
  return queryOptions({
    queryKey: professorKeys.detalhe(id, anoLectivoId),
    queryFn: async ({ signal, client }) => {
      if (eReal('professores')) return professorDoSis(client, id, anoLectivoId, signal)
      const { data } = await api.GET('/professores/{id}', {
        params: { path: { id }, query: { anoLectivoId } },
        signal,
      })
      return paraProfessor(data!)
    },
    staleTime: FRESCURA.lista,
  })
}

/** Backend SIS: lista inteira; pesquisa, estado e ordem aplicam-se aqui. */
async function paginaDoSis(client: QueryClient, f: FiltrosProfessores): Promise<PaginaProfessores> {
  const termo = f.pesquisa ? normalizarTexto(f.pesquisa) : ''
  const anos = await client.fetchQuery(referenciaSis.anos())
  const academicYearId = idNumerico(anos, f.anoLectivoId)
  const disciplinas = f.disciplinaId
    ? await client.fetchQuery(referenciaSis.disciplinas(academicYearId, true))
    : []
  const todos = (
    await client.fetchQuery(
      referenciaSis.professores(academicYearId, {
        includeUnused: true,
        subjectId: f.disciplinaId ? idNumerico(disciplinas, f.disciplinaId) : undefined,
      }),
    )
  ).map(paraProfessorResumoDoSis)
  const filtrados = todos
    .filter(
      (p) =>
        !termo ||
        normalizarTexto(p.nome).includes(termo) ||
        normalizarTexto(p.numeroAgente).includes(termo),
    )
    .filter((p) => !f.estado || p.estado === f.estado)
  const ordenados = ordenarLocal(filtrados, f.ordenar ?? 'nome')
  const { itens, total, page, totalPaginas } = paginarLocal(
    ordenados,
    f.page ?? 1,
    PAGINACAO.porPagina,
  )
  return { professores: itens, total, page, totalPaginas }
}

/** Ficha com as atribuições do ano em contexto, ligadas às turmas e disciplinas. */
async function professorDoSis(
  client: QueryClient,
  uuid: string,
  anoLectivoId: string,
  signal: AbortSignal,
) {
  const anos = await client.fetchQuery(referenciaSis.anos())
  const academicYearId = idNumerico(anos, anoLectivoId)
  const [professor, atribuicoes, turmas, classes, disciplinas] = await Promise.all([
    apiSis
      .GET('/teachers/{uuid}', {
        params: { path: { uuid }, query: { academicYearId } },
        signal,
      })
      .then((r) => r.data!),
    apiSis
      .GET('/teachers/{uuid}/assignments', {
        params: { path: { uuid }, query: { academicYearId } },
        signal,
      })
      .then((r) => r.data!),
    client.fetchQuery(referenciaSis.turmas(academicYearId)),
    client.fetchQuery(referenciaSis.classes(academicYearId, true)),
    client.fetchQuery(referenciaSis.disciplinas(academicYearId, true)),
  ])
  const turmaPorId = porId(turmas)
  const classePorId = porId(classes)
  const disciplinaPorId = porId(disciplinas)
  return paraProfessorDoSis(
    professor,
    atribuicoes.filter((a) => a.academicYearId === academicYearId),
    {
      turma: (id) => {
        const t = turmaPorId.get(id)
        return t && { uuid: t.uuid, nome: t.name, classe: classePorId.get(t.gradeId)?.name ?? '' }
      },
      disciplina: (id) => {
        const d = disciplinaPorId.get(id)
        return d && { uuid: d.uuid, nome: d.name }
      },
    },
  )
}
