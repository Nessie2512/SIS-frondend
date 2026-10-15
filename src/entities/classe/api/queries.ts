import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'

export interface Classe {
  id: string
  designacao: string
  ciclo: string
  ordem: number
}

export const classeKeys = { todas: ['classes'] as const }

/** Dados de referência: frescura longa (guia 5.6). */
export function classesQuery() {
  return queryOptions({
    queryKey: classeKeys.todas,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/classes', { signal })
      return data!
        .map((c): Classe => ({
          id: c.id,
          designacao: c.designacao,
          ciclo: c.cicloDesignacao,
          ordem: c.ordem,
        }))
        .sort((a, b) => a.ordem - b.ordem)
    },
    staleTime: FRESCURA.referencia,
  })
}
