import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api, novaChaveIdempotencia, type components } from '@/shared/api'

export type Criterio = components['schemas']['CriterioDistribuicao']
export type Distribuicao = components['schemas']['DistribuicaoDto']

/** Simular não muda nada: propõe uma turma a cada matrícula confirmada sem turma. */
export function useSimularDistribuicao() {
  return useMutation({
    mutationKey: ['distribuicao', 'simular'],
    mutationFn: async (pedido: { anoLectivoId: string; classeId: string; criterio: Criterio }) => {
      const { data } = await api.POST('/distribuicoes/simular', { body: pedido })
      return data!
    },
  })
}

/**
 * Aplicar (guia 5.1, 5.7): simulação, confirmação e tarefa assíncrona, acompanhada no quadro de
 * tarefas, com avisos por linha para quem não pôde ser inscrito.
 */
export function useAplicarDistribuicao() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['distribuicao', 'aplicar'],
    mutationFn: async (pedido: {
      anoLectivoId: string
      classeId: string
      inscricoes: { matriculaId: string; turmaId: string }[]
    }) => {
      const { data } = await api.POST('/distribuicoes/aplicar', {
        params: { header: { 'Idempotency-Key': novaChaveIdempotencia() } },
        body: pedido,
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
      void qc.invalidateQueries()
    },
  })
}
