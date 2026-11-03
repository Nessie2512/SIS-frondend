import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/shared/api'
import {
  apiSis,
  porId,
  referenciaSis,
  sisKeys,
  type EstudanteSis,
  type TurmaSis,
} from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraInscrito, paraPaginaTurmas, paraTurma, paraTurmaDoSis } from '../model/mapeadores'
import type {
  DocenteTurma,
  FiltrosTurma,
  Inscrito,
  PaginaTurmas,
  ResultadoFinal,
  Turma,
} from '../model/tipos'

// Chaves organizadas e previsíveis (guia 4.6)
export const turmaKeys = {
  todas: ['turmas'] as const,
  lista: (f: FiltrosTurma) => [...turmaKeys.todas, 'lista', f] as const,
  detalhe: (id: string) => [...turmaKeys.todas, 'detalhe', id] as const,
  inscritos: (id: string) => [...turmaKeys.detalhe(id), 'inscritos'] as const,
  docentes: (id: string) => [...turmaKeys.detalhe(id), 'docentes'] as const,
  resultados: (id: string) => [...turmaKeys.detalhe(id), 'resultados'] as const,
}

export function turmasQuery(filtros: FiltrosTurma) {
  return queryOptions({
    queryKey: turmaKeys.lista(filtros),
    queryFn: async ({ signal, client }) => {
      if (eReal('turmas')) return paginaDoSis(client, filtros)
      const { data } = await api.GET('/turmas', {
        params: { query: { ...filtros, pageSize: PAGINACAO.porPagina } },
        signal,
      })
      return paraPaginaTurmas(data!)
    },
    staleTime: FRESCURA.lista,
    placeholderData: keepPreviousData, // evita ecrã em branco ao mudar filtro ou página
  })
}

export function turmaQuery(id: string) {
  return queryOptions({
    queryKey: turmaKeys.detalhe(id),
    queryFn: async ({ signal, client }) => {
      if (eReal('turmas')) {
        // Primeiro no ano em contexto; uma ligação para a turma de outro ano procura nos outros
        const noContexto = (await turmasDoSis(client)).find((t) => t.id === id)
        if (noContexto) return comOcupacao(client, noContexto, noContexto.anoLectivoId)
        for (const ano of await client.fetchQuery(referenciaSis.anos())) {
          const turma = (await turmasDoSis(client, ano.uuid)).find((t) => t.id === id)
          if (turma) return comOcupacao(client, turma, ano.uuid)
        }
        throw new ApiError(404, { title: 'TURMA_NAO_ENCONTRADA' })
      }
      const { data } = await api.GET('/turmas/{id}', { params: { path: { id } }, signal })
      return paraTurma(data!)
    },
    staleTime: FRESCURA.lista,
  })
}

export function inscritosQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.inscritos(turmaId),
    queryFn: async ({ signal, client }): Promise<Inscrito[]> => {
      if (eReal('turmas')) {
        // Backend SIS: os estudantes com matrícula na turma (GET /students?classId)
        const { turma } = await turmaSisPorUuid(client, turmaId)
        const { data } = await apiSis.GET('/students', {
          params: { query: { academicYearId: turma.academicYearId, classId: turma.id } },
          signal,
        })
        return ((data ?? []) as EstudanteSis[]).map((e) => ({
          matriculaId: e.uuid,
          estudanteId: e.uuid,
          turmaId,
          nome: e.name,
          numeroProcesso: e.studentCode ?? '',
          fotografiaUrl: null,
        }))
      }
      const { data } = await api.GET('/turmas/{id}/inscritos', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!.map(paraInscrito)
    },
    staleTime: FRESCURA.lista,
  })
}

/** Docentes da turma, uma linha por disciplina do plano vigente, com o histórico de cada uma. */
export function docentesQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.docentes(turmaId),
    queryFn: async ({ signal, client }): Promise<DocenteTurma[]> => {
      if (eReal('turmas')) return docentesDoSis(client, turmaId, signal)
      const { data } = await api.GET('/turmas/{id}/docentes', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!
    },
    staleTime: FRESCURA.lista,
  })
}

