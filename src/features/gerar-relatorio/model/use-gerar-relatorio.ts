import { useMutation, useQueryClient } from '@tanstack/react-query'
import { relatorioKeys, type TipoRelatorio } from '@/entities/relatorio'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api, novaChaveIdempotencia } from '@/shared/api'

interface Pedido {
  tipo: TipoRelatorio
  anoLectivoId: string
  turmaId?: string
  classeId?: string
}

/**
 * Pedir um relatório (guia 5.7): o servidor responde logo com uma tarefa, que passa a ser
 * acompanhada no quadro de tarefas e aparece nas exportações recentes.
 */
export function useGerarRelatorio() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['relatorios', 'gerar'],
    mutationFn: async ({ tipo, ...corpo }: Pedido) => {
      const { data } = await api.POST('/relatorios/{tipo}', {
        params: { path: { tipo }, header: { 'Idempotency-Key': novaChaveIdempotencia() } },
        body: corpo,
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa, { anoLectivoId }) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
      return qc.invalidateQueries({ queryKey: relatorioKeys.exportacoes(anoLectivoId) })
    },
  })
}
