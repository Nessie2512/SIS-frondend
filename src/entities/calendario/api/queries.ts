import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraCalendario } from '../model/mapeadores'

export const calendarioKeys = {
  todos: ['calendario'] as const,
  doAno: (anoLectivoId: string) => [...calendarioKeys.todos, anoLectivoId] as const,
}

/** Calendário do ano lectivo: dado de referência, guardado também para ligação fraca (guia 5.8). */
export function calendarioQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: calendarioKeys.doAno(anoLectivoId),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/anos-lectivos/{id}/calendario', {
        params: { path: { id: anoLectivoId } },
        signal,
      })
      return paraCalendario(data!)
    },
    staleTime: FRESCURA.referencia,
  })
}
