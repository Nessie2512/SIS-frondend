import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/shared/api'
import { porId, referenciaSis } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraInscrito, paraPaginaTurmas, paraTurma, paraTurmaDoSis } from '../model/mapeadores'
import type {
  DocenteTurma,
  FiltrosTurma,
  PaginaTurmas,
  ResultadoFinal,
  Turma,
} from '../model/tipos'

// Chaves organizadas e previsíveis (guia 4.6)
export const turmaKeys = {
  todas: ['turmas'] as const,
  lista: (f: FiltrosTurma) => [...turmaKeys.todas, 'lista', f] as const,
  detalhe: (id: string) => [...turmaKeys.todas, 'detalhe', id] as const,
  inscritos: (id: string) => [...turmaKeys.detalhe(id), 'inscritos'] as const,
  docentes: (id: string) => [...turmaKeys.detalhe(id), 'docentes'] as const,
  resultados: (id: string) => [...turmaKeys.detalhe(id), 'resultados'] as const,
}

export function turmasQuery(filtros: FiltrosTurma) {
  return queryOptions({
    queryKey: turmaKeys.lista(filtros),
    queryFn: async ({ signal, client }) => {
      if (eReal('turmas')) return paginaDoSis(client, filtros)
      const { data } = await api.GET('/turmas', {
        params: { query: { ...filtros, pageSize: PAGINACAO.porPagina } },
        signal,
      })
      return paraPaginaTurmas(data!)
    },
    staleTime: FRESCURA.lista,
    placeholderData: keepPreviousData, // evita ecrã em branco ao mudar filtro ou página
  })
}

export function turmaQuery(id: string) {
  return queryOptions({
    queryKey: turmaKeys.detalhe(id),
    queryFn: async ({ signal, client }) => {
      if (eReal('turmas')) {
        const turma = (await turmasDoSis(client)).find((t) => t.id === id)
        if (!turma) throw new ApiError(404, { title: 'TURMA_NAO_ENCONTRADA' })
        return turma
      }
      const { data } = await api.GET('/turmas/{id}', { params: { path: { id } }, signal })
      return paraTurma(data!)
    },
    staleTime: FRESCURA.lista,
  })
}

export function inscritosQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.inscritos(turmaId),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/turmas/{id}/inscritos', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!.map(paraInscrito)
    },
    staleTime: FRESCURA.lista,
  })
}

/** Docentes da turma, uma linha por disciplina do plano vigente, com o histórico de cada uma. */
export function docentesQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.docentes(turmaId),
    queryFn: async ({ signal }): Promise<DocenteTurma[]> => {
      const { data } = await api.GET('/turmas/{id}/docentes', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!
    },
    staleTime: FRESCURA.lista,
  })
}

/** Resultados finais dos estudantes confirmados na turma (aprovado, reprovado ou por registar). */
export function resultadosQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.resultados(turmaId),
    queryFn: async ({ signal }): Promise<ResultadoFinal[]> => {
      const { data } = await api.GET('/turmas/{id}/resultados', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/** Backend SIS: todas as turmas, já com a classe e o ano (uuid) de cada uma. */
async function turmasDoSis(client: QueryClient): Promise<(Turma & { anoLectivoId: string })[]> {
  const [turmas, classes, anos] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas()),
    client.fetchQuery(referenciaSis.classes()),
    client.fetchQuery(referenciaSis.anos()),
  ])
  const classePorId = porId(classes)
  const anoPorId = porId(anos)
  return turmas.map((t) => ({
    ...paraTurmaDoSis(t, classePorId.get(t.gradeId)),
    anoLectivoId: anoPorId.get(t.academicYearId)?.uuid ?? '',
  }))
}

/** Sem filtros nem páginas no backend: filtra-se e pagina-se aqui, com as mesmas regras. */
async function paginaDoSis(client: QueryClient, filtros: FiltrosTurma): Promise<PaginaTurmas> {
  const todas = (await turmasDoSis(client))
    .filter((t) => t.anoLectivoId === filtros.anoLectivoId)
    .filter((t) => !filtros.classeId || t.classeId === filtros.classeId)
    .filter((t) => !filtros.turno || t.turno === filtros.turno)
    .filter((t) => t.encerrada === (filtros.estado === 'ENCERRADA'))
    .sort((a, b) => a.designacao.localeCompare(b.designacao, 'pt', { numeric: true }))
  const porPagina = PAGINACAO.porPagina
  const totalPaginas = Math.max(1, Math.ceil(todas.length / porPagina))
  const page = Math.min(Math.max(1, filtros.page), totalPaginas)
  return {
    turmas: todas
      .slice((page - 1) * porPagina, page * porPagina)
      .map(({ anoLectivoId: _, ...t }) => t),
    total: todas.length,
    page,
    totalPaginas,
  }
}
