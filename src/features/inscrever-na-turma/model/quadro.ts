import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  paraInscrito,
  paraPaginaTurmas,
  paraTurmaDoSis,
  type Inscrito,
  type Turma,
} from '@/entities/turma'
import { api } from '@/shared/api'
import { apiSis, idNumerico, referenciaSis, type EstudanteSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'

/** Coluna "sem turma" do quadro. */
export const SEM_TURMA = 'sem-turma'

export interface Quadro {
  turmas: Turma[]
  /** Cartões por coluna: id da turma ou SEM_TURMA */
  colunas: Record<string, Inscrito[]>
}

export const quadroKeys = {
  todos: ['quadro-turmas'] as const,
  classe: (anoLectivoId: string, classeId: string) =>
    [...quadroKeys.todos, anoLectivoId, classeId] as const,
}

const porNome = (a: Inscrito, b: Inscrito) => a.nome.localeCompare(b.nome, 'pt')

/**
 * Quadro da distribuição (guia 2.3, 6.3): turmas activas de uma classe, os inscritos em cada uma
 * e as matrículas sem turma. Compõe turma e matrícula, por isso vive numa feature.
 */
export function quadroQuery(anoLectivoId: string, classeId: string) {
  return queryOptions({
    queryKey: quadroKeys.classe(anoLectivoId, classeId),
    queryFn: async ({ signal, client }): Promise<Quadro> => {
      if (eReal('turmas')) return quadroDoSis(client, anoLectivoId, classeId, signal)
      const [respostaTurmas, respostaSemTurma] = await Promise.all([
        api.GET('/turmas', {
          params: { query: { anoLectivoId, classeId, estado: 'ACTIVA', pageSize: 100 } },
          signal,
        }),
        api.GET('/matriculas', {
          params: { query: { anoLectivoId, classeId, semTurma: true, pageSize: 100 } },
          signal,
        }),
      ])
      const turmas = paraPaginaTurmas(respostaTurmas.data!).turmas
      const inscritos = await Promise.all(
        turmas.map((t) =>
          api.GET('/turmas/{id}/inscritos', { params: { path: { id: t.id } }, signal }),
        ),
      )
      const colunas: Record<string, Inscrito[]> = {
        [SEM_TURMA]: respostaSemTurma
          .data!.items.map((m) => ({
            matriculaId: m.id,
            estudanteId: m.estudanteId,
            turmaId: null,
            nome: m.estudanteNome,
            numeroProcesso: m.numeroProcesso,
            fotografiaUrl: null,
            porConfirmar: m.estado === 'PENDENTE',
          }))
          .sort(porNome),
      }
      turmas.forEach(
        (t, i) => (colunas[t.id] = inscritos[i]!.data!.map(paraInscrito).sort(porNome)),
      )
      return { turmas, colunas }
    },
    staleTime: FRESCURA.lista,
  })
}

/**
 * Backend SIS: os inscritos de cada turma são os estudantes com matrícula nela
 * (GET /students?classId=…). Sem turma ficam os estudantes do ano que não estão em nenhuma
 * turma (registados sem matrícula); o servidor não guarda a classe pretendida, por isso
 * aparecem em todas as classes. Já matriculado, um estudante não muda de turma: não há rota.
 */
async function quadroDoSis(
  client: QueryClient,
  anoLectivoId: string,
  classeId: string,
  signal: AbortSignal,
): Promise<Quadro> {
  const [turmas, classes, anos, estudantes] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas(anoLectivoId)),
    client.fetchQuery(referenciaSis.classes(anoLectivoId)),
    client.fetchQuery(referenciaSis.anos()),
    client.fetchQuery({ ...referenciaSis.estudantes(anoLectivoId), staleTime: 0 }),
  ])
  const academicYearId = idNumerico(anos, anoLectivoId)
  const classe = classes.find((c) => c.uuid === classeId)
  const doAno = turmas.filter((t) => t.academicYearId === academicYearId && t.isActive)
  const porTurma = await Promise.all(
    doAno.map(async (t) => {
      const { data } = await apiSis.GET('/students', {
        params: { query: { academicYearId, classId: t.id } },
        signal,
      })
      return [t, (data ?? []) as EstudanteSis[]] as const
    }),
  )
  const comTurma = new Set(porTurma.flatMap(([, lista]) => lista.map((e) => e.uuid)))
  const cartao = (e: EstudanteSis, turmaId: string | null): Inscrito => ({
    matriculaId: e.uuid,
    estudanteId: e.uuid,
    turmaId,
    nome: e.name,
    numeroProcesso: e.studentCode ?? '',
    fotografiaUrl: null,
    fixo: turmaId !== null,
  })
  const daClasse = porTurma.filter(([t]) => t.gradeId === classe?.id)
  const colunas: Record<string, Inscrito[]> = {
    [SEM_TURMA]: estudantes
      .filter((e) => e.isActive && !comTurma.has(e.uuid))
      .map((e) => cartao(e, null))
      .sort(porNome),
  }
  for (const [t, lista] of daClasse)
    colunas[t.uuid] = lista.map((e) => cartao(e, t.uuid)).sort(porNome)
  return {
    turmas: daClasse.map(([t, lista]) => paraTurmaDoSis(t, classe, lista.length)),
    colunas,
  }
}

/** Move um cartão entre colunas (para a actualização optimista). */
export function moverCartao(
  quadro: Quadro,
  matriculaId: string,
  origem: string,
  destino: string,
): Quadro {
  const cartao = quadro.colunas[origem]?.find((c) => c.matriculaId === matriculaId)
  if (!cartao) return quadro
  return {
    ...quadro,
    colunas: {
      ...quadro.colunas,
      [origem]: quadro.colunas[origem]!.filter((c) => c.matriculaId !== matriculaId),
      [destino]: [
        ...(quadro.colunas[destino] ?? []),
        { ...cartao, turmaId: destino === SEM_TURMA ? null : destino },
      ].sort(porNome),
    },
  }
}

export const lotacao = (quadro: Quadro, turmaId: string) => {
  const turma = quadro.turmas.find((t) => t.id === turmaId)
  const inscritos = quadro.colunas[turmaId]?.length ?? 0
  return { turma, inscritos, cheia: turma ? inscritos >= turma.lotacaoMaxima : false }
}
