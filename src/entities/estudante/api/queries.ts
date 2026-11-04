import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/shared/api'
import {
  apiSis,
  doAno,
  idDoAnoSis,
  porId,
  referenciaSis,
  type EstudanteSis,
} from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { normalizarTexto, ordenarLocal, paginarLocal } from '@/shared/lib/paginacao-local'
import {
  comMatriculaDoSis,
  encarregadosDoSis,
  paraDocumento,
  paraEncarregado,
  paraEstudante,
  paraEstudanteResumo,
  paraEventoPercurso,
  paraOcorrencia,
  paraEstudanteDoSis,
  paraPaginaEstudantes,
} from '../model/mapeadores'
import type { MatriculaDoAno } from '../model/mapeadores'
import type { FiltrosEstudantes, PaginaEstudantes } from '../model/tipos'

export const estudanteKeys = {
  todos: ['estudantes'] as const,
  lista: (f: FiltrosEstudantes) => [...estudanteKeys.todos, 'lista', f] as const,
  detalhe: (id: string) => [...estudanteKeys.todos, 'detalhe', id] as const,
  percurso: (id: string) => [...estudanteKeys.detalhe(id), 'percurso'] as const,
  documentos: (id: string) => [...estudanteKeys.detalhe(id), 'documentos'] as const,
  encarregados: (id: string) => [...estudanteKeys.detalhe(id), 'encarregados'] as const,
  ocorrencias: (id: string) => [...estudanteKeys.detalhe(id), 'ocorrencias'] as const,
  duplicados: (nome: string, dataNascimento?: string) =>
    [...estudanteKeys.todos, 'duplicados', nome, dataNascimento ?? ''] as const,
}

export function estudantesQuery(filtros: FiltrosEstudantes) {
  return queryOptions({
    queryKey: estudanteKeys.lista(filtros),
    queryFn: async ({ signal, client }) => {
      if (eReal('estudantes')) return paginaDoSis(client, filtros)
      const { data } = await api.GET('/estudantes', {
        params: { query: { ...filtros, pageSize: PAGINACAO.porPagina } },
        signal,
      })
      return paraPaginaEstudantes(data!)
    },
    // Pesquisa sem cache, com os resultados anteriores à vista (guia 5.6)
    staleTime: filtros.pesquisa ? FRESCURA.pesquisa : FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}

export function estudanteQuery(id: string) {
  return queryOptions({
    queryKey: estudanteKeys.detalhe(id),
    queryFn: async ({ signal, client }) => {
      if (eReal('estudantes')) {
        // A ficha do ano em contexto; com a matrícula do ano (GET /enrollments)
        const [dto, situacao] = await Promise.all([
          estudanteDoSis(client, id, signal),
          situacoesDoAno(client),
        ])
        return comMatriculaDoSis(paraEstudanteDoSis(dto), situacao?.(dto.uuid))
      }
      const { data } = await api.GET('/estudantes/{id}', { params: { path: { id } }, signal })
      return paraEstudante(data!)
    },
    staleTime: FRESCURA.lista,
  })
}

export function percursoQuery(id: string) {
  return queryOptions({
    queryKey: estudanteKeys.percurso(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/estudantes/{id}/percurso', {
        params: { path: { id } },
        signal,
      })
      return data!.map(paraEventoPercurso)
    },
    staleTime: FRESCURA.lista,
  })
}

export function documentosQuery(id: string) {
  return queryOptions({
    queryKey: estudanteKeys.documentos(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/estudantes/{id}/documentos', {
        params: { path: { id } },
        signal,
      })
      return data!.map(paraDocumento)
    },
    staleTime: FRESCURA.lista,
  })
}

export function encarregadosQuery(id: string) {
  return queryOptions({
    queryKey: estudanteKeys.encarregados(id),
    queryFn: async ({ signal, client }) => {
      if (eReal('estudantes')) {
        // Backend SIS: pai e mãe vêm na ficha do estudante (só leitura)
        return encarregadosDoSis(await estudanteDoSis(client, id, signal))
      }
      const { data } = await api.GET('/estudantes/{id}/encarregados', {
        params: { path: { id } },
        signal,
      })
      return data!.map(paraEncarregado)
    },
    staleTime: FRESCURA.lista,
  })
}

