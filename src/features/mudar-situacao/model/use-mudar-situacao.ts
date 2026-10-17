import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'

export type AccaoSituacao = components['schemas']['AccaoSituacao']

/** Desistência, reingresso ou anulação do processo (guia 2.2): pessimista; recarrega tudo. */
export function useMudarSituacao(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['estudantes', estudanteId, 'situacao'],
    mutationFn: async (pedido: { accao: AccaoSituacao; data: string; motivo: string }) => {
      const { data } = await api.POST('/estudantes/{id}/situacao', {
        params: { path: { id: estudanteId } },
        body: pedido,
      })
      return data!
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
