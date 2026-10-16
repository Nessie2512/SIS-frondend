import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraConta, paraEntradaAuditoria } from '../model/mapeadores'
import type { FiltrosAuditoria, FiltrosContas, PaginaAuditoria } from '../model/tipos'

const TAMANHO_PAGINA = 25

export const administracaoKeys = {
  todos: ['administracao'] as const,
  perfis: ['administracao', 'perfis'] as const,
  contas: () => ['administracao', 'contas'] as const,
  listaContas: (f: FiltrosContas) => ['administracao', 'contas', f] as const,
  auditoria: (f: FiltrosAuditoria) => ['administracao', 'auditoria', f] as const,
}

export function perfisQuery() {
  return queryOptions({
    queryKey: administracaoKeys.perfis,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/perfis', { signal })
      return data!
    },
    staleTime: FRESCURA.referencia,
  })
}

export function contasQuery(filtros: FiltrosContas) {
  return queryOptions({
    queryKey: administracaoKeys.listaContas(filtros),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/utilizadores', { params: { query: filtros }, signal })
      return data!.map(paraConta)
    },
    staleTime: FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}

/** Registo de auditoria: só leitura, do mais recente para o mais antigo. */
export function auditoriaQuery(filtros: FiltrosAuditoria) {
  return queryOptions({
    queryKey: administracaoKeys.auditoria(filtros),
    queryFn: async ({ signal }): Promise<PaginaAuditoria> => {
      const { data } = await api.GET('/auditoria', {
        params: { query: { ...filtros, pageSize: TAMANHO_PAGINA } },
        signal,
      })
      return {
        entradas: data!.items.map(paraEntradaAuditoria),
        total: data!.total,
        page: data!.page,
        totalPaginas: Math.max(1, Math.ceil(data!.total / TAMANHO_PAGINA)),
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}