/** Resultados finais dos estudantes confirmados na turma (aprovado, reprovado ou por registar). */
export function resultadosQuery(turmaId: string) {
  return queryOptions({
    queryKey: turmaKeys.resultados(turmaId),
    queryFn: async ({ signal }): Promise<ResultadoFinal[]> => {
      const { data } = await api.GET('/turmas/{id}/resultados', {
        params: { path: { id: turmaId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/** Backend SIS: as turmas de um ano (o do contexto, por omissão), com a classe e o ano. */
async function turmasDoSis(
  client: QueryClient,
  ano?: string,
): Promise<(Turma & { anoLectivoId: string })[]> {
  const [turmas, classes, anos] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas(ano)),
    client.fetchQuery(referenciaSis.classes(ano)),
    client.fetchQuery(referenciaSis.anos()),
  ])
  const classePorId = porId(classes)
  const anoPorId = porId(anos)
  return turmas.map((t) => ({
    ...paraTurmaDoSis(t, classePorId.get(t.gradeId)),
    anoLectivoId: anoPorId.get(t.academicYearId)?.uuid ?? '',
  }))
}

/**
 * Inscritos numa turma: GET /students/reports/class conta os estudantes matriculados nela.
 * Guarda-se sob as chaves dos estudantes, para matricular ou anular actualizar a ocupação.
 */
function inscritosSisQuery(academicYearId: number, classId: number) {
  return queryOptions({
    queryKey: [...sisKeys.lista('students'), 'turma', classId] as const,
    queryFn: async ({ signal }) =>
      (
        await apiSis.GET('/students/reports/class', {
          params: { query: { academicYearId, classId } },
          signal,
        })
      ).data?.count ?? 0,
    staleTime: FRESCURA.lista,
  })
}

/** A turma com a ocupação real (lotação do backend e inscritos contados). */
async function comOcupacao<T extends Turma>(
  client: QueryClient,
  turma: T,
  ano: string,
): Promise<T> {
  const [turmas, classes] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas(ano)),
    client.fetchQuery(referenciaSis.classes(ano)),
  ])
  const dto = turmas.find((t) => t.uuid === turma.id)
  if (!dto) return turma
  const [inscritos, professores] = await Promise.all([
    client.fetchQuery(inscritosSisQuery(dto.academicYearId, dto.id)).catch(() => undefined),
    // O director de turma vem pelo id do professor: o nome está na lista do ano
    dto.classDirectorTeacherId != null
      ? client.fetchQuery(referenciaSis.professores(ano)).catch(() => undefined)
      : undefined,
  ])
  return {
    ...turma,
    ...paraTurmaDoSis(
      dto,
      classes.find((c) => c.id === dto.gradeId),
      inscritos,
      professores,
    ),
  }
}

/**
 * Backend SIS: a turma em bruto pelo uuid, no ano em contexto ou noutro, com o uuid do ano.
 * Serve às escritas, que pedem os ids numéricos e o updatedAt lido.
 */
export async function turmaSisPorUuid(
  client: QueryClient,
  uuid: string,
): Promise<{ turma: TurmaSis; ano: string }> {
  const noContexto = (await client.fetchQuery(referenciaSis.turmas())).find((t) => t.uuid === uuid)
  if (noContexto) {
    const anos = await client.fetchQuery(referenciaSis.anos())
    const ano = anos.find((a) => a.id === noContexto.academicYearId)?.uuid ?? ''
    return { turma: noContexto, ano }
  }
  for (const ano of await client.fetchQuery(referenciaSis.anos())) {
    const turma = (await client.fetchQuery(referenciaSis.turmas(ano.uuid))).find(
      (t) => t.uuid === uuid,
    )
    if (turma) return { turma, ano: ano.uuid }
  }
  throw new ApiError(404, { title: 'TURMA_NAO_ENCONTRADA' })
}

/** Sem filtros nem páginas no backend: filtra-se e pagina-se aqui, com as mesmas regras. */
async function paginaDoSis(client: QueryClient, filtros: FiltrosTurma): Promise<PaginaTurmas> {
  const todas = (await turmasDoSis(client, filtros.anoLectivoId))
    .filter((t) => t.anoLectivoId === filtros.anoLectivoId)
    .filter((t) => !filtros.classeId || t.classeId === filtros.classeId)
    .filter((t) => !filtros.turno || t.turno === filtros.turno)
    .filter((t) => t.encerrada === (filtros.estado === 'ENCERRADA'))
    .sort((a, b) => a.designacao.localeCompare(b.designacao, 'pt', { numeric: true }))
  const porPagina = PAGINACAO.porPagina
  const totalPaginas = Math.max(1, Math.ceil(todas.length / porPagina))
  const page = Math.min(Math.max(1, filtros.page), totalPaginas)
  const pagina = todas.slice((page - 1) * porPagina, page * porPagina)
  return {
    turmas: await Promise.all(
      pagina.map(({ anoLectivoId: _, ...t }) => comOcupacao(client, t, filtros.anoLectivoId)),
    ),
    total: todas.length,
    page,
    totalPaginas,
  }
}

/**
 * Backend SIS: uma linha por disciplina da classe da turma (subjectIds), com o professor
 * atribuído. Os docentes da turma pedem-se com o filtro classId (guia de integração, 1) e as
 * atribuições de cada um com o mesmo filtro. Sem data de início nem fim no backend: com várias
 * atribuições activas à mesma disciplina, a mais recente (id maior) é a actual e as outras
 * ficam no histórico.
 */
async function docentesDoSis(
  client: QueryClient,
  turmaId: string,
  signal: AbortSignal,
): Promise<DocenteTurma[]> {
  const [turmas, classes, disciplinas] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas()),
    client.fetchQuery(referenciaSis.classes()),
    client.fetchQuery(referenciaSis.disciplinas()),
  ])
  const turma = turmas.find((t) => t.uuid === turmaId)
  if (!turma) throw new ApiError(404, { title: 'TURMA_NAO_ENCONTRADA' })
  const classe = classes.find((c) => c.id === turma.gradeId)
  const disciplinaPorId = porId(disciplinas)
  const filtro = { academicYearId: turma.academicYearId, classId: turma.id }
  const { data: professores = [] } = await apiSis.GET('/teachers', {
    params: { query: filtro },
    signal,
  })
  const atribuicoes = (
    await Promise.all(
      professores
        .filter((p) => p.isActive)
        .map(async (p) => {
          const { data } = await apiSis.GET('/teachers/{uuid}/assignments', {
            params: { path: { uuid: p.uuid }, query: filtro },
            signal,
          })
          return (data ?? []).map((a) => ({ ...a, professor: p }))
        }),
    )
  )
    .flat()
    .filter((a) => a.isActive && a.classId === turma.id)
    .sort((a, b) => b.id - a.id)

  return (classe?.subjectIds ?? []).flatMap((numero) => {
    const disciplina = disciplinaPorId.get(numero)
    if (!disciplina) return []
    const [actual, ...anteriores] = atribuicoes.filter((a) => a.subjectId === numero)
    return [
      {
        disciplinaId: disciplina.uuid,
        disciplina: disciplina.name,
        sigla: disciplina.code,
        horasSemanais: 0,
        actual: actual
          ? {
              atribuicaoId: actual.uuid,
              professorId: actual.professor.uuid,
              professor: actual.professor.name,
              desde: '',
            }
          : null,
        historico: anteriores.map((a) => ({
          professor: a.professor.name,
          desde: '',
          ate: '',
          motivo: '',
        })),
      },
    ]
  })
}
