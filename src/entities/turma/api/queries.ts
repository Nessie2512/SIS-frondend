import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { paraInscrito, paraPaginaTurmas, paraTurma } from '../model/mapeadores'
import type { DocenteTurma, FiltrosTurma } from '../model/tipos'

// Chaves organizadas e previsíveis (guia 4.6)
export const turmaKeys = {
  todas: ['turmas'] as const,
  lista: (f: FiltrosTurma) => [...turmaKeys.todas, 'lista', f] as const,
  detalhe: (id: string) => [...turmaKeys.todas, 'detalhe', id] as const,
  inscritos: (id: string) => [...turmaKeys.detalhe(id), 'inscritos'] as const,
  docentes: (id: string) => [...turmaKeys.detalhe(id), 'docentes'] as const,
}

export function turmasQuery(filtros: FiltrosTurma) {
  return queryOptions({
    queryKey: turmaKeys.lista(filtros),
    queryFn: async ({ signal }) => {
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
    queryFn: async ({ signal }) => {
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
