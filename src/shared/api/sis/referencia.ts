// shared/api/sis/referencia.ts — listas em bruto do backend SIS, partilhadas pelas entidades
import { queryOptions } from '@tanstack/react-query'
import { FRESCURA } from '@/shared/config/constantes'
import { apiSis, type DtoSis } from './client'

/**
 * O backend devolve as listas inteiras, sem paginação nem filtros, e as entidades referem-se
 * umas às outras pelo id numérico (a turma tem gradeId, a classe tem academicLevelId). Cada
 * lista é pedida uma vez e partilhada: a entidade turma junta-a à das classes e à dos anos para
 * montar o mesmo modelo de vista que os ecrãs já usam.
 */
export const sisKeys = {
  todas: ['sis'] as const,
  lista: (recurso: string) => ['sis', recurso] as const,
}

function lista<T>(recurso: string, pedir: (signal: AbortSignal) => Promise<T[]>, frescura: number) {
  return queryOptions({
    queryKey: sisKeys.lista(recurso),
    queryFn: ({ signal }) => pedir(signal),
    staleTime: frescura,
  })
}

export type NivelSis = DtoSis<'AcademicLevelResponseDto'>
export type ClasseSis = DtoSis<'GradeResponseDto'>
export type TurmaSis = DtoSis<'ClassOutputDto'>
export type AnoSis = DtoSis<'AcademicYearOutputDto'>
export type DisciplinaSis = DtoSis<'SubjectResponseDto'>
export type EstudanteSis = DtoSis<'StudentOutputDto'>
export type ProfessorSis = DtoSis<'TeacherOutputDto'>
export type UtilizadorSis = DtoSis<'UserOutputDto'>

export const referenciaSis = {
  niveis: () =>
    lista<NivelSis>(
      'academic-levels',
      async (signal) => (await apiSis.GET('/academic-levels', { signal })).data!,
      FRESCURA.referencia,
    ),
  classes: () =>
    lista<ClasseSis>(
      'grades',
      async (signal) => (await apiSis.GET('/grades', { signal })).data!,
      FRESCURA.referencia,
    ),
  turmas: () =>
    lista<TurmaSis>(
      'classes',
      async (signal) => (await apiSis.GET('/classes', { signal })).data!,
      FRESCURA.lista,
    ),
  anos: () =>
    lista<AnoSis>(
      'academic-years',
      async (signal) => (await apiSis.GET('/academic-years', { signal })).data!,
      FRESCURA.referencia,
    ),
  disciplinas: () =>
    lista<DisciplinaSis>(
      'subjects',
      async (signal) => (await apiSis.GET('/subjects', { signal })).data!,
      FRESCURA.referencia,
    ),
  estudantes: () =>
    lista<EstudanteSis>(
      'students',
      async (signal) => (await apiSis.GET('/students', { signal })).data!,
      FRESCURA.lista,
    ),
  professores: () =>
    lista<ProfessorSis>(
      'teachers',
      async (signal) => (await apiSis.GET('/teachers', { signal })).data!,
      FRESCURA.lista,
    ),
  utilizadores: () =>
    lista<UtilizadorSis>(
      'users',
      async (signal) => (await apiSis.GET('/users', { signal })).data!,
      FRESCURA.lista,
    ),
}

/** Índice por id numérico, para seguir as referências entre recursos. */
export function porId<T extends { id: number }>(itens: readonly T[]): Map<number, T> {
  return new Map(itens.map((item) => [item.id, item]))
}
