import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'

type S = components['schemas']
export type TipoDocumentoOficial = S['TipoDocumentoOficial']
export type DocumentoOficial = S['DocumentoOficialDto']
export type TipoDisponivel = S['TipoDisponivelDto']
export type ConteudoDocumento = S['ConteudoDocumentoDto']
export type PedidoLote = S['PedidoLoteDto']
export type TipoLote = PedidoLote['tipo']
export type SimulacaoLote = S['SimulacaoLoteDto']

export type EstadoDocumentoOficial = DocumentoOficial['estado']

export interface FiltrosDocumentos {
  pesquisa?: string
  tipo?: TipoDocumentoOficial
  estado?: EstadoDocumentoOficial
  ordenar?: string
  page: number
}

export const documentoOficialKeys = {
  todos: ['documentos-oficiais'] as const,
  lista: (f: FiltrosDocumentos) => ['documentos-oficiais', 'lista', f] as const,
  simulacaoLote: (p: PedidoLote) => ['documentos-oficiais', 'lote', p] as const,
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

/** Todos os documentos emitidos na escola, com pesquisa e filtros (área Documentos, guia 2.5). */
export function documentosEmitidosQuery(filtros: FiltrosDocumentos) {
  return queryOptions({
    queryKey: documentoOficialKeys.lista(filtros),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/documentos-oficiais', {
        params: { query: { ...filtros, pageSize: PAGINACAO.porPagina } },
        signal,
      })
      const dto = data!
      return {
        documentos: dto.items,
        total: dto.total,
        page: dto.page,
        totalPaginas: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
      }
    },
    staleTime: filtros.pesquisa ? FRESCURA.pesquisa : FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}

/** Efeito da emissão em lote: quem recebe e quem fica de fora, com a razão (guia 5.1). */
export function simulacaoLoteQuery(pedido: PedidoLote | null) {
  return queryOptions({
    queryKey: documentoOficialKeys.simulacaoLote(
      pedido ?? { tipo: 'DECLARACAO_MATRICULA', turmaId: '' },
    ),
    queryFn: async ({ signal }) => {
      const { data } = await api.POST('/documentos-oficiais/lote/simular', {
        body: pedido!,
        signal,
      })
      return data!
    },
    enabled: pedido !== null,
    staleTime: 0,
  })
}
