import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraPlano, paraPlanoResumo } from '../model/mapeadores'

export const planoKeys = {
  todos: ['planos'] as const,
  daClasse: (classeId: string) => [...planoKeys.todos, 'classe', classeId] as const,
  detalhe: (id: string) => [...planoKeys.todos, 'detalhe', id] as const,
}

/** Versões do plano de uma classe, da mais recente para a mais antiga. */
export function planosQuery(classeId: string) {
  return queryOptions({
    queryKey: planoKeys.daClasse(classeId),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/planos', { params: { query: { classeId } }, signal })
      return data!.map(paraPlanoResumo)
    },
    staleTime: FRESCURA.referencia,
  })
}

export function planoQuery(id: string) {
  return queryOptions({
    queryKey: planoKeys.detalhe(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/planos/{id}', { params: { path: { id } }, signal })
      return paraPlano(data!)
    },
    staleTime: FRESCURA.lista,
  })
}
