import { queryOptions } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'

type S = components['schemas']
export type TipoDocumentoOficial = S['TipoDocumentoOficial']
export type DocumentoOficial = S['DocumentoOficialDto']
export type TipoDisponivel = S['TipoDisponivelDto']
export type ConteudoDocumento = S['ConteudoDocumentoDto']

export const documentoOficialKeys = {
  todos: ['documentos-oficiais'] as const,
  doEstudante: (estudanteId: string) => ['documentos-oficiais', estudanteId] as const,
  preVisualizacao: (estudanteId: string, tipo: string, finalidade: string) =>
    ['documentos-oficiais', estudanteId, 'pre-visualizacao', tipo, finalidade] as const,
}

/** Tipos que se podem emitir (com a razão quando não) e o histórico de emitidos. */
export function documentosOficiaisQuery(estudanteId: string) {
  return queryOptions({
    queryKey: documentoOficialKeys.doEstudante(estudanteId),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/estudantes/{id}/documentos-oficiais', {
        params: { path: { id: estudanteId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/** Texto do documento gerado pelo servidor, para rever antes de emitir (guia 2.3). */
export function preVisualizacaoQuery(
  estudanteId: string,
  tipo: TipoDocumentoOficial | null,
  finalidade: string,
) {
  return queryOptions({
    queryKey: documentoOficialKeys.preVisualizacao(estudanteId, tipo ?? '', finalidade),
    queryFn: async ({ signal }) => {
      const { data } = await api.POST('/estudantes/{id}/documentos-oficiais/pre-visualizar', {
        params: { path: { id: estudanteId } },
        body: { tipo: tipo!, finalidade: finalidade || undefined },
        signal,
      })
      return data!
    },
    enabled: tipo !== null,
    staleTime: 60_000,
  })
}
