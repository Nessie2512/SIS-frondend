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

/**
 * Confirmar em lote (guia 7.1): o servidor confirma as que pode e diz porque recusou as outras.
 * A mesma Idempotency-Key é reutilizada se o mesmo gesto se repetir (guia 4.5).
 */
export function useConfirmarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['matriculas', 'confirmar-lote'],
    mutationFn: async ({ ids, chave }: { ids: string[]; chave: string }) => {
      const { data } = await api.POST('/matriculas/confirmar', {
        params: { header: { 'Idempotency-Key': chave } },
        body: { ids },
      })
      return {
        confirmadas: data!.confirmadas.map(paraMatricula),
        recusadas: data!.recusadas.map((r) => ({ ...r })),
      }
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: ['painel'] }),
      ]),
  })
}

/**
 * Anular a matrícula (guia 5.1): pessimista, com confirmação. Liberta o lugar na turma; a
 * ficha, as listas e a ocupação das turmas são recarregadas.
 */
export function useAnularMatricula() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['matriculas', 'anular'],
    mutationFn: async ({ matriculaId, motivo }: { matriculaId: string; motivo: string }) => {
      const { data } = await api.POST('/matriculas/{id}/anular', {
        params: { path: { id: matriculaId } },
        body: { motivo },
      })
      return paraMatricula(data!)
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
