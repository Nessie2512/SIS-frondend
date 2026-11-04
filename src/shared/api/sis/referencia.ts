// shared/api/sis/referencia.ts — listas em bruto do backend SIS, partilhadas pelas entidades
import { queryOptions } from '@tanstack/react-query'
import { FRESCURA } from '@/shared/config/constantes'
import { ApiError } from '../api-error'
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
  niveis: (academicYearId: number, includeUnused = true) =>
    lista<NivelSis>(
      `academic-levels:${academicYearId}:${includeUnused}`,
      async (signal) =>
        (
          await apiSis.GET('/academic-levels', {
            params: {
              query: {
                academicYearId,
                includeUnused: includeUnused ? true : undefined,
              },
            },
            signal,
          })
        ).data!,
      FRESCURA.referencia,
    ),
  classes: (academicYearId: number, includeUnused = true) =>
    lista<ClasseSis>(
      `grades:${academicYearId}:${includeUnused}`,
      async (signal) =>
        (
          await apiSis.GET('/grades', {
            params: {
              query: {
                academicYearId,
                includeUnused: includeUnused ? true : undefined,
              },
            },
            signal,
          })
        ).data!,
      FRESCURA.referencia,
    ),
  turmas: (academicYearId: number) =>
    lista<TurmaSis>(
      `classes:${academicYearId}`,
      async (signal) =>
        (
          await apiSis.GET('/classes', {
            params: { query: { academicYearId } },
            signal,
          })
        ).data!,
      FRESCURA.lista,
    ),
  anos: () =>
    lista<AnoSis>(
      'academic-years',
      async (signal) => (await apiSis.GET('/academic-years', { signal })).data!,
      FRESCURA.referencia,
    ),
  disciplinas: (academicYearId: number, includeUnused = true) =>
    lista<DisciplinaSis>(
      `subjects:${academicYearId}:${includeUnused}`,
      async (signal) =>
        (
          await apiSis.GET('/subjects', {
            params: {
              query: {
                academicYearId,
                includeUnused: includeUnused ? true : undefined,
              },
            },
            signal,
          })
        ).data!,
      FRESCURA.referencia,
    ),
  estudantes: (academicYearId: number) =>
    lista<EstudanteSis>(
      `students:${academicYearId}`,
      async (signal) =>
        (
          await apiSis.GET('/students', {
            params: { query: { academicYearId } },
            signal,
          })
        ).data!,
      FRESCURA.lista,
    ),
  professores: (
    academicYearId: number,
    filtros: { includeUnused?: boolean; subjectId?: number } = { includeUnused: true },
  ) =>
    lista<ProfessorSis>(
      `teachers:${academicYearId}:${filtros.includeUnused ?? false}:${filtros.subjectId ?? ''}`,
      async (signal) =>
        (
          await apiSis.GET('/teachers', {
            params: {
              query: {
                academicYearId,
                includeUnused: filtros.includeUnused,
                subjectId: filtros.subjectId,
              },
            },
            signal,
          })
        ).data!,
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

/** Acção que o backend SIS ainda não tem: o ecrã diz "não disponível". `accao` é um código técnico (ex.: ENCERRAR_ANO). */
export function naoDisponivel(accao: string): never {
  throw new ApiError(501, { title: 'NAO_DISPONIVEL', code: 'NAO_DISPONIVEL', detail: accao })
}

/** Id numérico de um recurso do SIS a partir do uuid que a interface usa. */
export function idNumerico<T extends { id: number; uuid: string }>(
  itens: readonly T[],
  uuid: string,
): number {
  const item = itens.find((x) => x.uuid === uuid)
  if (!item) throw new ApiError(404, { title: 'REFERENCIA_NAO_ENCONTRADA', detail: uuid })
  return item.id
}
