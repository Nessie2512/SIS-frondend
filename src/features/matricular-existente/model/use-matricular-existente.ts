import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, novaChaveIdempotencia } from '@/shared/api'

/**
 * Matricular no ano um estudante que já tem processo (reingresso, ou quem ficou de fora da
 * renovação): sem repetir dados pessoais nem encarregados (guia 2.4: uma pessoa, um processo).
 */
export function useMatricularExistente(estudanteId: string, anoLectivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['matriculas', 'existente', estudanteId],
    mutationFn: async ({ classeId, turmaId }: { classeId: string; turmaId: string | null }) => {
      const { data } = await api.POST('/matriculas', {
        params: { header: { 'Idempotency-Key': novaChaveIdempotencia() } },
        body: {
          anoLectivoId,
          estudanteId,
          classeId,
          turmaId: turmaId ?? undefined,
          encarregados: [],
          documentosEntregues: [],
        },
      })
      return data!
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
