import { queryOptions } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'

export interface Classe {
  id: string
  designacao: string
  cicloId: string
  ciclo: string
  ordem: number
  /** Inactiva: deixa de ser oferecida em matrículas e turmas novas (guia 2.4) */
  activa: boolean
}

export type Ciclo = components['schemas']['CicloDto']

export const classeKeys = { todas: ['classes'] as const, ciclos: ['classes', 'ciclos'] as const }

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
          cicloId: c.cicloId,
          ciclo: c.cicloDesignacao,
          ordem: c.ordem,
          activa: c.estado === 'ACTIVA',
        }))
        .sort((a, b) => a.ordem - b.ordem)
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Árvore de ciclos e classes, com o uso de cada classe (turmas, matrículas, planos). */
export function ciclosQuery() {
  return queryOptions({
    queryKey: classeKeys.ciclos,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/ciclos', { signal })
      return data!
    },
    staleTime: 0,
  })
}
