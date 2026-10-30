import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { apiSis, referenciaSis } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { normalizarTexto, ordenarLocal, paginarLocal } from '@/shared/lib/paginacao-local'
import {
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
    queryFn: async ({ signal }) => {
      if (eReal('estudantes')) {
        const { data } = await apiSis.GET('/students/{uuid}', {
          params: { path: { uuid: id } },
          signal,
        })
        return paraEstudanteDoSis(data!)
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
    queryFn: async ({ signal }) => {
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
    queryFn: async ({ signal }) => {
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
 * Backend SIS: lista inteira, sem matrículas. Filtra-se aqui o que o estudante tem (pesquisa por
 * nome, número de processo ou documento; estado; sexo); os filtros de matrícula (classe, sem
 * turma, documentos em falta) não têm dados e devolvem a lista vazia em vez de enganar.
 */
async function paginaDoSis(client: QueryClient, f: FiltrosEstudantes): Promise<PaginaEstudantes> {
  const todos = (await client.fetchQuery(referenciaSis.estudantes())).map(paraEstudanteDoSis)
  const termo = f.pesquisa ? normalizarTexto(f.pesquisa) : ''
  const semDadosDeMatricula = Boolean(f.classeId || f.semTurma || f.documentosEmFalta)
  const filtrados = semDadosDeMatricula
    ? []
    : todos
        .filter(
          (e) =>
            !termo ||
            normalizarTexto(e.nome).includes(termo) ||
            normalizarTexto(e.numeroProcesso).includes(termo) ||
            normalizarTexto(e.documentoIdentificacao ?? '').includes(termo),
        )
        .filter((e) => !f.estado || e.estado === f.estado)
        .filter((e) => !f.sexo || e.sexo === f.sexo)
  const ordenados = ordenarLocal(filtrados, f.ordenar ?? 'nome')
  const { itens, total, page, totalPaginas } = paginarLocal(ordenados, f.page, PAGINACAO.porPagina)
  return { estudantes: itens, total, page, totalPaginas }
}
