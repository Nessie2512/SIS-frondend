import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  documentoOficialKeys,
  type PedidoLote,
  type TipoDocumentoOficial,
} from '@/entities/documento-oficial'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api } from '@/shared/api'

/**
 * Emitir um documento oficial (guia 5.1): pessimista, porque gera numeração e não se desfaz.
 * A chave de idempotência vem de quem abre a folha: uma por emissão, reutilizada se repetir.
 */
export function useEmitirDocumento(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['documentos-oficiais', estudanteId, 'emitir'],
    mutationFn: async (pedido: {
      tipo: TipoDocumentoOficial
      finalidade: string
      chave: string
    }) => {
      const { data } = await api.POST('/estudantes/{id}/documentos-oficiais', {
        params: { path: { id: estudanteId }, header: { 'Idempotency-Key': pedido.chave } },
        body: { tipo: pedido.tipo, finalidade: pedido.finalidade || undefined },
      })
      return data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentoOficialKeys.todos }),
  })
}

/** Anular: o documento continua visível, riscado e com o motivo (guia 2.2). */
export function useAnularDocumento(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['documentos-oficiais', estudanteId, 'anular'],
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data } = await api.POST('/documentos-oficiais/{id}/anular', {
        params: { path: { id } },
        body: { motivo },
      })
      return data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentoOficialKeys.todos }),
  })
}

/**
 * Emitir em lote (guia 2.1, 5.7): numera os documentos de uma vez e junta-os num PDF, gerado
 * numa tarefa acompanhada no quadro; quem fica de fora vem nos avisos.
 */
export function useEmitirLote() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['documentos-oficiais', 'lote'],
    mutationFn: async ({ chave, ...pedido }: PedidoLote & { chave: string }) => {
      const { data } = await api.POST('/documentos-oficiais/lote', {
        params: { header: { 'Idempotency-Key': chave } },
        body: pedido,
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
      void qc.invalidateQueries({ queryKey: documentoOficialKeys.todos })
    },
  })
}
