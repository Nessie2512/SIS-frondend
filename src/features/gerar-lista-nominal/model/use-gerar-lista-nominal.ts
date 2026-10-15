import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api, novaChaveIdempotencia } from '@/shared/api'

/**
 * Pede a lista nominal ao servidor (trabalho longo, guia 5.7): responde logo com uma tarefa,
 * que passa a ser acompanhada no quadro de tarefas.
 */
export function useGerarListaNominal() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['lista-nominal'],
    mutationFn: async (turmaId: string) => {
      const { data } = await api.POST('/turmas/{id}/lista-nominal', {
        params: { path: { id: turmaId }, header: { 'Idempotency-Key': novaChaveIdempotencia() } },
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
    },
  })
}
