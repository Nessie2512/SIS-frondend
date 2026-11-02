import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professorKeys } from '@/entities/professor'
import { apiSis, idNumerico, referenciaSis, sisKeys, type DtoSis } from '@/shared/api/sis'
import { moradaParaSis, type DadosPessoa } from '@/shared/lib/pessoa'

type CriarProfessorSis = DtoSis<'CreateTeacherDto'>
export type AreaFormacao = CriarProfessorSis['teacherField']
export type Habilitacao = CriarProfessorSis['educationalAttainment']

export interface NovoProfessor extends DadosPessoa {
  cicloId: string
  area: AreaFormacao
  habilitacao: Habilitacao
  supervisor: boolean
}

/** Backend SIS: POST /teachers; o ciclo vai pelo id numérico do nível académico. */
export function useCriarProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['professores', 'criar'],
    mutationFn: async (p: NovoProfessor) => {
      const niveis = await qc.fetchQuery(referenciaSis.niveis())
      await apiSis.POST('/teachers', {
        body: {
          name: p.nome.trim(),
          sex: p.sexo,
          birthDate: p.dataNascimento ?? '',
          address: moradaParaSis(p),
          nationality: p.nacionalidade.trim(),
          isSupervisor: p.supervisor,
          academicLevelId: idNumerico(niveis, p.cicloId),
          teacherField: p.area,
          educationalAttainment: p.habilitacao,
        },
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('teachers') })
      await qc.invalidateQueries({ queryKey: professorKeys.todos })
    },
  })
}
