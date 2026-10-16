import { queryOptions } from '@tanstack/react-query'
import { api, eApiError } from '@/shared/api'
import { SONDAGEM_TAREFAS } from '@/shared/config/constantes'
import { paraTarefa } from '../model/mapeadores'

export const tarefaKeys = {
  todas: ['tarefas'] as const,
  detalhe: (id: string) => [...tarefaKeys.todas, id] as const,
}

/**
 * Estado de uma tarefa longa (guia 5.7): consulta com intervalo crescente até terminar.
 * O TanStack Query suspende o intervalo com o separador escondido e retoma ao voltar.
 */
export function tarefaQuery(id: string) {
  return queryOptions({
    queryKey: tarefaKeys.detalhe(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/tarefas/{id}', { params: { path: { id } }, signal })
      return paraTarefa(data!)
    },
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (query.state.data?.terminada || query.state.status === 'error') return false
      const { inicial, factor, maximo } = SONDAGEM_TAREFAS
      return Math.min(maximo, inicial * factor ** query.state.dataUpdateCount)
    },
    // Um 404 significa que a tarefa expirou no servidor: não insistir
    retry: (falhas, erro) => !(eApiError(erro) && erro.status === 404) && falhas < 2,
  })
}
