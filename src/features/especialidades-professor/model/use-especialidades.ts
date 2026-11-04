import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professorKeys } from '@/entities/professor'
import { apiSis, idNumerico, referenciaSis, sisKeys } from '@/shared/api/sis'

/**
 * Backend SIS: PUT /teachers/{uuid}/specialties substitui as disciplinas que o professor pode
 * leccionar. Só nessas se lhe atribui turma.
 */
export function useAlterarEspecialidades(professorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['professores', professorId, 'especialidades'],
    mutationFn: async (disciplinasUuid: string[]) => {
      const disciplinas = await qc.fetchQuery(referenciaSis.disciplinas())
      await apiSis.PUT('/teachers/{uuid}/specialties', {
        params: { path: { uuid: professorId } },
        body: {
          specialtySubjectIds: disciplinasUuid.map((uuid) => idNumerico(disciplinas, uuid)),
        },
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('teachers') })
      await qc.invalidateQueries({ queryKey: professorKeys.todos })
    },
  })
}
