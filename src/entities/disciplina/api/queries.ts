import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import type { Disciplina } from '../model/tipos'

export const disciplinaKeys = {
  todas: ['disciplinas'] as const,
}

/** Dados de referência: frescura longa (guia 5.6). */
export function disciplinasQuery() {
  return queryOptions({
    queryKey: disciplinaKeys.todas,
    queryFn: async ({ signal }): Promise<Disciplina[]> => {
      const { data } = await api.GET('/disciplinas', { signal })
      return data!.map((d) => ({ ...d, activa: d.estado === 'ACTIVA' }))
    },
    staleTime: FRESCURA.referencia,
  })
}
