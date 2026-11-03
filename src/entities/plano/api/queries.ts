import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { api, eApiError } from '@/shared/api'
import { apiSis, doAno, idDoAnoSis, porId, referenciaSis, SEM_AVISO_403 } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraPlano, paraPlanoResumo, planoDoSis, planoResumoDoSis } from '../model/mapeadores'

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
      // Backend SIS: um plano por classe, que é a lista das suas disciplinas
      if (eReal('curriculo')) return [planoResumoDoSis(classeId)]
      const { data } = await api.GET('/planos', { params: { query: { classeId } }, signal })
      return data!.map(paraPlanoResumo)
    },
    staleTime: FRESCURA.referencia,
  })
}

export function planoQuery(id: string) {
  return queryOptions({
    queryKey: planoKeys.detalhe(id),
    queryFn: async ({ signal, client }) => {
      if (eReal('curriculo')) return planoDoSisPorClasse(client, id, signal)
      const { data } = await api.GET('/planos/{id}', { params: { path: { id } }, signal })
      return paraPlano(data!)
    },
    staleTime: FRESCURA.lista,
  })
}

/**
 * GET /grades/{id}/subjects é do âmbito curriculum (admin e director pedagógico). Para quem só
 * tem o âmbito academic (chefe da secretaria, director geral), as mesmas disciplinas lêem-se
 * de subjectIds na lista das classes, só para consulta.
 */
async function planoDoSisPorClasse(client: QueryClient, classeId: string, signal: AbortSignal) {
  try {
    const { data } = await apiSis.GET('/grades/{gradeId}/subjects', {
      params: { path: { gradeId: classeId }, ...doAno(await idDoAnoSis(client)) },
      headers: { [SEM_AVISO_403]: '1' },
      signal,
    })
    return planoDoSis(classeId, data!.subjects)
  } catch (erro) {
    // 403: sem o âmbito curriculum. 404: a classe ainda não tem turmas no ano, e o backend só
    // a encontra pelo ano. Em ambos, as disciplinas lêem-se da lista das classes
    if (!eApiError(erro) || (erro.status !== 403 && erro.status !== 404)) throw erro
  }
  const [classes, disciplinas] = await Promise.all([
    client.fetchQuery(referenciaSis.classes()),
    client.fetchQuery(referenciaSis.disciplinas()),
  ])
  const classe = classes.find((c) => c.uuid === classeId)
  const porNumero = porId(disciplinas)
  return planoDoSis(
    classeId,
    (classe?.subjectIds ?? []).flatMap((n) => {
      const d = porNumero.get(n)
      return d ? [d] : []
    }),
  )
}
