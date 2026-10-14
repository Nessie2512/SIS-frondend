import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraAnoLectivo } from '../model/mapeadores'

export const anoLectivoKeys = {
  todos: ['anos-lectivos'] as const,
}

export function anosLectivosQuery() {
  return queryOptions({
    queryKey: anoLectivoKeys.todos,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/anos-lectivos', { signal })
      return data!.map(paraAnoLectivo)
    },
    staleTime: FRESCURA.referencia,
  })
}
