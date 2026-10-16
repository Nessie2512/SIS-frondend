import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA, SONDAGEM_TAREFAS } from '@/shared/config/constantes'
import type { Exportacao } from '../model/tipos'

export const relatorioKeys = {
  todos: ['relatorios'] as const,
  catalogo: ['relatorios', 'catalogo'] as const,
  exportacoes: (anoLectivoId: string) => ['relatorios', 'exportacoes', anoLectivoId] as const,
}

const ESTADO = {
  EM_CURSO: { rotulo: msg`Em curso`, tom: 'accao' },
  CONCLUIDA: { rotulo: msg`Pronto`, tom: 'sucesso' },
  FALHADA: { rotulo: msg`Falhou`, tom: 'perigo' },
} as const

export function catalogoQuery() {
  return queryOptions({
    queryKey: relatorioKeys.catalogo,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/relatorios', { signal })
      return data!
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Exportações recentes do utilizador; consulta de novo enquanto houver alguma em curso. */
export function exportacoesQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: relatorioKeys.exportacoes(anoLectivoId),
    queryFn: async ({ signal }): Promise<Exportacao[]> => {
      const { data } = await api.GET('/relatorios/exportacoes', {
        params: { query: { anoLectivoId } },
        signal,
      })
      return data!.map((e) => ({
        ...e,
        estadoRotulo: i18n._(ESTADO[e.estado].rotulo),
        estadoTom: ESTADO[e.estado].tom,
      }))
    },
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.estado === 'EM_CURSO') ? SONDAGEM_TAREFAS.inicial * 2 : false,
  })
}
