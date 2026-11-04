import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { naoDisponivel } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraPaginaMatriculas } from '../model/mapeadores'
import type { FiltrosMatriculas } from '../model/tipos'

export const matriculaKeys = {
  todas: ['matriculas'] as const,
  lista: (f: FiltrosMatriculas & { pageSize?: number }) =>
    [...matriculaKeys.todas, 'lista', f] as const,
}

export function matriculasQuery(
  filtros: FiltrosMatriculas,
  pageSize: number = PAGINACAO.porPagina,
) {
  return queryOptions({
    queryKey: matriculaKeys.lista({ ...filtros, pageSize }),
    queryFn: async ({ signal }) => {
      if (eReal('estudantes')) naoDisponivel('LISTAR_MATRICULAS')
      const { data } = await api.GET('/matriculas', {
        params: { query: { ...filtros, pageSize } },
        signal,
      })
      return paraPaginaMatriculas(data!)
    },
    staleTime: FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}