/** Possíveis duplicados enquanto se escreve o nome (guia 2.4, 6.3). */
export function duplicadosQuery(nome: string, dataNascimento?: string) {
  return queryOptions({
    queryKey: estudanteKeys.duplicados(nome, dataNascimento),
    queryFn: async ({ signal, client }) => {
      if (eReal('estudantes')) {
        const todos = await client.fetchQuery(referenciaSis.estudantes())
        return possiveisDuplicados(todos.map(paraEstudanteDoSis), nome, dataNascimento)
      }
      const { data } = await api.GET('/estudantes/duplicados', {
        params: { query: { nome, dataNascimento } },
        signal,
      })
      return data!.map(paraEstudanteResumo)
    },
    enabled: nome.trim().length >= 5,
    staleTime: FRESCURA.pesquisa,
  })
}

export function ocorrenciasQuery(id: string) {
  return queryOptions({
    queryKey: estudanteKeys.ocorrencias(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/estudantes/{id}/ocorrencias', {
        params: { path: { id } },
        signal,
      })
      return data!.map(paraOcorrencia)
    },
    staleTime: FRESCURA.lista,
  })
}

/**
 * Backend SIS: todos os estudantes do ano, matriculados ou não (includeUnused), com a matrícula
 * de cada um lida de GET /enrollments. Filtra-se aqui: pesquisa por nome, código ou documento;
 * estado; sexo; classe (pela turma da matrícula). «Sem turma» e «documentos em falta» não têm
 * dados no SIS e devolvem a lista vazia em vez de enganar.
 */
async function paginaDoSis(client: QueryClient, f: FiltrosEstudantes): Promise<PaginaEstudantes> {
  const [lista, situacao, classeDaTurma] = await Promise.all([
    client.fetchQuery(referenciaSis.estudantes(f.anoLectivoId)),
    situacoesDoAno(client, f.anoLectivoId),
    classesDasTurmas(client, f.anoLectivoId),
  ])
  const todos = lista.map((dto) => comMatriculaDoSis(paraEstudanteDoSis(dto), situacao?.(dto.uuid)))
  const termo = f.pesquisa ? normalizarTexto(f.pesquisa) : ''
  // No SIS toda a matrícula tem turma, e não há documentos: estes filtros ficam vazios
  const semDados = Boolean(f.semTurma || f.documentosEmFalta || (f.classeId && !situacao))
  const filtrados = semDados
    ? []
    : todos
        .filter(
          (e) => !f.classeId || (e.turmaId !== null && classeDaTurma(e.turmaId) === f.classeId),
        )
        .filter(
          (e) =>
            !termo ||
            normalizarTexto(e.nome).includes(termo) ||
            normalizarTexto(e.numeroProcesso ?? '').includes(termo) ||
            normalizarTexto(e.documentoIdentificacao ?? '').includes(termo),
        )
        .filter((e) => !f.estado || e.estado === f.estado)
        .filter((e) => !f.sexo || e.sexo === f.sexo)
  const ordenados = ordenarLocal(filtrados, f.ordenar ?? 'nome')
  const { itens, total, page, totalPaginas } = paginarLocal(ordenados, f.page, PAGINACAO.porPagina)
  return { estudantes: itens, total, page, totalPaginas }
}

/**
 * Backend SIS (sem endpoint de duplicados): possíveis duplicados no cliente. Conta como
 * candidato o mesmo nome completo, ou o primeiro e o último nome iguais com a mesma data de
 * nascimento. Sem acentos nem maiúsculas.
 */
