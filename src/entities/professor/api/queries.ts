import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { paraPaginaProfessores, paraProfessor } from '../model/mapeadores'
import type { FiltrosProfessores } from '../model/tipos'

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
    queryFn: async ({ signal }) => {
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
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/professores/{id}', {
        params: { path: { id }, query: { anoLectivoId } },
        signal,
      })
      return paraProfessor(data!)
    },
    staleTime: FRESCURA.lista,
  })
}
