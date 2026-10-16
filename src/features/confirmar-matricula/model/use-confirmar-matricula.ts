import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys, paraMatricula } from '@/entities/matricula'
import { api } from '@/shared/api'

/**
 * Confirmar uma matrícula (guia 2.4): o servidor só aceita com os documentos obrigatórios
 * entregues. Semi-optimista: o botão mostra que está a guardar e o estado muda à resposta.
 */
export function useConfirmarMatricula() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['matriculas', 'confirmar'],
    mutationFn: async (matriculaId: string) => {
      const { data } = await api.POST('/matriculas/{id}/confirmar', {
        params: { path: { id: matriculaId } },
      })
      return paraMatricula(data!)
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: ['painel'] }),
      ]),
  })
}