export function possiveisDuplicados<T extends { nome: string; dataNascimento: string }>(
  estudantes: readonly T[],
  nome: string,
  dataNascimento?: string,
): T[] {
  const partes = normalizarTexto(nome).split(/\s+/).filter(Boolean)
  if (partes.length < 2) return []
  const completo = partes.join(' ')
  const extremos = `${partes[0]} ${partes.at(-1)}`
  return estudantes.filter((e) => {
    const outras = normalizarTexto(e.nome).split(/\s+/).filter(Boolean)
    if (outras.join(' ') === completo) return true
    return (
      Boolean(dataNascimento) &&
      e.dataNascimento === dataNascimento &&
      `${outras[0]} ${outras.at(-1)}` === extremos
    )
  })
}

/**
 * Backend SIS: a ficha do estudante. GET /students/{uuid} só encontra quem tem matrícula no ano
 * (o backend ignora includeUnused na ficha); quem ainda não a tem lê-se da lista do ano, que o
 * inclui.
 */
async function estudanteDoSis(
  client: QueryClient,
  uuid: string,
  signal: AbortSignal,
): Promise<EstudanteSis> {
  try {
    const { data } = await apiSis.GET('/students/{uuid}', {
      params: { path: { uuid }, ...doAno(await idDoAnoSis(client)) },
      signal,
    })
    return data as EstudanteSis
  } catch (erro) {
    if (!(erro instanceof ApiError) || erro.status !== 404) throw erro
    const doContexto = await client.fetchQuery({ ...referenciaSis.estudantes(), staleTime: 0 })
    const achado = doContexto.find((e) => e.uuid === uuid)
    if (!achado) throw erro
    return achado
  }
}

/** uuid da turma → uuid da classe, no ano dado (ou no do contexto). */
async function classesDasTurmas(client: QueryClient, ano?: string) {
  const [turmas, classes] = await Promise.all([
    client.fetchQuery(referenciaSis.turmas(ano)),
    client.fetchQuery(referenciaSis.classes(ano)),
  ])
  const classePorId = porId(classes)
  const porTurma = new Map(turmas.map((t) => [t.uuid, classePorId.get(t.gradeId)?.uuid]))
  return (turmaUuid: string) => porTurma.get(turmaUuid)
}

/** Preferência entre várias matrículas do mesmo estudante no ano: a activa, depois a concluída. */
const ORDEM_ESTADO = { ACTIVE: 0, COMPLETED: 1, CLOSED: 2 } as const

/**
 * A situação de cada estudante no ano, a partir de GET /enrollments (um pedido para o ano
 * todo). Devolve null quando o perfil não pode ler as matrículas.
 */
async function situacoesDoAno(client: QueryClient, ano?: string) {
  const [registos, turmas, classes] = await Promise.all([
    client.fetchQuery(referenciaSis.matriculas(ano)),
    client.fetchQuery(referenciaSis.turmas(ano)),
    client.fetchQuery(referenciaSis.classes(ano)),
  ])
  if (!registos) return null
  const turmaPorId = porId(turmas)
  const classePorId = porId(classes)
  const porEstudante = new Map<string, MatriculaDoAno>()
  const melhores = [...registos.enrollments]
    .filter((m) => m.lifecycleStatus !== 'CLOSED')
    .sort((a, b) => ORDEM_ESTADO[a.lifecycleStatus] - ORDEM_ESTADO[b.lifecycleStatus])
  for (const m of melhores) {
    if (porEstudante.has(m.studentUuid)) continue
    const turma = turmaPorId.get(m.classId)
    const classe = turma ? classePorId.get(turma.gradeId)?.name : undefined
    porEstudante.set(m.studentUuid, {
      matriculaId: m.uuid,
      turmaId: turma?.uuid ?? '',
      rotulo: classe ? `${classe} · ${m.className}` : m.className,
    })
  }
  const pendentes = new Set(
    registos.confirmations
      .filter((c) => c.confirmationStatus === 'PENDING_PAYMENT')
      .map((c) => c.studentUuid),
  )
  return (estudanteUuid: string) => ({
    matricula: porEstudante.get(estudanteUuid) ?? null,
    pendente: pendentes.has(estudanteUuid),
  })
}
