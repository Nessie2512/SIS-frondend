import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { apiSis, idDoAnoSis, idNumerico, referenciaSis } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paginarLocal } from '@/shared/lib/paginacao-local'
import { paraMatriculaDoSis, paraPaginaMatriculas } from '../model/mapeadores'
import type { FiltrosMatriculas, PaginaMatriculas } from '../model/tipos'

export const matriculaKeys = {
  todas: ['matriculas'] as const,
  lista: (f: FiltrosMatriculas & { pageSize?: number }) =>
    [...matriculaKeys.todas, 'lista', f] as const,
}

export function matriculasQuery(
  filtros: FiltrosMatriculas,
  pageSize: number = PAGINACAO.porPagina,
) {
  return queryOptions({
    queryKey: matriculaKeys.lista({ ...filtros, pageSize }),
    queryFn: async ({ signal, client }) => {
      if (eReal('estudantes')) return paginaDoSis(client, filtros, pageSize, signal)
      const { data } = await api.GET('/matriculas', {
        params: { query: { ...filtros, pageSize } },
        signal,
      })
      return paraPaginaMatriculas(data!)
    },
    staleTime: FRESCURA.lista,
    placeholderData: keepPreviousData,
  })
}

const ESTADO_PARA_SIS = { CONFIRMADA: 'ACTIVE', ANULADA: 'CLOSED', CONCLUIDA: 'COMPLETED' } as const

/**
 * Backend SIS: GET /enrollments (paginado no servidor, pelo nome do estudante). «A confirmar»
 * são as confirmações pendentes de pagamento (GET /enrollments/confirmations). Toda a matrícula
 * do SIS tem turma: o filtro «sem turma» fica vazio.
 */
async function paginaDoSis(
  client: QueryClient,
  filtros: FiltrosMatriculas,
  pageSize: number,
  signal: AbortSignal,
): Promise<PaginaMatriculas> {
  const vazia: PaginaMatriculas = { matriculas: [], total: 0, page: 1, totalPaginas: 1 }
  if (filtros.semTurma) return vazia
  const academicYearId = await idDoAnoSis(client, filtros.anoLectivoId)
  const gradeId = filtros.classeId
    ? idNumerico(
        await client.fetchQuery(referenciaSis.classes(filtros.anoLectivoId)),
        filtros.classeId,
      )
    : undefined

  if (filtros.estado === 'PENDENTE') {
    const { data } = await apiSis.GET('/enrollments/confirmations', {
      params: { query: { academicYearId, gradeId, status: 'PENDING_PAYMENT' } },
      signal,
    })
    const pagina = paginarLocal((data ?? []).map(paraMatriculaDoSis), filtros.page, pageSize)
    return {
      matriculas: pagina.itens,
      total: pagina.total,
      page: pagina.page,
      totalPaginas: pagina.totalPaginas,
    }
  }

  const { data } = await apiSis.GET('/enrollments', {
    params: {
      query: {
        academicYearId,
        gradeId,
        status: filtros.estado ? ESTADO_PARA_SIS[filtros.estado] : undefined,
        page: filtros.page,
        pageSize,
      },
    },
    signal,
  })
  if (!data) return vazia
  return {
    matriculas: data.data.map(paraMatriculaDoSis),
    total: data.total,
    page: data.page,
    totalPaginas: data.totalPages,
  }
}
