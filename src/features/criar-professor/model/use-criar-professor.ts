import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professorKeys } from '@/entities/professor'
import { apiSis, sisKeys, type DtoSis, type ProfessorSis } from '@/shared/api/sis'
import { moradaParaSis, type DadosPessoa } from '@/shared/lib/pessoa'

type CriarProfessorSis = DtoSis<'CreateTeacherDto'>
export type AreaFormacao = CriarProfessorSis['teacherField']
export type Habilitacao = CriarProfessorSis['educationalAttainment']

export interface NovoProfessor extends DadosPessoa {
  area: AreaFormacao
  habilitacao: Habilitacao
  supervisor: boolean
}

/**
 * Backend SIS: POST /teachers (guia de integração, 4). O docente passa a ser também um
 * utilizador: o servidor gera o email da escola, o número de agente e a credencial inicial; o
 * corpo não leva email, palavra-passe nem ciclo. Devolve o docente criado.
 */
export function useCriarProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['professores', 'criar'],
    mutationFn: async (p: NovoProfessor) => {
      const { data } = await apiSis.POST('/teachers', {
        body: {
          name: p.nome.trim(),
          sex: p.sexo,
          birthDate: p.dataNascimento ?? '',
          address: moradaParaSis(p),
          nationality: p.nacionalidade.trim(),
          isSupervisor: p.supervisor,
          teacherField: p.area,
          educationalAttainment: p.habilitacao,
        },
      })
      return data as ProfessorSis | undefined
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('teachers') })
      await qc.invalidateQueries({ queryKey: professorKeys.todos })
    },
  })
}
