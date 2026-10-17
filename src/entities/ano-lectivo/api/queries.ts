import { queryOptions } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraAnoLectivo } from '../model/mapeadores'

export const anoLectivoKeys = {
  todos: ['anos-lectivos'] as const,
  encerramento: (id: string) => [...anoLectivoKeys.todos, id, 'encerramento'] as const,
  abertura: (id: string) => [...anoLectivoKeys.todos, id, 'abertura'] as const,
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

export type Encerramento = components['schemas']['EncerramentoDto']
export type Abertura = components['schemas']['AberturaDto']

/** Pendências que impedem encerrar o ano (guia 2.3): sempre frescas. */
export function encerramentoQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: anoLectivoKeys.encerramento(anoLectivoId),
    queryFn: async ({ signal }): Promise<Encerramento> => {
      const { data } = await api.GET('/anos-lectivos/{id}/encerramento', {
        params: { path: { id: anoLectivoId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/** Etapas da abertura do ano, cada uma com o seu estado (guia 2.3). */
export function aberturaQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: anoLectivoKeys.abertura(anoLectivoId),
    queryFn: async ({ signal }): Promise<Abertura> => {
      const { data } = await api.GET('/anos-lectivos/{id}/abertura', {
        params: { path: { id: anoLectivoId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}
