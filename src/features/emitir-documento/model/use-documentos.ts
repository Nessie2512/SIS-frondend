import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentoOficialKeys, type TipoDocumentoOficial } from '@/entities/documento-oficial'
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
