import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys } from '@/entities/matricula'
import { turmaKeys } from '@/entities/turma'
import { api } from '@/shared/api'
import { naoDisponivel } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'

export interface PedidoTransferencia {
  escolaDestino: string
  data: string
  motivo?: string
}

/**
 * Transferência de saída (guia 2.3, 5.1): pessimista. Anula a matrícula, liberta o lugar na
 * turma e muda o estado do estudante; a ficha, as listas e a ocupação das turmas são recarregadas.
 */
export function useTransferirEstudante(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['estudantes', estudanteId, 'transferir'],
    mutationFn: async (pedido: PedidoTransferencia) => {
      if (eReal('estudantes')) naoDisponivel('TRANSFERENCIA_SAIDA')
      const { data } = await api.POST('/estudantes/{id}/transferir', {
        params: { path: { id: estudanteId } },
        body: pedido,
      })
      return data!
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: turmaKeys.todas }),
      ]),
  })
}
