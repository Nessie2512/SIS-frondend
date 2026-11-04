import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, novaChaveIdempotencia } from '@/shared/api'
import { apiSis, idNumerico, referenciaSis } from '@/shared/api/sis'
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
        if (!turmaId) {
          throw new ApiError(400, {
            title: i18n._(msg`Turma obrigatória`),
            detail: i18n._(msg`Escolha uma turma para concluir a matrícula.`),
          })
        }
        const anos = await qc.fetchQuery(referenciaSis.anos())
        const academicYearId = idNumerico(anos, anoLectivoId)
        const [classes, turmas, estudante] = await Promise.all([
          qc.fetchQuery(referenciaSis.classes(academicYearId, true)),
          qc.fetchQuery(referenciaSis.turmas(academicYearId)),
          apiSis
            .GET('/students/{uuid}', {
              params: { path: { uuid: estudanteId }, query: { academicYearId } },
            })
            .then((r) => r.data!),
        ])
        const turma = turmas.find((item) => item.uuid === turmaId)
        if (!turma || turma.gradeId !== idNumerico(classes, classeId)) {
          throw new ApiError(409, {
            title: i18n._(msg`Turma incompatível`),
            detail: i18n._(msg`A turma escolhida não pertence à classe selecionada.`),
            code: 'CLASS_ACADEMIC_YEAR_MISMATCH',
          })
        }
        await apiSis.POST('/enrollments', {
          body: { studentId: estudante.id, classId: turma.id, academicYearId },
        })
        return
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
