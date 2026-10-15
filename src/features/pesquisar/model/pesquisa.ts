import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useContextoAno } from '@/entities/ano-lectivo'
import { paraEstudanteResumo } from '@/entities/estudante'
import { paraTurma } from '@/entities/turma'
import { api } from '@/shared/api'
import { FRESCURA, TEMPOS } from '@/shared/config/constantes'

export const MINIMO_PESQUISA = 2

export const pesquisaKeys = {
  todas: ['pesquisa'] as const,
  termo: (anoLectivoId: string, q: string) => [...pesquisaKeys.todas, anoLectivoId, q] as const,
}

export function pesquisaQuery(anoLectivoId: string, q: string) {
  return queryOptions({
    queryKey: pesquisaKeys.termo(anoLectivoId, q),
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/pesquisa', {
        params: { query: { q, anoLectivoId } },
        signal,
      })
      return {
        estudantes: data!.estudantes.map(paraEstudanteResumo),
        turmas: data!.turmas.map(paraTurma),
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

  const activa = Boolean(anoLectivoId) && q.length >= MINIMO_PESQUISA
  const consulta = useQuery({ ...pesquisaQuery(anoLectivoId ?? '', q), enabled: activa })
  return {
    activa: activa && termo.trim().length >= MINIMO_PESQUISA,
    aProcurar: activa && consulta.isFetching,
    estudantes: activa ? (consulta.data?.estudantes ?? []) : [],
    turmas: activa ? (consulta.data?.turmas ?? []) : [],
  }
}
