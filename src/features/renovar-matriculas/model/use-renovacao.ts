import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api, novaChaveIdempotencia, type components } from '@/shared/api'

export type Simulacao = components['schemas']['SimulacaoRenovacaoDto']

/** Simular não muda nada: só mostra quem renova, para que classe, e quem fica de fora. */
export function useSimularRenovacao() {
  return useMutation({
    mutationKey: ['renovacoes', 'simular'],
    mutationFn: async (anoDestinoId: string) => {
      const { data } = await api.POST('/renovacoes/simular', { body: { anoDestinoId } })
      return data!
    },
  })
}

/**
 * Aplicar a renovação (guia 5.7): responde logo com uma tarefa, acompanhada no quadro de
 * tarefas. A chave de idempotência evita renovar duas vezes num duplo clique ou numa repetição.
 */
export function useAplicarRenovacao() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['renovacoes', 'aplicar'],
    mutationFn: async ({ id, excluir }: { id: string; excluir: string[] }) => {
      const { data } = await api.POST('/renovacoes/{id}/aplicar', {
        params: { path: { id }, header: { 'Idempotency-Key': novaChaveIdempotencia() } },
        body: { excluir },
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
      // Matrículas, abertura do ano e painel mudam com a renovação
      void qc.invalidateQueries()
    },
  })
}
