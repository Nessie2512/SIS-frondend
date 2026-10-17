import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import type { EcraVista, Vista } from '../model/tipos'

export const vistaKeys = {
  todas: ['vistas'] as const,
  doEcra: (ecra: EcraVista) => [...vistaKeys.todas, ecra] as const,
}

export function vistasQuery(ecra: EcraVista) {
  return queryOptions({
    queryKey: vistaKeys.doEcra(ecra),
    queryFn: async ({ signal }): Promise<Vista[]> => {
      const { data } = await api.GET('/vistas', { params: { query: { ecra } }, signal })
      return data!.map((v) => ({ ...v, filtros: { ...v.filtros } }))
    },
    staleTime: FRESCURA.referencia,
  })
}
