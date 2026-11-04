import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { porId, referenciaSis } from '@/shared/api/sis'
import { FRESCURA, PAGINACAO } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paginarLocal } from '@/shared/lib/paginacao-local'
import {
  paraMatriculaDoSis,
  paraPaginaMatriculas,
  type ReferenciasMatricula,
} from '../model/mapeadores'
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
      if (eReal('estudantes')) return paginaDoSis(client, filtros, pageSize)
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

/**
 * Backend SIS: GET /enrollments devolve as matrículas do ano de uma vez (sem filtros nem
 * páginas); filtra-se, ordena-se pelo nome e pagina-se aqui. Toda a matrícula do SIS tem turma:
 * «sem turma» fica vazio. As confirmações pendentes não entram na lista (ainda sem rota para
 * as confirmar). Sem permissão para ler as matrículas, a lista fica vazia.
 */
async function paginaDoSis(
  client: QueryClient,
  filtros: FiltrosMatriculas,
  pageSize: number,
): Promise<PaginaMatriculas> {
  const vazia: PaginaMatriculas = { matriculas: [], total: 0, page: 1, totalPaginas: 1 }
  if (filtros.semTurma || filtros.estado === 'PENDENTE') return vazia
  const ano = filtros.anoLectivoId
  const [registos, turmas, classes, estudantes] = await Promise.all([
    client.fetchQuery(referenciaSis.matriculas(ano)),
    client.fetchQuery(referenciaSis.turmas(ano)),
    client.fetchQuery(referenciaSis.classes(ano)),
    client.fetchQuery(referenciaSis.estudantes(ano)),
  ])
  if (!registos) return vazia
  const turmaPorId = porId(turmas)
  const classePorId = porId(classes)
  const codigoPorUuid = new Map(estudantes.map((e) => [e.uuid, e.studentCode ?? null]))
  const ref: ReferenciasMatricula = {
    codigoDoEstudante: (uuid) => codigoPorUuid.get(uuid) ?? null,
    turma: (id) => {
      const t = turmaPorId.get(id)
      const c = t && classePorId.get(t.gradeId)
      return t && { uuid: t.uuid, classeId: c?.uuid ?? '', classe: c?.name ?? '' }
    },
  }
  const filtradas = registos.enrollments
    .map((m) => paraMatriculaDoSis(m, ref))
    .filter((m) => !filtros.classeId || m.classeId === filtros.classeId)
    .filter((m) => !filtros.estado || m.estado === filtros.estado)
    .sort((a, b) => a.estudanteNome.localeCompare(b.estudanteNome, 'pt'))
  const pagina = paginarLocal(filtradas, filtros.page, pageSize)
  return {
    matriculas: pagina.itens,
    total: pagina.total,
    page: pagina.page,
    totalPaginas: pagina.totalPaginas,
  }
}
