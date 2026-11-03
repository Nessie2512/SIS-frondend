// shared/api/sis/referencia.ts — listas em bruto do backend SIS, partilhadas pelas entidades
import { queryOptions } from '@tanstack/react-query'
import { FRESCURA } from '@/shared/config/constantes'
import { ApiError } from '../api-error'
import { apiSis, type DtoSis } from './client'

/**
 * O backend devolve as listas inteiras, sem paginação, e as entidades referem-se umas às outras
 * pelo id numérico (a turma tem gradeId, a classe tem academicLevelId). Cada lista é pedida uma
 * vez e partilhada: a entidade turma junta-a à das classes e à dos anos para montar o mesmo
 * modelo de vista que os ecrãs já usam.
 *
 * Guia de integração (03/11): as consultas académicas são por ano lectivo e exigem
 * `academicYearId` (o id numérico). Estudantes, turmas, docentes, classes, disciplinas e ciclos
 * pedem-se para o ano em contexto (o do cabeçalho), ou para um ano dado pelo uuid. Anos e
 * contas não dependem do ano.
 */
export const sisKeys = {
  todas: ['sis'] as const,
  lista: (recurso: string) => ['sis', recurso] as const,
}

let anoEmContexto: string | null = null

/** O ano lectivo do cabeçalho (uuid). Chamado pela entidade ano-lectivo quando muda. */
export function definirAnoSis(uuid: string | null) {
  anoEmContexto = uuid
}

/** uuid do ano em contexto, ou null sem nenhum ano (base de dados nova). */
export const anoSisEmContexto = () => anoEmContexto

function lista<T>(recurso: string, pedir: (signal: AbortSignal) => Promise<T[]>, frescura: number) {
  return queryOptions({
    queryKey: sisKeys.lista(recurso),
    queryFn: ({ signal }) => pedir(signal),
    staleTime: frescura,
  })
}

/**
 * Lista de um ano lectivo. A chave leva o uuid do ano; o id numérico que o backend pede
 * lê-se da lista dos anos. Sem ano (nenhum criado ainda), a lista é vazia sem ir ao servidor.
 */
function listaDoAno<T>(
  recurso: string,
  ano: string | null | undefined,
  pedir: (academicYearId: number, signal: AbortSignal) => Promise<T[] | undefined>,
  frescura: number,
) {
  const uuid = ano ?? anoEmContexto
  return queryOptions({
    queryKey: [...sisKeys.lista(recurso), uuid] as const,
    queryFn: async ({ signal, client }): Promise<T[]> => {
      if (!uuid) return []
      const anos = await client.fetchQuery(referenciaSis.anos())
      return (await pedir(idNumerico(anos, uuid), signal)) ?? []
    },
    staleTime: frescura,
  })
}

export type NivelSis = DtoSis<'AcademicLevelResponseDto'>
export type ClasseSis = DtoSis<'GradeResponseDto'>
export type TurmaSis = DtoSis<'ClassOutputDto'>
export type AnoSis = DtoSis<'AcademicYearOutputDto'>
export type DisciplinaSis = DtoSis<'SubjectResponseDto'>
/**
 * O Swagger tipa os campos opcionais como objecto vazio: o código do estudante só existe depois
 * da primeira matrícula directa (guia de integração, 2), e o prefixo de família pode faltar.
 */
export type EstudanteSis = Omit<DtoSis<'StudentOutputDto'>, 'studentCode' | 'familyPrefix'> & {
  studentCode?: string | null
  familyPrefix?: string | null
}
export type ProfessorSis = DtoSis<'TeacherOutputDto'>
export type UtilizadorSis = DtoSis<'UserOutputDto'>

/** `academicYearId` na query de uma consulta anual. */
export const doAno = (academicYearId: number) => ({ query: { academicYearId } })

/**
 * Catálogos (ciclos, classes, disciplinas): o backend só lista o que já tem turmas no ano;
 * includeUnused traz também o resto, para se poder criar a primeira turma de uma classe.
 */
const catalogoDoAno = (academicYearId: number) => ({
  query: { academicYearId, includeUnused: 'true' as const },
})

export const referenciaSis = {
  niveis: (ano?: string | null) =>
    listaDoAno<NivelSis>(
      'academic-levels',
      ano,
      async (id, signal) =>
        (await apiSis.GET('/academic-levels', { params: catalogoDoAno(id), signal })).data,
      FRESCURA.referencia,
    ),
  classes: (ano?: string | null) =>
    listaDoAno<ClasseSis>(
      'grades',
      ano,
      async (id, signal) =>
        (await apiSis.GET('/grades', { params: catalogoDoAno(id), signal })).data,
      FRESCURA.referencia,
    ),
  turmas: (ano?: string | null) =>
    listaDoAno<TurmaSis>(
      'classes',
      ano,
      async (id, signal) => (await apiSis.GET('/classes', { params: doAno(id), signal })).data,
      FRESCURA.lista,
    ),
  anos: () =>
    lista<AnoSis>(
      'academic-years',
      async (signal) => (await apiSis.GET('/academic-years', { signal })).data!,
      FRESCURA.referencia,
    ),
  disciplinas: (ano?: string | null) =>
    listaDoAno<DisciplinaSis>(
      'subjects',
      ano,
      async (id, signal) =>
        (await apiSis.GET('/subjects', { params: catalogoDoAno(id), signal })).data,
      FRESCURA.referencia,
    ),
  estudantes: (ano?: string | null) =>
    listaDoAno<EstudanteSis>(
      'students',
      ano,
      async (id, signal) =>
        (await apiSis.GET('/students', { params: doAno(id), signal })).data as
          EstudanteSis[] | undefined,
      FRESCURA.lista,
    ),
  professores: (ano?: string | null) =>
    listaDoAno<ProfessorSis>(
      'teachers',
      ano,
      async (id, signal) => (await apiSis.GET('/teachers', { params: doAno(id), signal })).data,
      FRESCURA.lista,
    ),
  /** Só o gestor de TI lista as contas (GET /users com @Roles('GESTOR_TI')). */
  utilizadores: () =>
    lista<UtilizadorSis>(
      'users',
      async (signal) => (await apiSis.GET('/users', { signal })).data!,
      FRESCURA.lista,
    ),
}

/** Id numérico do ano em contexto (ou do dado), para as consultas e escritas anuais. */
export async function idDoAnoSis(
  qc: { fetchQuery: (o: ReturnType<typeof referenciaSis.anos>) => Promise<AnoSis[]> },
  ano?: string | null,
): Promise<number> {
  const uuid = ano ?? anoEmContexto
  if (!uuid) throw new ApiError(404, { title: 'SEM_ANO_LECTIVO' })
  return idNumerico(await qc.fetchQuery(referenciaSis.anos()), uuid)
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
