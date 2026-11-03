import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useContextoAno } from '@/entities/ano-lectivo'
import { estudantesQuery, paraEstudanteResumo, type EstudanteResumo } from '@/entities/estudante'
import { paraTurma, turmasQuery, type Turma } from '@/entities/turma'
import { api } from '@/shared/api'
import { FRESCURA, TEMPOS } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { normalizarTexto } from '@/shared/lib/paginacao-local'
import { usePode } from '@/shared/lib/permissoes'

interface ResultadosPesquisa {
  estudantes: EstudanteResumo[]
  turmas: Turma[]
}

export const MINIMO_PESQUISA = 2

/** O que o utilizador pode ver: a pesquisa não mostra resultados de áreas que não abre. */
export interface AlcancePesquisa {
  estudantes: boolean
  turmas: boolean
}

const TODOS: AlcancePesquisa = { estudantes: true, turmas: true }
const POR_TIPO = 5

export const pesquisaKeys = {
  todas: ['pesquisa'] as const,
  termo: (anoLectivoId: string, q: string, alcance: AlcancePesquisa = TODOS) =>
    [...pesquisaKeys.todas, anoLectivoId, q, alcance] as const,
}

export function pesquisaQuery(anoLectivoId: string, q: string, alcance: AlcancePesquisa = TODOS) {
  return queryOptions({
    queryKey: pesquisaKeys.termo(anoLectivoId, q, alcance),
    queryFn: async ({ signal, client }): Promise<ResultadosPesquisa> => {
      // Backend SIS: não há pesquisa global; usam-se as listas do ano, já em cache
      if (eReal('estudantes')) {
        const termo = normalizarTexto(q)
        const [estudantes, turmas] = await Promise.all([
          alcance.estudantes
            ? client.fetchQuery(estudantesQuery({ anoLectivoId, pesquisa: q, page: 1 }))
            : null,
          alcance.turmas
            ? client.fetchQuery(turmasQuery({ anoLectivoId, estado: 'ACTIVA', page: 1 }))
            : null,
        ])
        return {
          estudantes: estudantes?.estudantes.slice(0, POR_TIPO) ?? [],
          turmas: (turmas?.turmas ?? [])
            .filter((t) => normalizarTexto(t.designacao).includes(termo))
            .slice(0, POR_TIPO),
        }
      }
      const { data } = await api.GET('/pesquisa', {
        params: { query: { q, anoLectivoId } },
        signal,
      })
      return {
        estudantes: alcance.estudantes ? data!.estudantes.map(paraEstudanteResumo) : [],
        turmas: alcance.turmas ? data!.turmas.map(paraTurma) : [],
      }
    },
    staleTime: FRESCURA.pesquisa,
    placeholderData: keepPreviousData, // os resultados anteriores ficam até chegarem os novos
  })
}

/**
 * Pesquisa global de estudantes e turmas do ano em contexto (guia 6.2, 7.5).
 * Espera 120 ms depois da última tecla; pedidos anteriores são cancelados pelo signal.
 */
export function usePesquisa(termo: string) {
  const anoLectivoId = useContextoAno((e) => e.anoLectivoId)
  const [q, setQ] = useState(termo.trim())
  useEffect(() => {
    const id = setTimeout(() => setQ(termo.trim()), TEMPOS.pesquisaEspera)
    return () => clearTimeout(id)
  }, [termo])

  const estudantes = usePode('estudantes')
  const turmas = usePode('turmas')
  const activa = Boolean(anoLectivoId) && q.length >= MINIMO_PESQUISA && (estudantes || turmas)
  const consulta = useQuery({
    ...pesquisaQuery(anoLectivoId ?? '', q, { estudantes, turmas }),
    enabled: activa,
  })
  return {
    activa: activa && termo.trim().length >= MINIMO_PESQUISA,
    aProcurar: activa && consulta.isFetching,
    estudantes: activa ? (consulta.data?.estudantes ?? []) : [],
    turmas: activa ? (consulta.data?.turmas ?? []) : [],
  }
}
