import { useMutation, useQueryClient } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { matricularSis } from '@/entities/estudante'
import { api, ApiError, novaChaveIdempotencia } from '@/shared/api'
import { eReal } from '@/shared/config/ligacao'

/**
 * Matricular no ano um estudante que já tem processo (reingresso, ou quem ficou de fora da
 * renovação): sem repetir dados pessoais nem encarregados (guia 2.4: uma pessoa, um processo).
 */
export function useMatricularExistente(estudanteId: string, anoLectivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['matriculas', 'existente', estudanteId],
    mutationFn: async ({ classeId, turmaId }: { classeId: string; turmaId: string | null }) => {
      if (eReal('estudantes')) {
        // Backend SIS: matricular é inscrever numa turma (POST /enrollments)
        if (!turmaId) {
          throw new ApiError(422, {
            title: 'TURMA_OBRIGATORIA',
            errors: [
              {
                campo: 'turmaId',
                mensagem: i18n._(msg`O servidor só matricula numa turma. Escolha a turma.`),
              },
            ],
          })
        }
        await matricularSis(qc, {
          estudante: estudanteId,
          turmaId,
          anoLectivoId,
          classeId,
        })
        return null
      }
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
