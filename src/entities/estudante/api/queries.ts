import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import {
  paraDocumento,
  paraEncarregado,
  paraEstudante,
  paraEstudanteResumo,
  paraEventoPercurso,
  paraOcorrencia,
  paraPaginaEstudantes,
} from '../model/mapeadores'
import type { FiltrosEstudantes } from '../model/tipos'

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
    queryFn: async ({ signal }) => {
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
