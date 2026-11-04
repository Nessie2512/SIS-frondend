import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { apiSis, doAno, idDoAnoSis, referenciaSis, type EstudanteSis } from '@/shared/api/sis'
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
        // A ficha é do ano em contexto: o backend só a devolve a quem tem matrícula nesse ano
        const academicYearId = await idDoAnoSis(client)
        const { data } = await apiSis.GET('/students/{uuid}', {
          params: { path: { uuid: id }, ...doAno(academicYearId) },
          signal,
        })
        const dto = data as EstudanteSis
        // A matrícula activa no ano: classe e turma na ficha (GET /enrollments?studentId)
        const { data: matriculas } = await apiSis.GET('/enrollments', {
          params: {
            query: { academicYearId, studentId: dto.id, status: 'ACTIVE', pageSize: 1 },
          },
          signal,
        })
        return comMatriculaDoSis(paraEstudanteDoSis(dto), matriculas?.data[0])
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
        const { data } = await apiSis.GET('/students/{uuid}', {
          params: { path: { uuid: id }, ...doAno(await idDoAnoSis(client)) },
          signal,
        })
        return encarregadosDoSis(data as EstudanteSis)
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
 * Backend SIS: os estudantes com matrícula no ano (guia de integração, 1). Filtra-se aqui o que o estudante tem (pesquisa por
 * nome, código de estudante ou documento; estado; sexo); os filtros de matrícula (classe, sem
 * turma, documentos em falta) não têm dados e devolvem a lista vazia em vez de enganar.
 */
async function paginaDoSis(client: QueryClient, f: FiltrosEstudantes): Promise<PaginaEstudantes> {
  const todos = (await client.fetchQuery(referenciaSis.estudantes(f.anoLectivoId))).map(
    paraEstudanteDoSis,
  )
  const termo = f.pesquisa ? normalizarTexto(f.pesquisa) : ''
  const semDadosDeMatricula = Boolean(f.classeId || f.semTurma || f.documentosEmFalta)
  const filtrados = semDadosDeMatricula
    ? []
    : todos
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
